namespace EquipmentApi.Entities;

public class EquipmentModel
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public Guid CategoryId { get; set; }
    public EquipmentCategory Category { get; set; } = null!;
    public string? Description { get; set; }
    public decimal DefaultValue { get; set; }
    public int? ProcurementYear { get; set; }
    public int? ReleaseYear { get; set; }
    public int? ExpectedLifespanMonths { get; set; }
    public int LowStockThreshold { get; set; } = 1;
    public ICollection<EquipmentAsset> Assets { get; set; } = [];
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
