using EquipmentApi.Authorization;
using EquipmentApi.Enums;
using EquipmentApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EquipmentApi.Controllers;

[ApiController]
[Route("equipment")]
public class CatalogController : ControllerBase
{
    private readonly CatalogService _catalogService;

    public CatalogController(CatalogService catalogService)
    {
        _catalogService = catalogService;
    }

    [HttpGet("catalog")]
    public Task<List<object>> GetCatalog(CancellationToken cancellationToken) =>
        _catalogService.GetCatalogAsync(cancellationToken);

    [HttpGet("catalog/similar")]
    public Task<List<object>> FindSimilar(
        [FromQuery] string? q,
        [FromQuery] Guid? categoryId,
        CancellationToken cancellationToken) =>
        _catalogService.FindSimilarAsync(q ?? string.Empty, categoryId, cancellationToken);

    [Authorize]
    [MinRole(EmployeeRole.ProcurementManager)]
    [HttpGet("models/{id:guid}/similar")]
    public Task<List<object>> FindSimilarModels(Guid id, CancellationToken cancellationToken) =>
        _catalogService.FindSimilarModelsAsync(id, cancellationToken);

    [HttpGet("models/{id:guid}")]
    public Task<object> FindModel(Guid id, CancellationToken cancellationToken) =>
        _catalogService.FindModelByIdAsync(id, cancellationToken);
}
