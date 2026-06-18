# Employee Feature Specification

## User story

As an employee, I want to browse available equipment, submit loan or procurement requests, track my request status, and manage equipment assigned to me. I need to search the catalog and similar items when my preferred model is unavailable. For loan requests I must specify an existing equipment model, quantity, dates, and purpose. For procurement requests I must provide the requested item name, category, quantity, dates, and purpose when the item is not in inventory. I want to view only my own requests and assignments, cancel a request while it is still pending approval, and complete an equipment return when my manager requests it. If I send invalid data or try to access another user's resources, I want the API to reject the request with clear errors.

## Acceptance criteria

- Authenticated employees can browse the equipment catalog and search similar models without managing inventory
- `POST /requests` creates a loan request when `requestType` is `loan` and `equipmentModelId` is provided; status becomes `pending_manager_approval`
- `POST /requests` creates a procurement request when `requestType` is `procurement` and `requestedItemName` and `categoryId` are provided
- Request creation fails with 400 if the requester's department has no direct manager assigned
- `GET /requests/my` returns only the authenticated employee's requests
- `GET /requests/:id` and `GET /requests/:id/timeline` are accessible only for the requester's own requests
- `PATCH /requests/:id/cancel` is allowed only while status is `pending_manager_approval` or `pending_procurement_approval`
- Cancelling a request creates a `request_cancelled` notification for the requester
- `GET /equipment-assignments/my` returns only the authenticated employee's assignments
- `PATCH /equipment-assignments/:id/complete-return` marks a return-requested assignment as returned and frees the asset
- All endpoints require a valid JWT; inactive accounts cannot authenticate
- Request bodies are validated with class-validator; invalid payloads return 400 with field-level messages
- All endpoints are documented in Swagger UI

## API Contract

| Method | Path                                          | Auth | Description                                               |
| ------ | --------------------------------------------- | ---- | --------------------------------------------------------- |
| GET    | `/equipment/catalog`                          | —    | List equipment models with availability counts            |
| GET    | `/equipment/catalog/similar`                  | —    | Search similar models (`?q=` and optional `?categoryId=`) |
| GET    | `/equipment/models/{id}`                      | —    | Get equipment model details                               |
| POST   | `/requests`                                   | JWT  | Create loan or procurement request                        |
| GET    | `/requests/my`                                | JWT  | List own requests                                         |
| GET    | `/requests/{id}`                              | JWT  | Get own request detail                                    |
| PATCH  | `/requests/{id}/cancel`                       | JWT  | Cancel pending request                                    |
| GET    | `/requests/{id}/timeline`                     | JWT  | Get approval timeline for own request                     |
| GET    | `/equipment-assignments/my`                   | JWT  | List own equipment assignments                            |
| GET    | `/equipment-assignments/{id}`                 | JWT  | Get own assignment detail                                 |
| PATCH  | `/equipment-assignments/{id}/complete-return` | JWT  | Complete a return requested by manager                    |

### POST `/requests` — loan request body

```json
{
  "requestType": "loan",
  "equipmentModelId": "550e8400-e29b-41d4-a716-446655440000",
  "quantity": 1,
  "startDate": "2026-07-01",
  "endDate": "2026-12-31",
  "purpose": "Client site visits"
}
```

### POST `/requests` — procurement request body

```json
{
  "requestType": "procurement",
  "requestedItemName": "Ergonomic standing desk",
  "categoryId": "550e8400-e29b-41d4-a716-446655440001",
  "quantity": 1,
  "startDate": "2026-08-01",
  "endDate": "2027-08-01",
  "purpose": "Home office setup"
}
```

### PATCH `/requests/{id}/cancel` — request body

```json
{
  "reason": "No longer needed"
}
```

## Data model

| Field             | Type    | Required         | Notes                        |
| ----------------- | ------- | ---------------- | ---------------------------- |
| requestType       | enum    | yes              | `loan` or `procurement`      |
| equipmentModelId  | uuid    | loan only        | Existing model to borrow     |
| requestedItemName | string  | procurement only | Free-text item name          |
| categoryId        | uuid    | procurement only | Equipment category           |
| quantity          | integer | no               | Defaults to `1`, minimum `1` |
| startDate         | date    | yes              | ISO date string              |
| endDate           | date    | yes              | ISO date string              |
| purpose           | string  | yes              | Business justification       |

### Request statuses (read-only for employee)

`pending_manager_approval` · `pending_procurement_approval` · `procurement_approved` · `fulfilled` · `rejected` · `cancelled`

## Error scenarios

- **Invalid request body (400):** Missing required fields for the chosen `requestType`, invalid UUIDs, invalid dates, or `quantity` below 1.
- **No direct manager (400):** Employee's department has no `direct_manager_id` configured; request cannot be submitted.
- **Request not found (404):** `GET` or `PATCH` with an id that does not exist.
- **Forbidden (403):** Employee attempts to view or cancel another user's request or assignment.
- **Not cancellable (400):** Cancel attempted when status is not `pending_manager_approval` or `pending_procurement_approval`.
- **Unauthorized (401):** Missing, invalid, or expired JWT, or inactive account.
