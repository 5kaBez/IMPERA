import { useState } from 'react';
import { X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AVATAR_PRESETS, getAvatarUrl } from './UserAvatar';
import UserAvatar from './UserAvatar';

interface AvatarPickerModalProps {
  currentAvatarId: number;
  firstName: string;
  onSelect: (avatarId: number) => Promise<void>;
  onClose: () => void;
}

export default function AvatarPickerModal({ currentAvatarId, firstName, onSelect, onClose }: AvatarPickerModalProps) {
  const [selected, setSelected] = useState(currentAvatarId);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (selected === currentAvatarId) { onClose(); return; }
    setSaving(true);
    try {
      await onSelect(selected);
      onClose();
    } catch {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[10000] flex items-end md:items-center justify-center"
        onClick={onClose}
      >
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

        {/* Modal */}
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-md mx-4 mb-4 md:mb-0 rounded-3xl bg-[var(--color-bg-apple)] border border-[var(--apple-border)] shadow-2xl overflow-y-auto max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--apple-border)]">
            <h3 className="text-lg font-black text-[var(--color-text-main)] tracking-tight lowercase">
              выбери аватарку
            </h3>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Preview */}
          <div className="flex justify-center py-5 bg-black/[0.02] dark:bg-white/[0.02]">
            <UserAvatar avatarId={selected} firstName={firstName} size="lg" />
          </div>

          {/* Grid */}
          <div className="px-5 py-4">
            <div className="grid grid-cols-4 gap-3">
              {/* Letter fallback option */}
              <button
                onClick={() => setSelected(0)}
                className={`relative aspect-square rounded-2xl overflow-hidden border-2 transition-all duration-200 active:scale-90 ${
                  selected === 0
                    ? 'border-[var(--color-primary-apple)] shadow-lg scale-105'
                    : 'border-transparent hover:border-[var(--apple-border)]'
                }`}
              >
                <div className="w-full h-full iron-metal-bg flex items-center justify-center text-white text-xl font-black">
                  {firstName[0]}
                </div>
                {selected === 0 && (
                  <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-[var(--color-primary-apple)] flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </button>

              {/* 8 character avatars — real PNGs */}
              {AVATAR_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => setSelected(preset.id)}
                  className={`relative aspect-square rounded-2xl overflow-hidden border-2 transition-all duration-200 active:scale-90 ${
                    selected === preset.id
                      ? 'border-[var(--color-primary-apple)] shadow-lg scale-105'
                      : 'border-transparent hover:border-[var(--apple-border)]'
                  }`}
                >
                  <img
                    src={getAvatarUrl(preset.id)}
                    alt={preset.name}
                    className="w-full h-full object-cover"
                    draggable={false}
                  />
                  {selected === preset.id && (
                    <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-[var(--color-primary-apple)] flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>

            <p className="text-center text-[9px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider opacity-50 mt-3">
              {selected === 0 ? 'Буква имени' : AVATAR_PRESETS.find(a => a.id === selected)?.name}
            </p>
          </div>

          {/* Actions */}
          <div className="px-5 pb-5 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl text-[12px] font-black uppercase tracking-wider text-[var(--color-text-muted)] bg-black/[0.03] dark:bg-white/[0.04] border border-[var(--apple-border)] active:scale-95 transition-transform"
            >
              Отмена
            </button>
            <button
              onClick={handleSave}
              disabled={saving || selected === currentAvatarId}
              className="flex-1 py-3 rounded-2xl text-[12px] font-black uppercase tracking-wider text-white iron-metal-bg shadow-lg active:scale-95 transition-transform disabled:opacity-40"
            >
              {saving ? 'Сохраняю...' : 'Выбрать'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
