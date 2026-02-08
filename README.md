# Budget App Backend

A comprehensive Express.js + Prisma backend for the Budget management application.

## 📋 Features

- **User Management** - User accounts and authentication
- **Transaction Tracking** - Track income and expenses with categories
- **Budget Management** - Create and manage budget limits
- **Dashboard API** - Aggregated financial data and statistics
- **PostgreSQL Database** - Reliable data persistence with Prisma ORM
- **RESTful API** - Clean and intuitive API endpoints

## 📁 Project Structure

```
buget-backend/
├── src/
│   ├── index.ts                 # Main server file
│   ├── controllers/
│   │   └── dashboardController.ts   # Business logic for dashboard
│   ├── routes/
│   │   └── dashboardRoutes.ts       # Route definitions
│   ├── middleware/              # Express middleware
│   └── utils/
│       └── prisma.ts            # Prisma client singleton
├── prisma/
│   └── schema.prisma            # Database schema
├── package.json
├── tsconfig.json
└── .env                        # Environment variables
```

## 🗄️ Database Models

### User
- Stores user account information
- Email and password for authentication

### Account
- Financial summary for each user
- Tracks total balance, income, and expenses

### Transaction
- Individual transactions (income/expense)
- Categories, dates, amounts
- Linked to user accounts

### Budget
- Budget categories with spending limits
- Tracks spent amount vs limit
- Color-coded for UI display

## 🚀 Setup & Installation

### Prerequisites
- Node.js 18+
- PostgreSQL database
- npm or yarn

### Installation Steps

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Setup environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your PostgreSQL connection string
   ```

3. **Generate Prisma Client**
   ```bash
   npm run prisma:generate
   ```

4. **Push database schema**
   ```bash
   npm run prisma:push
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

Server will start on `http://localhost:5000`

## 📡 API Endpoints

### Dashboard
- `GET /api/dashboard` - Get aggregated dashboard data

### Transactions
- `GET /api/transactions` - List user transactions with pagination
- `POST /api/transactions` - Create a new transaction

### Budgets
- `GET /api/budgets` - List user budgets
- `POST /api/budgets` - Create a new budget
- `PUT /api/budgets/:id` - Update budget spending

## 🔧 Prisma Commands

```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Reset database (⚠️ destructive)
npx prisma migrate reset

# View database in UI
npm run prisma:studio

# Sync schema with database
npm run prisma:push
```

## 🏗️ Building for Production

```bash
# Build TypeScript
npm run build

# Start production server
npm start
```

## 📝 Request Examples

### Create Transaction
```bash
curl -X POST http://localhost:5000/api/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Groceries",
    "category": "Food",
    "amount": 50.00,
    "type": "expense",
    "date": "2024-02-07"
  }'
```

### Create Budget
```bash
curl -X POST http://localhost:5000/api/budgets \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Groceries",
    "limit": 300.00,
    "color": "#10B981",
    "category": "Food"
  }'
```

### Get Dashboard
```bash
curl http://localhost:5000/api/dashboard
```

## 🔐 Authentication (TODO)

Authentication middleware needs to be implemented to:
- Verify JWT tokens
- Extract userId from tokens
- Validate user access to resources

## 📚 Tech Stack

- **Express.js** - Web framework
- **Prisma** - ORM for database
- **PostgreSQL** - Database
- **TypeScript** - Type safety
- **CORS** - Cross-origin resource sharing

## 🤝 Integration with Frontend

The frontend connects to this backend via:

```typescript
// Frontend API calls
fetch('/api/dashboard')
fetch('/api/transactions')
fetch('/api/budgets')
```

Update the `CORS_ORIGIN` in `.env` to match your frontend URL.

## 💡 Development Tips

- Use `npm run prisma:studio` to visually explore your database
- Check logs in development for detailed error messages
- Prisma migrations help track schema changes over time

## 📄 License

ISC
