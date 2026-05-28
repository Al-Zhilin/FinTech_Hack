import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export const BottomSheet = ({ open, onClose, title, children }: BottomSheetProps) => {
  useEffect(() => {
    if (open) {
      const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[400] flex items-end justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={onClose}
          />

          {/* Sheet — constrained to mobile frame */}
          <motion.div
            className="relative w-full max-w-mobile bg-white rounded-t-3xl px-5 pt-3 pb-8 shadow-card-hover"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 34 }}
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 32px)' }}
          >
            {/* Grabber */}
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />

            {title && (
              <h3 className="text-lg font-bold text-text-primary mb-4">{title}</h3>
            )}

            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
