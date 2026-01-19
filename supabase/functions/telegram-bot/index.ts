import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Инициализация Supabase клиента
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: {
      id: number;
      is_bot: boolean;
      first_name: string;
      last_name?: string;
      username?: string;
    };
    chat: {
      id: number;
      type: string;
    };
    text?: string;
  };
  callback_query?: {
    id: string;
    from: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
    };
    message: {
      message_id: number;
      chat: {
        id: number;
      };
    };
    data: string;
  };
}

// Создание или получение пользователя
async function getOrCreateUser(telegramUser: any) {
  const { data: existingUser } = await supabase
    .from('users')
    .select('*')
    .eq('telegram_id', telegramUser.id)
    .single();

  if (existingUser) {
    return existingUser;
  }

  const { data: newUser, error } = await supabase
    .from('users')
    .insert({
      telegram_id: telegramUser.id,
      username: telegramUser.username,
      first_name: telegramUser.first_name,
      last_name: telegramUser.last_name,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating user:', error);
    throw error;
  }

  return newUser;
}

// Отправка сообщения в Telegram
async function sendMessage(chatId: number, text: string, replyMarkup?: any) {
  const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
  if (!botToken) {
    throw new Error('TELEGRAM_BOT_TOKEN not set');
  }

  const payload: any = {
    chat_id: chatId,
    text: text,
    parse_mode: 'HTML',
  };

  if (replyMarkup) {
    payload.reply_markup = replyMarkup;
  }

  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  return response.json();
}

// Редактирование сообщения
async function editMessage(chatId: number, messageId: number, text: string, replyMarkup?: any) {
  const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
  if (!botToken) {
    throw new Error('TELEGRAM_BOT_TOKEN not set');
  }

  const payload: any = {
    chat_id: chatId,
    message_id: messageId,
    text: text,
    parse_mode: 'HTML',
  };

  if (replyMarkup) {
    payload.reply_markup = replyMarkup;
  }

  const response = await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  return response.json();
}

// Главное меню
function getMainMenuKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '🤖 Играть с AI (Легко)', callback_data: 'play_ai_easy' },
        { text: '🧠 Играть с AI (Средне)', callback_data: 'play_ai_medium' }
      ],
      [
        { text: '🔥 Играть с AI (Сложно)', callback_data: 'play_ai_hard' }
      ],
      [
        { text: '👥 Играть с другом', callback_data: 'play_multiplayer' },
        { text: '📊 Статистика', callback_data: 'stats' }
      ],
      [
        { text: '🏆 Таблица лидеров', callback_data: 'leaderboard' }
      ]
    ]
  };
}

// Создание игрового поля
function createGameBoard(board: (string | null)[][], gameId: string) {
  const keyboard = [];
  
  for (let row = 0; row < 3; row++) {
    const keyboardRow = [];
    for (let col = 0; col < 3; col++) {
      const cell = board[row][col];
      const text = cell || '⬜';
      keyboardRow.push({
        text: text,
        callback_data: `move_${gameId}_${row}_${col}`
      });
    }
    keyboard.push(keyboardRow);
  }
  
  keyboard.push([
    { text: '🏠 Главное меню', callback_data: 'main_menu' }
  ]);
  
  return { inline_keyboard: keyboard };
}

// AI алгоритм minimax
function minimax(board: (string | null)[][], depth: number, isMaximizing: boolean, alpha: number = -Infinity, beta: number = Infinity): number {
  const winner = checkWinner(board);
  
  if (winner === 'O') return 10 - depth;
  if (winner === 'X') return depth - 10;
  if (isBoardFull(board)) return 0;
  
  if (isMaximizing) {
    let maxEval = -Infinity;
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        if (board[row][col] === null) {
          board[row][col] = 'O';
          const eval = minimax(board, depth + 1, false, alpha, beta);
          board[row][col] = null;
          maxEval = Math.max(maxEval, eval);
          alpha = Math.max(alpha, eval);
          if (beta <= alpha) break;
        }
      }
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        if (board[row][col] === null) {
          board[row][col] = 'X';
          const eval = minimax(board, depth + 1, true, alpha, beta);
          board[row][col] = null;
          minEval = Math.min(minEval, eval);
          beta = Math.min(beta, eval);
          if (beta <= alpha) break;
        }
      }
    }
    return minEval;
  }
}

