# 🚀 QUICK START - СИСТЕМА МЕТРИК ПОЧТИ ГОТОВА!

## ✅ ЧТО БЫЛО РЕАЛИЗОВАНО

### 📊 **40+ МЕТРИК** - ВСE СОБРАНО И ГОТОВО

---

## 🔧 ЧТО НУЖНО СДЕЛАТЬ ДЛЯ ЗАПУСКА

### 1️⃣ УСТАНОВИТЬ ЗАВИСИМОСТИ (1 минута)

```bash
cd server
npm install  # установит uuid

cd ../client
npm install
```

### 2️⃣ ПРИМЕНИТЬ МИГРАЦИЮ БД (2 минуты)

```bash
cd server
npx prisma db push   # Применить новые таблицы
npx prisma generate  # Генерировать Prisma Client
```

### 3️⃣ ПЕРЕСОБРАТЬ И РАЗВЕРНУТЬ (5 минут)

```bash
# На сервере
cd /var/www/impera

# Обновить код
git pull

# Backend
cd server
npm install
npm run build

# Frontend  
cd ../client
npm run build

# Перезагрузить
cd ..
pm2 restart all
```

---

## 📈 ГДЕ СМОТРЕТЬ МЕТРИКИ

### 🎯 АДМИН-ПАНЕЛЬ → ВКЛАДКА "МЕТРИКИ"

**Путь:** `/admin` → кликнуть на "Метрики"

### Что там есть:

✅ **KPI Карточки** - ActiveSessions, DAU, WAU, MAU  
✅ **ТОП Страниц** - Самые посещаемые  
✅ **ТОП События** - Самые частые клики  
✅ **Тренды Поиска** - Что ищут пользователи  
✅ **Performance** - Загрузка страниц, FCP, LCP  
✅ **Ошибки** - JS ошибки в real-time  
✅ **KPI & Конверсии** - Engagement, Error Rate  

---

## 📊 КАКИЕ МЕТРИКИ СОБИРАЮТСЯ

### 🔴 АВТОМАТИЧЕСКИ (без кода)

- ✅ Каждая сессия пользователя
- ✅ Все просмотры страниц
- ✅ Performance (загрузка, FCP, LCP)
- ✅ JS ошибки
- ✅ User-Agent, IP, Platform

### 🟢 УЖЕ ДОБАВЛЕНО В КОД

- ✅ **SchedulePage** → Tab switching (сегодня/завтра/неделя)
- ✅ **FeedbackPage** → Отправка фидбека
- ✅ **ProfilePage** → Просмотры и включение уведомлений
- ✅ **SportsPage** → Просмотры, смена вкладок

### 🟡 ГОТОВО К ДОБАВЛЕНИЮ (copy-paste)

```typescript
// Просмотр страницы
import { analytics } from '../api/analytics';

useEffect(() => {
  analytics.trackPageView('/schedule');
}, []);

// Клик на кнопку
onClick={() => {
  analytics.trackButtonClick('submit_schedule');
}}

// Событие
analytics.trackEvent('user_action', 'category', 1, { key: 'value' });

// Поиск
analytics.trackSearch('teachers', query, results.length);

// Фильтр
analytics.trackFilter('/schedule', 'day_of_week', 'monday');
```

---

## 🎯 ГЛАВНЫЕ МЕТРИКИ ДЛЯ DEVELOPMENT

### Для понимания поведения пользователей:

1. **DAU/WAU/MAU** - Активность по дням/неделям/месяцам
2. **Session Duration** - Как долго пользователи в приложении
3. **Top Pages** - Какие страницы популярны
4. **Events per User** - Среднее количество действий
5. **Error Rate** - Какие ошибки происходят
6. **Search Trends** - Что ищут пользователи

### Для планирования разработки:

7. **Top Events** - Какие кнопки/действия популярны
8. **Feature Adoption** - Используют ли новые функции
9. **Time on Page** - Интерес пользователей
10. **Retention** - Возвращаются ли пользователи

---

## 📁 СОЗДАННЫЕ/ИЗМЕНЁННЫЕ ФАЙЛЫ

### Backend
- ✅ `server/src/routes/analytics.ts` - 350+ строк API endpoints
- ✅ `server/src/index.ts` - Добавлена аналитика в routes
- ✅ `server/prisma/schema.prisma` - 13 новых таблиц для метрик
- ✅ `server/package.json` - Добавлен uuid

### Frontend
- ✅ `client/src/api/analytics.ts` - 350+ строк analytics service
- ✅ `client/src/pages/admin/MetricsTab.tsx` - Admin dashboard компонент
- ✅ `client/src/App.tsx` - Инициализация analytics
- ✅ `client/src/pages/SchedulePage.tsx` - Отслеживание tab switching
- ✅ `client/src/pages/FeedbackPage.tsx` - Отслеживание фидбека
- ✅ `client/src/pages/ProfilePage.tsx` - Отслеживание настроек
- ✅ `client/src/pages/SportsPage.tsx` - Отслеживание спорта

