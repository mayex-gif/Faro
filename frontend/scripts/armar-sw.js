import { readFile } from 'node:fs/promises'

// Arma el código del service worker: las reglas del cuaderno de la página (datosCola.js y cola.js, sin "import"
// ni "export") + el envío en segundo plano + el worker. Así el envío con FARO cerrado usa las mismas reglas.
const PARTES = ['../src/offline/datosCola.js', '../src/offline/cola.js', './envio-segundo-plano.js', './service-worker.js']

export function sinModulos(codigo) {
  return codigo
    .replace(/^import .*$/gm, '')
    .replace(/^export (const|let|function|async function) /gm, '$1 ')
}

export async function codigoDelTrabajador() {
  const partes = await Promise.all(PARTES.map((ruta) => readFile(new URL(ruta, import.meta.url), 'utf8')))
  return partes.map(sinModulos).join('\n')
}
