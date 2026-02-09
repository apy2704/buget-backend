import { Response } from 'express';
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

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Single parallel fetch: account totals come from DB; fetch all incomes, expenses, investments for full lists
    const [incomes, expenses, investments, budgets, cards, savingsGoals] = await Promise.all([
      prisma.income.findMany({ where: { userId }, orderBy: { date: 'desc' } }),
      prisma.expense.findMany({ where: { userId }, orderBy: { date: 'desc' } }),
      prisma.investment.findMany({ where: { userId }, orderBy: { date: 'desc' } }),
      prisma.budget.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
      prisma.card.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
      prisma.savingsGoal.findMany({
        where: { userId, status: 'active' },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const toTx = (t: { id: string; title: string; date: Date; amount: { toString(): string } }, category: string, type: 'income' | 'expense' | 'investment', icon: string) => ({
      id: t.id,
      title: t.title,
      category,
      date: t.date,
      amount: Number(t.amount),
      type,
      icon,
    });

    const allTransactions = [
      ...incomes.map((i) => toTx(i, i.source, 'income', '📥')),
      ...expenses.map((e) => toTx(e, e.category, 'expense', '📤')),
      ...investments.map((inv) => toTx(inv, inv.area, 'investment', '📈')),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const transactions = allTransactions.slice(0, 10);

    const totalIncomeSum = incomes.reduce((s, i) => s + Number(i.amount), 0);
    const totalExpenseSum = expenses.reduce((s, e) => s + Number(e.amount), 0);
    const totalInvestmentSum = investments.reduce((s, inv) => s + Number(inv.amount), 0);
    const balanceLeft = totalIncomeSum - totalExpenseSum - totalInvestmentSum;
    const recommendedSavings = Math.max(0, 0.1 * balanceLeft);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const weeklyIncomes = incomes.filter((i) => i.date >= sevenDaysAgo);
    const weeklyExpenses = expenses.filter((e) => e.date >= sevenDaysAgo);

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

    const expensesLast30 = expenses.filter((e) => e.date >= thirtyDaysAgo);
    const expensesByCategory = expensesLast30.reduce(
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

    const goalsWithProgress = savingsGoals.map((g) => ({
      id: g.id,
      title: g.title,
      targetAmount: Number(g.targetAmount),
      currentAmount: Number(g.currentAmount),
      progress: Number(g.targetAmount) > 0 ? (Number(g.currentAmount) / Number(g.targetAmount)) * 100 : 0,
      deadline: g.deadline,
      priority: g.priority,
      status: g.status,
    }));

    const totalSavingsGoalAmount = goalsWithProgress.reduce((sum, g) => sum + g.currentAmount, 0);
    const totalSavingsTarget = goalsWithProgress.reduce((sum, g) => sum + g.targetAmount, 0);

    return res.json({
      totalBalance: Number(account?.totalBalance || 0),
      totalIncome: Number(account?.totalIncome || 0),
      totalExpense: Number(account?.totalExpense || 0),
      totalSavings: Number(account?.totalSavings || 0),
      totalInvested: Number(account?.totalInvested || 0),
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
        followed: b.followed ?? null,
      })),
      allTransactions: allTransactions.map((t) => ({
        id: t.id,
        title: t.title,
        category: t.category,
        date: t.date.toISOString().split('T')[0],
        amount: t.amount,
        type: t.type,
        icon: t.icon,
      })),
      expenses: expenses.map((e) => ({
        id: e.id,
        title: e.title,
        category: e.category,
        amount: Number(e.amount),
        date: e.date.toISOString().split('T')[0],
        paymentMethod: e.paymentMethod,
      })),
      investments: investments.map((inv) => ({
        id: inv.id,
        title: inv.title,
        area: inv.area,
        amount: Number(inv.amount),
        date: inv.date.toISOString().split('T')[0],
        currentValue: inv.currentValue ? Number(inv.currentValue) : null,
      })),
      totalIncomeSum,
      totalExpenseSum,
      totalInvestmentSum,
      balanceLeft,
      recommendedSavings: Math.round(recommendedSavings * 100) / 100,
      savingsGoals: goalsWithProgress,
      totalSavingsGoalAmount,
      totalSavingsTarget,
      weeklyStats,
      categoryStats: formattedCategoryStats,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return res.status(500).json({ error: 'Failed to fetch dashboard data' });
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

    return res.json({
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
    return res.status(500).json({ error: 'Failed to fetch transactions' });
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

    return res.status(201).json({
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
    return res.status(500).json({ error: 'Failed to create transaction' });
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

    return res.json(
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
    return res.status(500).json({ error: 'Failed to fetch budgets' });
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

    return res.status(201).json({
      id: budget.id,
      name: budget.name,
      spent: Number(budget.spent),
      limit: Number(budget.limit),
      color: budget.color,
      icon: budget.icon,
    });
  } catch (error) {
    console.error('Create budget error:', error);
    return res.status(500).json({ error: 'Failed to create budget' });
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

    return res.json({
      id: budget.id,
      name: budget.name,
      spent: Number(budget.spent),
      limit: Number(budget.limit),
      color: budget.color,
      icon: budget.icon,
    });
  } catch (error) {
    console.error('Update budget error:', error);
    return res.status(500).json({ error: 'Failed to update budget' });
  }
};
