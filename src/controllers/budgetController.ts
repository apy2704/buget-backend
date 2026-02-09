import { Response } from 'express';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middleware/auth';

/**
 * Get all budgets for a user
 */
export const getBudgets = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const budgets = await prisma.budget.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(budgets);
  } catch (error) {
    console.error('Get budgets error:', error);
    return res.status(500).json({ error: 'Failed to fetch budgets' });
  }
};

/**
 * Create new budget
 */
export const createBudget = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { name, category, limit, color, icon, frequency, month, year, alertThreshold } = req.body;

    if (!name || !limit) {
      return res.status(400).json({ error: 'Name and limit are required' });
    }

    const parsedLimit = parseFloat(limit);
    if (parsedLimit <= 0) {
      return res.status(400).json({ error: 'Limit must be greater than 0' });
    }

    const budget = await prisma.budget.create({
      data: {
        userId,
        name,
        category,
        limit: parsedLimit,
        color: color || '#10B981',
        icon,
        frequency: frequency || 'monthly',
        month,
        year,
        alertThreshold: alertThreshold || 80,
      },
    });

    return res.status(201).json(budget);
  } catch (error) {
    console.error('Create budget error:', error);
    return res.status(500).json({ error: 'Failed to create budget' });
  }
};

/**
 * Update budget
 */
export const updateBudget = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const { name, category, limit, spent, color, icon, alertThreshold, followed } = req.body;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const budget = await prisma.budget.findFirst({
      where: { id, userId },
    });

    if (!budget) {
      return res.status(404).json({ error: 'Budget not found' });
    }

    const updated = await prisma.budget.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(category !== undefined && { category }),
        ...(limit && { limit: parseFloat(limit) }),
        ...(spent !== undefined && { spent: parseFloat(spent) }),
        ...(color && { color }),
        ...(icon !== undefined && { icon }),
        ...(alertThreshold !== undefined && { alertThreshold }),
        ...(followed !== undefined && { followed: Boolean(followed) }),
      },
    });

    return res.json(updated);
  } catch (error) {
    console.error('Update budget error:', error);
    return res.status(500).json({ error: 'Failed to update budget' });
  }
};

/**
 * Delete budget
 */
export const deleteBudget = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const budget = await prisma.budget.findFirst({
      where: { id, userId },
    });

    if (!budget) {
      return res.status(404).json({ error: 'Budget not found' });
    }

    await prisma.budget.delete({ where: { id } });

    return res.json({ message: 'Budget deleted' });
  } catch (error) {
    console.error('Delete budget error:', error);
    return res.status(500).json({ error: 'Failed to delete budget' });
  }
};
