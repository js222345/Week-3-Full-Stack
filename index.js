const joi = require("joi");
const express = require("express");
const app = express();

const DBSOURCE = "db.sqlite";

let db = new sqlite3.Database(DBSOURCE, (err) => {
    if (err) {
        console.error(err.message);
        throw err;
    } else {
        console.log("Connected to the SQLite database.");

db.run(`CREATE TABLE IF NOT EXISTS cart(
    item_id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_name TEXT NOT NULL,
    item_price REAL NOT NULL,
    quantity INTEGER NOT NULL
)
`, (err) => {
    if (err) {
        console.error(err.message);
        throw err;
    } else {
        console.log("Cart table created or already exists.");
    }});
const PORT = 3000;

const schema = joi.object({
    item_id: joi.number().required(),
    item_name: joi.string().required(),
    item_price: joi.number().required(),
    quantity: joi.number().required()
});

const { error } = schema.validate(req.body);
if (error) { return res.status(400).send(error.details[0].message);}

app.use(express.json());

let cart = [];
let next_id = 1;

// Home route
app.get("/", (req, res) => {
    res.send("Shopping Cart API");
});

// GET /cart
// Returns all items in the cart
app.get("/cart", (req, res) => {
    res.status(200).json(cart);
});

// POST /cart
// Adds a new item
app.post("/cart", (req, res) => {
    const item = {
        item_id: next_id++,
        item_name: req.body.item_name,
        item_price: req.body.item_price,
        quantity: req.body.quantity
    };

    cart.push(item);

    res.status(201).json(item);
});

// GET /cart/:id
// Gets a single item
app.get("/cart/:id", (req, res) => {
    const id = parseInt(req.params.id);

    const item = cart.find(item => item.item_id === id);

    if (!item) {
        return res.status(404).send("Item not found");
    }

    res.status(200).json(item);
});

// PATCH /cart/:id
// Updates only quantity
app.patch("/cart/:id", (req, res) => {
    const id = parseInt(req.params.id);

    const item = cart.find(item => item.item_id === id);

    if (!item) {
        return res.status(404).send("Item not found");
    }

    item.quantity = req.body.quantity;

    res.status(200).json(item);
});

// DELETE /cart/:id
// Deletes an item and returns "<item name> Deleted"
app.delete("/cart/:id", (req, res) => {
    const id = parseInt(req.params.id);

    const item = cart.find(item => item.item_id === id);

    if (!item) {
        return res.status(404).send("Item not found");
    }

    cart = cart.filter(item => item.item_id !== id);

    res.status(200).send(`${item.item_name} Deleted`);
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});