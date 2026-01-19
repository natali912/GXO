/*
  # Создание таблицы пользователей

  1. Новые таблицы
    - `users`
      - `id` (uuid, первичный ключ)
      - `telegram_id` (bigint, уникальный, ID пользователя в Telegram)
      - `username` (text, имя пользователя в Telegram)
      - `first_name` (text, имя пользователя)
      - `last_name` (text, фамилия пользователя)
      - `wins` (integer, количество побед, по умолчанию 0)
      - `losses` (integer, количество поражений, по умолчанию 0)
      - `draws` (integer, количество ничьих, по умолчанию 0)
      - `created_at` (timestamp, время создания)
      - `updated_at` (timestamp, время последнего обновления)

  2. Безопасность
    - Включить RLS для таблицы `users`
    - Добавить политику для чтения собственных данных
    - Добавить политику для обновления собственных данных
*/

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id bigint UNIQUE NOT NULL,
  username text,
  first_name text,
  last_name text,
  wins integer DEFAULT 0,
  losses integer DEFAULT 0,
  draws integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read all user data"
  ON users
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Service role can manage users"
  ON users
  FOR ALL
  TO service_role
  USING (true);

-- Создаем индекс для быстрого поиска по telegram_id
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);