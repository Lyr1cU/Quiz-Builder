'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown, FileText } from 'lucide-react';
import { ApiError, api } from '@/services/api';
import { QUESTION_TYPES } from '@/lib/quizFormUtils';
import type { GenerateQuizPreferences, QuestionType, QuizDraftResponse } from '@/types/quiz';

const MAX_SOURCE_CHARS = 30_000;
const MAX_FILE_BYTES = 512_000;
const MAX_INSTRUCTIONS = 1000;
const TEXT_FILE_EXTENSIONS = ['.txt', '.md', '.markdown'];

type Props = {
  onGenerated: (result: QuizDraftResponse) => void;
};

function isTextStudyFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return TEXT_FILE_EXTENSIONS.some((ext) => name.endsWith(ext));
}

export function QuizGeneratePanel({ onGenerated }: Props) {
  const t = useTranslations('generate');
  const tt = useTranslations('questionTypes');
  const inputRef = useRef<HTMLInputElement>(null);
  const [sourceText, setSourceText] = useState('');
  const [sourceFileName, setSourceFileName] = useState<string | null>(null);
  const [showPrefs, setShowPrefs] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [questionCount, setQuestionCount] = useState('');
  const [types, setTypes] = useState<QuestionType[]>([]);
  const [instructions, setInstructions] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function buildPreferences(): GenerateQuizPreferences | undefined {
    const prefs: GenerateQuizPreferences = {};
    const count = Number(questionCount);
    if (questionCount.trim() && Number.isFinite(count) && count >= 1) {
      prefs.questionCount = Math.min(30, Math.floor(count));
    }
    if (types.length > 0) {
      prefs.types = types;
    }
    if (instructions.trim()) {
      prefs.instructions = instructions.trim();
    }
    return Object.keys(prefs).length > 0 ? prefs : undefined;
  }

  function applySourceText(text: string, fileName?: string) {
    const trimmed = text.trim();
    if (trimmed.length < 50) {
      setError(t('minChars'));
      return;
    }
    if (trimmed.length > MAX_SOURCE_CHARS) {
      setError(
        t('tooLong', {
          length: trimmed.length.toLocaleString(),
          max: MAX_SOURCE_CHARS.toLocaleString(),
        }),
      );
      return;
    }
    setSourceText(text);
    setSourceFileName(fileName ?? null);
    setError(null);
  }

  async function handleFile(file: File) {
    if (!isTextStudyFile(file)) {
      setError(t('uploadHint'));
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError(t('fileTooLarge'));
      return;
    }
    try {
      const text = await file.text();
      applySourceText(text, file.name);
    } catch {
      setError(t('readFailed'));
    }
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
    e.target.value = '';
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  }

  async function handleGenerate() {
    setError(null);
    if (sourceText.trim().length < 50) {
      setError(t('needPaste'));
      return;
    }
    if (sourceText.trim().length > MAX_SOURCE_CHARS) {
      setError(t('exceedsLimit', { max: MAX_SOURCE_CHARS.toLocaleString() }));
      return;
    }
    setLoading(true);
    try {
      const result = await api.generateQuizFromText({
        sourceText: sourceText.trim(),
        preferences: buildPreferences(),
      });
      onGenerated(result);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : t('failed'),
      );
    } finally {
      setLoading(false);
    }
  }

  function toggleType(type: QuestionType) {
    setTypes((prev) =>
      prev.includes(type) ? prev.filter((item) => item !== type) : [...prev, type],
    );
  }

  return (
    <div className="animate-in animate-in-delay-1 flex flex-col gap-8">
      <div className="surface-card flex flex-col gap-6 px-5 py-7 sm:px-7">
        <div>
          <label htmlFor="sourceText" className="mb-2 block text-sm font-semibold text-ink">
            {t('studyLabel')}
          </label>
          <p className="mb-3 text-sm text-muted-foreground">{t('studyHint')}</p>

          <div
            role="button"
            tabIndex={0}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
            }}
            className={`mb-4 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-colors ${
              dragOver
                ? 'border-[var(--gold-from)] bg-[#f8f1e0]'
                : 'border-[var(--line)] bg-[#faf8f5] hover:border-[var(--gold-from)]/50'
            }`}
          >
            <FileText className="mb-2 size-8 text-[var(--gold-to)]" aria-hidden />
            <p className="text-sm font-semibold text-[var(--ink)]">{t('dropTitle')}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t('dropMeta', { max: MAX_SOURCE_CHARS.toLocaleString() })}
            </p>
            <input
              ref={inputRef}
              type="file"
              accept=".txt,.md,.markdown,text/plain,text/markdown"
              className="hidden"
              onChange={onInputChange}
            />
          </div>

          {sourceFileName && (
            <p className="animate-feedback mb-2 text-xs font-medium text-[var(--gold-to)]">
              {t('loaded', {
                name: sourceFileName,
                chars: sourceText.trim().length.toLocaleString(),
              })}
            </p>
          )}

          <textarea
            id="sourceText"
            rows={10}
            value={sourceText}
            onChange={(e) => {
              setSourceText(e.target.value);
              setSourceFileName(null);
              setError(null);
            }}
            className="field-input !rounded-2xl"
            placeholder={t('pastePlaceholder')}
          />
        </div>

        <div>
          <button
            type="button"
            onClick={() => setShowPrefs((v) => !v)}
            className="flex items-center gap-2 text-sm font-semibold text-[var(--ink)]"
          >
            <ChevronDown
              className={`size-4 transition-transform ${showPrefs ? 'rotate-180' : ''}`}
              aria-hidden
            />
            {t('preferences')}
          </button>
          {showPrefs && (
            <div className="animate-in mt-4 space-y-4 border-t border-[var(--line)] pt-4">
              <div>
                <label htmlFor="questionCount" className="mb-2 block text-sm font-medium text-ink">
                  {t('questionCount')}
                </label>
                <input
                  id="questionCount"
                  type="number"
                  min={1}
                  max={30}
                  value={questionCount}
                  onChange={(e) => setQuestionCount(e.target.value)}
                  className="field-input max-w-[8rem]"
                  placeholder={t('questionCountPlaceholder')}
                />
              </div>
              <div>
                <p className="mb-2 text-sm font-medium text-ink">{t('questionTypes')}</p>
                <div className="flex flex-wrap gap-4">
                  {QUESTION_TYPES.map((type) => (
                    <label key={type} className="flex items-center gap-2 text-sm text-ink">
                      <input
                        type="checkbox"
                        checked={types.includes(type)}
                        onChange={() => toggleType(type)}
                        className="accent-[var(--gold-from)]"
                      />
                      {tt(type)}
                    </label>
                  ))}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{t('typesHint')}</p>
              </div>
              <div>
                <label htmlFor="instructions" className="mb-2 block text-sm font-medium text-ink">
                  {t('instructions')}
                </label>
                <textarea
                  id="instructions"
                  rows={3}
                  maxLength={MAX_INSTRUCTIONS}
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  className="field-input !rounded-2xl"
                  placeholder={t('instructionsPlaceholder')}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  {instructions.length}/{MAX_INSTRUCTIONS}
                </p>
              </div>
            </div>
          )}
        </div>

        {error && <p className="animate-feedback text-sm text-[var(--danger)]">{error}</p>}

        <button
          type="button"
          disabled={loading}
          onClick={() => void handleGenerate()}
          className="gold-btn h-12 self-start rounded-full px-10 text-sm font-bold disabled:opacity-50"
        >
          {loading ? t('generating') : t('generate')}
        </button>
      </div>
    </div>
  );
}
