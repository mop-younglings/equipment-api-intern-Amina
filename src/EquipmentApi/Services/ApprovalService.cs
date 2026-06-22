using EquipmentApi.Auth;
using EquipmentApi.Data;
using EquipmentApi.Dtos;
using EquipmentApi.Entities;
using EquipmentApi.Enums;
using EquipmentApi.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace EquipmentApi.Services;

public class ApprovalService
{
    private readonly AppDbContext _db;
    private readonly NotificationService _notificationService;
    private readonly AccessControlService _accessControl;

    public ApprovalService(
        AppDbContext db,
        NotificationService notificationService,
        AccessControlService accessControl)
    {
        _db = db;
        _notificationService = notificationService;
        _accessControl = accessControl;
    }

    public Task<List<ApprovalStep>> FindMyPendingAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        return _db.ApprovalSteps
            .Where(step => step.ApproverId == userId && step.Status == ApprovalStepStatus.Pending)
            .Include(step => step.Request!)
                .ThenInclude(request => request.Requester)
                    .ThenInclude(requester => requester.Department)
            .Include(step => step.Request!)
                .ThenInclude(request => request.EquipmentModel!)
                    .ThenInclude(model => model.Category)
            .Include(step => step.Request!)
                .ThenInclude(request => request.Category)
            .Include(step => step.Approver)
            .OrderBy(step => step.CreatedAt)
            .ToListAsync(cancellationToken);
    }

    public async Task<ApprovalStep> FindOneAsync(
        Guid stepId,
        AuthenticatedUser user,
        CancellationToken cancellationToken = default)
    {
        var step = await LoadApprovalStepAsync(stepId, includeAllSteps: true, cancellationToken);

        if (step is null)
        {
            throw new NotFoundException($"Approval step with id \"{stepId}\" not found");
        }

        if (step.ApproverId != user.Id && !_accessControl.IsProcurementManagerOrAbove(user))
        {
            throw new ForbiddenException("You cannot view this approval step");
        }

        return step;
    }

    public Task<ApprovalStep> ApproveAsync(
        Guid stepId,
        AuthenticatedUser user,
        ApprovalActionDto actionDto,
        CancellationToken cancellationToken = default) =>
        ProcessActionAsync(stepId, user, actionDto, ApprovalStepStatus.Approved, cancellationToken);

    public async Task<ApprovalStep> RejectAsync(
        Guid stepId,
        AuthenticatedUser user,
        ApprovalActionDto actionDto,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(actionDto.Comment))
        {
            throw new BadRequestException("Rejection reason is required");
        }

        return await ProcessActionAsync(
            stepId,
            user,
            actionDto,
            ApprovalStepStatus.Rejected,
            cancellationToken);
    }

    private async Task<ApprovalStep> ProcessActionAsync(
        Guid stepId,
        AuthenticatedUser user,
        ApprovalActionDto actionDto,
        ApprovalStepStatus targetStatus,
        CancellationToken cancellationToken)
    {
        var step = await FindOneAsync(stepId, user, cancellationToken);
        AssertCanActOnStep(step, user);

        await using var transaction = await _db.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            var freshStep = await _db.ApprovalSteps
                .Include(s => s.Request!)
                    .ThenInclude(r => r.Requester)
                        .ThenInclude(requester => requester.Department!)
                            .ThenInclude(department => department.DirectManager)
                .Include(s => s.Request!)
                    .ThenInclude(r => r.EquipmentModel)
                .Include(s => s.Request!)
                    .ThenInclude(r => r.Category)
                .Include(s => s.Approver)
                .FirstAsync(s => s.Id == stepId, cancellationToken);

            if (freshStep.Status != ApprovalStepStatus.Pending)
            {
                throw new BadRequestException("This approval step has already been processed");
            }

            freshStep.Status = targetStatus;
            freshStep.Comment = actionDto.Comment;
            freshStep.ActedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync(cancellationToken);

            if (targetStatus == ApprovalStepStatus.Rejected)
            {
                await HandleRejectionAsync(freshStep, cancellationToken);
            }
            else if (freshStep.ApproverRole == ApprovalRole.DirectManager)
            {
                await HandleManagerApprovalAsync(freshStep, cancellationToken);
            }
            else if (freshStep.ApproverRole == ApprovalRole.ProcurementManager)
            {
                await HandleProcurementApprovalAsync(freshStep, cancellationToken);
            }

            await transaction.CommitAsync(cancellationToken);
        }
        catch
        {
            await transaction.RollbackAsync(cancellationToken);
            throw;
        }

        var savedStep = await LoadApprovalStepAsync(stepId, includeAllSteps: true, cancellationToken)
            ?? throw new NotFoundException($"Approval step with id \"{stepId}\" not found");

        await DispatchNotificationsAsync(savedStep, targetStatus, actionDto.Comment, cancellationToken);
        return savedStep;
    }

    private static void AssertCanActOnStep(ApprovalStep step, AuthenticatedUser user)
    {
        if (step.ApproverId != user.Id)
        {
            throw new ForbiddenException("You are not the designated approver for this step");
        }

        if (step.Status != ApprovalStepStatus.Pending)
        {
            throw new BadRequestException("This approval step has already been processed");
        }
    }

    private async Task HandleRejectionAsync(ApprovalStep step, CancellationToken cancellationToken)
    {
        var pendingSteps = await _db.ApprovalSteps
            .Where(s => s.RequestId == step.RequestId && s.Status == ApprovalStepStatus.Pending)
            .ToListAsync(cancellationToken);

        foreach (var pendingStep in pendingSteps)
        {
            pendingStep.Status = ApprovalStepStatus.Skipped;
        }

        var request = await _db.EquipmentRequests.FirstAsync(r => r.Id == step.RequestId, cancellationToken);
        request.Status = RequestStatus.Rejected;
        request.RejectedReason = step.Comment;
        await _db.SaveChangesAsync(cancellationToken);
    }

    private async Task HandleManagerApprovalAsync(ApprovalStep step, CancellationToken cancellationToken)
    {
        var request = await _db.EquipmentRequests.FirstAsync(r => r.Id == step.RequestId, cancellationToken);
        request.Status = RequestStatus.PendingProcurementApproval;

        var procurementManager = await _accessControl.FindProcurementManagerAsync(cancellationToken);
        if (procurementManager is null)
        {
            throw new BadRequestException("No procurement manager is configured to review this request");
        }

        _db.ApprovalSteps.Add(new ApprovalStep
        {
            RequestId = step.RequestId,
            Level = step.Level + 1,
            ApproverId = procurementManager.Id,
            ApproverRole = ApprovalRole.ProcurementManager,
            Status = ApprovalStepStatus.Pending,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        });

        await _db.SaveChangesAsync(cancellationToken);
    }

    private async Task HandleProcurementApprovalAsync(ApprovalStep step, CancellationToken cancellationToken)
    {
        var request = step.Request!;
        if (request.RequestType == RequestType.Loan)
        {
            await FulfillLoanRequestAsync(request, step, cancellationToken);
            return;
        }

        var trackedRequest = await _db.EquipmentRequests.FirstAsync(r => r.Id == request.Id, cancellationToken);
        trackedRequest.Status = RequestStatus.ProcurementApproved;
        await _db.SaveChangesAsync(cancellationToken);
    }

    private async Task FulfillLoanRequestAsync(
        EquipmentRequest request,
        ApprovalStep step,
        CancellationToken cancellationToken)
    {
        if (request.EquipmentModelId is null)
        {
            throw new BadRequestException("Loan request is missing an equipment model");
        }

        var availableAsset = await _db.EquipmentAssets
            .Include(asset => asset.EquipmentModel)
            .Where(asset => asset.EquipmentModelId == request.EquipmentModelId
                && asset.Status == EquipmentAssetStatus.Available)
            .OrderBy(asset => asset.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);

        if (availableAsset is null)
        {
            throw new BadRequestException("No available equipment assets for the requested model");
        }

        var now = DateTime.UtcNow;
        availableAsset.Status = EquipmentAssetStatus.InUse;
        availableAsset.AssignedEmployeeId = request.RequesterId;
        availableAsset.AssignedAt = now;
        availableAsset.ExpectedReturnDate = request.EndDate;

        _db.EquipmentAssignments.Add(new EquipmentAssignment
        {
            EquipmentAssetId = availableAsset.Id,
            EmployeeId = request.RequesterId,
            RequestId = request.Id,
            AssignedById = step.ApproverId,
            AssignedAt = now,
            ExpectedReturnDate = request.EndDate,
            Status = EquipmentAssignmentStatus.Active,
            CreatedAt = now,
            UpdatedAt = now,
        });

        var trackedRequest = await _db.EquipmentRequests.FirstAsync(r => r.Id == request.Id, cancellationToken);
        trackedRequest.Status = RequestStatus.Fulfilled;
        await _db.SaveChangesAsync(cancellationToken);
    }

    private async Task DispatchNotificationsAsync(
        ApprovalStep step,
        ApprovalStepStatus targetStatus,
        string? comment,
        CancellationToken cancellationToken)
    {
        var request = await _db.EquipmentRequests
            .Include(r => r.Requester)
            .Include(r => r.EquipmentModel)
            .Include(r => r.Category)
            .Include(r => r.ApprovalSteps)
                .ThenInclude(s => s.Approver)
            .FirstOrDefaultAsync(r => r.Id == step.RequestId, cancellationToken);

        if (request is null)
        {
            return;
        }

        if (targetStatus == ApprovalStepStatus.Rejected)
        {
            await _notificationService.NotifyRequestRejectedAsync(request.Requester, request, comment, cancellationToken);
            return;
        }

        if (step.ApproverRole == ApprovalRole.DirectManager)
        {
            var nextStep = request.ApprovalSteps
                .FirstOrDefault(approvalStep =>
                    approvalStep.ApproverRole == ApprovalRole.ProcurementManager
                    && approvalStep.Status == ApprovalStepStatus.Pending);

            if (nextStep?.Approver is not null)
            {
                await _notificationService.NotifyApprovalRequiredAsync(
                    nextStep.Approver,
                    request,
                    nextStep,
                    cancellationToken);
            }

            await _notificationService.NotifyRequestUpdateAsync(
                request.Requester,
                request,
                "Your request was approved by your manager and is awaiting procurement review.",
                cancellationToken);
            return;
        }

        if (request.RequestType == RequestType.Procurement)
        {
            await _notificationService.NotifyProcurementApprovedAsync(request.Requester, request, cancellationToken);
            return;
        }

        if (request.RequestType == RequestType.Loan && request.Status == RequestStatus.Fulfilled)
        {
            var assignment = await _db.EquipmentAssignments
                .Include(a => a.EquipmentAsset)
                    .ThenInclude(asset => asset.EquipmentModel)
                .FirstOrDefaultAsync(a => a.RequestId == request.Id, cancellationToken);

            if (assignment is not null)
            {
                await _notificationService.NotifyEquipmentAssignedAsync(
                    request.Requester,
                    request,
                    assignment,
                    cancellationToken);
            }

            await _notificationService.NotifyRequestApprovedAsync(request.Requester, request, cancellationToken);
            return;
        }

        if (request.Status == RequestStatus.Fulfilled)
        {
            await _notificationService.NotifyRequestApprovedAsync(request.Requester, request, cancellationToken);
        }
    }

    private Task<ApprovalStep?> LoadApprovalStepAsync(
        Guid stepId,
        bool includeAllSteps,
        CancellationToken cancellationToken)
    {
        var query = _db.ApprovalSteps
            .Include(step => step.Request!)
                .ThenInclude(request => request.Requester)
                    .ThenInclude(requester => requester.Department)
            .Include(step => step.Request!)
                .ThenInclude(request => request.EquipmentModel!)
                    .ThenInclude(model => model.Category)
            .Include(step => step.Request!)
                .ThenInclude(request => request.Category)
            .Include(step => step.Approver)
            .AsQueryable();

        if (includeAllSteps)
        {
            query = query
                .Include(step => step.Request!)
                    .ThenInclude(request => request.ApprovalSteps)
                        .ThenInclude(approvalStep => approvalStep.Approver);
        }

        return query.FirstOrDefaultAsync(step => step.Id == stepId, cancellationToken);
    }
}
