# Despliegue del backend (Render + Neon)

El backend corre en **Render** (web service gratis, con Docker) y la base de datos en **Neon** (PostgreSQL + PostGIS gratis).
Los dos están en la misma zona: **Virginia, EE. UU.** (Render no tiene servidores en Sudamérica, y si el backend y la base
estuvieran lejos, cada consulta tardaría mucho más).

```
Navegador / Swagger ──► Render: backend (backend/Dockerfile) ──► Neon: PostgreSQL + PostGIS
```

El código **no tiene ninguna contraseña**: todo lo que cambia entre la compu y la nube se pasa con variables de entorno.

## 1. Variables de entorno (Render → el servicio → Environment)

| Variable | Valor | Para qué |
|---|---|---|
| `SPRING_DATASOURCE_URL` | `jdbc:postgresql://<host-de-neon>/neondb?sslmode=require` | Dónde está la base (host **sin** `-pooler`) |
| `SPRING_DATASOURCE_USERNAME` | `neondb_owner` | Usuario de Neon |
| `SPRING_DATASOURCE_PASSWORD` | (la de Neon) | Contraseña de Neon. Solo acá y en el lugar seguro del equipo |
| `SPRING_JPA_HIBERNATE_DDL_AUTO` | `update` | Hibernate crea o actualiza las tablas al arrancar |
| `TZ` | `America/Argentina/Buenos_Aires` | Hora argentina en las fechas |
| `FARO_CORS_ORIGENES` | `http://localhost:5173` (por ahora) | Páginas web que pueden llamar a la API, separadas por comas. Cuando el frontend esté en la nube, agregar su dirección. **No usar `*`** (no funciona junto con `allowCredentials`) |

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

## 3. Servicio en Render (se hace una sola vez)

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

## 4. Redesplegar

- **Con GitHub conectado:** cada merge a `develop` se despliega solo.
- **Con "Public Git Repository":** en Render → **Manual Deploy → Deploy latest commit**.

## 5. Verificar

1. Abrir `https://<faro-backend>.onrender.com/swagger-ui.html` (si estaba dormido, tarda ~1 minuto).
2. `GET /api/estados-orden` → 5 estados. `GET /api/cuadrillas` → 4 cuadrillas.

## 6. Probar la base de Neon desde la compu (opcional)

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

## 7. Memoria (Render gratis = 512 MB)

El `ENTRYPOINT` del Dockerfile limita a Java: heap de hasta el 50% de la RAM (`MaxRAMPercentage=50`), el recolector de basura
más chico (`UseSerialGC`) y apagado si se queda sin memoria (`ExitOnOutOfMemoryError`, Render lo reinicia).
Medido: ~330 MiB de 512. Para simularlo en la compu:

```powershell
docker update --memory 512m --memory-swap 512m faro-backend
docker restart faro-backend
docker stats faro-backend --no-stream
```

## Advertencias

- **Render se duerme** después de 15 minutos sin visitas y tarda ~1 minuto en despertar. Antes de una demo, abrir Swagger un par de minutos antes.
- **No usar "keep-alive"** (pings automáticos para que no se duerma): también mantendría despierta la base de Neon y se gastarían
  las 100 horas de cómputo por mes del plan gratis (si se acaban, la base queda apagada hasta el mes siguiente).
- **Neon se suspende** a los 5 minutos sin uso: la primera consulta después de un rato tarda un poco más. Es normal.
- **Contraseñas:** nunca en `application.properties`, en el repo ni en chats. Solo en Render y en el lugar seguro del equipo.
- **Enums nuevos:** Hibernate crea una regla `CHECK` con los valores de cada enum y `ddl-auto=update` no la actualiza.
  Si se agrega un valor a un enum (por ejemplo, un tipo de trabajo nuevo), en Neon hay que correr en el SQL Editor
  `ALTER TABLE ... DROP CONSTRAINT ..._check;` y volver a crearla con todos los valores.
- Plan gratis de Neon: 1 GB de datos.