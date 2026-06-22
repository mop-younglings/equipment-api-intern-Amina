using EquipmentApi.Enums;
using Microsoft.AspNetCore.Authorization;

namespace EquipmentApi.Authorization;

[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = true)]
public sealed class MinRoleAttribute : AuthorizeAttribute
{
    public MinRoleAttribute(EmployeeRole minimumRole)
    {
        Policy = $"{MinRoleRequirement.PolicyPrefix}{minimumRole}";
    }
}