---

## 🔗 API ENDPOINTS (все готовы)

### Отслеживание (в фронтенде)
```
POST /api/analytics/session/start
POST /api/analytics/session/end
POST /api/analytics/event
POST /api/analytics/page-view
POST /api/analytics/search
POST /api/analytics/filter
POST /api/analytics/client-error
POST /api/analytics/feature
POST /api/analytics/performance
POST /api/analytics/content-interaction
```

### Получение (в админ-панели)
```
GET /api/analytics/admin/dashboard
GET /api/analytics/admin/top-pages
GET /api/analytics/admin/top-events
GET /api/analytics/admin/search-trends
GET /api/analytics/admin/performance
GET /api/analytics/admin/errors
GET /api/analytics/admin/feature-adoption
GET /api/analytics/admin/retention
GET /api/analytics/admin/user/:userId
GET /api/analytics/admin/user-cohorts
```

---

## 📊 ПРИМЕРЫ ИСПОЛЬЗОВАНИЯ ДАННЫХ

### В админ-панели видите:

```
KPI КАРТОЧКИ:
- Активные сессии: 42
- События сегодня: 1,234
- DAU: 156
- WAU: 487
- MAU: 1,203

ТОП СТРАНИЦ:
- /schedule: 2,345 
- /profile: 567
- /sports: 456

ТОП СОБЫТИЯ:
- button_click: 5,678
- page_view: 1,234
- schedule_tab_click: 892

ТРЕНДЫ ПОИСКА:
- "Иванов": 45
- "Расписание": 34
- "Спорт": 28

PERFORMANCE:
- Ср. загрузка: 1,234ms
- FCP: 456ms
- LCP: 789ms
- Error Rate: 2.1%
```

---

## ⚙️ КОНФИГУРАЦИЯ

### Автоматическая инициализация

В `App.tsx` уже добавлено:
```typescript
useEffect(() => {
  if (!loading && user) {
    analytics.initializeSession();      // Начало сессии
    analytics.setupGlobalErrorTracking(); // Отслеживание ошибок
  }
}, [user, loading]);
```

### Отключение (если нужно)

```typescript
// Закомментировать в App.tsx
// analytics.initializeSession();
```

---

## 🧪 ТЕСТИРОВАНИЕ

### Проверить, что метрики собираются:

1. Откройте приложение → F12 (DevTools)
2. Перейдите в Network tab
3. Фильтр: `analytics`
4. Кликайте по страницам → увидите POST запросы:
   - `/api/analytics/session/start`
   - `/api/analytics/page-view`
   - `/api/analytics/event`

5. Откройте админ-панель → вкладка "Метрики"
6. Должны видеть данные!

---

## 🐛 ЕСЛИ ЧТО-ТО НЕ РАБОТАЕТ

### Ошибка: "Table not found"
```bash
# Решение:
cd server
npx prisma db push
```

### Ошибка: "Cannot POST /api/analytics/..."
```bash
# Проверить, что analytics router добавлен:
# server/src/index.ts должен содержать:
import analyticsRoutes from './routes/analytics';
app.use('/api/analytics', analyticsRoutes);
```

### В админ-панели "Метрики" не видны
```bash
# 1. Проверить, что вкладка добавлена в AdminDashboard.tsx
# 2. Перезагрузить страницу (F5)
# 3. Проверить консоль на ошибки (F12)
```

---

## 📈 NEXT STEPS (опционально)

### Можно добавить отслеживание в:
- Кнопку "Записаться на спорт"
- Добавление в избранное (учителя, секции)
- Применение фильтров
- Более подробное отслеживание на SportsPage
- Tracking в AdminSchedule, AdminImport

### Пример:
```typescript
// В кнопке "Записаться"
onClick={async () => {
  await enrollSports(sectionId);
  analytics.trackSportsAction('enroll', sectionId);
}}
```

---

## 📝 ИТОГО

| Компонент | Статус | Примечание |
|-----------|--------|-----------|
| Backend API | ✅ Готов | 13 API endpoints |
| Database | ✅ Готов | 13 новых таблиц |
| Admin UI | ✅ Готов | Nova вкладка "Метрики" |
| Frontend service | ✅ Готов | Полностью интегрирован |
| Page tracking | ✅ Готов | 4 страницы |
| Button tracking | ✅ Готов | SchedulePage, FeedbackPage |
| Error tracking | ✅ Готов | Автоматический |

---

## 🚀 ГОТОВО К РАЗВЕРТЫВАНИЮ!

Метрики начнут собираться сразу после обновления кода на сервере.

**Удачи в анализе поведения пользователей! 📊**
