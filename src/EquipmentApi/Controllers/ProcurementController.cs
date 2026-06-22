using EquipmentApi.Authorization;
using EquipmentApi.Enums;
using EquipmentApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EquipmentApi.Controllers;

[ApiController]
[Authorize]
[MinRole(EmployeeRole.ProcurementManager)]
[Route("procurement")]
public class ProcurementController : ControllerBase
{
    private readonly ProcurementService _procurementService;
    private readonly RequestService _requestService;

    public ProcurementController(ProcurementService procurementService, RequestService requestService)
    {
        _procurementService = procurementService;
        _requestService = requestService;
    }

    [HttpGet("approvals")]
    public Task<List<Entities.EquipmentRequest>> PendingApprovals(CancellationToken cancellationToken) =>
        _requestService.FindProcurementPendingAsync(cancellationToken);

    [HttpGet("requests/{id:guid}/availability")]
    public Task<object> CheckAvailability(Guid id, CancellationToken cancellationToken) =>
        _procurementService.CheckAvailabilityAsync(id, cancellationToken);
}
