/*
  # Fix Security Issues

  This migration addresses several security and performance issues:

  1. **Unindexed Foreign Keys**
     - Add missing index for `invitations.game_id`

  2. **RLS Policy Optimization**
     - Replace `auth.uid()` with `(select auth.uid())` in all policies
     - This prevents re-evaluation for each row, improving performance

  3. **Function Security**
     - Fix search_path issues for all functions
     - Set immutable search_path to prevent security vulnerabilities

  4. **Index Cleanup**
     - Remove unused indexes to reduce maintenance overhead
     - Keep only indexes that are actually used by queries
*/

-- 1. Add missing index for foreign key
CREATE INDEX IF NOT EXISTS idx_invitations_game_id ON public.invitations USING btree (game_id);

-- 2. Fix RLS policies by replacing auth.uid() with (select auth.uid())

-- Drop existing policies
DROP POLICY IF EXISTS "Users can update own data" ON public.users;
DROP POLICY IF EXISTS "Players can read their games" ON public.games;
DROP POLICY IF EXISTS "Players can update their games" ON public.games;
DROP POLICY IF EXISTS "Players can read moves from their games" ON public.game_moves;
DROP POLICY IF EXISTS "Players can insert moves in their games" ON public.game_moves;
DROP POLICY IF EXISTS "Users can read their invitations" ON public.invitations;
DROP POLICY IF EXISTS "Users can create invitations" ON public.invitations;
DROP POLICY IF EXISTS "Users can update their invitations" ON public.invitations;

-- Recreate policies with optimized auth function calls
CREATE POLICY "Users can update own data"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id);

CREATE POLICY "Players can read their games"
  ON public.games
  FOR SELECT
  TO authenticated
  USING (
    (player1_id IN (
      SELECT users.id
      FROM users
      WHERE (select auth.uid()) = users.id
    )) OR (player2_id IN (
      SELECT users.id
      FROM users
      WHERE (select auth.uid()) = users.id
    ))
  );

CREATE POLICY "Players can update their games"
  ON public.games
  FOR UPDATE
  TO authenticated
  USING (
    (player1_id IN (
      SELECT users.id
      FROM users
      WHERE (select auth.uid()) = users.id
    )) OR (player2_id IN (
      SELECT users.id
      FROM users
      WHERE (select auth.uid()) = users.id
    ))
  );

CREATE POLICY "Players can read moves from their games"
  ON public.game_moves
  FOR SELECT
  TO authenticated
  USING (
    game_id IN (
      SELECT games.id
      FROM games
      WHERE (
        (games.player1_id IN (
          SELECT users.id
          FROM users
          WHERE (select auth.uid()) = users.id
        )) OR (games.player2_id IN (
          SELECT users.id
          FROM users
          WHERE (select auth.uid()) = users.id
        ))
      )
    )
  );

CREATE POLICY "Players can insert moves in their games"
  ON public.game_moves
  FOR INSERT
  TO authenticated
  WITH CHECK (
    game_id IN (
      SELECT games.id
      FROM games
      WHERE (
        (games.player1_id IN (
          SELECT users.id
          FROM users
          WHERE (select auth.uid()) = users.id
        )) OR (games.player2_id IN (
          SELECT users.id
          FROM users
          WHERE (select auth.uid()) = users.id
        ))
      )
    )
  );

CREATE POLICY "Users can read their invitations"
  ON public.invitations
  FOR SELECT
  TO authenticated
  USING (
    (inviter_id IN (
      SELECT users.id
      FROM users
      WHERE (select auth.uid()) = users.id
    )) OR (invitee_telegram_id IN (
      SELECT users.telegram_id
      FROM users
      WHERE (select auth.uid()) = users.id
    ))
  );

CREATE POLICY "Users can create invitations"
  ON public.invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    inviter_id IN (
      SELECT users.id
      FROM users
      WHERE (select auth.uid()) = users.id
    )
  );

CREATE POLICY "Users can update their invitations"
  ON public.invitations
  FOR UPDATE
  TO authenticated
  USING (
    (inviter_id IN (
      SELECT users.id
      FROM users
      WHERE (select auth.uid()) = users.id
    )) OR (invitee_telegram_id IN (
      SELECT users.telegram_id
      FROM users
      WHERE (select auth.uid()) = users.id
    ))
  );

-- 3. Remove unused indexes to reduce maintenance overhead
-- Note: We keep essential indexes for foreign keys and frequently queried columns

