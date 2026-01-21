/*
  # Fix Remaining Security Issues

  1. Unindexed Foreign Keys
    - Add index for `game_moves_player_id_fkey`
    - Add index for `games_player2_id_fkey` 
    - Add index for `invitations_inviter_id_fkey`

  2. Remove Unused Indexes
    - Drop unused indexes that are consuming resources
    - Keep only indexes that are actually used by queries

  3. Function Security
    - Fix `update_user_stats` function search_path issue
*/

-- Add missing indexes for foreign keys
CREATE INDEX IF NOT EXISTS idx_game_moves_player_id ON public.game_moves USING btree (player_id);
CREATE INDEX IF NOT EXISTS idx_games_player2_id ON public.games USING btree (player2_id);
CREATE INDEX IF NOT EXISTS idx_invitations_inviter_id ON public.invitations USING btree (inviter_id);

-- Drop unused indexes to reduce storage overhead and improve write performance
DROP INDEX IF EXISTS idx_invitations_game_id;
DROP INDEX IF EXISTS idx_users_telegram_id_essential;
DROP INDEX IF EXISTS idx_games_players_essential;
DROP INDEX IF EXISTS idx_game_moves_game_essential;
DROP INDEX IF EXISTS idx_invitations_code_essential;

-- Fix function security issue
CREATE OR REPLACE FUNCTION public.update_user_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update user statistics when a game is finished
  IF NEW.status = 'finished' AND OLD.status != 'finished' THEN
    -- Update winner stats
    IF NEW.winner = 'X' AND NEW.player1_id IS NOT NULL THEN
      UPDATE users 
      SET wins = wins + 1, updated_at = now()
      WHERE id = NEW.player1_id;
    ELSIF NEW.winner = 'O' AND NEW.player2_id IS NOT NULL THEN
      UPDATE users 
      SET wins = wins + 1, updated_at = now()
      WHERE id = NEW.player2_id;
    END IF;
    
    -- Update loser stats
    IF NEW.winner = 'X' AND NEW.player2_id IS NOT NULL THEN
      UPDATE users 
      SET losses = losses + 1, updated_at = now()
      WHERE id = NEW.player2_id;
    ELSIF NEW.winner = 'O' AND NEW.player1_id IS NOT NULL THEN
      UPDATE users 
      SET losses = losses + 1, updated_at = now()
      WHERE id = NEW.player1_id;
    END IF;
    
    -- Update draw stats
    IF NEW.winner = 'draw' THEN
      IF NEW.player1_id IS NOT NULL THEN
        UPDATE users 
        SET draws = draws + 1, updated_at = now()
        WHERE id = NEW.player1_id;
      END IF;
      
      IF NEW.player2_id IS NOT NULL THEN
        UPDATE users 
        SET draws = draws + 1, updated_at = now()
        WHERE id = NEW.player2_id;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS update_user_stats_trigger ON public.games;
CREATE TRIGGER update_user_stats_trigger
  AFTER UPDATE ON public.games
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_stats();

-- Add essential indexes that are actually used by the application
CREATE INDEX IF NOT EXISTS idx_users_telegram_id_lookup ON public.users USING btree (telegram_id) WHERE telegram_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_games_active_player1 ON public.games USING btree (player1_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_games_active_player2 ON public.games USING btree (player2_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_invitations_pending ON public.invitations USING btree (invite_code) WHERE status = 'pending';