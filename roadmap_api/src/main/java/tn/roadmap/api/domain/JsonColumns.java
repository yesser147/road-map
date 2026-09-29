package tn.roadmap.api.domain;

import jakarta.persistence.AttributeConverter;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.json.JsonMapper;

import java.util.List;

/**
 * Convertisseurs JPA "objet <-> texte JSON" pour les valeurs imbriquées.
 * Portables (H2, PostgreSQL) : colonnes TEXT, sans dépendre d'un type JSON propre au SGBD.
 */
public final class JsonColumns {
    private JsonColumns() {
    }

    static final JsonMapper MAPPER = JsonMapper.builder().build();

    abstract static class Base<T> implements AttributeConverter<T, String> {
        private final TypeReference<T> type;

        Base(TypeReference<T> type) {
            this.type = type;
        }

        @Override
        public String convertToDatabaseColumn(T value) {
            return value == null ? null : MAPPER.writeValueAsString(value);
        }

        @Override
        public T convertToEntityAttribute(String json) {
            return json == null || json.isBlank() ? null : MAPPER.readValue(json, type);
        }
    }

    public static class ObservationList extends Base<List<Values.Observation>> {
        public ObservationList() {
            super(new TypeReference<>() {
            });
        }
    }

    public static class FactorList extends Base<List<Values.PriorityFactor>> {
        public FactorList() {
            super(new TypeReference<>() {
            });
        }
    }

    public static class Dimensions extends Base<Values.Dimensions> {
        public Dimensions() {
            super(new TypeReference<>() {
            });
        }
    }

    public static class Cost extends Base<Values.CostEstimate> {
        public Cost() {
            super(new TypeReference<>() {
            });
        }
    }

    public static class Coords extends Base<List<List<Double>>> {
        public Coords() {
            super(new TypeReference<>() {
            });
        }
    }

    public static class StringList extends Base<List<String>> {
        public StringList() {
            super(new TypeReference<>() {
            });
        }
    }

    public static class Extraction extends Base<Values.Extraction> {
        public Extraction() {
            super(new TypeReference<>() {
            });
        }
    }

    public static class PhotoCheck extends Base<Values.PhotoCheck> {
        public PhotoCheck() {
            super(new TypeReference<>() {
            });
        }
    }
}
