package tn.roadmap.api.service;

import org.springframework.stereotype.Service;
import tn.roadmap.api.domain.*;
import tn.roadmap.api.repo.RoadSegmentRepository;
import tn.roadmap.api.web.Dtos.AssistantAnswer;
import tn.roadmap.api.web.Dtos.DefectDto;
import tn.roadmap.api.web.Dtos.FunctionCall;

import java.text.NumberFormat;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Assistant F11 — version déterministe : la question est interprétée par règles, puis traduite en appels de
 * fonctions de recherche sur les données (jamais de réponse inventée). WP3 remplacera l'interprétation par le
 * modèle de langage (Qwen2.5, appels de fonctions) en gardant les mêmes fonctions et le même format de réponse.
 */
@Service
public class AssistantService {

    private static final List<String> DISTRICTS = List.of("Centre-ville", "Bizerte Nord", "Bizerte Ouest", "Bizerte Sud", "Zarzouna");
    private static final Map<String, String> LABEL = Map.of(
            "NID_DE_POULE", "nid-de-poule", "FISSURE_LONGITUDINALE", "fissure", "FAIENCAGE", "faïençage",
            "AFFAISSEMENT", "affaissement", "PLAQUE_EGOUT_DEFECTUEUSE", "plaque d'égout défectueuse",
            "DALLE_CASSEE", "dalle cassée", "BORDURE_CASSEE", "bordure cassée", "SOULEVEMENT_RACINE", "soulèvement par racine");
    private static final LinkedHashMap<Pattern, DefectType> TYPE_WORDS = new LinkedHashMap<>();

    static {
        TYPE_WORDS.put(Pattern.compile("nid|trou|7ofra|poule"), DefectType.NID_DE_POULE);
        TYPE_WORDS.put(Pattern.compile("fissure"), DefectType.FISSURE_LONGITUDINALE);
        TYPE_WORDS.put(Pattern.compile("faiencage"), DefectType.FAIENCAGE);
        TYPE_WORDS.put(Pattern.compile("affaissement"), DefectType.AFFAISSEMENT);
        TYPE_WORDS.put(Pattern.compile("plaque|egout|tampon"), DefectType.PLAQUE_EGOUT_DEFECTUEUSE);
        TYPE_WORDS.put(Pattern.compile("dalle|trottoir"), DefectType.DALLE_CASSEE);
        TYPE_WORDS.put(Pattern.compile("bordure"), DefectType.BORDURE_CASSEE);
        TYPE_WORDS.put(Pattern.compile("racine|arbre"), DefectType.SOULEVEMENT_RACINE);
    }

    private final NetworkService network;
    private final RoadSegmentRepository segments;

    public AssistantService(NetworkService network, RoadSegmentRepository segments) {
        this.network = network;
        this.segments = segments;
    }

