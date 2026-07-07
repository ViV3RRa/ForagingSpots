import { Plus } from 'lucide-react';

interface FloatingActionButtonProps {
  onClick: () => void;
}

export default function FloatingActionButton({ onClick }: FloatingActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Tilføj fund"
      className="absolute bottom-[calc(env(safe-area-inset-bottom,0px)+20px)] right-[22px] z-10 flex size-[60px] items-center justify-center rounded-full bg-accent text-accent-ink shadow-[0_8px_22px_-4px_var(--accent)] transition-transform active:scale-95"
    >
      <Plus className="size-[28px]" strokeWidth={1.5} />
    </button>
  );
}
