# Direct Manager Feature Specification

## User story

As a direct manager, I want to review equipment requests submitted by employees in departments I manage, approve or reject them, and oversee equipment assigned to my team. I inherit all employee capabilities (catalog browsing, own requests, own assignments). When I approve a request, it advances to procurement review; when I reject it, I must provide a rejection reason and the employee is notified. I also want to view team equipment assignments and request that an employee return assigned equipment by a specific date, with an optional message. The employee should receive a notification when a return is requested. I must not be able to act on requests or equipment belonging to employees outside my managed departments.

## Acceptance criteria

- Direct managers can access all employee endpoints for their own account
- `GET /manager/requests/pending` returns requests in `pending_manager_approval` from employees in managed departments only
- `GET /manager/requests` returns all requests from employees in managed departments
- `GET /manager/team-equipment` returns active and return-requested assignments for team members
- `GET /approvals/my` returns approval steps where the manager is the designated approver and status is `pending`
- `PATCH /approvals/{stepId}/approve` advances the request to `pending_procurement_approval` and notifies the procurement manager
- `PATCH /approvals/{stepId}/reject` requires a `comment` (rejection reason), sets request status to `rejected`, and notifies the employee
- Only the designated approver on a step can approve or reject it
- `POST /equipment-assignments/{id}/return-request` sets assignment status to `return_requested`, updates asset status, and notifies the employee
- Return requests require `returnByDate`; `message` is optional
- Managers cannot request returns for employees outside their managed departments (403)
- All manager endpoints require JWT with role `direct_manager` or higher
- All endpoints are documented in Swagger UI

## API Contract

| Method | Path                                         | Auth           | Description                             |
| ------ | -------------------------------------------- | -------------- | --------------------------------------- |
| GET    | `/manager/requests/pending`                  | JWT (manager+) | Pending team requests                   |
| GET    | `/manager/requests`                          | JWT (manager+) | All team requests                       |
| GET    | `/manager/team-equipment`                    | JWT (manager+) | Active team assignments                 |
| GET    | `/approvals/my`                              | JWT            | Pending approval steps for current user |
| GET    | `/approvals/{id}`                            | JWT            | Approval step detail                    |
| PATCH  | `/approvals/{stepId}/approve`                | JWT            | Approve at manager level                |
| PATCH  | `/approvals/{stepId}/reject`                 | JWT            | Reject with required reason             |
| POST   | `/equipment-assignments/{id}/return-request` | JWT (manager+) | Request equipment return from employee  |

Also inherits all [employee endpoints](./employee.md).

### PATCH `/approvals/{stepId}/approve` — request body

```json
{
  "comment": "Approved — valid business need"
}
```

### PATCH `/approvals/{stepId}/reject` — request body

```json
{
  "comment": "Budget not approved for this quarter"
}
```

### POST `/equipment-assignments/{id}/return-request` — request body

```json
{
  "returnByDate": "2026-08-15",
  "message": "Please return before the office move"
}
```

## Data model

| Field        | Type   | Required    | Notes                                       |
| ------------ | ------ | ----------- | ------------------------------------------- |
| comment      | string | reject: yes | Rejection reason; optional on approve       |
| returnByDate | date   | yes         | Target return date for employee             |
| message      | string | no          | Optional note sent with return notification |

### Approval step roles at manager level

| approverRole     | level | Triggered when               |
| ---------------- | ----- | ---------------------------- |
| `direct_manager` | 1     | Employee submits any request |

## Error scenarios

- **Missing rejection reason (400):** `PATCH /approvals/{stepId}/reject` called without `comment`.
- **Not the approver (403):** Another user attempts to act on a step they are not assigned to.
- **Step already processed (400):** Approve or reject on a step that is no longer `pending`.
- **Outside managed department (403):** Manager attempts return request for an employee not in their departments.
- **Assignment not active (400):** Return requested on an assignment that is not `active`.
- **Unauthorized (401):** Missing or invalid JWT.
