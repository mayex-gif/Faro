package com.faro.backend.repositories;

import com.faro.backend.models.RolUsuario;
import com.faro.backend.models.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UsuarioRepository extends JpaRepository<Usuario, Long> {
    Optional<Usuario> findByEmailIgnoreCase(String email);
    boolean existsByEmailIgnoreCase(String email);

    /** Cuántas cuentas activas tienen ese rol (ej.: para no dejar al corralón sin encargado). */
    long countByRolAndActivoTrue(RolUsuario rol);
}
