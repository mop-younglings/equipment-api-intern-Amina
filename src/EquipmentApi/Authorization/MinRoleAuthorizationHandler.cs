using EquipmentApi.Enums;
using EquipmentApi.Json;
using Microsoft.AspNetCore.Authorization;

namespace EquipmentApi.Authorization;

public sealed class MinRoleAuthorizationHandler : AuthorizationHandler<MinRoleRequirement>
{
    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        MinRoleRequirement requirement)
    {
        var roleClaim = context.User.FindFirst("role")?.Value;
        if (roleClaim is null)
        {
            return Task.CompletedTask;
        }

        var userRole = EnumJsonHelper.FromEnumMemberValue<EmployeeRole>(roleClaim);
        if (EmployeeRoleExtensions.HasMinimumRole(userRole, requirement.MinimumRole))
        {
            context.Succeed(requirement);
        }

        return Task.CompletedTask;
    }
}
