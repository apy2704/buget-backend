import { Response } from 'express';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middleware/auth';

/**
 * Get all income entries for a user
 */
export const getIncomes = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const source = req.query.source as string | undefined;
    const skip = (page - 1) * limit;

    const incomes = await prisma.income.findMany({
      where: {
        userId,
        ...(source && { source }),
      },
      orderBy: { date: 'desc' },
      skip,
      take: limit,
    });

    const total = await prisma.income.count({
      where: { userId, ...(source && { source }) },
    });

    return res.json({
      incomes,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Get incomes error:', error);
    return res.status(500).json({ error: 'Failed to fetch incomes' });
  }
};

/**
 * Create new income entry
 */
export const createIncome = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { title, source, amount, date, frequency, description } = req.body;

    if (!title || !source || !amount) {
      return res.status(400).json({ error: 'Title, source, and amount are required' });
    }

    const parsedAmount = parseFloat(amount);
    if (parsedAmount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }

    const income = await prisma.income.create({
      data: {
        userId,
        title,
        source,
        amount: parsedAmount,
        date: date ? new Date(date) : new Date(),
        frequency,
        description,
      },
    });

    // Update account totals (create account if missing for existing users)
    let account = await prisma.account.findUnique({ where: { userId } });
    if (!account) {
      account = await prisma.account.create({ data: { userId } });
    }
    await prisma.account.update({
      where: { userId },
      data: {
        totalIncome: { increment: parsedAmount },
        totalBalance: { increment: parsedAmount },
      },
    });

    return res.status(201).json(income);
  } catch (error) {
    console.error('Create income error:', error);
    return res.status(500).json({ error: 'Failed to create income' });
  }
};

/**
 * Update income entry
 */
export const updateIncome = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const { title, source, amount, date, frequency, description } = req.body;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const income = await prisma.income.findFirst({
      where: { id, userId },
    });

    if (!income) {
      return res.status(404).json({ error: 'Income not found' });
    }

    // Validate amount if provided
    if (amount && parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }

    const updated = await prisma.income.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(source && { source }),
        ...(amount && { amount: parseFloat(amount) }),
        ...(date && { date: new Date(date) }),
        ...(frequency && { frequency }),
        ...(description && { description }),
      },
    });

    return res.json(updated);
  } catch (error) {
    console.error('Update income error:', error);
    return res.status(500).json({ error: 'Failed to update income' });
  }
};

/**
 * Delete income entry
 */
export const deleteIncome = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const income = await prisma.income.findFirst({
      where: { id, userId },
    });

    if (!income) {
      return res.status(404).json({ error: 'Income not found' });
    }

    // Revert account totals
    const account = await prisma.account.findUnique({ where: { userId } });
    if (account) {
      await prisma.account.update({
        where: { userId },
        data: {
          totalIncome: {
            decrement: Number(income.amount),
          },
          totalBalance: {
            decrement: Number(income.amount),
          },
        },
      });
    }

    await prisma.income.delete({ where: { id } });

    return res.json({ message: 'Income deleted' });
  } catch (error) {
    console.error('Delete income error:', error);
    return res.status(500).json({ error: 'Failed to delete income' });
  }
};
