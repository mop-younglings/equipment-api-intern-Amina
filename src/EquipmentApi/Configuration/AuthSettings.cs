namespace EquipmentApi.Configuration;

public class AuthSettings
{
    public string JwtSecret { get; set; } = "dev-secret-change-in-production";
    public string JwtExpiresIn { get; set; } = "15m";
    public string JwtRefreshExpiresIn { get; set; } = "7d";
}
