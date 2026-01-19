/*
  # Создание таблицы игр

  1. Новые таблицы
    - `games`
      - `id` (uuid, первичный ключ)
      - `player1_id` (uuid, ссылка на пользователя)
      - `player2_id` (uuid, ссылка на пользователя или null для игры с AI)
      - `game_type` (text, тип игры: 'ai_easy', 'ai_medium', 'ai_hard', 'multiplayer')
      - `board` (jsonb, состояние игрового поля)
      - `current_player` (text, чей ход: 'X' или 'O')
      - `status` (text, статус игры: 'waiting', 'active', 'finished')
      - `winner` (text, победитель: 'X', 'O', 'draw', null)
      - `invite_code` (text, код приглашения для мультиплеера)
      - `created_at` (timestamp, время создания)
      - `updated_at` (timestamp, время последнего обновления)

  2. Безопасность
    - Включить RLS для таблицы `games`
    - Добавить политики для игроков
*/

CREATE TABLE IF NOT EXISTS games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player1_id uuid REFERENCES users(id) ON DELETE CASCADE,
  player2_id uuid REFERENCES users(id) ON DELETE CASCADE,
  game_type text NOT NULL CHECK (game_type IN ('ai_easy', 'ai_medium', 'ai_hard', 'multiplayer')),
  board jsonb DEFAULT '[[null,null,null],[null,null,null],[null,null,null]]'::jsonb,
  current_player text DEFAULT 'X' CHECK (current_player IN ('X', 'O')),
  status text DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'finished')),
  winner text CHECK (winner IN ('X', 'O', 'draw')),
  invite_code text UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players can read their games"
  ON games
  FOR SELECT
  TO authenticated
  USING (
    player1_id IN (SELECT id FROM users WHERE auth.uid() = id) OR
    player2_id IN (SELECT id FROM users WHERE auth.uid() = id)
  );

CREATE POLICY "Players can update their games"
  ON games
  FOR UPDATE
  TO authenticated
  USING (
    player1_id IN (SELECT id FROM users WHERE auth.uid() = id) OR
    player2_id IN (SELECT id FROM users WHERE auth.uid() = id)
  );

CREATE POLICY "Service role can manage games"
  ON games
  FOR ALL
  TO service_role
  USING (true);

-- Создаем индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_games_player1_id ON games(player1_id);
CREATE INDEX IF NOT EXISTS idx_games_player2_id ON games(player2_id);
CREATE INDEX IF NOT EXISTS idx_games_invite_code ON games(invite_code);
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);