using EquipmentApi.Auth;
using EquipmentApi.Constants;
using EquipmentApi.Data;
using EquipmentApi.Dtos;
using EquipmentApi.Entities;
using EquipmentApi.Enums;
using EquipmentApi.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace EquipmentApi.Services;

public class EquipmentAssetService
{
    private readonly AppDbContext _db;
    private readonly NotificationService _notificationService;
    private readonly AccessControlService _accessControl;

    public EquipmentAssetService(
        AppDbContext db,
        NotificationService notificationService,
        AccessControlService accessControl)
    {
        _db = db;
        _notificationService = notificationService;
        _accessControl = accessControl;
    }

    public Task<List<EquipmentAsset>> FindAllAsync(CancellationToken cancellationToken = default)
    {
        return _db.EquipmentAssets
            .Include(asset => asset.EquipmentModel)
                .ThenInclude(model => model.Category)
            .Include(asset => asset.AssignedEmployee)
            .Include(asset => asset.RetiredBy)
            .OrderByDescending(asset => asset.CreatedAt)
            .ToListAsync(cancellationToken);
    }

    public async Task<EquipmentAsset> FindOneAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var asset = await _db.EquipmentAssets
            .Include(a => a.EquipmentModel)
                .ThenInclude(model => model.Category)
            .Include(a => a.AssignedEmployee)
            .Include(a => a.RetiredBy)
            .Include(a => a.Assignments)
                .ThenInclude(assignment => assignment.Employee)
            .FirstOrDefaultAsync(a => a.Id == id, cancellationToken);

        if (asset is null)
        {
            throw new NotFoundException($"Equipment asset with id \"{id}\" not found");
        }

