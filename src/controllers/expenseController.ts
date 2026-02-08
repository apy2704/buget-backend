import { Response } from 'express';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middleware/auth';

/**
 * Get all expenses for a user with pagination and filters
 */
export const getExpenses = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const category = req.query.category as string | undefined;
    const skip = (page - 1) * limit;

    const expenses = await prisma.expense.findMany({
      where: {
        userId,
        ...(category && { category }),
      },
      orderBy: { date: 'desc' },
      skip,
      take: limit,
    });

    const total = await prisma.expense.count({
      where: { userId, ...(category && { category }) },
    });

    res.json({
      expenses,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
};

/**
 * Create a new expense
 */
export const createExpense = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { title, category, amount, date, paymentMethod, description } = req.body;

    if (!title || !category || !amount) {
      return res.status(400).json({ error: 'Title, category, and amount are required' });
    }

    const parsedAmount = parseFloat(amount);
    if (parsedAmount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }

    const expense = await prisma.expense.create({
      data: {
        userId,
        title,
        category,
        amount: parsedAmount,
        date: date ? new Date(date) : new Date(),
        paymentMethod,
        description,
      },
    });

    // Update account totals
    const account = await prisma.account.findUnique({ where: { userId } });
    if (account) {
      await prisma.account.update({
        where: { userId },
        data: {
          totalExpense: {
            increment: parsedAmount,
          },
          totalBalance: {
            decrement: parsedAmount,
          },
        },
      });
    }

    res.status(201).json(expense);
  } catch (error) {
    console.error('Create expense error:', error);
    res.status(500).json({ error: 'Failed to create expense' });
  }
};

/**
 * Update an expense
 */
export const updateExpense = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const { title, category, amount, date, paymentMethod, description } = req.body;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Check if expense belongs to user
    const expense = await prisma.expense.findFirst({
      where: { id, userId },
    });

    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    // Validate amount if provided
    if (amount && parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }

    const updated = await prisma.expense.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(category && { category }),
        ...(amount && { amount: parseFloat(amount) }),
        ...(date && { date: new Date(date) }),
        ...(paymentMethod && { paymentMethod }),
        ...(description && { description }),
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Update expense error:', error);
    res.status(500).json({ error: 'Failed to update expense' });
  }
};

/**
 * Delete an expense
 */
export const deleteExpense = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const expense = await prisma.expense.findFirst({
      where: { id, userId },
    });

    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    // Revert account totals
    const account = await prisma.account.findUnique({ where: { userId } });
    if (account) {
      await prisma.account.update({
        where: { userId },
        data: {
          totalExpense: {
            decrement: Number(expense.amount),
          },
          totalBalance: {
            increment: Number(expense.amount),
          },
        },
      });
    }

    await prisma.expense.delete({ where: { id } });

    res.json({ message: 'Expense deleted' });
  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({ error: 'Failed to delete expense' });
  }
};
