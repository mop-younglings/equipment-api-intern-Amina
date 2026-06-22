using EquipmentApi.Data;
using EquipmentApi.Dtos;
using EquipmentApi.Entities;
using EquipmentApi.Enums;
using EquipmentApi.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace EquipmentApi.Services;

public class AdminService
{
    private const int SaltRounds = 10;

    private readonly AppDbContext _db;
    private readonly AuthService _authService;

    public AdminService(AppDbContext db, AuthService authService)
    {
        _db = db;
        _authService = authService;
    }

    public Task<List<Employee>> FindAllUsersAsync(CancellationToken cancellationToken = default)
    {
        return _db.Employees
            .Include(user => user.Department)
            .OrderBy(user => user.CreatedAt)
            .ToListAsync(cancellationToken);
    }

    public async Task<Employee> FindUserAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var user = await _db.Employees
            .Include(e => e.Department)
            .FirstOrDefaultAsync(e => e.Id == id, cancellationToken);

        if (user is null)
        {
            throw new NotFoundException($"User with id \"{id}\" not found");
        }

        return user;
    }

    public async Task<Employee> CreateUserAsync(
        CreateAdminUserDto dto,
        CancellationToken cancellationToken = default)
    {
        var existing = await _db.Employees.AnyAsync(e => e.Email == dto.Email, cancellationToken);
        if (existing)
        {
            throw new ConflictException("Email already registered");
        }

        Department? department = null;
        if (dto.DepartmentId is not null)
        {
            department = await _db.Departments
                .FirstOrDefaultAsync(d => d.Id == dto.DepartmentId, cancellationToken);
            if (department is null)
            {
                throw new NotFoundException("Department not found");
            }
        }

        var user = new Employee
        {
            FirstName = dto.FirstName,
            LastName = dto.LastName,
            Email = dto.Email,
            Password = BCrypt.Net.BCrypt.HashPassword(dto.Password, SaltRounds),
            Role = dto.Role ?? EmployeeRole.Employee,
            AccountStatus = dto.AccountStatus ?? AccountStatus.Active,
            DepartmentId = department?.Id,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        _db.Employees.Add(user);
        await _db.SaveChangesAsync(cancellationToken);
        user.Department = department;
        return user;
    }

    public async Task<Employee> UpdateUserAsync(
        Guid id,
        UpdateAdminUserDto dto,
        CancellationToken cancellationToken = default)
    {
        var user = await FindUserAsync(id, cancellationToken);

        if (dto.FirstName is not null)
        {
            user.FirstName = dto.FirstName;
        }

        if (dto.LastName is not null)
        {
            user.LastName = dto.LastName;
        }

        if (dto.Email is not null)
        {
            user.Email = dto.Email;
        }

        if (dto.DepartmentId.HasValue)
        {
            if (dto.DepartmentId.Value == Guid.Empty)
            {
                user.DepartmentId = null;
                user.Department = null;
            }
            else
            {
                var department = await _db.Departments
                    .FirstOrDefaultAsync(d => d.Id == dto.DepartmentId, cancellationToken);
                if (department is null)
                {
                    throw new NotFoundException("Department not found");
                }

                user.DepartmentId = department.Id;
                user.Department = department;
            }
        }

        await _db.SaveChangesAsync(cancellationToken);
        return user;
    }

    public async Task<Employee> UpdateRoleAsync(
        Guid id,
        UpdateUserRoleDto dto,
        CancellationToken cancellationToken = default)
    {
        var user = await FindUserAsync(id, cancellationToken);
        user.Role = dto.Role;
        await _db.SaveChangesAsync(cancellationToken);
        return user;
    }

    public async Task<Employee> UpdateStatusAsync(
        Guid id,
        UpdateUserStatusDto dto,
        CancellationToken cancellationToken = default)
    {
        var user = await FindUserAsync(id, cancellationToken);
        user.AccountStatus = dto.AccountStatus;
        await _db.SaveChangesAsync(cancellationToken);

        if (dto.AccountStatus == AccountStatus.Inactive)
        {
            await _authService.RevokeAllSessionsAsync(id, cancellationToken);
        }

        return user;
    }

    public async Task ResetPasswordAsync(
        Guid id,
        ResetPasswordDto dto,
        CancellationToken cancellationToken = default)
    {
        var user = await FindUserAsync(id, cancellationToken);
        user.Password = BCrypt.Net.BCrypt.HashPassword(dto.Password, SaltRounds);
        await _db.SaveChangesAsync(cancellationToken);
        await _authService.RevokeAllSessionsAsync(id, cancellationToken);
    }

    public async Task RemoveUserAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var user = await FindUserAsync(id, cancellationToken);
        _db.Employees.Remove(user);
        await _db.SaveChangesAsync(cancellationToken);
    }
}
