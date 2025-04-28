## API Documentation

This document details the API endpoints for the Coworking Space and Food Ordering backend.

**Authentication:** Most routes require authentication via a JWT token sent in a cookie. The `protect` middleware enforces this. Certain routes require `admin` authorization, enforced by the `authorize('admin')` middleware.

---

### Authentication (`/api/v1/auth`)

*   **`POST /register`**
    *   **Description:** Registers a new user.
    *   **Access:** Public
    *   **Input:** `application/json`
        ```json
        {
          "name": "string (required)",
          "email": "string (required, unique)",
          "password": "string (required)",
          "telephoneNumber": "string (required)",
          "role": "string (optional, defaults to 'user')"
        }
        ```
    *   **Output (Success - 201):** `application/json` (Sets HTTP-only cookie `token`)
        ```json
        {
          "success": true,
          "token": "string (JWT)"
        }
        ```
    *   **Output (Error - 400):** `application/json` (e.g., missing fields, user exists)
        ```json
        { "success": false, "message": "string" }
        ```
    *   **Output (Error - 500):** `application/json`
        ```json
        { "success": false, "message": "Server error" }
        ```

*   **`POST /login`**
    *   **Description:** Logs in an existing user.
    *   **Access:** Public
    *   **Input:** `application/json`
        ```json
        {
          "email": "string (required)",
          "password": "string (required)"
        }
        ```
    *   **Output (Success - 200):** `application/json` (Sets HTTP-only cookie `token`)
        ```json
        {
          "success": true,
          "token": "string (JWT)"
        }
        ```
    *   **Output (Error - 400/401):** `application/json` (e.g., missing fields, invalid credentials)
        ```json
        { "success": false, "message": "string" }
        ```

*   **`POST /logout`**
    *   **Description:** Logs out the current user.
    *   **Access:** Private (Requires authentication)
    *   **Input:** None
    *   **Output (Success - 200):** `application/json` (Clears `token` cookie)
        ```json
        { "success": true, "data": null, "message": "User logged out successfully" }
        ```
    *   **Output (Error - 500):** `application/json`
        ```json
        { "success": false, "data": null, "error": "Server Error" }
        ```

*   **`GET /me`**
    *   **Description:** Gets details of the currently logged-in user.
    *   **Access:** Private (Requires authentication)
    *   **Input:** None
    *   **Output (Success - 200):** `application/json`
        ```json
        {
          "success": true,
          "data": {
            "_id": "string (ObjectId)",
            "name": "string",
            "email": "string",
            "telephoneNumber": "string",
            "role": "string",
            "membership": "string (ObjectId, ref: 'Membership')",
            "createdAt": "string (ISODate)"
            // password field is excluded
          }
        }
        ```
    *   **Output (Error - 500):** `application/json`
        ```json
        { "success": false, "message": "Server error" }
        ```

---

### Memberships (`/api/v1/memberships`)

*   **`GET /`**
    *   **Description:** Gets the membership details for the logged-in user.
    *   **Access:** Private (Requires authentication)
    *   **Input:** None
    *   **Output (Success - 200):** `application/json`
        ```json
        {
          "success": true,
          "data": {
            "_id": "string (ObjectId)",
            "user": "string (ObjectId, ref: 'User')",
            "type": "string (enum: ['none', 'basic', 'platinum', 'gold', 'diamond'])",
            "status": "string (enum: ['inactive', 'active', 'cancelled'])",
            "startDate": "string (ISODate)",
            "endDate": "string (ISODate)",
            "points": "number (integer)",
            "createdAt": "string (ISODate)"
          }
        }
        ```
    *   **Output (Error - 404):** `application/json` (User or membership not found)
        ```json
        { "success": false, "message": "string" }
        ```
    *   **Output (Error - 500):** `application/json`
        ```json
        { "success": false, "message": "Server error" }
        ```

*   **`POST /`**
    *   **Description:** Creates or updates the membership for the logged-in user. Type is automatically determined based on points (none: 0, basic: 1-29, platinum: 30-99, gold: 100-199, diamond: 200+). When a membership is cancelled, its type is set to 'none' and points reset to 0.
    *   **Access:** Private (Requires authentication)
    *   **Input:** `application/json`
        ```json
        {
          "status": "string (optional, enum: ['inactive', 'active', 'cancelled'])"
        }
        ```
    *   **Output (Success - 200):** `application/json`
        ```json
        {
          "success": true,
          "message": "Membership updated",
          "data": { /* updated membership object */ }
        }
        ```
    *   **Output (Error - 404):** `application/json` (User not found)
        ```json
        { "success": false, "message": "User not found" }
        ```
    *   **Output (Error - 500):** `application/json`
        ```json
        { "success": false, "message": "Server error" }
        ```

