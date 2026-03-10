import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

interface InviteCode {
  id: number;
  code: string;
  createdAt: string;
  usedAt: string | null;
  usedById: number | null;
}

interface InviteStats {
  totalCreated: number;
  activeUnused: number;
  alreadyUsed: number;
}

export function InviteCodes() {
  const { user } = useAuth();
  const [codes, setCodes] = useState<InviteCode[]>([]);
  const [stats, setStats] = useState<InviteStats>({ totalCreated: 0, activeUnused: 0, alreadyUsed: 0 });
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [canGenerateNow, setCanGenerateNow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [newCode, setNewCode] = useState('');

  // Fetch user's codes
  const fetchCodes = async () => {
    try {
      const response = await fetch('/api/invites/my-codes', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setCodes(data.codes);
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Failed to fetch codes:', err);
    }
  };

  // Check remaining time
  const checkRemainingTime = async () => {
    try {
      const response = await fetch('/api/invites/remaining-time', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setCanGenerateNow(data.canGenerateNow);
        setRemainingSeconds(data.secondsRemaining || 0);
      }
    } catch (err) {
      console.error('Failed to check remaining time:', err);
    }
  };

  // Initial load
  useEffect(() => {
    if (user) {
      setLoading(true);
      Promise.all([fetchCodes(), checkRemainingTime()]).finally(() => setLoading(false));
    }
  }, [user]);

  // Countdown timer
  useEffect(() => {
    if (remainingSeconds <= 0) return;

    const interval = setInterval(() => {
      setRemainingSeconds(s => {
        if (s <= 1) {
          setCanGenerateNow(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [remainingSeconds]);

  const generateCode = async () => {
    try {
      setGenerating(true);
      setError('');
      setSuccess('');
      setNewCode('');

      const response = await fetch('/api/invites/generate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.message || data.error || 'Failed to generate code');
        return;
      }

      const data = await response.json();
      setNewCode(data.code);
      setSuccess('Код успешно создан!');
      setCanGenerateNow(false);
      checkRemainingTime();
      fetchCodes();
    } catch (err) {
      setError('Ошибка при создании кода');
      console.error('Generate code error:', err);
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setSuccess('Код скопирован в буфер обмена!');
    setTimeout(() => setSuccess(''), 2000);
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}ч ${minutes}м`;
    }
    return `${minutes}м`;
  };

  if (!user) {
    return <div className="text-center text-gray-500">Требуется авторизация</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-blue-50 p-3 rounded-lg text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.totalCreated}</div>
          <div className="text-xs text-gray-600">Создано кодов</div>
        </div>
        <div className="bg-green-50 p-3 rounded-lg text-center">
          <div className="text-2xl font-bold text-green-600">{stats.alreadyUsed}</div>
          <div className="text-xs text-gray-600">Друзей приглашено</div>
        </div>
        <div className="bg-amber-50 p-3 rounded-lg text-center">
          <div className="text-2xl font-bold text-amber-600">{stats.activeUnused}</div>
          <div className="text-xs text-gray-600">Активных кодов</div>
        </div>
      </div>

      {/* Generate Code Section */}
      <div className="border border-gray-200 rounded-lg p-4 space-y-3">
        <h3 className="font-semibold text-gray-800">Создать новый инвайт-код</h3>

        {newCode && (
          <div className="bg-green-100 border border-green-400 rounded p-3 flex items-center justify-between">
            <div>
              <div className="font-mono font-bold text-green-800">{newCode}</div>
              <div className="text-xs text-green-700">Скопируйте и поделитесь!</div>
            </div>
            <button
              onClick={() => copyToClipboard(newCode)}
              className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
            >
              Копировать
            </button>
          </div>
        )}

        {error && (
          <div className="bg-red-100 border border-red-400 rounded p-3 text-red-800 text-sm">
            {error}
          </div>
        )}

        {success && !newCode && (
          <div className="bg-blue-100 border border-blue-400 rounded p-3 text-blue-800 text-sm">
            {success}
          </div>
        )}

        {canGenerateNow ? (
          <button
            onClick={generateCode}
            disabled={generating}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded font-semibold hover:bg-blue-700 disabled:bg-gray-400"
          >
            {generating ? 'Создание...' : '✨ Создать код'}
          </button>
        ) : (
          <div>
            <div className="text-sm text-gray-600 mb-3">
              Следующий код можно будет создать через:
            </div>
            <div className="text-center p-3 bg-gray-100 rounded">
              <div className="text-3xl font-bold text-gray-800">{formatTime(remainingSeconds)}</div>
            </div>
          </div>
        )}
      </div>

      {/* Active Codes */}
      {codes.length > 0 && (
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold text-gray-800 mb-3">Ваши коды</h3>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {codes.map((code) => (
              <div
                key={code.id}
                className={`flex items-center justify-between p-3 rounded border ${
                  code.usedAt ? 'bg-gray-50 border-gray-200' : 'bg-blue-50 border-blue-200'
                }`}
              >
                <div className="flex-1">
                  <div className="font-mono font-semibold text-gray-800">{code.code}</div>
                  <div className="text-xs text-gray-600">
                    {code.usedAt
                      ? `Использован ${new Date(code.usedAt).toLocaleDateString('ru-RU')}`
                      : 'Активный код'}
                  </div>
                </div>
                {!code.usedAt && (
                  <button
                    onClick={() => copyToClipboard(code.code)}
                    className="ml-2 px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                  >
                    Копировать
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {loading && <div className="text-center text-gray-500">Загрузка...</div>}
    </div>
  );
}
