package com.faro.backend.services;

import com.faro.backend.dto.ReglaMantenimientoDTO;
import com.faro.backend.dto.ReglaMantenimientoRequestDTO;
import com.faro.backend.exceptions.OperacionNoPermitidaException;
import com.faro.backend.exceptions.RecursoNoEncontradoException;
import com.faro.backend.models.Cuadrilla;
import com.faro.backend.models.PuntoInfraestructura;
import com.faro.backend.models.ReglaMantenimiento;
import com.faro.backend.repositories.CuadrillaRepository;
import com.faro.backend.repositories.OrdenTrabajoRepository;
import com.faro.backend.repositories.PuntoInfraestructuraRepository;
import com.faro.backend.repositories.ReglaMantenimientoRepository;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

/**
 * Servicio para la gestión (CRUD y estado) de las Reglas de Mantenimiento Periódico.
 */
@Service
public class ReglaMantenimientoService {

    private final ReglaMantenimientoRepository reglaRepository;
    private final PuntoInfraestructuraRepository lugarRepository;
    private final CuadrillaRepository cuadrillaRepository;
    private final OrdenTrabajoRepository ordenRepository;
    private final CalculadorRecurrencia calculadorRecurrencia;

    public ReglaMantenimientoService(ReglaMantenimientoRepository reglaRepository,
                                     PuntoInfraestructuraRepository lugarRepository,
                                     CuadrillaRepository cuadrillaRepository,
                                     OrdenTrabajoRepository ordenRepository,
                                     CalculadorRecurrencia calculadorRecurrencia) {
        this.reglaRepository = reglaRepository;
        this.lugarRepository = lugarRepository;
        this.cuadrillaRepository = cuadrillaRepository;
        this.ordenRepository = ordenRepository;
        this.calculadorRecurrencia = calculadorRecurrencia;
    }

    @Transactional(readOnly = true)
    public List<ReglaMantenimientoDTO> listar(Boolean activa, Long lugarId) {
        List<ReglaMantenimiento> reglas;
        if (lugarId != null && activa != null) {
            reglas = reglaRepository.findByLugarIdAndActiva(lugarId, activa);
        } else if (lugarId != null) {
            reglas = reglaRepository.findByLugarId(lugarId);
        } else if (activa != null) {
            reglas = reglaRepository.findByActiva(activa);
        } else {
            reglas = reglaRepository.findAll(Sort.by(Sort.Direction.DESC, "fechaCreacion"));
        }
        return reglas.stream().map(this::convertirADto).toList();
    }

    @Transactional(readOnly = true)
    public ReglaMantenimientoDTO obtener(Long id) {
        return convertirADto(buscarRegla(id));
    }

    @Transactional
    public ReglaMantenimientoDTO crear(ReglaMantenimientoRequestDTO request) {
        validarFechas(request.fechaInicio(), request.fechaFin());

        PuntoInfraestructura lugar = buscarLugar(request.lugarId());
        Cuadrilla cuadrilla = null;
        if (request.cuadrillaId() != null) {
            cuadrilla = buscarCuadrilla(request.cuadrillaId());
            validarCuadrillaParaTrabajo(cuadrilla, request.tipoTrabajo());
        }

        ReglaMantenimiento regla = new ReglaMantenimiento();
        regla.setTitulo(request.titulo().trim());
        regla.setDescripcion(request.descripcion().trim());
        regla.setTipoTrabajo(request.tipoTrabajo());
        regla.setPrioridad(request.prioridad());
        regla.setLugar(lugar);
        regla.setCuadrilla(cuadrilla);
        regla.setFrecuencia(request.frecuencia());
        regla.setIntervalo(request.intervalo() != null ? request.intervalo() : 1);
        regla.setDiaSemana(request.diaSemana());
        regla.setDiaMes(request.diaMes());
        regla.setFechaInicio(request.fechaInicio());
        regla.setFechaFin(request.fechaFin());
        regla.setActiva(request.activa() == null || request.activa());

        LocalDate primeraEjecucion = calculadorRecurrencia.calcularPrimeraEjecucion(
                request.frecuencia(),
                request.intervalo(),
                request.diaSemana(),
                request.diaMes(),
                request.fechaInicio()
        );
        regla.setProximaEjecucion(primeraEjecucion);

        return convertirADto(reglaRepository.save(regla));
    }

