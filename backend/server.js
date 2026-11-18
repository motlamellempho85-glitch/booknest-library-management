require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");

const app = express();
const port = Number(process.env.PORT || 5000);

app.use(cors());
app.use(express.json());

const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "booknest"
};

const db = process.env.MYSQL_URL
  ? mysql.createPool(process.env.MYSQL_URL)
  : mysql.createPool({
      ...dbConfig,
      waitForConnections: true,
      connectionLimit: 10
    });

async function initialiseDatabase() {
  await db.query("SELECT 1");

  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      membership_id VARCHAR(100) NOT NULL UNIQUE,
      role VARCHAR(50) NOT NULL DEFAULT 'Member'
    )
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS books (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      author VARCHAR(255) NOT NULL,
      genre VARCHAR(100) NOT NULL,
      isbn VARCHAR(100) NOT NULL,
      quantity INT NOT NULL DEFAULT 0
    )
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      book_id INT NOT NULL,
      book_title VARCHAR(255) NOT NULL,
      type VARCHAR(50) NOT NULL,
      quantity INT NOT NULL,
      member VARCHAR(255) NOT NULL,
      transaction_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
    )
  `);

  const [[bookCount]] = await db.query("SELECT COUNT(*) AS count FROM books");
  if (bookCount.count === 0) {
    await db.query(
      "INSERT INTO books (title, author, genre, isbn, quantity) VALUES ?",
      [[
        ["Things Fall Apart", "Chinua Achebe", "Fiction", "9780385474542", 8],
        ["The Great Gatsby", "F. Scott Fitzgerald", "Classic", "9780743273565", 5],
        ["Atomic Habits", "James Clear", "Self Help", "9780735211292", 1],
        ["Purple Hibiscus", "Chimamanda Adichie", "Fiction", "9781616202415", 4]
      ]]
    );
  }

  const [[userCount]] = await db.query("SELECT COUNT(*) AS count FROM users");
  if (userCount.count === 0) {
    await db.query(
      "INSERT INTO users (name, membership_id, role) VALUES ?",
      [[
        ["Admin User", "ADM001", "Admin"],
        ["John Smith", "MEM001", "Member"],
        ["Mary Johnson", "MEM002", "Member"]
      ]]
    );
  }
}

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/books", async (req, res, next) => {
  try {
    const [rows] = await db.query("SELECT * FROM books ORDER BY id");
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

app.post("/api/books", async (req, res, next) => {
  try {
    const { title, author, genre, isbn, quantity } = req.body;
    if (!title || !author || !genre || !isbn || quantity === undefined) {
      return res.status(400).json({ error: "All book fields are required" });
    }
    const [result] = await db.query(
      "INSERT INTO books (title, author, genre, isbn, quantity) VALUES (?, ?, ?, ?, ?)",
      [title, author, genre, isbn, Number(quantity)]
    );
    const [rows] = await db.query("SELECT * FROM books WHERE id = ?", [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (error) {
    next(error);
  }
});

app.put("/api/books/:id", async (req, res, next) => {
  try {
    const { title, author, genre, isbn, quantity } = req.body;
    await db.query(
      "UPDATE books SET title = ?, author = ?, genre = ?, isbn = ?, quantity = ? WHERE id = ?",
      [title, author, genre, isbn, Number(quantity), req.params.id]
    );
    const [rows] = await db.query("SELECT * FROM books WHERE id = ?", [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: "Book not found" });
    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
});

app.delete("/api/books/:id", async (req, res, next) => {
  try {
    const [result] = await db.query("DELETE FROM books WHERE id = ?", [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: "Book not found" });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.get("/api/users", async (req, res, next) => {
  try {
    const [rows] = await db.query(
      "SELECT id, name, membership_id AS membershipId, role FROM users ORDER BY id"
    );
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

app.post("/api/users", async (req, res, next) => {
  try {
    const { name, membershipId, role } = req.body;
    if (!name || !membershipId) return res.status(400).json({ error: "Name and membership ID are required" });
    const [result] = await db.query(
      "INSERT INTO users (name, membership_id, role) VALUES (?, ?, ?)",
      [name, membershipId, role || "Member"]
    );
    res.status(201).json({ id: result.insertId, name, membershipId, role: role || "Member" });
  } catch (error) {
    next(error);
  }
});

app.put("/api/users/:id", async (req, res, next) => {
  try {
    const { name, membershipId, role } = req.body;
    await db.query(
      "UPDATE users SET name = ?, membership_id = ?, role = ? WHERE id = ?",
      [name, membershipId, role, req.params.id]
    );
    const [rows] = await db.query(
      "SELECT id, name, membership_id AS membershipId, role FROM users WHERE id = ?",
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "User not found" });
    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
});

app.delete("/api/users/:id", async (req, res, next) => {
  try {
    const [result] = await db.query("DELETE FROM users WHERE id = ?", [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: "User not found" });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.get("/api/transactions", async (req, res, next) => {
  try {
    const [rows] = await db.query(`
      SELECT id, book_id AS bookId, book_title AS book, type, quantity, member,
             DATE_FORMAT(transaction_date, '%Y-%m-%d') AS date
      FROM transactions ORDER BY transaction_date DESC, id DESC
    `);
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

app.post("/api/transactions", async (req, res, next) => {
  const { bookId, type, quantity, member } = req.body;
  const amount = Number(quantity);
  if (!bookId || !type || !amount || amount < 1 || !member) {
    return res.status(400).json({ error: "All transaction fields are required" });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [bookRows] = await connection.query(
      "SELECT * FROM books WHERE id = ? FOR UPDATE",
      [bookId]
    );
    if (bookRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: "Book not found" });
    }

    const book = bookRows[0];
    let newQuantity = book.quantity;
    if (type === "Borrow") newQuantity -= amount;
    else if (type === "Return" || type === "Add Stock") newQuantity += amount;
    else {
      await connection.rollback();
      return res.status(400).json({ error: "Invalid transaction type" });
    }

    if (newQuantity < 0) {
      await connection.rollback();
      return res.status(400).json({ error: "Not enough books available" });
    }

    await connection.query("UPDATE books SET quantity = ? WHERE id = ?", [newQuantity, bookId]);
    const [result] = await connection.query(
      "INSERT INTO transactions (book_id, book_title, type, quantity, member) VALUES (?, ?, ?, ?, ?)",
      [bookId, book.title, type, amount, member]
    );
    await connection.commit();

    const [rows] = await connection.query(`
      SELECT id, book_id AS bookId, book_title AS book, type, quantity, member,
             DATE_FORMAT(transaction_date, '%Y-%m-%d') AS date
      FROM transactions WHERE id = ?
    `, [result.insertId]);
    res.status(201).json({ transaction: rows[0], book: { ...book, quantity: newQuantity } });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({
    error: error.code === "ER_DUP_ENTRY" ? "Duplicate value" : "Internal server error"
  });
});

initialiseDatabase()
  .then(() => {
    app.listen(port, "0.0.0.0", () => {
      console.log(`BookNest API listening on http://localhost:${port}`);
    });
  })
  .catch(error => {
    console.error("Database connection failed:", error.message);
    process.exit(1);
  });