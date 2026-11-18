
import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  NavLink
} from "react-router-dom";
import {
  LayoutDashboard, BookOpen, ArrowLeftRight, Users,
  Plus, Search, Trash2, Edit, Library, Menu, X,
  AlertTriangle, TrendingUp, Clock,
  RotateCcw, BookMarked
} from "lucide-react";
import "./App.css";

const API_BASE = `${(import.meta.env.VITE_API_URL || "").replace(/\/$/, "")}/api`;

async function api(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers
    }
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${response.status})`);
  }

  return response.status === 204 ? null : response.json();
}

function App() {
  const [books, setBooks] = useState([]);
  const [users, setUsers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  const totalBooks = books.reduce((sum, book) => sum + Number(book.quantity), 0);
  const lowStock = books.filter(book => book.quantity < 2).length;

  function notify(message) {
    setNotice(message);
    setTimeout(() => setNotice(""), 3000);
  }

  useEffect(() => {
    async function loadLibrary() {
      try {
        const [bookRows, userRows, transactionRows] = await Promise.all([
          api("/books"),
          api("/users"),
          api("/transactions")
        ]);
        setBooks(bookRows);
        setUsers(userRows);
        setTransactions(transactionRows);
      } catch (error) {
        notify(error.message);
      }
    }
    loadLibrary();
  }, []);

  async function saveBook(book) {
    try {
      if (book.id) {
        const updated = await api(`/books/${book.id}`, {
          method: "PUT",
          body: JSON.stringify(book)
        });
        setBooks(old => old.map(b => b.id === updated.id ? updated : b));
        notify("Book updated successfully");
      } else {
        const created = await api("/books", {
          method: "POST",
          body: JSON.stringify(book)
        });
        setBooks(old => [...old, created]);
        notify("Book added successfully");
      }
    } catch (error) {
      notify(error.message);
    }
  }

  async function deleteBook(id) {
    if (window.confirm("Delete this book?")) {
      try {
        await api(`/books/${id}`, { method: "DELETE" });
        setBooks(old => old.filter(b => b.id !== id));
        notify("Book deleted");
      } catch (error) {
        notify(error.message);
      }
    }
  }

  async function saveUser(user) {
    try {
      if (user.id) {
        const updated = await api(`/users/${user.id}`, {
          method: "PUT",
          body: JSON.stringify(user)
        });
        setUsers(old => old.map(u => u.id === updated.id ? updated : u));
        notify("User updated successfully");
      } else {
        const created = await api("/users", {
          method: "POST",
          body: JSON.stringify(user)
        });
        setUsers(old => [...old, created]);
        notify("User registered successfully");
      }
    } catch (error) {
      notify(error.message);
    }
  }

  async function deleteUser(id) {
    if (window.confirm("Delete this user?")) {
      try {
        await api(`/users/${id}`, { method: "DELETE" });
        setUsers(old => old.filter(u => u.id !== id));
        notify("User deleted");
      } catch (error) {
        notify(error.message);
      }
    }
  }

  async function recordTransaction(bookId, type, quantity, member) {
    try {
      const result = await api("/transactions", {
        method: "POST",
        body: JSON.stringify({ bookId: Number(bookId), type, quantity, member })
      });
      setBooks(old => old.map(b => b.id === result.book.id ? result.book : b));
      setTransactions(old => [result.transaction, ...old]);
      notify("Transaction recorded successfully");
    } catch (error) {
      notify(error.message);
    }
  }

  return (
    <BrowserRouter>
      <div className="app-layout">
        <aside className={`sidebar ${menuOpen ? "open" : ""}`}>
          <div className="brand">
            <div className="brand-icon"><Library size={25} /></div>
            <div>
              <h2>BookNest</h2>
              <span>LIBRARY MANAGEMENT</span>
            </div>
            <button className="close-menu" onClick={() => setMenuOpen(false)}><X /></button>
          </div>

          <div className="nav-heading">MAIN MENU</div>

          <nav>
            <NavLink to="/" end onClick={() => setMenuOpen(false)}>
              <LayoutDashboard /> Dashboard
            </NavLink>
            <NavLink to="/books" onClick={() => setMenuOpen(false)}>
              <BookOpen /> Book Management
            </NavLink>
            <NavLink to="/transactions" onClick={() => setMenuOpen(false)}>
              <ArrowLeftRight /> Transactions
            </NavLink>
            <NavLink to="/users" onClick={() => setMenuOpen(false)}>
              <Users /> User Management
            </NavLink>
          </nav>

          <div className="sidebar-bottom">
            <div className="admin-profile">
              <div className="avatar">A</div>
              <div><strong>Administrator</strong><span>Library Admin</span></div>
            </div>
            <div className="sidebar-footer">© 2026 BookNest</div>
          </div>
        </aside>

        <main className="main-area">
          <header className="topbar">
            <button className="menu-button" onClick={() => setMenuOpen(true)}><Menu /></button>
            <div className="top-search">
              <Search size={17} />
              <input placeholder="Search library..." value={search}
                onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="topbar-right">
              <span className="status-dot"></span>
              <span>System Online</span>
              <div className="avatar">A</div>
              <strong>Administrator</strong>
            </div>
          </header>

          {notice && <div className="notification">{notice}</div>}

          <div className="page-content">
            <Routes>
              <Route path="/" element={
                <Dashboard books={books} users={users}
                  transactions={transactions} totalBooks={totalBooks}
                  lowStock={lowStock} />
              } />
              <Route path="/books" element={
                <BooksPage books={books} search={search}
                  saveBook={saveBook} deleteBook={deleteBook} />
              } />
              <Route path="/transactions" element={
                <TransactionsPage books={books} users={users}
                  transactions={transactions} recordTransaction={recordTransaction} />
              } />
              <Route path="/users" element={
                <UsersPage users={users} saveUser={saveUser}
                  deleteUser={deleteUser} />
              } />
            </Routes>
          </div>
        </main>
      </div>
    </BrowserRouter>
  );
}

function PageHeading({ title, description, action }) {
  return (
    <div className="page-heading">
      <div><h1>{title}</h1><p>{description}</p></div>
      {action}
    </div>
  );
}

function StatCard({ title, value, icon, color, detail }) {
  return (
    <div className="stat-card">
      <div>
        <span>{title}</span>
        <h2>{value}</h2>
        <small>{detail}</small>
      </div>
      <div className={`stat-icon ${color}`}>{icon}</div>
    </div>
  );
}

function Dashboard({ books, users, transactions, totalBooks, lowStock }) {
  const borrowed = transactions
    .filter(t => t.type === "Borrow")
    .reduce((sum, t) => sum + t.quantity, 0);

  return (
    <>
      <PageHeading title="Library Dashboard"
        description="Welcome back! Here's an overview of your library." />

      <div className="welcome-banner">
        <div>
          <span>BOOKNEST LIBRARY</span>
          <h2>Your library, organised.</h2>
          <p>Manage your books, members and borrowing activities in one place.</p>
        </div>
        <div className="welcome-art"><Library size={75} /></div>
      </div>

      <div className="stats-grid">
        <StatCard title="Total Book Copies" value={totalBooks}
          icon={<BookOpen />} color="purple" detail="Books in stock" />
        <StatCard title="Registered Members" value={users.length}
          icon={<Users />} color="blue" detail="Library users" />
        <StatCard title="Borrowed Copies" value={borrowed}
          icon={<ArrowLeftRight />} color="green" detail="Recorded borrowing" />
        <StatCard title="Low Stock Books" value={lowStock}
          icon={<AlertTriangle />} color="orange" detail="Below 2 copies" />
      </div>

      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-heading">
            <div><h3>Book Availability</h3><p>Current library collection</p></div>
            <BookMarked className="heading-icon" />
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>BOOK TITLE</th><th>AUTHOR</th><th>GENRE</th><th>STOCK</th><th>STATUS</th></tr></thead>
              <tbody>
                {books.map(book => (
                  <tr key={book.id}>
                    <td><strong>{book.title}</strong></td>
                    <td>{book.author}</td>
                    <td>{book.genre}</td>
                    <td>{book.quantity}</td>
                    <td><span className={`status ${book.quantity < 2 ? "low" : "available"}`}>
                      {book.quantity < 2 ? "Low Stock" : "Available"}
                    </span></td>
                  </tr>
                ))}
                {books.length === 0 && <tr><td colSpan="5">No books available.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div><h3>Library Overview</h3><p>Collection summary</p></div>
            <TrendingUp className="heading-icon" />
          </div>
          <div className="overview-item"><span>Book titles</span><strong>{books.length}</strong></div>
          <div className="overview-item"><span>Total copies</span><strong>{totalBooks}</strong></div>
          <div className="overview-item"><span>Members</span><strong>{users.length}</strong></div>
          <div className="overview-item"><span>Transactions</span><strong>{transactions.length}</strong></div>
          <div className="low-stock-note"><AlertTriangle size={19} />
            <span>{lowStock} book title(s) need attention.</span></div>
        </section>
      </div>

      <section className="panel">
        <div className="panel-heading">
          <div><h3>Recent Transactions</h3><p>Latest library activities</p></div>
          <Clock className="heading-icon" />
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>BOOK</th><th>ACTIVITY</th><th>QUANTITY</th><th>MEMBER</th><th>DATE</th></tr></thead>
            <tbody>
              {transactions.slice(0, 5).map(t => (
                <tr key={t.id}>
                  <td><strong>{t.book}</strong></td><td>{t.type}</td>
                  <td>{t.quantity}</td><td>{t.member}</td><td>{t.date}</td>
                </tr>
              ))}
              {transactions.length === 0 &&
                <tr><td colSpan="5" className="empty-state">No transactions recorded yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function BooksPage({ books, search, saveBook, deleteBook }) {
  const [form, setForm] = useState({
    title: "", author: "", genre: "", isbn: "", quantity: ""
  });
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);

  function reset() {
    setForm({ title: "", author: "", genre: "", isbn: "", quantity: "" });
    setEditing(null);
    setShowForm(false);
  }

  function submit(e) {
    e.preventDefault();
    if (!form.title.trim() || !form.author.trim() || !form.genre.trim() ||
        !form.isbn.trim() || form.quantity === "" || Number(form.quantity) < 0) {
      alert("Please complete all fields correctly.");
      return;
    }

    saveBook({
      ...form,
      quantity: Number(form.quantity),
      id: editing || undefined
    });
    reset();
  }

  function edit(book) {
    setEditing(book.id);
    setForm({ ...book, quantity: String(book.quantity) });
    setShowForm(true);
  }

  const filtered = books.filter(book =>
    `${book.title} ${book.author} ${book.genre} ${book.isbn}`
      .toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <PageHeading title="Book Management"
        description="Add, update, search and manage library books."
        action={<button className="primary-button" onClick={() => {
          reset(); setShowForm(true);
        }}><Plus size={17} /> Add New Book</button>} />

      {showForm && <section className="panel form-panel">
        <h3>{editing ? "Update Book Details" : "Add New Book"}</h3>
        <form className="form-grid" onSubmit={submit}>
          <label>Book Title<input required value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })} /></label>
          <label>Author<input required value={form.author}
            onChange={e => setForm({ ...form, author: e.target.value })} /></label>
          <label>Genre<input required value={form.genre}
            onChange={e => setForm({ ...form, genre: e.target.value })} /></label>
          <label>ISBN<input required value={form.isbn}
            onChange={e => setForm({ ...form, isbn: e.target.value })} /></label>
          <label>Initial Quantity<input required type="number" min="0"
            value={form.quantity}
            onChange={e => setForm({ ...form, quantity: e.target.value })} /></label>
          <div className="form-actions">
            <button className="primary-button" type="submit">Save Book</button>
            <button className="secondary-button" type="button" onClick={reset}>Cancel</button>
          </div>
        </form>
      </section>}

      <section className="panel">
        <div className="panel-heading">
          <div><h3>Library Collection</h3><p>{books.length} registered book titles</p></div>
          <span className="collection-icon"><Library size={20} /></span>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>TITLE</th><th>AUTHOR</th><th>GENRE</th><th>ISBN</th><th>QUANTITY</th><th>STATUS</th><th>ACTIONS</th></tr></thead>
            <tbody>
              {filtered.map(book => (
                <tr key={book.id}>
                  <td><strong>{book.title}</strong></td><td>{book.author}</td>
                  <td>{book.genre}</td><td>{book.isbn}</td><td>{book.quantity}</td>
                  <td><span className={`status ${book.quantity < 2 ? "low" : "available"}`}>
                    {book.quantity < 2 ? "Low Stock" : "Available"}
                  </span></td>
                  <td><div className="action-buttons">
                    <button title="Edit" onClick={() => edit(book)}><Edit size={16} /></button>
                    <button title="Delete" className="delete-action"
                      onClick={() => deleteBook(book.id)}><Trash2 size={16} /></button>
                  </div></td>
                </tr>
              ))}
              {filtered.length === 0 &&
                <tr><td colSpan="7" className="empty-state">No books found.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function TransactionsPage({ books, users, transactions, recordTransaction }) {
  const [bookId, setBookId] = useState("");
  const [type, setType] = useState("Borrow");
  const [quantity, setQuantity] = useState("1");
  const [member, setMember] = useState("");

  function submit(e) {
    e.preventDefault();
    if (!bookId || !member) {
      alert("Select a book and member.");
      return;
    }
    recordTransaction(bookId, type, quantity, member);
    setBookId("");
    setQuantity("1");
    setMember("");
  }

  return (
    <>
      <PageHeading title="Transactions"
        description="Manage borrowing, returns and stock additions." />

      <section className="panel form-panel">
        <h3>Record Library Transaction</h3>
        <form className="form-grid" onSubmit={submit}>
          <label>Select Book<select required value={bookId}
            onChange={e => setBookId(e.target.value)}>
            <option value="">Choose a book</option>
            {books.map(b => <option key={b.id} value={b.id}>
              {b.title} ({b.quantity} available)
            </option>)}
          </select></label>
          <label>Transaction Type<select value={type}
            onChange={e => setType(e.target.value)}>
            <option>Borrow</option><option>Return</option><option>Add Stock</option>
          </select></label>
          <label>Quantity<input type="number" min="1" required
            value={quantity} onChange={e => setQuantity(e.target.value)} /></label>
          <label>Library Member<select required value={member}
            onChange={e => setMember(e.target.value)}>
            <option value="">Select member</option>
            {users.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
          </select></label>
          <div className="form-actions">
            <button className="primary-button" type="submit">Save Transaction</button>
          </div>
        </form>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div><h3>Transaction History</h3><p>Recorded borrowing and stock activities</p></div>
          <RotateCcw className="heading-icon" />
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>BOOK</th><th>TYPE</th><th>QUANTITY</th><th>MEMBER</th><th>DATE</th></tr></thead>
            <tbody>
              {transactions.map(t => <tr key={t.id}>
                <td><strong>{t.book}</strong></td><td>{t.type}</td>
                <td>{t.quantity}</td><td>{t.member}</td><td>{t.date}</td>
              </tr>)}
              {transactions.length === 0 &&
                <tr><td colSpan="5" className="empty-state">No transactions recorded yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function UsersPage({ users, saveUser, deleteUser }) {
  const [form, setForm] = useState({ name: "", membershipId: "", role: "Member" });
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);

  function reset() {
    setForm({ name: "", membershipId: "", role: "Member" });
    setEditing(null);
    setShowForm(false);
  }

  function submit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.membershipId.trim()) {
      alert("Complete all user details.");
      return;
    }
    saveUser({ ...form, id: editing || undefined });
    reset();
  }

  function edit(user) {
    setEditing(user.id);
    setForm({
      name: user.name,
      membershipId: user.membershipId,
      role: user.role
    });
    setShowForm(true);
  }

  return (
    <>
      <PageHeading title="User Management"
        description="Register and manage library members."
        action={<button className="primary-button" onClick={() => {
          reset(); setShowForm(true);
        }}><Plus size={17} /> Add New User</button>} />

      {showForm && <section className="panel form-panel">
        <h3>{editing ? "Update User" : "Register New User"}</h3>
        <form className="form-grid" onSubmit={submit}>
          <label>Full Name<input required value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })} /></label>
          <label>Membership ID<input required value={form.membershipId}
            onChange={e => setForm({ ...form, membershipId: e.target.value })} /></label>
          <label>Role<select value={form.role}
            onChange={e => setForm({ ...form, role: e.target.value })}>
            <option>Member</option><option>Admin</option>
          </select></label>
          <div className="form-actions">
            <button className="primary-button" type="submit">Save User</button>
            <button className="secondary-button" type="button" onClick={reset}>Cancel</button>
          </div>
        </form>
      </section>}

      <section className="panel">
        <div className="panel-heading">
          <div><h3>Registered Members</h3><p>{users.length} library users</p></div>
          <Users className="heading-icon" />
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>FULL NAME</th><th>MEMBERSHIP ID</th><th>ROLE</th><th>ACTIONS</th></tr></thead>
            <tbody>
              {users.map(user => <tr key={user.id}>
                <td><strong>{user.name}</strong></td><td>{user.membershipId}</td>
                <td><span className="status available">{user.role}</span></td>
                <td><div className="action-buttons">
                  <button title="Edit" onClick={() => edit(user)}><Edit size={16} /></button>
                  <button title="Delete" className="delete-action"
                    onClick={() => deleteUser(user.id)}><Trash2 size={16} /></button>
                </div></td>
              </tr>)}
              {users.length === 0 &&
                <tr><td colSpan="4" className="empty-state">No users registered.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

export default App;
