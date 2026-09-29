package tn.roadmap.api.web;

import com.fasterxml.jackson.annotation.JsonInclude;
import tn.roadmap.api.domain.*;
import tn.roadmap.api.domain.Values.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * Formes JSON de l'API = types du front (roadmap_web/src/types/domain.ts).
 * Toute modification ici doit être répercutée côté front.
 */
public final class Dtos {
    private Dtos() {
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record DefectDto(String id, DefectType type, Surface surface, Severity severity, DefectStatus status,
                            LatLng position, String roadId, String roadName, String district, Dimensions dimensions,
                            Instant firstSeen, Instant lastSeen, List<Observation> observations, CostEstimate cost,
                            Priority priority, int citizenReports, String assignedTeam, Instant plannedDate) {
        public static DefectDto of(Defect d) {
            return new DefectDto(d.getId(), d.getType(), d.getSurface(), d.getSeverity(), d.getStatus(),
                    new LatLng(d.getLat(), d.getLng()), d.getRoadId(), d.getRoadName(), d.getDistrict(), d.getDimensions(),
                    d.getFirstSeen(), d.getLastSeen(), d.getObservations(), d.getCost(),
                    new Priority(d.getPriorityScore(), d.getPriorityRank(), d.getPriorityFactors()),
                    d.getCitizenReports(), d.getAssignedTeam(), d.getPlannedDate());
        }
    }

    public record SegmentDto(String id, String roadId, String roadName, String roadClass, List<List<Double>> coords,
                             SegmentCondition condition, List<String> defectIds, Instant lastPass) {
        public static SegmentDto of(RoadSegment s) {
            return new SegmentDto(s.getId(), s.getRoadId(), s.getRoadName(), s.getRoadClass(), s.getCoords(),
                    s.getCondition(), s.getDefectIds(), s.getLastPass());
        }
    }

    public record AssetDto(String id, String type, LatLng position, String roadName, Instant lastSeen) {
        public static AssetDto of(Asset a) {
            return new AssetDto(a.getId(), a.getType(), new LatLng(a.getLat(), a.getLng()), a.getRoadName(), a.getLastSeen());
        }
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record ReportDto(String id, Instant receivedAt, ReportChannel channel, String rawText, String description,
                            String phoneMasked, String imageUrl, Extraction extraction, PhotoCheck photoCheck,
                            LatLng position, String matchedDefectId, ReportState state) {
        public static ReportDto of(CitizenReport r) {
            return new ReportDto(r.getId(), r.getReceivedAt(), r.getChannel(), r.getRawText(), r.getDescription(),
                    r.getPhoneMasked(), r.getImageUrl(), r.getExtraction(), r.getPhotoCheck(),
                    r.getLat() == null ? null : new LatLng(r.getLat(), r.getLng()), r.getMatchedDefectId(), r.getState());
        }
    }

    /** Vue citoyenne d'un signalement : état lisible + avancement de la réparation liée. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record MyReportDto(ReportDto report, String progress, String progressLabel, DefectStatus defectStatus) {
    }

    public record TeamDto(String id, String name, String district) {
        public static TeamDto of(RepairTeam t) {
            return new TeamDto(t.getId(), t.getName(), t.getDistrict());
        }
    }

    public record TimePointDto(String month, int detected, int repaired, double conditionIndex, long backlogCostTnd) {
        public static TimePointDto of(MonthlyStat m) {
            return new TimePointDto(m.getMonth(), m.getDetected(), m.getRepaired(), m.getConditionIndex(), m.getBacklogCostTnd());
        }
    }

    public record KpisDto(double networkKm, double coveredKm, int activeDefects, int criticalDefects, double backlogCostTnd,
                          int repairedLast30d, double meanRepairDays, int pendingReports, int conditionIndex) {
    }

    public record Scope(String level, String label) {
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record UserDto(String id, String name, String email, Role role, Scope scope) {
        public static UserDto of(AppUser u) {
            return new UserDto(String.valueOf(u.getId()), u.getFullName(), u.getEmail(), u.getRole(),
                    u.getRole().isStaff() ? new Scope(u.getScopeLevel(), u.getScopeLabel()) : null);
        }
    }

    public record AuthResponse(String token, Instant expiresAt, UserDto user) {
    }

    public record FunctionCall(String name, Map<String, Object> args) {
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record AssistantAnswer(String text, List<FunctionCall> calls, List<DefectDto> defects) {
    }
}
