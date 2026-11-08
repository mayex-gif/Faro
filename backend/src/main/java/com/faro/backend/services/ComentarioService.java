package com.faro.backend.services;

import com.faro.backend.dto.ComentarioDTO;
import com.faro.backend.exceptions.ConflictoSincronizacionException;
import com.faro.backend.exceptions.ConflictoSincronizacionException.Motivo;
import com.faro.backend.exceptions.DatoInvalidoException;
import com.faro.backend.exceptions.OperacionNoPermitidaException;
import com.faro.backend.exceptions.RecursoNoEncontradoException;
import com.faro.backend.exceptions.SinPermisoException;
import com.faro.backend.models.ComentarioOrden;
import com.faro.backend.models.Cuadrilla;
import com.faro.backend.models.FotoComentario;
import com.faro.backend.models.OrdenTrabajo;
import com.faro.backend.models.RolUsuario;
import com.faro.backend.models.Usuario;
import com.faro.backend.repositories.ComentarioOrdenRepository;
import com.faro.backend.repositories.FotoComentarioRepository;
import com.faro.backend.repositories.OrdenTrabajoRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

/**
 * La "cocina" del muro "Comentarios y fotos" de cada OT (tarjetas 16 + 21).
 *
 * Quién puede:
 * - Ver y escribir: encargado y mesa en cualquier OT; el capataz solo en las OT de SU cuadrilla.
 * - Borrar: quien lo escribió (lo suyo) y el encargado (cualquiera). No se editan.
 *
 * Escribir es idempotente como en #47: el celular inventa un número de comanda (operacionId) y,
 * si el mismo comentario llega dos veces, la segunda vez se devuelve el que ya estaba (no se duplica).
 * Como el comentario puede llegar mucho después (sin señal), si la OT ya no existe o ya no es de la
 * cuadrilla del capataz, responde un conflicto 409 con el motivo (el celular muestra "Entendido").
 */
@Service
public class ComentarioService {

    private static final Logger log = LoggerFactory.getLogger(ComentarioService.class);

    /** Peso máximo de cada foto (el celular las achica a ~200–400 KB antes de mandarlas). */
    public static final long MAX_BYTES_FOTO = 3L * 1024 * 1024;

    private final ComentarioOrdenRepository comentarioRepository;
    private final FotoComentarioRepository fotoRepository;
    private final OrdenTrabajoRepository ordenRepository;
    private final AlmacenArchivos almacen;

    public ComentarioService(ComentarioOrdenRepository comentarioRepository, FotoComentarioRepository fotoRepository,
                             OrdenTrabajoRepository ordenRepository, AlmacenArchivos almacen) {
        this.comentarioRepository = comentarioRepository;
        this.fotoRepository = fotoRepository;
        this.ordenRepository = ordenRepository;
        this.almacen = almacen;
    }

    /** Lo que hace falta para mandar una foto al navegador. */
    public record FotoParaMostrar(byte[] contenido, String tipoContenido) {
    }

    // ===================== Ver el muro =====================

    public List<ComentarioDTO> listar(Long ordenId, Usuario quien) {
        OrdenTrabajo orden = ordenRepository.findById(ordenId)
                .orElseThrow(() -> new RecursoNoEncontradoException("Orden de trabajo no encontrada con id: " + ordenId));
        if (!puedeVer(orden, quien)) {
            throw new SinPermisoException(motivoParaNoVer(quien));
        }
        return comentarioRepository.findByOrdenIdOrderByHechoEnDescIdDesc(ordenId).stream()
                .map(comentario -> ComentarioDTO.desdeEntidad(comentario, puedeBorrar(comentario, quien)))
                .toList();
    }

    // ===================== Escribir (con o sin señal) =====================

    /**
     * Guarda un comentario con sus fotos. Pasos:
     * 1. Si esa comanda ya llegó antes, devuelve el comentario que ya estaba (no sube nada de nuevo).
     * 2. Revisa que la OT exista y que la persona la pueda ver (si no: conflicto 409 con el motivo).
     * 3. Revisa el texto y las fotos (que sean imágenes de verdad, mirando sus primeros bytes).
     * 4. Sube las fotos al almacén y DESPUÉS guarda el comentario en la base
     *    (si el almacén no responde, no queda un comentario con fotos que no existen).
     */
    public ComentarioDTO publicar(Long ordenId, UUID operacionId, String texto, OffsetDateTime hechoEn,
                                  List<MultipartFile> fotos, Usuario quien) {
        Optional<ComentarioOrden> yaLlego = comentarioRepository.findByOperacionId(operacionId);
        if (yaLlego.isPresent()) {
            return comoRespuestaRepetida(yaLlego.get(), ordenId, quien);
        }

        OrdenTrabajo orden = ordenRepository.findById(ordenId)
                .orElseThrow(() -> new ConflictoSincronizacionException(Motivo.ORDEN_NO_EXISTE,
                        "La orden de trabajo ya no existe"));
        validarQuePuedeEscribir(orden, quien);

        List<FotoRecibida> recibidas = leerFotos(fotos);
        String limpio = texto == null ? "" : texto.strip();
        if (limpio.isEmpty() && recibidas.isEmpty()) {
            throw new DatoInvalidoException("texto", "Escribí un comentario o agregá al menos una foto");
        }
        if (limpio.length() > ComentarioOrden.MAX_TEXTO) {
            throw new DatoInvalidoException("texto",
                    "El comentario puede tener hasta " + ComentarioOrden.MAX_TEXTO + " caracteres");
        }

        ComentarioOrden comentario = ComentarioOrden.nuevo(operacionId, orden, quien, limpio, horaValida(hechoEn));
        for (FotoRecibida recibida : recibidas) {
            comentario.agregarFoto(recibida.tipo(), recibida.contenido().length);
        }
        subirFotos(comentario, recibidas);
        return guardar(comentario, ordenId, quien);
    }

