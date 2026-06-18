# Procurement Manager Feature Specification

## User story

As a procurement manager, I want to review requests that have been approved by direct managers, fulfill loan requests by assigning available assets, approve procurement requests for external acquisition, and manage the full equipment inventory. I inherit all direct manager and employee capabilities. I need to check asset availability before fulfilling loans and reject requests with a required reason. After approving a procurement request, I acquire the item outside the app, then add or edit models and assets in inventory and assign them to the requester to complete fulfillment. I must be able to manage categories, models, and physical assets; assign equipment directly; mark assets for maintenance; retire assets with history; and hard-delete only unused assets without assignment history.

## Acceptance criteria

- `GET /procurement/approvals` returns all requests in `pending_procurement_approval`
- `GET /procurement/requests/{id}/availability` returns available asset count for the request's equipment model
- Approving a loan request at procurement level assigns an available asset, creates an assignment, sets request to `fulfilled`, and notifies the employee
- Approving a procurement request sets request to `procurement_approved` and notifies the employee
- Assigning an asset with `requestId` for a `procurement_approved` request sets request to `fulfilled` and notifies the employee
- Rejecting at procurement level requires a `comment` and notifies the employee
- `GET /inventory` and `GET /inventory/stats` provide asset listing and low-stock summary
- Procurement manager can CRUD equipment categories, models, and assets
- `DELETE /equipment-assets/{id}` succeeds only for unused assets without assignment history
- Assets with history must be retired via `PATCH /equipment-assets/{id}/retire`; hard-delete allowed after 30-day grace period
- All inventory endpoints require role `procurement_manager` or `admin`
- All endpoints are documented in Swagger UI

## API Contract

| Method | Path                                      | Auth               | Description                                     |
| ------ | ----------------------------------------- | ------------------ | ----------------------------------------------- |
| GET    | `/procurement/approvals`                  | JWT (procurement+) | Requests awaiting procurement review            |
| GET    | `/procurement/requests/{id}/availability` | JWT (procurement+) | Available assets for request model              |
| GET    | `/equipment/models/{id}/similar`          | JWT (procurement+) | Find similar available models                   |
| GET    | `/inventory`                              | JWT (procurement+) | List all equipment assets                       |
| GET    | `/inventory/stats`                        | JWT (procurement+) | Inventory statistics and low-stock alerts       |
| GET    | `/equipment-categories`                   | —                  | List categories                                 |
| POST   | `/equipment-categories`                   | JWT (procurement+) | Create category                                 |
| GET    | `/equipment-models`                       | JWT (procurement+) | List models                                     |
| POST   | `/equipment-models`                       | JWT (procurement+) | Create model                                    |
| PATCH  | `/equipment-models/{id}`                  | JWT (procurement+) | Update model                                    |
| GET    | `/equipment-assets`                       | JWT (procurement+) | List assets                                     |
| POST   | `/equipment-assets`                       | JWT (procurement+) | Create asset                                    |
| PATCH  | `/equipment-assets/{id}`                  | JWT (procurement+) | Update asset                                    |
| PATCH  | `/equipment-assets/{id}/status`           | JWT (procurement+) | Change asset status                             |
| POST   | `/equipment-assets/{id}/assign`           | JWT (procurement+) | Assign asset to employee (optional `requestId`) |
| PATCH  | `/equipment-assets/{id}/retire`           | JWT (procurement+) | Retire asset                                    |
| DELETE | `/equipment-assets/{id}`                  | JWT (procurement+) | Hard-delete eligible asset                      |

Also inherits all [direct manager](./direct-manager.md) and [employee](./employee.md) endpoints.

### POST `/equipment-assets` — request body

```json
{
  "equipmentModelId": "550e8400-e29b-41d4-a716-446655440000",
  "assetTag": "LT-042",
  "serialNumber": "SN987654",
  "status": "available",
  "notes": "New stock"
}
```

### POST `/equipment-assets/{id}/assign` — request body

```json
{
  "employeeId": "550e8400-e29b-41d4-a716-446655440002",
  "requestId": "550e8400-e29b-41d4-a716-446655440001",
  "expectedReturnDate": "2027-06-30"
}
```

## Data model

### Equipment asset statuses

| Status             | Description                  |
| ------------------ | ---------------------------- |
| `available`        | Ready to assign              |
| `in_use`           | Assigned to an employee      |
| `reserved`         | Held for upcoming assignment |
| `return_requested` | Manager requested return     |
| `maintenance`      | Under repair                 |
| `retired`          | Archived; not assignable     |

### Procurement request statuses (relevant)

`pending_procurement_approval` · `procurement_approved` · `fulfilled`

## Error scenarios

- **No available assets (400):** Loan approval attempted but no asset with status `available` exists for the model.
- **Cannot hard-delete (400):** Asset has assignment history, is in use, or retired within the 30-day grace period.
- **Missing rejection reason (400):** Procurement rejection without `comment`.
- **Forbidden (403):** User without `procurement_manager` or `admin` role accesses inventory endpoints.
- **Not found (404):** Request, asset, or model id does not exist.
- **Unauthorized (401):** Missing or invalid JWT.
