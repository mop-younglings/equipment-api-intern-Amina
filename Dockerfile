FROM mcr.microsoft.com/dotnet/sdk:8.0-alpine AS build

WORKDIR /src

COPY EquipmentApi.sln ./
COPY src/EquipmentApi/EquipmentApi.csproj src/EquipmentApi/
COPY database/sql/ database/sql/

RUN dotnet restore src/EquipmentApi/EquipmentApi.csproj

COPY src/EquipmentApi/ src/EquipmentApi/
RUN dotnet publish src/EquipmentApi/EquipmentApi.csproj -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0-alpine AS production

WORKDIR /app

RUN apk add --no-cache curl

COPY --from=build /app/publish ./
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh && chown -R app:app /app

USER app

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD curl -fsS http://127.0.0.1:3000/api-json >/dev/null || exit 1

ENTRYPOINT ["/entrypoint.sh"]
