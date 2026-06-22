using System.Runtime.Serialization;
using System.Text.Json.Serialization;
using NpgsqlTypes;

namespace EquipmentApi.Enums;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum EmployeeRole
{
    [EnumMember(Value = "employee")]
    [PgName("employee")]
    Employee,

    [EnumMember(Value = "direct_manager")]
    [PgName("direct_manager")]
    DirectManager,

    [EnumMember(Value = "procurement_manager")]
    [PgName("procurement_manager")]
    ProcurementManager,

    [EnumMember(Value = "admin")]
    [PgName("admin")]
    Admin,
}

public static class EmployeeRoleExtensions
{
    private static readonly Dictionary<EmployeeRole, int> Hierarchy = new()
    {
        [EmployeeRole.Employee] = 1,
        [EmployeeRole.DirectManager] = 2,
        [EmployeeRole.ProcurementManager] = 3,
        [EmployeeRole.Admin] = 4,
    };

    public static bool HasMinimumRole(EmployeeRole userRole, EmployeeRole requiredRole) =>
        Hierarchy[userRole] >= Hierarchy[requiredRole];
}
