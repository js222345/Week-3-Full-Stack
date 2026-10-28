# Shopping Cart API

Express + Joi + SQLite. Data is stored in `db.sqlite`, which is created automatically on first run.

## Setup

```
npm install
npm run main
```

The server runs on http://localhost:3000.

## Files

- `index.js` - routes
- `db.js` - SQLite connection, table creation and promise helpers (`run`, `get`, `all`)
- `schemas.js` - Joi validation schemas

## Endpoints

### Cart (Exercises 1 & 2)

| Method | Route       | Request                               | Response                                   |
|--------|-------------|---------------------------------------|--------------------------------------------|
| GET    | `/cart`     | -                                     | `[cart_items]`                             |
| POST   | `/cart`     | `item_name`, `item_price`, `quantity` | `item_id`, `item_name`, `item_price`, `quantity` |
| GET    | `/cart/:id` | -                                     | `item_id`, `item_name`, `item_price`, `quantity` |
| PATCH  | `/cart/:id` | `quantity`                            | `item_id`, `item_name`, `item_price`, `quantity` |
| DELETE | `/cart/:id` | -                                     | `"<item name> Deleted"`                    |

### Users, products and baskets (Exercise 3)

| Method | Route                            | Request                         | Description                                  |
|--------|----------------------------------|---------------------------------|----------------------------------------------|
| GET    | `/users`                         | -                               | All users                                    |
| POST   | `/users`                         | `username`, `email`             | Create a user (and an empty basket)          |
| GET    | `/users/:id`                     | -                               | One user                                     |
| PATCH  | `/users/:id`                     | `username` and/or `email`       | Update a user                                |
| DELETE | `/users/:id`                     | -                               | Delete a user and their basket               |
| GET    | `/products`                      | -                               | All products                                 |
| POST   | `/products`                      | `product_name`, `product_price` | Create a product                             |
| GET    | `/products/:id`                  | -                               | One product                                  |
| PATCH  | `/products/:id`                  | `product_name` and/or `product_price` | Update a product                       |
| DELETE | `/products/:id`                  | -                               | Delete a product (removed from all baskets)  |
| GET    | `/users/:id/basket`              | -                               | Items in the user's basket, plus the total   |
| POST   | `/users/:id/basket`              | `product_id`, `quantity`        | Add a product (adds to quantity if already there) |
| PATCH  | `/users/:id/basket/:productId`   | `quantity`                      | Set the quantity of a product in the basket  |
| DELETE | `/users/:id/basket/:productId`   | -                               | Remove a product from the basket             |
| DELETE | `/users/:id/basket`              | -                               | Empty the basket                             |

Invalid input returns `400` with the Joi error message, missing records return `404`, and duplicate usernames/emails return `409`.

## Database design

```
users (user_id PK, username UNIQUE, email UNIQUE)
  1 ─── 1
carts (cart_id PK, user_id FK UNIQUE)
  1 ─── many
cart_items (cart_id FK, product_id FK, quantity)   PK = (cart_id, product_id)
  many ─── 1
products (product_id PK, product_name, product_price)
```

`cart_items` is a junction table linking baskets and products (many-to-many). Foreign keys use `ON DELETE CASCADE`, so deleting a user or product cleans up the related rows.
