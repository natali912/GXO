/*
  # Создание таблицы приглашений

  1. Новые таблицы
    - `invitations`
      - `id` (uuid, первичный ключ)
      - `inviter_id` (uuid, ссылка на пригласившего)
      - `invitee_telegram_id` (bigint, Telegram ID приглашенного)
      - `invite_code` (text, уникальный код приглашения)
      - `game_id` (uuid, ссылка на игру)
      - `status` (text, статус: 'pending', 'accepted', 'expired')
      - `expires_at` (timestamp, время истечения)
      - `created_at` (timestamp, время создания)

  2. Безопасность
    - Включить RLS для таблицы `invitations`
    - Добавить политики для пользователей
*/

CREATE TABLE IF NOT EXISTS invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  invitee_telegram_id bigint,
  invite_code text UNIQUE NOT NULL,
  game_id uuid REFERENCES games(id) ON DELETE CASCADE,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  expires_at timestamptz DEFAULT (now() + interval '1 hour'),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their invitations"
  ON invitations
  FOR SELECT
  TO authenticated
  USING (
    inviter_id IN (SELECT id FROM users WHERE auth.uid() = id) OR
    invitee_telegram_id IN (SELECT telegram_id FROM users WHERE auth.uid() = id)
  );

CREATE POLICY "Users can create invitations"
  ON invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    inviter_id IN (SELECT id FROM users WHERE auth.uid() = id)
  );

CREATE POLICY "Users can update their invitations"
  ON invitations
  FOR UPDATE
  TO authenticated
  USING (
    inviter_id IN (SELECT id FROM users WHERE auth.uid() = id) OR
    invitee_telegram_id IN (SELECT telegram_id FROM users WHERE auth.uid() = id)
  );

CREATE POLICY "Service role can manage invitations"
  ON invitations
  FOR ALL
  TO service_role
  USING (true);

-- Создаем индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_invitations_inviter_id ON invitations(inviter_id);
CREATE INDEX IF NOT EXISTS idx_invitations_invite_code ON invitations(invite_code);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status);
CREATE INDEX IF NOT EXISTS idx_invitations_expires_at ON invitations(expires_at);