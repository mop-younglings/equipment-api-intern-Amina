using EquipmentApi.Enums;

namespace EquipmentApi.Entities;

public class Notification
{
    public Guid Id { get; set; }
    public Guid RecipientId { get; set; }
    public Employee Recipient { get; set; } = null!;
    public NotificationType Type { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public bool IsRead { get; set; }
    public DateTime? ReadAt { get; set; }
    public Guid? RequestId { get; set; }
    public EquipmentRequest? Request { get; set; }
    public Guid? ApprovalStepId { get; set; }
    public ApprovalStep? ApprovalStep { get; set; }
    public Guid? EquipmentAssignmentId { get; set; }
    public EquipmentAssignment? EquipmentAssignment { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
