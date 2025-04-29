# TDD Plan: Food and Drink Ordering Feature

This document outlines the step-by-step TDD plan for implementing the food and drink ordering feature, covering both backend and frontend development.

## User Story

As a customer
I want to order food and drinks from the available menu
So that I can enjoy refreshments during my work session.

## Acceptance Criteria

1.  **Given** the customer is logged in and browsing the menu
    **When** the customer places an order for food and drinks
    **Then** save the order and notify the store for preparation
2.  **Given** the customer has placed an order
    **When** the order is confirmed
    **Then** show estimated preparation time and status

---

## Backend Development (TDD Cycle: Red -> Green -> Refactor for each step)

### 1. Database Schema - Menu Items

- [x] **RED:** Write a failing test (`models/menuItem.test.js`) for `MenuItem` model creation/validation (fields: `name`, `description`, `price`, `category`, `isAvailable`).
- [x] **GREEN:** Implement the `MenuItem` model/schema (`models/MenuItem.js`) to pass the test.
- [x] **REFACTOR:** Review the model definition and tests for clarity and efficiency.

### 2. Database Schema - Orders

- [x] **RED:** Write a failing test (`models/order.test.js`) for `Order` model creation/validation (fields: `user`, `items` [{`menuItem`, `quantity`}], `totalPrice`, `status`, `estimatedPreparationTime`, `createdAt`).
    - [x] Test `user` (ObjectId, ref: 'User', required)
    - [x] Test `items` (Array of { menuItem: ObjectId, quantity: Number }, required, not empty, quantity >= 1)
    *   [x] Test `totalPrice` (Number, required, positive)
    *   [x] Test `status` (String, enum: ['pending', 'confirmed', 'preparing', 'ready', 'cancelled', 'delivered'], default: 'pending')
    *   [x] Test `estimatedPreparationTime` (Number, optional)
    *   [x] Test `createdAt` (Date, default: Date.now)
- [x] **GREEN:** Implement the `Order` model/schema (`models/Order.js`) to pass all tests.
- [x] **REFACTOR:** Review the model and tests. Consider virtuals/methods if appropriate.

### 3. API Endpoint - Get Menu (`GET /api/menu`)

- [x] **RED:** Write failing integration tests (`tests/menu.test.js`) for `GET /api/menu`.
    - [x] Test case 1: Expect `200 OK` and an array response on basic call.
    - [x] Test case 2: Seed DB, expect *only available* items in the response.
    - [x] Test case 3: Expect correct item structure (`_id`, `name`, `description`, `price`, `category`).
- [x] **GREEN:** Implement the route, controller, and database query.
    - [x] Create the route (`routes/menu.js`).
    - [x] Create the controller (`controllers/menuController.js`) to fetch only available items.
    - [x] Connect route and controller in `server.js`/app file.
- [x] **REFACTOR:** Optimize query, controller logic, and tests.

### 4. API Endpoint - Place Order (`POST /api/orders`)

- [x] **RED:** Write failing integration tests (`tests/orders.test.js`) for `POST /api/orders`.
    - [x] Test case 1 (Happy Path): Authenticated user, valid data -> `201 Created`, correct response body, DB verification (user, items, totalPrice, status).
    - [x] Test case 2 (Auth): Unauthenticated user -> `401 Unauthorized`/`403 Forbidden`.
    - [x] Test case 3 (Validation): Invalid data (empty items, bad menuItemId, zero quantity, etc.) -> `400 Bad Request` + errors.
    - [x] Test case 4 (Availability): Order unavailable item -> `400 Bad Request`.
- [x] **GREEN:** Implement the route, middleware, and controller logic.
    - [x] Create the route (`routes/orders.js`).
    - [x] Implement/apply authentication middleware (`middleware/auth.js`).
    - [x] Create the controller (`controllers/orderController.js`):
        - [x] Validate input data.
        - [x] Verify authentication.
        - [x] Fetch `MenuItem` details & check availability.
        - [x] Calculate `totalPrice`.
        - [x] Create and save the `Order` document.
        - [x] Return the created order.
    - [x] Connect route/controller.
- [x] **REFACTOR:** Refine validation, price calculation, error handling, DB interactions, tests. Consider a service layer.

### 5. API Endpoint - Get Order Status (`GET /api/orders/:orderId`)

