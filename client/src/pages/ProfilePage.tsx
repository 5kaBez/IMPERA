import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../api/client';
import type { User as UserType } from '../types';
import { User, Bell, BellOff, Moon, Sun, Building2, BookOpen, Users, GraduationCap, RefreshCw } from 'lucide-react';

export default function ProfilePage() {
  const { user, updateUser, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  const toggleNotify = async (field: 'notifyBefore' | 'notifyChanges') => {
    setSaving(true);
    try {
      const data = await api.put<{ user: UserType }>('/user/notifications', {
        notifyBefore: field === 'notifyBefore' ? !user.notifyBefore : user.notifyBefore,
        notifyChanges: field === 'notifyChanges' ? !user.notifyChanges : user.notifyChanges,
      });
      updateUser(data.user);
    } catch (err) {
      console.error(err);
    }
    setSaving(false);
  };

  const group = user.group as any;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Профиль</h1>

      {/* User Info Card */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 mb-4">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-indigo-500/20">
            {user.firstName[0]}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {user.firstName} {user.lastName || ''}
            </h2>
            {user.username && (
              <p className="text-sm text-gray-500">@{user.username}</p>
            )}
            <span className={`inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full ${
              user.role === 'admin'
                ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400'
                : 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400'
            }`}>
              {user.role === 'admin' ? 'Администратор' : 'Студент'}
            </span>
          </div>
        </div>

        {/* Group Info */}
        {group && (
          <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-800">
            <InfoRow icon={Building2} label="Институт" value={group.program?.direction?.institute?.name} />
            <InfoRow icon={BookOpen} label="Направление" value={group.program?.direction?.name} />
            <InfoRow icon={GraduationCap} label="Программа" value={group.program?.name} />
            <InfoRow icon={Users} label="Группа" value={`${group.name} — ${group.course} курс`} />
            <InfoRow icon={User} label="Форма" value={`${group.studyForm} • ${group.educationLevel}`} />
          </div>
        )}
      </div>

      {/* Change Group */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 mb-4">
        <button
          onClick={() => { api.put('/user/group', { groupId: null }).then(() => window.location.reload()); }}
          className="w-full flex items-center gap-3 px-2 py-2 rounded-xl text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-all"
        >
          <RefreshCw className="w-5 h-5" />
          Сменить группу
        </button>
      </div>

      {/* Notifications */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 mb-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 px-2">Уведомления</h3>
        <div className="space-y-1">
          <ToggleRow
            icon={Bell}
            label="Напоминание перед парой"
            description="За 15 минут до начала"
            enabled={user.notifyBefore}
            onChange={() => toggleNotify('notifyBefore')}
            disabled={saving}
          />
          <ToggleRow
            icon={BellOff}
            label="Изменения в расписании"
            description="При обновлении расписания"
            enabled={user.notifyChanges}
            onChange={() => toggleNotify('notifyChanges')}
            disabled={saving}
          />
        </div>
      </div>

      {/* Theme */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 mb-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 px-2">Оформление</h3>
        <ToggleRow
          icon={theme === 'dark' ? Moon : Sun}
          label={theme === 'dark' ? 'Тёмная тема' : 'Светлая тема'}
          description="Переключить оформление"
          enabled={theme === 'dark'}
          onChange={toggleTheme}
        />
      </div>

      {/* Logout */}
      <button
        onClick={logout}
        className="w-full py-3 rounded-2xl text-sm font-medium text-red-500 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 border border-red-200 dark:border-red-500/20 transition-all"
      >
        Выйти из аккаунта
      </button>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <Icon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm text-gray-900 dark:text-gray-100">{value}</p>
      </div>
    </div>
  );
}

function ToggleRow({ icon: Icon, label, description, enabled, onChange, disabled }: {
  icon: any; label: string; description: string; enabled: boolean; onChange: () => void; disabled?: boolean;
}) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      className="w-full flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all disabled:opacity-50"
    >
      <Icon className="w-5 h-5 text-gray-400 flex-shrink-0" />
      <div className="flex-1 text-left">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{label}</p>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      <div className={`w-11 h-6 rounded-full transition-all flex items-center ${enabled ? 'bg-indigo-500' : 'bg-gray-200 dark:bg-gray-700'}`}>
        <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${enabled ? 'translate-x-5.5' : 'translate-x-0.5'}`} />
      </div>
    </button>
  );
}
