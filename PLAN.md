# Антифрод-система посещения физкультуры — IMPERA

## Проблема
Студент платит преподавателю → тот отмечает посещение → обман.
Нужна система, в которой это физически невозможно.

---

## Концепция: Ротирующий код + Хеш-цепочка

### Как это работает (пошагово):

#### Преподаватель начинает занятие:
1. Открывает Mini App → вкладка «Спорт» → кнопка **«Начать занятие»**
2. Выбирает секцию (Баскетбол, Плавание и т.д.)
3. Система создаёт **SportSession** и генерирует **6-значный код**
4. Код **меняется каждые 30 секунд** (показан крупно на экране преподавателя)
5. Преподаватель показывает экран телефона / говорит код вслух

#### Студент отмечается:
1. Открывает Mini App → вкладка «Спорт» → кнопка **«Отметиться»**
2. Вводит текущий 6-значный код
3. Система проверяет: ✅ код верный + ⏰ время не истекло + 🚫 ещё не отмечен
4. Посещение записывается с **криптографическим хешем**

#### Преподаватель завершает занятие:
1. В конце пары нажимает **«Завершить занятие»**
2. Видит список отметившихся студентов
3. Может **убрать** тех, кто ушёл раньше (не был на занятии до конца)
4. Нажимает **«Подтвердить»** → записи становятся `confirmed`

### Почему нельзя обмануть:

| Атака | Защита |
|-------|--------|
| Передать код другу | Код меняется каждые 30 сек — друг не успеет |
| Купить отметку у преподавателя | Преподаватель не может создать запись задним числом — хеш-цепочка сломается |
| Подделать запись в БД | Каждая запись содержит хеш предыдущей — изменение одной ломает всю цепочку |
| Отметиться и уйти | Преподаватель подтверждает список в конце занятия |
| Преподаватель создаёт фейковую сессию | Все сессии логируются с timestamp, можно аудитить |

---

## Новые модели в Prisma

```prisma
// Роль преподавателя физкультуры (связь User ↔ SportSection)
model SportTeacher {
  id        Int          @id @default(autoincrement())
  userId    Int
  user      User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  sectionId Int
  section   SportSection @relation(fields: [sectionId], references: [id], onDelete: Cascade)
  createdAt DateTime     @default(now())

  @@unique([userId, sectionId])
}

// Сессия занятия (преподаватель начинает пару)
model SportSession {
  id          Int       @id @default(autoincrement())
  slotId      Int?
  slot        SportSlot? @relation(fields: [slotId], references: [id])
  sectionId   Int
  section     SportSection @relation(fields: [sectionId], references: [id])
  teacherId   Int
  teacher     User      @relation("SessionTeacher", fields: [teacherId], references: [id])
  status      String    @default("active") // active, completed, cancelled
  secretSeed  String    // Random seed для генерации кодов
  startedAt   DateTime  @default(now())
  endedAt     DateTime?
  attendances SportAttendance[]

  @@index([status, startedAt])
}

// Посещение студента (с хеш-цепочкой)
model SportAttendance {
  id          Int       @id @default(autoincrement())
  sessionId   Int
  session     SportSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  studentId   Int
  student     User      @relation("AttendanceStudent", fields: [studentId], references: [id])
  status      String    @default("pending") // pending → confirmed / rejected
  checkedInAt DateTime  @default(now())
  confirmedAt DateTime?
  hash        String    // SHA256(studentId + sessionId + timestamp + prevHash)
  prevHash    String?   // Хеш предыдущей записи этого студента (цепочка)

  @@unique([sessionId, studentId])
  @@index([studentId, checkedInAt])
}
```

---

## API Endpoints

### Для преподавателя:
- `POST /api/sports/sessions/start` — начать занятие (создать сессию)
- `GET /api/sports/sessions/:id` — текущая сессия (код, список студентов)
- `GET /api/sports/sessions/:id/code` — текущий 6-значный код (ротация)
- `POST /api/sports/sessions/:id/end` — завершить занятие
- `POST /api/sports/sessions/:id/confirm` — подтвердить список (bulk)
- `POST /api/sports/sessions/:id/reject/:studentId` — убрать студента

### Для студента:
- `POST /api/sports/checkin` — отметиться по коду { code: "123456" }
- `GET /api/sports/my-attendance` — мои посещения + прогресс (X/25)
- `GET /api/sports/my-progress` — краткая статистика

