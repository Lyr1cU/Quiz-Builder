'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Download } from 'lucide-react';
import { QuestionReadonly } from '@/components/QuestionReadonly';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/context/AuthContext';
import { ApiError, api } from '@/services/api';
import type { Quiz } from '@/types/quiz';

export default function QuizDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get('invite')?.trim() || undefined;
  const id = params.id;
  const { user } = useAuth();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);
  const [pdfMessage, setPdfMessage] = useState<string | null>(null);
  const pdfBusyRef = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNotFound(false);
    try {
      const data = await api.getQuiz(id);
      setQuiz(data);
    } catch (err) {
      const missing = err instanceof ApiError && err.status === 404;
      // Private quiz opened by an invited guest: the id route 404s, the token still works.
      if (missing && inviteToken) {
        try {
          setQuiz(await api.getQuizByInvite(inviteToken));
          return;
        } catch {
          setNotFound(true);
          return;
        }
      }
      if (missing) {
        setNotFound(true);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load quiz');
      }
    } finally {
      setLoading(false);
    }
  }, [id, inviteToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const isOwner = Boolean(user && quiz && user.id === quiz.ownerId);
  const showAnswers = isOwner;
  const inviteQuery = inviteToken ? `?invite=${encodeURIComponent(inviteToken)}` : '';
  const playHref = inviteToken
    ? `/quizzes/invite/${encodeURIComponent(inviteToken)}/play`
    : `/quizzes/${id}/play`;
  const inviteUrl = useMemo(() => {
    if (!quiz?.inviteToken || typeof window === 'undefined') return null;
    return `${window.location.origin}/quizzes/invite/${quiz.inviteToken}`;
  }, [quiz?.inviteToken]);

  async function copyInvite() {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setInviteMessage('Invite link copied');
    } catch {
      setInviteMessage(inviteUrl);
    }
  }

  async function regenerateInvite() {
    if (!quiz) return;
    setInviteBusy(true);
    setInviteMessage(null);
    try {
      const { inviteToken } = await api.regenerateInvite(quiz.id);
      setQuiz({ ...quiz, inviteToken });
      setInviteMessage('New invite link generated');
    } catch (err) {
      setInviteMessage(err instanceof Error ? err.message : 'Failed to regenerate link');
    } finally {
      setInviteBusy(false);
    }
  }

  async function revokeInvite() {
    if (!quiz) return;
    if (!confirm('Revoke the current invite link? Old links will stop working.')) return;
    setInviteBusy(true);
    setInviteMessage(null);
    try {
      await api.revokeInvite(quiz.id);
      setQuiz({ ...quiz, inviteToken: null });
      setInviteMessage('Invite link revoked');
    } catch (err) {
      setInviteMessage(err instanceof Error ? err.message : 'Failed to revoke link');
    } finally {
      setInviteBusy(false);
    }
  }

  async function downloadPdf(kind: 'worksheet' | 'answers') {
    if (!quiz || pdfBusyRef.current) return;
    pdfBusyRef.current = true;
    setPdfMessage(null);
    try {
      if (kind === 'worksheet') await api.downloadWorksheetPdf(quiz.id);
      else await api.downloadAnswersPdf(quiz.id);
    } catch (err) {
      setPdfMessage(err instanceof Error ? err.message : 'Failed to download PDF');
    } finally {
      pdfBusyRef.current = false;
    }
  }

  return (
    <div>
      <Link
        href="/quizzes"
        className="text-sm font-medium text-[var(--gold-from)] transition hover:text-[var(--gold-to)]"
      >
        ← Back to quizzes
      </Link>

      {loading && <p className="mt-6 text-sm text-white/80">Loading…</p>}

      {!loading && notFound && (
        <div className="surface-card mt-6 px-5 py-4 text-sm text-amber-800">
          Quiz not found or you do not have access.
        </div>
      )}

      {!loading && error && (
        <div className="surface-card mt-6 px-5 py-4 text-sm text-[var(--danger)]">{error}</div>
      )}

      {!loading && quiz && (
        <div className="mt-6">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--gold-from)]">
              Quiz detail
            </p>
            <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium text-white/85">
              {quiz.visibility === 'PRIVATE' ? 'Private' : 'Public'}
            </span>
          </div>
          <h1 className="mt-2 font-serif text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            {quiz.title}
          </h1>
          {quiz.description && (
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-white/75">
              {quiz.description}
            </p>
          )}
          <p className="mt-2 text-sm text-white/70">
            {quiz.questions.length} question{quiz.questions.length === 1 ? '' : 's'}
            {showAnswers ? ' · answers visible (owner)' : ' · answers hidden'}
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href={playHref}
              className="gold-btn inline-flex rounded-full px-6 py-3 text-sm font-semibold"
            >
              Start practice
            </Link>
            {isOwner && (
              <Link
                href={`/quizzes/${quiz.id}/edit`}
                className="btn-motion inline-flex rounded-full border border-white/30 bg-white/10 px-5 py-3 text-sm font-medium text-white"
              >
                Edit quiz
              </Link>
            )}
            {user && (
              <Link
                href={`/quizzes/${quiz.id}/attempts${inviteQuery}`}
                className="btn-motion inline-flex rounded-full border border-white/30 bg-white/10 px-5 py-3 text-sm font-medium text-white"
              >
                My attempts
              </Link>
            )}
            {(quiz.visibility === 'PUBLIC' || isOwner) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="btn-motion inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-5 py-3 text-sm font-medium text-white"
                  >
                    <Download className="size-4" aria-hidden />
                    Download
                    <ChevronDown className="size-4 opacity-80" aria-hidden />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-56 rounded-xl p-1.5">
                  <DropdownMenuGroup>
                    <DropdownMenuItem
                      className="cursor-pointer rounded-lg px-3 py-2.5"
                      onSelect={() => void downloadPdf('worksheet')}
                    >
                      Download worksheet PDF
                    </DropdownMenuItem>
                    {isOwner && (
                      <DropdownMenuItem
                        className="cursor-pointer rounded-lg px-3 py-2.5"
                        onSelect={() => void downloadPdf('answers')}
                      >
                        Download answers PDF
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          {pdfMessage && <p className="mt-2 text-sm text-red-200">{pdfMessage}</p>}

          {isOwner && quiz.visibility === 'PRIVATE' && (
            <div className="surface-card mt-6 space-y-3 px-5 py-4">
              <p className="text-sm font-semibold text-[var(--ink)]">Invite link</p>
              <p className="text-sm text-muted-foreground">
                Guests with this link can open the quiz (without answers). Regenerate to invalidate
                old links.
              </p>
              {inviteUrl ? (
                <p className="break-all rounded-xl bg-[#efeae2] px-3 py-2 text-xs text-[var(--ink)]">
                  {inviteUrl}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">No active invite link.</p>
              )}
              <div className="flex flex-wrap gap-2">
                {inviteUrl && (
                  <button
                    type="button"
                    onClick={() => void copyInvite()}
                    className="rounded-full bg-[var(--teal)] px-4 py-2 text-sm font-medium text-white"
                  >
                    Copy link
                  </button>
                )}
                <button
                  type="button"
                  disabled={inviteBusy}
                  onClick={() => void regenerateInvite()}
                  className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-medium text-[var(--ink)] disabled:opacity-50"
                >
                  {inviteUrl ? 'Regenerate' : 'Create invite link'}
                </button>
                {inviteUrl && (
                  <button
                    type="button"
                    disabled={inviteBusy}
                    onClick={() => void revokeInvite()}
                    className="rounded-full border border-[var(--danger)] bg-white px-4 py-2 text-sm font-medium text-[var(--danger)] disabled:opacity-50"
                  >
                    Revoke
                  </button>
                )}
              </div>
              {inviteMessage && (
                <p className="text-sm text-muted-foreground">{inviteMessage}</p>
              )}
            </div>
          )}

          <div className="surface-card mt-8 overflow-hidden">
            <div className="h-8 bg-[#e8dfd0]" />
            <div className="px-5 sm:px-7">
              {quiz.questions.map((q, i) => (
                <QuestionReadonly
                  key={q.id}
                  question={q}
                  index={i}
                  showAnswers={showAnswers}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
