// Ayuda en línea de FARO: lo que muestra el botón "?" de cada pantalla.
// Una entrada por pantalla (la misma clave que usa App.jsx), más "login" para la pantalla de ingreso.
// Es la fuente única del contenido: el manual de usuario en PDF parte de este mismo texto.
//
// Cada entrada:
//   titulo   nombre de la pantalla, como figura en el menú
//   resumen  para qué sirve, en una o dos oraciones
//   secciones [{ titulo, items }] — cada item es un texto o { texto, roles } si solo aplica a algunos roles
//   consejo  (opcional) un tip para el día a día
// Si un item tiene "roles", solo lo ve quien tiene uno de esos roles (ayudaPara lo filtra).
// Al cambiar una pantalla (un botón nuevo, un nombre distinto), actualizá también su ayuda acá.

const ENCARGADO = 'ENCARGADO_CORRALON'
const MESA = 'MESA_ENTRADAS'
const CAPATAZ = 'CAPATAZ_CUADRILLA'

export const AYUDA = {
  login: {
    titulo: 'Iniciar sesión',
    resumen: 'Es la puerta de entrada a FARO. Cada persona entra con la cuenta que le dio el municipio.',
    secciones: [
      {
        titulo: 'Qué tenés que hacer',
        items: [
          'Escribí tu correo electrónico y tu contraseña, y tocá "Iniciar sesión".',
          'Con "Mostrar" ves la contraseña que escribiste, para revisar que esté bien. "Ocultar" la vuelve a tapar.',
          'Al entrar, FARO te lleva a la pantalla de tu rol: el capataz va directo a "Mis tareas"; el resto, al Mapa.',
        ],
      },
      {
        titulo: 'Si algo no anda',
        items: [
          'Si no tenés cuenta, pedila al encargado del corralón o a mesa de entradas.',
          'Si te olvidaste la contraseña, pedí que te la restablezcan desde la pantalla Usuarios (botón "Clave").',
          'Si aparece "Hay cambios guardados en este celular", son cosas que hiciste sin señal: se envían solas cuando vuelvas a entrar.',
        ],
      },
    ],
  },

  mapa: {
    titulo: 'Mapa',
    resumen: 'La pantalla principal de FARO. Muestra en el mapa del pueblo todos los lugares (luminarias, espacios verdes y calles) y los trabajos que tienen abiertos. La pestaña Luminarias muestra solo el alumbrado público y cómo está.',
    secciones: [
      {
        titulo: 'Qué ves',
        items: [
          'En la compu: a la izquierda la lista de lugares, en el centro el mapa y, a la derecha, la ficha del lugar que elegiste.',
          'En el celular el mapa ocupa toda la pantalla. Con "Ver como lista" ves los lugares en una lista y con "Ver mapa" volvés.',
          'Cada marca es un lugar. Su color indica la prioridad del trabajo más urgente: cuanto más urgente, más grande es la marca. La leyenda dice qué significa cada color.',
          'En "Colorear por" podés cambiar a "Estado" para que el color muestre en qué estado está cada trabajo.',
        ],
      },
      {
        titulo: 'Qué podés hacer',
        items: [
          'Tocá un lugar (en el mapa o en la lista) para ver su ficha: estado, trabajos abiertos e historia. "Ver toda la historia" abre la Ficha histórica completa.',
          'Usá los botoncitos "Con trabajos abiertos", "Luminarias", "Espacios verdes" y "Calles" para ver solo esos lugares. Si no prendés ningún tipo, se ven todos.',
          'En "Más filtros" podés buscar por estado, prioridad, tipo de trabajo, origen, lugar y fechas. También podés hacer que la lista muestre solo lo que se ve en el mapa.',
          'Con el buscador de arriba encontrás un lugar, una calle o un trabajo escribiendo al menos 2 letras.',
          { texto: '"Nueva OT acá" crea una orden de trabajo para ese lugar, con el lugar ya elegido.', roles: [ENCARGADO, MESA] },
          { texto: 'En la ficha, los trabajos que esperan cuadrilla se pueden asignar ahí mismo: elegí la cuadrilla y tocá "Asignar".', roles: [ENCARGADO] },
          { texto: '"Agregar lugar": tocá el mapa donde está el lugar (un espacio verde o una calle), completá nombre y tipo, y tocá "Registrar lugar". Si el pin no quedó justo, arrastralo o tocá otro punto.', roles: [ENCARGADO, MESA] },
        ],
      },
      {
        titulo: 'Pestaña Luminarias',
        items: [
          'Arriba del mapa, "Luminarias" muestra solo el alumbrado público: cada luminaria es un poste y se ve cómo está. "Todo el pueblo" vuelve al mapa de siempre.',
          'Poste verde con la lámpara prendida: funciona. Rojo con una ✕: apagada y sin OT. Amarillo con una llave: en arreglo (tiene una OT abierta). Poste "fantasma" con la base punteada: luminaria a futuro (planificada, todavía no se puso).',
          'A la izquierda (en el celular, "Ver resumen"): qué porcentaje del alumbrado instalado funciona, cuántas hay de cada estado y las listas de apagadas, en arreglo y a futuro.',
          '"¿Dónde falta luz?" ordena las zonas del pueblo de la que tiene menos luminarias andando a la que tiene más. Tocá una para marcarla en el mapa y ver solo sus luminarias.',
          'En "Mostrar en el mapa" destildá un estado para sacarlo del mapa (por ejemplo, dejá solo las apagadas). Los números no cambian.',
          '"Modo noche" oscurece el mapa y hace que las luminarias que funcionan tiren luz: así se ve rápido dónde falta.',
          { texto: 'Tocá una luminaria y, en su ficha, cambiala entre "Funciona" y "Apagada". Si está apagada, "Crear OT de arreglo" abre la orden con el tipo Alumbrado. Cuando esa OT se finaliza, la luminaria vuelve sola a "Funciona".', roles: [ENCARGADO] },
          { texto: '"Agregar luminaria a futuro" (sección "A futuro") carga una luminaria que planificó el intendente. No se le pueden asignar OT; cuando la pongan, en su ficha tocá "Marcar como instalada" y queda funcionando.', roles: [ENCARGADO] },
          { texto: '"Agregar luminaria": tocá el mapa donde está y registrala. Las luminarias a futuro las carga el encargado.', roles: [MESA] },
        ],
      },
    ],
    consejo: 'Si no aparece un lugar que buscás, puede que un filtro lo esté escondiendo: apagá los botoncitos o limpiá "Más filtros".',
  },

  ordenes: {
    titulo: 'Trabajos',
    resumen: 'Acá se registran las órdenes de trabajo (OT): qué hay que hacer, dónde, de dónde surge y qué tan urgente es. También se sigue en qué estado está cada una.',
    secciones: [
      {
        titulo: 'Registrar una orden',
        items: [
          'Completá la descripción (qué hay que hacer, hasta 500 letras), el tipo de trabajo, el origen (reclamo vecinal, plan de mantenimiento u orden directa), el lugar y la prioridad.',
          'Tocá "Registrar orden". La orden queda pendiente de asignar a una cuadrilla.',
          { texto: 'Si el trabajo se repite (por ejemplo, cortar el pasto cada 15 días), marcá "Sí, programar este trabajo" y elegí cada cuánto. FARO va a crear las órdenes solo, en cada fecha.', roles: [ENCARGADO] },
        ],
      },
      {
        titulo: 'Consultar las órdenes',
        items: [
          'La lista "Órdenes registradas" va de la más reciente a la más antigua.',
          'En "Buscar y filtrar órdenes" podés buscar por descripción, lugar o número, y filtrar por estado, prioridad, tipo, origen, lugar y fechas de creación.',
          '"Comentarios" abre lo que se fue contando del trabajo, con fotos. Ahí también podés sumar un comentario (hasta 5 fotos por comentario).',
        ],
      },
      {
        titulo: 'Modificar una orden',
        roles: [ENCARGADO],
        items: [
          { texto: '"Editar" carga la orden en el formulario de arriba para corregir sus datos. Después tocá "Guardar cambios".', roles: [ENCARGADO] },
          { texto: 'Los botones "Pasar a…" cambian el estado de la orden. Finalizada y Cancelada piden confirmación porque después ya no se puede modificar.', roles: [ENCARGADO] },
          { texto: '"Ver programaciones" lleva a Mantenimiento periódico, donde están los trabajos que se repiten.', roles: [ENCARGADO] },
        ],
      },
    ],
    consejo: 'Sin señal también podés registrar una orden: queda guardada en el celular como "Nueva · Sin enviar" y se envía sola cuando vuelve la señal.',
  },

  asignacion: {
    titulo: 'Cuadrillas',
    resumen: 'Acá se decide qué cuadrilla se encarga de cada trabajo pendiente, y se pasa un trabajo de una cuadrilla a otra si hace falta.',
    secciones: [
      {
        titulo: 'Qué ves',
        items: [
          '"Cuadrillas": cada cuadrilla con sus integrantes, las tareas que realiza y si está Disponible u Ocupada.',
          '"Órdenes pendientes de asignar": los trabajos que todavía no tienen cuadrilla. Primero los más urgentes y, a igual prioridad, los más antiguos.',
          '"Órdenes asignadas": los trabajos que ya tienen cuadrilla y todavía no terminaron.',
        ],
      },
      {
        titulo: 'Qué podés hacer',
        items: [
          'Asignar: en la orden pendiente, elegí la cuadrilla en "Asignar a" y tocá "Asignar". La orden cambia de estado y deja de figurar como pendiente.',
          'Solo se ofrecen las cuadrillas que realizan ese tipo de trabajo y no están ocupadas.',
          'Reasignar: si una cuadrilla no puede seguir, en "Órdenes asignadas" elegí otra cuadrilla y tocá "Reasignar". La orden mantiene su estado.',
          'Usá los filtros para encontrar una orden pendiente por texto, prioridad, tipo, lugar o fecha.',
        ],
      },
    ],
  },

  luminarias: {
    titulo: 'Luminarias',
    resumen: 'El registro del alumbrado público: cada luminaria del pueblo, sus datos técnicos, si funciona y las luminarias a futuro que planificó el intendente.',
    secciones: [
      {
        titulo: 'Registrar una luminaria',
        items: [
          'Completá el nombre (por ejemplo "Luminaria San Martín y Belgrano") y los datos técnicos (potencia, altura del poste, tipo de lámpara…).',
          'Escribí la latitud y la longitud en grados decimales, con punto (por ejemplo -31.1448). También podés agregarla tocando el mapa: Mapa → pestaña Luminarias → "Agregar luminaria".',
          'Si está apagada, desmarcá "Funciona correctamente". Después tocá "Registrar luminaria".',
          'Si es una luminaria que el intendente planificó y todavía no se puso, marcá "Luminaria a futuro". No se le pueden asignar órdenes de trabajo hasta que se instale: ahí, en el Mapa → pestaña Luminarias, tocala y elegí "Marcar como instalada".',
        ],
      },
      {
        titulo: 'Consultar y modificar',
        items: [
          'Filtrá por nombre, datos técnicos o estado: Funciona, Fuera de servicio o A futuro.',
          '"Editar" carga la luminaria en el formulario; "Ficha" abre su historia; "Borrar" la elimina (si tiene órdenes de trabajo, FARO no deja borrarla).',
          'Para ver cómo está todo el alumbrado de un vistazo, entrá al Mapa → pestaña Luminarias. Ahí también podés cambiar el estado de una luminaria tocándola.',
        ],
      },
    ],
  },

  infraestructura: {
    titulo: 'Infraestructura',
    resumen: 'El registro de los espacios verdes y las calles que mantiene el corralón, con sus datos y si están en condiciones o no. Las luminarias están aparte, en Más → Luminarias.',
    secciones: [
      {
        titulo: 'Registrar un lugar',
        items: [
          'Completá el nombre (uno fácil de reconocer, por ejemplo "Plaza San Martín"), el tipo de lugar y los datos técnicos (superficie, características…).',
          'Escribí la latitud y la longitud en grados decimales, con punto (por ejemplo -31.1448).',
          'Si el lugar está fuera de servicio, desmarcá "Funciona correctamente". Después tocá "Registrar lugar".',
        ],
      },
      {
        titulo: 'Consultar y modificar',
        items: [
          'En "Buscar y filtrar lugares" buscás por nombre o datos técnicos y filtrás por tipo y estado operativo.',
          '"Ficha" abre la historia completa del lugar.',
          '"Editar" carga el lugar en el formulario para corregirlo. Tocá "Guardar cambios" al terminar.',
          '"Borrar" elimina el lugar y no se puede deshacer. Si el lugar tiene órdenes de trabajo, FARO no deja borrarlo.',
        ],
      },
    ],
    consejo: 'Es más fácil agregar un lugar desde el Mapa con "Agregar lugar": tocás dónde está y no hace falta escribir coordenadas.',
  },

  ficha: {
    titulo: 'Ficha histórica',
    resumen: 'Todo lo que pasó en un lugar: sus datos y cada orden de trabajo que tuvo, con todos sus cambios, desde lo más reciente.',
    secciones: [
      {
        titulo: 'Qué ves',
        items: [
          'Arriba, el lugar elegido. Si llegaste desde el Mapa, Infraestructura o Mis tareas, ya viene elegido; si no, elegilo en la lista "Lugar".',
          'Los datos del lugar: tipo, estado operativo, ubicación, datos técnicos y cuántas órdenes tuvo.',
          'La "Línea de tiempo": cada orden registrada y cada cambio de estado, del más reciente al más antiguo.',
        ],
      },
      {
        titulo: 'Qué podés hacer',
        items: [
          'En "Mostrar" elegí "Todos", "Abiertos" o "Cerrados" para ver solo los trabajos que te interesan.',
          'Cambiá de lugar desde la lista "Lugar" para consultar otro.',
        ],
      },
    ],
    consejo: 'Sirve para responder un reclamo: en un vistazo ves cuándo se trabajó en el lugar por última vez y qué se hizo.',
  },

  tareas: {
    titulo: 'Mis tareas',
    resumen: 'Los trabajos asignados a una cuadrilla, para registrar en el lugar cuándo se empiezan y cuándo se terminan.',
    secciones: [
      {
        titulo: 'Qué ves',
        items: [
          { texto: '"Tu cuadrilla": la cuadrilla de tu cuenta. Si no aparece, pedile al encargado que la revise.', roles: [CAPATAZ] },
          { texto: '"Tu cuadrilla": elegí qué cuadrilla querés supervisar. FARO la recuerda para la próxima vez.', roles: [ENCARGADO] },
          '"Tareas asignadas": primero las más urgentes y, a igual prioridad, las más antiguas.',
        ],
      },
      {
        titulo: 'Qué podés hacer',
        items: [
          '"Iniciar tarea" cuando la cuadrilla empieza el trabajo y "Finalizar tarea" cuando lo termina. Finalizar pide confirmación porque después no se puede modificar.',
          'En "Otras opciones" están los demás estados posibles (por ejemplo, cancelar).',
          'Al finalizar, FARO te ofrece sumar fotos del trabajo terminado.',
          '"Comentarios y fotos" sirve para contar cómo va el trabajo o mandar fotos (hasta 5 por comentario).',
          '"Ficha del lugar" muestra todo lo que se hizo antes en ese lugar.',
          '"Actualizar tareas" trae los trabajos recién asignados.',
        ],
      },
      {
        titulo: 'Sin señal',
        roles: [CAPATAZ],
        items: [
          { texto: 'Lo que inicies o finalices sin señal queda guardado en el celular, marcado "Sin enviar", y se envía solo cuando vuelve la señal. Arriba se ve cuántos cambios faltan enviar.', roles: [CAPATAZ] },
          { texto: 'Antes de salir, tocá "Guardar copia local" para poder consultar tus tareas aunque abras FARO sin señal. "Ver copia local" la muestra y "Eliminar copia local" la borra del celular.', roles: [CAPATAZ] },
          { texto: 'Si dice "para revisar", el trabajo cambió mientras no tenías señal: FARO te muestra qué pasó y vos decidís qué hacer.', roles: [CAPATAZ] },
        ],
      },
    ],
  },

  usuarios: {
    titulo: 'Usuarios',
    resumen: 'El personal que usa FARO: acá se dan de alta las cuentas, se cambia el rol de cada persona y se da de baja a quien deja el corralón.',
    secciones: [
      {
        titulo: 'Dar de alta a una persona',
        items: [
          'Completá nombre, apellido, email (es el usuario con el que va a entrar), rol y una clave inicial. Después tocá "Dar de alta".',
          'Roles: el encargado del corralón ve todo; mesa de entradas registra trabajos y gestiona usuarios; el capataz ve y actualiza las tareas de su cuadrilla.',
          'Si el rol es capataz, elegí también la "Cuadrilla a cargo".',
        ],
      },
      {
        titulo: 'Gestionar el personal',
        items: [
          'Buscá por nombre, apellido o email, y en "Mostrar" elegí Activos, De baja o Todos.',
          '"Editar" carga a la persona en el formulario para cambiar sus datos o su rol.',
          '"Clave" le pone una contraseña nueva. Dásela en mano a la persona.',
          '"Dar de baja" hace que ya no pueda entrar, aunque tenga la sesión abierta. No se borra nada: sigue figurando en la historia de los trabajos.',
          '"Reactivar" le devuelve el acceso a alguien dado de baja.',
        ],
      },
    ],
  },

  mantenimiento: {
    titulo: 'Mantenimiento periódico',
    resumen: 'Los trabajos que se repiten solos (por ejemplo, cortar el pasto cada 15 días). Cada regla crea una orden de trabajo nueva en cada fecha prevista.',
    secciones: [
      {
        titulo: 'Qué ves',
        items: [
          '"Reglas configuradas": cada programación con su lugar, tipo, prioridad, cada cuánto se repite, la próxima fecha y si está Activa o Pausada.',
          'Podés buscar por texto y, en "Mostrar", elegir Todas, Activas o Pausadas.',
        ],
      },
      {
        titulo: 'Qué podés hacer',
        items: [
          '"Programar desde Trabajos" crea una programación nueva: completás el trabajo y marcás "Sí, programar este trabajo".',
          '"Editar" permite cambiar título, descripción, lugar, tipo, prioridad, cuadrilla preasignada y cada cuánto se repite.',
          '"Generar ya" crea en el momento la próxima orden, sin esperar a la fecha.',
          '"Pausar" deja de crear órdenes nuevas, sin borrar las ya creadas. "Reactivar" la vuelve a poner en marcha.',
          '"Borrar" elimina la regla y no se puede deshacer.',
          '"Desvíos" compara la fecha planificada con la fecha en que se cerró cada orden (a tiempo, adelantada, demorada, vencida). "Desvíos globales" muestra lo mismo para todo el municipio.',
        ],
      },
    ],
  },

  auditoria: {
    titulo: 'Auditoría',
    resumen: 'El registro de quién creó, modificó o eliminó cada dato importante de FARO, y cuándo. Se guarda solo: acá solo se consulta.',
    secciones: [
      {
        titulo: 'Buscar movimientos',
        items: [
          'Filtrá por tipo de registro (orden de trabajo, lugar, usuario…), número de registro, acción (creación, modificación o eliminación), quién hizo el cambio (su email) y fechas.',
          'Tocá "Buscar" para aplicar los filtros.',
        ],
      },
      {
        titulo: 'Leer los resultados',
        items: [
          'Cada fila dice la fecha, quién lo hizo, qué acción fue y sobre qué registro.',
          '"Ver cambios" muestra, campo por campo, cómo estaba antes y cómo quedó después.',
          'Si hay muchos resultados, usá "Anterior" y "Siguiente" para pasar de página.',
        ],
      },
    ],
  },

  reportes: {
    titulo: 'Reportes',
    resumen: 'Los números del corralón: cuántos trabajos entraron, cuántos se resolvieron, qué cuadrilla los hizo y si el mantenimiento programado se cumple a tiempo.',
    secciones: [
      {
        titulo: 'Elegir el período',
        items: [
          'Elegí Hoy, Esta semana, Este mes o Este año. Con "Otras fechas" ponés desde y hasta cuándo.',
          'En "Agrupar la evolución" elegís si ver los números por día, por semana o por mes.',
        ],
      },
      {
        titulo: 'Qué ves',
        items: [
          'Arriba, los totales: órdenes creadas, resueltas, las que siguen abiertas y qué parte del plan se cumplió a tiempo.',
          '"Evolución": órdenes creadas y cerradas en cada día, semana o mes.',
          '"Por estado", "Por tipo de trabajo" y "Por cuadrilla": cómo se reparten las órdenes del período.',
          '"Mantenimiento programado": cómo vienen las órdenes del plan con fecha en el período.',
        ],
      },
      {
        titulo: 'Descargar',
        items: [
          '"Trabajos finalizados (CSV)" y "Desvíos del plan (CSV)" bajan los datos del período en un archivo que se abre con Excel.',
        ],
      },
    ],
  },
}

// Deja solo lo que corresponde al rol (los items y secciones sin "roles" los ve todo el mundo).
// Devuelve null si la pantalla no tiene ayuda. Las secciones que quedan vacías no se muestran.
export function ayudaPara(clave, rol) {
  const ayuda = AYUDA[clave]
  if (!ayuda) return null
  const aplica = (roles) => !roles || roles.includes(rol)
  const secciones = ayuda.secciones
    .filter((seccion) => aplica(seccion.roles))
    .map((seccion) => ({
      titulo: seccion.titulo,
      items: seccion.items
        .filter((item) => typeof item === 'string' || aplica(item.roles))
        .map((item) => (typeof item === 'string' ? item : item.texto)),
    }))
    .filter((seccion) => seccion.items.length > 0)
  return { ...ayuda, secciones }
}