### Для админа:
- `GET /api/sports/admin/attendance?student=Иванов` — поиск по студенту
- `GET /api/sports/admin/sessions` — все сессии (история)
- `GET /api/sports/admin/integrity/:studentId` — проверка хеш-цепочки
- `GET /api/sports/admin/stats` — статистика посещений
- `POST /api/sports/admin/teachers` — назначить преподавателя

---

## Генерация ротирующего кода

```typescript
// Код меняется каждые 30 секунд
function generateCode(secretSeed: string, timestamp: number): string {
  const period = Math.floor(timestamp / 30000); // 30-sec window
  const hmac = crypto.createHmac('sha256', secretSeed)
    .update(String(period))
    .digest('hex');
  // Берём 6 цифр из хеша
  const num = parseInt(hmac.substring(0, 8), 16) % 1000000;
  return num.toString().padStart(6, '0');
}

// Проверка: принимаем текущий код ИЛИ предыдущий (на случай задержки)
function verifyCode(secretSeed: string, code: string): boolean {
  const now = Date.now();
  return code === generateCode(secretSeed, now)
      || code === generateCode(secretSeed, now - 30000);
}
```

---

## Хеш-цепочка (tamper-proof)

```typescript
function computeAttendanceHash(
  studentId: number,
  sessionId: number,
  timestamp: string,
  prevHash: string | null
): string {
  const data = `${studentId}:${sessionId}:${timestamp}:${prevHash || 'GENESIS'}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

// Проверка целостности цепочки студента
async function verifyChain(studentId: number): Promise<{valid: boolean, brokenAt?: number}> {
  const records = await prisma.sportAttendance.findMany({
    where: { studentId },
    orderBy: { checkedInAt: 'asc' },
  });

  let prevHash: string | null = null;
  for (const record of records) {
    const expected = computeAttendanceHash(
      record.studentId, record.sessionId,
      record.checkedInAt.toISOString(), prevHash
    );
    if (expected !== record.hash) {
      return { valid: false, brokenAt: record.id };
    }
    prevHash = record.hash;
  }
  return { valid: true };
}
```

---

## Фронтенд — компоненты

### Студент:
1. **Прогресс-бар** вверху страницы: `12/25 занятий • 48%`
2. **Кнопка «Отметиться»** → модалка с вводом 6-значного кода
3. **История посещений**: список карточек (дата, секция, преподаватель, статус)
4. **Статус записи**: 🟡 pending / ✅ confirmed / ❌ rejected

### Преподаватель:
1. **Кнопка «Начать занятие»** → выбор секции → экран с крупным кодом
2. **Код меняется** каждые 30 сек (countdown timer)
3. **Список студентов** в реальном времени (кто отметился)
4. **«Завершить»** → чеклист для подтверждения/удаления

### Админ:
1. **Поиск** по имени студента
2. **Карточка студента**: прогресс, цепочка посещений
3. **Кнопка «Проверить целостность»** — валидация хеш-цепочки
4. **Управление преподавателями**: назначить user как SportTeacher

---

## Роли пользователей

| Роль | Как назначается | Что может |
|------|----------------|-----------|
| student | По умолчанию | Отмечаться, видеть прогресс |
| sport_teacher | Админ назначает | Начинать/завершать занятия |
| admin | Фиксированный ID | Всё + аудит + назначение преподавателей |

**Важно:** `sport_teacher` — это НЕ отдельная роль в User.role, а связь через SportTeacher. Один юзер может быть и студентом, и спорт-преподавателем.

---

## Порядок реализации

### Этап 1 — Модели и API:
1. Добавить SportTeacher, SportSession, SportAttendance в schema.prisma
2. Обновить User relations
3. Создать server/src/routes/sports-attendance.ts
4. Реализовать генерацию/верификацию кодов
5. Реализовать хеш-цепочку

### Этап 2 — UI студента:
1. Прогресс-бар (25 занятий)
2. Кнопка «Отметиться» + модалка ввода кода
3. История посещений

### Этап 3 — UI преподавателя:
1. Кнопка «Начать занятие»
2. Экран с ротирующим кодом
3. Список студентов + подтверждение

### Этап 4 — Админ-панель:
1. Поиск студентов
2. Проверка целостности
3. Управление преподавателями
4. Статистика
