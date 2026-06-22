using System.Runtime.Serialization;
using System.Text.Json.Serialization;
using NpgsqlTypes;

namespace EquipmentApi.Enums;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum EquipmentAssetStatus
{
    [EnumMember(Value = "available")]
    [PgName("available")]
    Available,

    [EnumMember(Value = "in_use")]
    [PgName("in_use")]
    InUse,

    [EnumMember(Value = "reserved")]
    [PgName("reserved")]
    Reserved,

    [EnumMember(Value = "return_requested")]
    [PgName("return_requested")]
    ReturnRequested,

    [EnumMember(Value = "maintenance")]
    [PgName("maintenance")]
    Maintenance,

    [EnumMember(Value = "retired")]
    [PgName("retired")]
    Retired,
}
