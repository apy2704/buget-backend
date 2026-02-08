import { Router } from 'express';
import {
  getDashboard,
  getTransactions,
  createTransaction,
  getBudgets,
  createBudget,
  updateBudget,
} from '../controllers/dashboardController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Dashboard routes (protected)
router.get('/dashboard', authMiddleware, getDashboard);

// Transaction routes (protected)
router.get('/transactions', authMiddleware, getTransactions);
router.post('/transactions', authMiddleware, createTransaction);

// Budget routes (protected)
router.get('/budgets', authMiddleware, getBudgets);
router.post('/budgets', authMiddleware, createBudget);
router.put('/budgets/:id', authMiddleware, updateBudget);

export default router;