// Получение лучшего хода для AI
function getBestMove(board: (string | null)[][], difficulty: string): { row: number; col: number } {
  if (difficulty === 'ai_easy') {
    // Случайный ход
    const emptyCells = [];
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        if (board[row][col] === null) {
          emptyCells.push({ row, col });
        }
      }
    }
    return emptyCells[Math.floor(Math.random() * emptyCells.length)];
  }
  
  if (difficulty === 'ai_medium') {
    // 70% оптимальный ход, 30% случайный
    if (Math.random() < 0.7) {
      return getBestMoveHard(board);
    } else {
      return getBestMove(board, 'ai_easy');
    }
  }
  
  // ai_hard - всегда оптимальный ход
  return getBestMoveHard(board);
}

function getBestMoveHard(board: (string | null)[][]): { row: number; col: number } {
  let bestMove = { row: -1, col: -1 };
  let bestValue = -Infinity;
  
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      if (board[row][col] === null) {
        board[row][col] = 'O';
        const moveValue = minimax(board, 0, false);
        board[row][col] = null;
        
        if (moveValue > bestValue) {
          bestMove = { row, col };
          bestValue = moveValue;
        }
      }
    }
  }
  
  return bestMove;
}

// Проверка победителя
function checkWinner(board: (string | null)[][]): string | null {
  // Проверка строк
  for (let row = 0; row < 3; row++) {
    if (board[row][0] && board[row][0] === board[row][1] && board[row][1] === board[row][2]) {
      return board[row][0];
    }
  }
  
  // Проверка столбцов
  for (let col = 0; col < 3; col++) {
    if (board[0][col] && board[0][col] === board[1][col] && board[1][col] === board[2][col]) {
      return board[0][col];
    }
  }
  
  // Проверка диагоналей
  if (board[0][0] && board[0][0] === board[1][1] && board[1][1] === board[2][2]) {
    return board[0][0];
  }
  
  if (board[0][2] && board[0][2] === board[1][1] && board[1][1] === board[2][0]) {
    return board[0][2];
  }
  
  return null;
}

// Проверка заполненности доски
function isBoardFull(board: (string | null)[][]): boolean {
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      if (board[row][col] === null) {
        return false;
      }
    }
  }
  return true;
}

// Генерация кода приглашения
function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Обработка команд
async function handleCommand(message: any, user: any) {
  const chatId = message.chat.id;
  const text = message.text;
  
  if (text === '/start' || text === '/menu') {
    await sendMessage(chatId, 
      `🎮 <b>Добро пожаловать в TicTacToe Bot!</b>\n\n` +
      `Привет, ${user.first_name}! Выберите режим игры:`,
      getMainMenuKeyboard()
    );
  }
  
  else if (text === '/stats') {
    await sendMessage(chatId,
      `📊 <b>Ваша статистика:</b>\n\n` +
      `🏆 Побед: ${user.wins}\n` +
      `❌ Поражений: ${user.losses}\n` +
      `🤝 Ничьих: ${user.draws}\n` +
      `📈 Всего игр: ${user.wins + user.losses + user.draws}`,
      { inline_keyboard: [[{ text: '🏠 Главное меню', callback_data: 'main_menu' }]] }
    );
  }
  
  else if (text.startsWith('/invite')) {
    const inviteCode = generateInviteCode();
    
    // Создаем игру
    const { data: game, error: gameError } = await supabase
      .from('games')
      .insert({
        player1_id: user.id,
        game_type: 'multiplayer',
        status: 'waiting',
        invite_code: inviteCode
      })
      .select()
      .single();
    
    if (gameError) {
      await sendMessage(chatId, '❌ Ошибка при создании игры');
      return;
    }
    
    // Создаем приглашение
    await supabase
      .from('invitations')
      .insert({
        inviter_id: user.id,
        invite_code: inviteCode,
        game_id: game.id
      });
    
    await sendMessage(chatId,
      `🎯 <b>Приглашение создано!</b>\n\n` +
      `Код приглашения: <code>${inviteCode}</code>\n\n` +
      `Отправьте этот код другу, чтобы он мог присоединиться к игре командой:\n` +
      `<code>/accept ${inviteCode}</code>`,
      { inline_keyboard: [[{ text: '🏠 Главное меню', callback_data: 'main_menu' }]] }
    );
  }
  
  else if (text.startsWith('/accept ')) {
    const inviteCode = text.split(' ')[1];
    
    if (!inviteCode) {
      await sendMessage(chatId, '❌ Укажите код приглашения: /accept КОД');
      return;
    }
    
    // Находим приглашение
    const { data: invitation } = await supabase
      .from('invitations')
      .select('*, games(*)')
      .eq('invite_code', inviteCode)
      .eq('status', 'pending')
      .single();
    
    if (!invitation) {
      await sendMessage(chatId, '❌ Приглашение не найдено или уже использовано');
      return;
    }
    
    // Обновляем игру
    const { data: game, error } = await supabase
      .from('games')
      .update({
        player2_id: user.id,
        status: 'active'
      })
      .eq('id', invitation.game_id)
      .select()
      .single();
    
    if (error) {
      await sendMessage(chatId, '❌ Ошибка при присоединении к игре');
      return;
    }
    
    // Обновляем статус приглашения
    await supabase
      .from('invitations')
      .update({ status: 'accepted' })
      .eq('id', invitation.id);
    
    // Уведомляем обоих игроков
    const board = game.board as (string | null)[][];
    const gameText = `🎮 <b>Игра началась!</b>\n\nХод игрока X`;
    
    await sendMessage(chatId, gameText, createGameBoard(board, game.id));
    
    // Уведомляем создателя игры
    const { data: inviter } = await supabase
      .from('users')
      .select('telegram_id')
      .eq('id', invitation.inviter_id)
      .single();
    
    if (inviter) {
      await sendMessage(inviter.telegram_id, gameText, createGameBoard(board, game.id));
    }
  }
  
  else if (text === '/leaderboard') {
    const { data: leaders } = await supabase
      .from('users')
      .select('first_name, wins, losses, draws')
      .order('wins', { ascending: false })
      .limit(10);
    
    let leaderboardText = '🏆 <b>Таблица лидеров:</b>\n\n';
    
    if (leaders && leaders.length > 0) {
      leaders.forEach((leader, index) => {
        const total = leader.wins + leader.losses + leader.draws;
        const winRate = total > 0 ? Math.round((leader.wins / total) * 100) : 0;
        leaderboardText += `${index + 1}. ${leader.first_name}\n`;
        leaderboardText += `   🏆 ${leader.wins} побед (${winRate}%)\n\n`;
      });
    } else {
      leaderboardText += 'Пока нет данных';
    }
    
    await sendMessage(chatId, leaderboardText,
      { inline_keyboard: [[{ text: '🏠 Главное меню', callback_data: 'main_menu' }]] }
    );
  }
}

