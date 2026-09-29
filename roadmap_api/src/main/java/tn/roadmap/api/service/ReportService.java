package tn.roadmap.api.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import tn.roadmap.api.domain.*;
import tn.roadmap.api.domain.Values.*;
import tn.roadmap.api.repo.CitizenReportRepository;
import tn.roadmap.api.repo.DefectRepository;
import tn.roadmap.api.repo.RoadSegmentRepository;
import tn.roadmap.api.web.Dtos.MyReportDto;
import tn.roadmap.api.web.Dtos.ReportDto;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.*;

/** Signalements citoyens : dépôt de photo (espace citoyen), file de validation F10 (espace Ministère). */
@Service
public class ReportService {

    private static final double MATCH_RADIUS_M = 15;
    private static final Set<String> IMAGE_TYPES = Set.of("image/jpeg", "image/png", "image/webp", "image/heic", "image/heif");

    private final CitizenReportRepository reports;
    private final DefectRepository defects;
    private final RoadSegmentRepository segments;
    private final VisionClient vision;
    private final EstimationService estimation;
    private final NetworkService network;
    private final GeocodingClient geocoding;
    private final Path uploads;

    public ReportService(CitizenReportRepository reports, DefectRepository defects, RoadSegmentRepository segments,
                         VisionClient vision, EstimationService estimation, NetworkService network,
                         GeocodingClient geocoding, @Value("${roadmap.uploads-dir}") String uploadsDir) {
        this.reports = reports;
        this.defects = defects;
        this.segments = segments;
        this.vision = vision;
        this.estimation = estimation;
        this.network = network;
        this.geocoding = geocoding;
        this.uploads = Path.of(uploadsDir).toAbsolutePath().normalize();
    }

    // ------------------------------------------------------------------ espace citoyen

    @Transactional
    public ReportDto submit(AppUser author, MultipartFile photo, double lat, double lng, String description, DefectType hint) {
        if (photo == null || photo.isEmpty()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Photo manquante");
        if (photo.getContentType() == null || !IMAGE_TYPES.contains(photo.getContentType())) {
            throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "Formats acceptés : JPEG, PNG, WebP, HEIC");
        }
        byte[] bytes;
        String url;
        try {
            bytes = photo.getBytes();
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Photo illisible");
        }
        String hash = sha256(bytes);
        reports.findFirstByAuthorIdAndPhotoHash(author.getId(), hash).ifPresent(prev -> {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Vous avez déjà envoyé cette photo (signalement " + prev.getId()
                    + "). Vous pouvez suivre son avancement dans « Mes signalements ».");
        });
        try {
            Files.createDirectories(uploads);
            String ext = switch (photo.getContentType()) {
                case "image/png" -> ".png";
                case "image/webp" -> ".webp";
                case "image/heic", "image/heif" -> ".heic";
                default -> ".jpg";
            };
            String name = UUID.randomUUID() + ext;
            Files.write(uploads.resolve(name), bytes);
            url = "/media/uploads/" + name;
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Enregistrement de la photo impossible");
        }

        VisionClient.Result v = vision.analyze(bytes, photo.getOriginalFilename(), lat, lng);
        DefectType type = v.type() != null ? v.type() : hint;
        String road = locate(lat, lng);

        CitizenReport r = new CitizenReport();
        r.setId(nextId());
        r.setReceivedAt(Instant.now());
        r.setChannel(ReportChannel.PHOTO);
        r.setDescription(description == null || description.isBlank() ? null : description.trim());
        r.setImageUrl(url);
        r.setLat(lat);
        r.setLng(lng);
        r.setAuthorId(author.getId());
        r.setPhotoHash(hash);
        r.setPhotoCheck(new PhotoCheck(v.accepted(), v.reason(), round(v.blurScore()), round2(v.roadScore()), v.analyzed() ? null : false));
        if (v.accepted()) {
            Severity sev = v.depthCm() != null && type == DefectType.NID_DE_POULE ? EstimationService.severityFromDepth(v.depthCm()) : v.severity();
            r.setExtraction(new Extraction(type, road, sev, v.analyzed() ? round2(v.confidence()) : 0, type != null,
                    v.depthCm(), v.lengthM(), v.widthM()));
            r.setMatchedDefectId(findMatch(type, lat, lng));
            r.setState(ReportState.A_VALIDER);
        } else {
            r.setState(ReportState.REJETE); // rejet automatique, le citoyen voit le motif et peut reprendre la photo
        }
        return ReportDto.of(reports.save(r));
    }

    public List<MyReportDto> mine(AppUser author) {
        return reports.findByAuthorIdOrderByReceivedAtDesc(author.getId()).stream().map(r -> {
            DefectStatus ds = r.getMatchedDefectId() == null ? null
                    : defects.findById(r.getMatchedDefectId()).map(Defect::getStatus).orElse(null);
            String[] p = progress(r, ds);
            return new MyReportDto(ReportDto.of(r), p[0], p[1], ds);
        }).toList();
    }

