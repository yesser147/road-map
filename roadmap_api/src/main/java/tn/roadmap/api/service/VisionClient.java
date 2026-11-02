package tn.roadmap.api.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.web.client.RestClient;
import tn.roadmap.api.domain.DefectType;
import tn.roadmap.api.domain.Severity;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.time.Duration;
import java.util.Map;

/**
 * Client du service vision WP2 (wp2_vision, POST /v1/detect, format DetectionEvent v1).
 * Photo citoyenne -> filtre qualité (flou, sombre, "pas une route") + détection du type de défaut.
 */
@Component
public class VisionClient {

    private static final Logger log = LoggerFactory.getLogger(VisionClient.class);

    /** Taxonomie WP2 (configs/classes.yaml) -> types du contrat. Les plaques intactes ne sont pas des défauts. */
    private static final Map<String, DefectType> CLASS_MAP = Map.of(
            "pothole", DefectType.NID_DE_POULE,
            "longitudinal_crack", DefectType.FISSURE_LONGITUDINALE,
            "transverse_crack", DefectType.FISSURE_TRANSVERSALE,
            "alligator_crack", DefectType.FAIENCAGE);

    private static final Map<String, String> REASONS = Map.of(
            "blurry", "Photo floue", "too_dark", "Photo trop sombre",
            "not_road", "Ne montre pas une voie", "too_small", "Image trop petite");

    public record Result(boolean analyzed, boolean accepted, String reason, double blurScore, double roadScore,
                         DefectType type, Severity severity, double confidence,
                         Double depthCm, Double lengthM, Double widthM, String measureMethod, Double uncertaintyPct) {
        static Result unavailable() {
            return new Result(false, true, null, 0, 0, null, null, 0, null, null, null, null, null);
        }
    }

    private static final JsonMapper JSON = JsonMapper.builder().build();

    private final RestClient http;
    private final boolean enabled;

    public VisionClient(@Value("${roadmap.vision-url:}") String url) {
        this.enabled = url != null && !url.isBlank();
        SimpleClientHttpRequestFactory f = new SimpleClientHttpRequestFactory();
        f.setConnectTimeout(Duration.ofSeconds(2));
        f.setReadTimeout(Duration.ofSeconds(25)); // au-delà, la photo est acceptée sans analyse (le citoyen n'attend pas)
        this.http = RestClient.builder().baseUrl(enabled ? url : "http://localhost").requestFactory(f).build();
    }

    /** Ce que le téléphone sait de la prise de vue (tout facultatif) : focale EXIF et inclinaison. */
    public record CameraMeta(Double focal35, Double focalMm, Double tiltBeta, Double tiltGamma, String capture, Double camHeightM) {
        public static final CameraMeta NONE = new CameraMeta(null, null, null, null, null, null);
    }

    public Result analyze(byte[] image, String filename, Double lat, Double lng) {
        return analyze(image, filename, lat, lng, CameraMeta.NONE);
    }

    public Result analyze(byte[] image, String filename, Double lat, Double lng, CameraMeta cam) {
        if (!enabled) return Result.unavailable();
        try {
            var form = new LinkedMultiValueMap<String, Object>();
            form.add("file", new ByteArrayResource(image) {
                @Override
                public String getFilename() {
                    return filename == null ? "photo.jpg" : filename;
                }
            });
            form.add("source", "citizen");
            form.add("with_embedding", "false");
            form.add("with_depth", "true"); // profondeur (nids-de-poule) et dimensions estimées
            if (lat != null && lng != null) {
                form.add("lat", lat.toString());
                form.add("lon", lng.toString());
            }
            if (cam != null) { // permet au service de vision de mesurer en centimètres sans calibration
                if (cam.focal35() != null) form.add("focal_35mm", cam.focal35().toString());
                if (cam.focalMm() != null) form.add("focal_mm", cam.focalMm().toString());
                if (cam.tiltBeta() != null) form.add("tilt_beta", cam.tiltBeta().toString());
                if (cam.tiltGamma() != null) form.add("tilt_gamma", cam.tiltGamma().toString());
                if (cam.capture() != null) form.add("capture", cam.capture());
                if (cam.camHeightM() != null) form.add("cam_height_m", cam.camHeightM().toString());
            }
            String body = http.post().uri("/v1/detect").contentType(MediaType.MULTIPART_FORM_DATA).body(form)
                    .retrieve().body(String.class);
            JsonNode ev = body == null ? null : JSON.readTree(body);
            if (ev == null) return Result.unavailable();

            JsonNode q = ev.path("quality");
            boolean accepted = ev.path("accepted").asBoolean(true);
            String reason = ev.path("rejection_reason").isNull() ? null : REASONS.getOrDefault(ev.path("rejection_reason").asString(), "Photo non exploitable");
            DefectType type = null;
            Severity severity = null;
            double conf = 0;
            Double depth = null, length = null, width = null, uncertainty = null;
            String method = null;
            for (JsonNode d : ev.path("detections")) {
                DefectType t = CLASS_MAP.get(d.path("class_name").asString());
                if (t != null && d.path("confidence").asDouble() > conf) {
                    type = t;
                    conf = d.path("confidence").asDouble();
                    depth = num(d, "depth_cm");
                    length = num(d, "length_m");
                    width = num(d, "width_m");
                    method = d.path("measure_method").isString() ? d.path("measure_method").asString() : null;
                    uncertainty = num(d, "size_uncertainty_pct");
                    severity = switch (d.path("severity").asString()) {
                        case "high" -> Severity.ELEVEE;
                        case "medium" -> Severity.MOYENNE;
                        default -> Severity.FAIBLE;
                    };
                }
            }
            return new Result(true, accepted, reason, q.path("blur_score").asDouble(), q.path("road_score").asDouble(0),
                    type, severity, conf, depth, length, width, method, uncertainty);
        } catch (Exception e) {
            log.warn("Service vision indisponible ({}), photo acceptée sans analyse", e.getMessage());
            return Result.unavailable();
        }
    }

    private static Double num(JsonNode n, String field) {
        JsonNode v = n.path(field);
        return v.isNumber() ? v.asDouble() : null;
    }
}
