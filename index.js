const express = require("express");
const { run, get, all } = require("./db");
const schemas = require("./schemas");

const app = express();
const PORT = 3000;

app.use(express.json());

// Middleware that checks req.body against a Joi schema.
// If it's valid, req.body is replaced with Joi's cleaned-up version.
function validateBody(schema) {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body ?? {});
        if (error) {
            return res.status(400).send(error.details[0].message);
        }
        req.body = value;
        next();
    };
}

// Middleware that checks the named route parameters are positive whole numbers
function validateIds(...names) {
    return (req, res, next) => {
        for (const name of names) {
            const { error } = schemas.idSchema.validate(req.params[name]);
            if (error) {
                return res.status(400).send(`"${name}" must be a positive whole number`);
            }
        }
        next();
    };
}

// Builds "col1 = ?, col2 = ?" from a validated body, for PATCH routes.
// Only keys allowed by the Joi schema can get here, so this is safe.
function buildUpdate(body) {
    const columns = Object.keys(body);
    return {
        sql: columns.map(column => `${column} = ?`).join(", "),
        params: columns.map(column => body[column])
    };
}

// Home route
app.get("/", (req, res) => {
    res.send("Shopping Cart API");
});

// ---------------------------------------------------------------------------
// Exercises 1 & 2 - Shopping cart (validated with Joi, stored in SQLite)
// ---------------------------------------------------------------------------

// GET /cart
// Returns all items in the cart
app.get("/cart", async (req, res) => {
    const items = await all("SELECT * FROM cart");
    res.status(200).json(items);
});

// POST /cart
// Adds a new item
app.post("/cart", validateBody(schemas.cartItemSchema), async (req, res) => {
    const { item_name, item_price, quantity } = req.body;

    const result = await run(
        "INSERT INTO cart (item_name, item_price, quantity) VALUES (?, ?, ?)",
        [item_name, item_price, quantity]
    );

    const item = await get("SELECT * FROM cart WHERE item_id = ?", [result.lastID]);
    res.status(201).json(item);
});

// GET /cart/:id
// Gets a single item
app.get("/cart/:id", validateIds("id"), async (req, res) => {
    const item = await get("SELECT * FROM cart WHERE item_id = ?", [req.params.id]);

    if (!item) {
        return res.status(404).send("Item not found");
    }

    res.status(200).json(item);
});

// PATCH /cart/:id
// Updates only quantity
app.patch("/cart/:id", validateIds("id"), validateBody(schemas.quantitySchema), async (req, res) => {
    const result = await run(
        "UPDATE cart SET quantity = ? WHERE item_id = ?",
        [req.body.quantity, req.params.id]
    );

    if (result.changes === 0) {
        return res.status(404).send("Item not found");
    }

    const item = await get("SELECT * FROM cart WHERE item_id = ?", [req.params.id]);
    res.status(200).json(item);
});

// DELETE /cart/:id
// Deletes an item and returns "<item name> Deleted"
app.delete("/cart/:id", validateIds("id"), async (req, res) => {
    const item = await get("SELECT * FROM cart WHERE item_id = ?", [req.params.id]);

    if (!item) {
        return res.status(404).send("Item not found");
    }

    await run("DELETE FROM cart WHERE item_id = ?", [req.params.id]);
    res.status(200).send(`${item.item_name} Deleted`);
});

// ---------------------------------------------------------------------------
// Exercise 3 - Users
// ---------------------------------------------------------------------------

// GET /users
// Returns all users
app.get("/users", async (req, res) => {
    const users = await all("SELECT * FROM users");
    res.status(200).json(users);
});

// POST /users
// Creates a user and an empty basket for them
app.post("/users", validateBody(schemas.userSchema), async (req, res) => {
    const { username, email } = req.body;

    const result = await run(
        "INSERT INTO users (username, email) VALUES (?, ?)",
        [username, email]
    );
    await run("INSERT INTO carts (user_id) VALUES (?)", [result.lastID]);

    const user = await get("SELECT * FROM users WHERE user_id = ?", [result.lastID]);
    res.status(201).json(user);
});