    /** Étapes vues par le citoyen : recu -> verification -> pris_en_charge -> travaux -> repare (ou non_retenu). */
    private static String[] progress(CitizenReport r, DefectStatus ds) {
        if (r.getState() == ReportState.REJETE) {
            String why = r.getPhotoCheck() != null && r.getPhotoCheck().reason() != null ? r.getPhotoCheck().reason() : "signalement non retenu";
            return new String[]{"non_retenu", "Non retenu — " + why};
        }
        if (r.getState() == ReportState.A_VALIDER) return new String[]{"verification", "En cours de vérification par les services"};
        if (ds == null) return new String[]{"pris_en_charge", "Pris en charge"};
        return switch (ds) {
            case REPARE, VERIFIE -> new String[]{"repare", "Réparé — merci pour votre signalement"};
            case PLANIFIE, EN_COURS -> new String[]{"travaux", ds == DefectStatus.PLANIFIE ? "Intervention planifiée" : "Travaux en cours"};
            default -> new String[]{"pris_en_charge", r.getState() == ReportState.FUSIONNE ? "Déjà signalé — pris en charge" : "Pris en charge"};
        };
    }

    // ------------------------------------------------------------------ espace Ministère (F10)

    public List<ReportDto> all() {
        return reports.findAllByOrderByReceivedAtDesc().stream().map(ReportDto::of).toList();
    }

    @Transactional
    public ReportDto review(String id, ReportState decision, String defectId) {
        CitizenReport r = reports.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Signalement introuvable"));
        switch (decision) {
            case FUSIONNE -> {
                String target = defectId != null ? defectId : r.getMatchedDefectId();
                Defect d = defects.findById(target == null ? "" : target)
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Défaut cible introuvable"));
                addObservation(d, r);
                d.setCitizenReports(d.getCitizenReports() + 1);
                defects.save(d);
                r.setMatchedDefectId(d.getId());
            }
            case VALIDE -> r.setMatchedDefectId(createDefect(r).getId());
            case REJETE, A_VALIDER -> {
            }
        }
        r.setState(decision);
        reports.save(r);
        network.refreshDerived();
        return ReportDto.of(r);
    }

