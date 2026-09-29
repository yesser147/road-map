package tn.roadmap.api.domain;

import jakarta.persistence.*;

/** Équipe d'intervention. */
@Entity
@Table(name = "repair_team")
public class RepairTeam {
    @Id
    @Column(length = 20)
    private String id;

    @Column(length = 80)
    private String name;

    @Column(length = 80)
    private String district;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDistrict() {
        return district;
    }

    public void setDistrict(String district) {
        this.district = district;
    }
}