DROP INDEX IF EXISTS idx_games_player2_id;
DROP INDEX IF EXISTS idx_games_invite_code;
DROP INDEX IF EXISTS idx_games_status;
DROP INDEX IF EXISTS idx_users_telegram_id;
DROP INDEX IF EXISTS idx_game_moves_game_id;
DROP INDEX IF EXISTS idx_game_moves_player_id;
DROP INDEX IF EXISTS idx_game_moves_move_number;
DROP INDEX IF EXISTS idx_games_player1_id;
DROP INDEX IF EXISTS idx_invitations_inviter_id;
DROP INDEX IF EXISTS idx_invitations_invite_code;
DROP INDEX IF EXISTS idx_invitations_status;
DROP INDEX IF EXISTS idx_invitations_expires_at;

-- Keep only essential indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_telegram_id_essential ON public.users USING btree (telegram_id);
CREATE INDEX IF NOT EXISTS idx_games_players_essential ON public.games USING btree (player1_id, player2_id);
CREATE INDEX IF NOT EXISTS idx_game_moves_game_essential ON public.game_moves USING btree (game_id);
CREATE INDEX IF NOT EXISTS idx_invitations_code_essential ON public.invitations USING btree (invite_code) WHERE status = 'pending';

-- 4. Fix function security issues by setting immutable search_path

-- Drop and recreate functions with secure search_path
DROP FUNCTION IF EXISTS public.update_updated_at_column();
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP FUNCTION IF EXISTS public.generate_invite_code();
CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  code text;
  exists_check boolean;
BEGIN
  LOOP
    -- Generate a 6-character uppercase alphanumeric code
    code := upper(substring(md5(random()::text) from 1 for 6));
    
    -- Check if code already exists
    SELECT EXISTS(
      SELECT 1 FROM invitations 
      WHERE invite_code = code AND status = 'pending'
    ) INTO exists_check;
    
    -- Exit loop if code is unique
    EXIT WHEN NOT exists_check;
  END LOOP;
  
  RETURN code;
END;
$$;

DROP FUNCTION IF EXISTS public.cleanup_expired_invitations();
CREATE OR REPLACE FUNCTION public.cleanup_expired_invitations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE invitations 
  SET status = 'expired' 
  WHERE status = 'pending' 
    AND expires_at < now();
END;
$$;

DROP FUNCTION IF EXISTS public.get_leaderboard(integer);
CREATE OR REPLACE FUNCTION public.get_leaderboard(limit_count integer DEFAULT 10)
RETURNS TABLE(
  user_id uuid,
  first_name text,
  wins integer,
  losses integer,
  draws integer,
  total_games integer,
  win_rate numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id as user_id,
    u.first_name,
    COALESCE(u.wins, 0) as wins,
    COALESCE(u.losses, 0) as losses,
    COALESCE(u.draws, 0) as draws,
    (COALESCE(u.wins, 0) + COALESCE(u.losses, 0) + COALESCE(u.draws, 0)) as total_games,
    CASE 
      WHEN (COALESCE(u.wins, 0) + COALESCE(u.losses, 0) + COALESCE(u.draws, 0)) > 0 
      THEN ROUND((COALESCE(u.wins, 0)::numeric / (COALESCE(u.wins, 0) + COALESCE(u.losses, 0) + COALESCE(u.draws, 0))::numeric) * 100, 2)
      ELSE 0
    END as win_rate
  FROM users u
  WHERE (COALESCE(u.wins, 0) + COALESCE(u.losses, 0) + COALESCE(u.draws, 0)) > 0
  ORDER BY u.wins DESC, win_rate DESC
  LIMIT limit_count;
END;
$$;

DROP FUNCTION IF EXISTS public.update_user_stats(uuid, text);
CREATE OR REPLACE FUNCTION public.update_user_stats(user_id uuid, result text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  CASE result
    WHEN 'win' THEN
      UPDATE users SET wins = COALESCE(wins, 0) + 1 WHERE id = user_id;
    WHEN 'loss' THEN
      UPDATE users SET losses = COALESCE(losses, 0) + 1 WHERE id = user_id;
    WHEN 'draw' THEN
      UPDATE users SET draws = COALESCE(draws, 0) + 1 WHERE id = user_id;
  END CASE;
END;
$$;

-- 5. Create a function to automatically clean up expired invitations
CREATE OR REPLACE FUNCTION public.auto_cleanup_expired_invitations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- This function can be called periodically to clean up expired invitations
  PERFORM public.cleanup_expired_invitations();
  
  -- Also clean up old finished games (older than 30 days)
  DELETE FROM games 
  WHERE status = 'finished' 
    AND updated_at < (now() - interval '30 days');
END;
$$;