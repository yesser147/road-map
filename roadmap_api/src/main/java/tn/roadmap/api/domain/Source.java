package tn.roadmap.api.domain;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

/** Valeur de domaine. Sérialisé en minuscules (contrat JSON partagé avec le front). */
public enum Source {
    VEHICULE,
    PIETON,
    CITOYEN_PHOTO,
    CITOYEN_SMS;

    @JsonValue
    public String code() {
        return name().toLowerCase();
    }

    @JsonCreator
    public static Source of(String code) {
        return valueOf(code.trim().toUpperCase());
    }
}
