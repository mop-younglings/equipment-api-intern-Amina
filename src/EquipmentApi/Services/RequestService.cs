using EquipmentApi.Auth;
using EquipmentApi.Data;
using EquipmentApi.Dtos;
using EquipmentApi.Entities;
using EquipmentApi.Enums;
using EquipmentApi.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace EquipmentApi.Services;

public class RequestService
{
    private readonly AppDbContext _db;
    private readonly NotificationService _notificationService;
    private readonly AccessControlService _accessControl;
    private readonly ApprovalWorkflowService _approvalWorkflowService;

    public RequestService(
        AppDbContext db,
        NotificationService notificationService,
        AccessControlService accessControl,
        ApprovalWorkflowService approvalWorkflowService)
    {
        _db = db;
        _notificationService = notificationService;
        _accessControl = accessControl;
        _approvalWorkflowService = approvalWorkflowService;
    }

    public Task<List<EquipmentRequest>> FindMyRequestsAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        return _db.EquipmentRequests
            .Where(request => request.RequesterId == userId)
            .Include(request => request.Requester)
            .Include(request => request.EquipmentModel!)
                .ThenInclude(model => model.Category)
            .Include(request => request.Category)
            .Include(request => request.ApprovalSteps)
                .ThenInclude(step => step.Approver)
            .OrderByDescending(request => request.CreatedAt)
            .ToListAsync(cancellationToken);
    }

    public async Task<EquipmentRequest> FindOneAsync(
        Guid id,
        AuthenticatedUser user,
        CancellationToken cancellationToken = default)
    {
        var request = await LoadRequestAsync(id, cancellationToken);
        if (request is null)
        {
            throw new NotFoundException($"Request with id \"{id}\" not found");
        }

        await AssertCanViewRequestAsync(request, user, cancellationToken);
        return request;
    }

    public async Task<object> GetTimelineAsync(
        Guid id,
        AuthenticatedUser user,
        CancellationToken cancellationToken = default)
    {
        var request = await FindOneAsync(id, user, cancellationToken);
        return new
        {
            requestId = request.Id,
            status = request.Status,
            steps = request.ApprovalSteps
                .OrderBy(step => step.Level)
                .Select(step => new
                {
                    id = step.Id,
                    level = step.Level,
                    approverRole = step.ApproverRole,
                    approverName = $"{step.Approver.FirstName} {step.Approver.LastName}",
                    status = step.Status,
                    comment = step.Comment,
                    actedAt = step.ActedAt,
                }),
            assignments = request.Assignments,
        };
    }

    public async Task<EquipmentRequest> CreateAsync(
        CreateRequestDto createRequestDto,
        AuthenticatedUser user,
        CancellationToken cancellationToken = default)
    {
        var requester = await LoadRequesterAsync(user.Id, cancellationToken);
        AssertRequesterHasDirectManager(requester);

        EquipmentModel? equipmentModel = null;
        EquipmentCategory? category = null;

        if (createRequestDto.RequestType == RequestType.Loan)
        {
            var validated = await ValidateLoanRequestAsync(createRequestDto, cancellationToken);
            equipmentModel = validated.EquipmentModel;
            category = validated.Category;
        }
        else
        {
            category = await ValidateProcurementRequestAsync(createRequestDto, cancellationToken);
        }

        var savedRequest = await PersistNewRequestAsync(
            createRequestDto,
            requester,
            equipmentModel,
            category,
            cancellationToken);

        await NotifyInitialApproverAsync(savedRequest, cancellationToken);
        return savedRequest;
    }

    public async Task<EquipmentRequest> CancelAsync(
        Guid id,
        AuthenticatedUser user,
        CancelRequestDto cancelDto,
        CancellationToken cancellationToken = default)
    {
        var request = await FindOneAsync(id, user, cancellationToken);

        if (request.RequesterId != user.Id)
        {
            throw new ForbiddenException("You can only cancel your own requests");
        }

        if (!RequestStatusExtensions.CancellableStatuses.Contains(request.Status))
        {
            throw new BadRequestException(
                "Request can only be cancelled while pending manager or procurement approval");
        }

        request.Status = RequestStatus.Cancelled;
        request.CancellationReason = cancelDto.Reason;
        request.CancelledAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(cancellationToken);
        await _notificationService.NotifyRequestCancelledAsync(request.Requester, request, cancellationToken);
        return request;
    }

    public async Task<List<EquipmentRequest>> FindManagerPendingAsync(
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

        return await _db.EquipmentRequests
            .Where(request => request.Status == RequestStatus.PendingManagerApproval
                && employeeIds.Contains(request.RequesterId))
            .Include(request => request.Requester)
            .Include(request => request.EquipmentModel)
            .Include(request => request.Category)
            .Include(request => request.ApprovalSteps)
                .ThenInclude(step => step.Approver)
            .OrderByDescending(request => request.CreatedAt)
            .ToListAsync(cancellationToken);
    }

    public async Task<List<EquipmentRequest>> FindManagerRequestsAsync(
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

        return await _db.EquipmentRequests
            .Where(request => employeeIds.Contains(request.RequesterId))
            .Include(request => request.Requester)
            .Include(request => request.EquipmentModel)
            .Include(request => request.Category)
            .Include(request => request.ApprovalSteps)
                .ThenInclude(step => step.Approver)
            .OrderByDescending(request => request.CreatedAt)
            .ToListAsync(cancellationToken);
    }

    public Task<List<EquipmentRequest>> FindProcurementPendingAsync(CancellationToken cancellationToken = default)
    {
        return _db.EquipmentRequests
            .Where(request => request.Status == RequestStatus.PendingProcurementApproval)
            .Include(request => request.Requester)
                .ThenInclude(requester => requester.Department)
            .Include(request => request.EquipmentModel!)
                .ThenInclude(model => model.Category)
            .Include(request => request.Category)
            .Include(request => request.ApprovalSteps)
                .ThenInclude(step => step.Approver)
            .OrderBy(request => request.CreatedAt)
            .ToListAsync(cancellationToken);
    }

    private async Task<Employee> LoadRequesterAsync(Guid userId, CancellationToken cancellationToken)
    {
        var requester = await _db.Employees
            .Include(e => e.Department!)
                .ThenInclude(d => d.DirectManager)
            .FirstOrDefaultAsync(e => e.Id == userId, cancellationToken);

        if (requester is null)
        {
            throw new NotFoundException("Requester not found");
        }

        return requester;
    }

    private static void AssertRequesterHasDirectManager(Employee requester)
    {
        if (requester.Department?.DirectManager is null)
        {
            throw new BadRequestException(
                "Cannot submit request: department has no direct manager assigned");
        }
    }

    private async Task<(EquipmentModel EquipmentModel, EquipmentCategory Category)> ValidateLoanRequestAsync(
        CreateRequestDto createRequestDto,
        CancellationToken cancellationToken)
    {
        if (createRequestDto.EquipmentModelId is null)
        {
            throw new BadRequestException("equipmentModelId is required for loan requests");
        }

        var equipmentModel = await _db.EquipmentModels
            .Include(model => model.Category)
            .FirstOrDefaultAsync(model => model.Id == createRequestDto.EquipmentModelId, cancellationToken);

        if (equipmentModel is null)
        {
            throw new NotFoundException("Equipment model not found");
        }

        return (equipmentModel, equipmentModel.Category);
    }

    private async Task<EquipmentCategory> ValidateProcurementRequestAsync(
        CreateRequestDto createRequestDto,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(createRequestDto.RequestedItemName) || createRequestDto.CategoryId is null)
        {
            throw new BadRequestException(
                "requestedItemName and categoryId are required for procurement requests");
        }

        var category = await _db.EquipmentCategories
            .FirstOrDefaultAsync(c => c.Id == createRequestDto.CategoryId, cancellationToken);

        if (category is null)
        {
            throw new NotFoundException("Category not found");
        }

        return category;
    }

    private async Task<EquipmentRequest> PersistNewRequestAsync(
        CreateRequestDto createRequestDto,
        Employee requester,
        EquipmentModel? equipmentModel,
        EquipmentCategory? category,
        CancellationToken cancellationToken)
    {
        await using var transaction = await _db.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            var request = new EquipmentRequest
            {
                RequesterId = requester.Id,
                RequestType = createRequestDto.RequestType,
                EquipmentModelId = equipmentModel?.Id,
                RequestedItemName = createRequestDto.RequestedItemName,
                CategoryId = category?.Id,
                Quantity = createRequestDto.Quantity ?? 1,
                StartDate = DateOnly.Parse(createRequestDto.StartDate),
                EndDate = DateOnly.Parse(createRequestDto.EndDate),
                Purpose = createRequestDto.Purpose,
                Status = RequestStatus.PendingManagerApproval,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            };

            _db.EquipmentRequests.Add(request);
            await _db.SaveChangesAsync(cancellationToken);

            await _approvalWorkflowService.CreateInitialManagerApprovalStepAsync(
                _db,
                request,
                requester.Department!.DirectManager!,
                cancellationToken);

            await transaction.CommitAsync(cancellationToken);

            return await LoadRequestAsync(request.Id, cancellationToken)
                ?? throw new NotFoundException($"Request with id \"{request.Id}\" not found");
        }
        catch
        {
            await transaction.RollbackAsync(cancellationToken);
            throw;
        }
    }

    private async Task NotifyInitialApproverAsync(
        EquipmentRequest savedRequest,
        CancellationToken cancellationToken)
    {
        var firstStep = savedRequest.ApprovalSteps.OrderBy(step => step.Level).FirstOrDefault();
        if (firstStep?.Approver is not null)
        {
            await _notificationService.NotifyApprovalRequiredAsync(
                firstStep.Approver,
                savedRequest,
                firstStep,
                cancellationToken);
        }
    }

    private async Task AssertCanViewRequestAsync(
        EquipmentRequest request,
        AuthenticatedUser user,
        CancellationToken cancellationToken)
    {
        if (request.RequesterId == user.Id)
        {
            return;
        }

        if (_accessControl.IsAdmin(user) || _accessControl.IsProcurementManagerOrAbove(user))
        {
            return;
        }

        if (_accessControl.IsDirectManagerOrAbove(user))
        {
            var canView = await _accessControl.IsEmployeeInManagedDepartmentsAsync(
                user.Id,
                request.RequesterId,
                cancellationToken);
            if (canView)
            {
                return;
            }
        }

        throw new ForbiddenException("You cannot view this request");
    }

    private Task<EquipmentRequest?> LoadRequestAsync(Guid id, CancellationToken cancellationToken)
    {
        return _db.EquipmentRequests
            .Include(request => request.Requester)
                .ThenInclude(requester => requester.Department)
            .Include(request => request.EquipmentModel!)
                .ThenInclude(model => model.Category)
            .Include(request => request.Category)
            .Include(request => request.ApprovalSteps)
                .ThenInclude(step => step.Approver)
            .Include(request => request.Assignments)
                .ThenInclude(assignment => assignment.EquipmentAsset)
                    .ThenInclude(asset => asset.EquipmentModel)
            .FirstOrDefaultAsync(request => request.Id == id, cancellationToken);
    }
}
