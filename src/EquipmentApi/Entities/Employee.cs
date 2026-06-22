using System.Text.Json.Serialization;
using EquipmentApi.Enums;

namespace EquipmentApi.Entities;

public class Employee
{
    public Guid Id { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;

    [JsonIgnore]
    public string Password { get; set; } = string.Empty;

    public EmployeeRole Role { get; set; } = EmployeeRole.Employee;
    public AccountStatus AccountStatus { get; set; } = AccountStatus.Active;
    public Guid? DepartmentId { get; set; }
    public Department? Department { get; set; }
    public ICollection<EquipmentAsset> AssignedAssets { get; set; } = [];
    public ICollection<EquipmentAssignment> Assignments { get; set; } = [];
    public ICollection<Notification> Notifications { get; set; } = [];
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
