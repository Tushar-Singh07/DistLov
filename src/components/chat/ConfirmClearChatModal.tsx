import React, { useState } from 'react';
import { Trash2, AlertTriangle, X } from 'lucide-react';
import { useChat } from '../../context/ChatContext';

interface ConfirmClearChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string;
  conversationName?: string;
}

export const ConfirmClearChatModal: React.FC<ConfirmClearChatModalProps> = ({
  isOpen,
  onClose,
  conversationId,
  conversationName = 'this conversation',
}) => {
  const { clearChat } = useChat();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    try {
      setIsDeleting(true);
      setError(null);
      await clearChat(conversationId);
      setIsDeleting(false);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to clear chat');
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-dark-panel border border-gray-200 dark:border-gray-800 rounded-3xl p-6 max-w-md w-full shadow-2xl animate-slide-up relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3.5 mb-4 text-red-600 dark:text-red-500">
          <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/60 flex items-center justify-center shrink-0">
            <Trash2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Clear Chat Messages</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Confirmation Required</p>
          </div>
        </div>

        <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-2xl flex items-start gap-2.5 mb-5 text-xs text-amber-800 dark:text-amber-300">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            Are you sure you want to clear this chat with <strong>{conversationName}</strong>? Messages will be cleared <strong>only for you</strong> and will remain visible to {conversationName}.
          </span>
        </div>

        {error && (
          <div className="mb-4 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 p-3 rounded-xl border border-red-200 dark:border-red-900">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isDeleting}
            className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/20 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Clearing...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>Clear Chat for Me</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
