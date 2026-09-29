package tn.roadmap.api.web;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import tn.roadmap.api.service.AuthService;
import tn.roadmap.api.web.Dtos.AuthResponse;
import tn.roadmap.api.web.Dtos.UserDto;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService auth;

    public AuthController(AuthService auth) {
        this.auth = auth;
    }

    public record LoginRequest(@NotBlank @Email String email, @NotBlank String password,
                               @Pattern(regexp = "citoyen|ministere") String space) {
    }

    public record RegisterRequest(@NotBlank @Size(max = 120) String fullName, @NotBlank @Email String email,
                                  @Size(max = 30) String phone, @NotBlank @Size(min = 8, max = 100) String password) {
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest r) {
        return auth.login(r.email(), r.password(), r.space() == null ? "ministere" : r.space());
    }

    /** Inscription libre : uniquement pour les citoyens. Les comptes agents sont créés par l'administration. */
    @PostMapping("/register")
    public AuthResponse register(@Valid @RequestBody RegisterRequest r) {
        return auth.registerCitizen(r.fullName(), r.email(), r.phone(), r.password());
    }

    @GetMapping("/me")
    public UserDto me(Authentication a) {
        return UserDto.of(auth.current(a));
    }
}
