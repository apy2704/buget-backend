import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middleware/auth';

/**
 * Get dashboard data for authenticated user
 * Returns summaries and lists of transactions, budgets, and statistics
 */
export const getDashboard = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Fetch user's account
    const account = await prisma.account.findUnique({
      where: { userId },
    });

    // Fetch recent income, expense, and investment (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [incomes, expenses, investments] = await Promise.all([
      prisma.income.findMany({
        where: {
          userId,
          date: {
            gte: thirtyDaysAgo,
          },
        },
        orderBy: { date: 'desc' },
      }),
      prisma.expense.findMany({
        where: {
          userId,
          date: {
            gte: thirtyDaysAgo,
          },
        },
        orderBy: { date: 'desc' },
      }),
      prisma.investment.findMany({
        where: {
          userId,
          date: {
            gte: thirtyDaysAgo,
          },
        },
        orderBy: { date: 'desc' },
      }),
    ]);

    // Combine all transactions into a single array with type field
    const transactions = [
      ...incomes.map((i) => ({
        id: i.id,
        title: i.title,
        category: i.source,
        date: i.date,
        amount: Number(i.amount),
        type: 'income' as const,
        icon: '📥',
      })),
      ...expenses.map((e) => ({
        id: e.id,
        title: e.title,
        category: e.category,
        date: e.date,
        amount: Number(e.amount),
        type: 'expense' as const,
        icon: '📤',
      })),
      ...investments.map((inv) => ({
        id: inv.id,
        title: inv.title,
        category: inv.area,
        date: inv.date,
        amount: Number(inv.amount),
        type: 'investment' as const,
        icon: '📈',
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);

    // Fetch budgets
    const budgets = await prisma.budget.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate weekly statistics (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [weeklyIncomes, weeklyExpenses] = await Promise.all([
      prisma.income.findMany({
        where: {
          userId,
          date: {
            gte: sevenDaysAgo,
          },
        },
      }),
      prisma.expense.findMany({
        where: {
          userId,
          date: {
            gte: sevenDaysAgo,
          },
        },
      }),
    ]);

    // Group by day and sum amounts
    const weeklyStats = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];

      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      const dayIncome = weeklyIncomes
        .filter((t) => t.date >= dayStart && t.date <= dayEnd)
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const dayExpense = weeklyExpenses
        .filter((t) => t.date >= dayStart && t.date <= dayEnd)
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const amount = dayIncome - dayExpense;

      return { day, amount: Math.max(0, amount) };
    });

    // Calculate category statistics from expenses
    const expensesByCategory = expenses.reduce(
      (acc, exp) => {
        const existing = acc.find((c) => c.category === exp.category);
        if (existing) {
          existing.amount += Number(exp.amount);
        } else {
          acc.push({ category: exp.category, amount: Number(exp.amount) });
        }
        return acc;
      },
      [] as Array<{ category: string; amount: number }>
    );

    const formattedCategoryStats = expensesByCategory
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
      .map((stat) => ({
        name: stat.category,
        value: stat.amount,
      }));

    // Return dashboard data
    // Fetch user's cards to include in dashboard
    const cards = await prisma.card.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });

    res.json({
      totalBalance: Number(account?.totalBalance || 0),
      totalIncome: Number(account?.totalIncome || 0),
      totalExpense: Number(account?.totalExpense || 0),
      cards: cards.map((c) => ({
        id: c.id,
        name: c.name,
        last4: c.last4,
        type: c.type,
        expiryMonth: c.expiryMonth,
        expiryYear: c.expiryYear,
        limit: Number(c.limit || 0),
        isDefault: c.isDefault,
      })),
      transactions: transactions.map((t) => ({
        id: t.id,
        title: t.title,
        category: t.category,
        date: t.date.toISOString().split('T')[0],
        amount: t.amount,
        type: t.type,
        icon: t.icon,
      })),
      budgets: budgets.map((b) => ({
        id: b.id,
        name: b.name,
        spent: Number(b.spent),
        limit: Number(b.limit),
        color: b.color,
        icon: b.icon,
      })),
      weeklyStats,
      categoryStats: formattedCategoryStats,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
};

/**
 * Get all transactions for a user with pagination
 */
export const getTransactions = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const transactions = await prisma.transaction.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      skip,
      take: limit,
    });

    const total = await prisma.transaction.count({ where: { userId } });

    res.json({
      transactions: transactions.map((t) => ({
        id: t.id,
        title: t.title,
        category: t.category,
        date: t.date.toISOString().split('T')[0],
        amount: Number(t.amount),
        type: t.type,
        icon: t.icon,
      })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
};

/**
 * Create a new transaction
 */
export const createTransaction = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { title, category, amount, type, date, icon, description } = req.body;

    // Validate input
    if (!title || !category || !amount || !type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const transaction = await prisma.transaction.create({
      data: {
        userId,
        title,
        category,
        amount: parseFloat(amount),
        type,
        date: date ? new Date(date) : new Date(),
        icon,
        description,
      },
    });

    res.status(201).json({
      id: transaction.id,
      title: transaction.title,
      category: transaction.category,
      date: transaction.date.toISOString().split('T')[0],
      amount: Number(transaction.amount),
      type: transaction.type,
      icon: transaction.icon,
    });
  } catch (error) {
    console.error('Create transaction error:', error);
    res.status(500).json({ error: 'Failed to create transaction' });
  }
};

/**
 * Get budget categories
 */
export const getBudgets = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const budgets = await prisma.budget.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    res.json(
      budgets.map((b) => ({
        id: b.id,
        name: b.name,
        spent: Number(b.spent),
        limit: Number(b.limit),
        color: b.color,
        icon: b.icon,
      }))
    );
  } catch (error) {
    console.error('Get budgets error:', error);
    res.status(500).json({ error: 'Failed to fetch budgets' });
  }
};

/**
 * Create a new budget
 */
export const createBudget = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { name, limit, color, icon, category } = req.body;

    if (!name || !limit) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const budget = await prisma.budget.create({
      data: {
        userId,
        name,
        limit: parseFloat(limit),
        color: color || '#10B981',
        icon,
        category,
      },
    });

    res.status(201).json({
      id: budget.id,
      name: budget.name,
      spent: Number(budget.spent),
      limit: Number(budget.limit),
      color: budget.color,
      icon: budget.icon,
    });
  } catch (error) {
    console.error('Create budget error:', error);
    res.status(500).json({ error: 'Failed to create budget' });
  }
};

/**
 * Update budget spending
 */
export const updateBudget = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { spent, limit } = req.body;

    const budget = await prisma.budget.update({
      where: { id },
      data: {
        ...(spent !== undefined && { spent: parseFloat(spent) }),
        ...(limit !== undefined && { limit: parseFloat(limit) }),
      },
    });

    res.json({
      id: budget.id,
      name: budget.name,
      spent: Number(budget.spent),
      limit: Number(budget.limit),
      color: budget.color,
      icon: budget.icon,
    });
  } catch (error) {
    console.error('Update budget error:', error);
    res.status(500).json({ error: 'Failed to update budget' });
  }
};
