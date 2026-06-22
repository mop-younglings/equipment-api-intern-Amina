using EquipmentApi.Enums;

namespace EquipmentApi.Auth;

public class AuthenticatedUser
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public EmployeeRole Role { get; set; }
}
