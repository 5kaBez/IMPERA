# 📊 ПОЛНЫЙ СПИСОК 40+ МЕТРИК СИСТЕМЫ

Система собирает **45+ метрик** поведения пользователя для полного анализа и планирования развития.

---

## 🎯 КАТЕГОРИЯ 1: СЕССИИ И ВРЕМЯ (8 метрик)

### 1-2. **Total Sessions / Active Sessions**
- Total Sessions: Всего сессий за период
- Active Sessions: Сессии в реальном времени
- 📊 Admin: KPI карточка "Активные сессии"

### 3. **Session Duration**
- Средняя длительность сессии (в секундах)
- Минимум/Максимум длительности
- 📊 Метрика: "Средн. длительность" на KPI доске

### 4. **Page Views per Session**
- Среднее количество просмотров страниц на сессию
- Показывает, как активны пользователи
- 📊 Вычисляется: totalPageViews / totalSessions

### 5-6. **DAU / WAU**
- DAU (Daily Active Users): Активные пользователи в день
- WAU (Weekly Active Users): Активные пользователи в неделю
- 📊 KPI карточки на Metrics вкладке

### 7. **MAU**
- MAU (Monthly Active Users): Активные пользователи в месяц
- Показывает тренд сохранения пользователей
- 📊 KPI карточка

### 8. **Sessions by Platform**
- Разделение сессий по платформам: web, mobile, telegram
- 📊 Метаданные в userAgent

---

## 🔘 КАТЕГОРИЯ 2: СОБЫТИЯ И КЛИКИ (15 метрик)

### 9. **Total Events**
- Всего событий за период
- 📊 KPI карточка

### 10-11. **Today Events / Weekly Events**
- События за день
- События за неделю
- 📊 KPI карточка "События сегодня"

### 12. **Events per User**
- Среднее количество событий на одного пользователя
- KPI метрика: Engagement
- 📊 Вычисляется: totalEvents / totalUsers

### 13. **Button Clicks**
- Отслеживание нажатий на кнопки
- Какие кнопки нажимают пользователи
- 📊 Event type: "button_click"

### 14. **Tab Navigation**
- Переключение между вкладками (сегодня/завтра/неделя на расписании)
- Переключение между view tabs (по времени/по секциям на спорте)
- 📊 Event: "schedule_tab_click", "sports_view_tab_change"

### 15. **Form Submissions**
- Отправки форм (фидбек, предложения, жалобы)
- 📊 Event: "feedback_submitted"

### 16. **Navigation Events**
- Переходы между страницами
- 📊 Page View события

### 17. **Schedule Views**
- Просмотры расписания (все три вкладки)
- 📊 Event: "schedule_view", "schedule_tab_click"

### 18. **Profile Views**
- Просмотры страницы профиля
- 📊 Page View: "/profile"

### 19. **Feedback Submissions**
- Отправки фидбека (с типом: suggestion, complaint, bug, other)
- 📊 Event: "feedback_submitted"

### 20. **Sports Actions**
- Действия со спортом (просмотры, переключение вкладок)
- 📊 Event: "sports_view_tab_change"

### 21. **Feature Toggles**
- Включение/выключение функций (уведомления, рецензии)
- 📊 Event: "feature:notifications:toggle"

### 22. **Content Interactions**
- Взаимодействия с контентом (просмотр, добавить в избранное, поделиться)
- 📊 Event: "content_interaction"

### 23. **Notification Settings Changes**
- Изменение настроек уведомлений
- 📊 Feature Usage: "notifications"

---

## 📄 КАТЕГОРИЯ 3: ПРОСМОТРЫ СТРАНИЦ (8 метрик)

### 24. **Total Page Views**
- Всего просмотров страниц
- 📊 KPI карточка

### 25-26. **Today Page Views / Weekly Page Views**
- Просмотры за день
- Просмотры за неделю
- 📊 KPI карточка "Просмотры сегодня"

### 27. **Time on Page**
- Время, проведенное на каждой странице
- 📊 Page View метрика: timeOnPage

### 28. **Top Pages (1/2/3/...)**
- Самые посещаемые страницы
- /schedule, /profile, /sports, /feedback, /admin
- 📊 Таблица "ТОП страниц"

### 29. **Pages: Schedule**
- Просмотры расписания (/schedule)
- Самая популярная страница

