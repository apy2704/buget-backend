import { Router } from 'express';
import { getCards, createCard, updateCard, deleteCard } from '../controllers/cardController';
import { authMiddleware } from '../middleware/auth';

const cardRoutes = Router();

cardRoutes.use(authMiddleware);

cardRoutes.get('/', getCards);
cardRoutes.post('/', createCard);
cardRoutes.put('/:id', updateCard);
cardRoutes.delete('/:id', deleteCard);

export default cardRoutes;
