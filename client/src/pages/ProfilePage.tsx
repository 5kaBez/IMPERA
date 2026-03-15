import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../api/client';
import { analytics } from '../api/analytics';
import type { User as UserType } from '../types';
import { Bell, BellOff, Moon, Sun, Building2, BookOpen, Users, GraduationCap, RefreshCw, LogOut, ChevronRight, MessageSquare, Pencil, ShieldBan, X } from 'lucide-react';
import { FeedbackModal } from '../components/FeedbackModal';
import UserAvatar from '../components/UserAvatar';
import AvatarPickerModal from '../components/AvatarPickerModal';

export default function ProfilePage() {
  const { user, updateUser, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [saving, setSaving] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<Array<{ id: number; firstName: string; lastName?: string; avatarId?: number }>>([]);
  const [blockedLoaded, setBlockedLoaded] = useState(false);

  useEffect(() => {
    analytics.trackPageView('/profile');
    // Load blocked users
    api.get<{ blocked: typeof blockedUsers }>('/user/blocked')
      .then(data => { setBlockedUsers(data.blocked); setBlockedLoaded(true); })
      .catch(() => setBlockedLoaded(true));
  }, []);

  if (!user) return null;

  const toggleNotify = async (field: 'notifyBefore' | 'notifyChanges') => {
    setSaving(true);
    try {
      const data = await api.put<{ user: UserType }>('/user/notifications', {
        notifyBefore: field === 'notifyBefore' ? !user.notifyBefore : user.notifyBefore,
        notifyChanges: field === 'notifyChanges' ? !user.notifyChanges : user.notifyChanges,
      });
      updateUser(data.user);
      analytics.trackFeature('notifications', field === 'notifyBefore' ? 'before' : 'changes', data.user[field] ? 'enabled' : 'disabled');
    } catch (err) {
      console.error(err);
    }
    setSaving(false);
  };

  const group = user.group as any;

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="mb-3 md:mb-8">
        <h1 className="text-2xl md:text-5xl font-black metallic-text tracking-[-0.06em] mb-1 lowercase">
          профиль
        </h1>
        <p className="text-[var(--color-text-muted)] font-black uppercase tracking-widest text-[8px] md:text-[11px] opacity-70">Личные данные &bull; Настройки</p>
      </div>

      {/* User Card — Compact on mobile */}
      <div className="rounded-2xl md:rounded-[40px] bg-black/[0.03] dark:bg-white/[0.04] border border-[var(--apple-border)] p-4 md:p-10 mb-3 md:mb-8">
        <div className="flex items-center gap-3 md:gap-10 mb-3 md:mb-8">
          <div className="relative">
            <UserAvatar
              avatarId={user.avatarId || 0}
              firstName={user.firstName}
              size="md"
              onClick={() => setAvatarPickerOpen(true)}
            />
            <button
              onClick={() => setAvatarPickerOpen(true)}
              className="absolute -bottom-1 -right-1 w-7 h-7 md:w-9 md:h-9 rounded-full bg-[var(--color-bg-apple)] border border-[var(--apple-border)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary-apple)] transition-colors shadow-md"
            >
              <Pencil className="w-3 h-3 md:w-4 md:h-4" />
            </button>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg md:text-4xl font-black text-[var(--color-text-main)] tracking-tighter lowercase leading-tight">
              {user.firstName} {user.lastName || ''}
            </h2>
            {user.username && (
              <p className="text-[var(--color-text-muted)] font-bold text-[9px] md:text-xs uppercase tracking-wider opacity-50 mt-0.5">@{user.username}</p>
            )}
            <span className={`inline-flex items-center mt-2 px-2.5 py-1 md:px-4 md:py-2 rounded-lg md:rounded-2xl text-[7px] md:text-[9px] font-black uppercase tracking-wider ${user.role === 'admin'
              ? 'iron-metal-bg text-white'
              : 'bg-black/5 dark:bg-white/5 text-[var(--color-text-muted)] border border-[var(--apple-border)]'
              }`}>
              {user.role === 'admin' ? 'admin' : 'student'}
            </span>
          </div>
        </div>

        {/* Group Info — Compact grid */}
        {group && (
          <div className="grid grid-cols-2 gap-2 md:gap-3 pt-3 md:pt-6 border-t border-[var(--apple-border)]">
            <InfoCard icon={Building2} label="Институт" value={group.program?.direction?.institute?.name} />
            <InfoCard icon={BookOpen} label="Направление" value={group.program?.direction?.name} />
            <InfoCard icon={GraduationCap} label="Программа" value={group.program?.name} />
            <InfoCard icon={Users} label="Группа" value={`${group.name} · ${group.course} курс`} />
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="space-y-2 md:space-y-3 mb-3 md:mb-8">
        {/* Change Group */}
        <button
          onClick={async () => {
            analytics.trackButtonClick('change_group_btn', 'Сменить группу', 'profile');
            localStorage.removeItem('impera_skip_group');
            try {
              await api.put('/user/group', { groupId: null });
              // Update state directly instead of window.location.reload()
              // reload() can crash Telegram Mini App WebView
              updateUser({ ...user!, groupId: undefined, group: undefined } as any);
            } catch (err) {
              console.error('Failed to reset group:', err);
            }
          }}
          className="w-full flex items-center gap-3 md:gap-5 p-3 md:p-5 rounded-2xl md:rounded-[28px] bg-black/[0.03] dark:bg-white/[0.04] border border-[var(--apple-border)] active:scale-[0.98] transition-transform duration-200 group"
        >
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-black/5 dark:bg-white/5 flex items-center justify-center text-[var(--color-text-muted)] group-active:iron-metal-bg group-active:text-white transition-colors flex-shrink-0 overflow-hidden">
            <RefreshCw className="w-5 h-5 md:w-6 md:h-6" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-[13px] md:text-sm font-black text-[var(--color-text-main)] tracking-tight">Сменить группу</p>
            <p className="text-[9px] md:text-[10px] font-bold text-[var(--color-text-muted)] opacity-50 uppercase tracking-wider">Выбрать другую учебную группу</p>
          </div>
          <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)] opacity-30 flex-shrink-0" />
        </button>

        {/* Feedback */}
        <button
          onClick={() => {
            analytics.trackButtonClick('feedback_btn', 'Обратная связь', 'profile');
            setFeedbackOpen(true);
          }}
          className="w-full flex items-center gap-3 md:gap-5 p-3 md:p-5 rounded-2xl md:rounded-[28px] bg-black/[0.03] dark:bg-white/[0.04] border border-[var(--apple-border)] active:scale-[0.98] transition-transform duration-200 group"
        >
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-black/5 dark:bg-white/5 flex items-center justify-center text-[var(--color-text-muted)] group-active:iron-metal-bg group-active:text-white transition-colors flex-shrink-0 overflow-hidden">
            <MessageSquare className="w-5 h-5 md:w-6 md:h-6" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-[13px] md:text-sm font-black text-[var(--color-text-main)] tracking-tight">Обратная связь</p>
            <p className="text-[9px] md:text-[10px] font-bold text-[var(--color-text-muted)] opacity-50 uppercase tracking-wider">Помогите улучшить приложение</p>
          </div>
          <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)] opacity-30 flex-shrink-0" />
        </button>

        {/* Notifications */}
        <ToggleRow
          icon={Bell}
          label="Уведомления о парах"
          desc="За 15 мин до начала"
          enabled={user.notifyBefore}
          onChange={() => toggleNotify('notifyBefore')}
          disabled={saving}
        />
        <ToggleRow
          icon={BellOff}
          label="Изменения расписания"
          desc="Мгновенно при обновлении"
          enabled={user.notifyChanges}
          onChange={() => toggleNotify('notifyChanges')}
          disabled={saving}
        />

        {/* Theme Toggle */}
        <ToggleRow
          icon={theme === 'dark' ? Moon : Sun}
          label={theme === 'dark' ? 'Тёмная тема' : 'Светлая тема'}
          desc={theme === 'dark' ? 'Carbon Black' : 'Premium Light'}
          enabled={theme === 'dark'}
          onChange={toggleTheme}
        />
      </div>

      {/* Blocked Users */}
      {blockedLoaded && blockedUsers.length > 0 && (
        <div className="mb-3 md:mb-8">
          <div className="flex items-center gap-2 mb-2 px-1">
            <ShieldBan className="w-3.5 h-3.5 text-[var(--color-text-muted)] opacity-50" />
            <span className="text-[9px] font-black uppercase tracking-[0.12em] text-[var(--color-text-muted)] opacity-50">
              Скрытые пользователи ({blockedUsers.length})
            </span>
          </div>
          <div className="space-y-1.5">
            {blockedUsers.map(bu => (
              <div key={bu.id} className="flex items-center gap-3 p-3 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-[var(--apple-border)]">
                <div className="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0">
                  <ShieldBan className="w-4 h-4 text-red-500/60" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-[var(--color-text-main)]">
                    {bu.firstName}{bu.lastName ? ` ${bu.lastName}` : ''}
                  </p>
                  <p className="text-[9px] text-[var(--color-text-muted)] opacity-50">Заметки скрыты</p>
                </div>
                <button
                  onClick={async () => {
                    try {
                      await api.delete(`/user/block/${bu.id}`);
                      setBlockedUsers(prev => prev.filter(u => u.id !== bu.id));
                    } catch (e) {
                      console.error('Unblock error:', e);
                    }
                  }}
                  className="px-3 py-1.5 rounded-xl bg-[var(--color-primary-apple)]/10 text-[var(--color-primary-apple)] dark:text-[var(--color-primary-apple-dark)] text-[9px] font-bold active:scale-95 transition-transform"
                >
                  Разблокировать
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Logout */}
      <button
        onClick={() => {
          analytics.trackButtonClick('logout_btn', 'Выйти из аккаунта', 'profile');
          logout();
        }}
        className="w-full flex items-center gap-3 p-3 md:p-5 rounded-2xl md:rounded-[28px] bg-rose-500/5 border border-rose-500/15 active:bg-rose-500 active:text-white active:scale-[0.98] transition-all duration-200 group"
      >
        <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500 group-active:bg-white/20 group-active:text-white transition-colors flex-shrink-0">
          <LogOut className="w-5 h-5 md:w-6 md:h-6" />
        </div>
        <span className="text-[13px] md:text-sm font-black text-rose-500 group-active:text-white tracking-tight">Выйти из аккаунта</span>
      </button>

      <FeedbackModal isOpen={feedbackOpen} onClose={() => setFeedbackOpen(false)} />

      {/* Avatar Picker */}
      {avatarPickerOpen && (
        <AvatarPickerModal
          currentAvatarId={user.avatarId || 0}
          firstName={user.firstName}
          onSelect={async (avatarId) => {
            const data = await api.put<{ user: UserType }>('/user/avatar', { avatarId });
            updateUser(data.user);
            analytics.trackEvent('avatar_change', 'profile', avatarId);
          }}
          onClose={() => setAvatarPickerOpen(false)}
        />
      )}
    </div>
  );
}

function InfoCard({ icon: Icon, label, value }: { icon: any; label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-1.5 p-2.5 md:p-4 rounded-xl md:rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-[var(--apple-border)]">
      <div className="flex items-center gap-1.5">
        <Icon className="w-3 h-3 md:w-4 md:h-4 text-[var(--color-primary-apple)] flex-shrink-0" />
        <span className="text-[8px] md:text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-wider opacity-50">{label}</span>
      </div>
      <p className="text-[11px] md:text-sm font-bold text-[var(--color-text-main)] leading-snug lowercase line-clamp-2">{value}</p>
    </div>
  );
}

function ToggleRow({ icon: Icon, label, desc, enabled, onChange, disabled }: {
  icon: any; label: string; desc: string; enabled: boolean; onChange: () => void; disabled?: boolean;
}) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      className="w-full flex items-center gap-3 md:gap-5 p-3 md:p-5 rounded-2xl md:rounded-[28px] bg-black/[0.03] dark:bg-white/[0.04] border border-[var(--apple-border)] active:scale-[0.98] transition-transform duration-200 disabled:opacity-50"
    >
      <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center transition-colors duration-300 flex-shrink-0 overflow-hidden ${enabled ? 'iron-metal-bg text-white' : 'bg-black/5 dark:bg-white/5 text-[var(--color-text-muted)]'}`}>
        <Icon className="w-5 h-5 md:w-6 md:h-6" />
      </div>
      <div className="flex-1 text-left min-w-0">
        <p className="text-[13px] md:text-sm font-black text-[var(--color-text-main)] tracking-tight">{label}</p>
        <p className="text-[9px] md:text-[10px] font-bold text-[var(--color-text-muted)] opacity-50 uppercase tracking-wider truncate">{desc}</p>
      </div>
      {/* Toggle pill */}
      <div className={`w-11 h-6 md:w-12 md:h-7 rounded-full transition-colors duration-300 relative flex-shrink-0 ${enabled ? 'iron-metal-bg' : 'bg-zinc-300 dark:bg-zinc-700'}`}>
        <div className={`w-5 h-5 md:w-5.5 md:h-5.5 rounded-full bg-white shadow-md transition-all duration-300 absolute top-0.5 ${enabled ? 'left-[22px] md:left-[24px]' : 'left-0.5'}`} />
      </div>
    </button>
  );
}
