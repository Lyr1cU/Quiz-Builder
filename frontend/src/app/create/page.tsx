'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CreateQuizForm } from '@/components/CreateQuizForm';
import { PageHero } from '@/components/PageHero';
import { QuizGeneratePanel } from '@/components/QuizGeneratePanel';
import { QuizJsonImportPanel } from '@/components/QuizJsonImportPanel';
import { useAuth } from '@/context/AuthContext';
import { draftToFormValues } from '@/lib/quizFormUtils';
import type { QuizDraftResponse } from '@/types/quiz';

type Tab = 'manual' | 'text' | 'json';
type Step = 'source' | 'preview';

export default function CreatePage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [tab, setTab] = useState<Tab>('manual');
  const [step, setStep] = useState<Step>('source');
  const [preview, setPreview] = useState<QuizDraftResponse | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  function handleDraftReady(result: QuizDraftResponse) {
    setPreview(result);
    setStep('preview');
  }

  function resetPreview() {
    setPreview(null);
    setStep('source');
  }

  if (loading || !user) {
    return <p className="text-center text-sm text-white/80">Loading…</p>;
  }

  const tabBtn = (id: Tab, label: string) => (
    <button
      type="button"
      onClick={() => {
        setTab(id);
        resetPreview();
      }}
      className={`rounded-full px-5 py-2.5 text-sm font-semibold transition-colors ${
        tab === id && step === 'source'
          ? 'bg-white text-[var(--ink)] shadow'
          : 'text-white/90 hover:bg-white/15'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div>
      <PageHero
        title={step === 'preview' ? 'Review quiz' : 'Create quiz'}
        subtitle={
          step === 'preview'
            ? 'Edit the draft, then create your quiz.'
            : 'Build manually, generate from a text file or notes, or import JSON.'
        }
        light
      />

      {step === 'source' && (
        <div className="animate-in mb-6 flex flex-wrap gap-2">{tabBtn('manual', 'Manual')}{tabBtn('text', 'From text')}{tabBtn('json', 'From JSON')}</div>
      )}

      {step === 'preview' && preview ? (
        <CreateQuizForm
          key="preview"
          mode="import"
          initialValues={draftToFormValues(preview.draft)}
          importValidation={preview.validation}
          onCancel={resetPreview}
        />
      ) : tab === 'manual' ? (
        <CreateQuizForm key="manual" />
      ) : tab === 'text' ? (
        <QuizGeneratePanel key="text" onGenerated={handleDraftReady} />
      ) : (
        <QuizJsonImportPanel key="json" onImported={handleDraftReady} />
      )}
    </div>
  );
}
