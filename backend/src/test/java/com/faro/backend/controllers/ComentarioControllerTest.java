package com.faro.backend.controllers;

import com.faro.backend.config.security.SecurityConfig;
import com.faro.backend.dto.ComentarioDTO;
import com.faro.backend.dto.FotoDTO;
import com.faro.backend.exceptions.AlmacenNoDisponibleException;
import com.faro.backend.exceptions.ConflictoSincronizacionException;
import com.faro.backend.exceptions.ConflictoSincronizacionException.Motivo;
import com.faro.backend.exceptions.DatoInvalidoException;
import com.faro.backend.exceptions.SinPermisoException;
import com.faro.backend.models.RolUsuario;
import com.faro.backend.models.Usuario;
import com.faro.backend.services.ComentarioService;
import com.faro.backend.services.ComentarioService.FotoParaMostrar;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import static com.faro.backend.config.security.UsuariosDePrueba.capataz;
import static com.faro.backend.config.security.UsuariosDePrueba.encargado;
import static com.faro.backend.config.security.UsuariosDePrueba.mesaDeEntradas;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * El "mozo" de los comentarios, con la seguridad real (@Import(SecurityConfig.class)):
 * qué endpoint llama a qué del service y cómo se ven los errores. Las reglas están en ComentarioServiceTest.
 */
@WebMvcTest(ComentarioController.class)
@Import(SecurityConfig.class)
class ComentarioControllerTest {

