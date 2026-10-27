package com.faro.backend.controllers;

import com.faro.backend.dto.CambiarActivoUsuarioRequestDTO;
import com.faro.backend.dto.CrearUsuarioRequestDTO;
import com.faro.backend.dto.ModificarUsuarioRequestDTO;
import com.faro.backend.dto.UsuarioDTO;
import com.faro.backend.exceptions.RecursoNoEncontradoException;
import com.faro.backend.models.RolUsuario;
import com.faro.backend.services.UsuarioService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(UsuarioController.class)
@Import(UsuarioControllerTest.TestSecurityConfig.class)
class UsuarioControllerTest {

    @TestConfiguration
    @EnableMethodSecurity
    static class TestSecurityConfig {
    }

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @MockitoBean
    private UsuarioService usuarioService;

    private final UsuarioDTO usuarioDTO = new UsuarioDTO(
            1L, "Martín", "Gómez", "encargado@generalpaz.gob.ar",
            RolUsuario.ENCARGADO_CORRALON, null, true
    );

    @Test
    @WithMockUser(roles = "ENCARGADO_CORRALON")
    void listarUsuariosDevuelve200ConListado() throws Exception {
        when(usuarioService.listar(null, null)).thenReturn(List.of(usuarioDTO));

        mockMvc.perform(get("/api/usuarios"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(1L))
                .andExpect(jsonPath("$[0].email").value("encargado@generalpaz.gob.ar"))
                .andExpect(jsonPath("$[0].rol").value("ENCARGADO_CORRALON"));
    }

    @Test
    @WithMockUser(roles = "ENCARGADO_CORRALON")
    void listarUsuariosConFiltrosDevuelve200() throws Exception {
        when(usuarioService.listar(RolUsuario.ENCARGADO_CORRALON, true)).thenReturn(List.of(usuarioDTO));

        mockMvc.perform(get("/api/usuarios")
                        .param("rol", "ENCARGADO_CORRALON")
                        .param("activo", "true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(1L));
    }

    @Test
    @WithMockUser(roles = "ENCARGADO_CORRALON")
    void obtenerPorIdDevuelve200() throws Exception {
        when(usuarioService.obtenerPorId(1L)).thenReturn(usuarioDTO);

        mockMvc.perform(get("/api/usuarios/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1L))
                .andExpect(jsonPath("$.nombre").value("Martín"));
    }

    @Test
    @WithMockUser(roles = "ENCARGADO_CORRALON")
    void obtenerPorIdInexistenteDevuelve404() throws Exception {
        when(usuarioService.obtenerPorId(99L)).thenThrow(new RecursoNoEncontradoException("No existe el usuario"));

        mockMvc.perform(get("/api/usuarios/99"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.estado").value(404));
    }

    @Test
    @WithMockUser(roles = "ENCARGADO_CORRALON")
    void crearUsuarioValidoDevuelve201() throws Exception {
        CrearUsuarioRequestDTO request = new CrearUsuarioRequestDTO(
                "Carlos", "López", "carlos@generalpaz.gob.ar", "Faro2026!",
                RolUsuario.CAPATAZ_CUADRILLA, 1L, true
        );
        UsuarioDTO creado = new UsuarioDTO(2L, "Carlos", "López", "carlos@generalpaz.gob.ar",
                RolUsuario.CAPATAZ_CUADRILLA, 1L, true);

        when(usuarioService.crear(any(CrearUsuarioRequestDTO.class))).thenReturn(creado);

        mockMvc.perform(post("/api/usuarios")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(2L))
                .andExpect(jsonPath("$.email").value("carlos@generalpaz.gob.ar"));
    }

    @Test
    @WithMockUser(roles = "ENCARGADO_CORRALON")
    void crearUsuarioInvalidoDevuelve400() throws Exception {
        CrearUsuarioRequestDTO requestInvalido = new CrearUsuarioRequestDTO(
                "", "", "email-invalido", "123", null, null, true
        );

        mockMvc.perform(post("/api/usuarios")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestInvalido)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.estado").value(400));
    }

    @Test
    @WithMockUser(username = "encargado@generalpaz.gob.ar", roles = "ENCARGADO_CORRALON")
    void modificarUsuarioValidoDevuelve200() throws Exception {
        ModificarUsuarioRequestDTO request = new ModificarUsuarioRequestDTO(
                "Martín Editado", "Gómez", "encargado@generalpaz.gob.ar",
                "nuevaClave123", RolUsuario.ENCARGADO_CORRALON, null, true
        );
        UsuarioDTO modificado = new UsuarioDTO(1L, "Martín Editado", "Gómez", "encargado@generalpaz.gob.ar",
                RolUsuario.ENCARGADO_CORRALON, null, true);

        when(usuarioService.modificar(eq(1L), any(ModificarUsuarioRequestDTO.class), any()))
                .thenReturn(modificado);

        mockMvc.perform(put("/api/usuarios/1")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nombre").value("Martín Editado"));
    }

    @Test
    @WithMockUser(roles = "ENCARGADO_CORRALON")
    void modificarUsuarioInvalidoDevuelve400() throws Exception {
        ModificarUsuarioRequestDTO requestInvalido = new ModificarUsuarioRequestDTO(
                "", "", "no-es-un-email", "123", null, null, true
        );

        mockMvc.perform(put("/api/usuarios/1")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestInvalido)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.estado").value(400));
    }

    @Test
    @WithMockUser(username = "encargado@generalpaz.gob.ar", roles = "ENCARGADO_CORRALON")
    void cambiarEstadoActivoValidoDevuelve200() throws Exception {
        CambiarActivoUsuarioRequestDTO request = new CambiarActivoUsuarioRequestDTO(false);
        UsuarioDTO actualizado = new UsuarioDTO(2L, "Carlos", "López", "carlos@generalpaz.gob.ar",
                RolUsuario.CAPATAZ_CUADRILLA, 1L, false);

        when(usuarioService.cambiarEstadoActivo(eq(2L), eq(false), any()))
                .thenReturn(actualizado);

        mockMvc.perform(patch("/api/usuarios/2/activo")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.activo").value(false));
    }

    @Test
    @WithMockUser(roles = "ENCARGADO_CORRALON")
    void cambiarEstadoActivoInvalidoDevuelve400() throws Exception {
        CambiarActivoUsuarioRequestDTO requestInvalido = new CambiarActivoUsuarioRequestDTO(null);

        mockMvc.perform(patch("/api/usuarios/2/activo")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestInvalido)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.estado").value(400));
    }

    @Test
    @WithMockUser(username = "encargado@generalpaz.gob.ar", roles = "ENCARGADO_CORRALON")
    void eliminarUsuarioDevuelve204() throws Exception {
        doNothing().when(usuarioService).eliminar(eq(2L), any());

        mockMvc.perform(delete("/api/usuarios/2")
                        .with(csrf()))
                .andExpect(status().isNoContent());
    }

    @Test
    @WithMockUser(roles = "CAPATAZ_CUADRILLA")
    void accesoDenegadoParaRolNoEncargadoDevuelve403() throws Exception {
        mockMvc.perform(get("/api/usuarios"))
                .andExpect(status().isForbidden());
    }

    @Test
    void controladorManejaPrincipalNullCorrectamente() {
        UsuarioService mockService = mock(UsuarioService.class);
        UsuarioController controller = new UsuarioController(mockService);

        ModificarUsuarioRequestDTO modRequest = new ModificarUsuarioRequestDTO("A", "B", "a@b.com", null, RolUsuario.ENCARGADO_CORRALON, null, true);
        controller.modificar(1L, modRequest, null);
        verify(mockService).modificar(1L, modRequest, null);

        CambiarActivoUsuarioRequestDTO activoRequest = new CambiarActivoUsuarioRequestDTO(true);
        controller.cambiarEstadoActivo(1L, activoRequest, null);
        verify(mockService).cambiarEstadoActivo(1L, true, null);

        controller.eliminar(1L, null);
        verify(mockService).eliminar(1L, null);
    }
}
