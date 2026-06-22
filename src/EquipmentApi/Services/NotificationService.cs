using EquipmentApi.Data;
using EquipmentApi.Entities;
using EquipmentApi.Enums;
using EquipmentApi.Json;
using EquipmentApi.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace EquipmentApi.Services;

public class NotificationService
{
    private readonly AppDbContext _db;

    public NotificationService(AppDbContext db)
    {
        _db = db;
    }

    public Task<List<Notification>> FindAllForUserAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        return _db.Notifications
            .Where(n => n.RecipientId == userId)
            .Include(n => n.Request!)
                .ThenInclude(r => r.EquipmentModel)
            .Include(n => n.Request!)
                .ThenInclude(r => r.Category)
            .Include(n => n.ApprovalStep)
            .Include(n => n.EquipmentAssignment!)
                .ThenInclude(a => a.EquipmentAsset)
                    .ThenInclude(asset => asset.EquipmentModel)
            .OrderByDescending(n => n.CreatedAt)
            .ToListAsync(cancellationToken);
    }

    public Task<int> CountUnreadForUserAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        return _db.Notifications.CountAsync(
            n => n.RecipientId == userId && !n.IsRead,
            cancellationToken);
    }

    public async Task<Notification> MarkAsReadAsync(
        Guid id,
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        var notification = await _db.Notifications
            .Include(n => n.Request)
            .Include(n => n.ApprovalStep)
            .Include(n => n.EquipmentAssignment)
            .FirstOrDefaultAsync(n => n.Id == id && n.RecipientId == userId, cancellationToken);

        if (notification is null)
        {
            throw new NotFoundException($"Notification with id \"{id}\" not found");
        }

        if (!notification.IsRead)
        {
            notification.IsRead = true;
            notification.ReadAt = DateTime.UtcNow;
            await _db.SaveChangesAsync(cancellationToken);
        }

        return notification;
    }

    public async Task MarkAllAsReadAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        await _db.Notifications
            .Where(n => n.RecipientId == userId && !n.IsRead)
            .ExecuteUpdateAsync(
                setters => setters
                    .SetProperty(n => n.IsRead, true)
                    .SetProperty(n => n.ReadAt, now),
                cancellationToken);
    }

    public async Task<Notification> CreateNotificationAsync(
        Employee recipient,
        NotificationType type,
        string title,
        string message,
        EquipmentRequest? request = null,
        ApprovalStep? approvalStep = null,
        EquipmentAssignment? equipmentAssignment = null,
        CancellationToken cancellationToken = default)
    {
        var notification = new Notification
        {
            RecipientId = recipient.Id,
            Type = type,
            Title = title,
            Message = message,
            RequestId = request?.Id,
            ApprovalStepId = approvalStep?.Id,
            EquipmentAssignmentId = equipmentAssignment?.Id,
            IsRead = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        _db.Notifications.Add(notification);
        await _db.SaveChangesAsync(cancellationToken);
        notification.Recipient = recipient;
        notification.Request = request;
        notification.ApprovalStep = approvalStep;
        notification.EquipmentAssignment = equipmentAssignment;
        return notification;
    }

    private static string GetRequestLabel(EquipmentRequest request) =>
        request.EquipmentModel?.Name
        ?? request.RequestedItemName
        ?? "equipment request";

    public Task<Notification> NotifyApprovalRequiredAsync(
        Employee recipient,
        EquipmentRequest request,
        ApprovalStep approvalStep,
        CancellationToken cancellationToken = default)
    {
        var requesterName = $"{request.Requester.FirstName} {request.Requester.LastName}";
        var label = GetRequestLabel(request);

        return CreateNotificationAsync(
            recipient,
            NotificationType.ApprovalRequired,
            $"Approval required: {label}",
            $"{requesterName} submitted a {EnumJsonHelper.ToEnumMemberValue(request.RequestType)} request for {label} and needs your approval.",
            request,
            approvalStep,
            cancellationToken: cancellationToken);
    }

    public Task<Notification> NotifyRequestApprovedAsync(
        Employee recipient,
        EquipmentRequest request,
        CancellationToken cancellationToken = default)
    {
        var label = GetRequestLabel(request);
        return CreateNotificationAsync(
            recipient,
            NotificationType.RequestApproved,
            $"Request fulfilled: {label}",
            $"Your request for {label} has been fulfilled.",
            request,
            cancellationToken: cancellationToken);
    }

    public Task<Notification> NotifyRequestRejectedAsync(
        Employee recipient,
        EquipmentRequest request,
        string? comment = null,
        CancellationToken cancellationToken = default)
    {
        var label = GetRequestLabel(request);
        var suffix = string.IsNullOrWhiteSpace(comment) ? string.Empty : $" Reason: {comment}";
        return CreateNotificationAsync(
            recipient,
            NotificationType.RequestRejected,
            $"Request rejected: {label}",
            $"Your request for {label} was rejected.{suffix}",
            request,
            cancellationToken: cancellationToken);
    }

    public Task<Notification> NotifyRequestCancelledAsync(
        Employee recipient,
        EquipmentRequest request,
        CancellationToken cancellationToken = default)
    {
        var label = GetRequestLabel(request);
        return CreateNotificationAsync(
            recipient,
            NotificationType.RequestCancelled,
            $"Request cancelled: {label}",
            $"Your request for {label} was cancelled.",
            request,
            cancellationToken: cancellationToken);
    }

    public Task<Notification> NotifyRequestUpdateAsync(
        Employee recipient,
        EquipmentRequest request,
        string message,
        CancellationToken cancellationToken = default)
    {
        var label = GetRequestLabel(request);
        return CreateNotificationAsync(
            recipient,
            NotificationType.RequestUpdate,
            $"Request update: {label}",
            message,
            request,
            cancellationToken: cancellationToken);
    }

    public Task<Notification> NotifyProcurementApprovedAsync(
        Employee recipient,
        EquipmentRequest request,
        CancellationToken cancellationToken = default)
    {
        var label = GetRequestLabel(request);
        return CreateNotificationAsync(
            recipient,
            NotificationType.ProcurementApproved,
            $"Procurement approved: {label}",
            $"External procurement was approved for {label}. Equipment will be added to inventory and assigned when ready.",
            request,
            cancellationToken: cancellationToken);
    }

    public Task<Notification> NotifyEquipmentAssignedAsync(
        Employee recipient,
        EquipmentRequest request,
        EquipmentAssignment assignment,
        CancellationToken cancellationToken = default)
    {
        var label = GetRequestLabel(request);
        return CreateNotificationAsync(
            recipient,
            NotificationType.EquipmentAssigned,
            $"Equipment assigned: {label}",
            $"Equipment has been assigned to you for {label}.",
            request,
            equipmentAssignment: assignment,
            cancellationToken: cancellationToken);
    }

    public Task<Notification> NotifyEquipmentReturnRequestedAsync(
        Employee recipient,
        EquipmentAssignment assignment,
        string returnByDate,
        string? message = null,
        CancellationToken cancellationToken = default)
    {
        var modelName = assignment.EquipmentAsset?.EquipmentModel?.Name ?? "assigned equipment";
        return CreateNotificationAsync(
            recipient,
            NotificationType.EquipmentReturnRequested,
            $"Return requested: {modelName}",
            message ?? $"Your manager requested that you return {modelName} by {returnByDate}.",
            equipmentAssignment: assignment,
            cancellationToken: cancellationToken);
    }

    public Task<Notification> NotifyEquipmentReturnedAsync(
        Employee recipient,
        EquipmentAssignment assignment,
        CancellationToken cancellationToken = default)
    {
        var modelName = assignment.EquipmentAsset?.EquipmentModel?.Name ?? "equipment";
        return CreateNotificationAsync(
            recipient,
            NotificationType.EquipmentReturned,
            $"Equipment returned: {modelName}",
            $"{modelName} has been marked as returned.",
            equipmentAssignment: assignment,
            cancellationToken: cancellationToken);
    }
}
