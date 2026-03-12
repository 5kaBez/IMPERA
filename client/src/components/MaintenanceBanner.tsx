import { AlertCircle } from 'lucide-react';

export default function MaintenanceBanner({ message }: { message: string }) {
  if (!message) return null;

  return (
    <div className="fixed left-0 right-0 top-0 md:top-12 lg:top-0 z-[80] px-3 md:px-6 py-2 md:py-2.5 bg-amber-400 text-black shadow-xl border-b border-black/10">
      <div className="max-w-5xl mx-auto flex items-center justify-center gap-2">
        <AlertCircle className="w-4 h-4" />
        <span className="text-[10px] md:text-xs font-black uppercase tracking-[0.18em] text-center">
          {message}
        </span>
      </div>
    </div>
  );
}

