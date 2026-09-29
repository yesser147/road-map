package tn.roadmap.api.service;

import org.springframework.stereotype.Service;
import tn.roadmap.api.domain.DefectType;
import tn.roadmap.api.domain.Severity;
import tn.roadmap.api.domain.Values.CostEstimate;
import tn.roadmap.api.domain.Values.PriceLine;
import tn.roadmap.api.domain.Values.PriorityFactor;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;

/**
 * Coût sourcé (F6) et score de priorité (F7) pour un défaut créé sur la plateforme.
 * Barème PROVISOIRE (le barème officiel n'a pas été communiqué) : il sera remplacé par le moteur WP3.
 */
@Service
public class EstimationService {

    public static final String TECH_REF = "Guide technique d'entretien des chaussées urbaines, §4 (référence provisoire — à remplacer par le référentiel du Ministère)";

    private record Line(String code, String label, double unitPrice, String unit) {
    }

    private static final Map<DefectType, Line> PRICES = new EnumMap<>(Map.of(
            DefectType.NID_DE_POULE, new Line("R-12", "Reprise localisée en enrobé à chaud", 95, "m²"),
            DefectType.FISSURE_LONGITUDINALE, new Line("R-21", "Pontage de fissures (bitume modifié)", 18, "ml"),
            DefectType.FISSURE_TRANSVERSALE, new Line("R-21", "Pontage de fissures (bitume modifié)", 18, "ml"),
            DefectType.FAIENCAGE, new Line("R-14", "Fraisage et rechargement BB 5 cm", 55, "m²"),
            DefectType.AFFAISSEMENT, new Line("R-31", "Purge et reconstitution de chaussée", 160, "m²"),
            DefectType.PLAQUE_EGOUT_DEFECTUEUSE, new Line("A-05", "Remplacement tampon fonte D400 + scellement", 1150, "u"),
            DefectType.DALLE_CASSEE, new Line("T-02", "Remplacement de dalles de trottoir", 70, "m²"),
            DefectType.RESSAUT, new Line("T-04", "Nivellement et reprise de revêtement", 60, "m²"),
            DefectType.SOULEVEMENT_RACINE, new Line("T-09", "Traitement racinaire et reprise de trottoir", 130, "m²"),
            DefectType.BORDURE_CASSEE, new Line("T-07", "Remplacement de bordure T2", 48, "ml")));

    public CostEstimate cost(DefectType type, double lengthM, double widthM) {
        Line l = PRICES.get(type);
        double quantity = switch (l.unit()) {
            case "u" -> 1;
            case "ml" -> Math.round(lengthM * 1.1 * 10) / 10.0;
            default -> Math.round(lengthM * Math.max(widthM, 0.3) * 1.3 * 10) / 10.0;
        };
        double amount = Math.round(quantity * l.unitPrice() + ("u".equals(l.unit()) ? 150 : 80));
        return new CostEstimate(amount, List.of((double) Math.round(amount * 0.8), (double) Math.round(amount * 1.25)), quantity, l.unit(),
                new PriceLine(l.code(), l.label(), l.unitPrice(), true), TECH_REF);
    }

    public List<PriorityFactor> factors(Severity s, String roadClass, int citizenReports) {
        double sev = switch (s) { case FAIBLE -> 0.2; case MOYENNE -> 0.45; case ELEVEE -> 0.75; case CRITIQUE -> 1; };
        double traffic = switch (roadClass == null ? "" : roadClass) {
            case "trunk" -> 1; case "primary" -> 0.9; case "secondary" -> 0.7; case "tertiary" -> 0.5; default -> 0.4;
        };
        return List.of(
                new PriorityFactor("gravite", "Gravité", 0.4, sev),
                new PriorityFactor("trafic", "Trafic de la voie", 0.25, traffic),
                new PriorityFactor("sites_sensibles", "Proximité école / hôpital", 0.15, 0.1),
                new PriorityFactor("anciennete", "Ancienneté du défaut", 0.1, 0),
                new PriorityFactor("signalements", "Signalements citoyens", 0.1, Math.min(1, citizenReports / 4.0)));
    }

    /** Seuils de gravité d'un nid-de-poule selon sa profondeur (mêmes seuils que WP2 et la maquette). */
    public static Severity severityFromDepth(double depthCm) {
        return depthCm >= 10 ? Severity.CRITIQUE : depthCm >= 6 ? Severity.ELEVEE : depthCm >= 3 ? Severity.MOYENNE : Severity.FAIBLE;
    }

    public static int score(List<PriorityFactor> f) {
        return (int) Math.round(100 * f.stream().mapToDouble(x -> x.weight() * x.value()).sum());
    }
}
