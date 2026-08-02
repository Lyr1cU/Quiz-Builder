'use client';

import Link from 'next/link';
import { useState } from 'react';
import { History, List, MoreHorizontal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/services/api';
import type { QuizListItem } from '@/types/quiz';
import { cn } from '@/lib/utils';

type Props = {
  quiz: QuizListItem;
  onDeleted: (id: string) => void;
  animationDelay?: string;
};

function formatUpdated(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Last updated recently';

  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (days <= 0) return 'Last updated today';
  if (days === 1) return 'Last updated 1 day ago';
  if (days < 30) return `Last updated ${days} days ago`;
  return `Last updated ${date.toLocaleDateString()}`;
}

export function QuizListItemCard({ quiz, onDeleted, animationDelay }: Props) {
  const { user } = useAuth();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canManage = Boolean(user && quiz.ownerId && user.id === quiz.ownerId);
  const isPublic = quiz.visibility === 'PUBLIC';

  async function handleDelete() {
    if (!confirm(`Delete quiz "${quiz.title}"?`)) return;

    setDeleting(true);
    setError(null);
    try {
      await api.deleteQuiz(quiz.id);
      onDeleted(quiz.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
      setDeleting(false);
    }
  }

  return (
    <li className="stagger-item list-none" style={animationDelay ? { animationDelay } : undefined}>
      <Card className="surface-card-interactive gap-0 py-0">
        <CardContent className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <Link
                href={`/quizzes/${quiz.id}`}
                className="font-serif text-[1.35rem] font-bold leading-tight text-[#1a1d27] hover:underline"
              >
                {quiz.title}
              </Link>
              <Badge
                className={cn(
                  'rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em]',
                  isPublic
                    ? 'bg-[#5eb8c0] text-white hover:bg-[#5eb8c0]'
                    : 'bg-[#e8e2d8] text-[#4a4a4a] hover:bg-[#e8e2d8]',
                )}
              >
                {isPublic ? 'Public' : 'Private'}
              </Badge>
            </div>

            {quiz.description ? (
              <p className="mt-2 line-clamp-2 text-[0.95rem] leading-snug text-[#4a4a4a]">
                {quiz.description}
              </p>
            ) : null}

            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[0.8125rem] text-[#757575]">
              <span className="inline-flex items-center gap-1.5">
                <List className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
                {quiz.questionsCount} Question{quiz.questionsCount === 1 ? '' : 's'}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <History className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
                {formatUpdated(quiz.createdAt)}
              </span>
            </div>

            {error && <p className="mt-1 text-sm text-destructive">{error}</p>}
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
            <Button asChild variant="tealOutline" size="sm" className="btn-motion">
              <Link href={`/quizzes/${quiz.id}`}>Open</Link>
            </Button>
            <Button asChild variant="gold" size="sm">
              <Link href={`/quizzes/${quiz.id}/play`}>Practice</Link>
            </Button>
            {canManage && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    className="btn-motion rounded-full bg-white"
                    aria-label="More actions"
                    disabled={deleting}
                  >
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-36 rounded-xl p-1.5">
                  <DropdownMenuGroup>
                    <DropdownMenuItem asChild className="cursor-pointer rounded-lg px-3 py-2">
                      <Link href={`/quizzes/${quiz.id}/edit`}>Edit</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      className="cursor-pointer rounded-lg px-3 py-2"
                      disabled={deleting}
                      onSelect={() => void handleDelete()}
                    >
                      {deleting ? 'Deleting…' : 'Delete'}
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardContent>
      </Card>
    </li>
  );
}
