using EquipmentApi.Auth;
using EquipmentApi.Data;
using EquipmentApi.Dtos;
using EquipmentApi.Entities;
using EquipmentApi.Enums;
using EquipmentApi.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace EquipmentApi.Services;

public class EquipmentAssignmentService
{
    private readonly AppDbContext _db;
    private readonly NotificationService _notificationService;
    private readonly AccessControlService _accessControl;

    public EquipmentAssignmentService(
        AppDbContext db,
        NotificationService notificationService,
        AccessControlService accessControl)
    {
        _db = db;
        _notificationService = notificationService;
        _accessControl = accessControl;
    }

    public Task<List<EquipmentAssignment>> FindMyAssignmentsAsync(
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        return _db.EquipmentAssignments
            .Where(assignment => assignment.EmployeeId == userId)
            .Include(assignment => assignment.EquipmentAsset)
                .ThenInclude(asset => asset.EquipmentModel)
                    .ThenInclude(model => model.Category)
            .Include(assignment => assignment.Employee)
            .Include(assignment => assignment.AssignedBy)
            .Include(assignment => assignment.ReturnRequestedBy)
            .OrderByDescending(assignment => assignment.AssignedAt)
            .ToListAsync(cancellationToken);
    }

    public async Task<EquipmentAssignment> FindOneAsync(
        Guid id,
        AuthenticatedUser user,
        CancellationToken cancellationToken = default)
    {
        var assignment = await LoadAssignmentAsync(id, cancellationToken);
        if (assignment is null)
        {
            throw new NotFoundException($"Assignment with id \"{id}\" not found");
        }

        await AssertCanViewAssignmentAsync(assignment, user, cancellationToken);
        return assignment;
    }

    public async Task<List<EquipmentAssignment>> FindTeamEquipmentAsync(
        AuthenticatedUser user,
        CancellationToken cancellationToken = default)
    {
        var departmentIds = await _accessControl.GetManagedDepartmentIdsAsync(user.Id, cancellationToken);
        if (departmentIds.Count == 0)
        {
            return [];
        }

        var employeeIds = await _accessControl.GetDepartmentEmployeeIdsAsync(departmentIds, cancellationToken);
        if (employeeIds.Count == 0)
        {
            return [];
        }

        return await _db.EquipmentAssignments
            .Where(assignment => employeeIds.Contains(assignment.EmployeeId)
                && (assignment.Status == EquipmentAssignmentStatus.Active
                    || assignment.Status == EquipmentAssignmentStatus.ReturnRequested))
            .Include(assignment => assignment.EquipmentAsset)
                .ThenInclude(asset => asset.EquipmentModel)
                    .ThenInclude(model => model.Category)
            .Include(assignment => assignment.Employee)
            .OrderByDescending(assignment => assignment.AssignedAt)
            .ToListAsync(cancellationToken);
    }

    public async Task<EquipmentAssignment> RequestReturnAsync(
        Guid id,
        AuthenticatedUser user,
        ReturnRequestDto dto,
        CancellationToken cancellationToken = default)
    {
        var assignment = await FindOneAsync(id, user, cancellationToken);

        if (!_accessControl.IsDirectManagerOrAbove(user))
        {
            throw new ForbiddenException("Only managers can request equipment returns");
        }

        var canManage = await _accessControl.IsEmployeeInManagedDepartmentsAsync(
            user.Id,
            assignment.EmployeeId,
            cancellationToken);

        if (!canManage && !_accessControl.IsProcurementManagerOrAbove(user))
        {
            throw new ForbiddenException("You cannot request return for this assignment");
        }

        if (assignment.Status != EquipmentAssignmentStatus.Active)
        {
            throw new BadRequestException("Only active assignments can have return requested");
        }

        assignment.Status = EquipmentAssignmentStatus.ReturnRequested;
        assignment.ReturnRequestedById = user.Id;
        assignment.ReturnRequestedAt = DateTime.UtcNow;
        assignment.ReturnByDate = DateOnly.Parse(dto.ReturnByDate);
        assignment.ReturnNote = dto.Message;

        assignment.EquipmentAsset.Status = EquipmentAssetStatus.ReturnRequested;
        await _db.SaveChangesAsync(cancellationToken);

        await _notificationService.NotifyEquipmentReturnRequestedAsync(
            assignment.Employee,
            assignment,
            dto.ReturnByDate,
            dto.Message,
            cancellationToken);

        return assignment;
    }

    public async Task<EquipmentAssignment> CompleteReturnAsync(
        Guid id,
        AuthenticatedUser user,
        CancellationToken cancellationToken = default)
    {
        var assignment = await FindOneAsync(id, user, cancellationToken);

        if (assignment.EmployeeId != user.Id && !_accessControl.IsDirectManagerOrAbove(user))
        {
            throw new ForbiddenException("You cannot complete this return");
        }

        if (assignment.Status != EquipmentAssignmentStatus.ReturnRequested)
        {
            throw new BadRequestException("Assignment is not awaiting return");
        }

        assignment.Status = EquipmentAssignmentStatus.Returned;
        assignment.ReturnedAt = DateTime.UtcNow;

        assignment.EquipmentAsset.Status = EquipmentAssetStatus.Available;
        assignment.EquipmentAsset.AssignedEmployeeId = null;
        assignment.EquipmentAsset.AssignedAt = null;
        assignment.EquipmentAsset.ExpectedReturnDate = null;

        await _db.SaveChangesAsync(cancellationToken);
        await _notificationService.NotifyEquipmentReturnedAsync(
            assignment.Employee,
            assignment,
            cancellationToken);

        return assignment;
    }

    private async Task AssertCanViewAssignmentAsync(
        EquipmentAssignment assignment,
        AuthenticatedUser user,
        CancellationToken cancellationToken)
    {
        if (assignment.EmployeeId == user.Id)
        {
            return;
        }

        if (_accessControl.IsProcurementManagerOrAbove(user))
        {
            return;
        }

        if (_accessControl.IsDirectManagerOrAbove(user))
        {
            var canView = await _accessControl.IsEmployeeInManagedDepartmentsAsync(
                user.Id,
                assignment.EmployeeId,
                cancellationToken);
            if (canView)
            {
                return;
            }
        }

        throw new ForbiddenException("You cannot view this assignment");
    }

    private Task<EquipmentAssignment?> LoadAssignmentAsync(Guid id, CancellationToken cancellationToken)
    {
        return _db.EquipmentAssignments
            .Include(assignment => assignment.EquipmentAsset)
                .ThenInclude(asset => asset.EquipmentModel)
                    .ThenInclude(model => model.Category)
            .Include(assignment => assignment.Employee)
                .ThenInclude(employee => employee.Department)
            .Include(assignment => assignment.AssignedBy)
            .Include(assignment => assignment.ReturnRequestedBy)
            .Include(assignment => assignment.Request)
            .FirstOrDefaultAsync(assignment => assignment.Id == id, cancellationToken);
    }
}
