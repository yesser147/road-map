package tn.roadmap.api.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import tn.roadmap.api.domain.AppUser;
import tn.roadmap.api.domain.Role;
import tn.roadmap.api.repo.AppUserRepository;
import tn.roadmap.api.web.Dtos.AuthResponse;
import tn.roadmap.api.web.Dtos.UserDto;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

@Service
public class AuthService {

    private final AppUserRepository users;
    private final PasswordEncoder passwords;
    private final JwtEncoder encoder;
    private final Duration validity;

    public AuthService(AppUserRepository users, PasswordEncoder passwords, JwtEncoder encoder,
                       @Value("${roadmap.jwt-validity-hours}") long hours) {
        this.users = users;
        this.passwords = passwords;
        this.encoder = encoder;
        this.validity = Duration.ofHours(hours);
    }

    /**
     * Connexion. {@code space} = "citoyen" ou "ministere" : un compte ne peut se connecter que depuis son espace
     * (un agent ne se connecte pas par l'application citoyenne et inversement).
     */
    public AuthResponse login(String email, String password, String space) {
        AppUser u = users.findByEmailIgnoreCase(email.trim())
                .filter(x -> passwords.matches(password, x.getPasswordHash()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Adresse e-mail ou mot de passe incorrect"));
        boolean citizenSpace = "citoyen".equals(space);
        if (citizenSpace == u.getRole().isStaff()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    citizenSpace ? "Ce compte est un compte agent : utilisez l'espace Ministère" : "Ce compte est un compte citoyen : utilisez l'espace citoyen");
        }
        return issue(u);
    }

    @Transactional
    public AuthResponse registerCitizen(String fullName, String email, String phone, String password) {
        if (users.findByEmailIgnoreCase(email.trim()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Un compte existe déjà avec cette adresse");
        }
        AppUser u = new AppUser();
        u.setFullName(fullName.trim());
        u.setEmail(email.trim().toLowerCase());
        u.setPhone(phone == null || phone.isBlank() ? null : phone.trim());
        u.setPasswordHash(passwords.encode(password));
        u.setRole(Role.CITOYEN);
        return issue(users.save(u));
    }

    public AppUser current(Authentication auth) {
        if (auth == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        return users.findByEmailIgnoreCase(auth.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Compte introuvable"));
    }

    private AuthResponse issue(AppUser u) {
        Instant now = Instant.now();
        Instant exp = now.plus(validity);
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer("roadmap-api")
                .subject(u.getEmail())
                .issuedAt(now)
                .expiresAt(exp)
                .claim("roles", List.of(u.getRole().name()))
                .claim("name", u.getFullName())
                .build();
        String token = encoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();
        return new AuthResponse(token, exp, UserDto.of(u));
    }
}