// Обработка callback запросов
async function handleCallback(callbackQuery: any, user: any) {
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  const data = callbackQuery.data;
  
  if (data === 'main_menu') {
    await editMessage(chatId, messageId,
      `🎮 <b>Добро пожаловать в TicTacToe Bot!</b>\n\n` +
      `Привет, ${user.first_name}! Выберите режим игры:`,
      getMainMenuKeyboard()
    );
  }
  
  else if (data.startsWith('play_ai_')) {
    const difficulty = data;
    
    // Создаем игру с AI
    const { data: game, error } = await supabase
      .from('games')
      .insert({
        player1_id: user.id,
        game_type: difficulty,
        status: 'active'
      })
      .select()
      .single();
    
    if (error) {
      await editMessage(chatId, messageId, '❌ Ошибка при создании игры');
      return;
    }
    
    const board = game.board as (string | null)[][];
    await editMessage(chatId, messageId,
      `🎮 <b>Игра с AI</b>\n\nВы играете за X, ваш ход!`,
      createGameBoard(board, game.id)
    );
  }
  
  else if (data === 'play_multiplayer') {
    await editMessage(chatId, messageId,
      `👥 <b>Игра с другом</b>\n\n` +
      `Для игры с другом используйте команды:\n` +
      `• <code>/invite</code> - создать приглашение\n` +
      `• <code>/accept КОД</code> - принять приглашение`,
      { inline_keyboard: [[{ text: '🏠 Главное меню', callback_data: 'main_menu' }]] }
    );
  }
  
  else if (data === 'stats') {
    await editMessage(chatId, messageId,
      `📊 <b>Ваша статистика:</b>\n\n` +
      `🏆 Побед: ${user.wins}\n` +
      `❌ Поражений: ${user.losses}\n` +
      `🤝 Ничьих: ${user.draws}\n` +
      `📈 Всего игр: ${user.wins + user.losses + user.draws}`,
      { inline_keyboard: [[{ text: '🏠 Главное меню', callback_data: 'main_menu' }]] }
    );
  }
  
  else if (data === 'leaderboard') {
    const { data: leaders } = await supabase
      .from('users')
      .select('first_name, wins, losses, draws')
      .order('wins', { ascending: false })
      .limit(10);
    
    let leaderboardText = '🏆 <b>Таблица лидеров:</b>\n\n';
    
    if (leaders && leaders.length > 0) {
      leaders.forEach((leader, index) => {
        const total = leader.wins + leader.losses + leader.draws;
        const winRate = total > 0 ? Math.round((leader.wins / total) * 100) : 0;
        leaderboardText += `${index + 1}. ${leader.first_name}\n`;
        leaderboardText += `   🏆 ${leader.wins} побед (${winRate}%)\n\n`;
      });
    } else {
      leaderboardText += 'Пока нет данных';
    }
    
    await editMessage(chatId, messageId, leaderboardText,
      { inline_keyboard: [[{ text: '🏠 Главное меню', callback_data: 'main_menu' }]] }
    );
  }
  
  else if (data.startsWith('move_')) {
    const [, gameId, rowStr, colStr] = data.split('_');
    const row = parseInt(rowStr);
    const col = parseInt(colStr);
    
    // Получаем игру
    const { data: game } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single();
    
    if (!game || game.status !== 'active') {
      await editMessage(chatId, messageId, '❌ Игра не найдена или завершена');
      return;
    }
    
    const board = game.board as (string | null)[][];
    
    // Проверяем, что клетка пуста
    if (board[row][col] !== null) {
      return; // Клетка уже занята
    }
    
    // Проверяем очередность хода
    const isPlayer1 = game.player1_id === user.id;
    const isPlayer2 = game.player2_id === user.id;
    
    if (game.game_type.startsWith('ai_')) {
      // Игра с AI - игрок всегда X
      if (!isPlayer1) return;
      
      // Ход игрока
      board[row][col] = 'X';
      
      // Сохраняем ход
      await supabase.from('game_moves').insert({
        game_id: gameId,
        player_id: user.id,
        move_number: 1,
        row,
        col,
        symbol: 'X'
      });
      
      // Проверяем победу игрока
      const winner = checkWinner(board);
      if (winner === 'X') {
        await supabase.from('games').update({
          board,
          status: 'finished',
          winner: 'X'
        }).eq('id', gameId);
        
        await supabase.from('users').update({
          wins: user.wins + 1
        }).eq('id', user.id);
        
        await editMessage(chatId, messageId,
          `🎉 <b>Поздравляем! Вы победили!</b>\n\nИгра завершена.`,
          { inline_keyboard: [[{ text: '🏠 Главное меню', callback_data: 'main_menu' }]] }
        );
        return;
      }
      
      // Проверяем ничью
      if (isBoardFull(board)) {
        await supabase.from('games').update({
          board,
          status: 'finished',
          winner: 'draw'
        }).eq('id', gameId);
        
        await supabase.from('users').update({
          draws: user.draws + 1
        }).eq('id', user.id);
        
        await editMessage(chatId, messageId,
          `🤝 <b>Ничья!</b>\n\nИгра завершена.`,
          { inline_keyboard: [[{ text: '🏠 Главное меню', callback_data: 'main_menu' }]] }
        );
        return;
      }
      
      // Ход AI
      const aiMove = getBestMove(board, game.game_type);
      board[aiMove.row][aiMove.col] = 'O';
      
      // Сохраняем ход AI
      await supabase.from('game_moves').insert({
        game_id: gameId,
        move_number: 2,
        row: aiMove.row,
        col: aiMove.col,
        symbol: 'O'
      });
      
      // Проверяем победу AI
      const aiWinner = checkWinner(board);
      if (aiWinner === 'O') {
        await supabase.from('games').update({
          board,
          status: 'finished',
          winner: 'O'
        }).eq('id', gameId);
        
        await supabase.from('users').update({
          losses: user.losses + 1
        }).eq('id', user.id);
        
        await editMessage(chatId, messageId,
          `😔 <b>AI победил!</b>\n\nПопробуйте еще раз!`,
          { inline_keyboard: [[{ text: '🏠 Главное меню', callback_data: 'main_menu' }]] }
        );
        return;
      }
      
      // Проверяем ничью после хода AI
      if (isBoardFull(board)) {
        await supabase.from('games').update({
          board,
          status: 'finished',
          winner: 'draw'
        }).eq('id', gameId);
        
        await supabase.from('users').update({
          draws: user.draws + 1
        }).eq('id', user.id);
        
        await editMessage(chatId, messageId,
          `🤝 <b>Ничья!</b>\n\nИгра завершена.`,
          { inline_keyboard: [[{ text: '🏠 Главное меню', callback_data: 'main_menu' }]] }
        );
        return;
      }
      
      // Обновляем игру
      await supabase.from('games').update({ board }).eq('id', gameId);
      
      await editMessage(chatId, messageId,
        `🎮 <b>Игра с AI</b>\n\nВаш ход!`,
        createGameBoard(board, gameId)
      );
    }
    
    else {
      // Мультиплеер игра
      const currentSymbol = game.current_player;
      const isCurrentPlayer = (currentSymbol === 'X' && isPlayer1) || (currentSymbol === 'O' && isPlayer2);
      
      if (!isCurrentPlayer) {
        return; // Не ваш ход
      }
      
      // Делаем ход
      board[row][col] = currentSymbol;
      const nextPlayer = currentSymbol === 'X' ? 'O' : 'X';
      
      // Сохраняем ход
      await supabase.from('game_moves').insert({
        game_id: gameId,
        player_id: user.id,
        move_number: 1,
        row,
        col,
        symbol: currentSymbol
      });
      
      // Проверяем победу
      const winner = checkWinner(board);
      if (winner) {
        await supabase.from('games').update({
          board,
          status: 'finished',
          winner,
          current_player: nextPlayer
        }).eq('id', gameId);
        
        // Обновляем статистику
        const winnerId = winner === 'X' ? game.player1_id : game.player2_id;
        const loserId = winner === 'X' ? game.player2_id : game.player1_id;
        
        await supabase.from('users').update({ wins: user.wins + 1 }).eq('id', winnerId);
        await supabase.from('users').update({ losses: user.losses + 1 }).eq('id', loserId);
        
        const winText = `🎉 <b>Игра завершена!</b>\n\nПобедил игрок ${winner}!`;
        
        await editMessage(chatId, messageId, winText,
          { inline_keyboard: [[{ text: '🏠 Главное меню', callback_data: 'main_menu' }]] }
        );
        
        // Уведомляем другого игрока
        const otherPlayerId = isPlayer1 ? game.player2_id : game.player1_id;
        const { data: otherPlayer } = await supabase
          .from('users')
          .select('telegram_id')
          .eq('id', otherPlayerId)
          .single();
        
        if (otherPlayer) {
          await sendMessage(otherPlayer.telegram_id, winText,
            { inline_keyboard: [[{ text: '🏠 Главное меню', callback_data: 'main_menu' }]] }
          );
        }
        
        return;
      }
      
      // Проверяем ничью
      if (isBoardFull(board)) {
        await supabase.from('games').update({
          board,
          status: 'finished',
          winner: 'draw'
        }).eq('id', gameId);
        
        await supabase.from('users').update({ draws: user.draws + 1 }).eq('id', game.player1_id);
        await supabase.from('users').update({ draws: user.draws + 1 }).eq('id', game.player2_id);
        
        const drawText = `🤝 <b>Ничья!</b>\n\nИгра завершена.`;
        
        await editMessage(chatId, messageId, drawText,
          { inline_keyboard: [[{ text: '🏠 Главное меню', callback_data: 'main_menu' }]] }
        );
        
        // Уведомляем другого игрока
        const otherPlayerId = isPlayer1 ? game.player2_id : game.player1_id;
        const { data: otherPlayer } = await supabase
          .from('users')
          .select('telegram_id')
          .eq('id', otherPlayerId)
          .single();
        
        if (otherPlayer) {
          await sendMessage(otherPlayer.telegram_id, drawText,
            { inline_keyboard: [[{ text: '🏠 Главное меню', callback_data: 'main_menu' }]] }
          );
        }
        
        return;
      }
      
      // Обновляем игру
      await supabase.from('games').update({
        board,
        current_player: nextPlayer
      }).eq('id', gameId);
      
      const gameText = `🎮 <b>Мультиплеер игра</b>\n\nХод игрока ${nextPlayer}`;
      
      await editMessage(chatId, messageId, gameText, createGameBoard(board, gameId));
      
      // Уведомляем другого игрока
      const otherPlayerId = isPlayer1 ? game.player2_id : game.player1_id;
      const { data: otherPlayer } = await supabase
        .from('users')
        .select('telegram_id')
        .eq('id', otherPlayerId)
        .single();
      
      if (otherPlayer) {
        await sendMessage(otherPlayer.telegram_id, gameText, createGameBoard(board, gameId));
      }
    }
  }
}

Deno.serve(async (req: Request) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: corsHeaders,
      });
    }

    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const update: TelegramUpdate = await req.json();
    
    if (update.message) {
      const user = await getOrCreateUser(update.message.from);
      await handleCommand(update.message, user);
    }
    
    if (update.callback_query) {
      const user = await getOrCreateUser(update.callback_query.from);
      await handleCallback(update.callback_query, user);
      
      // Подтверждаем callback
      const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
      if (botToken) {
        await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callback_query_id: update.callback_query.id }),
        });
      }
    }

    return new Response('OK', {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error) {
    console.error('Error processing update:', error);
    return new Response('Internal Server Error', {
      status: 500,
      headers: corsHeaders,
    });
  }
});