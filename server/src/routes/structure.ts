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
  const programs = await prisma.program.findMany({
    where: { directionId: parseInt(String(req.params.id)) },
    orderBy: { name: 'asc' }
  });
  res.json(programs);
});

// GET /api/structure/programs/:id/groups
router.get('/programs/:id/groups', async (req: Request, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const groups = await prisma.group.findMany({
    where: { programId: parseInt(String(req.params.id)) },
    orderBy: [{ course: 'asc' }, { number: 'asc' }]
  });
  res.json(groups);
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
      { name: { contains: search as string } },
      { program: { name: { contains: search as string } } },
      { program: { direction: { name: { contains: search as string } } } }
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
