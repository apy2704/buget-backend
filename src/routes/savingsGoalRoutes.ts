import { Router } from 'express';
import {
  getSavingsGoals,
  createSavingsGoal,
  updateSavingsGoal,
  contributeSavingsGoal,
  withdrawSavingsGoal,
  deleteSavingsGoal,
} from '../controllers/savingsGoalController';
import { authMiddleware } from '../middleware/auth';

const savingsGoalRoutes = Router();

savingsGoalRoutes.use(authMiddleware);

savingsGoalRoutes.get('/', getSavingsGoals);
savingsGoalRoutes.post('/', createSavingsGoal);
savingsGoalRoutes.put('/:id', updateSavingsGoal);
savingsGoalRoutes.post('/:id/contribute', contributeSavingsGoal);
savingsGoalRoutes.post('/:id/withdraw', withdrawSavingsGoal);
savingsGoalRoutes.delete('/:id', deleteSavingsGoal);

export default savingsGoalRoutes;