    // ===================== Mostrar una foto =====================

    public FotoParaMostrar leerFoto(Long fotoId, Usuario quien) {
        FotoComentario foto = fotoRepository.findConOrdenById(fotoId)
                .orElseThrow(() -> new RecursoNoEncontradoException("Foto no encontrada con id: " + fotoId));
        if (!puedeVer(foto.getComentario().getOrden(), quien)) {
            throw new SinPermisoException(motivoParaNoVer(quien));
        }
        return new FotoParaMostrar(almacen.leer(foto.getArchivo()), foto.getTipoContenido());
    }

    // ===================== Borrar =====================

    /**
     * Borra el comentario y sus fotos. Primero la base (así desaparece del muro aunque el almacén no responda);
     * después los archivos del almacén. Si un archivo no se pudo borrar, queda anotado en el log.
     */
    public void borrar(Long comentarioId, Usuario quien) {
        ComentarioOrden comentario = comentarioRepository.findConFotosById(comentarioId)
                .orElseThrow(() -> new RecursoNoEncontradoException("Comentario no encontrado con id: " + comentarioId));
        if (!puedeBorrar(comentario, quien)) {
            throw new SinPermisoException("Solo quien escribió el comentario o el encargado lo pueden borrar");
        }
        List<String> archivos = comentario.getFotos().stream().map(FotoComentario::getArchivo).toList();
        comentarioRepository.delete(comentario);
        borrarArchivos(archivos);
    }

    // ===================== Reglas de quién puede qué =====================

    /** Encargado y mesa ven todas las OT; el capataz, solo las de su cuadrilla. */
    static boolean puedeVer(OrdenTrabajo orden, Usuario quien) {
        if (quien == null || quien.getRol() == null) {
            return false;
        }
        if (quien.getRol() == RolUsuario.CAPATAZ_CUADRILLA) {
            Cuadrilla cuadrilla = orden.getCuadrilla();
            return cuadrilla != null && quien.getCuadrillaId() != null
                    && Objects.equals(cuadrilla.getId(), quien.getCuadrillaId());
        }
        return quien.getRol() == RolUsuario.ENCARGADO_CORRALON || quien.getRol() == RolUsuario.MESA_ENTRADAS;
    }

    /** El encargado borra cualquiera; los demás, solo lo que escribieron. */
    static boolean puedeBorrar(ComentarioOrden comentario, Usuario quien) {
        if (quien == null) {
            return false;
        }
        if (quien.getRol() == RolUsuario.ENCARGADO_CORRALON) {
            return true;
        }
        return quien.getId() != null && Objects.equals(comentario.getAutor().getId(), quien.getId());
    }

    private static String motivoParaNoVer(Usuario quien) {
        return quien != null && quien.getRol() == RolUsuario.CAPATAZ_CUADRILLA
                ? "Esta orden no es de tu cuadrilla"
                : "Tu rol no puede ver los comentarios de las órdenes";
    }

    private static void validarQuePuedeEscribir(OrdenTrabajo orden, Usuario quien) {
        if (puedeVer(orden, quien)) {
            return;
        }
        if (quien != null && quien.getRol() == RolUsuario.CAPATAZ_CUADRILLA) {
            throw new ConflictoSincronizacionException(Motivo.OTRA_CUADRILLA, "Esta orden ya no es de tu cuadrilla");
        }
        throw new ConflictoSincronizacionException(Motivo.SIN_PERMISO, "Tu rol no puede comentar en las órdenes");
    }

    // ===================== Ayudantes =====================

    private record FotoRecibida(byte[] contenido, String tipo) {
    }

