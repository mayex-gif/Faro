package com.faro.backend.controllers;

import com.faro.backend.config.security.SecurityConfig;
import com.faro.backend.config.security.UsuarioDetalles;
import com.faro.backend.dto.UsuarioDTO;
import com.faro.backend.exceptions.OperacionNoPermitidaException;
import com.faro.backend.models.RolUsuario;
import com.faro.backend.services.UsuarioService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static com.faro.backend.config.security.UsuariosDePrueba.encargado;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Baja / reactivar y restablecer clave desde el mozo (controller).
 * Carga la seguridad real (@Import(SecurityConfig.class)) porque la baja le pasa al service
 * quién hace el pedido (@AuthenticationPrincipal).
 */
@WebMvcTest(UsuarioController.class)
@Import(SecurityConfig.class)
class UsuarioControllerBajaYClaveTest {

    private static final String URL = "/api/usuarios/4";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private UsuarioService service;

    @Test
    void darDeBajaLePasaAlServiceQuienHaceElPedido() throws Exception {
        UsuarioDetalles quien = encargado();
        when(service.cambiarActivo(eq(4L), eq(false), any())).thenReturn(new UsuarioDTO(4L, "Ana", "Martínez",
                "mesadeentradas@generalpaz.gob.ar", RolUsuario.MESA_ENTRADAS, null, false));

        mockMvc.perform(patch(URL + "/activo").with(user(quien))
                        .contentType(MediaType.APPLICATION_JSON).content("{ \"activo\": false }"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.activo").value(false));

        verify(service).cambiarActivo(4L, false, quien.getUsuario());
    }

    @Test
    void darDeBajaSinIndicarActivoResponde400() throws Exception {
        mockMvc.perform(patch(URL + "/activo").with(user(encargado()))
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores.activo").value("Hay que indicar si la cuenta queda activa o no"));

        verifyNoInteractions(service);
    }

    @Test
    void darseDeBajaASiMismoResponde409() throws Exception {
        when(service.cambiarActivo(eq(4L), eq(false), any()))
                .thenThrow(new OperacionNoPermitidaException("No te podés dar de baja a vos mismo"));

        mockMvc.perform(patch(URL + "/activo").with(user(encargado()))
                        .contentType(MediaType.APPLICATION_JSON).content("{ \"activo\": false }"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.mensaje").value("No te podés dar de baja a vos mismo"));
    }

    @Test
    void restablecerClaveResponde204SinDevolverNada() throws Exception {
        mockMvc.perform(patch(URL + "/clave").with(user(encargado()))
                        .contentType(MediaType.APPLICATION_JSON).content("{ \"clave\": \"clave-nueva-123\" }"))
                .andExpect(status().isNoContent())
                .andExpect(content().string(""));

        verify(service).restablecerClave(4L, "clave-nueva-123");
    }

    @Test
    void restablecerConUnaClaveCortaResponde400() throws Exception {
        mockMvc.perform(patch(URL + "/clave").with(user(encargado()))
                        .contentType(MediaType.APPLICATION_JSON).content("{ \"clave\": \"corta\" }"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores.clave").value("La clave tiene que tener entre 8 y 72 caracteres"));

        verifyNoInteractions(service);
    }
}
