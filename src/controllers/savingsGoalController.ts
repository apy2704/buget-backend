import { Response } from 'express';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middleware/auth';

/**
 * Get all savings goals for a user with progress
 */
export const getSavingsGoals = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const goals = await prisma.savingsGoal.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate progress percentage for each goal
    const goalsWithProgress = goals.map((goal) => ({
      ...goal,
      progress:
        Number(goal.targetAmount) > 0
          ? (Number(goal.currentAmount) / Number(goal.targetAmount)) * 100
          : 0,
    }));

    res.json(goalsWithProgress);
  } catch (error) {
    console.error('Get savings goals error:', error);
    res.status(500).json({ error: 'Failed to fetch savings goals' });
  }
};

/**
 * Create new savings goal
 */
export const createSavingsGoal = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { title, targetAmount, currentAmount, deadline, priority, category, icon, description } = req.body;

    if (!title || targetAmount == null) {
      return res.status(400).json({ error: 'Title and target amount are required' });
    }

    const parsedTargetAmount = Number(targetAmount);
    if (parsedTargetAmount <= 0) {
      return res.status(400).json({ error: 'Target amount must be greater than 0' });
    }

    const parsedCurrentAmount = currentAmount ? Number(currentAmount) : 0;
    if (parsedCurrentAmount < 0) {
      return res.status(400).json({ error: 'Current amount cannot be negative' });
    }

    const goal = await prisma.savingsGoal.create({
      data: {
        userId,
        title,
        targetAmount: parsedTargetAmount,
        currentAmount: parsedCurrentAmount,
        deadline: deadline ? new Date(deadline) : null,
        priority: priority || 'medium',
        status: 'active',
        category: category || 'General',
        icon: icon || '🎯',
        description,
      },
    });

    const progress = Number(goal.targetAmount) > 0 ? (Number(goal.currentAmount) / Number(goal.targetAmount)) * 100 : 0;

    res.status(201).json({ ...goal, progress });
  } catch (error) {
    console.error('Create savings goal error:', error);
    res.status(500).json({ error: 'Failed to create savings goal' });
  }
};

/**
 * Update savings goal (amount, deadline, status, etc.)
 */
export const updateSavingsGoal = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const { title, currentAmount, deadline, priority, status, category, description } = req.body;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const goal = await prisma.savingsGoal.findFirst({
      where: { id, userId },
    });

    if (!goal) {
      return res.status(404).json({ error: 'Savings goal not found' });
    }

    const updated = await prisma.savingsGoal.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(currentAmount !== undefined && { currentAmount: Number(currentAmount) }),
        ...(deadline && { deadline: new Date(deadline) }),
        ...(priority && { priority }),
        ...(status && { status }),
        ...(category && { category }),
        ...(description && { description }),
      },
    });

    const updatedGoal = await prisma.savingsGoal.findUnique({ where: { id } });
    const progress = updatedGoal && Number(updatedGoal.targetAmount) > 0
      ? (Number(updatedGoal.currentAmount) / Number(updatedGoal.targetAmount)) * 100
      : 0;

    res.json({ ...updated, progress });
  } catch (error) {
    console.error('Update savings goal error:', error);
    res.status(500).json({ error: 'Failed to update savings goal' });
  }
};

/**
 * Add funds to savings goal
 */
export const contributeSavingsGoal = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const { amount } = req.body;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (amount == null || Number(amount) <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }

    const goal = await prisma.savingsGoal.findFirst({
      where: { id, userId },
    });

    if (!goal) {
      return res.status(404).json({ error: 'Savings goal not found' });
    }

    const newAmount = Number(goal.currentAmount) + Number(amount);

    // Check if goal is now complete
    const isComplete = newAmount >= Number(goal.targetAmount);

    const updated = await prisma.savingsGoal.update({
      where: { id },
      data: {
        currentAmount: newAmount,
        status: isComplete ? 'completed' : 'active',
      },
    });

    const progress = Number(updated.targetAmount) > 0 ? (Number(updated.currentAmount) / Number(updated.targetAmount)) * 100 : 0;

    res.json({
      ...updated,
      progress,
      isComplete,
    });
  } catch (error) {
    console.error('Contribute savings goal error:', error);
    res.status(500).json({ error: 'Failed to contribute to savings goal' });
  }
};

/**
 * Withdraw funds from savings goal
 */
export const withdrawSavingsGoal = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const { amount } = req.body;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (amount == null || Number(amount) <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }

    const goal = await prisma.savingsGoal.findFirst({
      where: { id, userId },
    });

    if (!goal) {
      return res.status(404).json({ error: 'Savings goal not found' });
    }

    const newAmount = Math.max(0, Number(goal.currentAmount) - Number(amount));

    const updated = await prisma.savingsGoal.update({
      where: { id },
      data: {
        currentAmount: newAmount,
      },
    });

    const progress = Number(updated.targetAmount) > 0 ? (Number(updated.currentAmount) / Number(updated.targetAmount)) * 100 : 0;

    res.json({ ...updated, progress });
  } catch (error) {
    console.error('Withdraw savings goal error:', error);
    res.status(500).json({ error: 'Failed to withdraw from savings goal' });
  }
};

/**
 * Delete savings goal
 */
export const deleteSavingsGoal = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const goal = await prisma.savingsGoal.findFirst({
      where: { id, userId },
    });

    if (!goal) {
      return res.status(404).json({ error: 'Savings goal not found' });
    }

    await prisma.savingsGoal.delete({ where: { id } });

    res.json({ message: 'Savings goal deleted' });
  } catch (error) {
    console.error('Delete savings goal error:', error);
    res.status(500).json({ error: 'Failed to delete savings goal' });
  }
};
