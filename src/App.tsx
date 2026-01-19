import { useState } from 'react';
import { Copy, Check, ExternalLink, Bot, Database, Zap } from 'lucide-react';

function App() {
  const [botToken, setBotToken] = useState('');
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/telegram-bot`;

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  const setWebhook = async () => {
    if (!botToken) {
      alert('Пожалуйста, введите токен бота');
      return;
    }

    try {
      const response = await fetch(
        `https://api.telegram.org/bot${botToken}/setWebhook?url=${webhookUrl}`
      );
      const data = await response.json();

      if (data.ok) {
        alert('✅ Webhook успешно установлен! Ваш бот готов к работе.');
      } else {
        alert(`❌ Ошибка: ${data.description}`);
      }
    } catch (error) {
      alert(`❌ Ошибка при установке webhook: ${error}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <Bot className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">TicTacToeBot</h1>
          <p className="text-lg text-gray-600">
            Telegram бот для игры в крестики-нолики
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">
            Возможности бота
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="flex flex-col items-center text-center p-4 rounded-lg bg-blue-50">
              <Bot className="w-10 h-10 text-blue-600 mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Игра с AI</h3>
              <p className="text-sm text-gray-600">
                3 уровня сложности: легкий, средний и сложный с алгоритмом minimax
              </p>
            </div>
            <div className="flex flex-col items-center text-center p-4 rounded-lg bg-green-50">
              <Zap className="w-10 h-10 text-green-600 mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Мультиплеер</h3>
              <p className="text-sm text-gray-600">
                Играйте с друзьями через систему приглашений
              </p>
            </div>
            <div className="flex flex-col items-center text-center p-4 rounded-lg bg-purple-50">
              <Database className="w-10 h-10 text-purple-600 mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Статистика</h3>
              <p className="text-sm text-gray-600">
                Автоматическое отслеживание побед, поражений и таблица лидеров
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">
            Диагностика и настройка бота
          </h2>

          <div className="mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="text-lg font-semibold text-yellow-800 mb-2">🔍 Проверьте настройки</h3>
            <div className="space-y-2 text-sm text-yellow-700">
              <p>1. <strong>Токен бота:</strong> Добавлен ли TELEGRAM_BOT_TOKEN в переменные окружения Supabase?</p>
              <p>2. <strong>Webhook:</strong> Установлен ли webhook на правильный URL?</p>
              <p>3. <strong>База данных:</strong> Созданы ли все таблицы в Supabase?</p>
              <p>4. <strong>Логи:</strong> Проверьте логи Edge Functions в Supabase Dashboard</p>
            </div>
          </div>

          <div className="space-y-8">
            <div className="border-l-4 border-blue-600 pl-6">
              <div className="flex items-start">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold mr-4">
                  1
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Создайте Telegram бота
                  </h3>
                  <p className="text-gray-600 mb-3">
                    Откройте{' '}
                    <a
                      href="https://t.me/BotFather"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700 font-medium inline-flex items-center"
                    >
                      @BotFather <ExternalLink className="w-4 h-4 ml-1" />
                    </a>{' '}
                    в Telegram и отправьте команду <code className="bg-gray-100 px-2 py-1 rounded">/newbot</code>
                  </p>
                  <p className="text-gray-600 mb-3">
                    Следуйте инструкциям: укажите имя и username для бота.
                  </p>
                  <p className="text-gray-600">
                    BotFather отправит вам токен бота. Скопируйте его.
                  </p>
                </div>
              </div>
            </div>

            <div className="border-l-4 border-green-600 pl-6">
              <div className="flex items-start">
                <div className="flex-shrink-0 w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white font-bold mr-4">
                  2
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Добавьте токен бота в переменные окружения
                  </h3>
                  <p className="text-gray-600 mb-3">
                    Добавьте токен в переменные окружения Supabase:
                  </p>
                  <div className="bg-gray-50 p-4 rounded-lg border">
                    <p className="text-sm text-gray-700 mb-2">
                      1. Откройте настройки проекта Supabase
                    </p>
                    <p className="text-sm text-gray-700 mb-2">
                      2. Перейдите в раздел "Edge Functions"
                    </p>
                    <p className="text-sm text-gray-700 mb-2">
                      3. Добавьте переменную окружения:
                    </p>
                    <code className="block bg-white p-2 rounded border text-sm">
                      TELEGRAM_BOT_TOKEN = ваш_токен_от_BotFather
                    </code>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-l-4 border-purple-600 pl-6">
              <div className="flex items-start">
                <div className="flex-shrink-0 w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold mr-4">
                  3
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Webhook URL
                  </h3>
                  <p className="text-gray-600 mb-3">
                    Это URL, который Telegram будет использовать для отправки обновлений:
                  </p>
                  <div className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <code className="flex-1 text-sm text-gray-800 break-all">
                      {webhookUrl}
                    </code>
                    <button
                      onClick={() => copyToClipboard(webhookUrl)}
                      className="flex-shrink-0 p-2 hover:bg-gray-200 rounded transition"
                      title="Копировать"
                    >
                      {copiedWebhook ? (
                        <Check className="w-5 h-5 text-green-600" />
                      ) : (
                        <Copy className="w-5 h-5 text-gray-600" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-l-4 border-orange-600 pl-6">
              <div className="flex items-start">
                <div className="flex-shrink-0 w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center text-white font-bold mr-4">
                  4
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Установите webhook
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Установите webhook через Telegram Bot API или используйте форму ниже:
                  </p>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Токен бота:
                    </label>
                    <input
                      type="text"
                      value={botToken}
                      onChange={(e) => setBotToken(e.target.value)}
                      placeholder="Введите токен от BotFather"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <button
                    onClick={setWebhook}
                    className="mb-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
                  >
                    Установить webhook
                  </button>
                  
                  <div className="bg-gray-50 p-4 rounded-lg border">
                    <p className="text-sm text-gray-700 mb-2">
                      Отправьте GET запрос на:
                    </p>
                    <code className="block bg-white p-2 rounded border text-xs break-all">
                      https://api.telegram.org/bot[ВАШ_ТОКЕН]/setWebhook?url={webhookUrl}
                    </code>
                    <p className="text-sm text-gray-500 mt-2">
                      Замените [ВАШ_ТОКЕН] на токен от BotFather
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="border-l-4 border-red-600 pl-6">
              <div className="flex items-start">
                <div className="flex-shrink-0 w-8 h-8 bg-red-600 rounded-full flex items-center justify-center text-white font-bold mr-4">
                  5
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Проверьте логи
                  </h3>
                  <p className="text-gray-600 mb-3">
                    Если бот не работает, проверьте логи в Supabase Dashboard:
                  </p>
                  <div className="bg-gray-50 p-4 rounded-lg border">
                    <p className="text-sm text-gray-700 mb-2">
                      1. Откройте Supabase Dashboard
                    </p>
                    <p className="text-sm text-gray-700 mb-2">
                      2. Перейдите в "Edge Functions" → "telegram-bot"
                    </p>
                    <p className="text-sm text-gray-700 mb-2">
                      3. Нажмите "Logs" для просмотра ошибок
                    </p>
                    <p className="text-sm text-gray-700">
                      4. Отправьте /start боту и проверьте появились ли новые логи
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8 mt-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Использование бота
          </h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="text-blue-600 font-mono">/start</span>
              <span className="text-gray-600">- Начать работу с ботом</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-blue-600 font-mono">/menu</span>
              <span className="text-gray-600">- Показать главное меню</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-blue-600 font-mono">/invite</span>
              <span className="text-gray-600">- Создать приглашение для игры с другом</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-blue-600 font-mono">/accept КОД</span>
              <span className="text-gray-600">- Принять приглашение</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-blue-600 font-mono">/stats</span>
              <span className="text-gray-600">- Показать вашу статистику</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-blue-600 font-mono">/leaderboard</span>
              <span className="text-gray-600">- Показать таблицу лидеров</span>
            </div>
          </div>
        </div>

        <div className="text-center mt-8 text-gray-600">
          <p>
            После установки webhook найдите своего бота в Telegram и отправьте{' '}
            <code className="bg-gray-100 px-2 py-1 rounded">/start</code>
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
