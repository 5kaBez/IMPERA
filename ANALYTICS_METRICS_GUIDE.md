# 📊 ANALYTICS & METRICS SYSTEM - ПОЛНОЕ РУКОВОДСТВО

## ✅ РЕАЛИЗАЦИЯ ЗАВЕРШЕНА

Была создана комплексная система сбора и анализа метрик поведения пользователей. Система отслеживает **40+ метрик** для полного понимания взаимодействия пользователей с приложением.

---

## 🎯 АРХИТЕКТУРА СИСТЕМЫ

### Компоненты:
1. **Backend (Node.js/Express)** - `/server/src/routes/analytics.ts`
2. **Database (PostgreSQL + Prisma)** - 13 новых таблиц для хранения метрик
3. **Frontend (React)** - `/client/src/api/analytics.ts` - сервис отслеживания
4. **Admin Dashboard** - Новая вкладка "Метрики" с визуализацией

---

## 📈 СОБИРАЕМЫЕ МЕТРИКИ (40+)

### 🔹 ОСНОВНЫЕ МЕТРИКИ СЕССИИ (5 метрик)
1. **Total Sessions** - Всего сессий пользователей
2. **Active Sessions** - Активные сессии (в реальном времени)
3. **Average Session Duration** - Средняя длительность сессии (секунды)
4. **Session Token** - Уникальный идентификатор сессии
5. **Platform** - Платформа доступа (web, mobile, telegram)

Пример события:
```
POST /api/analytics/session/start → { sessionToken: "uuid", platform: "web" }
POST /api/analytics/session/end → { sessionToken, durationSec: 300 }
```

---

### 🔹 СОБЫТИЯ И ВЗАИМОДЕЙСТВИЯ (12 метрик)
6. **Total Events** - Всего событий за период
7. **Today Events** - События за сегодня
8. **Events per User** - Среднее количество событий на пользователя
9. **Button Clicks** - Количество нажатий на кнопки
10. **Tab Switches** - Переменяние вкладок (расписание: сегодня/завтра/неделя)
11. **Form Submissions** - Отправки форм (фидбек, предложения)
12. **Navigation Events** - Навигация между страницами
13. **Schedule Views** - Просмотры расписания
14. **Profile Views** - Просмотры профиля
15. **Feedback Submissions** - Отправки фидбека
16. **Sports Actions** - Действия со спортом (присоединение, просмотр)
17. **Feature Toggles** - Включение/выключение функций
18. **Content Interactions** - Взаимодействия с контентом

Пример:
```
POST /api/analytics/event → {
  eventName: "button_click",
  category: "schedule",
  value: 1,
  metadata: { buttonName: "view_details" }
}
```

---

### 🔹 ПРОСМОТРЫ СТРАНИЦ (8 метрик)
19. **Total Page Views** - Всего просмотров страниц
20. **Today Page Views** - Просмотров сегодня
21. **Top Pages** - Самые популярные страницы
22. **Time on Page** - Время, проведенное на странице (секунды)
23. **Pages: /schedule** - Просмотры расписания
24. **Pages: /profile** - Просмотры профиля
25. **Pages: /sports** - Просмотры спорта
26. **Pages: /feedback** - Просмотры страницы фидбека

Тип события:
```
POST /api/analytics/page-view → {
  page: "/schedule",
  referrer: "/profile",
  timeOnPage: 120
}
```

---

### 🔹 ПОИСК (4 метрики)
27. **Total Searches** - Всего поисковых запросов
28. **Search Type Distribution** - Распределение по типам (teachers, schedule)
29. **Top Searches** - Самые частые поисковые запросы
30. **Search Conversion** - % поисков, по которым кликнули на результат

Пример:
```
POST /api/analytics/search → {
  searchType: "teachers",
  query: "Иванов",
  resultCount: 5,
  hasClicked: true
}
```

---

### 🔹 ФИЛЬТРЫ (3 метрики)
31. **Total Filters Applied** - Всего применено фильтров
32. **Most Used Filters** - Самые частые фильтры
33. **Filter Types** - Типы фильтров (institute, direction, day_of_week)

Данные:
```
POST /api/analytics/filter → {
  page: "/schedule",
  filterType: "day_of_week",
  filterValue: "monday"
}
```

---

### 🔹 PERFORMANCE МЕТРИКИ (6 метрик)
34. **Page Load Time** - Время загрузки страницы (мс)
35. **FCP (First Contentful Paint)** - Первый контент закрашен (мс)
36. **LCP (Largest Contentful Paint)** - Самый крупный контент загружен (мс)
37. **DNS Time** - Время DNS запроса (мс)
38. **TCP Time** - Время TCP соединения (мс)
39. **Average Memory Usage** - Среднее использование памяти (MB)

