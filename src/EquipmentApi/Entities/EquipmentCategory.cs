namespace EquipmentApi.Entities;

public class EquipmentCategory
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? CategoryImage { get; set; }
    public ICollection<EquipmentModel> Models { get; set; } = [];
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
