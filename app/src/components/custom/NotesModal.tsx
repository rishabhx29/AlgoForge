import { X, Save } from 'lucide-react';
import { motion } from 'framer-motion';

interface NotesModalProps {
  problemTitle: string;
  noteContent: string;
  saving: boolean;
  onChange: (value: string) => void;
  onSave: () => void;
  onClose: () => void;
}

/**
 * Shared notes editor modal used by Problems and TopicDetail.
 * Single source of truth for the notes-modal UI (was copy-pasted).
 */
export function NotesModal({
  problemTitle,
  noteContent,
  saving,
  onChange,
  onSave,
  onClose,
}: NotesModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-lg mx-4 glass rounded-2xl p-6 border border-white/10"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Notes</h3>
            <p className="text-sm text-white/40 truncate max-w-[300px]">{problemTitle}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onSave}
              disabled={saving}
              className="px-3 py-1.5 rounded-lg bg-[#a088ff]/20 text-[#a088ff] hover:bg-[#a088ff]/30 transition-colors flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <textarea
          value={noteContent}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Write your notes... Key insights, approach, time complexity, etc."
          rows={10}
          autoFocus
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[#a088ff] resize-none font-mono text-sm"
        />
      </motion.div>
    </div>
  );
}