    private List<FotoRecibida> leerFotos(List<MultipartFile> fotos) {
        List<MultipartFile> archivos = fotos == null ? List.of()
                : fotos.stream().filter(Objects::nonNull).filter(foto -> !foto.isEmpty()).toList();
        if (archivos.size() > ComentarioOrden.MAX_FOTOS) {
            throw new DatoInvalidoException("fotos", "Se pueden agregar hasta " + ComentarioOrden.MAX_FOTOS + " fotos");
        }
        List<FotoRecibida> recibidas = new ArrayList<>();
        for (int i = 0; i < archivos.size(); i++) {
            MultipartFile archivo = archivos.get(i);
            String cual = "La foto " + (i + 1);
            if (archivo.getSize() > MAX_BYTES_FOTO) {
                throw new DatoInvalidoException("fotos", cual + " pesa más de 3 MB");
            }
            byte[] contenido = leerBytes(archivo, cual);
            String tipo = tipoDeImagen(contenido);
            if (tipo == null) {
                throw new DatoInvalidoException("fotos", cual + " no es una imagen JPG, PNG ni WEBP");
            }
            recibidas.add(new FotoRecibida(contenido, tipo));
        }
        return recibidas;
    }

    private static byte[] leerBytes(MultipartFile archivo, String cual) {
        try {
            return archivo.getBytes();
        } catch (IOException e) {
            throw new DatoInvalidoException("fotos", cual + " no se pudo leer. Probá mandarla de nuevo");
        }
    }

    /**
     * Qué imagen es, mirando sus primeros bytes (la "firma" de cada formato), no el nombre ni lo que dice el navegador.
     * Devuelve null si no es JPG, PNG ni WEBP.
     */
    static String tipoDeImagen(byte[] b) {
        if (b.length >= 3 && (b[0] & 0xFF) == 0xFF && (b[1] & 0xFF) == 0xD8 && (b[2] & 0xFF) == 0xFF) {
            return "image/jpeg";
        }
        if (b.length >= 8 && (b[0] & 0xFF) == 0x89 && b[1] == 'P' && b[2] == 'N' && b[3] == 'G'
                && b[4] == 0x0D && b[5] == 0x0A && b[6] == 0x1A && b[7] == 0x0A) {
            return "image/png";
        }
        if (b.length >= 12 && b[0] == 'R' && b[1] == 'I' && b[2] == 'F' && b[3] == 'F'
                && b[8] == 'W' && b[9] == 'E' && b[10] == 'B' && b[11] == 'P') {
            return "image/webp";
        }
        return null;
    }

    // Si el celular no manda la hora, o tiene el reloj adelantado, se usa la hora del servidor
    private OffsetDateTime horaValida(OffsetDateTime hechoEn) {
        OffsetDateTime ahora = OffsetDateTime.now();
        return hechoEn == null || hechoEn.isAfter(ahora) ? ahora : hechoEn;
    }

    private void subirFotos(ComentarioOrden comentario, List<FotoRecibida> recibidas) {
        List<String> subidas = new ArrayList<>();
        try {
            for (int i = 0; i < recibidas.size(); i++) {
                FotoComentario foto = comentario.getFotos().get(i);
                almacen.guardar(foto.getArchivo(), recibidas.get(i).contenido(), foto.getTipoContenido());
                subidas.add(foto.getArchivo());
            }
        } catch (RuntimeException e) {
            borrarArchivos(subidas); // no dejar fotos sueltas de un comentario que no se guardó
            throw e;
        }
    }

    private ComentarioDTO guardar(ComentarioOrden comentario, Long ordenId, Usuario quien) {
        try {
            ComentarioOrden guardado = comentarioRepository.save(comentario);
            return ComentarioDTO.desdeEntidad(guardado, puedeBorrar(guardado, quien));
        } catch (DataIntegrityViolationException e) {
            // Dos envíos de la misma comanda al mismo tiempo: ganó el otro. Las fotos son las mismas (mismo nombre).
            Optional<ComentarioOrden> elOtro = comentarioRepository.findByOperacionId(comentario.getOperacionId());
            if (elOtro.isPresent()) {
                return comoRespuestaRepetida(elOtro.get(), ordenId, quien);
            }
            borrarArchivos(comentario.getFotos().stream().map(FotoComentario::getArchivo).toList());
            throw e;
        }
    }

    // La misma comanda llegó otra vez: si es el mismo comentario, se responde igual que la primera vez
    private ComentarioDTO comoRespuestaRepetida(ComentarioOrden existente, Long ordenId, Usuario quien) {
        boolean mismaOrden = Objects.equals(existente.getOrden().getId(), ordenId);
        boolean mismoAutor = quien != null && Objects.equals(existente.getAutor().getId(), quien.getId());
        if (!mismaOrden || !mismoAutor) {
            throw new OperacionNoPermitidaException("Ese número de operación ya se usó para otro comentario");
        }
        return ComentarioDTO.desdeEntidad(existente, puedeBorrar(existente, quien));
    }

    private void borrarArchivos(List<String> archivos) {
        for (String archivo : archivos) {
            try {
                almacen.borrar(archivo);
            } catch (RuntimeException e) {
                log.warn("No se pudo borrar la foto '{}' del almacén (queda suelta): {}", archivo, e.getMessage());
            }
        }
    }
}
