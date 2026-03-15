/**
 * UserAvatar — renders one of 8 character avatars (by Dasha)
 * avatarId 0 = fallback letter, 1–8 = PNG avatars from /avatars/
 *
 * Put Dasha's avatar PNGs in client/public/avatars/ as:
 *   1.png, 2.png, 3.png, 4.png, 5.png, 6.png, 7.png, 8.png
 */

export interface AvatarPreset {
  id: number;
  name: string;
}

// 8 avatars — names match Dasha's designs (left to right, top to bottom)
export const AVATAR_PRESETS: AvatarPreset[] = [
  { id: 1, name: 'Баблс' },
  { id: 2, name: 'Старк' },
  { id: 3, name: 'Блюи' },
  { id: 4, name: 'Зигги' },
  { id: 5, name: 'Минт' },
  { id: 6, name: 'Кубик' },
  { id: 7, name: 'Арчи' },
  { id: 8, name: 'Лимон' },
];

/** Get the public URL for an avatar PNG */
export function getAvatarUrl(avatarId: number): string {
  return `/avatars/${avatarId}.png`;
}

interface UserAvatarProps {
  avatarId: number;
  firstName: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
}

const SIZE_MAP = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-14 h-14 md:w-28 md:h-28 text-xl md:text-5xl',
  lg: 'w-20 h-20 md:w-32 md:h-32 text-3xl md:text-6xl',
};

export default function UserAvatar({ avatarId, firstName, size = 'md', className = '', onClick }: UserAvatarProps) {
  const hasAvatar = avatarId >= 1 && avatarId <= 8;

  if (!hasAvatar) {
    // Fallback: letter avatar
    return (
      <div
        onClick={onClick}
        className={`${SIZE_MAP[size]} rounded-2xl ${size === 'md' ? 'md:squircle' : 'squircle'} iron-metal-bg flex items-center justify-center text-white font-black shadow-lg ${size === 'md' ? 'md:shadow-2xl' : 'shadow-2xl'} border border-white/10 overflow-hidden flex-shrink-0 ${onClick ? 'cursor-pointer active:scale-95 transition-transform' : ''} ${className}`}
      >
        {firstName[0]}
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={`${SIZE_MAP[size]} rounded-2xl ${size === 'md' ? 'md:squircle' : 'squircle'} overflow-hidden flex-shrink-0 border border-white/10 shadow-lg ${size === 'md' ? 'md:shadow-2xl' : 'shadow-2xl'} ${onClick ? 'cursor-pointer active:scale-95 transition-transform hover:scale-105' : ''} ${className}`}
    >
      <img
        src={getAvatarUrl(avatarId)}
        alt={AVATAR_PRESETS.find(a => a.id === avatarId)?.name || 'Avatar'}
        className="w-full h-full object-cover"
        draggable={false}
      />
    </div>
  );
}
