import { Router } from 'express';
import { getIncomes, createIncome, updateIncome, deleteIncome } from '../controllers/incomeController';
import { authMiddleware } from '../middleware/auth';

const incomeRoutes = Router();

incomeRoutes.use(authMiddleware);

incomeRoutes.get('/', getIncomes);
incomeRoutes.post('/', createIncome);
incomeRoutes.put('/:id', updateIncome);
incomeRoutes.delete('/:id', deleteIncome);

export default incomeRoutes;
