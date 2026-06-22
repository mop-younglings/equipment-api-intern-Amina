using EquipmentApi.Authorization;
using EquipmentApi.Dtos;
using EquipmentApi.Entities;
using EquipmentApi.Enums;
using EquipmentApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EquipmentApi.Controllers;

[ApiController]
[Authorize]
[MinRole(EmployeeRole.Admin)]
[Route("admin")]
public class AdminController : ControllerBase
{
    private readonly AdminService _adminService;
    private readonly DepartmentService _departmentService;

    public AdminController(AdminService adminService, DepartmentService departmentService)
    {
        _adminService = adminService;
        _departmentService = departmentService;
    }

    [HttpGet("users")]
    public Task<List<Employee>> FindUsers(CancellationToken cancellationToken) =>
        _adminService.FindAllUsersAsync(cancellationToken);

    [HttpPost("users")]
    public Task<Employee> CreateUser([FromBody] CreateAdminUserDto dto, CancellationToken cancellationToken) =>
        _adminService.CreateUserAsync(dto, cancellationToken);

    [HttpGet("users/{id:guid}")]
    public Task<Employee> FindUser(Guid id, CancellationToken cancellationToken) =>
        _adminService.FindUserAsync(id, cancellationToken);

    [HttpPatch("users/{id:guid}")]
    public Task<Employee> UpdateUser(
        Guid id,
        [FromBody] UpdateAdminUserDto dto,
        CancellationToken cancellationToken) =>
        _adminService.UpdateUserAsync(id, dto, cancellationToken);

    [HttpPatch("users/{id:guid}/role")]
    public Task<Employee> UpdateRole(
        Guid id,
        [FromBody] UpdateUserRoleDto dto,
        CancellationToken cancellationToken) =>
        _adminService.UpdateRoleAsync(id, dto, cancellationToken);

    [HttpPatch("users/{id:guid}/status")]
    public Task<Employee> UpdateStatus(
        Guid id,
        [FromBody] UpdateUserStatusDto dto,
        CancellationToken cancellationToken) =>
        _adminService.UpdateStatusAsync(id, dto, cancellationToken);

    [HttpPost("users/{id:guid}/reset-password")]
    public async Task<IActionResult> ResetPassword(
        Guid id,
        [FromBody] ResetPasswordDto dto,
        CancellationToken cancellationToken)
    {
        await _adminService.ResetPasswordAsync(id, dto, cancellationToken);
        return NoContent();
    }

    [HttpDelete("users/{id:guid}")]
    public async Task<IActionResult> RemoveUser(Guid id, CancellationToken cancellationToken)
    {
        await _adminService.RemoveUserAsync(id, cancellationToken);
        return NoContent();
    }

    [HttpGet("departments")]
    public Task<List<Department>> FindDepartments(CancellationToken cancellationToken) =>
        _departmentService.FindAllAsync(cancellationToken);

    [HttpPost("departments")]
    public Task<Department> CreateDepartment(
        [FromBody] CreateDepartmentDto dto,
        CancellationToken cancellationToken) =>
        _departmentService.CreateAsync(dto, cancellationToken);

    [HttpPatch("departments/{id:guid}")]
    public Task<Department> UpdateDepartment(
        Guid id,
        [FromBody] UpdateDepartmentDto dto,
        CancellationToken cancellationToken) =>
        _departmentService.UpdateAsync(id, dto, cancellationToken);

    [HttpDelete("departments/{id:guid}")]
    public async Task<IActionResult> RemoveDepartment(Guid id, CancellationToken cancellationToken)
    {
        await _departmentService.RemoveAsync(id, cancellationToken);
        return NoContent();
    }
}
