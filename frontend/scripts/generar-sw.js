import { createHash } from 'node:crypto'
import { readFile, readdir, writeFile } from 'node:fs/promises'
import { resolve, relative, sep } from 'node:path'
import { codigoDelTrabajador } from './armar-sw.js'

const salida = resolve('dist')
async function listar(carpeta) {
  const entradas = await readdir(carpeta, { withFileTypes: true })
  const grupos = await Promise.all(entradas.map((entrada) => entrada.isDirectory()
    ? listar(resolve(carpeta, entrada.name)) : [resolve(carpeta, entrada.name)]))
  return grupos.flat()
}

// Cambia la versión cuando cambia el contenido, sin depender de una fecha escrita a mano.
const archivos = (await listar(salida)).filter((archivo) => !archivo.endsWith(`${sep}sw.js`)).sort()
const resumen = createHash('sha256')
for (const archivo of archivos) resumen.update(await readFile(archivo))
const rutas = archivos.map((archivo) => `/${relative(salida, archivo).split(sep).join('/')}`)
const plantilla = await codigoDelTrabajador() // el worker + las reglas del cuaderno (ver armar-sw.js)
const codigo = `const CACHE_FARO = "faro-app-${resumen.digest('hex').slice(0, 12)}";\nconst ARCHIVOS_FARO = ${JSON.stringify(rutas)};\n${plantilla}`
await writeFile(resolve(salida, 'sw.js'), codigo)
