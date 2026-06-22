using System.ComponentModel.DataAnnotations;
using EquipmentApi.Enums;
using EquipmentApi.Validation;

namespace EquipmentApi.Dtos;

public class CreateDepartmentDto
{
    [Required]
    public string Name { get; set; } = string.Empty;

    public Guid? DirectManagerId { get; set; }
}

public class UpdateDepartmentDto
{
    public string? Name { get; set; }

    public Guid? DirectManagerId { get; set; }
}

public class CreateAdminUserDto
{
    [Required]
    public string FirstName { get; set; } = string.Empty;

    [Required]
    public string LastName { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    [CompanyEmail]
    public string Email { get; set; } = string.Empty;

    [Required]
    [MinLength(8)]
    public string Password { get; set; } = string.Empty;

    public EmployeeRole? Role { get; set; }

    public AccountStatus? AccountStatus { get; set; }

    public Guid? DepartmentId { get; set; }
}

public class UpdateAdminUserDto
{
    public string? FirstName { get; set; }

    public string? LastName { get; set; }

    [EmailAddress]
    [CompanyEmail]
    public string? Email { get; set; }

    public Guid? DepartmentId { get; set; }
}

public class UpdateUserRoleDto
{
    [Required]
    public EmployeeRole Role { get; set; }
}

public class UpdateUserStatusDto
{
    [Required]
    public AccountStatus AccountStatus { get; set; }
}

public class ResetPasswordDto
{
    [Required]
    [MinLength(8)]
    public string Password { get; set; } = string.Empty;
}
