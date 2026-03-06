import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();

// GET /api/structure/institutes
router.get('/institutes', async (req: Request, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const institutes = await prisma.institute.findMany({
    orderBy: { name: 'asc' }
  });
  res.json(institutes);
});

// GET /api/structure/institutes/:id/directions
router.get('/institutes/:id/directions', async (req: Request, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const directions = await prisma.direction.findMany({
    where: { instituteId: parseInt(String(req.params.id)) },
    orderBy: { name: 'asc' }
  });
  res.json(directions);
});

// GET /api/structure/directions/:id/programs
router.get('/directions/:id/programs', async (req: Request, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const directionId = parseInt(String(req.params.id));
  const { search, page = '1', limit = '100' } = req.query;
  
  const where: any = { directionId };
  if (search) {
    where.name = { contains: search as string, mode: 'insensitive' };
  }

  const [programs, total] = await Promise.all([
    prisma.program.findMany({
      where,
      orderBy: { name: 'asc' },
      skip: (parseInt(page as string) - 1) * parseInt(limit as string),
      take: parseInt(limit as string),
    }),
    prisma.program.count({ where }),
  ]);

  console.log(`[API] /directions/${directionId}/programs: found ${total} programs, returning ${programs.length} items`);

  res.json({
    items: programs,
    total,
    page: parseInt(page as string),
    limit: parseInt(limit as string),
    totalPages: Math.ceil(total / parseInt(limit as string)),
  });
});

// GET /api/structure/programs/:id/groups
router.get('/programs/:id/groups', async (req: Request, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const programId = parseInt(String(req.params.id));
  const { search, page = '1', limit = '100' } = req.query;
  
  const where: any = { programId };
  if (search) {
    where.name = { contains: search as string, mode: 'insensitive' };
  }

  const [groups, total] = await Promise.all([
    prisma.group.findMany({
      where,
      orderBy: [{ course: 'asc' }, { number: 'asc' }],
      skip: (parseInt(page as string) - 1) * parseInt(limit as string),
      take: parseInt(limit as string),
    }),
    prisma.group.count({ where }),
  ]);

  console.log(`[API] /programs/${programId}/groups: found ${total} groups, returning ${groups.length} items`);

  res.json({
    items: groups,
    total,
    page: parseInt(page as string),
    limit: parseInt(limit as string),
    totalPages: Math.ceil(total / parseInt(limit as string)),
  });
});

// GET /api/structure/groups — all groups with full hierarchy
router.get('/groups', async (req: Request, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const { search, instituteId, directionId, course } = req.query;

  const where: any = {};
  if (instituteId) where.program = { direction: { instituteId: parseInt(instituteId as string) } };
  if (directionId) where.program = { directionId: parseInt(directionId as string) };
  if (course) where.course = parseInt(course as string);
  if (search) {
    where.OR = [
      { name: { contains: search as string, mode: 'insensitive' } },
      { program: { name: { contains: search as string, mode: 'insensitive' } } },
      { program: { direction: { name: { contains: search as string, mode: 'insensitive' } } } }
    ];
  }

  const groups = await prisma.group.findMany({
    where,
    include: { program: { include: { direction: { include: { institute: true } } } } },
    orderBy: [{ course: 'asc' }, { number: 'asc' }]
  });
  res.json(groups);
});

export default router;
