using System.Runtime.Serialization;
using System.Text.Json.Serialization;
using NpgsqlTypes;

namespace EquipmentApi.Enums;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum RequestStatus
{
    [EnumMember(Value = "pending_manager_approval")]
    [PgName("pending_manager_approval")]
    PendingManagerApproval,

    [EnumMember(Value = "pending_procurement_approval")]
    [PgName("pending_procurement_approval")]
    PendingProcurementApproval,

    [EnumMember(Value = "procurement_approved")]
    [PgName("procurement_approved")]
    ProcurementApproved,

    [EnumMember(Value = "approved")]
    [PgName("approved")]
    Approved,

    [EnumMember(Value = "fulfilled")]
    [PgName("fulfilled")]
    Fulfilled,

    [EnumMember(Value = "rejected")]
    [PgName("rejected")]
    Rejected,

    [EnumMember(Value = "cancelled")]
    [PgName("cancelled")]
    Cancelled,
}

public static class RequestStatusExtensions
{
    public static readonly RequestStatus[] CancellableStatuses =
    [
        RequestStatus.PendingManagerApproval,
        RequestStatus.PendingProcurementApproval,
    ];
}
