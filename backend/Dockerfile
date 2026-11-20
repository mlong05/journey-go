# =====================================================================================
#  Backend — Spring Boot 3.3 / JDK 21
#  Multi-stage: build bằng Maven, chạy bằng JRE Alpine (~200MB image cuối).
# =====================================================================================

# ── Stage 1: build ──────────────────────────────────────────────────────────────
FROM maven:3.9-eclipse-temurin-21-alpine AS builder

WORKDIR /build

# Tận dụng Docker layer caching: copy pom.xml trước, tải dependencies riêng.
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy source rồi build (bỏ qua unit tests — CI đã chạy test).
COPY src ./src
RUN mvn clean package -DskipTests -B

# ── Stage 2: runtime ────────────────────────────────────────────────────────────
FROM eclipse-temurin:21-jre-alpine AS runner

WORKDIR /app

# BusyBox wget có sẵn trong alpine ⇒ dùng cho healthcheck, không cần cài thêm.
# Tạo non-root user để tăng cường bảo mật.
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy file jar đã build từ builder stage.
COPY --from=builder --chown=appuser:appgroup /build/target/*.jar app.jar

USER appuser

EXPOSE 8088

# ── JVM: tự động theo giới hạn RAM của container ───────────────────────────────
# -XX:MaxRAMPercentage=75 ⇒ dùng tối đa 75% RAM được cấp cho container.
# -XX:+UseContainerSupport ⇒ JVM nhận biết giới hạn cgroup (Docker).
# -Djava.security.egd=file:/dev/./urandom ⇒ tránh bị treo khi khởi tạo RNG.
ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -XX:+UseG1GC \
    -XX:MaxGCPauseMillis=200 -Dfile.encoding=UTF-8 -Djava.security.egd=file:/dev/./urandom"

# Healthcheck: actuator liveness (không cần auth — SecurityConfig permit /actuator/**).
HEALTHCHECK --interval=15s --timeout=5s --start-period=60s --retries=10 \
    CMD wget -qO- http://127.0.0.1:8088/actuator/health/liveness || exit 1

ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar app.jar"]
