package tn.roadmap.api.service;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import tn.roadmap.api.domain.*;
import tn.roadmap.api.repo.*;
import tn.roadmap.api.web.Dtos.KpisDto;

import java.text.Normalizer;
import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

/** Lecture du réseau et cycle de vie des défauts, avec cloisonnement territorial selon le compte connecté. */
@Service
public class NetworkService {

    private final DefectRepository defects;
    private final RoadSegmentRepository segments;
    private final CitizenReportRepository reports;

    public NetworkService(DefectRepository defects, RoadSegmentRepository segments, CitizenReportRepository reports) {
        this.defects = defects;
        this.segments = segments;
        this.reports = reports;
    }

    // ------------------------------------------------------------------ cloisonnement

    /** Un agent municipal ne voit que son arrondissement ; ministère et direction régionale voient la zone pilote. */
    public static boolean inScope(AppUser u, String district) {
        return !"commune".equals(u.getScopeLevel()) || Objects.equals(u.getScopeLabel(), district);
    }

    public List<Defect> scoped(AppUser u) {
        return defects.findAll().stream().filter(d -> inScope(u, d.getDistrict())).toList();
    }

    public record Filters(Set<DefectType> types, Set<Severity> severities, Set<DefectStatus> statuses, Surface surface,
                          String district, String q) {
    }

    public List<Defect> list(AppUser u, Filters f) {
        String q = f.q() == null ? "" : norm(f.q());
        return scoped(u).stream()
                .filter(d -> f.types().isEmpty() || f.types().contains(d.getType()))
                .filter(d -> f.severities().isEmpty() || f.severities().contains(d.getSeverity()))
                .filter(d -> f.statuses().isEmpty() || f.statuses().contains(d.getStatus()))
                .filter(d -> f.surface() == null || f.surface() == d.getSurface())
                .filter(d -> f.district() == null || f.district().equals(d.getDistrict()))
                .filter(d -> q.isEmpty() || norm(d.getId() + " " + d.getRoadName() + " " + d.getDistrict()).contains(q))
                .sorted(Comparator.comparing(Defect::getId))
                .toList();
    }

    public Defect get(AppUser u, String id) {
        return defects.findById(id).filter(d -> inScope(u, d.getDistrict()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Défaut introuvable dans votre périmètre"));
    }

    // ------------------------------------------------------------------ cycle de vie (F9)

    @Transactional
    public Defect updateStatus(AppUser u, String id, DefectStatus status, String team, Instant plannedDate) {
        Defect d = get(u, id);
        d.setStatus(status);
        if (team != null && !team.isBlank()) d.setAssignedTeam(team);
        if (plannedDate != null) d.setPlannedDate(plannedDate);
        defects.save(d);
        refreshDerived();
        return d;
    }

    /** Recalcule les rangs de priorité et l'état des tronçons après toute modification. */
    @Transactional
    public void refreshDerived() {
        List<Defect> all = defects.findAll();
        all.forEach(d -> d.setPriorityRank(0));
        List<Defect> active = all.stream().filter(d -> !d.getStatus().isTreated())
                .sorted(Comparator.comparingInt(Defect::getPriorityScore).reversed()).toList();
        for (int i = 0; i < active.size(); i++) active.get(i).setPriorityRank(i + 1);
        defects.saveAll(all);

        Map<String, Defect> byId = all.stream().collect(Collectors.toMap(Defect::getId, d -> d));
        List<RoadSegment> segs = segments.findAll();
        for (RoadSegment s : segs) {
            if (s.getCondition() == SegmentCondition.NON_COUVERT) continue;
            List<Defect> act = s.getDefectIds() == null ? List.of() : s.getDefectIds().stream().map(byId::get)
                    .filter(Objects::nonNull).filter(d -> !d.getStatus().isTreated()).toList();
            s.setCondition(act.stream().anyMatch(d -> d.getSeverity().rank() <= 1) ? SegmentCondition.CRITIQUE
                    : act.isEmpty() ? SegmentCondition.BON : SegmentCondition.DEGRADE);
        }
        segments.saveAll(segs);
    }

    // ------------------------------------------------------------------ indicateurs

    public KpisDto kpis(AppUser u) {
        List<RoadSegment> segs = segments.findAll();
        double networkKm = segs.stream().mapToDouble(NetworkService::lengthKm).sum();
        double coveredKm = segs.stream().filter(s -> s.getCondition() != SegmentCondition.NON_COUVERT).mapToDouble(NetworkService::lengthKm).sum();
        double goodKm = segs.stream().filter(s -> s.getCondition() == SegmentCondition.BON).mapToDouble(NetworkService::lengthKm).sum();
        List<Defect> mine = scoped(u);
        List<Defect> active = mine.stream().filter(d -> !d.getStatus().isTreated()).toList();
        Instant monthAgo = Instant.now().minus(Duration.ofDays(30));
        int repaired = (int) mine.stream().filter(d -> d.getStatus().isTreated() && d.getLastSeen().isAfter(monthAgo)).count();
        int pending = (int) reports.findAll().stream().filter(r -> r.getState() == ReportState.A_VALIDER).count();
        return new KpisDto(round1(networkKm), round1(coveredKm), active.size(),
                (int) active.stream().filter(d -> d.getSeverity() == Severity.CRITIQUE).count(),
                active.stream().mapToDouble(Defect::getCostAmount).sum(), repaired, 11.4, pending,
                coveredKm > 0 ? (int) Math.round(100 * goodKm / coveredKm) : 0);
    }

    // ------------------------------------------------------------------ géographie

    public static String districtOf(double lat, double lng) {
        if (lng > 9.8705 && lat < 37.2705) return "Zarzouna";
        if (lat > 37.2805) return "Bizerte Nord";
        if (lng < 9.856) return "Bizerte Ouest";
        if (lat < 37.2665) return "Bizerte Sud";
        return "Centre-ville";
    }

    public static double haversineM(double lat1, double lng1, double lat2, double lng2) {
        double r = 6_371_000, dLat = Math.toRadians(lat2 - lat1), dLng = Math.toRadians(lng2 - lng1);
        double h = Math.pow(Math.sin(dLat / 2), 2) + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) * Math.pow(Math.sin(dLng / 2), 2);
        return 2 * r * Math.asin(Math.sqrt(h));
    }

    static double lengthKm(RoadSegment s) {
        List<List<Double>> c = s.getCoords();
        double m = 0;
        for (int i = 1; i < c.size(); i++) m += haversineM(c.get(i - 1).get(0), c.get(i - 1).get(1), c.get(i).get(0), c.get(i).get(1));
        return m / 1000;
    }

    static double round1(double v) {
        return Math.round(v * 10) / 10.0;
    }

    public static String norm(String s) {
        return Normalizer.normalize(s.toLowerCase(Locale.ROOT), Normalizer.Form.NFD).replaceAll("\\p{M}", "");
    }
}
