# Contrato de integración: cuadrillas y asignación de OT

Tarea: **4. Asignación de OT a cuadrillas** (Sprint 1, RF04).  
**Estado:** Implementado en el backend y verificado con el frontend.

Este documento define el contrato de datos y comportamiento entre el backend y el frontend para la gestión de cuadrillas municipales y la asignación de Órdenes de Trabajo (OT).

---

## Qué es una cuadrilla

Un conjunto de trabajadores municipales asignado a tareas de mantenimiento en el corralón. Se describe con:

| Campo | Tipo | Significado |
|---|---|---|
| `id` | número | Identificador único |
| `nombre` | texto | Ej: "Cuadrilla Verde", "Cuadrilla Alumbrado" |
| `integrantes` | número (opcional) | Cantidad de trabajadores; si no se indica, se muestra "—" |
| `tiposTrabajo` | lista de `TipoTrabajo` | Tareas que realiza: `PODA`, `CORTE_DE_PASTO`, `ALUMBRADO`, `BACHEO`, `PINTURA`, `LIMPIEZA`, `OTRO` |
| `disponible` | booleano | `true` si la cuadrilla está operativa / en servicio para recibir trabajos. `false` si está fuera de servicio (licencias, francos, mantenimiento de vehículo) |

---

## Endpoints

### 1. `GET /api/cuadrillas`
Devuelve la lista completa de cuadrillas registradas, ordenadas por su identificador.

**Ejemplo de respuesta (200 OK):**
```json
[
  {
    "id": 1,
    "nombre": "Cuadrilla Verde",
    "integrantes": 4,
    "tiposTrabajo": ["PODA", "CORTE_DE_PASTO", "LIMPIEZA"],
    "disponible": true
  },
  {
    "id": 2,
    "nombre": "Cuadrilla Alumbrado",
    "integrantes": 2,
    "tiposTrabajo": ["ALUMBRADO"],
    "disponible": true
  }
]
```

### 2. `PATCH /api/ordenes-trabajo/{id}/cuadrilla`
Asigna una Orden de Trabajo a una cuadrilla.

* **Cuerpo de la petición:**
  ```json
  {
    "cuadrillaId": 1
  }
  ```

* **Comportamiento en el backend:**
  1. Verifica que la OT exista y esté en estado inicial (`inicial: true`, es decir, "Pendiente").
  2. Verifica que la cuadrilla exista y esté disponible (`disponible: true`).
  3. Verifica que la cuadrilla realice el tipo de trabajo de la OT (`tiposTrabajo` contiene el `tipo`).
  4. **Permite múltiples asignaciones:** a una misma cuadrilla se le pueden asignar varias órdenes en simultáneo para cubrir su ruta o jornada diaria de trabajo.
  5. **Avanza el estado de la OT:** pasa automáticamente la orden a **"En curso"** (o a la primera transición permitida no-cierre).
  6. Guarda la relación y retorna la orden actualizada.

* **Respuesta exitosa (200 OK):**
  Devuelve el `OrdenTrabajoDTO` actualizado con dos campos adicionales:
  * `cuadrillaId` (número)
  * `cuadrillaNombre` (texto)

* **Errores (formato `{ estado, mensaje, errores }`):**
  | Código | Cuándo | Mensaje devuelto |
  |---|---|---|
  | `400` | No se envió `cuadrillaId` en el cuerpo | `"Hay datos inválidos en el pedido"` |
  | `404` | La OT o la cuadrilla no existen | `"Orden de trabajo no encontrada"` / `"Cuadrilla no encontrada"` |
  | `409` | La OT ya no está pendiente | `"La orden de trabajo ya no está pendiente"` |
  | `409` | La cuadrilla no está disponible (fuera de servicio) | `"La cuadrilla <Nombre> no se encuentra disponible"` |
  | `409` | La cuadrilla no realiza ese tipo de trabajo | `"La cuadrilla <Nombre> no realiza trabajos de tipo <TIPO>"` |

---

## Decisiones tomadas y arquitectura del backend

1. **Disponibilidad operativa:**
   * La disponibilidad modela el **estado operativo de la cuadrilla** (en servicio / de guardia).
   * Al asignarle una orden de trabajo, la cuadrilla **permanece disponible** (`disponible = true`), permitiendo que el corralón le asigne consecutivamente las órdenes que correspondan a su jornada o recorrido.
   * Solo pasa a `false` ("Ocupada" o "Fuera de servicio") cuando se desactiva administrativamente.
2. **Concurrencia de órdenes por cuadrilla:**
   * Se admiten múltiples órdenes activas por cuadrilla en simultáneo.
3. **Paso de estado automático:**
   * La asignación mueve la orden directamente a estado **"En curso"**, por lo que automáticamente sale de la lista de órdenes pendientes.
4. **Carga inicial de datos:**
   * El backend cuenta con un inicializador (`InicializadorCuadrillas`) que precarga 4 cuadrillas típicas al iniciar si la tabla está vacía (*Cuadrilla Verde*, *Cuadrilla Alumbrado*, *Cuadrilla Vial*, *Cuadrilla Servicios Generales*).

---

## Adaptaciones recomendadas para el Frontend

La pantalla de asignación (`PaginaAsignacion.jsx`) ya funciona correctamente con el backend. A futuro o en las siguientes tareas del tablero, se pueden aplicar las siguientes mejoras:

1. **Claridad del término "Disponibilidad" en la UI:**
   * En `TablaCuadrillas.jsx` y `TablaAsignacion.jsx`, el texto actual muestra "Disponible" u "Ocupada".
   * Como ahora `disponible: false` indica que la cuadrilla no está en servicio (por vehículo en taller, franco, etc.) y no que tiene una sola tarea, en la interfaz se puede rotular más claramente como **"En servicio"** vs **"Fuera de servicio"**.
2. **Visualización de cuadrilla en el listado general de Órdenes:**
   * Dado que el endpoint de listado (`GET /api/ordenes-trabajo`) y el de consulta ya devuelven `cuadrillaId` y `cuadrillaNombre`, en `TablaOrdenes.jsx` (`PaginaOrdenes.jsx`) se puede agregar una columna para visualizar qué cuadrilla tiene asignada la orden cuando está "En curso" o "Finalizada".
