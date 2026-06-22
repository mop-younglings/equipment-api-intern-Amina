using System.Security.Claims;
using EquipmentApi.Enums;
using EquipmentApi.Json;

namespace EquipmentApi.Auth;

public static class ClaimsPrincipalExtensions
{
    public static AuthenticatedUser GetAuthenticatedUser(this ClaimsPrincipal principal)
    {
        var sub = principal.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? principal.FindFirstValue("sub")
            ?? throw new UnauthorizedAccessException("Invalid or expired token");

        var email = principal.FindFirstValue(ClaimTypes.Email)
            ?? principal.FindFirstValue("email")
            ?? throw new UnauthorizedAccessException("Invalid or expired token");

        var roleValue = principal.FindFirstValue("role")
            ?? throw new UnauthorizedAccessException("Invalid or expired token");

        return new AuthenticatedUser
        {
            Id = Guid.Parse(sub),
            Email = email,
            Role = EnumJsonHelper.FromEnumMemberValue<EmployeeRole>(roleValue),
        };
    }
}
