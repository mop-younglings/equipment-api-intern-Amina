using EquipmentApi.Auth;
using EquipmentApi.Entities;
using EquipmentApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EquipmentApi.Controllers;

[ApiController]
[Authorize]
[Route("notifications")]
public class NotificationController : ControllerBase
{
    private readonly NotificationService _notificationService;

    public NotificationController(NotificationService notificationService)
    {
        _notificationService = notificationService;
    }

    [HttpGet]
    public Task<List<Notification>> FindAll(CancellationToken cancellationToken) =>
        _notificationService.FindAllForUserAsync(User.GetAuthenticatedUser().Id, cancellationToken);

    [HttpGet("unread-count")]
    public async Task<object> UnreadCount(CancellationToken cancellationToken)
    {
        var count = await _notificationService.CountUnreadForUserAsync(
            User.GetAuthenticatedUser().Id,
            cancellationToken);
        return new { count };
    }

    [HttpPatch("read-all")]
    public async Task<IActionResult> MarkAllAsRead(CancellationToken cancellationToken)
    {
        await _notificationService.MarkAllAsReadAsync(User.GetAuthenticatedUser().Id, cancellationToken);
        return NoContent();
    }

    [HttpPatch("{id:guid}/read")]
    public Task<Notification> MarkAsRead(Guid id, CancellationToken cancellationToken) =>
        _notificationService.MarkAsReadAsync(id, User.GetAuthenticatedUser().Id, cancellationToken);
}
