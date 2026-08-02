'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CreateQuizForm } from '@/components/CreateQuizForm';
import { PageHero } from '@/components/PageHero';
import { useAuth } from '@/context/AuthContext';

export default function CreatePage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return <p className="text-center text-sm text-white/80">Loading…</p>;
  }

  return (
    <div>
      <PageHero
        title="Create quiz"
        subtitle="Build a quiz with questions and answers."
        light
      />
      <CreateQuizForm />
    </div>
  );
}
