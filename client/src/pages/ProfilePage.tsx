import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../api/client';
import type { User as UserType } from '../types';
import { Bell, BellOff, Moon, Sun, Building2, BookOpen, Users, GraduationCap, RefreshCw } from 'lucide-react';

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
      <div className="mb-8 md:mb-12">
        <h1 className="text-3xl md:text-5xl font-black metallic-text tracking-[-0.06em] mb-2 md:mb-3 lowercase">
          профиль.
        </h1>
        <p className="text-[var(--color-text-muted)] font-black uppercase tracking-widest text-[9px] md:text-[11px] opacity-70">Личные данные &bull; Настройки</p>
      </div>

      {/* User Info Card */}
      <div className="apple-card p-6 md:p-10 mb-8 md:mb-10 border-[var(--apple-border)] shadow-xl bg-white/5 dark:bg-white/5">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-10 mb-6 md:mb-10">
          <div className="w-24 md:w-32 h-24 md:h-32 squircle iron-metal-bg flex items-center justify-center text-white text-3xl md:text-5xl font-black shadow-2xl scale-100 md:scale-110 -rotate-0 md:-rotate-3 hover:rotate-0 transition-all duration-700 group border border-white/10 overflow-hidden flex-shrink-0">
            <span className="group-hover:scale-110 transition-transform duration-700">{user.firstName[0]}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl md:text-4xl font-black text-[var(--color-text-main)] tracking-tighter mb-2 lowercase leading-tight">
              {user.firstName} {user.lastName || ''}.
            </h2>
            {user.username && (
              <p className="text-[var(--color-text-muted)] font-black text-[8px] md:text-xs uppercase tracking-[0.2em] opacity-60">@{user.username}</p>
            )}
            <div className="mt-4 md:mt-8 flex gap-2">
              <span className={`inline-flex items-center px-3 md:px-4 py-1.5 md:py-2 rounded-xl md:rounded-2xl text-[8px] md:text-[9px] font-black uppercase tracking-[0.2em] md:tracking-[0.25em] ${user.role === 'admin'
                ? 'iron-metal-bg text-white shadow-gold-glow'
                : 'bg-zinc-500/10 text-[var(--color-text-muted)] border border-zinc-500/10'
                }`}>
                {user.role === 'admin' ? 'administrator' : 'verified student'}
              </span>
            </div>
          </div>
        </div>

        {/* Group Info */}
        {group && (
          <div className="space-y-4 pt-6 border-t border-[var(--apple-border)]">
            <InfoRow icon={Building2} label="Институт" value={group.program?.direction?.institute?.name} />
            <InfoRow icon={BookOpen} label="Направление" value={group.program?.direction?.name} />
            <InfoRow icon={GraduationCap} label="Программа" value={group.program?.name} />
            <InfoRow icon={Users} label="Группа" value={`${group.name} — ${group.course} курс`} />
          </div>
        )}
      </div>

      {/* Action Sections */}
      <div className="grid gap-8 mb-12">
        <div className="apple-card p-2 border-[var(--apple-border)] shadow-xl bg-white/5 dark:bg-white/5">
          <button
            onClick={() => { api.put('/user/group', { groupId: null }).then(() => window.location.reload()); }}
            className="w-full flex items-center justify-between px-8 py-6 rounded-[32px] hover:bg-black/5 dark:hover:bg-white/5 transition-all duration-700 group"
          >
            <div className="flex items-center gap-6">
              <div className="w-14 h-14 squircle bg-black/5 dark:bg-white/5 text-[var(--color-text-muted)] flex items-center justify-center group-hover:iron-metal-bg group-hover:text-white group-hover:scale-110 transition-all duration-700 shadow-inner overflow-hidden">
                <RefreshCw className="w-7 h-7 group-hover:rotate-180 transition-transform duration-700" />
              </div>
              <p className="text-sm font-black text-[var(--color-text-main)] uppercase tracking-[0.15em] opacity-80 group-hover:opacity-100 transition-opacity">сменить учебную группу</p>
            </div>
            <span className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.3em] group-hover:text-[var(--color-primary-apple)] transition-colors opacity-40 group-hover:opacity-100">Изменить</span>
          </button>
        </div>

        {/* Settings Sections */}
        <div className="apple-card border-[var(--apple-border)] shadow-2xl bg-white/5 dark:bg-white/5 overflow-hidden">
          <div className="p-10">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--color-text-muted)] mb-10 opacity-70">Настройки системы</h3>
            <div className="space-y-4">
              <ToggleRow
                icon={Bell}
                label="Уведомления о парах"
                description="Напоминание за 15 минут до начала"
                enabled={user.notifyBefore}
                onChange={() => toggleNotify('notifyBefore')}
                activeColor="iron-metal-bg"
                disabled={saving}
              />
              <ToggleRow
                icon={BellOff}
                label="Изменения расписания"
                description="Мгновенно при обновлении"
                enabled={user.notifyChanges}
                onChange={() => toggleNotify('notifyChanges')}
                activeColor="iron-metal-bg"
                disabled={saving}
              />
              <div className="h-px bg-[var(--apple-border)] my-8 mx-4"></div>
              <ToggleRow
                icon={theme === 'dark' ? Moon : Sun}
                label="Тёмное оформление"
                description="Переход в режим Carbon"
                enabled={theme === 'dark'}
                onChange={toggleTheme}
                activeColor="iron-metal-bg"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Logout */}
      <button
        onClick={logout}
        className="w-full py-6 rounded-[32px] text-xs font-black uppercase tracking-[0.3em] text-rose-500 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-all duration-700 shadow-xl active:scale-95 overflow-hidden"
      >
        Sign Out Securely
      </button>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-6 px-4 py-4 rounded-[24px] hover:bg-black/5 dark:hover:bg-white/5 transition-all duration-700 group">
      <div className="w-12 h-12 squircle bg-black/5 dark:bg-white/5 border border-[var(--apple-border)] flex items-center justify-center group-hover:iron-metal-bg group-hover:text-white transition-all duration-700 shadow-inner overflow-hidden">
        <Icon className="w-6 h-6 text-[var(--color-text-muted)] opacity-70 group-hover:opacity-100" />
      </div>
      <div>
        <p className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.2em] opacity-60 mb-1">{label}</p>
        <p className="text-sm font-black text-[var(--color-text-main)] truncate max-w-[200px] sm:max-w-none lowercase">{value}.</p>
      </div>
    </div>
  );
}

