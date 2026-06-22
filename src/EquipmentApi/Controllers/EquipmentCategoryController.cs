using EquipmentApi.Authorization;
using EquipmentApi.Dtos;
using EquipmentApi.Entities;
using EquipmentApi.Enums;
using EquipmentApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EquipmentApi.Controllers;

[ApiController]
[Route("equipment-categories")]
public class EquipmentCategoryController : ControllerBase
{
    private readonly EquipmentCategoryService _categoryService;

    public EquipmentCategoryController(EquipmentCategoryService categoryService)
    {
        _categoryService = categoryService;
    }

    [HttpGet]
    public Task<List<EquipmentCategory>> FindAll(CancellationToken cancellationToken) =>
        _categoryService.FindAllAsync(cancellationToken);

    [Authorize]
    [MinRole(EmployeeRole.ProcurementManager)]
    [HttpPost]
    public Task<EquipmentCategory> Create(
        [FromBody] CreateEquipmentCategoryDto dto,
        CancellationToken cancellationToken) =>
        _categoryService.CreateAsync(dto, cancellationToken);
}
