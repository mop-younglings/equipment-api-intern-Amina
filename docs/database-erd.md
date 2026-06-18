# Database ERD

Entity-relationship diagram for the PostgreSQL schema managed by TypeORM migrations.

## Entity relationship diagram

```mermaid
erDiagram
    departments {
        uuid id PK
        string name
        uuid direct_manager_id FK
        timestamp created_at
        timestamp updated_at
    }

    employees {
        uuid id PK
        string first_name
        string last_name
        string email UK
        string password
        enum role
        enum account_status
        uuid department_id FK
        timestamp created_at
        timestamp updated_at
    }

    equipment_categories {
        uuid id PK
        string name
        text description
        string category_image
        timestamp created_at
        timestamp updated_at
    }

    equipment_models {
        uuid id PK
        string name
        uuid category_id FK
        text description
        decimal default_value
        int procurement_year
        int release_year
        int expected_lifespan_months
        int low_stock_threshold
        timestamp created_at
        timestamp updated_at
    }

    equipment_assets {
        uuid id PK
        uuid equipment_model_id FK
        string asset_tag UK
        string serial_number
        enum status
        text notes
        uuid assigned_employee_id FK
        timestamp assigned_at
        date expected_return_date
        timestamp retired_at
        uuid retired_by_id FK
        timestamp created_at
        timestamp updated_at
    }

    equipment_requests {
        uuid id PK
        uuid requester_id FK
        enum request_type
        uuid equipment_model_id FK
        string requested_item_name
        uuid category_id FK
        int quantity
        date start_date
        date end_date
        text purpose
        enum status
        text rejected_reason
        text cancellation_reason
        timestamp cancelled_at
        timestamp created_at
        timestamp updated_at
    }

    approval_steps {
        uuid id PK
        uuid request_id FK
        int level
        uuid approver_id FK
        enum approver_role
        enum status
        text comment
        timestamp acted_at
        timestamp created_at
        timestamp updated_at
    }

    equipment_assignments {
        uuid id PK
        uuid equipment_asset_id FK
        uuid employee_id FK
        uuid request_id FK
        uuid assigned_by_id FK
        timestamp assigned_at
        date expected_return_date
        uuid return_requested_by_id FK
        timestamp return_requested_at
        date return_by_date
        timestamp returned_at
        text return_note
        enum status
        timestamp created_at
        timestamp updated_at
    }

    notifications {
        uuid id PK
        uuid recipient_id FK
        enum type
        string title
        text message
        boolean is_read
        timestamp read_at
        uuid request_id FK
        uuid approval_step_id FK
        uuid equipment_assignment_id FK
        timestamp created_at
        timestamp updated_at
    }

    departments ||--o{ employees : department_id
    employees ||--o| departments : direct_manager_id
    equipment_categories ||--o{ equipment_models : category_id
    equipment_models ||--o{ equipment_assets : equipment_model_id
    employees ||--o{ equipment_assets : assigned_employee_id
    employees ||--o{ equipment_assets : retired_by_id
    employees ||--o{ equipment_requests : requester_id
    equipment_models ||--o{ equipment_requests : equipment_model_id
    equipment_categories ||--o{ equipment_requests : category_id
    equipment_requests ||--o{ approval_steps : request_id
    employees ||--o{ approval_steps : approver_id
    equipment_assets ||--o{ equipment_assignments : equipment_asset_id
    employees ||--o{ equipment_assignments : employee_id
    employees ||--o{ equipment_assignments : assigned_by_id
    employees ||--o{ equipment_assignments : return_requested_by_id
    equipment_requests ||--o{ equipment_assignments : request_id
    employees ||--o{ notifications : recipient_id
    equipment_requests ||--o{ notifications : request_id
    approval_steps ||--o{ notifications : approval_step_id
    equipment_assignments ||--o{ notifications : equipment_assignment_id
```

## Request status flow

```mermaid
stateDiagram-v2
    [*] --> pending_manager_approval: employee submits request

    pending_manager_approval --> pending_procurement_approval: manager approves
    pending_manager_approval --> rejected: manager rejects
    pending_manager_approval --> cancelled: employee cancels

    pending_procurement_approval --> fulfilled: loan approved and asset assigned
    pending_procurement_approval --> procurement_approved: procurement request approved
    pending_procurement_approval --> rejected: procurement rejects
    pending_procurement_approval --> cancelled: employee cancels

    procurement_approved --> fulfilled: PM adds asset and assigns with request_id

    fulfilled --> [*]
    rejected --> [*]
    cancelled --> [*]
```

**Note:** External purchase happens outside the app. There is no `procurement_orders` table, `purchase_pending` status, or `request_alternatives` table — after procurement approval the request stays at `procurement_approved` until inventory is updated and an asset is assigned.

## Tables

10 tables in the current schema:

| Table                   | Description                                         |
| ----------------------- | --------------------------------------------------- |
| `departments`           | Org units; each may have one `direct_manager_id`    |
| `employees`             | Users, roles, department membership, account status |
| `equipment_categories`  | High-level groupings (Laptop, Monitor, …)           |
| `equipment_models`      | Product types within a category                     |
| `equipment_assets`      | Physical inventory items                            |
| `equipment_assignments` | Assignment and return history                       |
| `equipment_requests`    | Loan and procurement requests                       |
| `approval_steps`        | Manager and procurement approval records            |
| `notifications`         | Workflow notifications                              |

## Key enums

| Column                            | Values                                                                                                                                                                                               |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `employees.role`                  | `employee`, `direct_manager`, `procurement_manager`, `admin`                                                                                                                                         |
| `employees.account_status`        | `active`, `inactive`                                                                                                                                                                                 |
| `equipment_assets.status`         | `available`, `in_use`, `reserved`, `return_requested`, `maintenance`, `retired`                                                                                                                      |
| `equipment_requests.request_type` | `loan`, `procurement`                                                                                                                                                                                |
| `equipment_requests.status`       | `pending_manager_approval`, `pending_procurement_approval`, `procurement_approved`, `approved`, `fulfilled`, `rejected`, `cancelled`                                                                 |
| `approval_steps.approver_role`    | `direct_manager`, `procurement_manager`, `admin`                                                                                                                                                     |
| `approval_steps.status`           | `pending`, `approved`, `rejected`, `skipped`                                                                                                                                                         |
| `equipment_assignments.status`    | `active`, `return_requested`, `returned`, `cancelled`                                                                                                                                                |
| `notifications.type`              | `approval_required`, `request_approved`, `request_rejected`, `request_cancelled`, `request_update`, `procurement_approved`, `equipment_assigned`, `equipment_return_requested`, `equipment_returned` |

## Inspect schema in Docker

With `npm run docker:up`:

```bash
# List tables
docker exec -it equipment-api-postgres psql -U equipment -d equipment_api -c "\dt"

# Describe a table
docker exec -it equipment-api-postgres psql -U equipment -d equipment_api -c "\d employees"

# Export schema for external ERD tools
docker exec equipment-api-postgres pg_dump -U equipment -d equipment_api --schema-only > schema.sql
```

**Local connection:** `localhost:5433` · user `equipment` · password `equipment` · database `equipment_api`

Use DBeaver, TablePlus, pgAdmin, or [dbdiagram.io](https://dbdiagram.io) with `schema.sql` for an interactive diagram.

## Source of truth

- Entity definitions: `src/modules/**/entities/*.entity.ts`
- Migrations: `src/database/migrations/`

See also [equipment.md](./equipment.md) for business rules and [user-stories/](./user-stories/README.md) for role specifications.
