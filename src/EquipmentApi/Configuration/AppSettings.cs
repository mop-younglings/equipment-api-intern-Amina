namespace EquipmentApi.Configuration;

public class AppSettings
{
    public int Port { get; set; } = 3000;
    public string CorsOrigin { get; set; } = "http://localhost:3000";
}
