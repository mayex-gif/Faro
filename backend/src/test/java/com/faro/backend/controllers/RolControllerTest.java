package com.faro.backend.controllers;

import com.faro.backend.dto.PermisoDTO;
import com.faro.backend.dto.RolDTO;
import com.faro.backend.exceptions.RecursoNoEncontradoException;
import com.faro.backend.services.RolService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Set;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(RolController.class)
class RolControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private RolService rolService;

    @Test
    @WithMockUser
    void listarRolesDevuelve200ConListado() throws Exception {
        RolDTO rol = new RolDTO("ENCARGADO_CORRALON", "Encargado del corralón", "Admin general", Set.of("GESTIONAR_USUARIOS"));
        when(rolService.listarRoles()).thenReturn(List.of(rol));

        mockMvc.perform(get("/api/roles"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].codigo").value("ENCARGADO_CORRALON"))
                .andExpect(jsonPath("$[0].nombre").value("Encargado del corralón"));
    }

    @Test
    @WithMockUser
    void obtenerRolPorCodigoDevuelve200() throws Exception {
        RolDTO rol = new RolDTO("CAPATAZ_CUADRILLA", "Capataz de cuadrilla", "En calle", Set.of("CONSULTAR_TAREAS_PROPIAS"));
        when(rolService.obtenerRol("CAPATAZ_CUADRILLA")).thenReturn(rol);

        mockMvc.perform(get("/api/roles/CAPATAZ_CUADRILLA"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.codigo").value("CAPATAZ_CUADRILLA"))
                .andExpect(jsonPath("$.nombre").value("Capataz de cuadrilla"));
    }

    @Test
    @WithMockUser
    void obtenerRolInexistenteDevuelve404() throws Exception {
        when(rolService.obtenerRol("INEXISTENTE")).thenThrow(new RecursoNoEncontradoException("No existe el rol"));

        mockMvc.perform(get("/api/roles/INEXISTENTE"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.estado").value(404));
    }

    @Test
    @WithMockUser
    void listarPermisosDevuelve200() throws Exception {
        PermisoDTO permiso = new PermisoDTO("GESTIONAR_USUARIOS", "Gestionar usuarios", "ABM");
        when(rolService.listarPermisos()).thenReturn(List.of(permiso));

        mockMvc.perform(get("/api/roles/permisos"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].codigo").value("GESTIONAR_USUARIOS"));
    }
}
