package com.faro.backend.services;

import com.faro.backend.dto.ComentarioDTO;
import com.faro.backend.exceptions.AlmacenNoDisponibleException;
import com.faro.backend.exceptions.ConflictoSincronizacionException;
import com.faro.backend.exceptions.ConflictoSincronizacionException.Motivo;
import com.faro.backend.exceptions.DatoInvalidoException;
import com.faro.backend.exceptions.OperacionNoPermitidaException;
import com.faro.backend.exceptions.RecursoNoEncontradoException;
import com.faro.backend.exceptions.SinPermisoException;
import com.faro.backend.models.ComentarioOrden;
import com.faro.backend.models.Cuadrilla;
import com.faro.backend.models.FotoComentario;
import com.faro.backend.models.OrdenTrabajo;
import com.faro.backend.models.RolUsuario;
import com.faro.backend.models.Usuario;
import com.faro.backend.repositories.ComentarioOrdenRepository;
import com.faro.backend.repositories.FotoComentarioRepository;
import com.faro.backend.repositories.OrdenTrabajoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.OffsetDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/** Las reglas del muro "Comentarios y fotos": quién ve, quién escribe, quién borra y qué es una foto válida. */
@ExtendWith(MockitoExtension.class)
class ComentarioServiceTest {

    // Primeros bytes ("firma") de cada formato, seguidos de basura: alcanza para reconocerlos
    private static final byte[] JPG = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 1, 2, 3};
    private static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 9};
    private static final byte[] WEBP = {'R', 'I', 'F', 'F', 0, 0, 0, 0, 'W', 'E', 'B', 'P', 7};
    private static final UUID COMANDA = UUID.fromString("3f2a8c1e-0000-4000-8000-000000000001");
    private static final OffsetDateTime HECHO_EN = OffsetDateTime.parse("2026-11-08T10:15:00-03:00");

    @Mock private ComentarioOrdenRepository comentarioRepository;
    @Mock private FotoComentarioRepository fotoRepository;
    @Mock private OrdenTrabajoRepository ordenRepository;
    @Mock private AlmacenArchivos almacen;

    private ComentarioService service;

    private final Usuario encargado = usuario(1L, RolUsuario.ENCARGADO_CORRALON, null);
    private final Usuario mesa = usuario(2L, RolUsuario.MESA_ENTRADAS, null);
    private final Usuario capatazVerde = usuario(3L, RolUsuario.CAPATAZ_CUADRILLA, 10L);
    private final Usuario capatazAlumbrado = usuario(4L, RolUsuario.CAPATAZ_CUADRILLA, 20L);
    private OrdenTrabajo ordenVerde;

    @BeforeEach
    void setUp() {
        service = new ComentarioService(comentarioRepository, fotoRepository, ordenRepository, almacen);
        Cuadrilla verde = new Cuadrilla();
        verde.setId(10L);
        ordenVerde = new OrdenTrabajo();
        ordenVerde.setId(7L);
        ordenVerde.setCuadrilla(verde);
    }

    private static Usuario usuario(Long id, RolUsuario rol, Long cuadrillaId) {
        Usuario usuario = new Usuario("Nombre" + id, "Apellido", "u" + id + "@faro.gob.ar", "hash", rol, cuadrillaId, true);
        usuario.setId(id);
        return usuario;
    }

    private static MultipartFile foto(byte[] contenido) {
        return new MockMultipartFile("fotos", "foto.jpg", "image/jpeg", contenido);
    }

    private ComentarioOrden comentarioDe(Usuario autor, String... archivosDeFotos) {
        ComentarioOrden comentario = ComentarioOrden.nuevo(COMANDA, ordenVerde, autor, "Hola", HECHO_EN);
        for (int i = 0; i < archivosDeFotos.length; i++) {
            comentario.agregarFoto("image/jpeg", 10).setId(100L + i);
        }
        comentario.setId(50L);
        return comentario;
    }

    private void ordenExiste() {
        when(ordenRepository.findById(7L)).thenReturn(Optional.of(ordenVerde));
    }

    private void guardarDevuelveLoMismo() {
        when(comentarioRepository.save(any(ComentarioOrden.class))).thenAnswer(invocacion -> invocacion.getArgument(0));
    }

    // ======================= listar =======================

    @Test
    void listar_elEncargadoVeElMuroYPuedeBorrarTodo() {
        ordenExiste();
        when(comentarioRepository.findByOrdenIdOrderByHechoEnDescIdDesc(7L)).thenReturn(List.of(comentarioDe(capatazVerde)));

        List<ComentarioDTO> muro = service.listar(7L, encargado);

        assertThat(muro).hasSize(1);
        assertThat(muro.get(0).autorNombre()).isEqualTo("Nombre3 Apellido");
        assertThat(muro.get(0).autorRol()).isEqualTo(RolUsuario.CAPATAZ_CUADRILLA);
        assertThat(muro.get(0).ordenId()).isEqualTo(7L);
        assertThat(muro.get(0).puedeBorrar()).isTrue();
    }

    @Test
    void listar_laMesaVeElMuroPeroSoloBorraLoSuyo() {
        ordenExiste();
        when(comentarioRepository.findByOrdenIdOrderByHechoEnDescIdDesc(7L))
                .thenReturn(List.of(comentarioDe(capatazVerde), comentarioDe(mesa)));

        List<ComentarioDTO> muro = service.listar(7L, mesa);

        assertThat(muro).extracting(ComentarioDTO::puedeBorrar).containsExactly(false, true);
    }

    @Test
    void listar_elCapatazVeLasDeSuCuadrilla() {
        ordenExiste();
        when(comentarioRepository.findByOrdenIdOrderByHechoEnDescIdDesc(7L)).thenReturn(List.of());

        assertThat(service.listar(7L, capatazVerde)).isEmpty();
    }

    @Test
    void listar_elCapatazDeOtraCuadrillaNoLaVe() {
        ordenExiste();

        assertThatThrownBy(() -> service.listar(7L, capatazAlumbrado))
                .isInstanceOf(SinPermisoException.class)
                .hasMessage("Esta orden no es de tu cuadrilla");
        verify(comentarioRepository, never()).findByOrdenIdOrderByHechoEnDescIdDesc(any());
    }

    @Test
    void listar_unaOrdenSinCuadrillaNoLaVeNingunCapataz() {
        ordenVerde.setCuadrilla(null);
        ordenExiste();

        assertThatThrownBy(() -> service.listar(7L, capatazVerde)).isInstanceOf(SinPermisoException.class);
    }

    @Test
    void listar_sinRolNoVeNada() {
        ordenExiste();
        Usuario sinRol = usuario(9L, null, null);

        assertThatThrownBy(() -> service.listar(7L, sinRol))
                .isInstanceOf(SinPermisoException.class)
                .hasMessage("Tu rol no puede ver los comentarios de las órdenes");
        assertThatThrownBy(() -> service.listar(7L, null)).isInstanceOf(SinPermisoException.class);
    }

    @Test
    void listar_unaOrdenQueNoExiste_da404() {
        when(ordenRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.listar(99L, encargado)).isInstanceOf(RecursoNoEncontradoException.class);
    }

    // ======================= publicar =======================

    @Test
    void publicar_soloTexto_loGuardaSinTocarElAlmacen() {
        ordenExiste();
        guardarDevuelveLoMismo();

        ComentarioDTO dto = service.publicar(7L, COMANDA, "  Se cambió la lámpara  ", HECHO_EN, null, capatazVerde);

        assertThat(dto.texto()).isEqualTo("Se cambió la lámpara");
        assertThat(dto.operacionId()).isEqualTo(COMANDA);
        assertThat(dto.hechoEn()).isEqualTo(HECHO_EN);
        assertThat(dto.autorId()).isEqualTo(3L);
        assertThat(dto.puedeBorrar()).isTrue();
        assertThat(dto.fotos()).isEmpty();
        verifyNoInteractions(almacen);
    }

    @Test
    void publicar_conFotos_subeCadaUnaConSuTipoRealYDespuesGuarda() {
        ordenExiste();
        guardarDevuelveLoMismo();

        ComentarioDTO dto = service.publicar(7L, COMANDA, null, HECHO_EN,
                List.of(foto(JPG), foto(PNG), foto(WEBP)), mesa);

        verify(almacen).guardar("comentarios/" + COMANDA + "/0.jpg", JPG, "image/jpeg");
        verify(almacen).guardar("comentarios/" + COMANDA + "/1.png", PNG, "image/png");
        verify(almacen).guardar("comentarios/" + COMANDA + "/2.webp", WEBP, "image/webp");
        assertThat(dto.texto()).isNull();
        assertThat(dto.fotos()).extracting(f -> f.tipoContenido()).containsExactly("image/jpeg", "image/png", "image/webp");
        assertThat(dto.fotos().get(1).tamanio()).isEqualTo(PNG.length);
    }

    @Test
    void publicar_ignoraLosArchivosVacios() {
        ordenExiste();
        guardarDevuelveLoMismo();
        MultipartFile vacio = new MockMultipartFile("fotos", "vacia.jpg", "image/jpeg", new byte[0]);

        ComentarioDTO dto = service.publicar(7L, COMANDA, "Hola", HECHO_EN, Arrays.asList(vacio, null), encargado);

        assertThat(dto.fotos()).isEmpty();
        verifyNoInteractions(almacen);
    }

    @Test
    void publicar_laMismaComandaOtraVez_devuelveLaQueEstabaSinSubirNada() {
        ComentarioOrden yaGuardado = comentarioDe(capatazVerde, "x");
        when(comentarioRepository.findByOperacionId(COMANDA)).thenReturn(Optional.of(yaGuardado));

        ComentarioDTO dto = service.publicar(7L, COMANDA, "Hola", HECHO_EN, List.of(foto(JPG)), capatazVerde);

        assertThat(dto.id()).isEqualTo(50L);
        verifyNoInteractions(almacen, ordenRepository);
        verify(comentarioRepository, never()).save(any());
    }

    @Test
    void publicar_laMismaComandaEnOtraOrden_da409() {
        when(comentarioRepository.findByOperacionId(COMANDA)).thenReturn(Optional.of(comentarioDe(capatazVerde)));

        assertThatThrownBy(() -> service.publicar(8L, COMANDA, "Hola", HECHO_EN, null, capatazVerde))
                .isInstanceOf(OperacionNoPermitidaException.class);
    }

    @Test
    void publicar_laMismaComandaDeOtraPersona_da409() {
        when(comentarioRepository.findByOperacionId(COMANDA)).thenReturn(Optional.of(comentarioDe(capatazVerde)));

        assertThatThrownBy(() -> service.publicar(7L, COMANDA, "Hola", HECHO_EN, null, encargado))
                .isInstanceOf(OperacionNoPermitidaException.class)
                .hasMessage("Ese número de operación ya se usó para otro comentario");
    }

    @Test
    void publicar_enUnaOrdenQueYaNoExiste_daConflicto() {
        when(ordenRepository.findById(7L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.publicar(7L, COMANDA, "Hola", HECHO_EN, null, encargado))
                .isInstanceOfSatisfying(ConflictoSincronizacionException.class,
                        e -> assertThat(e.getMotivo()).isEqualTo(Motivo.ORDEN_NO_EXISTE));
    }

    @Test
    void publicar_elCapatazEnUnaOrdenQueYaNoEsDeSuCuadrilla_daConflicto() {
        ordenExiste();

        assertThatThrownBy(() -> service.publicar(7L, COMANDA, "Hola", HECHO_EN, null, capatazAlumbrado))
                .isInstanceOfSatisfying(ConflictoSincronizacionException.class, e -> {
                    assertThat(e.getMotivo()).isEqualTo(Motivo.OTRA_CUADRILLA);
                    assertThat(e.isSePuedeAplicar()).isFalse();
                });
        verifyNoInteractions(almacen);
    }

    @Test
    void publicar_sinRol_daConflictoSinPermiso() {
        ordenExiste();

        assertThatThrownBy(() -> service.publicar(7L, COMANDA, "Hola", HECHO_EN, null, usuario(9L, null, null)))
                .isInstanceOfSatisfying(ConflictoSincronizacionException.class,
                        e -> assertThat(e.getMotivo()).isEqualTo(Motivo.SIN_PERMISO));
    }

    @Test
    void publicar_sinTextoNiFotos_da400() {
        ordenExiste();

        assertThatThrownBy(() -> service.publicar(7L, COMANDA, "   ", HECHO_EN, List.of(), encargado))
                .isInstanceOfSatisfying(DatoInvalidoException.class, e -> {
                    assertThat(e.getCampo()).isEqualTo("texto");
                    assertThat(e.getMessage()).isEqualTo("Escribí un comentario o agregá al menos una foto");
                });
    }

    @Test
    void publicar_unTextoDeMasDe1000Caracteres_da400() {
        ordenExiste();
        String largo = "a".repeat(1001);

        assertThatThrownBy(() -> service.publicar(7L, COMANDA, largo, HECHO_EN, null, encargado))
                .isInstanceOf(DatoInvalidoException.class)
                .hasMessage("El comentario puede tener hasta 1000 caracteres");
    }

    @Test
    void publicar_justo1000Caracteres_seGuarda() {
        ordenExiste();
        guardarDevuelveLoMismo();

        assertThat(service.publicar(7L, COMANDA, "a".repeat(1000), HECHO_EN, null, encargado).texto()).hasSize(1000);
    }

    @Test
    void publicar_masDe5Fotos_da400() {
        ordenExiste();
        List<MultipartFile> seis = Collections.nCopies(6, foto(JPG));

        assertThatThrownBy(() -> service.publicar(7L, COMANDA, null, HECHO_EN, seis, encargado))
                .isInstanceOfSatisfying(DatoInvalidoException.class, e -> assertThat(e.getCampo()).isEqualTo("fotos"))
                .hasMessage("Se pueden agregar hasta 5 fotos");
        verifyNoInteractions(almacen);
    }

    @Test
    void publicar_unaFotoDeMasDe3MB_da400() {
        ordenExiste();
        byte[] grande = Arrays.copyOf(JPG, (int) ComentarioService.MAX_BYTES_FOTO + 1);

        assertThatThrownBy(() -> service.publicar(7L, COMANDA, null, HECHO_EN, List.of(foto(JPG), foto(grande)), encargado))
                .isInstanceOf(DatoInvalidoException.class)
                .hasMessage("La foto 2 pesa más de 3 MB");
    }

    @Test
    void publicar_algoQueNoEsUnaImagen_da400AunqueDigaSerJpg() {
        ordenExiste();
        MultipartFile disfrazado = new MockMultipartFile("fotos", "virus.jpg", "image/jpeg", "MZ esto no es una foto".getBytes());

        assertThatThrownBy(() -> service.publicar(7L, COMANDA, null, HECHO_EN, List.of(disfrazado), encargado))
                .isInstanceOf(DatoInvalidoException.class)
                .hasMessage("La foto 1 no es una imagen JPG, PNG ni WEBP");
    }

    @Test
    void publicar_unaFotoQueNoSePuedeLeer_da400() throws IOException {
        ordenExiste();
        MultipartFile rota = mock(MultipartFile.class);
        when(rota.isEmpty()).thenReturn(false);
        when(rota.getSize()).thenReturn(10L);
        when(rota.getBytes()).thenThrow(new IOException("se cortó"));

        assertThatThrownBy(() -> service.publicar(7L, COMANDA, null, HECHO_EN, List.of(rota), encargado))
                .isInstanceOf(DatoInvalidoException.class)
                .hasMessage("La foto 1 no se pudo leer. Probá mandarla de nuevo");
    }

    @Test
    void publicar_siElAlmacenNoResponde_noGuardaYBorraLasQueYaSubio() {
        ordenExiste();
        // la primera foto sube bien; la segunda no
        doAnswer(invocacion -> {
            if (invocacion.getArgument(0, String.class).endsWith("/1.png")) {
                throw new AlmacenNoDisponibleException("no responde");
            }
            return null;
        }).when(almacen).guardar(anyString(), any(), anyString());

        assertThatThrownBy(() -> service.publicar(7L, COMANDA, null, HECHO_EN, List.of(foto(JPG), foto(PNG)), encargado))
                .isInstanceOf(AlmacenNoDisponibleException.class);
        verify(almacen).borrar("comentarios/" + COMANDA + "/0.jpg");
        verify(comentarioRepository, never()).save(any());
    }

    @Test
    void publicar_dosEnviosALaVez_elQuePierdeDevuelveElDelOtro() {
        ordenExiste();
        ComentarioOrden delOtro = comentarioDe(encargado, "x");
        when(comentarioRepository.findByOperacionId(COMANDA)).thenReturn(Optional.empty(), Optional.of(delOtro));
        when(comentarioRepository.save(any())).thenThrow(new DataIntegrityViolationException("operacion_id repetido"));

        ComentarioDTO dto = service.publicar(7L, COMANDA, null, HECHO_EN, List.of(foto(JPG)), encargado);

        assertThat(dto.id()).isEqualTo(50L);
        verify(almacen, never()).borrar(any()); // las fotos son las del otro envío: no se tocan
    }

    @Test
    void publicar_siLaBaseFallaPorOtraCosa_borraLasFotosYAvisa() {
        ordenExiste();
        when(comentarioRepository.save(any())).thenThrow(new DataIntegrityViolationException("otra cosa"));
        doThrow(new AlmacenNoDisponibleException("no responde")).when(almacen).borrar(any());

        assertThatThrownBy(() -> service.publicar(7L, COMANDA, null, HECHO_EN, List.of(foto(JPG)), encargado))
                .isInstanceOf(DataIntegrityViolationException.class);
        verify(almacen).borrar("comentarios/" + COMANDA + "/0.jpg");
    }

    @Test
    void publicar_sinHoraOConElRelojAdelantado_usaLaDelServidor() {
        ordenExiste();
        guardarDevuelveLoMismo();
        OffsetDateTime antes = OffsetDateTime.now();

        ComentarioDTO sinHora = service.publicar(7L, COMANDA, "Hola", null, null, encargado);
        ComentarioDTO adelantado = service.publicar(7L, COMANDA, "Hola", OffsetDateTime.now().plusDays(3), null, encargado);

        assertThat(sinHora.hechoEn()).isAfterOrEqualTo(antes).isBeforeOrEqualTo(OffsetDateTime.now());
        assertThat(adelantado.hechoEn()).isBeforeOrEqualTo(OffsetDateTime.now());
    }

    @Test
    void publicar_guardaElComentarioConLaOrdenYElAutor() {
        ordenExiste();
        guardarDevuelveLoMismo();

        service.publicar(7L, COMANDA, "Hola", HECHO_EN, null, capatazVerde);

        ArgumentCaptor<ComentarioOrden> guardado = ArgumentCaptor.forClass(ComentarioOrden.class);
        verify(comentarioRepository).save(guardado.capture());
        assertThat(guardado.getValue().getOrden()).isSameAs(ordenVerde);
        assertThat(guardado.getValue().getAutor()).isSameAs(capatazVerde);
    }

    // ======================= leerFoto =======================

    private FotoComentario fotoGuardada() {
        FotoComentario foto = comentarioDe(capatazVerde).agregarFoto("image/png", 9);
        foto.setId(100L);
        return foto;
    }

    @Test
    void leerFoto_devuelveLosBytesYSuTipo() {
        FotoComentario foto = fotoGuardada();
        when(fotoRepository.findConOrdenById(100L)).thenReturn(Optional.of(foto));
        when(almacen.leer(foto.getArchivo())).thenReturn(PNG);

        ComentarioService.FotoParaMostrar mostrada = service.leerFoto(100L, capatazVerde);

        assertThat(mostrada.contenido()).isEqualTo(PNG);
        assertThat(mostrada.tipoContenido()).isEqualTo("image/png");
    }

    @Test
    void leerFoto_deUnaOrdenDeOtraCuadrilla_da403SinIrAlAlmacen() {
        when(fotoRepository.findConOrdenById(100L)).thenReturn(Optional.of(fotoGuardada()));

        assertThatThrownBy(() -> service.leerFoto(100L, capatazAlumbrado)).isInstanceOf(SinPermisoException.class);
        verifyNoInteractions(almacen);
    }

    @Test
    void leerFoto_queNoExiste_da404() {
        when(fotoRepository.findConOrdenById(100L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.leerFoto(100L, encargado)).isInstanceOf(RecursoNoEncontradoException.class);
    }

    // ======================= borrar =======================

    @Test
    void borrar_elAutorBorraLoSuyoConSusFotos() {
        ComentarioOrden comentario = comentarioDe(capatazVerde, "a", "b");
        when(comentarioRepository.findConFotosById(50L)).thenReturn(Optional.of(comentario));

        service.borrar(50L, capatazVerde);

        verify(comentarioRepository).delete(comentario);
        verify(almacen).borrar("comentarios/" + COMANDA + "/0.jpg");
        verify(almacen).borrar("comentarios/" + COMANDA + "/1.jpg");
    }

    @Test
    void borrar_elEncargadoBorraElDeOtro() {
        ComentarioOrden comentario = comentarioDe(capatazVerde);
        when(comentarioRepository.findConFotosById(50L)).thenReturn(Optional.of(comentario));

        service.borrar(50L, encargado);

        verify(comentarioRepository).delete(comentario);
    }

    @Test
    void borrar_laMesaNoBorraElDeOtro() {
        when(comentarioRepository.findConFotosById(50L)).thenReturn(Optional.of(comentarioDe(capatazVerde)));

        assertThatThrownBy(() -> service.borrar(50L, mesa))
                .isInstanceOf(SinPermisoException.class)
                .hasMessage("Solo quien escribió el comentario o el encargado lo pueden borrar");
        verify(comentarioRepository, never()).delete(any());
    }

    @Test
    void borrar_otroCapatazNoLoBorra() {
        when(comentarioRepository.findConFotosById(50L)).thenReturn(Optional.of(comentarioDe(capatazVerde)));

        assertThatThrownBy(() -> service.borrar(50L, capatazAlumbrado)).isInstanceOf(SinPermisoException.class);
        assertThatThrownBy(() -> service.borrar(50L, null)).isInstanceOf(SinPermisoException.class);
    }

    @Test
    void borrar_unUsuarioSinIdNoEsElAutor() {
        Usuario autorSinId = usuario(null, RolUsuario.MESA_ENTRADAS, null);
        when(comentarioRepository.findConFotosById(50L)).thenReturn(Optional.of(comentarioDe(autorSinId)));

        assertThatThrownBy(() -> service.borrar(50L, autorSinId)).isInstanceOf(SinPermisoException.class);
    }

    @Test
    void borrar_siElAlmacenNoResponde_igualSeBorraDelMuro() {
        ComentarioOrden comentario = comentarioDe(capatazVerde, "a");
        when(comentarioRepository.findConFotosById(50L)).thenReturn(Optional.of(comentario));
        doThrow(new AlmacenNoDisponibleException("no responde")).when(almacen).borrar(any());

        service.borrar(50L, capatazVerde); // no tira error

        verify(comentarioRepository).delete(comentario);
    }

    @Test
    void borrar_unoQueNoExiste_da404() {
        when(comentarioRepository.findConFotosById(50L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.borrar(50L, encargado)).isInstanceOf(RecursoNoEncontradoException.class);
    }

    // ======================= firmas de imagen =======================

    @Test
    void tipoDeImagen_reconoceCadaFormatoPorSusPrimerosBytes() {
        assertThat(ComentarioService.tipoDeImagen(JPG)).isEqualTo("image/jpeg");
        assertThat(ComentarioService.tipoDeImagen(PNG)).isEqualTo("image/png");
        assertThat(ComentarioService.tipoDeImagen(WEBP)).isEqualTo("image/webp");
        assertThat(ComentarioService.tipoDeImagen(new byte[]{(byte) 0xFF, (byte) 0xD8})).isNull(); // muy corto
        assertThat(ComentarioService.tipoDeImagen("GIF89a......".getBytes())).isNull();
        assertThat(ComentarioService.tipoDeImagen("RIFF....WAVE".getBytes())).isNull(); // un audio, no una foto
        assertThat(ComentarioService.tipoDeImagen(new byte[]{(byte) 0x89, 'P', 'N', 'G', 0, 0, 0, 0})).isNull();
    }

    @Test
    void puedeVerYPuedeBorrar_cubrenLosCasosRaros() {
        assertThat(ComentarioService.puedeVer(ordenVerde, null)).isFalse();
        assertThat(ComentarioService.puedeVer(ordenVerde, usuario(5L, RolUsuario.CAPATAZ_CUADRILLA, null))).isFalse();
        assertThat(ComentarioService.puedeBorrar(comentarioDe(mesa), null)).isFalse();
    }
}
