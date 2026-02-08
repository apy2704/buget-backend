import { Router } from 'express';
import { getInvestments, createInvestment, updateInvestment, deleteInvestment } from '../controllers/investmentController';
import { authMiddleware } from '../middleware/auth';

const investmentRoutes = Router();

investmentRoutes.use(authMiddleware);

investmentRoutes.get('/', getInvestments);
investmentRoutes.post('/', createInvestment);
investmentRoutes.put('/:id', updateInvestment);
investmentRoutes.delete('/:id', deleteInvestment);

export default investmentRoutes;