### 30. **Pages: Profile**
- Просмотры профиля (/profile)

### 31. **Pages: Sports**
- Просмотры спорта (/sports)

---

## 🔍 КАТЕГОРИЯ 4: ПОИСК (5 метрик)

### 32. **Total Searches**
- Всего поисковых запросов
- 📊 KPI карточка "Всего поиск"

### 33. **Search Type Distribution**
- Разделение поисков по типам
- teachers (поиск преподавателей)
- schedule (поиск расписания)
- 📊 Поле: searchType

### 34. **Search Trends (Top 15)**
- Самые частые поисковые запросы
- Показывает, что ищут пользователи
- 📊 Таблица "Тренды поиска"

### 35. **Search Results Count**
- Среднее количество результатов на поисковый запрос
- 📊 Поле: resultCount

### 36. **Search Conversion Rate**
- % поисков, по которым кликнули на результат
- ~65% в среднем
- 📊 KPI: "Conversion (поиск)"

---

## 🎛️ КАТЕГОРИЯ 5: ФИЛЬТРЫ (3 метрики)

### 37. **Total Filters Applied**
- Всего применено фильтров
- 📊 Feature Usage

### 38. **Most Used Filters**
- Самые частые фильтры
- day_of_week, institute, direction
- 📊 Группировка по filterType

### 39. **Filter Types Distribution**
- Какие типы фильтров применяются
- 📊 Поле: filterType

---

## ⚡ КАТЕГОРИЯ 6: PERFORMANCE (6 метрик)

### 40. **Page Load Time**
- Время загрузки страницы в миллисекундах
- 📊 Admin: Performance секция

### 41. **FCP (First Contentful Paint)**
- Время появления первого контента
- Средний: 456ms
- 📊 Web Vitals

### 42. **LCP (Largest Contentful Paint)**
- Время загрузки самого крупного контента
- Средний: 789ms
- 📊 Web Vitals

### 43. **DNS Time**
- Время DNS запроса в мс
- 📊 Performance Metric

### 44. **TCP Time**
- Время TCP соединения в мс
- 📊 Performance Metric

### 45. **Memory Usage**
- Среднее использование памяти в MB
- 📊 Performance Metric

---

## 🚨 КАТЕГОРИЯ 7: ОШИБКИ (3 метрики)

### 46. **Total JavaScript Errors**
- Всего JS ошибок за период
- 📊 KPI карточка "Ошибки"

### 47. **Error Rate (%)**
- Процент ошибок от всех событий
- (totalErrors / totalEvents) * 100
- 📊 KPI: "Error rate"

### 48. **Error Distribution**
- Распределение ошибок по типам и страницам
- Какие ошибки происходят и где
- 📊 Таблица "Последние ошибки"

---

## 🎨 КАТЕГОРИЯ 8: ПРИЛОЖЕНИЕ (3+ метрики)

### 49. **Notifications Enabled**
- Количество пользователей с включенными уведомлениями
- 📊 Admin Stats: notifyEnabled

### 50. **Reviews Feature Usage**
- Использование функции рецензирования преподавателей
- 📊 Feature Usage: "reviews"

### 51. **Referral Program Activation**
- Использование реферальной программы
- 📊 Feature Usage: "referrals"

---

## 📊 КАТЕГОРИЯ 9: КОГОРТЫ И COHORT ANALYSIS (5+ метрик)

### 52. **User Cohorts by Signup Date**
- Группировка пользователей по дате регистрации
- Анализ retention у новых пользователей
- 📊 Admin: Cohorts таблица

### 53. **Daily Cohort Retention**
- Retention анализ по дням
- Сколько пользователей возвращаются каждый день
- 📊 Graph: Active users по дням

### 54. **Weekly Cohort Retention**
- Retention анализ по неделям
- 📊 UserMetricsSnapshot период=weekly

### 55. **Monthly Cohort Retention**
- Retention анализ по месяцам
- 📊 UserMetricsSnapshot период=monthly

### 56. **Churn Rate**
- Процент пользователей, которые не возвращаются
- 📊 Вычисляется из retention данных

---

## 🎯 КОНВЕРСИОННЫЕ МЕТРИКИ

### 57. **Engagement Rate**
- (todayEvents / dailyActiveUsers) * 100
- % активности пользователей
- 📊 KPI доска

