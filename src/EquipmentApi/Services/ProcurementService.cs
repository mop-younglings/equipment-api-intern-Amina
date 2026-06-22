using EquipmentApi.Data;
using EquipmentApi.Enums;
using EquipmentApi.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace EquipmentApi.Services;

public class ProcurementService
{
    private readonly AppDbContext _db;

    public ProcurementService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<object> CheckAvailabilityAsync(Guid requestId, CancellationToken cancellationToken = default)
    {
        var request = await _db.EquipmentRequests
            .Include(r => r.EquipmentModel)
            .FirstOrDefaultAsync(r => r.Id == requestId, cancellationToken);

        if (request is null)
        {
            throw new NotFoundException("Request not found");
        }

        if (request.EquipmentModelId is null)
        {
            return new
            {
                requestId,
                availableCount = 0,
                assets = Array.Empty<object>(),
            };
        }

        var assets = await _db.EquipmentAssets
            .Where(asset => asset.EquipmentModelId == request.EquipmentModelId
                && asset.Status == EquipmentAssetStatus.Available)
            .Include(asset => asset.EquipmentModel)
            .ToListAsync(cancellationToken);

        return new
        {
            requestId,
            equipmentModelId = request.EquipmentModelId,
            availableCount = assets.Count,
            assets,
        };
    }
}
