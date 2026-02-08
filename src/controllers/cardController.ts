import { Response } from 'express';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middleware/auth';

/**
 * Get all cards for a user
 */
export const getCards = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const cards = await prisma.card.findMany({
      where: { userId },
      orderBy: { isDefault: 'desc' },
    });

    res.json(cards);
  } catch (error) {
    console.error('Get cards error:', error);
    res.status(500).json({ error: 'Failed to fetch cards' });
  }
};

/**
 * Create new card
 */
export const createCard = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Accept both backend and frontend field names:
    // frontend sends: cardType, expiryDate (MM/YY), cardholderName, last4, limit
    const {
      type,
      issuer,
      last4,
      cardholderName,
      expiryMonth,
      expiryYear,
      limit,
      isDefault,
      // frontend names
      cardType,
      expiryDate,
    } = req.body as any;

    // Determine final type (prefer backend `type`, fallback to frontend `cardType`)
    const finalType = (type || cardType || '').toString();

    // Parse expiryDate if provided (format MM/YY or MM/YYYY)
    let finalExpiryMonth = expiryMonth;
    let finalExpiryYear = expiryYear;
    if (expiryDate && typeof expiryDate === 'string') {
      const parts = expiryDate.split('/').map((p: string) => p.trim());
      if (parts.length === 2) {
        const m = parseInt(parts[0], 10);
        let y = parseInt(parts[1], 10);
        if (y < 100) y += 2000; // convert 23 -> 2023
        if (!Number.isNaN(m)) finalExpiryMonth = m;
        if (!Number.isNaN(y)) finalExpiryYear = y;
      }
    }

    // Validate required fields (accept frontend names)
    if (!finalType || !last4 || !cardholderName) {
      return res.status(400).json({ error: 'Type, last4, and cardholder name are required' });
    }

    // Validate limit if provided
    if (limit && parseFloat(limit) <= 0) {
      return res.status(400).json({ error: 'Card limit must be greater than 0' });
    }

    // If setting as default, unset other default cards for this user
    if (isDefault) {
      await prisma.card.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const card = await prisma.card.create({
      data: {
        userId,
        type: finalType,
        issuer: issuer || 'Unknown',
        last4: last4.toString().slice(-4),
        name: cardholderName,
        expiryMonth: finalExpiryMonth || null,
        expiryYear: finalExpiryYear || null,
        limit: limit ? parseFloat(limit) : null,
        isDefault: isDefault ?? false,
      },
    });

    res.status(201).json(card);
  } catch (error) {
    console.error('Create card error:', error);
    res.status(500).json({ error: 'Failed to create card' });
  }
};

/**
 * Update card
 */
export const updateCard = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const { cardholderName, limit, isDefault } = req.body;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const card = await prisma.card.findFirst({
      where: { id, userId },
    });

    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }

    // If setting as default, unset others
    if (isDefault && !card.isDefault) {
      await prisma.card.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const updated = await prisma.card.update({
      where: { id },
      data: {
        ...(cardholderName && { name: cardholderName }),
        ...(limit && { limit: parseFloat(limit) }),
        ...(isDefault !== undefined && { isDefault }),
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Update card error:', error);
    res.status(500).json({ error: 'Failed to update card' });
  }
};

/**
 * Delete card
 */
export const deleteCard = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const card = await prisma.card.findFirst({
      where: { id, userId },
    });

    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }

    await prisma.card.delete({ where: { id } });

    res.json({ message: 'Card deleted' });
  } catch (error) {
    console.error('Delete card error:', error);
    res.status(500).json({ error: 'Failed to delete card' });
  }
};
