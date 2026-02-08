import { Router } from 'express';
import { getExpenses, createExpense, updateExpense, deleteExpense } from '../controllers/expenseController';
import { authMiddleware } from '../middleware/auth';

const expenseRoutes = Router();

expenseRoutes.use(authMiddleware);

expenseRoutes.get('/', getExpenses);
expenseRoutes.post('/', createExpense);
expenseRoutes.put('/:id', updateExpense);
expenseRoutes.delete('/:id', deleteExpense);

export default expenseRoutes;
