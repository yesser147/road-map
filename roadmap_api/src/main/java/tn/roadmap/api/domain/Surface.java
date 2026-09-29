package tn.roadmap.api.domain;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

/** Valeur de domaine. Sérialisé en minuscules (contrat JSON partagé avec le front). */
public enum Surface {
    CHAUSSEE,
    TROTTOIR;

    @JsonValue
    public String code() {
        return name().toLowerCase();
    }

    @JsonCreator
    public static Surface of(String code) {
        return valueOf(code.trim().toUpperCase());
    }
}
