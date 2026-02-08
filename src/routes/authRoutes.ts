import { Router } from 'express';
import { register, login, getProfile, updateProfile } from '../controllers/authController';
import { authMiddleware } from '../middleware/auth';

const authRoutes = Router();

// Public routes
authRoutes.post('/register', register);
authRoutes.post('/login', login);

// Protected routes
authRoutes.get('/profile', authMiddleware, getProfile);
authRoutes.put('/profile', authMiddleware, updateProfile);

export default authRoutes;
