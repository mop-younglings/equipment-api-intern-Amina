using EquipmentApi.Auth;
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
[Route("equipment-assignments")]
public class EquipmentAssignmentController : ControllerBase
{
    private readonly EquipmentAssignmentService _assignmentService;

    public EquipmentAssignmentController(EquipmentAssignmentService assignmentService)
    {
        _assignmentService = assignmentService;
    }

    [HttpGet("my")]
    public Task<List<EquipmentAssignment>> FindMy(CancellationToken cancellationToken) =>
        _assignmentService.FindMyAssignmentsAsync(User.GetAuthenticatedUser().Id, cancellationToken);

    [MinRole(EmployeeRole.DirectManager)]
    [HttpPost("{id:guid}/return-request")]
    public Task<EquipmentAssignment> RequestReturn(
        Guid id,
        [FromBody] ReturnRequestDto dto,
        CancellationToken cancellationToken) =>
        _assignmentService.RequestReturnAsync(id, User.GetAuthenticatedUser(), dto, cancellationToken);

    [HttpPatch("{id:guid}/complete-return")]
    public Task<EquipmentAssignment> CompleteReturn(Guid id, CancellationToken cancellationToken) =>
        _assignmentService.CompleteReturnAsync(id, User.GetAuthenticatedUser(), cancellationToken);

    [HttpGet("{id:guid}")]
    public Task<EquipmentAssignment> FindOne(Guid id, CancellationToken cancellationToken) =>
        _assignmentService.FindOneAsync(id, User.GetAuthenticatedUser(), cancellationToken);
}

[ApiController]
[Authorize]
[MinRole(EmployeeRole.DirectManager)]
[Route("manager")]
public class ManagerController : ControllerBase
{
    private readonly EquipmentAssignmentService _assignmentService;
    private readonly RequestService _requestService;

    public ManagerController(
        EquipmentAssignmentService assignmentService,
        RequestService requestService)
    {
        _assignmentService = assignmentService;
        _requestService = requestService;
    }

    [HttpGet("requests/pending")]
    public Task<List<EquipmentRequest>> PendingRequests(CancellationToken cancellationToken) =>
        _requestService.FindManagerPendingAsync(User.GetAuthenticatedUser(), cancellationToken);

    [HttpGet("requests")]
    public Task<List<EquipmentRequest>> AllRequests(CancellationToken cancellationToken) =>
        _requestService.FindManagerRequestsAsync(User.GetAuthenticatedUser(), cancellationToken);

    [HttpGet("team-equipment")]
    public Task<List<EquipmentAssignment>> TeamEquipment(CancellationToken cancellationToken) =>
        _assignmentService.FindTeamEquipmentAsync(User.GetAuthenticatedUser(), cancellationToken);
}
