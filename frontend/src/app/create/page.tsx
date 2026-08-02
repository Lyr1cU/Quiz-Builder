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
        subtitle="Add a title and one or more questions (Boolean, Input, Single, or Multiple)."
        light
      />
      <CreateQuizForm />
    </div>
  );
}
