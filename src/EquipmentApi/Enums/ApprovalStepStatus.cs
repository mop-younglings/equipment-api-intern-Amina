using System.Runtime.Serialization;
using System.Text.Json.Serialization;
using NpgsqlTypes;

namespace EquipmentApi.Enums;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum ApprovalStepStatus
{
    [EnumMember(Value = "pending")]
    [PgName("pending")]
    Pending,

    [EnumMember(Value = "approved")]
    [PgName("approved")]
    Approved,

    [EnumMember(Value = "rejected")]
    [PgName("rejected")]
    Rejected,

    [EnumMember(Value = "skipped")]
    [PgName("skipped")]
    Skipped,
}