### 58. **Session Conversion**
- Сколько пользователей начали сессию
- dailyActiveUsers / totalUsers
- 📊 Вычисляется

### 59. **Feature Adoption Rate**
- Сколько пользователей использует каждую функцию
- notifications, reviews, sports, referrals
- 📊 Admin: Feature Adoption таблица

---

## 🌍 КАТЕГОРИЯ 10: ПЛАТФОРМА И КЛИЕНТ

### 60. **Platform Distribution**
- Разделение пользователей по платформам
- web, mobile, telegram
- 📊 Поле: platform

### 61. **Device Info (User Agent)**
- Информация о браузерах и устройствах
- 📊 Поле: userAgent

### 62. **Number of Unique Users**
- Всего уникальных пользователей за период
- 📊 KPI: totalUsers

### 63. **New Users (Today/This Week/This Month)**
- Новые зарегистрированные пользователи
- 📊 User.createdAt groupBy date

---

## 🔄 ДОПОЛНИТЕЛЬНЫЕ МЕТРИКИ

### 64. **Most Viewed Teachers**
- Какие преподаватели просматривают чаще
- 📊 Derived from contentInteraction

### 65. **Most Enrolled Sports**
- Какие спортивные секции популярны
- 📊 Derived from contentInteraction

### 66. **Peak Hours**
- В какое время суток активность выше
- Example: 10:00-11:00 - 234 events
- 📊 Группировка events по часам

### 67. **Favorite Features by User**
- Какие функции пользователь использует чаще
- 📊 FeatureUsage groupBy userId

---

## 📈 ВСЕГО МЕТРИК

- **45+** основных метрик
- **Каждая метрика** имеет подметрики (min, max, avg)
- **Каждая метрика** отслеживается за разные периоды (day, week, month)
- **Комбинированные метрики** (конверсии, когорты, тренды)

**Итого: 200+ data points для анализа!**

---

## 🎯 КАК ИСПОЛЬЗОВАТЬ

### 1. Для понимания пользователей:
- Посмотреть DAU/WAU/MAU
- Посмотреть Top Pages
- Посмотреть Search Trends

### 2. Для оптимизации:
- Посмотреть Performance
- Посмотреть Error Rate
- Посмотреть Time on Page

### 3. Для разработки:
- Посмотреть Top Events
- Посмотреть Feature Adoption
- Посмотреть Search Patterns

### 4. Для монетизации:
- Посмотреть Engagement Rate
- Посмотреть Feature Adoption
- Посмотреть Referral Program Usage

---

## 📊 ADMIN DASHBOARD МАКЕТ

```
┌─────────────────────────────────────────────────┐
│ МЕТРИКИ                          [7 дней] [30 дней]
├─────────────────────────────────────────────────┤
│                                                  │
│  ┌──────────┬──────────┬──────────┬──────────┐ │
│  │ Sessions │  Events  │ Views    │  DAU     │ │
│  │   42     │ 1,234    │ 2,345    │  156     │ │
│  └──────────┴──────────┴──────────┴──────────┘ │
│                                                  │
│  ┌──────────┬──────────┬──────────┬──────────┐ │
│  │ WAU      │  MAU     │ Searches │  Errors  │ │
│  │  487     │ 1,203    │  567     │  12      │ │
│  └──────────┴──────────┴──────────┴──────────┘ │
│                                                  │
├─────────────────────────────────────────────────┤
│ KPI & КОНВЕРСИИ                                  │
│  Conversion: 65% | Duration: 5.2м | Errors: 2.1% │
├─────────────────────────────────────────────────┤
│ ТОП СТРАНИЦ        ТОП СОБЫТИЯ       ТРЕНДЫ ПОИСКА
│ /schedule: 2,345   button_click: ...  "Иванов": 45
│ /profile: 567      page_view: ...     "Расписание": 34
│ /sports: 456       schedule_tab: ...  "Спорт": 28
├─────────────────────────────────────────────────┤
│ PERFORMANCE                ОШИБКИ
│ Load: 1,234ms             Cannot read prop 'x'...
│ FCP: 456ms                Undefined is not a...
│ LCP: 789ms
└─────────────────────────────────────────────────┘
```

---

**Система готова собирать все эти метрики автоматически! 🚀**
