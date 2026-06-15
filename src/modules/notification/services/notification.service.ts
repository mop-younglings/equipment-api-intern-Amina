import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApprovalStep } from '../../approval/entities/approval-step.entity';
import { Employee } from '../../employee/entities/employee.entity';
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
      relations: { request: { equipment: true }, approvalStep: true },
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
      relations: { request: { equipment: true }, approvalStep: true },
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
      isRead: false,
    });

    return this.notificationRepository.save(notification);
  }

  notifyApprovalRequired(
    recipient: Employee,
    request: EquipmentRequest,
    approvalStep: ApprovalStep,
  ): Promise<Notification> {
    const requesterName = `${request.requester.firstName} ${request.requester.lastName}`;

    return this.createNotification({
      recipient,
      type: NotificationType.APPROVAL_REQUIRED,
      title: `Approval required: ${request.equipment.name}`,
      message: `${requesterName} requested ${request.equipment.name} and needs your approval.`,
      request,
      approvalStep,
    });
  }

  notifyRequestApproved(
    recipient: Employee,
    request: EquipmentRequest,
  ): Promise<Notification> {
    return this.createNotification({
      recipient,
      type: NotificationType.REQUEST_APPROVED,
      title: `Request approved: ${request.equipment.name}`,
      message: `Your request for ${request.equipment.name} has been fully approved. The equipment has been assigned to you.`,
      request,
    });
  }

  notifyRequestRejected(
    recipient: Employee,
    request: EquipmentRequest,
    comment?: string,
  ): Promise<Notification> {
    const suffix = comment ? ` Reason: ${comment}` : '';

    return this.createNotification({
      recipient,
      type: NotificationType.REQUEST_REJECTED,
      title: `Request rejected: ${request.equipment.name}`,
      message: `Your request for ${request.equipment.name} was rejected.${suffix}`,
      request,
    });
  }

  notifyRequestUpdate(
    recipient: Employee,
    request: EquipmentRequest,
    message: string,
  ): Promise<Notification> {
    return this.createNotification({
      recipient,
      type: NotificationType.REQUEST_UPDATE,
      title: `Request update: ${request.equipment.name}`,
      message,
      request,
    });
  }
}