        return asset;
    }

    public async Task<EquipmentAsset> CreateAsync(
        CreateEquipmentAssetDto dto,
        CancellationToken cancellationToken = default)
    {
        var model = await LoadEquipmentModelAsync(dto.EquipmentModelId, cancellationToken);
        await AssertAssetTagAvailableAsync(dto.AssetTag, cancellationToken);

        var asset = new EquipmentAsset
        {
            EquipmentModelId = model.Id,
            AssetTag = dto.AssetTag,
            SerialNumber = dto.SerialNumber,
            Status = dto.Status ?? EquipmentAssetStatus.Available,
            Notes = dto.Notes,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        _db.EquipmentAssets.Add(asset);
        await _db.SaveChangesAsync(cancellationToken);
        asset.EquipmentModel = model;
        return asset;
    }

    public async Task<EquipmentAsset> UpdateAsync(
        Guid id,
        UpdateEquipmentAssetDto dto,
        CancellationToken cancellationToken = default)
    {
        var asset = await FindOneAsync(id, cancellationToken);

        if (dto.AssetTag is not null)
        {
            asset.AssetTag = dto.AssetTag;
        }

        if (dto.SerialNumber is not null)
        {
            asset.SerialNumber = dto.SerialNumber;
        }

        if (dto.Notes is not null)
        {
            asset.Notes = dto.Notes;
        }

        await _db.SaveChangesAsync(cancellationToken);
        return asset;
    }

    public async Task<EquipmentAsset> UpdateStatusAsync(
        Guid id,
        UpdateEquipmentAssetStatusDto dto,
        CancellationToken cancellationToken = default)
    {
        var asset = await FindOneAsync(id, cancellationToken);
        asset.Status = dto.Status;
        await _db.SaveChangesAsync(cancellationToken);
        return asset;
    }

    public async Task<EquipmentAssignment> AssignAsync(
        Guid id,
        AssignEquipmentAssetDto dto,
        AuthenticatedUser user,
        CancellationToken cancellationToken = default)
    {
        var asset = await FindOneAsync(id, cancellationToken);
        if (asset.Status != EquipmentAssetStatus.Available)
        {
            throw new BadRequestException("Only available assets can be assigned");
        }

        var employee = await _db.Employees
            .FirstOrDefaultAsync(e => e.Id == dto.EmployeeId, cancellationToken);
        if (employee is null)
        {
            throw new NotFoundException("Employee not found");
        }

        var now = DateTime.UtcNow;
        asset.Status = EquipmentAssetStatus.InUse;
        asset.AssignedEmployeeId = employee.Id;
        asset.AssignedAt = now;
        asset.ExpectedReturnDate = string.IsNullOrWhiteSpace(dto.ExpectedReturnDate)
            ? null
            : DateOnly.Parse(dto.ExpectedReturnDate);

        EquipmentRequest? request = null;
        if (dto.RequestId is not null)
        {
            request = await _db.EquipmentRequests
                .Include(r => r.Requester)
                .Include(r => r.EquipmentModel)
                .Include(r => r.Category)
                .FirstOrDefaultAsync(r => r.Id == dto.RequestId, cancellationToken);
        }

        var assignment = new EquipmentAssignment
        {
            EquipmentAssetId = asset.Id,
            EmployeeId = employee.Id,
            RequestId = request?.Id,
            AssignedById = user.Id,
            AssignedAt = now,
            ExpectedReturnDate = asset.ExpectedReturnDate,
            Status = EquipmentAssignmentStatus.Active,
            CreatedAt = now,
            UpdatedAt = now,
        };

        _db.EquipmentAssignments.Add(assignment);
        await _db.SaveChangesAsync(cancellationToken);

        if (request is not null && request.Status == RequestStatus.ProcurementApproved)
        {
            request.Status = RequestStatus.Fulfilled;
            await _db.SaveChangesAsync(cancellationToken);
            await _notificationService.NotifyEquipmentAssignedAsync(
                request.Requester,
                request,
                assignment,
                cancellationToken);
        }

        assignment.EquipmentAsset = asset;
        assignment.Employee = employee;
        assignment.Request = request;
        return assignment;
    }

    public async Task<EquipmentAsset> RetireAsync(
        Guid id,
        AuthenticatedUser user,
        CancellationToken cancellationToken = default)
    {
        var asset = await FindOneAsync(id, cancellationToken);
        if (asset.Status == EquipmentAssetStatus.Retired)
        {
            return asset;
        }

        asset.Status = EquipmentAssetStatus.Retired;
        asset.RetiredAt = DateTime.UtcNow;
        asset.RetiredById = user.Id;
        asset.AssignedEmployeeId = null;
        asset.AssignedAt = null;
        asset.ExpectedReturnDate = null;

        await _db.SaveChangesAsync(cancellationToken);
        return asset;
    }

    public async Task RemoveAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var asset = await FindOneAsync(id, cancellationToken);

        if (asset.Status == EquipmentAssetStatus.Retired)
        {
            if (asset.RetiredAt is not null)
            {
                var graceEnd = asset.RetiredAt.Value.AddDays(WorkflowConstants.RetireGracePeriodDays);
                if (DateTime.UtcNow < graceEnd)
                {
                    throw new BadRequestException(
                        $"Retired assets can only be hard-deleted after {WorkflowConstants.RetireGracePeriodDays} days");
                }
            }
        }
        else if (await HasHistoryAsync(asset.Id, cancellationToken))
        {
            throw new BadRequestException(
                "Assets with assignment, request, or procurement history must be retired instead of deleted");
        }
        else if (asset.Status is not EquipmentAssetStatus.Available and not EquipmentAssetStatus.Maintenance)
        {
            throw new BadRequestException(
                "Only unused available or maintenance assets without history can be hard-deleted");
        }

        _db.EquipmentAssets.Remove(asset);
        await _db.SaveChangesAsync(cancellationToken);
    }

    public Task<bool> HasHistoryAsync(Guid assetId, CancellationToken cancellationToken = default)
    {
        return _db.EquipmentAssignments.AnyAsync(
            assignment => assignment.EquipmentAssetId == assetId,
            cancellationToken);
    }

    public async Task<object> GetInventoryStatsAsync(CancellationToken cancellationToken = default)
    {
        var assets = await _db.EquipmentAssets
            .Include(asset => asset.EquipmentModel)
            .ToListAsync(cancellationToken);

        var byStatus = assets
            .GroupBy(asset => asset.Status)
            .ToDictionary(group => group.Key, group => group.Count());

        var models = await _db.EquipmentModels.ToListAsync(cancellationToken);
        var lowStock = models
            .Select(model => new
            {
                model.Id,
                model.Name,
                AvailableCount = assets.Count(asset =>
                    asset.EquipmentModelId == model.Id
                    && asset.Status == EquipmentAssetStatus.Available),
                model.LowStockThreshold,
            })
            .Where(model => model.AvailableCount <= model.LowStockThreshold)
            .ToList();

        return new
        {
            totalAssets = assets.Count,
            byStatus,
            lowStockModels = lowStock,
        };
    }

    public void AssertProcurementAccess(AuthenticatedUser user)
    {
        if (!_accessControl.IsProcurementManagerOrAbove(user))
        {
            throw new ForbiddenException("Procurement manager access required");
        }
    }

    private async Task<EquipmentModel> LoadEquipmentModelAsync(Guid id, CancellationToken cancellationToken)
    {
        var model = await _db.EquipmentModels.FirstOrDefaultAsync(m => m.Id == id, cancellationToken);
        if (model is null)
        {
            throw new NotFoundException("Equipment model not found");
        }

        return model;
    }

    private async Task AssertAssetTagAvailableAsync(string assetTag, CancellationToken cancellationToken)
    {
        var existing = await _db.EquipmentAssets.AnyAsync(asset => asset.AssetTag == assetTag, cancellationToken);
        if (existing)
        {
            throw new ConflictException("Asset tag already exists");
        }
    }
}
