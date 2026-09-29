package tn.roadmap.api.domain;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

/** Types de défauts du contrat (Article 3). Sérialisé en minuscules (contrat JSON partagé avec le front). */
public enum DefectType {
    NID_DE_POULE,
    FISSURE_LONGITUDINALE,
    FISSURE_TRANSVERSALE,
    FAIENCAGE,
    AFFAISSEMENT,
    PLAQUE_EGOUT_DEFECTUEUSE,
    DALLE_CASSEE,
    RESSAUT,
    SOULEVEMENT_RACINE,
    BORDURE_CASSEE;

    @JsonValue
    public String code() {
        return name().toLowerCase();
    }

    @JsonCreator
    public static DefectType of(String code) {
        return valueOf(code.trim().toUpperCase());
    }
}
