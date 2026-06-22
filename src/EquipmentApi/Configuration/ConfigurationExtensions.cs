namespace EquipmentApi.Configuration;

public static class ConfigurationExtensions
{
    public static DatabaseSettings GetDatabaseSettings(this IConfiguration configuration)
    {
        return new DatabaseSettings
        {
            Host = configuration["DB_HOST"] ?? "localhost",
            Port = int.Parse(configuration["DB_PORT"] ?? "5433"),
            Username = configuration["DB_USERNAME"] ?? "equipment",
            Password = configuration["DB_PASSWORD"] ?? "equipment",
            Database = configuration["DB_NAME"] ?? "equipment_api",
            RunMigrations = ParseBool(configuration["RUN_MIGRATIONS"], defaultValue: true),
        };
    }

    public static AuthSettings GetAuthSettings(this IConfiguration configuration)
    {
        return new AuthSettings
        {
            JwtSecret = configuration["JWT_SECRET"] ?? "dev-secret-change-in-production",
            JwtExpiresIn = configuration["JWT_EXPIRES_IN"] ?? "15m",
            JwtRefreshExpiresIn = configuration["JWT_REFRESH_EXPIRES_IN"] ?? "7d",
        };
    }

    public static AppSettings GetAppSettings(this IConfiguration configuration)
    {
        return new AppSettings
        {
            Port = int.Parse(configuration["PORT"] ?? "3000"),
            CorsOrigin = configuration["CORS_ORIGIN"] ?? "http://localhost:3000",
        };
    }

    private static bool ParseBool(string? value, bool defaultValue)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return defaultValue;
        }

        return value.Equals("true", StringComparison.OrdinalIgnoreCase)
            || value == "1";
    }
}