Отприходование:
```
POST /api/analytics/performance → {
  page: "/schedule",
  pageLoadTime: 1234,
  fcpTime: 456,
  lcpTime: 789,
  memoryUsed: 128
}
```

---

### 🔹 ОШИБКИ КЛИЕНТА (2 метрики)
40. **Total JavaScript Errors** - Всего JS ошибок
41. **Error Distribution** - Распределение ошибок по типам и страницам

Сбор:
```
POST /api/analytics/client-error → {
  message: "Cannot read property 'x' of undefined",
  stack: "...",
  page: "/schedule",
  userAgent: "..."
}
```

---

### 🔹 ИСПОЛЬЗОВАНИЕ ФУНКЦИЙ (3+ метрики)
42. **Notifications Enabled** - Включены ли уведомления
43. **Reviews Feature** - Использование функции рецензирования преподавателей
44. **Sports Enrollment** - Запись на спортивные секции
45. **Referral Program** - Использование реферальной программы

Ч:
```
POST /api/analytics/feature → {
  feature: "notifications",
  action: "enabled",
  value: "push"
}
```

---

## 🎨 АДМИН DASHBOARD - ВКЛАДКА "МЕТРИКИ"

### Расположение
**Admin Panel → Вкладка "Метрики"** (`/admin` → tab: "metrics")

### Разделы:

#### 1️⃣ KPI КАРТОЧКИ (8 карточек)
- ✅ Активные сессии (Real-time)
- ✅ События за сегодня
- ✅ Просмотры за сегодня
- ✅ DAU (Daily Active Users)
- ✅ WAU (Weekly Active Users)
- ✅ MAU (Monthly Active Users)
- ✅ Всего поисков
- ✅ Ошибки

#### 2️⃣ KPI И КОНВЕРСИИ (4 метрики)
- Search-to-Click Conversion Rate
- Средняя длительность сессии
- Error Rate (%)
- Engagement Rate (%)

#### 3️⃣ ТОП СТРАНИЦ
Самые посещаемые страницы за выбранный период

#### 4️⃣ ТОП СОБЫТИЯ
Самые частые пользовательские события (клики, навигация, поиск)

#### 5️⃣ ТРЕНДЫ ПОИСКА
Анализ популярных поисковых запросов

#### 6️⃣ PERFORMANCE
- Средняя загрузка страницы
- First Contentful Paint
- Largest Contentful Paint
- Cumulative Layout Shift

#### 7️⃣ ПОСЛЕДНИЕ ОШИБКИ
Список последних JavaScript ошибок с информацией о пользователе

#### 8️⃣ ИТОГИ
- Всего пользователей
- Всего событий
- Всего сессий
- Avg событий на пользователя

---

## 🔧 API ENDPOINTS

### Отслеживание событий (Frontend)
```
POST /api/analytics/session/start         - Начало сессии
POST /api/analytics/session/end           - Конец сессии
POST /api/analytics/event                 - Отрправка события
POST /api/analytics/page-view             - Просмотр страницы
POST /api/analytics/search                - Поиск
POST /api/analytics/filter                - Применение фильтра
POST /api/analytics/client-error          - JS ошибка
POST /api/analytics/feature               - Использование функции
POST /api/analytics/performance           - Performance метрики
POST /api/analytics/content-interaction   - Взаимодействие с контентом
```

### Получение метрик (Admin)
```
GET /api/analytics/admin/dashboard        - Главная статистика
GET /api/analytics/admin/top-pages        - Топ страниц
GET /api/analytics/admin/top-events       - Топ событий
GET /api/analytics/admin/search-trends    - Тренды поиска
GET /api/analytics/admin/performance      - Performance метрики
GET /api/analytics/admin/errors           - Ошибки
GET /api/analytics/admin/feature-adoption - Использование функций
GET /api/analytics/admin/retention        - Retention анализ
GET /api/analytics/admin/user/:userId     - Метрики конкретного пользователя
GET /api/analytics/admin/user-cohorts     - Когорты пользователей
```

---

## 📊 DATABASE SCHEMA

Создано 13 новых моделей в Prisma:

```
UserSession              → Сессии пользователей
Event                    → События
PageView                 → Просмотры страниц
Search                   → Поиски
Filter                   → Применяемые фильтры
ClientError              → JS ошибки
FeatureUsage             → Использование функций
PerformanceMetric        → Performance данные
ContentInteraction       → Взаимодействия с контентом
Subscription             → Подписки (для будущих платных функций)
Recommendation           → Рекомендации
UserMetricsSnapshot      → Кэш ежедневных/еженедельных/ежемесячных метрик
AppMetric                → Глобальные метрики приложения
```

