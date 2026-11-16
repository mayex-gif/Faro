package com.faro.backend.controllers;

import com.faro.backend.config.security.UsuarioDetalles;
import com.faro.backend.dto.ComentarioDTO;
import com.faro.backend.services.ComentarioService;
import com.faro.backend.services.ComentarioService.FotoParaMostrar;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/**
 * El "mozo" del muro "Comentarios y fotos" de cada OT. Las reglas (quién ve, quién borra, qué es una foto válida)
 * están en ComentarioService. Pueden usarlo los tres roles; que el capataz solo vea las OT de SU cuadrilla
 * y que solo el autor o el encargado borren se controla en el service.
 */
@RestController
@PreAuthorize("hasAnyRole('ENCARGADO_CORRALON', 'MESA_ENTRADAS', 'CAPATAZ_CUADRILLA')")
@Tag(name = "Comentarios y fotos", description = "El muro de cada orden de trabajo: mensajes con texto, fotos o las dos cosas")
public class ComentarioController {

    private final ComentarioService service;

    public ComentarioController(ComentarioService service) {
        this.service = service;
    }

    @GetMapping("/api/ordenes-trabajo/{ordenId}/comentarios")
    @Operation(summary = "Ver los comentarios de una orden",
            description = "Del más nuevo al más viejo, con sus fotos. El capataz solo ve los de las órdenes de su cuadrilla (si no: 403).")
    public List<ComentarioDTO> listar(@PathVariable Long ordenId,
                                      @Parameter(hidden = true) @AuthenticationPrincipal UsuarioDetalles usuario) {
        return service.listar(ordenId, usuario.getUsuario());
    }

    // PUT (y no POST) a propósito, como en /api/sincronizacion: mandar dos veces el mismo comentario
    // (mismo operacionId) lo guarda una sola vez. Así el celular puede reintentar sin miedo a duplicar.
    @PutMapping(value = "/api/ordenes-trabajo/{ordenId}/comentarios/{operacionId}",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Escribir un comentario (con o sin fotos)",
            description = "Se manda como formulario (multipart): \"texto\" (hasta 1000 caracteres), \"fotos\" (hasta 5 imágenes "
                    + "JPG, PNG o WEBP de hasta 3 MB cada una) y \"hechoEn\" (cuándo se escribió, por si llega tarde). "
                    + "Hace falta texto o al menos una foto. El operacionId lo inventa el celular (UUID): si llega dos veces, "
                    + "se guarda una sola. Si la orden ya no existe o ya no es de la cuadrilla del capataz: 409 con el motivo.")
    public ComentarioDTO publicar(@PathVariable Long ordenId, @PathVariable UUID operacionId,
                                  @RequestParam(required = false) String texto,
                                  @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime hechoEn,
                                  @RequestPart(required = false) List<MultipartFile> fotos,
                                  @Parameter(hidden = true) @AuthenticationPrincipal UsuarioDetalles usuario) {
        return service.publicar(ordenId, operacionId, texto, hechoEn, fotos, usuario.getUsuario());
    }

    @GetMapping("/api/comentarios/fotos/{fotoId}")
    @Operation(summary = "Bajar una foto",
            description = "Devuelve la imagen. Pide sesión (header Authorization), por eso el frontend la baja con fetch "
                    + "y no con <img src>. Mismos permisos que ver los comentarios de la orden.")
    public ResponseEntity<byte[]> foto(@PathVariable Long fotoId,
                                       @Parameter(hidden = true) @AuthenticationPrincipal UsuarioDetalles usuario) {
        FotoParaMostrar foto = service.leerFoto(fotoId, usuario.getUsuario());
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(foto.tipoContenido()))
                // Una foto nunca cambia: el navegador la puede guardar un día, pero solo para esta persona (private)
                .cacheControl(CacheControl.maxAge(Duration.ofDays(1)).cachePrivate())
                .body(foto.contenido());
    }

    @DeleteMapping("/api/comentarios/{comentarioId}")
    @Operation(summary = "Borrar un comentario con sus fotos",
            description = "Lo puede borrar quien lo escribió o el encargado (si no: 403). Queda registrado en la auditoría.")
    public ResponseEntity<Void> borrar(@PathVariable Long comentarioId,
                                       @Parameter(hidden = true) @AuthenticationPrincipal UsuarioDetalles usuario) {
        service.borrar(comentarioId, usuario.getUsuario());
        return ResponseEntity.noContent().build();
    }
}
