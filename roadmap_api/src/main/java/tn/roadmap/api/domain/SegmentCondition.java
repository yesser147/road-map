package tn.roadmap.api.domain;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

/** Valeur de domaine. Sérialisé en minuscules (contrat JSON partagé avec le front). */
public enum SegmentCondition {
    BON,
    DEGRADE,
    CRITIQUE,
    NON_COUVERT;

    @JsonValue
    public String code() {
        return name().toLowerCase();
    }

    @JsonCreator
    public static SegmentCondition of(String code) {
        return valueOf(code.trim().toUpperCase());
    }
}
