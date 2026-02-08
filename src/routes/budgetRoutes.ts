import { Router } from 'express';
import { getBudgets, createBudget, updateBudget, deleteBudget } from '../controllers/budgetController';
import { authMiddleware } from '../middleware/auth';

const budgetRoutes = Router();

budgetRoutes.use(authMiddleware);

budgetRoutes.get('/', getBudgets);
budgetRoutes.post('/', createBudget);
budgetRoutes.put('/:id', updateBudget);
budgetRoutes.delete('/:id', deleteBudget);

export default budgetRoutes;
