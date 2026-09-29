package tn.roadmap.api.domain;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.List;

/** Tronçon de voie (~140 m) et son état. Géométrie : liste [lat, lng] (LineString PostGIS en production). */
@Entity
@Table(name = "road_segment")
public class RoadSegment {
    @Id
    @Column(length = 40)
    private String id;

    @Column(length = 40)
    private String roadId;

    @Column(length = 160)
    private String roadName;

    @Column(length = 30)
    private String roadClass;

    @Convert(converter = JsonColumns.Coords.class)
    @Column(columnDefinition = "TEXT")
    private List<List<Double>> coords;

    @Enumerated(EnumType.STRING)
    @Column(name = "segment_condition", length = 20)
    private SegmentCondition condition;

    @Convert(converter = JsonColumns.StringList.class)
    @Column(columnDefinition = "TEXT")
    private List<String> defectIds;

    private Instant lastPass;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
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

    public String getRoadClass() {
        return roadClass;
    }

    public void setRoadClass(String roadClass) {
        this.roadClass = roadClass;
    }

    public List<List<Double>> getCoords() {
        return coords;
    }

    public void setCoords(List<List<Double>> coords) {
        this.coords = coords;
    }

    public SegmentCondition getCondition() {
        return condition;
    }

    public void setCondition(SegmentCondition condition) {
        this.condition = condition;
    }

    public List<String> getDefectIds() {
        return defectIds;
    }

    public void setDefectIds(List<String> defectIds) {
        this.defectIds = defectIds;
    }

    public Instant getLastPass() {
        return lastPass;
    }

    public void setLastPass(Instant lastPass) {
        this.lastPass = lastPass;
    }
}
