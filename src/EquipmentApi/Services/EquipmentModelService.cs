using EquipmentApi.Data;
using EquipmentApi.Dtos;
using EquipmentApi.Entities;
using EquipmentApi.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace EquipmentApi.Services;

public class EquipmentModelService
{
    private readonly AppDbContext _db;

    public EquipmentModelService(AppDbContext db)
    {
        _db = db;
    }

    public Task<List<EquipmentModel>> FindAllAsync(CancellationToken cancellationToken = default)
    {
        return _db.EquipmentModels
            .Include(model => model.Category)
            .OrderBy(model => model.Name)
            .ToListAsync(cancellationToken);
    }

    public async Task<EquipmentModel> FindOneAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var model = await _db.EquipmentModels
            .Include(m => m.Category)
            .Include(m => m.Assets)
            .FirstOrDefaultAsync(m => m.Id == id, cancellationToken);

        if (model is null)
        {
            throw new NotFoundException($"Equipment model with id \"{id}\" not found");
        }

        return model;
    }

    public async Task<EquipmentModel> CreateAsync(
        CreateEquipmentModelDto dto,
        CancellationToken cancellationToken = default)
    {
        var category = await _db.EquipmentCategories
            .FirstOrDefaultAsync(c => c.Id == dto.CategoryId, cancellationToken);
        if (category is null)
        {
            throw new NotFoundException("Category not found");
        }

        var model = new EquipmentModel
        {
            Name = dto.Name,
            CategoryId = category.Id,
            Description = dto.Description,
            DefaultValue = dto.DefaultValue ?? 0,
            ProcurementYear = dto.ProcurementYear,
            ReleaseYear = dto.ReleaseYear,
            ExpectedLifespanMonths = dto.ExpectedLifespanMonths,
            LowStockThreshold = dto.LowStockThreshold ?? 1,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        _db.EquipmentModels.Add(model);
        await _db.SaveChangesAsync(cancellationToken);
        model.Category = category;
        return model;
    }

    public async Task<EquipmentModel> UpdateAsync(
        Guid id,
        UpdateEquipmentModelDto dto,
        CancellationToken cancellationToken = default)
    {
        var model = await FindOneAsync(id, cancellationToken);

        if (dto.CategoryId is not null)
        {
            var category = await _db.EquipmentCategories
                .FirstOrDefaultAsync(c => c.Id == dto.CategoryId, cancellationToken);
            if (category is null)
            {
                throw new NotFoundException("Category not found");
            }

            model.CategoryId = category.Id;
            model.Category = category;
        }

        if (dto.Name is not null)
        {
            model.Name = dto.Name;
        }

        if (dto.Description is not null)
        {
            model.Description = dto.Description;
        }

        if (dto.DefaultValue is not null)
        {
            model.DefaultValue = dto.DefaultValue.Value;
        }

        if (dto.ProcurementYear is not null)
        {
            model.ProcurementYear = dto.ProcurementYear;
        }

        if (dto.ReleaseYear is not null)
        {
            model.ReleaseYear = dto.ReleaseYear;
        }

        if (dto.ExpectedLifespanMonths is not null)
        {
            model.ExpectedLifespanMonths = dto.ExpectedLifespanMonths;
        }

        if (dto.LowStockThreshold is not null)
        {
            model.LowStockThreshold = dto.LowStockThreshold.Value;
        }

        await _db.SaveChangesAsync(cancellationToken);
        return model;
    }
}