    private Defect createDefect(CitizenReport r) {
        if (r.getLat() == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Signalement sans position : fusionnez-le ou rejetez-le");
        DefectType type = r.getExtraction() != null && r.getExtraction().type() != null ? r.getExtraction().type() : DefectType.NID_DE_POULE;
        Severity sev = r.getExtraction() != null && r.getExtraction().severityHint() != null ? r.getExtraction().severityHint() : Severity.MOYENNE;
        RoadSegment seg = nearestSegment(r.getLat(), r.getLng());
        boolean sidewalk = EnumSet.of(DefectType.DALLE_CASSEE, DefectType.BORDURE_CASSEE, DefectType.RESSAUT, DefectType.SOULEVEMENT_RACINE).contains(type);
        Extraction x = r.getExtraction();
        Double depth = x == null ? null : x.depthCm();
        Double len = x == null ? null : x.lengthM();
        Double wid = x == null ? null : x.widthM();
        // coût : dimensions mesurées si disponibles, sinon forfait par type (signalé comme estimation dans le barème)
        boolean crack = type.name().startsWith("FISSURE");
        double costLen = len != null ? len : crack ? 3 : 1, costWid = wid != null ? wid : crack ? 0.02 : 0.8;

        Defect d = new Defect();
        d.setId(nextDefectId());
        d.setType(type);
        d.setSurface(sidewalk ? Surface.TROTTOIR : Surface.CHAUSSEE);
        d.setSeverity(sev);
        d.setStatus(DefectStatus.VALIDE);
        d.setLat(r.getLat());
        d.setLng(r.getLng());
        d.setRoadId(seg == null ? null : seg.getRoadId());
        d.setRoadName(seg != null && seg.getRoadName() != null ? seg.getRoadName()
                : r.getExtraction() != null && r.getExtraction().location() != null && !r.getExtraction().location().startsWith("Position GPS")
                ? r.getExtraction().location() : "Voie de desserte");
        d.setDistrict(NetworkService.districtOf(r.getLat(), r.getLng()));
        d.setDimensions(new Dimensions(len, wid, depth));
        d.setFirstSeen(r.getReceivedAt());
        d.setLastSeen(r.getReceivedAt());
        d.setObservations(new ArrayList<>());
        addObservation(d, r);
        CostEstimate c = estimation.cost(type, costLen, costWid);
        d.setCost(c);
        d.setCostAmount(c.amountTnd());
        d.setCitizenReports(1);
        List<PriorityFactor> f = estimation.factors(sev, seg == null ? null : seg.getRoadClass(), 1);
        d.setPriorityFactors(f);
        d.setPriorityScore(EstimationService.score(f));
        defects.save(d);
        if (seg != null) {
            List<String> ids = new ArrayList<>(seg.getDefectIds() == null ? List.of() : seg.getDefectIds());
            ids.add(d.getId());
            seg.setDefectIds(ids);
            segments.save(seg);
        }
        return d;
    }

    private static void addObservation(Defect d, CitizenReport r) {
        List<Observation> obs = new ArrayList<>(d.getObservations() == null ? List.of() : d.getObservations());
        double conf = r.getExtraction() != null ? r.getExtraction().confidence() : 0.5;
        obs.add(new Observation("OBS-" + r.getId(), r.getReceivedAt(),
                r.getChannel() == ReportChannel.SMS ? Source.CITOYEN_SMS : Source.CITOYEN_PHOTO, conf, null, r.getImageUrl()));
        d.setObservations(obs);
        if (r.getReceivedAt().isAfter(d.getLastSeen())) d.setLastSeen(r.getReceivedAt());
    }

    // ------------------------------------------------------------------ utilitaires

    /** Doublon probable : défaut actif du même type à moins de 15 m (F3 côté signalements). */
    private String findMatch(DefectType type, double lat, double lng) {
        if (type == null) return null;
        return defects.findAll().stream()
                .filter(d -> d.getType() == type && !d.getStatus().isTreated())
                .filter(d -> NetworkService.haversineM(lat, lng, d.getLat(), d.getLng()) <= MATCH_RADIUS_M)
                .min(Comparator.comparingDouble(d -> NetworkService.haversineM(lat, lng, d.getLat(), d.getLng())))
                .map(Defect::getId).orElse(null);
    }

    private RoadSegment nearestSegment(double lat, double lng) {
        RoadSegment best = null;
        double bestD = 120; // au-delà de 120 m : hors réseau connu
        for (RoadSegment s : segments.findAll()) {
            for (List<Double> p : s.getCoords()) {
                double dist = NetworkService.haversineM(lat, lng, p.get(0), p.get(1));
                if (dist < bestD) {
                    bestD = dist;
                    best = s;
                }
            }
        }
        return best;
    }

    /**
     * Localisation lisible : voie connue de la zone pilote (< 120 m), sinon adresse OpenStreetMap,
     * sinon coordonnées GPS. Jamais vide pour un signalement positionné.
     */
    private String locate(double lat, double lng) {
        RoadSegment s = nearestSegment(lat, lng);
        if (s != null && s.getRoadName() != null) return s.getRoadName();
        String address = geocoding.address(lat, lng);
        if (address != null) return address;
        return s != null ? "Voie de desserte" : GeocodingClient.coordinates(lat, lng);
    }

    /** Au démarrage : complète la localisation des signalements enregistrés avant ce mécanisme. */
    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void backfillLocations() {
        for (CitizenReport r : reports.findAll()) {
            Extraction x = r.getExtraction();
            if (r.getLat() == null || x == null || (x.location() != null && !x.location().isBlank())) continue;
            r.setExtraction(x.withLocation(locate(r.getLat(), r.getLng())));
            reports.save(r);
        }
        // Défauts créés avant la mesure automatique : dimensions forfaitaires (1 × 0,8 m ou 3 × 0,02 m) effacées,
        // pour ne jamais afficher une valeur non mesurée comme une mesure.
        for (Defect d : defects.findAll()) {
            Dimensions dim = d.getDimensions();
            boolean citizenOnly = d.getObservations() != null && !d.getObservations().isEmpty() && d.getObservations().stream()
                    .allMatch(o -> o.source() == Source.CITOYEN_PHOTO || o.source() == Source.CITOYEN_SMS);
            boolean placeholder = dim != null && dim.depthCm() == null
                    && ((eq(dim.lengthM(), 1) && eq(dim.widthM(), 0.8)) || (eq(dim.lengthM(), 3) && eq(dim.widthM(), 0.02)));
            if (citizenOnly && placeholder) {
                d.setDimensions(new Dimensions(null, null, null));
                defects.save(d);
            }
        }
    }

    private static boolean eq(Double a, double b) {
        return a != null && Math.abs(a - b) < 1e-9;
    }

    private String nextId() {
        int max = reports.findAll().stream().mapToInt(r -> parseNum(r.getId())).max().orElse(200);
        return "SIG-" + (max + 1);
    }

    private String nextDefectId() {
        int max = defects.findAll().stream().mapToInt(d -> parseNum(d.getId())).max().orElse(0);
        return String.format("BZT-%04d", max + 1);
    }

    private static int parseNum(String id) {
        try {
            return Integer.parseInt(id.replaceAll("\\D", ""));
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    private static String sha256(byte[] data) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(data));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    private static double round(double v) {
        return Math.round(v);
    }

    private static double round2(double v) {
        return Math.round(v * 100) / 100.0;
    }
}