*   **`PUT /points/:userId`**
    *   **Description:** Updates points for a specific user's membership and automatically changes membership tier when thresholds are reached. Cannot update points for cancelled memberships.
    *   **Access:** Private (Requires authentication)
    *   **Input:** `application/json`
        ```json
        {
          "points": "number (integer, required)",
          "operation": "string (required, enum: ['add', 'subtract'])"
        }
        ```
    *   **Output (Success - 200):** `application/json`
        ```json
        {
          "success": true,
          "message": "Points added to/deducted from membership",
          "data": { 
            "points": "number (integer)",
            "type": "string (membership type)",
            "typeChanged": "boolean (whether the tier changed)"
          }
        }
        ```
    *   **Output (Error - 400):** `application/json` (Invalid request or cancelled membership)
        ```json
        { "success": false, "message": "string" }
        ```
    *   **Output (Error - 404):** `application/json` (User or membership not found)
        ```json
        { "success": false, "message": "string" }
        ```
    *   **Output (Error - 500):** `application/json`
        ```json
        { "success": false, "message": "Server error" }
        ```

*   **`GET /all`**
    *   **Description:** Gets all memberships (Admin only).
    *   **Access:** Private (Admin only)
    *   **Input:** None
    *   **Output (Success - 200):** `application/json`
        ```json
        {
          "success": true,
          "count": "number",
          "data": [ /* array of membership objects with populated user details */ ]
        }
        ```
    *   **Output (Error - 500):** `application/json`
        ```json
        { "success": false, "message": "Server error" }
        ```

---

### Coworking Spaces (`/api/v1/coworking-spaces`)

*   **`GET /`**
    *   **Description:** Gets a list of all coworking spaces.
    *   **Access:** Private (Requires authentication)
    *   **Input:** None
    *   **Output (Success - 200):** `application/json`
        ```json
        {
          "success": true,
          "count": "number",
          "data": [ /* array of coworking space objects */ ]
        }
        ```
        *   Coworking Space Object:
            ```json
            {
              "_id": "string (ObjectId)",
              "name": "string",
              "address": "string",
              "telephoneNumber": "string",
              "openTime": "string (HH:MM)",
              "closeTime": "string (HH:MM)",
              "coordinates": { "type": "Point", "coordinates": ["number (longitude)", "number (latitude)"] },
              "createdAt": "string (ISODate)"
            }
            ```
    *   **Output (Error - 500):** `application/json`
        ```json
        { "success": false, "error": "Server Error" }
        ```

*   **`POST /`**
    *   **Description:** Creates a new coworking space. Can optionally include initial equipment.
    *   **Access:** Private (Admin only)
    *   **Input:** `application/json`
        ```json
        {
          "name": "string (required)",
          "address": "string (required)",
          "telephoneNumber": "string (required)",
          "openTime": "string (HH:MM, required)",
          "closeTime": "string (HH:MM, required)",
          "coordinates": { "type": "Point", "coordinates": ["number (longitude, required)", "number (latitude, required)"] },
          "initialEquipment": [ // Optional array of equipment objects
            {
              "name": "string (required)",
              "description": "string (optional)",
              "quantityAvailable": "number (integer, required)"
            }
            // ... more equipment items
          ]
        }
        ```
    *   **Output (Success - 201):** `application/json`
        ```json
        {
          "success": true,
          "data": { /* created coworking space object */ }
        }
        ```
    *   **Output (Error - 400):** `application/json` (e.g., validation errors)
        ```json
        { "success": false, "error": "string" }
        ```
    *   **Output (Error - 500):** `application/json`
        ```json
        { "success": false, "error": "Failed to create coworking space" }
        ```

*   **`GET /:id`**
    *   **Description:** Gets details of a specific coworking space.
    *   **Access:** Private (Requires authentication)
    *   **Input:**
        *   `id` (URL parameter): `string (ObjectId)`
    *   **Output (Success - 200):** `application/json`
        ```json
        {
          "success": true,
          "data": { /* coworking space object */ }
        }
        ```
    *   **Output (Error - 404):** `application/json`
        ```json
        { "success": false, "error": "Coworking space not found" }
        ```
    *   **Output (Error - 500):** `application/json`
        ```json
        { "success": false, "error": "Server Error" }
        ```

*   **`PUT /:id`**
    *   **Description:** Updates a specific coworking space.
    *   **Access:** Private (Admin only)
    *   **Input:**
        *   `id` (URL parameter): `string (ObjectId)`
        *   Body (`application/json`): Fields to update (e.g., `name`, `address`, etc.)
            ```json
            {
              "name": "string (optional)",
              "address": "string (optional)",
              /* ... other fields ... */
            }
            ```
    *   **Output (Success - 200):** `application/json`
        ```json
        {
          "success": true,
          "data": { /* updated coworking space object */ }
        }
        ```
    *   **Output (Error - 400):** `application/json` (Validation errors)
        ```json
        { "success": false, "error": "string" }
        ```
    *   **Output (Error - 404):** `application/json`
        ```json
        { "success": false, "error": "Coworking space not found" }
        ```