function ToggleRow({ icon: Icon, label, description, enabled, onChange, activeColor = 'bg-[var(--color-primary-apple)]', disabled }: {
  icon: any; label: string; description: string; enabled: boolean; onChange: () => void; activeColor?: string; disabled?: boolean;
}) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      className="w-full flex items-center gap-6 px-6 py-6 rounded-[28px] hover:bg-black/5 dark:hover:bg-white/5 transition-all duration-700 disabled:opacity-50 group overflow-hidden"
    >
      <div className={`w-14 h-14 squircle flex items-center justify-center transition-all duration-700 shadow-inner overflow-hidden ${enabled ? `iron-metal-bg text-white` : 'bg-black/5 dark:bg-white/5 text-[var(--color-text-muted)]'}`}>
        <Icon className="w-7 h-7" />
      </div>
      <div className="flex-1 text-left">
        <p className="text-base font-black text-[var(--color-text-main)] tracking-tight leading-tight mb-1">{label}</p>
        <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest opacity-60">{description}</p>
      </div>
      <div className={`w-14 h-8 rounded-full transition-all duration-700 relative flex items-center shadow-lg ${enabled ? activeColor : 'bg-zinc-300 dark:bg-zinc-800'}`}>
        <div className={`w-6 h-6 rounded-full bg-white shadow-xl transition-all duration-700 absolute ${enabled ? 'left-[28px]' : 'left-1'}`} />
        {enabled && (
          <div className="absolute inset-0 rounded-full shadow-gold-glow animate-pulse opacity-40" />
        )}
      </div>
    </button>
  );
}
