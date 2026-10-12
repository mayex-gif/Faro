# Despliegue (Render + Neon)

FARO está en la nube en tres partes, todas con plan gratis:

- **Frontend** (las pantallas): **Render, Static Site**. Son solo archivos (HTML, CSS, JS); no se duerme y trae HTTPS.
- **Backend** (la API): **Render, Web Service** con Docker → https://faro-backend-6cq7.onrender.com (Swagger: `/swagger-ui.html`).
- **Base de datos**: **Neon** (PostgreSQL + PostGIS).

El backend y la base están en la misma zona: **Virginia, EE. UU.** (Render no tiene servidores en Sudamérica, y si el backend y la base
estuvieran lejos, cada consulta tardaría mucho más).

```
Celular / navegador ──► Render: frontend (Static Site, carpeta frontend)
        │
        └── pide los datos a ──► Render: backend (backend/Dockerfile) ──► Neon: PostgreSQL + PostGIS
```

El frontend y el backend tienen **direcciones distintas**. Por eso:
- el frontend se compila con la dirección del backend (variable `VITE_API_URL`, punto 4), y
- el backend tiene que aceptar pedidos que vienen de la dirección del frontend (variable `FARO_CORS_ORIGENES`, punto 1).

El código **no tiene ninguna contraseña**: todo lo que cambia entre la compu y la nube se pasa con variables de entorno.

## 1. Variables de entorno del backend (Render → faro-backend → Environment)

| Variable | Valor | Para qué |
|---|---|---|
| `SPRING_DATASOURCE_URL` | `jdbc:postgresql://<host-de-neon>/neondb?sslmode=require` | Dónde está la base (host **sin** `-pooler`) |
| `SPRING_DATASOURCE_USERNAME` | `neondb_owner` | Usuario de Neon |
| `SPRING_DATASOURCE_PASSWORD` | (la de Neon) | Contraseña de Neon. Solo acá y en el lugar seguro del equipo |
| `SPRING_JPA_HIBERNATE_DDL_AUTO` | `update` | Hibernate crea o actualiza las tablas al arrancar |
| `TZ` | `America/Argentina/Buenos_Aires` | Hora argentina en las fechas |
| `FARO_CORS_ORIGENES` | `https://<dirección-del-frontend>.onrender.com,http://localhost:5173` | Páginas web que pueden llamar a la API, separadas por comas, **sin espacios y sin `/` al final**. **No usar `*`** (no funciona junto con `allowCredentials`) |

`PORT` **no** se carga: Render la define sola (10000) y el backend la lee (`server.port=${PORT:8080}`).

## 2. Base de datos en Neon (se hace una sola vez)

1. Crear el proyecto en la región **AWS US East 1 (N. Virginia)**. La región no se puede cambiar después.
2. En **SQL Editor** activar PostGIS y comprobarlo:
   ```sql
   CREATE EXTENSION IF NOT EXISTS postgis;
   SELECT postgis_version();
   ```
3. Botón **Connect** → apagar **Connection pooling** → de `postgresql://usuario:clave@host/base?...` sacar el host y la base,
   y armar `jdbc:postgresql://<host>/<base>?sslmode=require`.
   Se usa la conexión **directa** porque Hibernate crea tablas, y Spring ya tiene su propio pool de conexiones (Hikari).

Las tablas las crea Hibernate al arrancar. Los estados de OT y las 4 cuadrillas los cargan los inicializadores si las tablas están vacías.

## 3. Backend en Render (se hace una sola vez)

**New → Web Service** → elegir el repo (con GitHub conectado) o **Public Git Repository** con `https://github.com/mayex-gif/Faro`.

| Campo | Valor |
|---|---|
| Name | `faro-backend` |
| Region | **Virginia (US East)** |
| Branch | `develop` |
| Root Directory | `backend` |
| Language | **Docker** (usa `backend/Dockerfile`) |
| Instance Type | **Free** |
| Health Check Path | `/api/estados-orden` |

Cargar las variables del punto 1 y **Deploy**. En los logs tiene que aparecer `Started BackendApplication`.

## 4. Frontend en Render (se hace una sola vez)

**New → Static Site** → **Public Git Repository** con `https://github.com/mayex-gif/Faro`.

| Campo | Valor |
|---|---|
| Name | `faro-frontend` |
| Branch | `develop` |
| Root Directory | `frontend` |
| Build Command | `npm ci && npm run build` |
| Publish Directory | `dist` |

Variable de entorno (en la misma pantalla, **Environment Variables**):

| Variable | Valor | Para qué |
|---|---|---|
| `VITE_API_URL` | `https://faro-backend-6cq7.onrender.com/api` | Dirección de la API. La lee `frontend/src/api/cliente.js` |

