# Equipment Feature Specification

## User story

As an admin user, I want to manage the organization's equipment inventory through a REST API. I need to be able to list all equipment, view a single item, register new equipment, update existing records, and remove items that are no longer in use. When creating equipment, I must provide a name and category. When updating, I should be able to change one or many fields (name, category, description, status) without sending the full record. If I send invalid data—for example, an empty name, a missing category on create, or text where a status enum is expected, I want the API to reject the request with clear validation errors. If I request an equipment item that does not exist, I want a 404 response.

## Acceptance criteria

- All five REST endpoints are available and documented in Swagger UI
- Request bodies are validated with class-validator; invalid payloads return 400 Bad Request with field-level error messages
- GET `/equipment` returns the full in-memory list of equipment items
- GET `/equipment/:id` returns a single item or 404 if the id is not found
- POST `/equipment` creates a new item with a server-generated id and returns 201 Created
- PATCH `/equipment/:id` updates only the fields provided in the request body and returns the updated item, or 404 if the id is not found
- DELETE `/equipment/:id` removes the item and returns 204 No Content, or 404 if the id is not found
- Data is stored in an in-memory array (no database yet); changes persist for the lifetime of the running server process
- All five REST endpoints are available and documented in Swagger UI

## API Contract

| Method | Path               | Description              |
|--------|--------------------|--------------------------|
| GET    | `/equipment`       | List all equipment       |
| GET    | `/equipment/{id}`  | Get equipment by id      |
| POST   | `/equipment`       | Create new equipment     |
| PATCH  | `/equipment/{id}`  | Update equipment by id   |
| DELETE | `/equipment/{id}`  | Delete equipment by id   |

### POST `/equipment` — request body

```json
{
  "name": "MacBook Pro 14\"",
  "category": "Computer",
  "description": "M3, 16GB RAM",
  "status": "available"
}
```

### PATCH `/equipment/{id}` — request body

One or more of: `name`, `category`, `description`, `status`.

```json
{
  "status": "in_use"
}
```

## Data model

| Field       | Type   | Required on create | Notes                                      |
|-------------|--------|--------------------|--------------------------------------------|
| id          | string | — (server-generated) | Unique identifier                       |
| name        | string | yes                | Non-empty string                           |
| category    | string | yes                | Non-empty string (e.g. Computer, Phone)    |
| description | string | no                 | Optional free-text description             |
| status      | enum   | no                 | `available`, `in_use`, `maintenance`; defaults to `available` |

## Error scenarios

- **Invalid request body (400):** If mandatory fields are missing on create (name or category), or values fail validation (empty strings, invalid status enum), the API returns 400 with validation error details. Clients should display these messages and prevent submission until input is correct.
- **Equipment not found (404):** If the client requests GET, PATCH, or DELETE with an id that does not exist, the API returns 404 Not Found with an appropriate message.
- **Unauthorized access (403):** Not implemented in this phase; authentication will be added in a later iteration.
- **Internal server error (500):** If an unexpected error occurs during processing, the API returns 500; the client should show a generic error and instruct the user to try again.

Note: This is initial logic and set up, which may change according to future tasks. 