package com.faro.backend.controllers;

import com.faro.backend.dto.LoginRequestDTO;
import com.faro.backend.dto.LoginResponseDTO;
import com.faro.backend.dto.UsuarioDTO;
import com.faro.backend.services.AutenticacionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Controlador REST para el módulo de autenticación: inicio de sesión,
 * consulta de perfil y validación de tokens Bearer.
 */
@RestController
@RequestMapping("/api/auth")
@Tag(name = "Autenticación", description = "Endpoints de inicio de sesión, emisión de JWT y consulta de perfil")
public class AutenticacionController {

    private final AutenticacionService autenticacionService;

    public AutenticacionController(AutenticacionService autenticacionService) {
        this.autenticacionService = autenticacionService;
    }

    @PostMapping("/login")
    @Operation(summary = "Iniciar sesión", description = "Valida correo y contraseña. Devuelve un token JWT con la información del usuario.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Autenticación exitosa"),
            @ApiResponse(responseCode = "400", description = "Formato de petición o campos inválidos"),
            @ApiResponse(responseCode = "401", description = "Correo o contraseña incorrectos"),
            @ApiResponse(responseCode = "409", description = "Usuario desactivado")
    })
    public ResponseEntity<LoginResponseDTO> login(@Valid @RequestBody LoginRequestDTO request) {
        LoginResponseDTO respuesta = autenticacionService.autenticar(request);
        return ResponseEntity.ok(respuesta);
    }

    @GetMapping("/perfil")
    @Operation(summary = "Obtener perfil del usuario actual", description = "Devuelve los datos del usuario autenticado en la sesión actual.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Perfil obtenido correctamente"),
            @ApiResponse(responseCode = "401", description = "No autenticado o token ausente/inválido")
    })
    public ResponseEntity<UsuarioDTO> obtenerPerfil() {
        UsuarioDTO perfil = autenticacionService.obtenerPerfilActual();
        return ResponseEntity.ok(perfil);
    }

    @GetMapping("/validar")
    @Operation(summary = "Validar token JWT", description = "Comprueba si el token enviado en la cabecera Authorization sigue vigente.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Token válido"),
            @ApiResponse(responseCode = "401", description = "Token inválido, expirado o ausente")
    })
    public ResponseEntity<UsuarioDTO> validar(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        UsuarioDTO usuario = autenticacionService.validarToken(authHeader);
        return ResponseEntity.ok(usuario);
    }
}
