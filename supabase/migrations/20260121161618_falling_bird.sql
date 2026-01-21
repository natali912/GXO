/*
  # Fix Final Security Issues

  1. Unindexed Foreign Keys
    - Add index for `game_moves_game_id_fkey`
    - Add index for `invitations_game_id_fkey`

  2. Remove Unused Indexes
    - Drop all unused indexes that are not being utilized by queries
    - Keep only essential indexes that are actually used

  3. Function Security
    - Fix `update_user_stats` function search_path issue
*/

-- Add missing indexes for foreign keys
CREATE INDEX IF NOT EXISTS idx_game_moves_game_id ON public.game_moves USING btree (game_id);
CREATE INDEX IF NOT EXISTS idx_invitations_game_id ON public.invitations USING btree (game_id);

-- Drop all unused indexes to improve write performance and reduce storage
DROP INDEX IF EXISTS idx_game_moves_player_id;
DROP INDEX IF EXISTS idx_games_player2_id;
DROP INDEX IF EXISTS idx_invitations_inviter_id;
DROP INDEX IF EXISTS idx_users_telegram_id_lookup;
DROP INDEX IF EXISTS idx_games_active_player1;
DROP INDEX IF EXISTS idx_games_active_player2;
DROP INDEX IF EXISTS idx_invitations_pending;

-- Fix function security issue
CREATE OR REPLACE FUNCTION public.update_user_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only update stats when game status changes to 'finished'
  IF OLD.status != 'finished' AND NEW.status = 'finished' THEN
    -- Update winner stats
    IF NEW.winner = 'X' AND NEW.player1_id IS NOT NULL THEN
      UPDATE users 
      SET wins = COALESCE(wins, 0) + 1, 
          updated_at = now()
      WHERE id = NEW.player1_id;
    ELSIF NEW.winner = 'O' AND NEW.player2_id IS NOT NULL THEN
      UPDATE users 
      SET wins = COALESCE(wins, 0) + 1, 
          updated_at = now()
      WHERE id = NEW.player2_id;
    END IF;
    
    -- Update loser stats
    IF NEW.winner = 'X' AND NEW.player2_id IS NOT NULL THEN
      UPDATE users 
      SET losses = COALESCE(losses, 0) + 1, 
          updated_at = now()
      WHERE id = NEW.player2_id;
    ELSIF NEW.winner = 'O' AND NEW.player1_id IS NOT NULL THEN
      UPDATE users 
      SET losses = COALESCE(losses, 0) + 1, 
          updated_at = now()
      WHERE id = NEW.player1_id;
    END IF;
    
    -- Update draw stats
    IF NEW.winner = 'draw' THEN
      IF NEW.player1_id IS NOT NULL THEN
        UPDATE users 
        SET draws = COALESCE(draws, 0) + 1, 
            updated_at = now()
        WHERE id = NEW.player1_id;
      END IF;
      
      IF NEW.player2_id IS NOT NULL THEN
        UPDATE users 
        SET draws = COALESCE(draws, 0) + 1, 
            updated_at = now()
        WHERE id = NEW.player2_id;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Ensure the trigger exists and is properly configured
DROP TRIGGER IF EXISTS update_user_stats_trigger ON public.games;
CREATE TRIGGER update_user_stats_trigger
  AFTER UPDATE ON public.games
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_stats();