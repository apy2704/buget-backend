import express from 'express';
import cors from 'cors';
import { prisma } from './utils/prisma';
import logger, { logRequest, logError } from './utils/logger';
import dashboardRoutes from './routes/dashboardRoutes';
import authRoutes from './routes/authRoutes';
import expenseRoutes from './routes/expenseRoutes';
import incomeRoutes from './routes/incomeRoutes';
import investmentRoutes from './routes/investmentRoutes';
import budgetRoutes from './routes/budgetRoutes';
import cardRoutes from './routes/cardRoutes';
import savingsGoalRoutes from './routes/savingsGoalRoutes';

const app = express();
const PORT = process.env.PORT || 5000;

// Check database connection (non-blocking)
async function checkDatabase() {
  try {
    console.log('\n🔍 Checking database connection...');
    const userCount = await prisma.user.count();
    console.log('✅ Database is connected and accessible!');
    console.log(`📊 Users in database: ${userCount}\n`);
  } catch (error: any) {
    console.warn('\n⚠️  Database connection failed - server will start anyway');
    console.warn('Error:', error.message);
    console.warn('The API will return connection errors for requests that need the database\n');
  }
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Log each incoming request (non-blocking)
app.use((req, res, next) => {
  // fire-and-forget for request arrival
  void logRequest(req).catch(() => {});
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    void logger.info('Request completed', {
      method: req.method,
      url: req.originalUrl || req.url,
      status: res.statusCode,
      durationMs: duration,
      params: req.params,
      query: req.query,
    }).catch(() => {});
  });
  next();
});
app.use(
  cors({
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
  })
);

// Routes
app.use('/api', dashboardRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/incomes', incomeRoutes);
app.use('/api/investments', investmentRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/cards', cardRoutes);
app.use('/api/savings', savingsGoalRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
  void logger.warn('Route not found', { method: req.method, url: req.originalUrl || req.url });
});

// Error handling middleware
app.use((err: any, req: any, res: any, next: any) => {
  // log the error
  void logError(err, req).catch(() => {});
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

// Global unhandled rejection / exception handlers
process.on('unhandledRejection', (reason) => {
  void logger.error('Unhandled Promise Rejection', { reason }).catch(() => {});
});

process.on('uncaughtException', (err) => {
  void logger.error('Uncaught Exception', { message: err?.message, stack: err?.stack }).catch(() => {});
  // give time to flush logs then exit
  setTimeout(() => process.exit(1), 500);
});

// Start server
async function startServer() {
  await checkDatabase();
  
  app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
    console.log(`📊 Dashboard API available at http://localhost:${PORT}/api/dashboard\n`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

export default app;
