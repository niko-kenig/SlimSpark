## Админ-панель на Supabase Dashboard и Hasura Console

Ниже — практический рецепт, как организовать управление пользователями и данными после релиза без написания отдельной панели. Основная идея: использовать Supabase Dashboard как базовый UI и подключить Hasura Console, если нужен графовый слой с продвинутыми разрешениями.

### 1. Создайте проект Supabase
1. Перейдите на [https://app.supabase.com](https://app.supabase.com) и создайте проект.
2. Сохраните `Project URL` и `anon/public API key` — их нужно положить в `.env` (пример в корне: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`).
3. В разделе **Auth → Providers** включите Email/Password.
4. Храните `service_role` / secret key только на сервере (функции, Hasura Actions, Edge Functions). Никогда не добавляйте его в клиентское приложение — он даёт полный доступ к БД.

### 2. Таблица пользователей
1. В **Database → Table editor** создайте таблицу `profiles`:
   - `id uuid primary key default uuid_generate_v4()`
   - `user_id uuid references auth.users`
   - `username text unique`
   - `role text default 'user'`
   - `created_at timestamptz default now()`
2. Включите RLS (Row Level Security) и добавьте две политики:
   - Пользователь может читать/обновлять только свою запись (`auth.uid() = user_id`).
   - Пользователь с ролью `admin` может выполнять любые операции (`current_setting('request.jwt.claims', true)::json->>'role' = 'admin'`).

### 3. Используйте Dashboard как админку
- Раздел **Auth → Users**: создание, блокировка, смена пароля.
- Раздел **Table editor**: CRUD по таблицам (`profiles`, `weights`, `workouts`, и т.д.).
- Раздел **Storage**: управление медиа-файлами, ограничение доступа по подпискам.

### 4. Подключение Hasura Console (опционально)
1. Разверните Hasura (Docker или Hasura Cloud) и подключите Postgres URI из Supabase (`Project Settings → Database → Connection string`).
2. В Hasura Console включите `JWT` аутентификацию и укажите `https://<project>.supabase.co/auth/v1/jwks` как источник ключей.
3. Создайте GraphQL разрешения: роль `admin` получает полный доступ, роль `user` — только к своим данным (используйте `X-Hasura-User-Id` и `X-Hasura-Role`).
4. Для сотрудников создайте Hasura Console accounts или подключите Google SSO. Внутри Hasура Console появится полноценный UI для создания/редактирования записей.

### 5. Практика управления пользователями
- **Добавление новых пользователей**: в Supabase Dashboard → Auth → Add user (назначьте временный пароль и роль `admin`/`user` через `profiles`).
- **Импорт из Firebase**: экспортируйте пользователей из Firebase Authentication (JSON) и импортируйте в Supabase через CLI `supabase auth import`.
- **Логирование действий**: создайте таблицу `audit_logs` и включите [Supabase Triggers](https://supabase.com/docs/guides/database/functions#database-functions) для отслеживания CRUD.

### 6. CI/CD и миграции
- Используйте `supabase db diff` для генерации миграций и храните их в `supabase/migrations`.
- При подключении Hasura — держите `metadata` в git (команда `hasura metadata export`).

После выполнения шагов администраторы смогут управлять пользователями прямо в Supabase Dashboard. Если потребуется более гибкая панель (например, с кастомным UI), данные уже находятся в Postgres, и можно поверх них строить Hasura Actions/GraphQL или любое React-приложение, используя тот же Supabase ключ, который уже потребляет мобильное приложение.

