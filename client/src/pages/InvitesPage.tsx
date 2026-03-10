import { useState } from 'react';
import { InviteCodes } from '../components/InviteCodes';

export default function InvitesPage() {
  return (
    <div className="pb-4">
      {/* Header */}
      <div className="mb-3 md:mb-8">
        <h1 className="text-2xl md:text-5xl font-black metallic-text tracking-[-0.06em] mb-1 lowercase">
          инвайт-коды
        </h1>
        <p className="text-[var(--color-text-muted)] font-black uppercase tracking-widest text-[8px] md:text-[11px] opacity-70">Приглашайте друзей и получайте награды &bull; Вирусный рост</p>
      </div>

      {/* Info Card */}
      <div className="rounded-2xl md:rounded-[40px] bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/30 p-4 md:p-6 mb-6">
        <h2 className="font-bold text-blue-900 dark:text-blue-200 mb-2">Как это работает?</h2>
        <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1 list-disc pl-4">
          <li>Создавайте уникальные инвайт-коды для друзей</li>
          <li>Каждый друг может использовать код один раз при регистрации</li>
          <li>Отслеживайте, сколько друзей вы пригласили</li>
          <li>Получите бонусы и преимущества за активные приглашения</li>
        </ul>
      </div>

      {/* Invite Codes Component */}
      <InviteCodes />
    </div>
  );
}
