package tn.roadmap.api.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.time.Duration;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Adresse lisible d'une position GPS (géocodage inverse OpenStreetMap / Nominatim), utilisée quand la position
 * est hors des voies connues de la zone pilote. Politique Nominatim : 1 requête/s max, User-Agent identifiant,
 * résultats mis en cache. En production : instance Nominatim hébergée par le projet (roadmap.geocoding-url).
 */
@Component
public class GeocodingClient {

    private static final Logger log = LoggerFactory.getLogger(GeocodingClient.class);
    private static final JsonMapper JSON = JsonMapper.builder().build();

    private final RestClient http;
    private final boolean enabled;
    private final Map<String, String> cache = new ConcurrentHashMap<>();
    private long lastCall = 0;

    public GeocodingClient(@Value("${roadmap.geocoding-url:}") String url) {
        this.enabled = url != null && !url.isBlank();
        SimpleClientHttpRequestFactory f = new SimpleClientHttpRequestFactory();
        f.setConnectTimeout(Duration.ofSeconds(3));
        f.setReadTimeout(Duration.ofSeconds(4));
        this.http = RestClient.builder().baseUrl(enabled ? url : "http://localhost").requestFactory(f)
                .defaultHeader("User-Agent", "RoadMap-pilote/0.1 (projet Road Map, Ministere de l'Equipement)")
                .build();
    }

    /** « Rue …, Quartier » ou null si le service ne répond pas. */
    public String address(double lat, double lng) {
        if (!enabled) return null;
        String key = String.format(Locale.ROOT, "%.4f,%.4f", lat, lng); // ~10 m
        String hit = cache.get(key);
        if (hit != null) return hit;
        try {
            synchronized (this) { // 1 requête par seconde au plus
                long wait = 1000 - (System.currentTimeMillis() - lastCall);
                if (wait > 0) Thread.sleep(wait);
                lastCall = System.currentTimeMillis();
            }
            String body = http.get().uri(u -> u.path("/reverse").queryParam("format", "jsonv2").queryParam("zoom", 17)
                            .queryParam("addressdetails", 1).queryParam("accept-language", "fr")
                            .queryParam("lat", lat).queryParam("lon", lng).build())
                    .retrieve().body(String.class);
            JsonNode root = JSON.readTree(body);
            JsonNode a = root.path("address");
            // En Tunisie beaucoup de voies n'ont pas de nom dans OSM : secteur (county) et délégation en repli
            String road = first(a, "road", "pedestrian", "footway", "path", "neighbourhood", "quarter");
            if (road == null) road = first(root, "name");
            String area = first(a, "suburb", "city_district", "village", "town", "city", "municipality", "county");
            String region = first(a, "state_district");
            String label;
            if (road != null) label = area != null && !road.equals(area) ? road + ", " + area : road;
            else if (area != null) label = region != null ? area + ", " + region : area;
            else label = region;
            if (label == null) {
                String[] parts = root.path("display_name").asString("").split(",\\s*");
                label = parts.length >= 2 ? parts[0] + ", " + parts[1] : parts.length == 1 && !parts[0].isBlank() ? parts[0] : null;
            }
            if (label != null) cache.put(key, label);
            return label;
        } catch (Exception e) {
            log.warn("Géocodage inverse indisponible ({})", e.getMessage());
            return null;
        }
    }

    public static String coordinates(double lat, double lng) {
        return String.format(Locale.ROOT, "Position GPS %.5f, %.5f", lat, lng);
    }

    private static String first(JsonNode a, String... keys) {
        for (String k : keys) {
            String v = a.path(k).asString(null);
            if (v != null && !v.isBlank()) return v;
        }
        return null;
    }
}
