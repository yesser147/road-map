package tn.roadmap.api.domain;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.List;

/** Défaut consolidé : plusieurs observations (passages, signalements) regroupées en une seule entité. */
@Entity
@Table(name = "defect")
public class Defect {
    @Id
    @Column(length = 20)
    private String id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private DefectType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Surface surface;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Severity severity;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private DefectStatus status;

    private double lat;
    private double lng;

    @Column(length = 40)
    private String roadId;

    @Column(length = 160)
    private String roadName;

    @Column(length = 80)
    private String district;

    @Convert(converter = JsonColumns.Dimensions.class)
    @Column(columnDefinition = "TEXT")
    private Values.Dimensions dimensions;

    private Instant firstSeen;
    private Instant lastSeen;

    @Convert(converter = JsonColumns.ObservationList.class)
    @Column(columnDefinition = "TEXT")
    private List<Values.Observation> observations;

    @Convert(converter = JsonColumns.Cost.class)
    @Column(columnDefinition = "TEXT")
    private Values.CostEstimate cost;

    /** Copie du montant pour trier / sommer en SQL. */
    private double costAmount;

    private int priorityScore;
    private int priorityRank;

    @Convert(converter = JsonColumns.FactorList.class)
    @Column(columnDefinition = "TEXT")
    private List<Values.PriorityFactor> priorityFactors;

    private int citizenReports;

    @Column(length = 80)
    private String assignedTeam;

    private Instant plannedDate;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public DefectType getType() {
        return type;
    }

    public void setType(DefectType type) {
        this.type = type;
    }

    public Surface getSurface() {
        return surface;
    }

    public void setSurface(Surface surface) {
        this.surface = surface;
    }

    public Severity getSeverity() {
        return severity;
    }

    public void setSeverity(Severity severity) {
        this.severity = severity;
    }

    public DefectStatus getStatus() {
        return status;
    }

    public void setStatus(DefectStatus status) {
        this.status = status;
    }

    public double getLat() {
        return lat;
    }

    public void setLat(double lat) {
        this.lat = lat;
    }

    public double getLng() {
        return lng;
    }

    public void setLng(double lng) {
        this.lng = lng;
    }

    public String getRoadId() {
        return roadId;
    }

    public void setRoadId(String roadId) {
        this.roadId = roadId;
    }

    public String getRoadName() {
        return roadName;
    }

    public void setRoadName(String roadName) {
        this.roadName = roadName;
    }

    public String getDistrict() {
        return district;
    }

    public void setDistrict(String district) {
        this.district = district;
    }

    public Values.Dimensions getDimensions() {
        return dimensions;
    }

    public void setDimensions(Values.Dimensions dimensions) {
        this.dimensions = dimensions;
    }

    public Instant getFirstSeen() {
        return firstSeen;
    }

    public void setFirstSeen(Instant firstSeen) {
        this.firstSeen = firstSeen;
    }

    public Instant getLastSeen() {
        return lastSeen;
    }

    public void setLastSeen(Instant lastSeen) {
        this.lastSeen = lastSeen;
    }

    public List<Values.Observation> getObservations() {
        return observations;
    }

    public void setObservations(List<Values.Observation> observations) {
        this.observations = observations;
    }

    public Values.CostEstimate getCost() {
        return cost;
    }

    public void setCost(Values.CostEstimate cost) {
        this.cost = cost;
    }

    public double getCostAmount() {
        return costAmount;
    }

    public void setCostAmount(double costAmount) {
        this.costAmount = costAmount;
    }

    public int getPriorityScore() {
        return priorityScore;
    }

    public void setPriorityScore(int priorityScore) {
        this.priorityScore = priorityScore;
    }

    public int getPriorityRank() {
        return priorityRank;
    }

    public void setPriorityRank(int priorityRank) {
        this.priorityRank = priorityRank;
    }

    public List<Values.PriorityFactor> getPriorityFactors() {
        return priorityFactors;
    }

    public void setPriorityFactors(List<Values.PriorityFactor> priorityFactors) {
        this.priorityFactors = priorityFactors;
    }

    public int getCitizenReports() {
        return citizenReports;
    }

    public void setCitizenReports(int citizenReports) {
        this.citizenReports = citizenReports;
    }

    public String getAssignedTeam() {
        return assignedTeam;
    }

    public void setAssignedTeam(String assignedTeam) {
        this.assignedTeam = assignedTeam;
    }

    public Instant getPlannedDate() {
        return plannedDate;
    }

    public void setPlannedDate(Instant plannedDate) {
        this.plannedDate = plannedDate;
    }
}
