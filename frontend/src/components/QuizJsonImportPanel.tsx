'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { ApiError, api } from '@/services/api';
import { QUIZ_FORMAT_VERSION } from '@/types/quiz';
import type { QuizDraftResponse, QuizImportDraft } from '@/types/quiz';

const MAX_JSON_FILE_BYTES = 512_000;

type Props = {
  onImported: (result: QuizDraftResponse) => void;
};

function parseImportFile(text: string): QuizImportDraft {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Invalid JSON file. Check syntax and try again.');
  }

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('formatVersion' in parsed) ||
    (parsed as { formatVersion: unknown }).formatVersion !== QUIZ_FORMAT_VERSION
  ) {
    throw new Error(`Import file must include formatVersion: ${QUIZ_FORMAT_VERSION}.`);
  }

  return parsed as QuizImportDraft;
}

export function QuizJsonImportPanel({ onImported }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  async function processText(text: string) {
    setError(null);
    setLoading(true);
    try {
      const draft = parseImportFile(text);
      const result = await api.validateQuizImport(draft);
      onImported(result);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to import quiz',
      );
    } finally {
      setLoading(false);
    }
  }

  async function onFile(file: File) {
    if (!file.name.toLowerCase().endsWith('.json')) {
      setError('Please upload a .json file.');
      return;
    }
    if (file.size > MAX_JSON_FILE_BYTES) {
      setError('JSON file is too large. Maximum size is 500 KB.');
      return;
    }
    const text = await file.text();
    await processText(text);
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void onFile(file);
    e.target.value = '';
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void onFile(file);
  }

  return (
    <div className="animate-in animate-in-delay-1 flex flex-col gap-8">
      <div className="surface-card flex flex-col gap-6 px-5 py-7 sm:px-7">
      <p className="text-sm text-muted-foreground">
        Upload a quiz JSON file (format version {QUIZ_FORMAT_VERSION}). You can{' '}
        <Link
          href="/templates/quiz-import-v1.json"
          className="font-medium text-[var(--gold-to)] underline"
          download
        >
          download a template
        </Link>{' '}
        to see the expected structure.
      </p>

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
        className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
          dragOver
            ? 'border-[var(--gold-from)] bg-[#f8f1e0]'
            : 'border-[var(--line)] bg-[#faf8f5] hover:border-[var(--gold-from)]/50'
        }`}
      >
        <p className="text-sm font-semibold text-[var(--ink)]">
          {loading ? 'Validating…' : 'Drop JSON here or click to browse'}
        </p>
          <p className="mt-1 text-xs text-muted-foreground">.json only — up to 500 KB</p>
        <input
          ref={inputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={onInputChange}
        />
      </div>

      {error && <p className="animate-feedback text-sm text-[var(--danger)]">{error}</p>}
      </div>
    </div>
  );
}
