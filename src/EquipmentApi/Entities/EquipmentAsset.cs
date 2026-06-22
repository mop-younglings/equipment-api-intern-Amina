using EquipmentApi.Enums;

namespace EquipmentApi.Entities;

public class EquipmentAsset
{
    public Guid Id { get; set; }
    public Guid EquipmentModelId { get; set; }
    public EquipmentModel EquipmentModel { get; set; } = null!;
    public string AssetTag { get; set; } = string.Empty;
    public string? SerialNumber { get; set; }
    public EquipmentAssetStatus Status { get; set; } = EquipmentAssetStatus.Available;
    public Guid? AssignedEmployeeId { get; set; }
    public Employee? AssignedEmployee { get; set; }
    public DateTime? AssignedAt { get; set; }
    public DateOnly? ExpectedReturnDate { get; set; }
    public string? Notes { get; set; }
    public DateTime? RetiredAt { get; set; }
    public Guid? RetiredById { get; set; }
    public Employee? RetiredBy { get; set; }
    public ICollection<EquipmentAssignment> Assignments { get; set; } = [];
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
