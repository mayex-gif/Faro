package com.faro.backend.config;

import com.faro.backend.models.PuntoInfraestructura;
import com.faro.backend.repositories.PuntoInfraestructuraRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class InicializadorCallesTest {

    @Mock
    private PuntoInfraestructuraRepository repositorio;

    private InicializadorCalles inicializador(boolean cargar, String archivo) {
        return new InicializadorCalles(repositorio, cargar, archivo);
    }

    private static PuntoInfraestructura calle(String nombre, String datosTecnicos) {
        PuntoInfraestructura calle = new PuntoInfraestructura();
        calle.setNombre(nombre);
        calle.setTipo("CALLE");
        calle.setDatosTecnicos(datosTecnicos);
        return calle;
    }

    @SuppressWarnings("unchecked")
    private List<PuntoInfraestructura> guardadas() {
        ArgumentCaptor<List<PuntoInfraestructura>> captor = ArgumentCaptor.forClass(List.class);
        verify(repositorio).saveAll(captor.capture());
        return captor.getValue();
    }

    @Test
    void sinCalles_cargaLas24DelArchivoComoCallesFuncionando() {
        when(repositorio.findByTipo("CALLE")).thenReturn(List.of());

        inicializador(true, InicializadorCalles.ARCHIVO_POR_DEFECTO).run();

        List<PuntoInfraestructura> calles = guardadas();
        assertThat(calles).hasSize(24);
        assertThat(calles).extracting(PuntoInfraestructura::getNombre).contains("Vélez Sarsfield", "Córdoba", "Salta");
        assertThat(calles).allSatisfy(c -> {
            assertThat(c.getTipo()).isEqualTo("CALLE");
            assertThat(c.getEstadoOperativo()).isTrue();
            assertThat(c.getInstalada()).isTrue();
            assertThat(c.getDatosTecnicos()).contains("OpenStreetMap");
            assertThat(c.getUbicacion().getSRID()).isEqualTo(4326);
            // Todas son de un solo tramo, así se pueden editar desde Infraestructura
            assertThat(c.getUbicacion().getGeometryType()).isEqualTo("LineString");
        });
    }

    @Test
    void unaCalleYaCargadaAMano_noSeDuplica_aunqueEsteEscritaSinTilde() {
        when(repositorio.findByTipo("CALLE")).thenReturn(List.of(calle("  cordoba", null)));

        inicializador(true, InicializadorCalles.ARCHIVO_POR_DEFECTO).run();

        List<PuntoInfraestructura> calles = guardadas();
        assertThat(calles).hasSize(23);
        assertThat(calles).extracting(PuntoInfraestructura::getNombre).doesNotContain("Córdoba");
    }

    @Test
    void siYaSeCargaronUnaVez_noVuelveACargar_asiNoReapareceUnaCalleBorrada() {
        when(repositorio.findByTipo("CALLE"))
                .thenReturn(List.of(calle("Salta", "Recorrido tomado de OpenStreetMap (© colaboradores de OpenStreetMap, licencia ODbL).")));

        inicializador(true, InicializadorCalles.ARCHIVO_POR_DEFECTO).run();

        verify(repositorio, never()).saveAll(any());
    }

    @Test
    void apagado_noTocaLaBase() {
        inicializador(false, InicializadorCalles.ARCHIVO_POR_DEFECTO).run();

        verifyNoInteractions(repositorio);
    }

    @Test
    void sinArchivo_avisaYElBackendArrancaIgual() {
        when(repositorio.findByTipo("CALLE")).thenReturn(List.of());

        assertThatCode(() -> inicializador(true, "datos/no-existe.geojson").run()).doesNotThrowAnyException();

        verify(repositorio, never()).saveAll(any());
    }

    @Test
    void normalizar_ignoraTildesMayusculasYEspacios() {
        assertThat(InicializadorCalles.normalizar(" Vélez SARSFIELD ")).isEqualTo("velez sarsfield");
        assertThat(InicializadorCalles.normalizar(null)).isEmpty();
    }
}
