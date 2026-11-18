# BookNest Library Management

## Run locally

1. Install Node.js and create a MySQL database.
2. Copy `backend/.env.example` to `backend/.env` and set the database connection values.
3. In a terminal, run:

   ```powershell
   cd backend
   npm install
   npm run dev
   ```

4. In a second terminal, run:

   ```powershell
   cd frontend
   npm install
   npm run dev
   ```

The frontend is served by Vite, and its `/api` requests are proxied to the Express API on port 5000.

## Deploy the API and use Railway MySQL

Create a Railway service for the `backend` directory in the same project as the MySQL service. Add a Railway reference variable to the backend service:

```text
MYSQL_URL=${{ MySQL.MYSQL_URL }}
```

Replace `MySQL` with the exact Railway MySQL service name if it differs. Railway's private database URL should be used; do not make MySQL publicly accessible.

After deploying the API, set `VITE_API_URL` for the frontend to the public HTTPS origin of the API service (do not include `/api`). During local development, set `VITE_API_URL` in `frontend/.env.local` to the same API origin if using the deployed API. Otherwise leave it unset and run the local backend.

The backend creates the required tables and inserts starter data when the database is empty.
