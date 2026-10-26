package com.faro.backend.config.security;

import com.faro.backend.controllers.AutenticacionController;
import com.faro.backend.controllers.EstadoOrdenController;
import com.faro.backend.controllers.OrdenTrabajoController;
import com.faro.backend.models.RolUsuario;
import com.faro.backend.models.Usuario;
import com.faro.backend.services.AutenticacionService;
import com.faro.backend.services.EstadoOrdenService;
import com.faro.backend.services.OrdenTrabajoService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * "La puerta cerrada": sin iniciar sesión no se puede usar la API (salvo el login, Swagger y el preflight CORS).
 *
 * Ojo: los demás tests de controllers (@WebMvcTest) NO cargan SecurityConfig, así que prueban
 * solo el controller, sin seguridad. Acá lo importamos a propósito (@Import) para probar la seguridad real.
 * user(...) simula un usuario que ya inició sesión (como si hubiera mandado un token válido).
 */
@WebMvcTest(controllers = {EstadoOrdenController.class, OrdenTrabajoController.class, AutenticacionController.class})
@Import(SecurityConfig.class)
class PuertaCerradaTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private EstadoOrdenService estadoOrdenService;

    @MockitoBean
    private OrdenTrabajoService ordenTrabajoService;

    @MockitoBean
    private AutenticacionService autenticacionService;

    private static UsuarioDetalles encargado() {
        return new UsuarioDetalles(new Usuario("Martín", "Gómez", "encargado@generalpaz.gob.ar", "clave-hasheada",
                RolUsuario.ENCARGADO_CORRALON, null, true));
    }

    @Test
    void consultarSinTokenResponde401ConElFormatoDeErrorDeFaro() throws Exception {
        mockMvc.perform(get("/api/estados-orden"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.estado").value(401))
                .andExpect(jsonPath("$.mensaje").value("Acceso no autorizado. Debe iniciar sesión con credenciales válidas."));

        verifyNoInteractions(estadoOrdenService);
    }

    @Test
    void crearUnaOrdenSinTokenResponde401YNoLlegaALaCocina() throws Exception {
        mockMvc.perform(post("/api/ordenes-trabajo").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnauthorized());

        verifyNoInteractions(ordenTrabajoService);
    }

    @Test
    void conSesionIniciadaSePuedeConsultar() throws Exception {
        when(estadoOrdenService.listar()).thenReturn(List.of());

        mockMvc.perform(get("/api/estados-orden").with(user(encargado())))
                .andExpect(status().isOk());
    }

    @Test
    void elLoginSigueAbiertoSinToken() throws Exception {
        // Con el cuerpo vacío responde 400 (faltan email y contraseña): lo importante es que NO responde 401.
        mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void elPreflightDelNavegadorPasaSinToken() throws Exception {
        // Antes de un pedido con "Authorization", el navegador pregunta con OPTIONS (sin token) si puede hacerlo.
        mockMvc.perform(options("/api/estados-orden")
                        .header("Origin", "http://localhost:5173")
                        .header("Access-Control-Request-Method", "GET")
                        .header("Access-Control-Request-Headers", "authorization,content-type"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"));
    }
}