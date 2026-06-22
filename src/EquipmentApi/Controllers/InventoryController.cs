using EquipmentApi.Auth;
using EquipmentApi.Authorization;
using EquipmentApi.Dtos;
using EquipmentApi.Enums;
using EquipmentApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EquipmentApi.Controllers;

[ApiController]
[Authorize]
[MinRole(EmployeeRole.ProcurementManager)]
public class InventoryController : ControllerBase
{
    private readonly EquipmentAssetService _assetService;
    private readonly EquipmentModelService _modelService;

    public InventoryController(EquipmentAssetService assetService, EquipmentModelService modelService)
    {
        _assetService = assetService;
        _modelService = modelService;
    }

    [HttpGet("inventory")]
    public Task<List<Entities.EquipmentAsset>> GetInventory(CancellationToken cancellationToken) =>
        _assetService.FindAllAsync(cancellationToken);

    [HttpGet("inventory/stats")]
    public Task<object> GetStats(CancellationToken cancellationToken) =>
        _assetService.GetInventoryStatsAsync(cancellationToken);

    [HttpGet("equipment-models")]
    public Task<List<Entities.EquipmentModel>> FindModels(CancellationToken cancellationToken) =>
        _modelService.FindAllAsync(cancellationToken);

    [HttpPost("equipment-models")]
    public Task<Entities.EquipmentModel> CreateModel(
        [FromBody] CreateEquipmentModelDto dto,
        CancellationToken cancellationToken) =>
        _modelService.CreateAsync(dto, cancellationToken);

    [HttpPatch("equipment-models/{id:guid}")]
    public Task<Entities.EquipmentModel> UpdateModel(
        Guid id,
        [FromBody] UpdateEquipmentModelDto dto,
        CancellationToken cancellationToken) =>
        _modelService.UpdateAsync(id, dto, cancellationToken);

    [HttpGet("equipment-assets")]
    public Task<List<Entities.EquipmentAsset>> FindAssets(CancellationToken cancellationToken) =>
        _assetService.FindAllAsync(cancellationToken);

    [HttpPost("equipment-assets")]
    public Task<Entities.EquipmentAsset> CreateAsset(
        [FromBody] CreateEquipmentAssetDto dto,
        CancellationToken cancellationToken) =>
        _assetService.CreateAsync(dto, cancellationToken);

    [HttpPatch("equipment-assets/{id:guid}")]
    public Task<Entities.EquipmentAsset> UpdateAsset(
        Guid id,
        [FromBody] UpdateEquipmentAssetDto dto,
        CancellationToken cancellationToken) =>
        _assetService.UpdateAsync(id, dto, cancellationToken);

    [HttpPatch("equipment-assets/{id:guid}/status")]
    public Task<Entities.EquipmentAsset> UpdateAssetStatus(
        Guid id,
        [FromBody] UpdateEquipmentAssetStatusDto dto,
        CancellationToken cancellationToken) =>
        _assetService.UpdateStatusAsync(id, dto, cancellationToken);

    [HttpPost("equipment-assets/{id:guid}/assign")]
    public Task<Entities.EquipmentAssignment> AssignAsset(
        Guid id,
        [FromBody] AssignEquipmentAssetDto dto,
        CancellationToken cancellationToken) =>
        _assetService.AssignAsync(id, dto, User.GetAuthenticatedUser(), cancellationToken);

    [HttpDelete("equipment-assets/{id:guid}")]
    public async Task<IActionResult> DeleteAsset(Guid id, CancellationToken cancellationToken)
    {
        await _assetService.RemoveAsync(id, cancellationToken);
        return NoContent();
    }

    [HttpPatch("equipment-assets/{id:guid}/retire")]
    public Task<Entities.EquipmentAsset> RetireAsset(Guid id, CancellationToken cancellationToken) =>
        _assetService.RetireAsync(id, User.GetAuthenticatedUser(), cancellationToken);
}
