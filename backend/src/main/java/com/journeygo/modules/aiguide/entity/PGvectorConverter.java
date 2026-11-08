package com.journeygo.modules.aiguide.entity;

import com.pgvector.PGvector;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import org.postgresql.util.PGobject;

import java.sql.SQLException;

/**
 * AttributeConverter chuyển đổi giữa float[] trong Java và kiểu dữ liệu `vector` trong PostgreSQL.
 * Hỗ trợ an toàn cả PGvector, PGobject và String dạng "[0.123, -0.456, ...]".
 */
@Converter(autoApply = false)
public class PGvectorConverter implements AttributeConverter<float[], Object> {

    @Override
    public PGobject convertToDatabaseColumn(float[] attribute) {
        if (attribute == null) {
            return null;
        }
        return new PGvector(attribute);
    }

    @Override
    public float[] convertToEntityAttribute(Object dbData) {
        if (dbData == null) {
            return null;
        }
        if (dbData instanceof PGvector pgvector) {
            return pgvector.toArray();
        }
        if (dbData instanceof PGobject pgObject) {
            try {
                return new PGvector(pgObject.getValue()).toArray();
            } catch (SQLException e) {
                throw new IllegalArgumentException("Không thể chuyển đổi PGobject sang vector: " + pgObject.getValue(), e);
            }
        }
        if (dbData instanceof String str) {
            try {
                return new PGvector(str).toArray();
            } catch (SQLException e) {
                throw new IllegalArgumentException("Không thể parse chuỗi vector: " + str, e);
            }
        }
        throw new IllegalArgumentException("Kiểu dữ liệu vector không được hỗ trợ: " + dbData.getClass().getName());
    }
}

