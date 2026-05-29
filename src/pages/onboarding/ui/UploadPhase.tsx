import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/shared/ui/Button';

export type UploadChoice = 'file' | 'any_format' | 'demo';

interface UploadOption {
  id: UploadChoice;
  emoji: string;
  title: string;
  desc: string;
}

const OPTIONS: UploadOption[] = [
  { id: 'file', emoji: '📄', title: 'Брошу файл / вставлю текст', desc: 'Выписка из банка или просто текст' },
  { id: 'any_format', emoji: '🖼️', title: 'CSV, скриншот, любой формат', desc: 'Распознаем данные автоматически' },
  { id: 'demo', emoji: '✨', title: 'Начну с демо-данных', desc: 'Посмотрю, как всё работает, сначала' },
];

export const UploadPhase = ({ onContinue }: { onContinue: (choice: UploadChoice) => void }) => {
  const [choice, setChoice] = useState<UploadChoice | null>(null);
  const [fileName, setFileName] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex-1 flex flex-col px-6 pt-14 pb-8 overflow-y-auto">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-6 flex-1">
        <div>
          <div className="text-4xl mb-3">📥</div>
          <h2 className="text-2xl font-bold text-text-primary mb-2 leading-tight">
            Подключим ваши финансы
          </h2>
          <p className="text-text-secondary text-sm">
            Чтобы анализ был точным, добавьте данные о тратах — или начните с демо.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {OPTIONS.map(opt => {
            const active = choice === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => {
                  setChoice(opt.id);
                  if (opt.id !== 'demo') fileRef.current?.click();
                }}
                className={`flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all duration-200 ${active
                  ? 'border-primary bg-primary-light shadow-md shadow-primary/10'
                  : 'border-border bg-bg-muted hover:border-primary/30'}`}
              >
                <span className="text-3xl">{opt.emoji}</span>
                <div className="flex-1">
                  <p className="font-semibold text-text-primary text-[15px] leading-tight">{opt.title}</p>
                  <p className="text-xs text-text-tertiary mt-0.5">{opt.desc}</p>
                </div>
              </button>
            );
          })}
        </div>

        {fileName && (
          <div className="flex items-center gap-2 text-sm text-success bg-success-light rounded-xl p-3">
            <span>✅</span>
            <span className="font-medium truncate">{fileName}</span>
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          className="hidden"
          onChange={e => {
            const f = e.target.files?.[0];
            if (f) setFileName(f.name);
          }}
        />

        <div className="mt-auto pt-2">
          <Button size="lg" fullWidth onClick={() => onContinue(choice!)} disabled={!choice}>
            {choice === 'demo' ? 'Запустить с демо-данными' : 'Проанализировать'}
          </Button>
        </div>
      </motion.div>
    </div>
  );
};
