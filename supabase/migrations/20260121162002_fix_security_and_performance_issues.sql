/*
  # Fix Security and Performance Issues

  1. Add Missing Foreign Key Indexes
    - `idx_game_moves_player_id` - Index on game_moves.player_id for faster lookups
    - `idx_games_player1_id` - Index on games.player1_id for faster player queries
    - `idx_games_player2_id` - Index on games.player2_id for faster player queries  
    - `idx_invitations_inviter_id` - Index on invitations.inviter_id for faster inviter lookups

  2. Remove Unused Indexes
    - Drop `idx_game_moves_game_id` - Foreign key constraint already provides index
    - Drop `idx_invitations_game_id` - Not being used by application queries
    - This reduces storage overhead and improves write performance

  3. Fix Function Security
    - Update `update_user_stats` function with stable search_path
    - Prevents potential SQL injection through search_path manipulation
    - Sets explicit search_path to 'public' for security

  4. Important Notes
    - All foreign keys need covering indexes for optimal performance
    - Unused indexes waste storage and slow down INSERT/UPDATE/DELETE operations
    - Functions with mutable search_path are a security risk
*/

-- Add missing indexes for foreign keys to improve query performance
CREATE INDEX IF NOT EXISTS idx_game_moves_player_id ON public.game_moves USING btree (player_id);
CREATE INDEX IF NOT EXISTS idx_games_player1_id ON public.games USING btree (player1_id);
CREATE INDEX IF NOT EXISTS idx_games_player2_id ON public.games USING btree (player2_id);
CREATE INDEX IF NOT EXISTS idx_invitations_inviter_id ON public.invitations USING btree (inviter_id);

-- Drop unused indexes to reduce storage and improve write performance
-- These indexes are not being used by the application's query patterns
DROP INDEX IF EXISTS public.idx_game_moves_game_id;
DROP INDEX IF EXISTS public.idx_invitations_game_id;

-- Fix function security issue by setting a stable search_path
-- This prevents SQL injection attacks through search_path manipulation
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