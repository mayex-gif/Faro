package com.faro.backend.controllers;

import com.faro.backend.dto.LoginRequestDTO;
import com.faro.backend.dto.LoginResponseDTO;
import com.faro.backend.dto.UsuarioDTO;
import com.faro.backend.exceptions.OperacionNoPermitidaException;
import com.faro.backend.models.RolUsuario;
import com.faro.backend.services.AutenticacionService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AutenticacionController.class)
class AutenticacionControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AutenticacionService autenticacionService;

    @Test
    void loginConCredencialesValidasDevuelve200YToken() throws Exception {
        UsuarioDTO usuarioDTO = new UsuarioDTO(1L, "Martín", "Gómez", "encargado@generalpaz.gob.ar",
                RolUsuario.ENCARGADO_CORRALON, null, true);
        LoginResponseDTO respuesta = new LoginResponseDTO("token.jwt.valido", 86400000L, usuarioDTO);

        when(autenticacionService.autenticar(any(LoginRequestDTO.class))).thenReturn(respuesta);

        String json = """
                {
                  "email": "encargado@generalpaz.gob.ar",
                  "password": "Faro2026!"
                }
                """;

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("token.jwt.valido"))
                .andExpect(jsonPath("$.tipoToken").value("Bearer"))
                .andExpect(jsonPath("$.expiraEn").value(86400000L))
                .andExpect(jsonPath("$.usuario.id").value(1))
                .andExpect(jsonPath("$.usuario.email").value("encargado@generalpaz.gob.ar"))
                .andExpect(jsonPath("$.usuario.rol").value("ENCARGADO_CORRALON"));
    }

    @Test
    void loginConCamposVaciosDevuelve400BadRequest() throws Exception {
        String json = """
                {
                  "email": "",
                  "password": ""
                }
                """;

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.estado").value(400))
                .andExpect(jsonPath("$.errores.email").exists())
                .andExpect(jsonPath("$.errores.password").exists());
    }

    @Test
    void loginConEmailInvalidoDevuelve400BadRequest() throws Exception {
        String json = """
                {
                  "email": "formato-invalido",
                  "password": "Faro2026!"
                }
                """;

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores.email").exists());
    }

    @Test
    void loginConCredencialesIncorrectasDevuelve401Unauthorized() throws Exception {
        when(autenticacionService.autenticar(any(LoginRequestDTO.class)))
                .thenThrow(new BadCredentialsException("Correo o contraseña incorrectos"));

        String json = """
                {
                  "email": "encargado@generalpaz.gob.ar",
                  "password": "claveIncorrecta"
                }
                """;

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.estado").value(401))
                .andExpect(jsonPath("$.mensaje").value("Correo o contraseña incorrectos"));
    }

    @Test
    void loginConUsuarioDesactivadoDevuelve409Conflict() throws Exception {
        when(autenticacionService.autenticar(any(LoginRequestDTO.class)))
                .thenThrow(new OperacionNoPermitidaException("La cuenta de usuario se encuentra desactivada"));

        String json = """
                {
                  "email": "desactivado@generalpaz.gob.ar",
                  "password": "Faro2026!"
                }
                """;

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.estado").value(409));
    }

    @Test
    void perfilDevuelve200ConDatosDeUsuario() throws Exception {
        UsuarioDTO usuarioDTO = new UsuarioDTO(1L, "Martín", "Gómez", "encargado@generalpaz.gob.ar",
                RolUsuario.ENCARGADO_CORRALON, null, true);

        when(autenticacionService.obtenerPerfilActual()).thenReturn(usuarioDTO);

        mockMvc.perform(get("/api/auth/perfil"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.email").value("encargado@generalpaz.gob.ar"))
                .andExpect(jsonPath("$.rol").value("ENCARGADO_CORRALON"));
    }

    @Test
    void perfilSinSesionDevuelve401Unauthorized() throws Exception {
        when(autenticacionService.obtenerPerfilActual())
                .thenThrow(new BadCredentialsException("No hay una sesión autenticada activa"));

        mockMvc.perform(get("/api/auth/perfil"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.estado").value(401));
    }

    @Test
    void validarTokenDevuelve200ConDatosDeUsuario() throws Exception {
        UsuarioDTO usuarioDTO = new UsuarioDTO(1L, "Martín", "Gómez", "encargado@generalpaz.gob.ar",
                RolUsuario.ENCARGADO_CORRALON, null, true);

        when(autenticacionService.validarToken("Bearer token.valido")).thenReturn(usuarioDTO);

        mockMvc.perform(get("/api/auth/validar")
                        .header("Authorization", "Bearer token.valido"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("encargado@generalpaz.gob.ar"));
    }

    @Test
    void perfilConAccesoDenegadoDevuelve403Forbidden() throws Exception {
        when(autenticacionService.obtenerPerfilActual())
                .thenThrow(new org.springframework.security.access.AccessDeniedException("Acceso denegado"));

        mockMvc.perform(get("/api/auth/perfil"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.estado").value(403))
                .andExpect(jsonPath("$.mensaje").value("No tiene permisos para realizar esta acción"));
    }
}