// GET /users/:id
// Gets a single user
app.get("/users/:id", validateIds("id"), async (req, res) => {
    const user = await get("SELECT * FROM users WHERE user_id = ?", [req.params.id]);

    if (!user) {
        return res.status(404).send("User not found");
    }

    res.status(200).json(user);
});

// PATCH /users/:id
// Updates a user's username and/or email
app.patch("/users/:id", validateIds("id"), validateBody(schemas.userUpdateSchema), async (req, res) => {
    const update = buildUpdate(req.body);

    const result = await run(
        `UPDATE users SET ${update.sql} WHERE user_id = ?`,
        [...update.params, req.params.id]
    );

    if (result.changes === 0) {
        return res.status(404).send("User not found");
    }

    const user = await get("SELECT * FROM users WHERE user_id = ?", [req.params.id]);
    res.status(200).json(user);
});

// DELETE /users/:id
// Deletes a user - their basket is removed too (ON DELETE CASCADE)
app.delete("/users/:id", validateIds("id"), async (req, res) => {
    const user = await get("SELECT * FROM users WHERE user_id = ?", [req.params.id]);

    if (!user) {
        return res.status(404).send("User not found");
    }

    await run("DELETE FROM users WHERE user_id = ?", [req.params.id]);
    res.status(200).send(`${user.username} Deleted`);
});

// ---------------------------------------------------------------------------
// Exercise 3 - Products
// ---------------------------------------------------------------------------

// GET /products
// Returns all products
app.get("/products", async (req, res) => {
    const products = await all("SELECT * FROM products");
    res.status(200).json(products);
});

// POST /products
// Adds a new product
app.post("/products", validateBody(schemas.productSchema), async (req, res) => {
    const { product_name, product_price } = req.body;

    const result = await run(
        "INSERT INTO products (product_name, product_price) VALUES (?, ?)",
        [product_name, product_price]
    );

    const product = await get("SELECT * FROM products WHERE product_id = ?", [result.lastID]);
    res.status(201).json(product);
});

// GET /products/:id
// Gets a single product
app.get("/products/:id", validateIds("id"), async (req, res) => {
    const product = await get("SELECT * FROM products WHERE product_id = ?", [req.params.id]);

    if (!product) {
        return res.status(404).send("Product not found");
    }

    res.status(200).json(product);
});

// PATCH /products/:id
// Updates a product's name and/or price
app.patch("/products/:id", validateIds("id"), validateBody(schemas.productUpdateSchema), async (req, res) => {
    const update = buildUpdate(req.body);

    const result = await run(
        `UPDATE products SET ${update.sql} WHERE product_id = ?`,
        [...update.params, req.params.id]
    );

    if (result.changes === 0) {
        return res.status(404).send("Product not found");
    }

    const product = await get("SELECT * FROM products WHERE product_id = ?", [req.params.id]);
    res.status(200).json(product);
});

// DELETE /products/:id
// Deletes a product - it's removed from every basket too (ON DELETE CASCADE)
app.delete("/products/:id", validateIds("id"), async (req, res) => {
    const product = await get("SELECT * FROM products WHERE product_id = ?", [req.params.id]);

    if (!product) {
        return res.status(404).send("Product not found");
    }

    await run("DELETE FROM products WHERE product_id = ?", [req.params.id]);
    res.status(200).send(`${product.product_name} Deleted`);
});

// ---------------------------------------------------------------------------
// Exercise 3 - A user's basket (joins users, carts, cart_items and products)
// ---------------------------------------------------------------------------

// Finds the cart_id for a user, or undefined if the user doesn't exist
async function getCartId(userId) {
    const cart = await get(
        `SELECT carts.cart_id FROM users
         JOIN carts ON carts.user_id = users.user_id
         WHERE users.user_id = ?`,
        [userId]
    );
    return cart?.cart_id;
}

// Gets one item in a basket, with the product details joined in
function getBasketItem(cartId, productId) {
    return get(
        `SELECT products.product_id, products.product_name, products.product_price, cart_items.quantity
         FROM cart_items
         JOIN products ON products.product_id = cart_items.product_id
         WHERE cart_items.cart_id = ? AND cart_items.product_id = ?`,
        [cartId, productId]
    );
}

