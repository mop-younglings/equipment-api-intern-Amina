using EquipmentApi.Enums;
using Microsoft.AspNetCore.Authorization;

namespace EquipmentApi.Authorization;

public sealed class MinRoleRequirement : IAuthorizationRequirement
{
    public const string PolicyPrefix = "MinRole:";

    public MinRoleRequirement(EmployeeRole minimumRole)
    {
        MinimumRole = minimumRole;
    }

    public EmployeeRole MinimumRole { get; }
}
