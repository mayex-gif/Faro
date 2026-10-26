package com.faro.backend.services;

import com.faro.backend.config.security.JwtService;
import com.faro.backend.dto.LoginRequestDTO;
import com.faro.backend.exceptions.OperacionNoPermitidaException;
import com.faro.backend.repositories.UsuarioRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/** Login de una cuenta dada de baja: responde 409 "cuenta desactivada" (no 401 "clave incorrecta"). */
@ExtendWith(MockitoExtension.class)
class AutenticacionServiceCuentaDeBajaTest {

    @Mock
    private AuthenticationManager authenticationManager;

    @Mock
    private JwtService jwtService;

    @Mock
    private UsuarioRepository usuarioRepository;

    @InjectMocks
    private AutenticacionService autenticacionService;

    @Test
    void cuentaDadaDeBajaConLaClaveCorrectaResponde409SinToken() {
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenThrow(new DisabledException("User is disabled"));

        OperacionNoPermitidaException error = assertThrows(OperacionNoPermitidaException.class,
                () -> autenticacionService.autenticar(new LoginRequestDTO("mesadeentradas@generalpaz.gob.ar", "clave-de-prueba")));

        assertEquals(AutenticacionService.CUENTA_DESACTIVADA, error.getMessage());
        verifyNoInteractions(jwtService);
    }
}
