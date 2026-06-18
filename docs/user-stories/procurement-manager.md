# Procurement Manager Feature Specification

## User story

As a procurement manager, I want to review requests that have been approved by direct managers, fulfill loan requests by assigning available assets, approve procurement requests by creating purchase orders, and manage the full equipment inventory. I inherit all direct manager and employee capabilities. I need to check asset availability before fulfilling loans, reject requests with a required reason, and suggest alternative available models when external procurement may not be necessary. I must be able to manage categories, models, and physical assets; assign equipment directly; mark assets for maintenance; retire assets with history; and hard-delete only unused assets without assignment history. I want procurement orders tracked from creation through receipt.

## Acceptance criteria

- `GET /procurement/approvals` returns all requests in `pending_procurement_approval`
- `GET /procurement/requests/{id}/availability` returns available asset count for the request's equipment model
- Approving a loan request at procurement level assigns an available asset, creates an assignment, sets request to `fulfilled`, and notifies the employee
- Approving a procurement request creates a `procurement_order` and sets request to `purchase_pending`
- Rejecting at procurement level requires a `comment` and notifies the employee
- `POST /requests/{id}/alternatives` creates a suggested alternative and notifies the requester
- `GET /inventory` and `GET /inventory/stats` provide asset listing and low-stock summary
- Procurement manager can CRUD equipment categories, models, and assets
- `DELETE /equipment-assets/{id}` succeeds only for unused assets without assignment history
- Assets with history must be retired via `PATCH /equipment-assets/{id}/retire`; hard-delete allowed after 30-day grace period
- `POST /procurement-orders` and `PATCH /procurement-orders/{id}/status` manage purchase lifecycle
- All inventory endpoints require role `procurement_manager` or `admin`
- All endpoints are documented in Swagger UI

## API Contract

| Method | Path                                      | Auth               | Description                               |
| ------ | ----------------------------------------- | ------------------ | ----------------------------------------- |
| GET    | `/procurement/approvals`                  | JWT (procurement+) | Requests awaiting procurement review      |
| GET    | `/procurement/requests/{id}/availability` | JWT (procurement+) | Available assets for request model        |
| POST   | `/requests/{id}/alternatives`             | JWT (procurement+) | Suggest alternative equipment model       |
| GET    | `/equipment/models/{id}/similar`          | JWT (procurement+) | Find similar available models             |
| GET    | `/inventory`                              | JWT (procurement+) | List all equipment assets                 |
| GET    | `/inventory/stats`                        | JWT (procurement+) | Inventory statistics and low-stock alerts |
| GET    | `/equipment-categories`                   | —                  | List categories                           |
| POST   | `/equipment-categories`                   | JWT (procurement+) | Create category                           |
| GET    | `/equipment-models`                       | JWT (procurement+) | List models                               |
| POST   | `/equipment-models`                       | JWT (procurement+) | Create model                              |
| PATCH  | `/equipment-models/{id}`                  | JWT (procurement+) | Update model                              |
| GET    | `/equipment-assets`                       | JWT (procurement+) | List assets                               |
| POST   | `/equipment-assets`                       | JWT (procurement+) | Create asset                              |
| PATCH  | `/equipment-assets/{id}`                  | JWT (procurement+) | Update asset                              |
| PATCH  | `/equipment-assets/{id}/status`           | JWT (procurement+) | Change asset status                       |
| POST   | `/equipment-assets/{id}/assign`           | JWT (procurement+) | Assign asset to employee                  |
| PATCH  | `/equipment-assets/{id}/retire`           | JWT (procurement+) | Retire asset                              |
| DELETE | `/equipment-assets/{id}`                  | JWT (procurement+) | Hard-delete eligible asset                |
| POST   | `/procurement-orders`                     | JWT (procurement+) | Create purchase order                     |
| PATCH  | `/procurement-orders/{id}/status`         | JWT (procurement+) | Update order status                       |

Also inherits all [direct manager](./direct-manager.md) and [employee](./employee.md) endpoints.

### POST `/requests/{id}/alternatives` — request body

```json
{
  "equipmentModelId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "iPad Pro is available and may suit your needs"
}
```

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

### POST `/procurement-orders` — request body

```json
{
  "requestId": "550e8400-e29b-41d4-a716-446655440001",
  "itemName": "Ergonomic standing desk",
  "quantity": 1,
  "notes": "Order from preferred vendor"
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

### Procurement order statuses

`pending` · `ordered` · `received` · `cancelled`

## Error scenarios

- **No available assets (400):** Loan approval attempted but no asset with status `available` exists for the model.
- **Cannot hard-delete (400):** Asset has assignment history, is in use, or retired within the 30-day grace period.
- **Missing rejection reason (400):** Procurement rejection without `comment`.
- **Forbidden (403):** User without `procurement_manager` or `admin` role accesses inventory endpoints.
- **Not found (404):** Request, asset, model, or order id does not exist.
- **Unauthorized (401):** Missing or invalid JWT.
