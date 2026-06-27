# ERP Backend - Node.js/Express

Node.js backend for the ERP Management System using Express.js and SQL Server.

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   - Copy `.env.example` to `.env`
   - Update database credentials in `.env`

3. **Start server:**
   ```bash
   npm start
   ```

   For development with auto-reload:
   ```bash
   npm run dev
   ```

## Environment Variables

```
DATABASE_SERVER=localhost
DATABASE_NAME=ERP_DB
DATABASE_USER=sa
DATABASE_PASSWORD=your_password
DATABASE_PORT=1433
PORT=8000
```

## API Endpoints

- **Sales & CRM**: `/api/sales`
- **Production**: `/api/production`
- **Procurement**: `/api/procurement`
- **Accounting**: `/api/accounting`

## Database

The database tables are created by the Python backend's `init_db.py` script. Make sure the database exists and tables are created before starting this server.