    private static final UUID COMANDA = UUID.fromString("3f2a8c1e-0000-4000-8000-000000000001");
    private static final String URL_MURO = "/api/ordenes-trabajo/7/comentarios";
    private static final String URL_PUBLICAR = URL_MURO + "/" + COMANDA;
    private static final byte[] JPG = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, 1};

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ComentarioService service;

    private static ComentarioDTO comentario() {
        return new ComentarioDTO(4L, COMANDA, 7L, 3L, "Carlos Rodríguez", RolUsuario.CAPATAZ_CUADRILLA,
                "Se cambió la lámpara", OffsetDateTime.parse("2026-11-08T10:15:00-03:00"),
                LocalDateTime.of(2026, 11, 8, 10, 42), List.of(new FotoDTO(12L, "image/jpeg", 4, 0, "/api/comentarios/fotos/12")),
                true);
    }

    // ---------- ver el muro ----------

    @Test
    void elCapatazVeElMuroDeUnaOrden() throws Exception {
        when(service.listar(eq(7L), any(Usuario.class))).thenReturn(List.of(comentario()));

        mockMvc.perform(get(URL_MURO).with(user(capataz(10L))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].autorNombre").value("Carlos Rodríguez"))
                .andExpect(jsonPath("$[0].fotos[0].url").value("/api/comentarios/fotos/12"))
                .andExpect(jsonPath("$[0].puedeBorrar").value(true));

        ArgumentCaptor<Usuario> quien = ArgumentCaptor.forClass(Usuario.class);
        verify(service).listar(eq(7L), quien.capture());
        assertThat(quien.getValue().getEmail()).isEqualTo("capataz.verde@generalpaz.gob.ar");
    }

    @Test
    void sinSesionNoSeVeNada() throws Exception {
        mockMvc.perform(get(URL_MURO)).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/comentarios/fotos/12")).andExpect(status().isUnauthorized());

        verifyNoInteractions(service);
    }

    @Test
    void siLaOrdenEsDeOtraCuadrilla_da403ConElMotivo() throws Exception {
        when(service.listar(eq(7L), any(Usuario.class))).thenThrow(new SinPermisoException("Esta orden no es de tu cuadrilla"));

        mockMvc.perform(get(URL_MURO).with(user(capataz(20L))))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.mensaje").value("Esta orden no es de tu cuadrilla"));
    }

    // ---------- escribir ----------

    @Test
    void laMesaEscribeUnComentarioConTextoFotosYHora() throws Exception {
        when(service.publicar(eq(7L), eq(COMANDA), any(), any(), any(), any(Usuario.class))).thenReturn(comentario());

        mockMvc.perform(multipart(HttpMethod.PUT, URL_PUBLICAR)
                        .file(new MockMultipartFile("fotos", "a.jpg", "image/jpeg", JPG))
                        .file(new MockMultipartFile("fotos", "b.jpg", "image/jpeg", JPG))
                        .param("texto", "Se cambió la lámpara")
                        .param("hechoEn", "2026-11-08T10:15:00-03:00")
                        .with(user(mesaDeEntradas())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(4));

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<MultipartFile>> fotos = ArgumentCaptor.forClass(List.class);
        verify(service).publicar(eq(7L), eq(COMANDA), eq("Se cambió la lámpara"),
                eq(OffsetDateTime.parse("2026-11-08T10:15:00-03:00")), fotos.capture(), any(Usuario.class));
        assertThat(fotos.getValue()).hasSize(2);
    }

    @Test
    void sePuedeEscribirSoloTextoSinHora() throws Exception {
        when(service.publicar(eq(7L), eq(COMANDA), eq("Hola"), isNull(), any(), any(Usuario.class))).thenReturn(comentario());

        mockMvc.perform(multipart(HttpMethod.PUT, URL_PUBLICAR).param("texto", "Hola").with(user(encargado())))
                .andExpect(status().isOk());
    }

    @Test
    void escribirComoJson_noSeAcepta() throws Exception {
        mockMvc.perform(put(URL_PUBLICAR).contentType(MediaType.APPLICATION_JSON).content("{\"texto\":\"Hola\"}")
                        .with(user(encargado())))
                .andExpect(status().isUnsupportedMediaType());

        verifyNoInteractions(service);
    }

    @Test
    void unNumeroDeOperacionQueNoEsUuid_da400() throws Exception {
        mockMvc.perform(multipart(HttpMethod.PUT, URL_MURO + "/no-es-un-uuid").param("texto", "Hola")
                        .with(user(encargado())))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(service);
    }

    @Test
    void unComentarioVacio_da400ConElCampo() throws Exception {
        when(service.publicar(anyLong(), any(), any(), any(), any(), any()))
                .thenThrow(new DatoInvalidoException("texto", "Escribí un comentario o agregá al menos una foto"));

        mockMvc.perform(multipart(HttpMethod.PUT, URL_PUBLICAR).with(user(encargado())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.estado").value(400))
                .andExpect(jsonPath("$.errores.texto").value("Escribí un comentario o agregá al menos una foto"));
    }

    @Test
    void siLaOrdenYaNoEsDeLaCuadrilla_da409ConElMotivo() throws Exception {
        when(service.publicar(anyLong(), any(), any(), any(), any(), any()))
                .thenThrow(new ConflictoSincronizacionException(Motivo.OTRA_CUADRILLA, "Esta orden ya no es de tu cuadrilla"));

        mockMvc.perform(multipart(HttpMethod.PUT, URL_PUBLICAR).param("texto", "Hola").with(user(capataz(20L))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errores.motivo").value("OTRA_CUADRILLA"))
                .andExpect(jsonPath("$.errores.sePuedeAplicar").value("false"));
    }

    @Test
    void siElAlmacenNoResponde_da503() throws Exception {
        when(service.publicar(anyLong(), any(), any(), any(), any(), any()))
                .thenThrow(new AlmacenNoDisponibleException("El almacén de fotos no responde. Probá de nuevo en un rato."));

        mockMvc.perform(multipart(HttpMethod.PUT, URL_PUBLICAR)
                        .file(new MockMultipartFile("fotos", "a.jpg", "image/jpeg", JPG)).with(user(encargado())))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.estado").value(503))
                .andExpect(jsonPath("$.mensaje").value("El almacén de fotos no responde. Probá de nuevo en un rato."));
    }

    @Test
    void siLasFotosPesanDemasiado_da413() throws Exception {
        when(service.publicar(anyLong(), any(), any(), any(), any(), any()))
                .thenThrow(new MaxUploadSizeExceededException(3L * 1024 * 1024));

        mockMvc.perform(multipart(HttpMethod.PUT, URL_PUBLICAR)
                        .file(new MockMultipartFile("fotos", "a.jpg", "image/jpeg", JPG)).with(user(encargado())))
                .andExpect(status().isContentTooLarge())
                .andExpect(jsonPath("$.mensaje").value("Las fotos pesan demasiado: cada una puede tener hasta 3 MB"));
    }

    // ---------- ver una foto ----------

    @Test
    void unaFotoSeBajaConSuTipoYSeGuardaSoloParaEsaPersona() throws Exception {
        when(service.leerFoto(eq(12L), any(Usuario.class))).thenReturn(new FotoParaMostrar(JPG, "image/jpeg"));

        mockMvc.perform(get("/api/comentarios/fotos/12").with(user(capataz(10L))))
                .andExpect(status().isOk())
                .andExpect(content().contentType("image/jpeg"))
                .andExpect(content().bytes(JPG))
                .andExpect(header().string("Cache-Control", "max-age=86400, private"));
    }

    @Test
    void unaFotoDeOtraCuadrilla_da403() throws Exception {
        when(service.leerFoto(eq(12L), any(Usuario.class))).thenThrow(new SinPermisoException("Esta orden no es de tu cuadrilla"));

        mockMvc.perform(get("/api/comentarios/fotos/12").with(user(capataz(20L))))
                .andExpect(status().isForbidden());
    }

    // ---------- borrar ----------

    @Test
    void borrarResponde204() throws Exception {
        mockMvc.perform(delete("/api/comentarios/4").with(user(encargado())))
                .andExpect(status().isNoContent());

        verify(service).borrar(eq(4L), any(Usuario.class));
    }

    @Test
    void borrarElDeOtro_da403() throws Exception {
        doThrow(new SinPermisoException("Solo quien escribió el comentario o el encargado lo pueden borrar"))
                .when(service).borrar(eq(4L), any(Usuario.class));

        mockMvc.perform(delete("/api/comentarios/4").with(user(mesaDeEntradas())))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.mensaje").value("Solo quien escribió el comentario o el encargado lo pueden borrar"));
    }
}