- Las variables `VITE_...` se meten **dentro del JavaScript al compilar**. Si se cambia `VITE_API_URL`, guardar con
  **Save, rebuild, and deploy** (con "Save and deploy" Render reusa el build anterior y sigue la dirección vieja).
- En la compu y en Docker **no** se define: queda `/api` y el proxy de Vite (`vite.config.js`) lo manda al backend local.
- No usa `frontend/Dockerfile.prod`: Render compila con Node y sirve la carpeta `dist` con HTTPS.

Cuando termina, Render muestra arriba la dirección del frontend (`https://faro-frontend-....onrender.com`, puede traer un sufijo).
**Esa dirección hay que sumarla a `FARO_CORS_ORIGENES` del backend** (punto 1) y guardar: el backend se vuelve a desplegar solo.

## 5. Redesplegar

- **Con GitHub conectado:** cada merge a `develop` se despliega solo.
- **Con "Public Git Repository":** en Render, en el servicio que corresponda → **Manual Deploy → Deploy latest commit**.

## 6. Verificar

1. Abrir `https://faro-backend-6cq7.onrender.com/swagger-ui.html` (si estaba dormido, tarda **2 a 3 minutos** en despertar).
2. `GET /api/estados-orden` → 5 estados. `GET /api/cuadrillas` → 4 cuadrillas.
3. Abrir la dirección del frontend (en la compu y en el celular) y recorrer el menú: Infraestructura, Órdenes de trabajo,
   Asignación a cuadrillas, Mapa, Ficha histórica y Mis tareas.
4. Si una pantalla dice **"No se pudo completar la operación"** (con `Failed to fetch`): F12 → **Console**.
   - `blocked by CORS policy` → falta la dirección del frontend en `FARO_CORS_ORIGENES` o está mal escrita (tiene que empezar con `https://`).
   - `Failed to fetch` o `Error 502` sin CORS → el backend está despertando: esperar y recargar.

## 7. Probar la base de Neon desde la compu (opcional)

En una ventana **nueva** de PowerShell (con el backend de Docker apagado: `docker compose stop backend`):

```powershell
cd backend
$env:SPRING_DATASOURCE_URL='jdbc:postgresql://<host-de-neon>/neondb?sslmode=require'
$env:SPRING_DATASOURCE_USERNAME='neondb_owner'
$env:SPRING_DATASOURCE_PASSWORD='<contraseña>'
.\mvnw.cmd spring-boot:run
```

Mientras corre, todo lo que se haga en `localhost:8080` se guarda **en Neon**. Al terminar: Ctrl+C y **cerrar la ventana**
(si no, `mvnw test` en esa ventana usaría Neon).

## 8. Memoria del backend (Render gratis = 512 MB)

El `ENTRYPOINT` del Dockerfile limita a Java: heap de hasta el 50% de la RAM (`MaxRAMPercentage=50`), el recolector de basura
más chico (`UseSerialGC`) y apagado si se queda sin memoria (`ExitOnOutOfMemoryError`, Render lo reinicia).
Medido: ~330 MiB de 512. Para simularlo en la compu:

```powershell
docker update --memory 512m --memory-swap 512m faro-backend
docker restart faro-backend
docker stats faro-backend --no-stream
```

## Advertencias

- **El backend se duerme** después de 15 minutos sin visitas y tarda **2 a 3 minutos** en despertar (con 0,1 CPU, Spring arranca
  en ~133 segundos). Antes de una demo, abrir Swagger del backend unos 5 minutos antes. El frontend no se duerme, pero sin el
  backend despierto no muestra datos.
- **No usar "keep-alive"** (pings automáticos para que no se duerma): también mantendría despierta la base de Neon y se gastarían
  las 100 horas de cómputo por mes del plan gratis (si se acaban, la base queda apagada hasta el mes siguiente).
- **Neon se suspende** a los 5 minutos sin uso: la primera consulta después de un rato tarda un poco más. Es normal.
- **Dos bases distintas:** lo que se carga en la nube (frontend o Swagger de Render) va a Neon; lo que se carga en Docker va a la
  base local. No se ven entre sí.
- **Contraseñas:** nunca en `application.properties`, en el repo ni en chats. Solo en Render y en el lugar seguro del equipo.
- **Enums nuevos:** Hibernate crea una regla `CHECK` con los valores de cada enum y `ddl-auto=update` no la actualiza.
  Si se agrega un valor a un enum (por ejemplo, un tipo de trabajo nuevo), en Neon hay que correr en el SQL Editor
  `ALTER TABLE ... DROP CONSTRAINT ..._check;` y volver a crearla con todos los valores.
- Plan gratis de Neon: 1 GB de datos.
