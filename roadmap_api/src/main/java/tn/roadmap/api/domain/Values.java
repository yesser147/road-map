package tn.roadmap.api.domain;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.Instant;
import java.util.List;

/**
 * Objets-valeurs imbriqués dans les entités (stockés en colonnes JSON) et renvoyés tels quels par l'API.
 * Les noms de champs sont ceux du contrat front (roadmap_web/src/types/domain.ts).
 */
public final class Values {
    private Values() {
    }

    public record LatLng(double lat, double lng) {
    }

    /** Mesures du défaut ; null = non mesuré (jamais de valeur inventée). */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record Dimensions(Double lengthM, Double widthM, Double depthCm) {
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record Observation(String id, Instant date, Source source, double confidence, Double depthCm, String imageUrl) {
    }

    public record PriceLine(String code, String label, double unitPriceTnd, boolean provisional) {
    }

    public record CostEstimate(double amountTnd, List<Double> rangeTnd, double quantity, String unit,
                               PriceLine priceLine, String technicalRef) {
    }

    public record PriorityFactor(String key, String label, double weight, double value) {
    }

    public record Priority(int score, int rank, List<PriorityFactor> factors) {
    }

    /** Résultat de l'analyse automatique ; depthCm / lengthM / widthM : estimations WP2 (null si non calculées). */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record Extraction(DefectType type, String location, Severity severityHint, double confidence, boolean schemaValid,
                             Double depthCm, Double lengthM, Double widthM) {
        public Extraction(DefectType type, String location, Severity severityHint, double confidence, boolean schemaValid) {
            this(type, location, severityHint, confidence, schemaValid, null, null, null);
        }

        public Extraction withLocation(String loc) {
            return new Extraction(type, loc, severityHint, confidence, schemaValid, depthCm, lengthM, widthM);
        }
    }

    /** Résultat du filtre photo WP2. analyzed=false quand le service vision était indisponible. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record PhotoCheck(boolean accepted, String reason, double blurScore, double roadScore, Boolean analyzed) {
    }
}
