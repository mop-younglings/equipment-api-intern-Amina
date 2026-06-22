using System.ComponentModel.DataAnnotations;
using EquipmentApi.Enums;

namespace EquipmentApi.Dtos;

public class CreateRequestDto : IValidatableObject
{
    [Required]
    public RequestType RequestType { get; set; }

    public Guid? EquipmentModelId { get; set; }

    public string? RequestedItemName { get; set; }

    public Guid? CategoryId { get; set; }

    [Range(1, int.MaxValue)]
    public int? Quantity { get; set; }

    [Required]
    [RegularExpression(@"^\d{4}-\d{2}-\d{2}$", ErrorMessage = "startDate must be a valid ISO 8601 date string")]
    public string StartDate { get; set; } = string.Empty;

    [Required]
    [RegularExpression(@"^\d{4}-\d{2}-\d{2}$", ErrorMessage = "endDate must be a valid ISO 8601 date string")]
    public string EndDate { get; set; } = string.Empty;

    [Required]
    public string Purpose { get; set; } = string.Empty;

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (RequestType == RequestType.Loan && EquipmentModelId is null)
        {
            yield return new ValidationResult(
                "equipmentModelId is required for loan requests",
                [nameof(EquipmentModelId)]);
        }

        if (RequestType == RequestType.Procurement)
        {
            if (string.IsNullOrWhiteSpace(RequestedItemName))
            {
                yield return new ValidationResult(
                    "requestedItemName and categoryId are required for procurement requests",
                    [nameof(RequestedItemName)]);
            }

            if (CategoryId is null)
            {
                yield return new ValidationResult(
                    "requestedItemName and categoryId are required for procurement requests",
                    [nameof(CategoryId)]);
            }
        }
    }
}

public class CancelRequestDto
{
    public string? Reason { get; set; }
}

public class ApprovalActionDto
{
    public string? Comment { get; set; }
}

public class ReturnRequestDto
{
    [Required]
    [RegularExpression(@"^\d{4}-\d{2}-\d{2}$", ErrorMessage = "returnByDate must be a valid ISO 8601 date string")]
    public string ReturnByDate { get; set; } = string.Empty;

    public string? Message { get; set; }
}
