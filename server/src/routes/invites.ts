import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import crypto from 'crypto';

const router = Router();

// Utility function to generate unique invite code
function generateInviteCode(): string {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

// GET /api/invites/my-codes - Get current user's codes
router.get('/my-codes', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const codes = await prisma.inviteCode.findMany({
      where: { creatorId: userId },
      orderBy: { createdAt: 'desc' },
    });

    const activeCount = codes.filter(c => !c.usedAt).length;
    const usedCount = codes.filter(c => c.usedAt).length;

    res.json({
      codes,
      stats: {
        totalCreated: codes.length,
        activeUnused: activeCount,
        alreadyUsed: usedCount,
      }
    });
  } catch (err) {
    console.error('Error fetching codes:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/invites/remaining-time - Get remaining time until next code can be generated
router.get('/remaining-time', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { lastCodeGeneration: true }
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const settings = await prisma.adminSettings.findFirst();
    const cooldownHours = settings?.inviteCooldownHours || 24;

    if (!user.lastCodeGeneration) {
      res.json({ canGenerateNow: true, secondsRemaining: 0 });
      return;
    }

    const lastGeneration = new Date(user.lastCodeGeneration).getTime();
    const cooldownMs = cooldownHours * 60 * 60 * 1000;
    const nextAvailable = lastGeneration + cooldownMs;
    const now = Date.now();

    if (now >= nextAvailable) {
      res.json({ canGenerateNow: true, secondsRemaining: 0 });
    } else {
      const secondsRemaining = Math.ceil((nextAvailable - now) / 1000);
      res.json({ canGenerateNow: false, secondsRemaining });
    }
  } catch (err) {
    console.error('Error checking remaining time:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/invites/generate - Generate new invite code
router.post('/generate', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Check cooldown
    const settings = await prisma.adminSettings.findFirst();
    const cooldownHours = settings?.inviteCooldownHours || 24;
    const maxActiveCodes = settings?.maxActiveCodesPerUser || 5;

    if (user.lastCodeGeneration) {
      const lastGeneration = new Date(user.lastCodeGeneration).getTime();
      const cooldownMs = cooldownHours * 60 * 60 * 1000;
      const nextAvailable = lastGeneration + cooldownMs;

      if (Date.now() < nextAvailable) {
        const secondsRemaining = Math.ceil((nextAvailable - Date.now()) / 1000);
        res.status(429).json({
          error: 'Cooldown active',
          secondsRemaining,
          message: `Следующий код можно создать через ${formatRemainingTime(secondsRemaining)}`
        });
        return;
      }
    }

    // Check active codes limit
    const activeCodesCount = await prisma.inviteCode.count({
      where: {
        creatorId: userId,
        usedAt: null
      }
    });

    if (activeCodesCount >= maxActiveCodes) {
      res.status(409).json({
        error: 'Too many active codes',
        message: `Максимум ${maxActiveCodes} неиспользованных кодов`
      });
      return;
    }

    // Generate unique code
    let code: string;
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
      code = generateInviteCode();
      const existing = await prisma.inviteCode.findUnique({
        where: { code }
      });
      if (!existing) {
        isUnique = true;
        break;
      }
      attempts++;
    }

    if (!isUnique) {
      res.status(500).json({ error: 'Failed to generate unique code' });
      return;
    }

    // Create code
    const newCode = await prisma.inviteCode.create({
      data: {
        code: code!,
        creatorId: userId,
      }
    });

    // Update user stats
    await prisma.user.update({
      where: { id: userId },
      data: {
        lastCodeGeneration: new Date(),
        codesGeneratedTotal: { increment: 1 }
      }
    });

    // Log anomaly if user generated too many codes recently
    const codesLast60Min = await prisma.inviteCode.count({
      where: {
        creatorId: userId,
        createdAt: {
          gte: new Date(Date.now() - 60 * 60 * 1000)
        }
      }
    });

    if (codesLast60Min > 3) {
      console.warn(`[ANOMALY] User ${userId} created ${codesLast60Min} codes in 60 minutes`);
    }

    res.json({
      code: newCode.code,
      message: 'Код успешно создан'
    });
  } catch (err) {
    console.error('Error generating invite code:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/invites/:code/check - Check if code exists and is available
router.get('/:code/check', async (req: Request, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    const code = Array.isArray(req.params.code) ? req.params.code[0] : req.params.code;

    const inviteCode = await prisma.inviteCode.findUnique({
      where: { code }
    });

    if (!inviteCode) {
      res.status(404).json({ exists: false, available: false });
      return;
    }

    if (inviteCode.usedAt) {
      res.status(400).json({ exists: true, available: false, message: 'Код уже использован' });
      return;
    }

    // Get creator info
    const creator = await prisma.user.findUnique({
      where: { id: inviteCode.creatorId },
      select: { firstName: true }
    });

    res.json({
      exists: true,
      available: true,
      invitedBy: creator?.firstName || 'участник'
    });
  } catch (err) {
    console.error('Error checking code:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper function to format remaining time
function formatRemainingTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}ч ${minutes}м`;
  }
  return `${minutes}м`;
}

export default router;
