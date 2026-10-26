package com.faro.backend.controllers;

import com.faro.backend.config.security.SecurityConfig;
import com.faro.backend.dto.UsuarioDTO;
import com.faro.backend.models.RolUsuario;
import com.faro.backend.services.UsuarioService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static com.faro.backend.config.security.UsuariosDePrueba.capataz;
import static com.faro.backend.config.security.UsuariosDePrueba.encargado;
import static com.faro.backend.config.security.UsuariosDePrueba.mesaDeEntradas;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Quién puede gestionar usuarios (con la seguridad real: @Import(SecurityConfig.class)).
 * Encargado y mesa de entradas: sí. Capataz: 403. Sin sesión: 401.
 */
@WebMvcTest(UsuarioController.class)
@Import(SecurityConfig.class)
class PermisosUsuariosTest {

    private static final String URL = "/api/usuarios";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private UsuarioService service;

    private static UsuarioDTO mesa() {
        return new UsuarioDTO(4L, "Ana", "Martínez", "mesadeentradas@generalpaz.gob.ar",
                RolUsuario.MESA_ENTRADAS, null, true);
    }

    // ---------- Listar ----------

    @Test
    void elEncargadoPuedeListarLosUsuariosYNoVeLaClave() throws Exception {
        when(service.listar()).thenReturn(List.of(mesa()));

        mockMvc.perform(get(URL).with(user(encargado())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(4))
                .andExpect(jsonPath("$[0].email").value("mesadeentradas@generalpaz.gob.ar"))
                .andExpect(jsonPath("$[0].rol").value("MESA_ENTRADAS"))
                .andExpect(jsonPath("$[0].activo").value(true))
                .andExpect(jsonPath("$[0].password").doesNotExist());
    }

    @Test
    void mesaDeEntradasPuedeListarLosUsuarios() throws Exception {
        when(service.listar()).thenReturn(List.of(mesa()));

        mockMvc.perform(get(URL).with(user(mesaDeEntradas())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    void elCapatazNoPuedeListarLosUsuarios() throws Exception {
        mockMvc.perform(get(URL).with(user(capataz(1L))))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.estado").value(403))
                .andExpect(jsonPath("$.mensaje").value("No tiene permisos para realizar esta acción"));

        verifyNoInteractions(service);
    }

    @Test
    void sinSesionNoSePuedenListarLosUsuarios() throws Exception {
        mockMvc.perform(get(URL))
                .andExpect(status().isUnauthorized());

        verifyNoInteractions(service);
    }
}