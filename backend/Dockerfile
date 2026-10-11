# --- Etapa 1: build ---
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app

# Copiamos primero el pom.xml para aprovechar la cache de dependencias
COPY pom.xml .
RUN mvn dependency:go-offline -B

COPY src ./src
RUN mvn clean package -DskipTests -B

# --- Etapa 2: runtime ---
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

COPY --from=build /app/target/*.jar app.jar

# 8080 en la compu y en Docker; en Render el puerto lo define la variable PORT
EXPOSE 8080

# Memoria de Java pensada para Render gratis (512 MB en total):
# - MaxRAMPercentage=50: el heap puede usar hasta la mitad de la RAM; el resto
#   (unos 220 MB) lo necesita Java para clases, código compilado e hilos.
# - UseSerialGC: el recolector de basura que menos memoria consume.
# - ExitOnOutOfMemoryError: si igual se queda sin memoria, se apaga y Render lo reinicia
#   (en vez de quedar prendido pero sin responder).
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=50", "-XX:+UseSerialGC", "-XX:+ExitOnOutOfMemoryError", "-jar", "app.jar"]