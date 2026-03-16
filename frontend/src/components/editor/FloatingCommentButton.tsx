import { IconMessage } from '../../lib/icons';

interface FloatingCommentButtonProps {
  pos: { x: number; y: number };
  onClick: () => void;
}

export default function FloatingCommentButton({ pos, onClick }: FloatingCommentButtonProps) {
  return (
    <button
      onClick={onClick}
      className="fixed z-40 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-white text-sm font-medium shadow-lg hover:bg-accent-hover transition-all"
      style={{ top: pos.y - 40, left: pos.x }}
    >
      <IconMessage className="w-3.5 h-3.5" />
      Comment
    </button>
  );
}
