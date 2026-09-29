package tn.roadmap.api.domain;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

/** Valeur de domaine. Sérialisé en minuscules (contrat JSON partagé avec le front). */
public enum Severity {
    FAIBLE,
    MOYENNE,
    ELEVEE,
    CRITIQUE;

    @JsonValue
    public String code() {
        return name().toLowerCase();
    }

    @JsonCreator
    public static Severity of(String code) {
        return valueOf(code.trim().toUpperCase());
    }

    /** 0 = la plus grave. */
    public int rank() {
        return switch (this) { case CRITIQUE -> 0; case ELEVEE -> 1; case MOYENNE -> 2; case FAIBLE -> 3; };
    }
}
