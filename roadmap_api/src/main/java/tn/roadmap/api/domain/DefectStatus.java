package tn.roadmap.api.domain;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

/** Cycle de vie F9, de la détection à la vérification terrain. Sérialisé en minuscules (contrat JSON partagé avec le front). */
public enum DefectStatus {
    DETECTE,
    VALIDE,
    PLANIFIE,
    EN_COURS,
    REPARE,
    VERIFIE;

    @JsonValue
    public String code() {
        return name().toLowerCase();
    }

    @JsonCreator
    public static DefectStatus of(String code) {
        return valueOf(code.trim().toUpperCase());
    }

    public boolean isTreated() {
        return this == REPARE || this == VERIFIE;
    }
}
