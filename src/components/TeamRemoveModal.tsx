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
    <div className="modal-backdrop">
      <div className="modal-card">
        <div className="modal-icon-badge">
          <AlertCircle size={44} />
        </div>
        <div>
          <h3 className="modal-title">Remove Team?</h3>
          <p className="modal-desc">
            Are you sure you want to remove <span className="modal-highlight">{team.name}</span>?
            {gameState !== 'setup' && (
              <span className="modal-warning">
                Warning: This cannot be undone during an ongoing auction round.
              </span>
            )}
          </p>
        </div>
        <div className="modal-actions">
          <button onClick={onCancel} className="btn-modal-cancel">
            Cancel
          </button>
          <button onClick={onConfirm} className="btn-modal-confirm">
            Yes, Remove
          </button>
        </div>
      </div>
    </div>
  );
}
