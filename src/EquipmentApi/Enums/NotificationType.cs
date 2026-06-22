using System.Runtime.Serialization;
using System.Text.Json.Serialization;
using NpgsqlTypes;

namespace EquipmentApi.Enums;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum NotificationType
{
    [EnumMember(Value = "approval_required")]
    [PgName("approval_required")]
    ApprovalRequired,

    [EnumMember(Value = "request_approved")]
    [PgName("request_approved")]
    RequestApproved,

    [EnumMember(Value = "request_rejected")]
    [PgName("request_rejected")]
    RequestRejected,

    [EnumMember(Value = "request_cancelled")]
    [PgName("request_cancelled")]
    RequestCancelled,

    [EnumMember(Value = "request_update")]
    [PgName("request_update")]
    RequestUpdate,

    [EnumMember(Value = "procurement_approved")]
    [PgName("procurement_approved")]
    ProcurementApproved,

    [EnumMember(Value = "equipment_assigned")]
    [PgName("equipment_assigned")]
    EquipmentAssigned,

    [EnumMember(Value = "equipment_return_requested")]
    [PgName("equipment_return_requested")]
    EquipmentReturnRequested,

    [EnumMember(Value = "equipment_returned")]
    [PgName("equipment_returned")]
    EquipmentReturned,
}
