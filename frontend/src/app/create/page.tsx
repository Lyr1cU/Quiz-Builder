'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('create');
  const tc = useTranslations('common');
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
    return <p className="text-center text-sm text-white/80">{tc('loading')}</p>;
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
        title={step === 'preview' ? t('reviewTitle') : t('title')}
        subtitle={step === 'preview' ? t('reviewSubtitle') : t('subtitle')}
        light
      />

      {step === 'source' && (
        <div className="animate-in mb-6 flex flex-wrap gap-2">
          {tabBtn('manual', t('tabManual'))}
          {tabBtn('text', t('tabText'))}
          {tabBtn('json', t('tabJson'))}
        </div>
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
