export enum RequestStatus {
  PENDING_MANAGER_APPROVAL = 'pending_manager_approval',
  PENDING_PROCUREMENT_APPROVAL = 'pending_procurement_approval',
  PROCUREMENT_APPROVED = 'procurement_approved',
  APPROVED = 'approved',
  FULFILLED = 'fulfilled',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

export const CANCELLABLE_REQUEST_STATUSES: RequestStatus[] = [
  RequestStatus.PENDING_MANAGER_APPROVAL,
  RequestStatus.PENDING_PROCUREMENT_APPROVAL,
];
