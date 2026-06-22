using EquipmentApi.Enums;

namespace EquipmentApi.Entities;

public class EquipmentAssignment
{
    public Guid Id { get; set; }
    public Guid EquipmentAssetId { get; set; }
    public EquipmentAsset EquipmentAsset { get; set; } = null!;
    public Guid EmployeeId { get; set; }
    public Employee Employee { get; set; } = null!;
    public Guid? RequestId { get; set; }
    public EquipmentRequest? Request { get; set; }
    public Guid? AssignedById { get; set; }
    public Employee? AssignedBy { get; set; }
    public DateTime AssignedAt { get; set; }
    public DateOnly? ExpectedReturnDate { get; set; }
    public Guid? ReturnRequestedById { get; set; }
    public Employee? ReturnRequestedBy { get; set; }
    public DateTime? ReturnRequestedAt { get; set; }
    public DateOnly? ReturnByDate { get; set; }
    public DateTime? ReturnedAt { get; set; }
    public string? ReturnNote { get; set; }
    public EquipmentAssignmentStatus Status { get; set; } = EquipmentAssignmentStatus.Active;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
