using EquipmentApi.Auth;
using EquipmentApi.Dtos;
using EquipmentApi.Entities;
using EquipmentApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EquipmentApi.Controllers;

[ApiController]
[Authorize]
[Route("requests")]
public class RequestController : ControllerBase
{
    private readonly RequestService _requestService;

    public RequestController(RequestService requestService)
    {
        _requestService = requestService;
    }

    [HttpPost]
    public Task<EquipmentRequest> Create([FromBody] CreateRequestDto dto, CancellationToken cancellationToken) =>
        _requestService.CreateAsync(dto, User.GetAuthenticatedUser(), cancellationToken);

    [HttpGet("my")]
    public Task<List<EquipmentRequest>> FindMy(CancellationToken cancellationToken) =>
        _requestService.FindMyRequestsAsync(User.GetAuthenticatedUser().Id, cancellationToken);

    [HttpGet("{id:guid}/timeline")]
    public Task<object> Timeline(Guid id, CancellationToken cancellationToken) =>
        _requestService.GetTimelineAsync(id, User.GetAuthenticatedUser(), cancellationToken);

    [HttpPatch("{id:guid}/cancel")]
    public Task<EquipmentRequest> Cancel(
        Guid id,
        [FromBody] CancelRequestDto dto,
        CancellationToken cancellationToken) =>
        _requestService.CancelAsync(id, User.GetAuthenticatedUser(), dto, cancellationToken);

    [HttpGet("{id:guid}")]
    public Task<EquipmentRequest> FindOne(Guid id, CancellationToken cancellationToken) =>
        _requestService.FindOneAsync(id, User.GetAuthenticatedUser(), cancellationToken);
}
