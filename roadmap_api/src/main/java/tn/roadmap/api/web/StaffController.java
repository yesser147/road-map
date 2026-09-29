package tn.roadmap.api.web;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import tn.roadmap.api.domain.*;
import tn.roadmap.api.repo.AssetRepository;
import tn.roadmap.api.repo.MonthlyStatRepository;
import tn.roadmap.api.repo.RepairTeamRepository;
import tn.roadmap.api.repo.RoadSegmentRepository;
import tn.roadmap.api.service.*;
import tn.roadmap.api.web.Dtos.*;

import java.time.Instant;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import java.util.function.Function;

/** Espace Ministère : endpoints consommés par roadmap_web (src/api/httpApi.ts). Réservé aux profils agents. */
@RestController
@RequestMapping("/api/v1")
public class StaffController {

    private final AuthService auth;
    private final NetworkService network;
    private final ReportService reports;
    private final AssistantService assistant;
    private final RoadSegmentRepository segments;
    private final AssetRepository assets;
    private final RepairTeamRepository teams;
    private final MonthlyStatRepository stats;

    public StaffController(AuthService auth, NetworkService network, ReportService reports, AssistantService assistant,
                           RoadSegmentRepository segments, AssetRepository assets, RepairTeamRepository teams,
                           MonthlyStatRepository stats) {
        this.auth = auth;
        this.network = network;
        this.reports = reports;
        this.assistant = assistant;
        this.segments = segments;
        this.assets = assets;
        this.teams = teams;
        this.stats = stats;
    }

    @GetMapping("/me")
    public UserDto me(Authentication a) {
        return UserDto.of(auth.current(a));
    }

    @GetMapping("/kpis")
    public KpisDto kpis(Authentication a) {
        return network.kpis(auth.current(a));
    }

    @GetMapping("/segments")
    public List<SegmentDto> segments() {
        return segments.findAll().stream().map(SegmentDto::of).toList();
    }

    @GetMapping("/assets")
    public List<AssetDto> assets() {
        return assets.findAll().stream().map(AssetDto::of).toList();
    }

    @GetMapping("/defects")
    public List<DefectDto> defects(Authentication a,
                                   @RequestParam(required = false) List<String> type,
                                   @RequestParam(required = false) List<String> severity,
                                   @RequestParam(required = false) List<String> status,
                                   @RequestParam(required = false) String surface,
                                   @RequestParam(required = false) String district,
                                   @RequestParam(required = false) String q) {
        var f = new NetworkService.Filters(parse(type, DefectType.class, DefectType::of), parse(severity, Severity.class, Severity::of),
                parse(status, DefectStatus.class, DefectStatus::of), surface == null || surface.equals("all") ? null : Surface.of(surface),
                district, q);
        return network.list(auth.current(a), f).stream().map(DefectDto::of).toList();
    }

    @GetMapping("/defects/{id}")
    public DefectDto defect(Authentication a, @PathVariable String id) {
        return DefectDto.of(network.get(auth.current(a), id));
    }

    public record StatusPatch(@NotNull DefectStatus status, String assignedTeam, Instant plannedDate) {
    }

    @PatchMapping("/defects/{id}/status")
    public DefectDto updateStatus(Authentication a, @PathVariable String id, @Valid @RequestBody StatusPatch p) {
        return DefectDto.of(network.updateStatus(auth.current(a), id, p.status(), p.assignedTeam(), p.plannedDate()));
    }

    @GetMapping("/teams")
    public List<TeamDto> teams() {
        return teams.findAll().stream().map(TeamDto::of).toList();
    }

    @GetMapping("/timeline")
    public List<TimePointDto> timeline() {
        return stats.findAllByOrderByMonthAsc().stream().map(TimePointDto::of).toList();
    }

    @GetMapping("/reports")
    public List<ReportDto> reports() {
        return reports.all();
    }

    public record Review(@NotNull ReportState decision, String defectId) {
    }

    @PostMapping("/reports/{id}/review")
    public ReportDto review(@PathVariable String id, @Valid @RequestBody Review r) {
        return reports.review(id, r.decision(), r.defectId());
    }

    public record Question(@NotBlank @Size(max = 500) String question) {
    }

    @PostMapping("/assistant")
    public AssistantAnswer ask(Authentication a, @Valid @RequestBody Question q) {
        return assistant.ask(auth.current(a), q.question());
    }

    private static <E extends Enum<E>> Set<E> parse(List<String> values, Class<E> cls, Function<String, E> of) {
        Set<E> out = EnumSet.noneOf(cls);
        if (values != null) values.forEach(v -> out.add(of.apply(v)));
        return out;
    }
}
