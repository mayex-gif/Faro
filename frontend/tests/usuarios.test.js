import test from 'node:test'
import assert from 'node:assert/strict'
import { cambiarActivo, crearUsuario, listarUsuarios, modificarUsuario, restablecerClave } from '../src/api/usuarios.js'
import {
  FORMULARIO_VACIO, ROLES, filtrarUsuarios, formularioDesde, motivoParaNoDarDeBaja, nombreCompleto,
  nombreCuadrilla, nombreRol, pedidoDesde, validarClave, validarFormulario,
} from '../src/utils/usuarios.js'

// Solo datos en memoria: no se modifica la base. Las claves son de mentira.
const usuarios = [
  { id: 1, nombre: 'Martín', apellido: 'Gómez', email: 'encargado@generalpaz.gob.ar', rol: 'ENCARGADO_CORRALON', cuadrillaId: null, activo: true },
  { id: 2, nombre: 'Carlos', apellido: 'Rodríguez', email: 'capataz.verde@generalpaz.gob.ar', rol: 'CAPATAZ_CUADRILLA', cuadrillaId: 1, activo: true },
  { id: 3, nombre: 'Juan', apellido: 'López', email: 'capataz.alumbrado@generalpaz.gob.ar', rol: 'CAPATAZ_CUADRILLA', cuadrillaId: 2, activo: false },
  { id: 4, nombre: 'Ana', apellido: 'Martínez', email: 'mesadeentradas@generalpaz.gob.ar', rol: 'MESA_ENTRADAS', cuadrillaId: null, activo: true },
]
const cuadrillas = [{ id: 1, nombre: 'Cuadrilla Verde' }, { id: 2, nombre: 'Cuadrilla Alumbrado' }]

const formularioCompleto = {
  nombre: ' Lucía ', apellido: ' Fernández ', email: ' Lucia@GeneralPaz.gob.ar ', rol: 'MESA_ENTRADAS', cuadrillaId: '', clave: 'clave-de-prueba',
}

// ---------- API: a qué dirección y con qué método pide cada función ----------

function fetchFalso(t, { status = 200, cuerpo = {} } = {}) {
  const pedidos = []
  t.mock.method(globalThis, 'fetch', async (url, opciones) => {
    pedidos.push({ url, metodo: opciones.method ?? 'GET', cuerpo: opciones.body ? JSON.parse(opciones.body) : null })
    return { ok: status >= 200 && status < 300, status, json: async () => cuerpo }
  })
  return pedidos
}

test('listarUsuarios pide GET /api/usuarios', async (t) => {
  const pedidos = fetchFalso(t, { cuerpo: usuarios })
  assert.deepEqual(await listarUsuarios(), usuarios)
  assert.deepEqual(pedidos[0], { url: '/api/usuarios', metodo: 'GET', cuerpo: null })
})

test('crearUsuario manda POST con los datos', async (t) => {
  const pedidos = fetchFalso(t, { status: 201, cuerpo: { id: 10 } })
  await crearUsuario({ nombre: 'Lucía', clave: 'clave-de-prueba' })
  assert.deepEqual(pedidos[0], { url: '/api/usuarios', metodo: 'POST', cuerpo: { nombre: 'Lucía', clave: 'clave-de-prueba' } })
})

test('modificarUsuario manda PUT al usuario', async (t) => {
  const pedidos = fetchFalso(t)
  await modificarUsuario(4, { nombre: 'Ana María' })
  assert.deepEqual(pedidos[0], { url: '/api/usuarios/4', metodo: 'PUT', cuerpo: { nombre: 'Ana María' } })
})

test('cambiarActivo manda PATCH a /activo', async (t) => {
  const pedidos = fetchFalso(t)
  await cambiarActivo(4, false)
  assert.deepEqual(pedidos[0], { url: '/api/usuarios/4/activo', metodo: 'PATCH', cuerpo: { activo: false } })
})

test('restablecerClave manda PATCH a /clave y el 204 no trae datos', async (t) => {
  const pedidos = fetchFalso(t, { status: 204 })
  assert.equal(await restablecerClave(4, 'clave-nueva-123'), null)
  assert.deepEqual(pedidos[0], { url: '/api/usuarios/4/clave', metodo: 'PATCH', cuerpo: { clave: 'clave-nueva-123' } })
})

test('si el backend rechaza el alta, el error trae el mensaje del backend', async (t) => {
  fetchFalso(t, { status: 409, cuerpo: { estado: 409, mensaje: 'Ya existe un usuario con ese email', errores: {} } })
  await assert.rejects(crearUsuario({}), { estado: 409, message: 'Ya existe un usuario con ese email' })
})

// ---------- Formulario ----------

test('los roles para elegir son los tres, con su nombre', () => {
  assert.deepEqual(ROLES.map((r) => r.valor), ['ENCARGADO_CORRALON', 'MESA_ENTRADAS', 'CAPATAZ_CUADRILLA'])
  assert.equal(ROLES[0].nombre, 'Encargado del corralón')
})

test('un formulario completo de alta no tiene errores', () => {
  assert.deepEqual(validarFormulario(formularioCompleto, { esAlta: true }), {})
})

