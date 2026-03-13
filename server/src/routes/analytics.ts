import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, adminMiddleware } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Middleware to add prisma to request
router.use((req: Request, res: Response, next) => {
  (req as any).prisma = (req.app as any).locals.prisma;
  next();
});

// ===== ОТСЛЕЖИВАНИЕ СОБЫТИЙ И СЕССИЙ =====

// POST /api/analytics/session/start - Начало сессии пользователя
router.post('/session/start', authMiddleware, async (req: Request, res: Response) => {
  try {
    const prisma: PrismaClient = (req as any).prisma;
    const userId = (req as any).userId;
    const { platform = 'web', userAgent = '' } = req.body;

    const sessionToken = uuidv4();
    const ipAddress = req.ip || req.connection.remoteAddress || '';

    const session = await prisma.userSession.create({
      data: {
        userId,
        sessionToken,
        platform,
        userAgent,
        ipAddress,
      },
    });

    res.json({ sessionToken, sessionId: session.id });
  } catch (err: any) {
    console.error('Session start error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/analytics/session/end - Конец сессии
router.post('/session/end', authMiddleware, async (req: Request, res: Response) => {
  try {
    const prisma: PrismaClient = (req as any).prisma;
    const { sessionToken, durationSec } = req.body;

    const session = await prisma.userSession.updateMany({
      where: { sessionToken },
      data: {
        endedAt: new Date(),
        durationSec: Math.max(0, durationSec || 0),
      },
    });

    res.json({ success: true });
  } catch (err: any) {
    console.error('Session end error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/analytics/event - Отправить событие
router.post('/event', authMiddleware, async (req: Request, res: Response) => {
  try {
    const prisma: PrismaClient = (req as any).prisma;
    const userId = (req as any).userId;
    const { eventType, eventName, category, value, metadata, sessionToken } = req.body;

    // Найти сессию по токену
    let sessionId: number | null = null;
    if (sessionToken) {
      const session = await prisma.userSession.findFirst({
        where: { sessionToken },
      });
      if (session) {
        sessionId = session.id;
        // Увеличить счетчик событий в сессии
        await prisma.userSession.update({
          where: { id: session.id },
          data: { events: { increment: 1 } },
        });
      }
    }

    const event = await prisma.event.create({
      data: {
        userId,
        sessionId,
        eventType,
        eventName,
        category,
        value,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });

    res.json({ success: true, eventId: event.id });
  } catch (err: any) {
    console.error('Event tracking error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/analytics/page-view - Просмотр страницы
router.post('/page-view', authMiddleware, async (req: Request, res: Response) => {
  try {
    const prisma: PrismaClient = (req as any).prisma;
    const userId = (req as any).userId;
    const { page, referrer, timeOnPage, sessionToken } = req.body;

    let sessionId: number | null = null;
    if (sessionToken) {
      const session = await prisma.userSession.findFirst({
        where: { sessionToken },
      });
      if (session) {
        sessionId = session.id;
        // Увеличить счетчик просмотров в сессии
        await prisma.userSession.update({
          where: { id: session.id },
          data: { pageViews: { increment: 1 } },
        });
      }
    }

    await prisma.pageView.create({
      data: {
        userId,
        sessionId,
        page,
        referrer,
        timeOnPage,
      },
    });

    res.json({ success: true });
  } catch (err: any) {
    console.error('Page view error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/analytics/search - Поиск пользователя
router.post('/search', authMiddleware, async (req: Request, res: Response) => {
  try {
    const prisma: PrismaClient = (req as any).prisma;
    const userId = (req as any).userId;
    const { searchType, query, resultCount, hasClicked } = req.body;

    await prisma.search.create({
      data: {
        userId,
        searchType,
        query,
        resultCount,
        hasClicked: hasClicked || false,
      },
    });

    res.json({ success: true });
  } catch (err: any) {
    console.error('Search tracking error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/analytics/filter - Применение фильтра
router.post('/filter', authMiddleware, async (req: Request, res: Response) => {
  try {
    const prisma: PrismaClient = (req as any).prisma;
    const userId = (req as any).userId;
    const { page, filterType, filterValue } = req.body;

    await prisma.filter.create({
      data: {
        userId,
        page,
        filterType,
        filterValue,
      },
    });

    res.json({ success: true });
  } catch (err: any) {
    console.error('Filter tracking error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/analytics/button-click - Клик на кнопку
router.post('/button-click', authMiddleware, async (req: Request, res: Response) => {
  try {
    const prisma: PrismaClient = (req as any).prisma;
    const userId = (req as any).userId;
    const { buttonName, buttonText, buttonGroup, sessionToken, page } = req.body;

    await prisma.buttonClick.create({
      data: {
        userId,
        buttonName: buttonName || 'unknown',
        buttonText: buttonText || buttonName,
        buttonGroup: buttonGroup || 'other',
        page: page || null,
        sessionToken: sessionToken || null,
      },
    });

    res.json({ success: true });
  } catch (err: any) {
    console.error('Button click tracking error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/analytics/client-error - JavaScript ошибка на клиенте
router.post('/client-error', authMiddleware, async (req: Request, res: Response) => {
  try {
    const prisma: PrismaClient = (req as any).prisma;
    const userId = (req as any).userId;
    const { message, stack, page, userAgent } = req.body;

    await prisma.clientError.create({
      data: {
        userId,
        message,
        stack,
        page,
        userAgent,
      },
    });

    res.json({ success: true });
  } catch (err: any) {
    console.error('Client error tracking error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/analytics/feature - Использование функции
router.post('/feature', authMiddleware, async (req: Request, res: Response) => {
  try {
    const prisma: PrismaClient = (req as any).prisma;
    const userId = (req as any).userId;
    const { feature, action, value } = req.body;

    await prisma.featureUsage.create({
      data: {
        userId,
        feature,
        action,
        value,
      },
    });

    res.json({ success: true });
  } catch (err: any) {
    console.error('Feature tracking error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/analytics/performance - Performance метрики
router.post('/performance', authMiddleware, async (req: Request, res: Response) => {
  try {
    const prisma: PrismaClient = (req as any).prisma;
    const userId = (req as any).userId;
    const { page, pageLoadTime, dnsTime, tcpTime, ttfb, fcpTime, lcpTime, fid, cls, memoryUsed } = req.body;

    await prisma.performanceMetric.create({
      data: {
        userId,
        page,
        pageLoadTime,
        dnsTime,
        tcpTime,
        ttfb,
        fcpTime,
        lcpTime,
        fid,
        cls,
        memoryUsed,
      },
    });

    res.json({ success: true });
  } catch (err: any) {
    console.error('Performance tracking error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/analytics/content-interaction - Взаимодействие с контентом
router.post('/content-interaction', authMiddleware, async (req: Request, res: Response) => {
  try {
    const prisma: PrismaClient = (req as any).prisma;
    const userId = (req as any).userId;
    const { contentType, contentId, action, duration } = req.body;

    await prisma.contentInteraction.create({
      data: {
        userId,
        contentType,
        contentId,
        action,
        duration,
      },
    });

    res.json({ success: true });
  } catch (err: any) {
    console.error('Content interaction error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ===== АДМИН ENDPOINTS ДЛЯ ПОЛУЧЕНИЯ МЕТРИК =====

// GET /api/analytics/admin/dashboard - Общая статистика приложения
router.get('/admin/dashboard', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const prisma: PrismaClient = (req as any).prisma;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalEvents,
      todayEvents,
      activeSessions,
      totalSessions,
      totalUsers,
      dailyActiveUsers,
      weeklyActiveUsers,
      monthlyActiveUsers,
      totalPageViews,
      todayPageViews,
      totalSearches,
      totalErrors,
      totalFeatures,
    ] = await Promise.all([
      prisma.event.count(),
      prisma.event.count({ where: { timestamp: { gte: today } } }),
      prisma.userSession.count({ where: { endedAt: null } }),
      prisma.userSession.count(),
      prisma.user.count(),
      prisma.userSession.count({ where: { startedAt: { gte: today } } }),
      prisma.userSession.count({ where: { startedAt: { gte: sevenDaysAgo } } }),
      prisma.userSession.count({ where: { startedAt: { gte: thirtyDaysAgo } } }),
      prisma.pageView.count(),
      prisma.pageView.count({ where: { viewedAt: { gte: today } } }),
      prisma.search.count(),
      prisma.clientError.count(),
      prisma.featureUsage.count(),
    ]);

    res.json({
      totalEvents,
      todayEvents,
      activeSessions,
      totalSessions,
      totalUsers,
      dailyActiveUsers,
      weeklyActiveUsers,
      monthlyActiveUsers,
      totalPageViews,
      todayPageViews,
      totalSearches,
      totalErrors,
      totalFeatures,
    });
  } catch (err: any) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analytics/admin/top-pages - ТОП страниц
router.get('/admin/top-pages', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const prisma: PrismaClient = (req as any).prisma;
    const { limit = 10, days = 30 } = req.query;

    const dateFrom = new Date(Date.now() - (days as any) * 24 * 60 * 60 * 1000);

    const topPages = await prisma.pageView.groupBy({
      by: ['page'],
      where: {
        viewedAt: { gte: dateFrom },
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: +limit,
    });

    res.json(topPages.map(p => ({ page: p.page, views: p._count.id })));
  } catch (err: any) {
    console.error('Top pages error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analytics/admin/top-events - ТОП событий
router.get('/admin/top-events', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const prisma: PrismaClient = (req as any).prisma;
    const { limit = 20, days = 30 } = req.query;

    const dateFrom = new Date(Date.now() - (days as any) * 24 * 60 * 60 * 1000);

    const topEvents = await prisma.event.groupBy({
      by: ['eventName', 'eventType'],
      where: {
        timestamp: { gte: dateFrom },
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: +limit,
    });

    res.json(topEvents.map(e => ({ eventName: e.eventName, eventType: e.eventType, count: e._count.id })));
  } catch (err: any) {
    console.error('Top events error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analytics/admin/user-cohorts - Когорты пользователей
router.get('/admin/user-cohorts', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const prisma: PrismaClient = (req as any).prisma;

    const cohorts = await prisma.userMetricsSnapshot.groupBy({
      by: ['date', 'period'],
      _avg: {
        sessionCount: true,
        totalDuration: true,
        pageViews: true,
      },
      _count: {
        userId: true,
      },
      orderBy: {
        date: 'desc',
      },
      take: 30,
    });

    res.json(cohorts);
  } catch (err: any) {
    console.error('Cohorts error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analytics/admin/user/:userId - Метрики конкретного пользователя
router.get('/admin/user/:userId', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const prisma: PrismaClient = (req as any).prisma;
    const { userId } = req.params;
    const uid = +userId;

    const [
      user,
      sessions,
      events,
      pageViews,
      searches,
      features,
      errors,
      contentInteractions,
      totalDuration,
      lastActive,
    ] = await Promise.all([
      prisma.user.findUnique({ where: { id: uid } }),
      prisma.userSession.count({ where: { userId: uid } }),
      prisma.event.count({ where: { userId: uid } }),
      prisma.pageView.count({ where: { userId: uid } }),
      prisma.search.count({ where: { userId: uid } }),
      prisma.featureUsage.count({ where: { userId: uid } }),
      prisma.clientError.count({ where: { userId: uid } }),
      prisma.contentInteraction.count({ where: { userId: uid } }),
      prisma.userSession.aggregate({
        where: { userId: uid },
        _sum: { durationSec: true },
      }),
      prisma.event.findFirst({
        where: { userId: uid },
        orderBy: { timestamp: 'desc' },
        select: { timestamp: true },
      }),
    ]);

    res.json({
      user: { id: user?.id, firstName: user?.firstName, lastName: user?.lastName, createdAt: user?.createdAt },
      sessions,
      events,
      pageViews,
      searches,
      features,
      errors,
      contentInteractions,
      totalDuration: totalDuration._sum.durationSec || 0,
      lastActive: lastActive?.timestamp,
    });
  } catch (err: any) {
    console.error('User metrics error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analytics/admin/feature-adoption - Принятие функций
router.get('/admin/feature-adoption', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const prisma: PrismaClient = (req as any).prisma;

    const features = await prisma.featureUsage.groupBy({
      by: ['feature', 'action'],
      _count: {
        userId: true,
      },
      orderBy: {
        _count: {
          userId: 'desc',
        },
      },
    });

    res.json(features);
  } catch (err: any) {
    console.error('Feature adoption error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analytics/admin/search-trends - Тренды поиска
router.get('/admin/search-trends', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const prisma: PrismaClient = (req as any).prisma;
    const { limit = 20, days = 30 } = req.query;

    const dateFrom = new Date(Date.now() - (days as any) * 24 * 60 * 60 * 1000);

    const trends = await prisma.search.groupBy({
      by: ['query', 'searchType'],
      where: {
        timestamp: { gte: dateFrom },
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: +limit,
    });

    res.json(trends.map(t => ({ query: t.query, searchType: t.searchType, count: t._count.id })));
  } catch (err: any) {
    console.error('Search trends error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analytics/admin/performance - Performance статистика
router.get('/admin/performance', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const prisma: PrismaClient = (req as any).prisma;
    const { days = 30 } = req.query;

    const dateFrom = new Date(Date.now() - (days as any) * 24 * 60 * 60 * 1000);

    const metrics = await prisma.performanceMetric.aggregate({
      where: { timestamp: { gte: dateFrom } },
      _avg: {
        pageLoadTime: true,
        'fcpTime': true,
        'lcpTime': true,
        'cls': true,
      },
      _count: {
        id: true,
      },
    });

    res.json(metrics);
  } catch (err: any) {
    console.error('Performance error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analytics/admin/errors - Ошибки
router.get('/admin/errors', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const prisma: PrismaClient = (req as any).prisma;
    const { limit = 50, days = 30 } = req.query;

    const dateFrom = new Date(Date.now() - (days as any) * 24 * 60 * 60 * 1000);

    const errors = await prisma.clientError.findMany({
      where: { timestamp: { gte: dateFrom } },
      orderBy: { timestamp: 'desc' },
      take: +limit,
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
    });

    res.json(errors);
  } catch (err: any) {
    console.error('Errors error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analytics/admin/retention - Retention (повторные посещения)
router.get('/admin/retention', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const prisma: PrismaClient = (req as any).prisma;

    // Пользователи, активные в разные дни
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeDates = [];
    for (let i = 0; i < 30; i++) {
      const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);

      const count = await prisma.userSession.findMany({
        where: {
          startedAt: { gte: date, lt: nextDate },
        },
        distinct: ['userId'],
      });

      activeDates.push({ date: date.toISOString().split('T')[0], users: count.length });
    }

    res.json(activeDates.reverse());
  } catch (err: any) {
    console.error('Retention error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analytics/admin/top-buttons - Топ нажимаемых кнопок
router.get('/admin/top-buttons', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const prisma: PrismaClient = (req as any).prisma;
    const { days = 30 } = req.query;

    const dateFrom = new Date(Date.now() - (days as any) * 24 * 60 * 60 * 1000);

    // Топ кнопок по всему приложению
    const topButtons = await prisma.buttonClick.groupBy({
      by: ['buttonName', 'buttonGroup'],
      where: { timestamp: { gte: dateFrom } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 50,
    });

    // Детальная статистика для каждой кнопки
    const buttonStats = await Promise.all(
      topButtons.map(async (btn) => {
        const details = await prisma.buttonClick.groupBy({
          by: ['buttonText'],
          where: {
            buttonName: btn.buttonName,
            buttonGroup: btn.buttonGroup,
            timestamp: { gte: dateFrom },
          },
          _count: { id: true },
        });

        return {
          buttonName: btn.buttonName,
          buttonGroup: btn.buttonGroup,
          totalClicks: btn._count.id,
          variants: details.map((d) => ({
            text: d.buttonText,
            clicks: d._count.id,
          })),
        };
      })
    );

    res.json(buttonStats);
  } catch (err: any) {
    console.error('Top buttons error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analytics/admin/button-details - Детальная статистика по кнопке
router.get('/admin/button-details/:buttonName', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const prisma: PrismaClient = (req as any).prisma;
    const { buttonName } = req.params;
    const { days = 30 } = req.query;

    const dateFrom = new Date(Date.now() - (days as any) * 24 * 60 * 60 * 1000);

    // Клики по дням
    const clicksByDay = await prisma.buttonClick.groupBy({
      by: ['buttonName'],
      where: {
        buttonName,
        timestamp: { gte: dateFrom },
      },
      _count: { id: true },
    });

    // Кто нажимал (топ пользователей)
    const topUsers = await prisma.buttonClick.groupBy({
      by: ['userId'],
      where: {
        buttonName,
        timestamp: { gte: dateFrom },
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20,
    });

    // Со скольких страниц нажимали
    const butto_pages = await prisma.buttonClick.groupBy({
      by: ['page'],
      where: {
        buttonName,
        timestamp: { gte: dateFrom },
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    res.json({
      buttonName,
      totalClicks: clicksByDay[0]?._count.id || 0,
      topUsers: topUsers.map((u) => ({ userId: u.userId, clicks: u._count.id })),
      pages: butto_pages.map((p) => ({ page: p.page, clicks: p._count.id })),
    });
  } catch (err: any) {
    console.error('Button details error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
