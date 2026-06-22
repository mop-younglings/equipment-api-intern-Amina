using System.Runtime.Serialization;
using System.Text.Json.Serialization;
using NpgsqlTypes;

namespace EquipmentApi.Enums;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum AccountStatus
{
    [EnumMember(Value = "active")]
    [PgName("active")]
    Active,

    [EnumMember(Value = "inactive")]
    [PgName("inactive")]
    Inactive,
}
