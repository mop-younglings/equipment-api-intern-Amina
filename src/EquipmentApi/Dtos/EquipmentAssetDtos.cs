using System.ComponentModel.DataAnnotations;
using EquipmentApi.Enums;

namespace EquipmentApi.Dtos;

public class CreateEquipmentAssetDto
{
    [Required]
    public Guid EquipmentModelId { get; set; }

    [Required]
    public string AssetTag { get; set; } = string.Empty;

    public string? SerialNumber { get; set; }

    public EquipmentAssetStatus? Status { get; set; }

    public string? Notes { get; set; }
}

public class UpdateEquipmentAssetDto
{
    public string? AssetTag { get; set; }

    public string? SerialNumber { get; set; }

    public string? Notes { get; set; }
}

public class UpdateEquipmentAssetStatusDto
{
    [Required]
    public EquipmentAssetStatus Status { get; set; }
}

public class AssignEquipmentAssetDto
{
    [Required]
    public Guid EmployeeId { get; set; }

    public Guid? RequestId { get; set; }

    [RegularExpression(@"^\d{4}-\d{2}-\d{2}$", ErrorMessage = "expectedReturnDate must be a valid ISO 8601 date string")]
    public string? ExpectedReturnDate { get; set; }
}
