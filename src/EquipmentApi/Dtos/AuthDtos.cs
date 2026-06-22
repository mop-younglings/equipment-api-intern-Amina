using System.ComponentModel.DataAnnotations;
using EquipmentApi.Validation;

namespace EquipmentApi.Dtos;

public class LoginDto
{
    [Required]
    [EmailAddress]
    [CompanyEmail]
    public string Email { get; set; } = string.Empty;

    [Required]
    [MinLength(8)]
    public string Password { get; set; } = string.Empty;
}

public class RegisterDto
{
    [Required]
    public string FirstName { get; set; } = string.Empty;

    [Required]
    public string LastName { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    [CompanyEmail]
    public string Email { get; set; } = string.Empty;

    public Guid? DepartmentId { get; set; }

    [Required]
    [MinLength(8)]
    public string Password { get; set; } = string.Empty;
}

public class RefreshTokenDto
{
    [Required]
    [MinLength(20)]
    public string RefreshToken { get; set; } = string.Empty;
}
