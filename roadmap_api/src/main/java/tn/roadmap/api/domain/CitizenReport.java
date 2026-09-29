package tn.roadmap.api.domain;

import jakarta.persistence.*;

import java.time.Instant;

/** Signalement citoyen (SMS interprété par WP3 ou photo filtrée par WP2), en attente de validation F10. */
@Entity
@Table(name = "citizen_report")
public class CitizenReport {
    @Id
    @Column(length = 20)
    private String id;

    private Instant receivedAt;

    @Enumerated(EnumType.STRING)
    @Column(length = 10)
    private ReportChannel channel;

    @Column(length = 1000)
    private String rawText;

    @Column(length = 1000)
    private String description;

    @Column(length = 30)
    private String phoneMasked;

    @Column(length = 300)
    private String imageUrl;

    @Convert(converter = JsonColumns.Extraction.class)
    @Column(columnDefinition = "TEXT")
    private Values.Extraction extraction;

    @Convert(converter = JsonColumns.PhotoCheck.class)
    @Column(columnDefinition = "TEXT")
    private Values.PhotoCheck photoCheck;

    private Double lat;
    private Double lng;

    @Column(length = 20)
    private String matchedDefectId;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private ReportState state;

    /** Auteur (null pour les SMS et les données de démonstration). */
    private Long authorId;

    /** Empreinte SHA-256 de la photo : refuse qu'un même compte envoie deux fois la même image. */
    @Column(length = 64)
    private String photoHash;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public Instant getReceivedAt() {
        return receivedAt;
    }

    public void setReceivedAt(Instant receivedAt) {
        this.receivedAt = receivedAt;
    }

    public ReportChannel getChannel() {
        return channel;
    }

    public void setChannel(ReportChannel channel) {
        this.channel = channel;
    }

    public String getRawText() {
        return rawText;
    }

    public void setRawText(String rawText) {
        this.rawText = rawText;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getPhoneMasked() {
        return phoneMasked;
    }

    public void setPhoneMasked(String phoneMasked) {
        this.phoneMasked = phoneMasked;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }

    public Values.Extraction getExtraction() {
        return extraction;
    }

    public void setExtraction(Values.Extraction extraction) {
        this.extraction = extraction;
    }

    public Values.PhotoCheck getPhotoCheck() {
        return photoCheck;
    }

    public void setPhotoCheck(Values.PhotoCheck photoCheck) {
        this.photoCheck = photoCheck;
    }

    public Double getLat() {
        return lat;
    }

    public void setLat(Double lat) {
        this.lat = lat;
    }

    public Double getLng() {
        return lng;
    }

    public void setLng(Double lng) {
        this.lng = lng;
    }

    public String getMatchedDefectId() {
        return matchedDefectId;
    }

    public void setMatchedDefectId(String matchedDefectId) {
        this.matchedDefectId = matchedDefectId;
    }

    public ReportState getState() {
        return state;
    }

    public void setState(ReportState state) {
        this.state = state;
    }

    public Long getAuthorId() {
        return authorId;
    }

    public void setAuthorId(Long authorId) {
        this.authorId = authorId;
    }

    public String getPhotoHash() {
        return photoHash;
    }

    public void setPhotoHash(String photoHash) {
        this.photoHash = photoHash;
    }
}
