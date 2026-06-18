import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApprovalStep } from '../../approval/entities/approval-step.entity';
import { Employee } from '../../employee/entities/employee.entity';
import { EquipmentAssignment } from '../../equipment-assignment/entities/equipment-assignment.entity';
import { EquipmentRequest } from '../../request/entities/equipment-request.entity';
import { Notification } from '../entities/notification.entity';
import { NotificationType } from '../enums/notification-type.enum';

interface CreateNotificationInput {
  recipient: Employee;
  type: NotificationType;
  title: string;
  message: string;
  request?: EquipmentRequest;
  approvalStep?: ApprovalStep;
  equipmentAssignment?: EquipmentAssignment;
}

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {}

  findAllForUser(userId: string): Promise<Notification[]> {
    return this.notificationRepository.find({
      where: { recipient: { id: userId } },
      relations: {
        request: { equipmentModel: true, category: true },
        approvalStep: true,
        equipmentAssignment: { equipmentAsset: { equipmentModel: true } },
      },
      order: { createdAt: 'DESC' },
    });
  }

  countUnreadForUser(userId: string): Promise<number> {
    return this.notificationRepository.count({
      where: { recipient: { id: userId }, isRead: false },
    });
  }

  async markAsRead(id: string, userId: string): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { id, recipient: { id: userId } },
      relations: {
        request: true,
        approvalStep: true,
        equipmentAssignment: true,
      },
    });

    if (!notification) {
      throw new NotFoundException(`Notification with id "${id}" not found`);
    }

    if (!notification.isRead) {
      notification.isRead = true;
      notification.readAt = new Date();
      return this.notificationRepository.save(notification);
    }

    return notification;
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationRepository.update(
      { recipient: { id: userId }, isRead: false },
      { isRead: true, readAt: new Date() },
    );
  }

  createNotification(input: CreateNotificationInput): Promise<Notification> {
    const notification = this.notificationRepository.create({
      recipient: input.recipient,
      type: input.type,
      title: input.title,
      message: input.message,
      request: input.request,
      approvalStep: input.approvalStep,
      equipmentAssignment: input.equipmentAssignment,
      isRead: false,
    });

    return this.notificationRepository.save(notification);
  }

  private getRequestLabel(request: EquipmentRequest): string {
    return (
      request.equipmentModel?.name ??
      request.requestedItemName ??
      'equipment request'
    );
  }

  notifyApprovalRequired(
    recipient: Employee,
    request: EquipmentRequest,
    approvalStep: ApprovalStep,
  ): Promise<Notification> {
    const requesterName = `${request.requester.firstName} ${request.requester.lastName}`;
    const label = this.getRequestLabel(request);

    return this.createNotification({
      recipient,
      type: NotificationType.APPROVAL_REQUIRED,
      title: `Approval required: ${label}`,
      message: `${requesterName} submitted a ${request.requestType} request for ${label} and needs your approval.`,
      request,
      approvalStep,
    });
  }

  notifyRequestApproved(
    recipient: Employee,
    request: EquipmentRequest,
  ): Promise<Notification> {
    const label = this.getRequestLabel(request);
    return this.createNotification({
      recipient,
      type: NotificationType.REQUEST_APPROVED,
      title: `Request fulfilled: ${label}`,
      message: `Your request for ${label} has been fulfilled.`,
      request,
    });
  }

  notifyRequestRejected(
    recipient: Employee,
    request: EquipmentRequest,
    comment?: string,
  ): Promise<Notification> {
    const label = this.getRequestLabel(request);
    const suffix = comment ? ` Reason: ${comment}` : '';
    return this.createNotification({
      recipient,
      type: NotificationType.REQUEST_REJECTED,
      title: `Request rejected: ${label}`,
      message: `Your request for ${label} was rejected.${suffix}`,
      request,
    });
  }

  notifyRequestCancelled(
    recipient: Employee,
    request: EquipmentRequest,
  ): Promise<Notification> {
    const label = this.getRequestLabel(request);
    return this.createNotification({
      recipient,
      type: NotificationType.REQUEST_CANCELLED,
      title: `Request cancelled: ${label}`,
      message: `Your request for ${label} was cancelled.`,
      request,
    });
  }

  notifyRequestUpdate(
    recipient: Employee,
    request: EquipmentRequest,
    message: string,
  ): Promise<Notification> {
    const label = this.getRequestLabel(request);
    return this.createNotification({
      recipient,
      type: NotificationType.REQUEST_UPDATE,
      title: `Request update: ${label}`,
      message,
      request,
    });
  }

  notifyProcurementApproved(
    recipient: Employee,
    request: EquipmentRequest,
  ): Promise<Notification> {
    const label = this.getRequestLabel(request);
    return this.createNotification({
      recipient,
      type: NotificationType.PROCUREMENT_APPROVED,
      title: `Procurement approved: ${label}`,
      message: `External procurement was approved for ${label}. Equipment will be added to inventory and assigned when ready.`,
      request,
    });
  }

  notifyEquipmentAssigned(
    recipient: Employee,
    request: EquipmentRequest,
    assignment: EquipmentAssignment,
  ): Promise<Notification> {
    const label = this.getRequestLabel(request);
    return this.createNotification({
      recipient,
      type: NotificationType.EQUIPMENT_ASSIGNED,
      title: `Equipment assigned: ${label}`,
      message: `Equipment has been assigned to you for ${label}.`,
      request,
      equipmentAssignment: assignment,
    });
  }

  notifyEquipmentReturnRequested(
    recipient: Employee,
    assignment: EquipmentAssignment,
    returnByDate: string,
    message?: string,
  ): Promise<Notification> {
    const modelName =
      assignment.equipmentAsset.equipmentModel?.name ?? 'assigned equipment';
    return this.createNotification({
      recipient,
      type: NotificationType.EQUIPMENT_RETURN_REQUESTED,
      title: `Return requested: ${modelName}`,
      message:
        message ??
        `Your manager requested that you return ${modelName} by ${returnByDate}.`,
      equipmentAssignment: assignment,
    });
  }

  notifyEquipmentReturned(
    recipient: Employee,
    assignment: EquipmentAssignment,
  ): Promise<Notification> {
    const modelName =
      assignment.equipmentAsset.equipmentModel?.name ?? 'equipment';
    return this.createNotification({
      recipient,
      type: NotificationType.EQUIPMENT_RETURNED,
      title: `Equipment returned: ${modelName}`,
      message: `${modelName} has been marked as returned.`,
      equipmentAssignment: assignment,
    });
  }
}
