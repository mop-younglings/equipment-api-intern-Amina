namespace EquipmentApi.Entities;

public class Department
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public Guid? DirectManagerId { get; set; }
    public Employee? DirectManager { get; set; }
    public ICollection<Employee> Employees { get; set; } = [];
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