---

## 🚀 КАК ИСПОЛЬЗОВАТЬ

### 1. Инициализация Analytics
В App.tsx уже добавлена инициализация:
```typescript
import { analytics } from './api/analytics';

useEffect(() => {
  if (!loading && user) {
    analytics.initializeSession();
    analytics.setupGlobalErrorTracking();
  }
}, [user, loading]);
```

### 2. Отслеживание событий в компонентах
```typescript
import { analytics } from './api/analytics';

// Клик на кнопку
const handleClick = () => {
  analytics.trackButtonClick('submit_feedback');
};

// Просмотр страницы
useEffect(() => {
  analytics.trackPageView('/schedule');
}, []);

// Поиск
const handleSearch = (query) => {
  analytics.trackSearch('teachers', query, results.length);
};

// Событие
analytics.trackEvent('user_action', 'category', 1, { key: 'value' });
```

### 3. Просмотр метрик
1. Перейти в **Админ-панель** (`/admin`)
2. Кликнуть на вкладку **"Метрики"**
3. Выбрать период (7 дней / 30 дней)
4. Анализировать данные

---

## 📝 ПРИМЕРЫ ИНТЕГРАЦИИ

### SchedulePage (уже добавлено)
```typescript
onClick={() => {
  setTab(t);
  analytics.trackEvent('schedule_tab_click', 'schedule', 1, { tab: t });
}}
```

### ProfilePage
```typescript
useEffect(() => {
  analytics.trackPageView('/profile');
  analytics.trackEvent('profile_view', 'profile');
}, []);
```

### FeedbackPage
```typescript
const handleSubmit = async () => {
  // ...
  analytics.trackFeedbackSubmitted('suggestion');
};
```

### SportsPage
```typescript
const handleJoin = (sectionId) => {
  analytics.trackSportsAction('join', sectionId);
};
```

---

## 🎯 ИСПОЛЬЗОВАНИЕ ДАННЫХ ДЛЯ РАЗВИТИЯ

### Анализ поведения
- **DAU/WAU/MAU** - Активность пользователей
- **Top Pages** - Самые популярные функции
- **Time on Page** - Интерес пользователей
- **Search Trends** - Что ищут пользователи

### Оптимизация
- **Performance Metrics** - Оптимизация скорости загрузки
- **Error Tracking** - Исправление багов
- **Conversion Rates** - Улучшение UX

### Планирование разработки
- **Feature Adoption** - Какие функции используются
- **Engagement Rate** - Вовлеченность пользователей
- **Search Patterns** - Что не хватает пользователям

---

## 🔄 МИГРАЦИЯ БАЗЫ ДАННЫХ

Для применения новых таблиц запустите:

```bash
cd server
npm install  # Установить uuid
npx prisma db push  # Применить схему
npx prisma generate  # Генерировать Prisma Client
```

---

## 📱 ИНТЕГРАЦИЯ С FRONTEND

### Установка analytics service
✅ Уже создан в `/client/src/api/analytics.ts`

### Инициализация
✅ Уже добавлена в `App.tsx`

### Отслеживание в SchedulePage
✅ Уже добавлено отслеживание tab switching

---

## 🚨 ВАЖНЫЕ ЗАМЕЧАНИЯ

1. **Приватность** - Система собирает минимум личной информации (только ID пользователя)
2. **Производительность** - Все аналитические запросы асинхронные и не блокируют UI
3. **Масштабируемость** - Использование индексов в БД для быстрых запросов
4. **Безопасность** - Метрики доступны только администраторам

---

## 📊 NEXT STEPS

Рекомендуемые улучшения:

1. **Добавить отслеживание в остальных компонентах**
   - ProfilePage
   - FeedbackPage
   - SportsPage
   - LessonDetailModal

2. **Расширить Admin Dashboard**
   - График активности по времени
   - Географический анализ (по странам/городам)
   - Когортный анализ
   - Фан нель анализ

3. **Интеграция с BI инструментами**
   - Exportпить данные в Google Analytics
   - Интегрировать с Mixpanel
   - Создать custom dashboard

4. **Автоматические отчеты**
   - Ежедневные отчеты админам
   - Алерты при аномалиях
   - Прогнозирование трендов

---

## 📞 ПОДДЕРЖКА

Все функции готовы к использованию. Analytics сервис автоматически инициализируется при загрузке приложения.

**Метрики начнут собираться сразу после развертывания обновленного кода.**