    public AssistantAnswer ask(AppUser user, String question) {
        String n = NetworkService.norm(question);
        String district = DISTRICTS.stream().filter(d -> n.contains(NetworkService.norm(d))).findFirst().orElse(null);
        DefectType type = TYPE_WORDS.entrySet().stream().filter(e -> e.getKey().matcher(n).find()).map(Map.Entry::getValue).findFirst().orElse(null);
        Matcher m = Pattern.compile("\\b(\\d{1,2})\\b").matcher(n);
        int limit = m.find() ? Integer.parseInt(m.group(1)) : 5;

        List<Defect> pool = new ArrayList<>(network.scoped(user).stream().filter(d -> !d.getStatus().isTreated())
                .filter(d -> district == null || district.equals(d.getDistrict()))
                .filter(d -> type == null || (type == DefectType.FISSURE_LONGITUDINALE ? d.getType().name().startsWith("FISSURE") : d.getType() == type))
                .toList());
        String zone = district != null ? district : user.getScopeLabel();
        Map<String, Object> args = new LinkedHashMap<>();
        args.put("zone", zone);
        if (type != null) args.put("type", type.code());
        args.put("statut", "actif");
        String typeTxt = type == null ? "" : " de type « " + LABEL.getOrDefault(type.name(), type.code()) + " »";

        if (Pattern.compile("cout|budget|montant|combien.*(dt|dinar)").matcher(n).find()) {
            double total = pool.stream().mapToDouble(Defect::getCostAmount).sum();
            double crit = pool.stream().filter(d -> d.getSeverity() == Severity.CRITIQUE).mapToDouble(Defect::getCostAmount).sum();
            double high = pool.stream().filter(d -> d.getSeverity() == Severity.ELEVEE).mapToDouble(Defect::getCostAmount).sum();
            pool.sort(Comparator.comparingDouble(Defect::getCostAmount).reversed());
            return answer("Le coût estimé pour traiter les " + pool.size() + " défauts actifs" + typeTxt + " dans " + zone + " est de **" + tnd(total)
                            + "**, dont " + tnd(crit) + " pour les défauts critiques et " + tnd(high)
                            + " pour les défauts de gravité élevée. Chaque montant cite sa ligne de barème (provisoire tant que le barème officiel n'est pas communiqué).",
                    List.of(new FunctionCall("rechercher_defauts", args), new FunctionCall("somme_couts", Map.of("regroupement", "gravite"))), pool, limit);
        }
        if (Pattern.compile("combien|nombre").matcher(n).find()) {
            long crit = pool.stream().filter(d -> d.getSeverity() == Severity.CRITIQUE).count();
            byScore(pool);
            return answer(pool.size() + " défauts actifs" + typeTxt + " dans " + zone + ", dont **" + crit + " critiques**. Les plus prioritaires sont listés ci-dessous.",
                    List.of(new FunctionCall("compter_defauts", args)), pool, limit);
        }
        if (Pattern.compile("ecole|hopital|sensible").matcher(n).find()) {
            List<Defect> near = new ArrayList<>(pool.stream().filter(d -> d.getPriorityFactors().stream()
                    .anyMatch(f -> f.key().equals("sites_sensibles") && f.value() > 0.6)).toList());
            byScore(near);
            Map<String, Object> a = new LinkedHashMap<>(args);
            a.put("proximite", List.of("ecole", "hopital"));
            a.put("rayon_m", 150);
            return answer(near.size() + " défauts actifs se trouvent à proximité d'une école ou d'un hôpital dans " + zone + ". Ils sont classés par score de priorité.",
                    List.of(new FunctionCall("rechercher_defauts", a)), near, limit);
        }
        if (Pattern.compile("non couvert|couverture|zone").matcher(n).find() && !n.contains("prior")) {
            List<RoadSegment> segs = segments.findAll().stream().filter(s -> s.getCondition() == SegmentCondition.NON_COUVERT).toList();
            String names = String.join(", ", segs.stream().map(RoadSegment::getRoadName).filter(Objects::nonNull).distinct().limit(6).toList());
            return new AssistantAnswer(segs.size() + " tronçons n'ont pas été parcourus depuis plus de 30 jours et sont affichés en gris sur la carte (jamais présentés comme en bon état). Voies concernées : " + names + "…",
                    List.of(new FunctionCall("zones_non_couvertes", Map.of("depuis_jours", 30))), null);
        }
        byScore(pool);
        Map<String, Object> a = new LinkedHashMap<>(args);
        a.put("tri", "priorite_desc");
        a.put("limite", limit);
        String text = pool.isEmpty() ? "Aucun défaut actif ne correspond à cette recherche dans " + zone + "."
                : "Voici les " + Math.min(limit, pool.size()) + " " + (type == null ? "défauts" : LABEL.getOrDefault(type.name(), type.code()) + "s")
                + " les plus prioritaires dans " + zone + ". Le premier, " + pool.get(0).getId() + " (" + pool.get(0).getRoadName()
                + "), a un score de " + pool.get(0).getPriorityScore() + "/100.";
        return answer(text, List.of(new FunctionCall("rechercher_defauts", a)), pool, limit);
    }

    private static void byScore(List<Defect> l) {
        l.sort(Comparator.comparingInt(Defect::getPriorityScore).reversed());
    }

    private static AssistantAnswer answer(String text, List<FunctionCall> calls, List<Defect> pool, int limit) {
        return new AssistantAnswer(text, calls, pool.stream().limit(limit).map(DefectDto::of).toList());
    }

    private static String tnd(double v) {
        NumberFormat f = NumberFormat.getIntegerInstance(Locale.FRANCE);
        return f.format(Math.round(v)).replace(' ', ' ').replace(' ', ' ') + " DT";
    }
}
