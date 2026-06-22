using EquipmentApi.Data;
using EquipmentApi.Entities;
using EquipmentApi.Enums;
using Microsoft.EntityFrameworkCore;

namespace EquipmentApi.Services;

public class ApprovalWorkflowService
{
    public async Task<ApprovalStep> CreateInitialManagerApprovalStepAsync(
        AppDbContext db,
        EquipmentRequest request,
        Employee directManager,
        CancellationToken cancellationToken = default)
    {
        var managerStep = new ApprovalStep
        {
            RequestId = request.Id,
            Level = 1,
            ApproverId = directManager.Id,
            ApproverRole = ApprovalRole.DirectManager,
            Status = ApprovalStepStatus.Pending,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        db.ApprovalSteps.Add(managerStep);
        await db.SaveChangesAsync(cancellationToken);
        managerStep.Approver = directManager;
        return managerStep;
    }
}
