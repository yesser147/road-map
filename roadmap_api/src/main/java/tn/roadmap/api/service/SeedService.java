package tn.roadmap.api.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import tn.roadmap.api.domain.*;
import tn.roadmap.api.domain.Values.Observation;
import tn.roadmap.api.repo.*;
import tn.roadmap.api.web.Dtos.*;
import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.json.JsonMapper;

import java.io.InputStream;
import java.time.Duration;
import java.time.Instant;
import java.time.YearMonth;
import java.util.List;

/**
 * Premier démarrage : comptes de démonstration + données simulées de la zone pilote (seed/seed.json,
 * exporté depuis roadmap_web/scripts/export-seed.ts). Les dates sont décalées pour que la démo reste « actuelle ».
 */
@Component
public class SeedService implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(SeedService.class);

    record SeedFile(Instant exportedAt, List<DefectDto> defects, List<SegmentDto> segments, List<AssetDto> assets,
                    List<ReportDto> reports, List<TeamDto> teams, List<TimePointDto> timeline) {
    }

    /** Comptes de démonstration. Mot de passe commun : roadmap.demo-password (voir README). */
    private record DemoUser(String email, String name, Role role, String level, String label) {
    }

    private static final List<DemoUser> DEMO_USERS = List.of(
            new DemoUser("ministere@roadmap.tn", "Leila Ben Salah", Role.MINISTERE, "national", "Tunisie — toutes régions"),
            new DemoUser("direction.bizerte@roadmap.tn", "Karim Trabelsi", Role.DIRECTION_REGIONALE, "gouvernorat", "Gouvernorat de Bizerte"),
            new DemoUser("agent.centre@roadmap.tn", "Sami Jaziri", Role.AGENT_MUNICIPAL, "commune", "Centre-ville"),
            new DemoUser("citoyen@demo.tn", "Amira Haddad", Role.CITOYEN, null, null));

    private final boolean enabled;
    private final String demoPassword;
    private final AppUserRepository users;
    private final DefectRepository defects;
    private final RoadSegmentRepository segments;
    private final AssetRepository assets;
    private final CitizenReportRepository reports;
    private final RepairTeamRepository teams;
    private final MonthlyStatRepository stats;
    private final PasswordEncoder passwords;

    public SeedService(@Value("${roadmap.seed-demo-data}") boolean enabled,
                       @Value("${roadmap.demo-password}") String demoPassword,
                       AppUserRepository users, DefectRepository defects, RoadSegmentRepository segments,
                       AssetRepository assets, CitizenReportRepository reports, RepairTeamRepository teams,
                       MonthlyStatRepository stats, PasswordEncoder passwords) {
        this.enabled = enabled;
        this.demoPassword = demoPassword;
        this.users = users;
        this.defects = defects;
        this.segments = segments;
        this.assets = assets;
        this.reports = reports;
        this.teams = teams;
        this.stats = stats;
        this.passwords = passwords;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) throws Exception {
        if (!enabled) return;
        for (DemoUser d : DEMO_USERS) {
            if (users.findByEmailIgnoreCase(d.email()).isPresent()) continue;
            AppUser u = new AppUser();
            u.setEmail(d.email());
            u.setFullName(d.name());
            u.setRole(d.role());
            u.setScopeLevel(d.level());
            u.setScopeLabel(d.label());
            u.setPasswordHash(passwords.encode(demoPassword));
            users.save(u);
        }
        if (defects.count() > 0) return;

        SeedFile seed;
        JsonMapper mapper = JsonMapper.builder().disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES).build();
        try (InputStream in = new ClassPathResource("seed/seed.json").getInputStream()) {
            seed = mapper.readValue(in, SeedFile.class);
        }
        Duration shift = Duration.between(seed.exportedAt(), Instant.now());

        for (DefectDto s : seed.defects()) {
            Defect d = new Defect();
            d.setId(s.id());
            d.setType(s.type());
            d.setSurface(s.surface());
            d.setSeverity(s.severity());
            d.setStatus(s.status());
            d.setLat(s.position().lat());
            d.setLng(s.position().lng());
            d.setRoadId(s.roadId());
            d.setRoadName(s.roadName());
            d.setDistrict(s.district());
            d.setDimensions(s.dimensions());
            d.setFirstSeen(plus(s.firstSeen(), shift));
            d.setLastSeen(plus(s.lastSeen(), shift));
            d.setObservations(s.observations().stream().map(o -> new Observation(o.id(), plus(o.date(), shift), o.source(),
                    o.confidence(), o.depthCm(), o.imageUrl())).toList());
            d.setCost(s.cost());
            d.setCostAmount(s.cost().amountTnd());
            d.setPriorityScore(s.priority().score());
            d.setPriorityRank(s.priority().rank());
            d.setPriorityFactors(s.priority().factors());
            d.setCitizenReports(s.citizenReports());
            d.setAssignedTeam(s.assignedTeam());
            d.setPlannedDate(plus(s.plannedDate(), shift));
            defects.save(d);
        }
        for (SegmentDto s : seed.segments()) {
            RoadSegment r = new RoadSegment();
            r.setId(s.id());
            r.setRoadId(s.roadId());
            r.setRoadName(s.roadName());
            r.setRoadClass(s.roadClass());
            r.setCoords(s.coords());
            r.setCondition(s.condition());
            r.setDefectIds(s.defectIds());
            r.setLastPass(plus(s.lastPass(), shift));
            segments.save(r);
        }
        for (AssetDto s : seed.assets()) {
            Asset a = new Asset();
            a.setId(s.id());
            a.setType(s.type());
            a.setLat(s.position().lat());
            a.setLng(s.position().lng());
            a.setRoadName(s.roadName());
            a.setLastSeen(plus(s.lastSeen(), shift));
            assets.save(a);
        }
        for (ReportDto s : seed.reports()) {
            CitizenReport r = new CitizenReport();
            r.setId(s.id());
            r.setReceivedAt(plus(s.receivedAt(), shift));
            r.setChannel(s.channel());
            r.setRawText(s.rawText());
            r.setPhoneMasked(s.phoneMasked());
            r.setImageUrl(s.imageUrl());
            r.setExtraction(s.extraction());
            r.setPhotoCheck(s.photoCheck());
            if (s.position() != null) {
                r.setLat(s.position().lat());
                r.setLng(s.position().lng());
            }
            r.setMatchedDefectId(s.matchedDefectId());
            r.setState(s.state());
            reports.save(r);
        }
        for (TeamDto t : seed.teams()) {
            RepairTeam r = new RepairTeam();
            r.setId(t.id());
            r.setName(t.name());
            r.setDistrict(t.district());
            teams.save(r);
        }
        // séries mensuelles : réalignées pour se terminer sur le mois courant
        YearMonth month = YearMonth.now().minusMonths(seed.timeline().size() - 1L);
        for (TimePointDto t : seed.timeline()) {
            MonthlyStat m = new MonthlyStat();
            m.setMonth(month.toString());
            m.setDetected(t.detected());
            m.setRepaired(t.repaired());
            m.setConditionIndex(t.conditionIndex());
            m.setBacklogCostTnd(t.backlogCostTnd());
            stats.save(m);
            month = month.plusMonths(1);
        }
        log.info("Données de démonstration chargées : {} défauts, {} tronçons, {} signalements",
                seed.defects().size(), seed.segments().size(), seed.reports().size());
    }

    private static Instant plus(Instant i, Duration d) {
        return i == null ? null : i.plus(d);
    }
}
