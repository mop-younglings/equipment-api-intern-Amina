using System.Text.Json.Serialization;

namespace EquipmentApi.Entities;

public class RefreshToken
{
    public Guid Id { get; set; }
    public Guid EmployeeId { get; set; }

    [JsonIgnore]
    public Employee Employee { get; set; } = null!;

    [JsonIgnore]
    public string TokenHash { get; set; } = string.Empty;

    public DateTime ExpiresAt { get; set; }
    public DateTime? RevokedAt { get; set; }
    public DateTime CreatedAt { get; set; }
}
