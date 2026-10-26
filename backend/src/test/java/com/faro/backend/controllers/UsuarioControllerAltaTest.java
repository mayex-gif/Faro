package com.faro.backend.controllers;

import com.faro.backend.dto.UsuarioAltaRequestDTO;
import com.faro.backend.dto.UsuarioDTO;
import com.faro.backend.exceptions.OperacionNoPermitidaException;
import com.faro.backend.models.RolUsuario;
import com.faro.backend.services.UsuarioService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Alta de usuarios desde el mozo (controller): validaciones del pedido (400) y respuestas.
 * Sin seguridad (los permisos se prueban en PermisosUsuariosTest).
 */
@WebMvcTest(UsuarioController.class)
class UsuarioControllerAltaTest {

    private static final String URL = "/api/usuarios";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private UsuarioService service;

    private static String json(String email, String rol, String clave) {
        return """
                {
                  "nombre": "Lucía",
                  "apellido": "Fernández",
                  "email": %s,
                  "rol": %s,
                  "cuadrillaId": null,
                  "clave": %s
                }
                """.formatted(email, rol, clave);
    }

    @Test
    void altaValidaResponde201ConElUsuarioSinLaClave() throws Exception {
        when(service.crear(any(UsuarioAltaRequestDTO.class))).thenReturn(new UsuarioDTO(10L, "Lucía", "Fernández",
                "lucia@generalpaz.gob.ar", RolUsuario.MESA_ENTRADAS, null, true));

        mockMvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON)
                        .content(json("\"lucia@generalpaz.gob.ar\"", "\"MESA_ENTRADAS\"", "\"clave-de-prueba\"")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(10))
                .andExpect(jsonPath("$.activo").value(true))
                .andExpect(jsonPath("$.clave").doesNotExist())
                .andExpect(jsonPath("$.password").doesNotExist());
    }

    @Test
    void altaConEmailInvalidoClaveCortaYSinRolResponde400ConLosCampos() throws Exception {
        mockMvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON)
                        .content(json("\"no-es-un-email\"", "null", "\"corta\"")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores.email").value("El email no tiene un formato válido"))
                .andExpect(jsonPath("$.errores.rol").value("El rol es obligatorio"))
                .andExpect(jsonPath("$.errores.clave").value("La clave tiene que tener entre 8 y 72 caracteres"));

        verifyNoInteractions(service);
    }

    @Test
    void altaSinEmailNiClaveResponde400() throws Exception {
        mockMvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON)
                        .content(json("\"\"", "\"MESA_ENTRADAS\"", "null")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores.email").value("El email es obligatorio"))
                .andExpect(jsonPath("$.errores.clave").value("La clave inicial es obligatoria"));

        verifyNoInteractions(service);
    }

    @Test
    void altaConRolQueNoExisteResponde400() throws Exception {
        mockMvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON)
                        .content(json("\"lucia@generalpaz.gob.ar\"", "\"INTENDENTE\"", "\"clave-de-prueba\"")))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(service);
    }

    @Test
    void altaConEmailRepetidoResponde409() throws Exception {
        when(service.crear(any(UsuarioAltaRequestDTO.class)))
                .thenThrow(new OperacionNoPermitidaException("Ya existe un usuario con ese email"));

        mockMvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON)
                        .content(json("\"encargado@generalpaz.gob.ar\"", "\"MESA_ENTRADAS\"", "\"clave-de-prueba\"")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.mensaje").value("Ya existe un usuario con ese email"));
    }
}
