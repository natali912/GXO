/*
  # Создание функций для работы с базой данных

  1. Функции
    - `update_user_stats` - обновление статистики пользователя
    - `get_leaderboard` - получение таблицы лидеров
    - `cleanup_expired_invitations` - очистка истекших приглашений
    - `generate_invite_code` - генерация уникального кода приглашения

  2. Триггеры
    - Автоматическое обновление `updated_at`
*/

-- Функция для обновления статистики пользователя
CREATE OR REPLACE FUNCTION update_user_stats(
  user_telegram_id bigint,
  result text
) RETURNS void AS $$
BEGIN
  IF result = 'win' THEN
    UPDATE users 
    SET wins = wins + 1, updated_at = now()
    WHERE telegram_id = user_telegram_id;
  ELSIF result = 'loss' THEN
    UPDATE users 
    SET losses = losses + 1, updated_at = now()
    WHERE telegram_id = user_telegram_id;
  ELSIF result = 'draw' THEN
    UPDATE users 
    SET draws = draws + 1, updated_at = now()
    WHERE telegram_id = user_telegram_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция для получения таблицы лидеров
CREATE OR REPLACE FUNCTION get_leaderboard(limit_count integer DEFAULT 10)
RETURNS TABLE (
  telegram_id bigint,
  username text,
  first_name text,
  wins integer,
  losses integer,
  draws integer,
  total_games integer,
  win_rate numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.telegram_id,
    u.username,
    u.first_name,
    u.wins,
    u.losses,
    u.draws,
    (u.wins + u.losses + u.draws) as total_games,
    CASE 
      WHEN (u.wins + u.losses + u.draws) > 0 
      THEN ROUND((u.wins::numeric / (u.wins + u.losses + u.draws)::numeric) * 100, 2)
      ELSE 0
    END as win_rate
  FROM users u
  WHERE (u.wins + u.losses + u.draws) > 0
  ORDER BY u.wins DESC, win_rate DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция для очистки истекших приглашений
CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS void AS $$
BEGIN
  UPDATE invitations 
  SET status = 'expired'
  WHERE status = 'pending' AND expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция для генерации уникального кода приглашения
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS text AS $$
DECLARE
  code text;
  exists_check boolean;
BEGIN
  LOOP
    -- Генерируем 6-значный код из цифр и букв
    code := upper(substring(md5(random()::text) from 1 for 6));
    
    -- Проверяем, не существует ли уже такой код
    SELECT EXISTS(SELECT 1 FROM invitations WHERE invite_code = code AND status = 'pending') INTO exists_check;
    
    -- Если код уникален, выходим из цикла
    IF NOT exists_check THEN
      EXIT;
    END IF;
  END LOOP;
  
  RETURN code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Создаем триггеры для автоматического обновления updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_games_updated_at
  BEFORE UPDATE ON games
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();