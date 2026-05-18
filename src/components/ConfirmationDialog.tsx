import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = 'danger'
}: ConfirmationDialogProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-card w-full max-w-sm border border-border rounded-2xl shadow-2xl relative z-10 overflow-hidden"
          >
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-lg",
                  variant === 'danger' ? "bg-destructive/10 text-destructive" :
                  variant === 'warning' ? "bg-amber-500/10 text-amber-500" :
                  "bg-primary/10 text-primary"
                )}>
                  {variant === 'danger' ? <Trash2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                </div>
                <h3 className="text-lg font-bold">{title}</h3>
              </div>
              <p className="text-sm text-muted-foreground">{description}</p>
              
              <div className="flex gap-3 pt-2">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-border rounded-xl hover:bg-secondary transition-colors text-sm font-bold"
                >
                  {cancelText}
                </button>
                <button
                  onClick={() => {
                    onConfirm();
                  }}
                  className={cn(
                    "flex-1 px-4 py-2 text-white rounded-xl font-bold transition-opacity shadow-lg text-sm",
                    variant === 'danger' ? "bg-destructive shadow-destructive/20" :
                    variant === 'warning' ? "bg-amber-500 shadow-amber-500/20" :
                    "bg-primary shadow-primary/20"
                  )}
                >
                  {confirmText}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