*   **`DELETE /:id`**
    *   **Description:** Deletes a specific coworking space.
    *   **Access:** Private (Admin only)
    *   **Input:**
        *   `id` (URL parameter): `string (ObjectId)`
    *   **Output (Success - 200):** `application/json`
        ```json
        { "success": true, "data": {} }
        ```
    *   **Output (Error - 404):** `application/json`
        ```json
        { "success": false, "error": "Coworking space not found" }
        ```
    *   **Output (Error - 500):** `application/json`
        ```json
        { "success": false, "error": "Server Error" }
        ```

*   **`GET /nearest`**
    *   **Description:** Finds coworking spaces near a given latitude and longitude (within 50km).
    *   **Access:** Public
    *   **Input:** Query Parameters
        *   `latitude`: `number (required)`
        *   `longitude`: `number (required)`
    *   **Output (Success - 200):** `application/json`
        ```json
        {
          "success": true,
          "count": "number",
          "data": [ /* array of nearby coworking space objects */ ]
        }
        ```
    *   **Output (Error - 400):** `application/json` (Missing parameters)
        ```json
        { "success": false, "error": "Please provide latitude and longitude parameters" }
        ```
    *   **Output (Error - 404):** `application/json` (No spaces found)
        ```json
        { "success": false, "error": "No coworking spaces found nearby." }
        ```
    *   **Output (Error - 500):** `application/json`
        ```json
        { "success": false, "error": "Internal Server Error" }
        ```

---

### Equipment (`/api/v1/equipment` or `/api/v1/coworking-spaces/:coworkingSpaceId/equipment`)

*   **`GET /` (standalone or nested)**
    *   **Description:** Gets a list of all equipment. If accessed via the nested route (`/coworking-spaces/:coworkingSpaceId/equipment`), it filters equipment for that specific space.
    *   **Access:** Public
    *   **Input:**
        *   `coworkingSpaceId` (URL parameter, optional via nested route): `string (ObjectId)`
    *   **Output (Success - 200):** `application/json`
        ```json
        {
          "success": true,
          "count": "number",
          "data": [ /* array of equipment objects */ ]
        }
        ```
        *   Equipment Object:
            ```json
            {
              "_id": "string (ObjectId)",
              "name": "string",
              "description": "string",
              "quantityAvailable": "number (integer)",
              "coworkingSpace": { /* populated coworking space details if not nested route */
                "_id": "string (ObjectId)",
                "name": "string",
                "description": "string"
              },
              "createdAt": "string (ISODate)"
            }
            ```
    *   **Output (Error - 404):** `application/json` (Coworking space not found, if using nested route)
        ```json
        { "success": false, "error": "Coworking space not found with id of ..." }
        ```
    *   **Output (Error - 500):** `application/json`
        ```json
        { "success": false, "error": "Server Error" }
        ```

*   **`POST /` (Nested route only: `/api/v1/coworking-spaces/:coworkingSpaceId/equipment`)**
    *   **Description:** Adds new equipment to a specific coworking space.
    *   **Access:** Private (Requires authentication, likely admin/owner in practice)
    *   **Input:**
        *   `coworkingSpaceId` (URL parameter): `string (ObjectId)`
        *   Body (`application/json`):
            ```json
            {
              "name": "string (required)",
              "description": "string (optional)",
              "quantityAvailable": "number (integer, required)"
            }
            ```
    *   **Output (Success - 201):** `application/json`
        ```json
        {
          "success": true,
          "data": { /* created equipment object */ }
        }
        ```
    *   **Output (Error - 404):** `application/json` (Coworking space not found)
        ```json
        { "success": false, "error": "Coworking space not found with id of ..." }
        ```
    *   **Output (Error - 500):** `application/json`

*   **`GET /:id`**
    *   **Description:** Gets details of a specific piece of equipment.
    *   **Access:** Public
    *   **Input:**
        *   `id` (URL parameter): `string (ObjectId)`
    *   **Output (Success - 200):** `application/json`
        ```json
        {
          "success": true,
          "data": { /* equipment object with populated coworkingSpace details */ }
        }
        ```
    *   **Output (Error - 404):** `application/json`
        ```json
        { "success": false, "error": "Equipment not found with id of ..." }
        ```
    *   **Output (Error - 500):** `application/json`

*   **`PUT /:id`**
    *   **Description:** Updates a specific piece of equipment.
    *   **Access:** Private (Requires authentication, likely admin/owner in practice)
    *   **Input:**
        *   `id` (URL parameter): `string (ObjectId)`
        *   Body (`application/json`): Fields to update (`name`, `description`, `quantityAvailable`)
            ```json
            {
              "name": "string (optional)",
              "description": "string (optional)",
              "quantityAvailable": "number (integer, optional)"
            }
            ```
    *   **Output (Success - 200):** `application/json`
        ```json
        {
          "success": true,
          "data": { /* updated equipment object */ }
        }
        ```
    *   **Output (Error - 404):** `application/json`
        ```json
        { "success": false, "error": "Equipment not found with id of ..." }
        ```
    *   **Output (Error - 500):** `application/json`

*   **`DELETE /:id`**
    *   **Description:** Deletes a specific piece of equipment.
    *   **Access:** Private (Requires authentication, likely admin/owner in practice)
    *   **Input:**
        *   `id` (URL parameter): `