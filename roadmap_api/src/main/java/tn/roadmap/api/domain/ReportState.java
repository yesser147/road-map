package tn.roadmap.api.domain;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

/** Valeur de domaine. Sérialisé en minuscules (contrat JSON partagé avec le front). */
public enum ReportState {
    A_VALIDER,
    VALIDE,
    REJETE,
    FUSIONNE;

    @JsonValue
    public String code() {
        return name().toLowerCase();
    }

    @JsonCreator
    public static ReportState of(String code) {
        return valueOf(code.trim().toUpperCase());
    }
}
