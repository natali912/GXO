/*
  # Создание таблицы ходов в игре

  1. Новые таблицы
    - `game_moves`
      - `id` (uuid, первичный ключ)
      - `game_id` (uuid, ссылка на игру)
      - `player_id` (uuid, ссылка на игрока)
      - `move_number` (integer, номер хода)
      - `row` (integer, строка на поле 0-2)
      - `col` (integer, столбец на поле 0-2)
      - `symbol` (text, символ: 'X' или 'O')
      - `created_at` (timestamp, время хода)

  2. Безопасность
    - Включить RLS для таблицы `game_moves`
    - Добавить политики для игроков
*/

CREATE TABLE IF NOT EXISTS game_moves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid REFERENCES games(id) ON DELETE CASCADE NOT NULL,
  player_id uuid REFERENCES users(id) ON DELETE CASCADE,
  move_number integer NOT NULL,
  row integer NOT NULL CHECK (row >= 0 AND row <= 2),
  col integer NOT NULL CHECK (col >= 0 AND col <= 2),
  symbol text NOT NULL CHECK (symbol IN ('X', 'O')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE game_moves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players can read moves from their games"
  ON game_moves
  FOR SELECT
  TO authenticated
  USING (
    game_id IN (
      SELECT id FROM games 
      WHERE player1_id IN (SELECT id FROM users WHERE auth.uid() = id) OR
            player2_id IN (SELECT id FROM users WHERE auth.uid() = id)
    )
  );

CREATE POLICY "Players can insert moves in their games"
  ON game_moves
  FOR INSERT
  TO authenticated
  WITH CHECK (
    game_id IN (
      SELECT id FROM games 
      WHERE player1_id IN (SELECT id FROM users WHERE auth.uid() = id) OR
            player2_id IN (SELECT id FROM users WHERE auth.uid() = id)
    )
  );

CREATE POLICY "Service role can manage game moves"
  ON game_moves
  FOR ALL
  TO service_role
  USING (true);

-- Создаем индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_game_moves_game_id ON game_moves(game_id);
CREATE INDEX IF NOT EXISTS idx_game_moves_player_id ON game_moves(player_id);
CREATE INDEX IF NOT EXISTS idx_game_moves_move_number ON game_moves(game_id, move_number);