package tn.roadmap.api.domain;

import jakarta.persistence.*;

/** Agrégat mensuel pour le suivi dans le temps (F8). */
@Entity
@Table(name = "monthly_stat")
public class MonthlyStat {
    @Id
    @Column(name = "stat_month", length = 7)
    private String month;

    private int detected;
    private int repaired;
    private double conditionIndex;
    private long backlogCostTnd;

    public String getMonth() {
        return month;
    }

    public void setMonth(String month) {
        this.month = month;
    }

    public int getDetected() {
        return detected;
    }

    public void setDetected(int detected) {
        this.detected = detected;
    }

    public int getRepaired() {
        return repaired;
    }

    public void setRepaired(int repaired) {
        this.repaired = repaired;
    }

    public double getConditionIndex() {
        return conditionIndex;
    }

    public void setConditionIndex(double conditionIndex) {
        this.conditionIndex = conditionIndex;
    }

    public long getBacklogCostTnd() {
        return backlogCostTnd;
    }

    public void setBacklogCostTnd(long backlogCostTnd) {
        this.backlogCostTnd = backlogCostTnd;
    }
}
