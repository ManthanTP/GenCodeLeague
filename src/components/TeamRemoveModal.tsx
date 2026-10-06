import { AlertCircle } from 'lucide-react';
import type { Team, GameState } from '../types/database';

interface TeamRemoveModalProps {
  team: Team;
  gameState: GameState;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function TeamRemoveModal({
  team,
  gameState,
  onConfirm,
  onCancel,
}: TeamRemoveModalProps) {
  return (
    <div className="admin-modal-backdrop modal-backdrop">
      <div className="admin-modal-card modal-card text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-red-950/60 border border-red-800/80 flex items-center justify-center text-[#ff4d5a] mx-auto shadow-[0_0_24px_rgba(255,42,61,0.25)]">
          <AlertCircle size={36} />
        </div>
        <div>
          <h3 className="admin-card-title text-xl justify-center text-white mb-2">Remove Team?</h3>
          <p className="text-sm text-[#8e8e9a] leading-relaxed">
            Are you sure you want to remove <span className="text-white font-bold font-mono">"{team.name}"</span>?
            {gameState !== 'setup' && (
              <span className="block mt-2 text-xs text-[#ff4d5a] bg-red-950/40 border border-red-900/50 p-2 rounded-lg font-mono">
                ⚠️ Warning: This cannot be undone during an ongoing auction round.
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button onClick={onCancel} className="admin-btn-neutral flex-1">
            Cancel
          </button>
          <button onClick={onConfirm} className="admin-btn-destructive flex-1">
            Yes, Remove
          </button>
        </div>
      </div>
    </div>
  );
}
