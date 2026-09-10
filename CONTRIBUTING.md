# Guía de contribución

Este documento define cómo trabajamos en el repositorio para que los 7 desarrolladores puedan integrar su código sin generar conflictos ni romper producción.

No usamos la extensión `git flow`: todos los comandos son Git estándar, así nadie necesita instalar nada extra.

---

## 1. Requisitos previos

- **Git** instalado.
- **Docker** y **Docker Compose**, para levantar el proyecto completo (backend + frontend + base de datos) de forma idéntica en todas las máquinas.

---

## 2. Flujo de trabajo (basado en Git Flow, con Git puro)

La rama **main** contiene únicamente código en producción. La rama **develop** es donde el equipo integra sus avances diarios. **Nunca se trabaja directamente sobre main ni sobre develop** — todo cambio nace en una rama derivada.

### Tipos de rama

| Rama | Nace de | Se fusiona en | Uso |
|---|---|---|---|
| `feature/*` | develop | develop | Nueva funcionalidad (ej. `feature/login`, `feature/mapa`) |
| `release/*` | develop | main y develop | Preparar una versión para producción |
| `hotfix/*` | main | main y develop | Corregir un error urgente detectado en producción |

### Reglas de protección configuradas en GitHub

- **`main`**: requiere **2 aprobaciones**, sin force-push, sin borrado de rama.
- **`develop`**: requiere **1 aprobación** (ajustable a 2 si el equipo lo prefiere más adelante).
- **`feature/*`, `release/*`, `hotfix/*`**: sin restricciones — cada dev puede pushear libremente a su propia rama mientras trabaja.

> Importante: los números de aprobación de esta tabla tienen que coincidir siempre con lo configurado en Settings → Rules del repo. Si alguien cambia la regla en GitHub, hay que actualizar este documento en el mismo PR.

---

## 3. Rutina diaria

### 3.1 Sincronizar con el equipo

```bash
git checkout develop
git pull origin develop
```

### 3.2 Crear tu rama de tarea

```bash
git checkout -b feature/boton-paypal
```

### 3.3 Trabajar y commitear

```bash
git add .
git commit -m "Formulario y diseño del botón de PayPal"
```

Repetí add/commit las veces que necesites mientras avanzás en la tarea.

### 3.4 Publicar tu rama

```bash
git push -u origin feature/boton-paypal
```

En GitHub: abrí el Pull Request hacia **develop** (nunca hacia main). Recordá que el sistema exige **1 aprobación** para fusionarlo en develop.

### 3.5 Finalizar la tarea

Una vez aprobado y fusionado en la nube (merge del PR en GitHub):

```bash
git checkout develop
git pull origin develop
git branch -d feature/boton-paypal             # borra la rama local
git push origin --delete feature/boton-paypal  # borra la rama remota (opcional si tildaste "Delete branch" en GitHub)
```

---

## 4. Releases

Cuando develop tiene suficientes cambios probados como para pasar a producción:

```bash
git checkout develop
git pull origin develop
git checkout -b release/1.2.0
```

En esta rama solo se hacen ajustes finales (versión, changelog, fixes menores) — no funcionalidades nuevas.

```bash
git add .
git commit -m "Prepara release 1.2.0"
git push -u origin release/1.2.0
```

Abrí un PR de `release/1.2.0` hacia **main** (2 aprobaciones). Al mergearlo:

```bash
git checkout main
git pull origin main
git tag -a v1.2.0 -m "Versión 1.2.0"
git push origin v1.2.0
```

Después, abrí también un PR (o mergeá directo si el equipo lo permite) de `release/1.2.0` hacia **develop**, para que los ajustes de la release vuelvan a develop. Por último, borrá la rama `release/1.2.0`.

## 5. Hotfixes

Para un error urgente detectado en producción:

```bash
git checkout main
git pull origin main
git checkout -b hotfix/fix-login
git add .
git commit -m "Corrige error de login en producción"
git push -u origin hotfix/fix-login
```

Abrí un PR hacia **main** (2 aprobaciones). Una vez mergeado, abrí otro PR de `hotfix/fix-login` hacia **develop** para que el fix no se pierda en la próxima release. Después, borrá la rama `hotfix/fix-login`.

---

## 6. Cómo levantar el proyecto localmente

1. Clonar el repo y copiar las variables de entorno:
   ```bash
   git clone <URL-del-repo>
   cd <carpeta-del-repo>
   cp .env.example .env
   ```
2. Levantar todo con Docker:
   ```bash
   docker compose up --build
   ```
3. Servicios disponibles:
   - Backend: http://localhost:8080
   - Frontend: http://localhost:5173
   - Base de datos Postgres: `localhost:5432` (credenciales en `.env`)

No se necesita instalar Java, Node ni Postgres localmente — todo corre dentro de los contenedores.

---

## 7. Convenciones de commits y PRs

- Mensajes de commit en español, en modo imperativo: `Agrega validación de email`, no `Agregando` o `Agregado`.
- Cada PR debe describir brevemente qué cambia y por qué.
- Si el PR cierra una tarea del tablero, referenciarla en la descripción (ej. `Closes #23`).
- Antes de abrir el PR, asegurate de tener los últimos cambios de develop mergeados en tu rama (`git merge develop` o `git rebase develop`), para evitar conflictos grandes al momento de aprobar.
