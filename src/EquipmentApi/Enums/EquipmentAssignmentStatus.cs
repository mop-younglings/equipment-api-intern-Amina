using System.Runtime.Serialization;
using System.Text.Json.Serialization;
using NpgsqlTypes;

namespace EquipmentApi.Enums;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum EquipmentAssignmentStatus
{
    [EnumMember(Value = "active")]
    [PgName("active")]
    Active,

    [EnumMember(Value = "return_requested")]
    [PgName("return_requested")]
    ReturnRequested,

    [EnumMember(Value = "returned")]
    [PgName("returned")]
    Returned,

    [EnumMember(Value = "cancelled")]
    [PgName("cancelled")]
    Cancelled,
}
