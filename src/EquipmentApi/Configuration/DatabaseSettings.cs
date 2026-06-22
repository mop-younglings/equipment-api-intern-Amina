namespace EquipmentApi.Configuration;

public class DatabaseSettings
{
    public string Host { get; set; } = "localhost";
    public int Port { get; set; } = 5433;
    public string Username { get; set; } = "equipment";
    public string Password { get; set; } = "equipment";
    public string Database { get; set; } = "equipment_api";
    public bool RunMigrations { get; set; } = true;

    public string ConnectionString =>
        $"Host={Host};Port={Port};Username={Username};Password={Password};Database={Database}";
}
