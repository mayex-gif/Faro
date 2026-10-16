package com.faro.backend.config;

import com.faro.backend.models.RolUsuario;
import com.faro.backend.models.Usuario;
import com.faro.backend.repositories.UsuarioRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Se ejecuta al iniciar el backend. Si la tabla de usuarios está vacía,
 * precarga los usuarios iniciales del municipio con contraseñas seguras hasheadas con BCrypt.
 */
@Component
public class InicializadorUsuarios implements CommandLineRunner {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;

    public InicializadorUsuarios(UsuarioRepository usuarioRepository, PasswordEncoder passwordEncoder) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(String... args) {
        if (usuarioRepository.count() == 0) {
            cargarUsuariosPorDefecto();
        }
    }

    private void cargarUsuariosPorDefecto() {
        String claveComun = passwordEncoder.encode("Faro2026!");

        usuarioRepository.saveAll(List.of(
                // 1. Encargado del Corralón (Administrador)
                new Usuario("Martín", "Gómez", "encargado@generalpaz.gob.ar", claveComun,
                        RolUsuario.ENCARGADO_CORRALON, null, true),

                // 2. Capataz de Cuadrilla Verde (Id 1)
                new Usuario("Carlos", "Rodríguez", "capataz.verde@generalpaz.gob.ar", claveComun,
                        RolUsuario.CAPATAZ_CUADRILLA, 1L, true),

                // 3. Capataz de Cuadrilla Alumbrado (Id 2)
                new Usuario("Juan", "López", "capataz.alumbrado@generalpaz.gob.ar", claveComun,
                        RolUsuario.CAPATAZ_CUADRILLA, 2L, true),

                // 4. Mesa de Entradas (Recepción y reclamos)
                new Usuario("Ana", "Martínez", "mesadeentradas@generalpaz.gob.ar", claveComun,
                        RolUsuario.MESA_ENTRADAS, null, true)
        ));
    }
}
