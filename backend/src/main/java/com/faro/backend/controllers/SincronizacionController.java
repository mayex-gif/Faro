package com.faro.backend.controllers;

import com.faro.backend.config.security.UsuarioDetalles;
import com.faro.backend.dto.AltaOrdenSinSenalDTO;
import com.faro.backend.dto.CambioEstadoSinSenalDTO;
import com.faro.backend.dto.OrdenTrabajoDTO;
import com.faro.backend.services.SincronizacionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * Lo que se hizo en el celular sin señal y llega cuando vuelve la red.
 * Es PUT a propósito: PUT significa "dejá esto así". Mandar dos veces el mismo PUT deja todo igual que mandarlo
 * una vez, y eso es justo lo que necesita un celular que reintenta sin saber si el primer envío llegó.
 * El {operacionId} es el número de comanda que inventó el celular (un UUID).
 * Los permisos son los mismos que en /api/ordenes-trabajo.
 */
@RestController
@RequestMapping("/api/sincronizacion")
@Tag(name = "Sincronización sin señal",
        description = "Cambios hechos en el celular sin señal. Cada uno trae su número de operación: si llega dos veces, se aplica una sola.")
public class SincronizacionController {

    private final SincronizacionService service;

    public SincronizacionController(SincronizacionService service) {
        this.service = service;
    }

    @PutMapping("/cambios-estado/{operacionId}")
    @PreAuthorize("hasAnyRole('ENCARGADO_CORRALON', 'CAPATAZ_CUADRILLA')")
    @Operation(summary = "Recibir un cambio de estado hecho sin señal",
            description = "Aplica el cambio una sola vez aunque llegue repetido (mismo operacionId): la segunda vez "
                    + "responde la OT como quedó, sin volver a cambiarla. Mismas reglas que PATCH /api/ordenes-trabajo/{id}/estado.")
    public OrdenTrabajoDTO cambiarEstado(@PathVariable UUID operacionId, @Valid @RequestBody CambioEstadoSinSenalDTO pedido,
                                         @Parameter(hidden = true) @AuthenticationPrincipal UsuarioDetalles usuario) {
        return service.cambiarEstado(operacionId, pedido, usuario.getUsuario());
    }

    @PutMapping("/altas-orden/{operacionId}")
    @PreAuthorize("hasAnyRole('ENCARGADO_CORRALON', 'MESA_ENTRADAS')")
    @Operation(summary = "Recibir una orden de trabajo cargada sin señal",
            description = "Crea la OT una sola vez aunque llegue repetida (mismo operacionId): la segunda vez responde "
                    + "la misma OT. Mismas validaciones que POST /api/ordenes-trabajo.")
    public OrdenTrabajoDTO crearOrden(@PathVariable UUID operacionId, @Valid @RequestBody AltaOrdenSinSenalDTO pedido,
                                      @Parameter(hidden = true) @AuthenticationPrincipal UsuarioDetalles usuario) {
        return service.crearOrden(operacionId, pedido, usuario.getUsuario());
    }
}