    @Transactional
    public ReglaMantenimientoDTO modificar(Long id, ReglaMantenimientoRequestDTO request) {
        ReglaMantenimiento regla = buscarRegla(id);
        validarFechas(request.fechaInicio(), request.fechaFin());

        PuntoInfraestructura lugar = buscarLugar(request.lugarId());
        Cuadrilla cuadrilla = null;
        if (request.cuadrillaId() != null) {
            cuadrilla = buscarCuadrilla(request.cuadrillaId());
            validarCuadrillaParaTrabajo(cuadrilla, request.tipoTrabajo());
        }

        regla.setTitulo(request.titulo().trim());
        regla.setDescripcion(request.descripcion().trim());
        regla.setTipoTrabajo(request.tipoTrabajo());
        regla.setPrioridad(request.prioridad());
        regla.setLugar(lugar);
        regla.setCuadrilla(cuadrilla);
        regla.setFrecuencia(request.frecuencia());
        regla.setIntervalo(request.intervalo() != null ? request.intervalo() : 1);
        regla.setDiaSemana(request.diaSemana());
        regla.setDiaMes(request.diaMes());
        regla.setFechaInicio(request.fechaInicio());
        regla.setFechaFin(request.fechaFin());
        if (request.activa() != null) {
            regla.setActiva(request.activa());
        }

        // Si la próxima ejecución previa quedó anterior a la nueva fecha de inicio o fuera de vigencia, recalculamos
        if (regla.getProximaEjecucion().isBefore(request.fechaInicio())) {
            regla.setProximaEjecucion(calculadorRecurrencia.calcularPrimeraEjecucion(
                    request.frecuencia(),
                    request.intervalo(),
                    request.diaSemana(),
                    request.diaMes(),
                    request.fechaInicio()
            ));
        }

        return convertirADto(reglaRepository.save(regla));
    }

    @Transactional
    public ReglaMantenimientoDTO pausar(Long id) {
        ReglaMantenimiento regla = buscarRegla(id);
        regla.setActiva(false);
        return convertirADto(reglaRepository.save(regla));
    }

    @Transactional
    public ReglaMantenimientoDTO activar(Long id) {
        ReglaMantenimiento regla = buscarRegla(id);
        regla.setActiva(true);

        // Si la próxima ejecución quedó en el pasado mientras estuvo pausada, ajustamos a la próxima vigente
        LocalDate hoy = LocalDate.now();
        if (regla.getProximaEjecucion().isBefore(hoy)) {
            LocalDate nueva = calculadorRecurrencia.calcularPrimeraEjecucion(
                    regla.getFrecuencia(),
                    regla.getIntervalo(),
                    regla.getDiaSemana(),
                    regla.getDiaMes(),
                    hoy
            );
            regla.setProximaEjecucion(nueva);
        }

        return convertirADto(reglaRepository.save(regla));
    }

    @Transactional
    public void eliminar(Long id) {
        ReglaMantenimiento regla = buscarRegla(id);
        if (ordenRepository.existsByReglaMantenimientoId(id)) {
            throw new OperacionNoPermitidaException(
                    "No se puede eliminar la regla porque ya tiene órdenes de trabajo generadas. Puede pausarla en su lugar.");
        }
        reglaRepository.delete(regla);
    }

    private void validarFechas(LocalDate inicio, LocalDate fin) {
        if (fin != null && fin.isBefore(inicio)) {
            throw new OperacionNoPermitidaException("La fecha de fin no puede ser anterior a la fecha de inicio");
        }
    }

    private void validarCuadrillaParaTrabajo(Cuadrilla cuadrilla, com.faro.backend.models.TipoTrabajo tipo) {
        if (!cuadrilla.isDisponible()) {
            throw new OperacionNoPermitidaException(
                    "La cuadrilla " + cuadrilla.getNombre() + " no se encuentra disponible");
        }
        if (!cuadrilla.getTiposTrabajo().contains(tipo)) {
            throw new OperacionNoPermitidaException(
                    "La cuadrilla " + cuadrilla.getNombre() + " no realiza trabajos de tipo " + tipo);
        }
    }

    public ReglaMantenimiento buscarRegla(Long id) {
        return reglaRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Regla de mantenimiento no encontrada"));
    }

    private PuntoInfraestructura buscarLugar(Long id) {
        return lugarRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Lugar no encontrado"));
    }

    private Cuadrilla buscarCuadrilla(Long id) {
        return cuadrillaRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Cuadrilla no encontrada"));
    }

    public ReglaMantenimientoDTO convertirADto(ReglaMantenimiento regla) {
        return new ReglaMantenimientoDTO(
                regla.getId(),
                regla.getTitulo(),
                regla.getDescripcion(),
                regla.getTipoTrabajo(),
                regla.getPrioridad(),
                regla.getLugar().getId(),
                regla.getLugar().getNombre(),
                regla.getCuadrilla() != null ? regla.getCuadrilla().getId() : null,
                regla.getCuadrilla() != null ? regla.getCuadrilla().getNombre() : null,
                regla.getFrecuencia(),
                regla.getIntervalo(),
                regla.getDiaSemana(),
                regla.getDiaMes(),
                regla.getFechaInicio(),
                regla.getFechaFin(),
                regla.getProximaEjecucion(),
                regla.getUltimaGeneracion(),
                regla.isActiva(),
                regla.getFechaCreacion()
        );
    }
}
