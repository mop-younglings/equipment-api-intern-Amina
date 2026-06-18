# Equipment Management Specification

This document describes the equipment management domain implemented by the API.

## Roles

| Role                  | Key capabilities                                    |
| --------------------- | --------------------------------------------------- |
| `employee`            | Catalog, own requests, assigned equipment           |
| `direct_manager`      | Team requests/equipment, approvals, return requests |
| `procurement_manager` | Global procurement review, inventory management     |
| `admin`               | User/department administration + all above          |

## Request Types

### Loan

Employee requests an existing equipment model. After manager and procurement approval, an available asset is assigned automatically.

### Procurement

Employee requests an item not in inventory. After approvals, a procurement order is created (`purchase_pending`). When received, assets are added and assigned.

## Entity Model

- **departments** — Organizational units with a `direct_manager_id`
- **employees** — Users with `role`, `department_id`, `account_status`
- **equipment_categories** — Laptop, Monitor, Phone, etc.
- **equipment_models** — Product types (e.g. Dell Latitude 5420)
- **equipment_assets** — Physical items with statuses: `available`, `in_use`, `reserved`, `return_requested`, `maintenance`, `retired`
- **equipment_assignments** — Assignment and return history
- **equipment_requests** — Loan/procurement requests with workflow status
- **approval_steps** — Manager and procurement approval records
- **request_alternatives** — Procurement manager suggestions
- **procurement_orders** — External purchase tracking
- **notifications** — Workflow event notifications

## Business Rules

1. Every request routes to the requester's department direct manager first.
2. Rejection reasons are required for manager and procurement rejections.
3. Employees may cancel only while status is `pending_manager_approval` or `pending_procurement_approval`.
4. Assets with assignment history cannot be hard-deleted; use `retired` status instead.
5. Retired assets may be hard-deleted after the configured grace period (30 days).
6. Return requests update assignment and asset status and notify the employee.

## User Stories

See [docs/user-stories/](user-stories/README.md) for role-based user stories.

## API Reference

See [README](../README.md) for endpoint listing and [Swagger UI](http://localhost:3000/api) for schemas.
