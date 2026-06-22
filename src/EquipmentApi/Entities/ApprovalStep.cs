using EquipmentApi.Enums;

namespace EquipmentApi.Entities;

public class ApprovalStep
{
    public Guid Id { get; set; }
    public Guid RequestId { get; set; }
    public EquipmentRequest Request { get; set; } = null!;
    public int Level { get; set; }
    public Guid ApproverId { get; set; }
    public Employee Approver { get; set; } = null!;
    public ApprovalRole ApproverRole { get; set; }
    public ApprovalStepStatus Status { get; set; } = ApprovalStepStatus.Pending;
    public string? Comment { get; set; }
    public DateTime? ActedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
