package tn.roadmap.api.domain;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

/** Profils : le citoyen signale ; les trois profils du Ministère consultent et traitent (cloisonnement territorial). Sérialisé en minuscules (contrat JSON partagé avec le front). */
public enum Role {
    CITOYEN,
    MINISTERE,
    DIRECTION_REGIONALE,
    AGENT_MUNICIPAL;

    @JsonValue
    public String code() {
        return name().toLowerCase();
    }

    @JsonCreator
    public static Role of(String code) {
        return valueOf(code.trim().toUpperCase());
    }

    public boolean isStaff() {
        return this != CITOYEN;
    }
}
