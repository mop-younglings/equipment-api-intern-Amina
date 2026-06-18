# Admin Feature Specification

## User story

As an admin, I want to manage user accounts, roles, account status, and organizational departments. I have all procurement manager, direct manager, and employee capabilities. I need to create users with assigned roles and departments, update profiles, change roles, activate or deactivate accounts, reset passwords, and delete users when appropriate. I also need to create departments, assign direct managers so request routing works correctly, and update or remove departments as the organization changes. If I send invalid data or target a resource that does not exist, I want the API to respond with clear validation or not-found errors.

## Acceptance criteria

- All admin endpoints require JWT with role `admin`
- `GET /admin/users` lists all employees with department relations
- `POST /admin/users` creates a user with bcrypt-hashed password; duplicate email returns 409
- `PATCH /admin/users/{id}/role` updates role to one of: `employee`, `direct_manager`, `procurement_manager`, `admin`
- `PATCH /admin/users/{id}/status` sets `account_status` to `active` or `inactive`; inactive users cannot log in
- `POST /admin/users/{id}/reset-password` sets a new password (minimum 8 characters)
- `DELETE /admin/users/{id}` removes the user record
- `GET /admin/departments` lists departments with direct manager and employees
- `POST /admin/departments` creates a department with optional `directManagerId`
- `PATCH /admin/departments/{id}` updates name and/or direct manager assignment
- `DELETE /admin/departments/{id}` removes the department
- Request bodies validated with class-validator; invalid payloads return 400
- All endpoints documented in Swagger UI

## API Contract

| Method | Path                               | Auth        | Description                    |
| ------ | ---------------------------------- | ----------- | ------------------------------ |
| GET    | `/admin/users`                     | JWT (admin) | List all users                 |
| POST   | `/admin/users`                     | JWT (admin) | Create user                    |
| GET    | `/admin/users/{id}`                | JWT (admin) | Get user by id                 |
| PATCH  | `/admin/users/{id}`                | JWT (admin) | Update user profile            |
| PATCH  | `/admin/users/{id}/role`           | JWT (admin) | Change user role               |
| PATCH  | `/admin/users/{id}/status`         | JWT (admin) | Activate or deactivate account |
| POST   | `/admin/users/{id}/reset-password` | JWT (admin) | Reset user password            |
| DELETE | `/admin/users/{id}`                | JWT (admin) | Delete user                    |
| GET    | `/admin/departments`               | JWT (admin) | List departments               |
| POST   | `/admin/departments`               | JWT (admin) | Create department              |
| PATCH  | `/admin/departments/{id}`          | JWT (admin) | Update department              |
| DELETE | `/admin/departments/{id}`          | JWT (admin) | Delete department              |

Also inherits all [procurement manager](./procurement-manager.md), [direct manager](./direct-manager.md), and [employee](./employee.md) endpoints.

### POST `/admin/users` — request body

```json
{
  "firstName": "Jane",
  "lastName": "Doe",
  "email": "jane.doe@example.com",
  "password": "password123",
  "role": "employee",
  "accountStatus": "active",
  "departmentId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### PATCH `/admin/users/{id}/role` — request body

```json
{
  "role": "direct_manager"
}
```

### PATCH `/admin/users/{id}/status` — request body

```json
{
  "accountStatus": "inactive"
}
```

### POST `/admin/departments` — request body

```json
{
  "name": "Engineering",
  "directManagerId": "550e8400-e29b-41d4-a716-446655440001"
}
```

## Data model

### Employee roles

| Role                | Value                 |
| ------------------- | --------------------- |
| Employee            | `employee`            |
| Direct Manager      | `direct_manager`      |
| Procurement Manager | `procurement_manager` |
| Admin               | `admin`               |

### Account statuses

| Status   | Value      | Effect           |
| -------- | ---------- | ---------------- |
| Active   | `active`   | Can authenticate |
| Inactive | `inactive` | Login rejected   |

### Department fields

| Field           | Type   | Required on create | Notes                               |
| --------------- | ------ | ------------------ | ----------------------------------- |
| name            | string | yes                | Department name                     |
| directManagerId | uuid   | no                 | Employee who approves team requests |

## Error scenarios

- **Invalid request body (400):** Missing required fields, invalid email, password shorter than 8 characters, or invalid enum values.
- **Duplicate email (409):** `POST /admin/users` with an email that already exists.
- **User or department not found (404):** Operation targets a non-existent id.
- **Forbidden (403):** Non-admin user attempts any `/admin/*` endpoint.
- **Unauthorized (401):** Missing or invalid JWT.
