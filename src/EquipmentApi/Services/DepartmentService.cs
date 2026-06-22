using EquipmentApi.Data;
using EquipmentApi.Dtos;
using EquipmentApi.Entities;
using EquipmentApi.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace EquipmentApi.Services;

public class DepartmentService
{
    private readonly AppDbContext _db;

    public DepartmentService(AppDbContext db)
    {
        _db = db;
    }

    public Task<List<Department>> FindAllAsync(CancellationToken cancellationToken = default)
    {
        return _db.Departments
            .Include(department => department.DirectManager)
            .Include(department => department.Employees)
            .OrderBy(department => department.Name)
            .ToListAsync(cancellationToken);
    }

    public async Task<Department> FindOneAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var department = await _db.Departments
            .Include(d => d.DirectManager)
            .Include(d => d.Employees)
            .FirstOrDefaultAsync(d => d.Id == id, cancellationToken);

        if (department is null)
        {
            throw new NotFoundException($"Department with id \"{id}\" not found");
        }

        return department;
    }

    public async Task<Department> CreateAsync(
        CreateDepartmentDto dto,
        CancellationToken cancellationToken = default)
    {
        var department = new Department
        {
            Name = dto.Name,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        if (dto.DirectManagerId is not null)
        {
            var manager = await _db.Employees
                .FirstOrDefaultAsync(e => e.Id == dto.DirectManagerId, cancellationToken);
            if (manager is null)
            {
                throw new NotFoundException("Direct manager not found");
            }

            department.DirectManagerId = manager.Id;
            department.DirectManager = manager;
        }

        _db.Departments.Add(department);
        await _db.SaveChangesAsync(cancellationToken);
        return department;
    }

    public async Task<Department> UpdateAsync(
        Guid id,
        UpdateDepartmentDto dto,
        CancellationToken cancellationToken = default)
    {
        var department = await FindOneAsync(id, cancellationToken);

        if (dto.Name is not null)
        {
            department.Name = dto.Name;
        }

        if (dto.DirectManagerId.HasValue)
        {
            if (dto.DirectManagerId.Value == Guid.Empty)
            {
                department.DirectManagerId = null;
                department.DirectManager = null;
            }
            else
            {
                var manager = await _db.Employees
                    .FirstOrDefaultAsync(e => e.Id == dto.DirectManagerId, cancellationToken);
                if (manager is null)
                {
                    throw new NotFoundException("Direct manager not found");
                }

                department.DirectManagerId = manager.Id;
                department.DirectManager = manager;
            }
        }

        await _db.SaveChangesAsync(cancellationToken);
        return department;
    }

    public async Task RemoveAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var department = await FindOneAsync(id, cancellationToken);
        _db.Departments.Remove(department);
        await _db.SaveChangesAsync(cancellationToken);
    }
}
