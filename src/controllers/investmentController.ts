import { Response } from 'express';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middleware/auth';

/**
 * Get all investments for a user
 */
export const getInvestments = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const area = req.query.area as string | undefined;
    const skip = (page - 1) * limit;

    const investments = await prisma.investment.findMany({
      where: {
        userId,
        ...(area && { area }),
      },
      orderBy: { date: 'desc' },
      skip,
      take: limit,
    });

    const total = await prisma.investment.count({
      where: { userId, ...(area && { area }) },
    });

    return res.json({
      investments,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Get investments error:', error);
    return res.status(500).json({ error: 'Failed to fetch investments' });
  }
};

/**
 * Create new investment
 */
export const createInvestment = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { title, area, amount, quantity, purchasePrice, currentValue, date, description } = req.body;

    if (!title || !area || !amount) {
      return res.status(400).json({ error: 'Title, area, and amount are required' });
    }

    const parsedAmount = parseFloat(amount);
    if (parsedAmount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }

    const investment = await prisma.investment.create({
      data: {
        userId,
        title,
        area,
        amount: parsedAmount,
        quantity: quantity ? parseFloat(quantity) : undefined,
        purchasePrice: purchasePrice ? parseFloat(purchasePrice) : undefined,
        currentValue: currentValue ? parseFloat(currentValue) : parsedAmount,
        date: date ? new Date(date) : new Date(),
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
        totalInvested: { increment: parsedAmount },
        totalBalance: { decrement: parsedAmount },
      },
    });

    return res.status(201).json(investment);
  } catch (error) {
    console.error('Create investment error:', error);
    return res.status(500).json({ error: 'Failed to create investment' });
  }
};

/**
 * Update investment
 */
export const updateInvestment = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const { title, area, quantity, purchasePrice, currentValue, description } = req.body;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const investment = await prisma.investment.findFirst({
      where: { id, userId },
    });

    if (!investment) {
      return res.status(404).json({ error: 'Investment not found' });
    }

    const updated = await prisma.investment.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(area && { area }),
        ...(quantity && { quantity: parseFloat(quantity) }),
        ...(purchasePrice && { purchasePrice: parseFloat(purchasePrice) }),
        ...(currentValue && { currentValue: parseFloat(currentValue) }),
        ...(description && { description }),
      },
    });

    return res.json(updated);
  } catch (error) {
    console.error('Update investment error:', error);
    return res.status(500).json({ error: 'Failed to update investment' });
  }
};

/**
 * Delete investment
 */
export const deleteInvestment = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const investment = await prisma.investment.findFirst({
      where: { id, userId },
    });

    if (!investment) {
      return res.status(404).json({ error: 'Investment not found' });
    }

    // Revert account totals
    const account = await prisma.account.findUnique({ where: { userId } });
    if (account) {
      await prisma.account.update({
        where: { userId },
        data: {
          totalInvested: {
            decrement: Number(investment.amount),
          },
          totalBalance: {
            increment: Number(investment.amount),
          },
        },
      });
    }

    await prisma.investment.delete({ where: { id } });

    return res.json({ message: 'Investment deleted' });
  } catch (error) {
    console.error('Delete investment error:', error);
    return res.status(500).json({ error: 'Failed to delete investment' });
  }
};
