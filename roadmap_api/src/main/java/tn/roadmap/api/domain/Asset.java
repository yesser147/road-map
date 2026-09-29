package tn.roadmap.api.domain;

import jakarta.persistence.*;

import java.time.Instant;

/** Objet détecté qui n'est pas un défaut (plaque d'égout intacte, WP2 is_defect=false). */
@Entity
@Table(name = "asset")
public class Asset {
    @Id
    @Column(length = 20)
    private String id;

    @Column(length = 30)
    private String type;

    private double lat;
    private double lng;

    @Column(length = 160)
    private String roadName;

    private Instant lastSeen;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
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

    public String getRoadName() {
        return roadName;
    }

    public void setRoadName(String roadName) {
        this.roadName = roadName;
    }

    public Instant getLastSeen() {
        return lastSeen;
    }

    public void setLastSeen(Instant lastSeen) {
        this.lastSeen = lastSeen;
    }
}
