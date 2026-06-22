using EquipmentApi.Enums;

namespace EquipmentApi.Auth;

public class AuthJwtPayload
{
    public Guid Sub { get; set; }
    public string Email { get; set; } = string.Empty;
    public EmployeeRole Role { get; set; }
}
