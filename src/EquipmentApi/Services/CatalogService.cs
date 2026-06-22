using EquipmentApi.Data;
using EquipmentApi.Entities;
using EquipmentApi.Enums;
using EquipmentApi.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace EquipmentApi.Services;

public class CatalogService
{
    private readonly AppDbContext _db;

    public CatalogService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<object>> GetCatalogAsync(CancellationToken cancellationToken = default)
    {
        var models = await _db.EquipmentModels
            .Include(model => model.Category)
            .OrderBy(model => model.Name)
            .ToListAsync(cancellationToken);

        var availableAssets = await _db.EquipmentAssets
            .Where(asset => asset.Status == EquipmentAssetStatus.Available)
            .Include(asset => asset.EquipmentModel)
                .ThenInclude(model => model.Category)
            .ToListAsync(cancellationToken);

        var availableModelIds = availableAssets
            .Select(asset => asset.EquipmentModelId)
            .ToHashSet();

        return models.Select(model => (object)MapModel(model, availableAssets, availableModelIds)).ToList();
    }

    public async Task<List<object>> FindSimilarAsync(
        string query,
        Guid? categoryId = null,
        CancellationToken cancellationToken = default)
    {
        var modelsQuery = _db.EquipmentModels
            .Include(model => model.Category)
            .Where(model => EF.Functions.ILike(model.Name, $"%{query}%"));

        if (categoryId is not null)
        {
            modelsQuery = modelsQuery.Where(model => model.CategoryId == categoryId);
        }

        var models = await modelsQuery
            .OrderBy(model => model.Name)
            .Take(10)
            .ToListAsync(cancellationToken);

        var availableAssets = await _db.EquipmentAssets
            .Where(asset => asset.Status == EquipmentAssetStatus.Available)
            .ToListAsync(cancellationToken);

        return models.Select(model =>
        {
            var availableCount = availableAssets.Count(asset => asset.EquipmentModelId == model.Id);
            return (object)MapModel(model, availableAssets, null, availableCount);
        }).ToList();
    }

    public async Task<object> FindModelByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var model = await _db.EquipmentModels
            .Include(m => m.Category)
            .Include(m => m.Assets)
            .FirstOrDefaultAsync(m => m.Id == id, cancellationToken);

        if (model is null)
        {
            throw new NotFoundException($"Equipment model with id \"{id}\" not found");
        }

        var availableCount = model.Assets.Count(asset => asset.Status == EquipmentAssetStatus.Available);
        return new
        {
            model.Id,
            model.Name,
            model.CategoryId,
            Category = model.Category,
            model.Description,
            model.DefaultValue,
            model.ProcurementYear,
            model.ReleaseYear,
            model.ExpectedLifespanMonths,
            model.LowStockThreshold,
            model.CreatedAt,
            model.UpdatedAt,
            Assets = model.Assets,
            availableCount,
        };
    }

    public async Task<List<object>> FindSimilarModelsAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var model = await _db.EquipmentModels
            .Include(m => m.Category)
            .FirstOrDefaultAsync(m => m.Id == id, cancellationToken);

        if (model is null)
        {
            throw new NotFoundException($"Equipment model with id \"{id}\" not found");
        }

        return await FindSimilarAsync(model.Name, model.CategoryId, cancellationToken);
    }

    private static object MapModel(
        EquipmentModel model,
        List<EquipmentAsset> availableAssets,
        HashSet<Guid>? availableModelIds,
        int? availableCountOverride = null)
    {
        var availableCount = availableCountOverride
            ?? availableAssets.Count(asset => asset.EquipmentModelId == model.Id);

        return new
        {
            model.Id,
            model.Name,
            model.CategoryId,
            Category = model.Category,
            model.Description,
            model.DefaultValue,
            model.ProcurementYear,
            model.ReleaseYear,
            model.ExpectedLifespanMonths,
            model.LowStockThreshold,
            model.CreatedAt,
            model.UpdatedAt,
            availableCount,
            isAvailable = availableModelIds?.Contains(model.Id) ?? availableCount > 0,
        };
    }
}