test('un formulario vacío de alta marca todos los campos obligatorios', () => {
  assert.deepEqual(Object.keys(validarFormulario(FORMULARIO_VACIO, { esAlta: true })), ['nombre', 'apellido', 'email', 'rol', 'clave'])
})

test('el email tiene que tener formato de email', () => {
  const errores = validarFormulario({ ...formularioCompleto, email: 'lucia.generalpaz' }, { esAlta: true })
  assert.equal(errores.email, 'El email no tiene un formato válido')
})

test('el capataz necesita una cuadrilla; los otros roles no', () => {
  assert.equal(validarFormulario({ ...formularioCompleto, rol: 'CAPATAZ_CUADRILLA' }, { esAlta: true }).cuadrillaId,
    'Elegí la cuadrilla a cargo del capataz')
  assert.deepEqual(validarFormulario({ ...formularioCompleto, rol: 'CAPATAZ_CUADRILLA', cuadrillaId: '1' }, { esAlta: true }), {})
})

test('la clave se pide solo en el alta y con 8 caracteres o más', () => {
  assert.equal(validarFormulario({ ...formularioCompleto, clave: 'corta' }, { esAlta: true }).clave,
    'La clave tiene que tener entre 8 y 72 caracteres')
  assert.deepEqual(validarFormulario({ ...formularioCompleto, clave: '' }, { esAlta: false }), {})
  assert.equal(validarClave(''), 'Escribí una clave')
  assert.equal(validarClave('12345678'), '')
})

test('el pedido de alta va limpio: sin espacios, email en minúsculas y sin cuadrilla si no es capataz', () => {
  assert.deepEqual(pedidoDesde({ ...formularioCompleto, cuadrillaId: '2' }, { esAlta: true }), {
    nombre: 'Lucía', apellido: 'Fernández', email: 'lucia@generalpaz.gob.ar', rol: 'MESA_ENTRADAS', cuadrillaId: null, clave: 'clave-de-prueba',
  })
})

test('el pedido de un capataz lleva la cuadrilla como número y al modificar no lleva clave', () => {
  const pedido = pedidoDesde({ ...formularioCompleto, rol: 'CAPATAZ_CUADRILLA', cuadrillaId: '2' }, { esAlta: false })
  assert.equal(pedido.cuadrillaId, 2)
  assert.equal('clave' in pedido, false)
})

test('para editar se cargan los datos del usuario, sin clave', () => {
  assert.deepEqual(formularioDesde(usuarios[1]), {
    nombre: 'Carlos', apellido: 'Rodríguez', email: 'capataz.verde@generalpaz.gob.ar', rol: 'CAPATAZ_CUADRILLA', cuadrillaId: '1', clave: '',
  })
  assert.equal(formularioDesde(usuarios[0]).cuadrillaId, '')
})

// ---------- Tabla ----------

test('nombres para mostrar: completo, rol y cuadrilla', () => {
  assert.equal(nombreCompleto(usuarios[0]), 'Martín Gómez')
  assert.equal(nombreRol('MESA_ENTRADAS'), 'Mesa de entradas')
  assert.equal(nombreRol('INTENDENTE'), 'INTENDENTE')
  assert.equal(nombreCuadrilla(1, cuadrillas), 'Cuadrilla Verde')
  assert.equal(nombreCuadrilla(null, cuadrillas), '—')
  assert.equal(nombreCuadrilla(9, cuadrillas), 'Cuadrilla 9')
})

test('por defecto se ven los activos; se puede ver los dados de baja o todos', () => {
  assert.deepEqual(filtrarUsuarios(usuarios).map((u) => u.id), [1, 2, 4])
  assert.deepEqual(filtrarUsuarios(usuarios, { estado: 'baja' }).map((u) => u.id), [3])
  assert.equal(filtrarUsuarios(usuarios, { estado: 'todos' }).length, 4)
})

test('el buscador encuentra por nombre, apellido o email sin importar mayúsculas ni tildes', () => {
  assert.deepEqual(filtrarUsuarios(usuarios, { texto: 'martin', estado: 'todos' }).map((u) => u.id), [1, 4])
  assert.deepEqual(filtrarUsuarios(usuarios, { texto: 'ALUMBRADO', estado: 'todos' }).map((u) => u.id), [3])
})

test('nadie se da de baja a sí mismo ni al único encargado activo', () => {
  const mesa = usuarios[3]
  assert.equal(motivoParaNoDarDeBaja(mesa, mesa, usuarios), 'Es tu cuenta')
  assert.equal(motivoParaNoDarDeBaja(usuarios[0], mesa, usuarios), 'Es el único encargado activo')
  assert.equal(motivoParaNoDarDeBaja(usuarios[1], mesa, usuarios), '')
})

test('con otro encargado activo sí se puede dar de baja a un encargado', () => {
  const conDosEncargados = [...usuarios, { id: 5, rol: 'ENCARGADO_CORRALON', activo: true }]
  assert.equal(motivoParaNoDarDeBaja(usuarios[0], usuarios[3], conDosEncargados), '')
})

test('a alguien ya dado de baja no se le muestra motivo (se puede reactivar)', () => {
  assert.equal(motivoParaNoDarDeBaja(usuarios[2], usuarios[3], usuarios), '')
})
