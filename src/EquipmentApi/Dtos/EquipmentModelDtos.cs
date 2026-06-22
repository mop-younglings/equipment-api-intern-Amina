using System.ComponentModel.DataAnnotations;

namespace EquipmentApi.Dtos;

public class CreateEquipmentModelDto
{
    [Required]
    public string Name { get; set; } = string.Empty;

    [Required]
    public Guid CategoryId { get; set; }

    public string? Description { get; set; }

    [Range(0, double.MaxValue)]
    public decimal? DefaultValue { get; set; }

    public int? ProcurementYear { get; set; }

    public int? ReleaseYear { get; set; }

    public int? ExpectedLifespanMonths { get; set; }

    [Range(0, int.MaxValue)]
    public int? LowStockThreshold { get; set; }
}

public class UpdateEquipmentModelDto
{
    public string? Name { get; set; }

    public Guid? CategoryId { get; set; }

    public string? Description { get; set; }

    [Range(0, double.MaxValue)]
    public decimal? DefaultValue { get; set; }

    public int? ProcurementYear { get; set; }

    public int? ReleaseYear { get; set; }

    public int? ExpectedLifespanMonths { get; set; }

    [Range(0, int.MaxValue)]
    public int? LowStockThreshold { get; set; }
}

public class CreateEquipmentCategoryDto
{
    [Required]
    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    public string? CategoryImage { get; set; }
}
