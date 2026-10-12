package com.faro.backend.config;

import com.faro.backend.controllers.EstadoOrdenController;
import com.faro.backend.services.EstadoOrdenService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Tests de CorsConfig: la lista de orígenes permitidos sale de la property faro.cors.origenes.
 * Se simula el "preflight" (OPTIONS) que hace el navegador antes de llamar a la API desde otra página.
 * Se usa EstadoOrdenController solo porque es un endpoint simple; el service es un mock.
 */
@WebMvcTest(EstadoOrdenController.class)
@TestPropertySource(properties = "faro.cors.origenes=https://faro-front.example.com, https://otro-front.example.com")
class CorsConfigTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private EstadoOrdenService service;

    @Test
    void permiteElPrimerOrigenDeLaLista() throws Exception {
        mockMvc.perform(options("/api/estados-orden")
                        .header("Origin", "https://faro-front.example.com")
                        .header("Access-Control-Request-Method", "GET"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "https://faro-front.example.com"))
                .andExpect(header().string("Access-Control-Allow-Credentials", "true"));
    }

    @Test
    void permiteElSegundoOrigenAunqueTengaUnEspacioDespuesDeLaComa() throws Exception {
        mockMvc.perform(options("/api/estados-orden")
                        .header("Origin", "https://otro-front.example.com")
                        .header("Access-Control-Request-Method", "PATCH"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "https://otro-front.example.com"));
    }

    @Test
    void rechazaUnOrigenQueNoEstaEnLaLista() throws Exception {
        mockMvc.perform(options("/api/estados-orden")
                        .header("Origin", "https://pagina-cualquiera.example.com")
                        .header("Access-Control-Request-Method", "GET"))
                .andExpect(status().isForbidden())
                .andExpect(header().doesNotExist("Access-Control-Allow-Origin"));
    }

    @Test
    void elFrontendLocalYaNoEntraSiSeCambioLaLista() throws Exception {
        mockMvc.perform(options("/api/estados-orden")
                        .header("Origin", "http://localhost:5173")
                        .header("Access-Control-Request-Method", "GET"))
                .andExpect(status().isForbidden());
    }
}