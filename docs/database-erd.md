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
        enum status
        timestamp created_at
        timestamp updated_at
    }

    request_alternatives {
        uuid id PK
        uuid request_id FK
        uuid equipment_model_id FK
        uuid suggested_by_id FK
        enum status
        text message
        timestamp created_at
        timestamp updated_at
    }

    procurement_orders {
        uuid id PK
        uuid request_id FK
        string item_name
        int quantity
        enum status
        uuid created_by_id FK
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
    employees ||--o{ equipment_requests : requester_id
    equipment_models ||--o{ equipment_requests : equipment_model_id
    equipment_categories ||--o{ equipment_requests : category_id
    equipment_requests ||--o{ approval_steps : request_id
    employees ||--o{ approval_steps : approver_id
    equipment_requests ||--o{ request_alternatives : request_id
    equipment_models ||--o{ request_alternatives : equipment_model_id
    employees ||--o{ request_alternatives : suggested_by_id
    equipment_requests ||--o{ procurement_orders : request_id
    employees ||--o{ procurement_orders : created_by_id
    equipment_assets ||--o{ equipment_assignments : equipment_asset_id
    employees ||--o{ equipment_assignments : employee_id
    equipment_requests ||--o{ equipment_assignments : request_id
    employees ||--o{ notifications : recipient_id
    equipment_requests ||--o{ notifications : request_id
    approval_steps ||--o{ notifications : approval_step_id
    equipment_assignments ||--o{ notifications : equipment_assignment_id
```

## Tables

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
| `request_alternatives`  | Suggested substitute models                         |
| `procurement_orders`    | External purchase tracking                          |
| `notifications`         | Workflow notifications                              |

## Key enums

| Column                            | Values                                                                                                                  |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `employees.role`                  | `employee`, `direct_manager`, `procurement_manager`, `admin`                                                            |
| `employees.account_status`        | `active`, `inactive`                                                                                                    |
| `equipment_assets.status`         | `available`, `in_use`, `reserved`, `return_requested`, `maintenance`, `retired`                                         |
| `equipment_requests.request_type` | `loan`, `procurement`                                                                                                   |
| `equipment_requests.status`       | `pending_manager_approval`, `pending_procurement_approval`, `purchase_pending`, `fulfilled`, `rejected`, `cancelled`, … |
| `approval_steps.approver_role`    | `direct_manager`, `procurement_manager`, `admin`                                                                        |
| `approval_steps.status`           | `pending`, `approved`, `rejected`, `skipped`                                                                            |

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
