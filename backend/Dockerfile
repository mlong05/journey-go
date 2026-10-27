# ========================================================
# Stage 1: Build the Spring Boot application with Maven
# ========================================================
FROM maven:3.9-eclipse-temurin-21-alpine AS builder

WORKDIR /build

# 1. Tận dụng Docker layer caching: Copy pom.xml và tải dependencies trước
COPY pom.xml .
RUN mvn dependency:go-offline -B

# 2. Copy toàn bộ source code và build file .jar (bỏ qua unit tests khi đóng gói image)
COPY src ./src
RUN mvn clean package -DskipTests

# ========================================================
# Stage 2: Runtime Image nhẹ với JRE 21 Alpine (~200MB)
# ========================================================
FROM eclipse-temurin:21-jre-alpine AS runner

WORKDIR /app

# Tạo non-root user để tăng cường bảo mật
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Copy file jar đã build từ builder stage
COPY --from=builder --chown=appuser:appgroup /build/target/*.jar app.jar

# Mở cổng 8088 cho Spring Boot
EXPOSE 8088

# Cấu hình tối ưu bộ nhớ JVM và Virtual Threads
ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -Dfile.encoding=UTF-8"

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
