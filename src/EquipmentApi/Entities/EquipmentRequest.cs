using EquipmentApi.Enums;

namespace EquipmentApi.Entities;

public class EquipmentRequest
{
    public Guid Id { get; set; }
    public Guid RequesterId { get; set; }
    public Employee Requester { get; set; } = null!;
    public RequestType RequestType { get; set; }
    public Guid? EquipmentModelId { get; set; }
    public EquipmentModel? EquipmentModel { get; set; }
    public string? RequestedItemName { get; set; }
    public Guid? CategoryId { get; set; }
    public EquipmentCategory? Category { get; set; }
    public int Quantity { get; set; } = 1;
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public string Purpose { get; set; } = string.Empty;
    public RequestStatus Status { get; set; } = RequestStatus.PendingManagerApproval;
    public string? CancellationReason { get; set; }
    public DateTime? CancelledAt { get; set; }
    public string? RejectedReason { get; set; }
    public ICollection<ApprovalStep> ApprovalSteps { get; set; } = [];
    public ICollection<EquipmentAssignment> Assignments { get; set; } = [];
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