- [x] **RED:** Write failing integration tests (`tests/orders.test.js`) for `GET /api/orders/:orderId`.
    - [x] Test case 1 (Happy Path): Authenticated owner requests order -> `200 OK` + order details.
    - [x] Test case 2 (Auth/Authz): Authenticated non-owner -> `404 Not Found`/`403 Forbidden`.
    - [x] Test case 3 (Auth): Unauthenticated user -> `401 Unauthorized`/`403 Forbidden`.
    - [x] Test case 4 (Not Found): Non-existent `orderId` -> `404 Not Found`.
- [x] **GREEN:** Implement the route, middleware, and controller logic.
    - [x] Add route to `routes/orders.js`.
    - [x] Apply authentication middleware.
    - [x] Create controller (`controllers/orderController.js`):
        - [x] Find order by ID.
        - [x] Verify user ownership.
        - [x] Return order details.
    - [x] Connect route/controller.
- [x] **REFACTOR:** Improve error handling, authorization logic, and tests.

### 6. Order Notification (Conceptual)

- [x] **DESIGN/TEST STRATEGY:** Define notification mechanism (WebSocket, etc.) and how to test it. (Acknowledged - potential location in `placeOrder` controller identified; implementation deferred).
- [x] **RED:** Modify/add test to assert notification mechanism is triggered on order creation.
- [x] **GREEN:** Integrate notification call into order creation controller.
- [x] **REFACTOR:** Ensure notification logic is robust and decoupled.

### 7. Admin Order Dashboard (Real-time)

- [x] **Backend API:**
    - [x] Add `authorize('admin')` middleware.
    - [x] Add `getAllOrders` controller function (`controllers/orderController.js`).
    - [x] Add `GET /api/v1/orders/admin/all` route (`routes/orders.js`) protected for admins.
- [x] **Backend Sockets:**
    - [x] Ensure `new_order` event is emitted upon order creation (`controllers/orderController.js`).
- [x] **Frontend Page:**
    - [x] Add `getAllOrdersAdmin` API function (`lib/orderApi.js`).
    - [x] Create Admin Orders page component (`app/admin/orders/page.jsx`).
    - [x] Add admin role check/redirect.
    - [x] Fetch and display initial list of all orders.
- [x] **Frontend Sockets:**
    - [x] Install `socket.io-client`.
    - [x] Implement Socket.IO connection in Admin Orders page.
    - [x] Add listener for `new_order` event.
    - [x] Update orders state in real-time when `new_order` is received.
    - [x] Implement socket disconnection on component unmount.
- [x] **UI Integration:**
    - [x] Add navigation link to `/admin/orders` in Navbar (for admins).

### 8. Admin Reservation & Equipment Dashboard (Real-time)

- [ ] **Backend API:**
    - [ ] Ensure `authorize('admin')` middleware exists.
    - [ ] Add/Verify `getAllReservations` controller function (e.g., in `controllers/reservationController.js`) that populates `user`, `coworkingSpace` (name needed), and `equipment` details.
    - [ ] Add/Verify `GET /api/v1/reservations/admin/all` route (e.g., in `routes/reservations.js`) protected for admins.
- [ ] **Backend Sockets:**
    - [ ] Ensure `new_reservation` or `updated_reservation` event is emitted upon relevant reservation changes, including populated `user`, `coworkingSpace.name`, and `equipment` details.
- [ ] **Frontend Page:**
    - [ ] Add `getAllReservationsAdmin` API function (e.g., in `lib/reservationApi.js`).
    - [ ] Create Admin Reservations page component (e.g., `app/admin/reservations/page.jsx`).
    - [ ] Add admin role check/redirect.
    - [ ] Fetch and display initial list of all reservations, showing space name and any requested equipment.
- [ ] **Frontend Sockets:**
    - [ ] Install `socket.io-client` (if not already done).
    - [ ] Implement Socket.IO connection in Admin Reservations page.
    - [ ] Add listener for relevant reservation event (e.g., `new_reservation`).
    - [ ] Update reservations state in real-time when event is received, ensuring necessary populated data is included.
    - [ ] Implement socket disconnection on component unmount.
- [ ] **UI Integration:**
    - [ ] Add navigation link to `/admin/reservations` in Navbar (for admins).

---

## Frontend Development (TDD Cycle: Red -> Green -> Refactor for each component/feature)

*(Assumes React/Next.js, Jest/React Testing Library/Cypress)*

