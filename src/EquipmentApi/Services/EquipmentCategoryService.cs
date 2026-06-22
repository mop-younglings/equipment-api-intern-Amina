using EquipmentApi.Data;
using EquipmentApi.Dtos;
using EquipmentApi.Entities;
using EquipmentApi.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace EquipmentApi.Services;

public class EquipmentCategoryService
{
    private readonly AppDbContext _db;

    public EquipmentCategoryService(AppDbContext db)
    {
        _db = db;
    }

    public Task<List<EquipmentCategory>> FindAllAsync(CancellationToken cancellationToken = default)
    {
        return _db.EquipmentCategories
            .OrderBy(category => category.Name)
            .ToListAsync(cancellationToken);
    }

    public async Task<EquipmentCategory> FindOneAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var category = await _db.EquipmentCategories
            .FirstOrDefaultAsync(c => c.Id == id, cancellationToken);

        if (category is null)
        {
            throw new NotFoundException($"Category with id \"{id}\" not found");
        }

        return category;
    }

    public async Task<EquipmentCategory> CreateAsync(
        CreateEquipmentCategoryDto dto,
        CancellationToken cancellationToken = default)
    {
        var category = new EquipmentCategory
        {
            Name = dto.Name,
            Description = dto.Description,
            CategoryImage = dto.CategoryImage,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        _db.EquipmentCategories.Add(category);
        await _db.SaveChangesAsync(cancellationToken);
        return category;
    }
}
