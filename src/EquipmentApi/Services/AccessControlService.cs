using EquipmentApi.Auth;
using EquipmentApi.Data;
using EquipmentApi.Entities;
using EquipmentApi.Enums;
using Microsoft.EntityFrameworkCore;

namespace EquipmentApi.Services;

public class AccessControlService
{
    private readonly AppDbContext _db;

    public AccessControlService(AppDbContext db)
    {
        _db = db;
    }

    public bool IsAdmin(AuthenticatedUser user) => user.Role == EmployeeRole.Admin;

    public bool IsProcurementManagerOrAbove(AuthenticatedUser user) =>
        EmployeeRoleExtensions.HasMinimumRole(user.Role, EmployeeRole.ProcurementManager);

    public bool IsDirectManagerOrAbove(AuthenticatedUser user) =>
        EmployeeRoleExtensions.HasMinimumRole(user.Role, EmployeeRole.DirectManager);

    public async Task<List<Guid>> GetManagedDepartmentIdsAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        return await _db.Departments
            .Where(department => department.DirectManagerId == userId)
            .Select(department => department.Id)
            .ToListAsync(cancellationToken);
    }

    public async Task<bool> IsEmployeeInManagedDepartmentsAsync(
        Guid managerId,
        Guid employeeId,
        CancellationToken cancellationToken = default)
    {
        var managedDepartmentIds = await GetManagedDepartmentIdsAsync(managerId, cancellationToken);
        if (managedDepartmentIds.Count == 0)
        {
            return false;
        }

        var employee = await _db.Employees
            .Include(e => e.Department)
            .FirstOrDefaultAsync(e => e.Id == employeeId, cancellationToken);

        return employee?.DepartmentId is not null
            && managedDepartmentIds.Contains(employee.DepartmentId.Value);
    }

    public async Task<List<Guid>> GetDepartmentEmployeeIdsAsync(
        IReadOnlyCollection<Guid> departmentIds,
        CancellationToken cancellationToken = default)
    {
        if (departmentIds.Count == 0)
        {
            return [];
        }

        return await _db.Employees
            .Where(employee => employee.DepartmentId != null && departmentIds.Contains(employee.DepartmentId.Value))
            .Select(employee => employee.Id)
            .ToListAsync(cancellationToken);
    }

    public Task<Employee?> FindProcurementManagerAsync(CancellationToken cancellationToken = default)
    {
        return _db.Employees
            .Where(employee => employee.Role == EmployeeRole.ProcurementManager)
            .OrderBy(employee => employee.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);
    }
}