// GET /users/:id/basket
// Returns everything in a user's basket and the total cost
app.get("/users/:id/basket", validateIds("id"), async (req, res) => {
    const cartId = await getCartId(req.params.id);

    if (!cartId) {
        return res.status(404).send("User not found");
    }

    const items = await all(
        `SELECT products.product_id, products.product_name, products.product_price, cart_items.quantity,
                ROUND(products.product_price * cart_items.quantity, 2) AS line_total
         FROM cart_items
         JOIN products ON products.product_id = cart_items.product_id
         WHERE cart_items.cart_id = ?`,
        [cartId]
    );

    const total = items.reduce((sum, item) => sum + item.line_total, 0);

    res.status(200).json({
        user_id: Number(req.params.id),
        items,
        total: Math.round(total * 100) / 100
    });
});

// POST /users/:id/basket
// Adds a product to a user's basket. If it's already there, the quantities are added together.
app.post("/users/:id/basket", validateIds("id"), validateBody(schemas.basketItemSchema), async (req, res) => {
    const { product_id, quantity } = req.body;
    const cartId = await getCartId(req.params.id);

    if (!cartId) {
        return res.status(404).send("User not found");
    }

    const product = await get("SELECT * FROM products WHERE product_id = ?", [product_id]);

    if (!product) {
        return res.status(404).send("Product not found");
    }

    await run(
        `INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (?, ?, ?)
         ON CONFLICT (cart_id, product_id) DO UPDATE SET quantity = quantity + excluded.quantity`,
        [cartId, product_id, quantity]
    );

    const item = await getBasketItem(cartId, product_id);
    res.status(201).json(item);
});

// PATCH /users/:id/basket/:productId
// Sets the quantity of a product in a user's basket
app.patch("/users/:id/basket/:productId", validateIds("id", "productId"), validateBody(schemas.quantitySchema), async (req, res) => {
    const cartId = await getCartId(req.params.id);

    if (!cartId) {
        return res.status(404).send("User not found");
    }

    const result = await run(
        "UPDATE cart_items SET quantity = ? WHERE cart_id = ? AND product_id = ?",
        [req.body.quantity, cartId, req.params.productId]
    );

    if (result.changes === 0) {
        return res.status(404).send("Item not found in basket");
    }

    const item = await getBasketItem(cartId, req.params.productId);
    res.status(200).json(item);
});

// DELETE /users/:id/basket/:productId
// Removes a product from a user's basket and returns "<product name> Deleted"
app.delete("/users/:id/basket/:productId", validateIds("id", "productId"), async (req, res) => {
    const cartId = await getCartId(req.params.id);

    if (!cartId) {
        return res.status(404).send("User not found");
    }

    const item = await getBasketItem(cartId, req.params.productId);

    if (!item) {
        return res.status(404).send("Item not found in basket");
    }

    await run(
        "DELETE FROM cart_items WHERE cart_id = ? AND product_id = ?",
        [cartId, req.params.productId]
    );
    res.status(200).send(`${item.product_name} Deleted`);
});

// DELETE /users/:id/basket
// Empties a user's basket
app.delete("/users/:id/basket", validateIds("id"), async (req, res) => {
    const cartId = await getCartId(req.params.id);

    if (!cartId) {
        return res.status(404).send("User not found");
    }

    await run("DELETE FROM cart_items WHERE cart_id = ?", [cartId]);
    res.status(200).send("Basket emptied");
});

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

// Express 5 passes errors from async routes here automatically
app.use((err, req, res, next) => {
    // e.g. a username or email that's already taken
    if (err.code === "SQLITE_CONSTRAINT") {
        return res.status(409).send("That conflicts with an existing record");
    }
    // e.g. malformed JSON in the request body
    if (err.type === "entity.parse.failed") {
        return res.status(400).send("Invalid JSON");
    }
    console.error(err);
    res.status(500).send("Something went wrong");
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
