using System.Runtime.Serialization;
using System.Text.Json.Serialization;
using NpgsqlTypes;

namespace EquipmentApi.Enums;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum ApprovalRole
{
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
