package com.faro.backend.controllers;

import com.faro.backend.dto.UsuarioDTO;
import com.faro.backend.dto.UsuarioRequestDTO;
import com.faro.backend.exceptions.OperacionNoPermitidaException;
import com.faro.backend.exceptions.RecursoNoEncontradoException;
import com.faro.backend.models.RolUsuario;
import com.faro.backend.services.UsuarioService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Modificación de usuarios desde el mozo (controller): validaciones del pedido (400) y respuestas.
 * Sin seguridad (los permisos se prueban en PermisosUsuariosTest).
 */
@WebMvcTest(UsuarioController.class)
class UsuarioControllerModificacionTest {

    private static final String URL = "/api/usuarios/4";

    private static final String JSON_VALIDO = """
            {
              "nombre": "Ana María",
              "apellido": "Martínez",
              "email": "ana.martinez@generalpaz.gob.ar",
              "rol": "MESA_ENTRADAS",
              "cuadrillaId": null
            }
            """;

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private UsuarioService service;

    @Test
    void modificacionValidaResponde200ConElUsuario() throws Exception {
        when(service.modificar(eq(4L), any(UsuarioRequestDTO.class))).thenReturn(new UsuarioDTO(4L, "Ana María", "Martínez",
                "ana.martinez@generalpaz.gob.ar", RolUsuario.MESA_ENTRADAS, null, true));

        mockMvc.perform(put(URL).contentType(MediaType.APPLICATION_JSON).content(JSON_VALIDO))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nombre").value("Ana María"))
                .andExpect(jsonPath("$.password").doesNotExist());
    }

    @Test
    void modificacionSinNombreYConEmailInvalidoResponde400() throws Exception {
        mockMvc.perform(put(URL).contentType(MediaType.APPLICATION_JSON).content("""
                        { "nombre": "", "apellido": "Martínez", "email": "no-es-un-email", "rol": "MESA_ENTRADAS" }
                        """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores.nombre").value("El nombre es obligatorio"))
                .andExpect(jsonPath("$.errores.email").value("El email no tiene un formato válido"));

        verifyNoInteractions(service);
    }

    @Test
    void modificarUnUsuarioQueNoExisteResponde404() throws Exception {
        when(service.modificar(eq(4L), any(UsuarioRequestDTO.class)))
                .thenThrow(new RecursoNoEncontradoException("Usuario no encontrado"));

        mockMvc.perform(put(URL).contentType(MediaType.APPLICATION_JSON).content(JSON_VALIDO))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.mensaje").value("Usuario no encontrado"));
    }

    @Test
    void sacarleElRolAlUltimoEncargadoResponde409() throws Exception {
        when(service.modificar(eq(4L), any(UsuarioRequestDTO.class)))
                .thenThrow(new OperacionNoPermitidaException("No se le puede cambiar el rol al último encargado activo"));

        mockMvc.perform(put(URL).contentType(MediaType.APPLICATION_JSON).content(JSON_VALIDO))
                .andExpect(status().isConflict());
    }
}