### 1. Menu Display Component (`components/Menu.jsx`)

- [x] **RED:** Write failing component tests (`components/Menu.test.jsx`).
    - [x] Test case 1: Mocks API, asserts fetch attempt on mount.
    - [x] Test case 2: Mocks success data, asserts rendering of items (name, price, description).
    - [x] Test case 3: Mocks loading state, asserts loading indicator shown.
    - [x] Test case 4: Mocks error state, asserts error message shown.
- [x] **GREEN:** Implement the `Menu` component.
    - [x] Add state for loading, error, items (`useState`).
    - [x] Fetch data in `useEffect`.
    - [x] Render UI based on state.
- [x] **REFACTOR:** Improve component structure, data fetching (custom hook `useMenu`?), styling, tests.
- [x] **UI:** Add navigation link (e.g., in Header) pointing to the menu page.

### 2. Add to Order Functionality (Within `Menu` or `MenuItemCard`)

- [x] **RED:** Write failing component tests.
    - [x] Test case 1: Click "Add to Order" -> asserts state/context update (item ID, quantity 1).
    - [x] Test case 2: Test quantity adjustment if applicable.
- [x] **GREEN:** Implement button, event handlers, state management (local state or cart context/store).
- [x] **REFACTOR:** Clean up handlers and state logic.

### 3. Order Summary / Cart Component (`components/Cart.jsx`)

- [x] **RED:** Write failing component tests.
    - [x] Test case 1: Given cart items (props/context) -> asserts rendering (name, quantity, price).
    - [x] Test case 2: Asserts total price calculation and display.
    - [x] Test case 3: Asserts "Place Order" button exists.
- [x] **GREEN:** Implement the `Cart` component.
- [x] **REFACTOR:** Improve structure, calculations, tests.
- [x] **UI:** Add navigation element (e.g., Cart icon in Header) to display the Cart component (e.g., modal or dedicated page).

### 4. Order Placement Logic (Within `Cart` or hook/service)

- [x] **RED:** Write failing tests (unit/integration).
    - [x] Test case 1: Mocks API, click "Place Order" -> asserts `POST /api/orders` called with correct payload and auth.
    - [x] Test case 2: Mocks success response -> asserts success handling (clear cart, navigate, message).
    - [x] Test case 3: Mocks error response -> asserts error handling (display message).
- [x] **GREEN:** Implement `handlePlaceOrder` function.
    - [x] Format cart data for API.
    - [x] Make `POST` request (fetch/axios) with auth.
    - [x] Handle success/error responses, update UI state.
- [x] **REFACTOR:** Abstract API logic (service/hook), improve error handling/feedback.
- [x] **UI:** Redirect to Order Status page (`/orders/[orderId]`) upon successful order placement.

### 5. Order Confirmation/Status Page (`app/orders/[orderId]/page.jsx`)

- [x] **RED:** Write failing component/page tests.
    - [x] Test case 1: Mocks API, asserts fetch attempt using `orderId` from route.
    - [x] Test case 2: Mocks success data, asserts display of order details (items, total, status, est. time).
    - [x] Test case 3: Asserts handling of loading/error states.
- [x] **GREEN:** Implement the order status page.
    - [x] Get `orderId` from router.
    - [x] Fetch data in `useEffect`.
    - [x] Manage state (loading/error/data).
    - [x] Render order details.
- [x] **REFACTOR:** Improve data fetching, state management, UI.

### 6. End-to-End (E2E) Tests (Optional but Recommended)

- [ ] **RED:** Write failing E2E test (Cypress/Playwright).
    - [ ] Test case 1: Full flow (Login -> Menu -> Add -> Cart -> Place Order -> Confirmation). Assert initial details on confirmation page.
- [ ] **GREEN:** Ensure full stack works to pass the E2E test (debug as needed).
- [ ] **REFACTOR:** Optimize E2E test stability/performance.

---

## Deployment and Documentation

- [ ] Update API documentation (Swagger/OpenAPI) for `/menu`, `/orders`, `/orders/:orderId`.
- [ ] Update `README.md`/other docs with feature details.
- [ ] Configure deployment environments (staging, production).
- [ ] Deploy backend updates.
- [ ] Deploy frontend updates.
- [ ] Test deployed feature in staging/production.

---

This plan provides a structured approach using TDD. Remember to commit frequently after each Green/Refactor step.
