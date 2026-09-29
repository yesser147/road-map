package tn.roadmap.api.domain;

import jakarta.persistence.*;

import java.time.Instant;

/** Compte : citoyen (inscription libre) ou agent du Ministère (créé par l'administration). */
@Entity
@Table(name = "app_user")
public class AppUser {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 120)
    private String email;

    @Column(nullable = false)
    private String passwordHash;

    @Column(nullable = false, length = 120)
    private String fullName;

    @Column(length = 30)
    private String phone;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private Role role;

    /** national | gouvernorat | commune — null pour un citoyen. */
    @Column(length = 20)
    private String scopeLevel;

    /** Libellé du périmètre ; pour une commune, nom de l'arrondissement visible. */
    @Column(length = 120)
    private String scopeLabel;

    private Instant createdAt = Instant.now();

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public Role getRole() {
        return role;
    }

    public void setRole(Role role) {
        this.role = role;
    }

    public String getScopeLevel() {
        return scopeLevel;
    }

    public void setScopeLevel(String scopeLevel) {
        this.scopeLevel = scopeLevel;
    }

    public String getScopeLabel() {
        return scopeLabel;
    }

    public void setScopeLabel(String scopeLabel) {
        this.scopeLabel = scopeLabel;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
