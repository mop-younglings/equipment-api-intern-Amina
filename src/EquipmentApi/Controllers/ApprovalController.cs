using EquipmentApi.Auth;
using EquipmentApi.Dtos;
using EquipmentApi.Entities;
using EquipmentApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EquipmentApi.Controllers;

[ApiController]
[Authorize]
[Route("approvals")]
public class ApprovalController : ControllerBase
{
    private readonly ApprovalService _approvalService;

    public ApprovalController(ApprovalService approvalService)
    {
        _approvalService = approvalService;
    }

    [HttpGet("my")]
    public Task<List<ApprovalStep>> FindMy(CancellationToken cancellationToken) =>
        _approvalService.FindMyPendingAsync(User.GetAuthenticatedUser().Id, cancellationToken);

    [HttpPatch("{stepId:guid}/approve")]
    public Task<ApprovalStep> Approve(
        Guid stepId,
        [FromBody] ApprovalActionDto dto,
        CancellationToken cancellationToken) =>
        _approvalService.ApproveAsync(stepId, User.GetAuthenticatedUser(), dto, cancellationToken);

    [HttpPatch("{stepId:guid}/reject")]
    public Task<ApprovalStep> Reject(
        Guid stepId,
        [FromBody] ApprovalActionDto dto,
        CancellationToken cancellationToken) =>
        _approvalService.RejectAsync(stepId, User.GetAuthenticatedUser(), dto, cancellationToken);

    [HttpGet("{id:guid}")]
    public Task<ApprovalStep> FindOne(Guid id, CancellationToken cancellationToken) =>
        _approvalService.FindOneAsync(id, User.GetAuthenticatedUser(), cancellationToken);
}
