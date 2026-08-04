export type QuestionType = 'BOOLEAN' | 'INPUT' | 'SINGLE' | 'MULTIPLE';
export type QuizVisibility = 'PUBLIC' | 'PRIVATE';

export type ChoiceOption = {
  id?: string;
  label: string;
  isCorrect?: boolean;
};

export type Question = {
  id: string;
  quizId: string;
  type: QuestionType;
  text: string;
  order: number;
  booleanAnswer: boolean | null;
  inputAnswer: string | null;
  options: ChoiceOption[] | null;
};

export type Quiz = {
  id: string;
  title: string;
  description: string | null;
  createdAt: string;
  ownerId: string;
  visibility: QuizVisibility;
  inviteToken?: string | null;
  questions: Question[];
};

export type QuizListItem = {
  id: string;
  title: string;
  description: string | null;
  createdAt: string;
  questionsCount: number;
  ownerId?: string;
  visibility: QuizVisibility;
};

export type CreateQuestionInput =
  | {
      type: 'BOOLEAN';
      text: string;
      booleanAnswer: boolean;
      order?: number;
    }
  | {
      type: 'INPUT';
      text: string;
      inputAnswer: string;
      order?: number;
    }
  | {
      type: 'SINGLE';
      text: string;
      options: ChoiceOption[];
      order?: number;
    }
  | {
      type: 'MULTIPLE';
      text: string;
      options: ChoiceOption[];
      order?: number;
    };

export type CreateQuizInput = {
  title: string;
  description?: string | null;
  visibility?: QuizVisibility;
  questions: CreateQuestionInput[];
};

export const QUIZ_FORMAT_VERSION = 1;

export type QuizImportDraft = {
  formatVersion: typeof QUIZ_FORMAT_VERSION;
  title: string;
  description?: string | null;
  visibility?: QuizVisibility;
  questions: CreateQuestionInput[];
};

export type QuestionValidationResult = {
  index: number;
  valid: boolean;
  errors: string[];
  question?: CreateQuestionInput;
};

export type QuizDraftValidation = {
  meta: {
    validCount: number;
    invalidCount: number;
    titleValid: boolean;
    titleErrors: string[];
    descriptionValid: boolean;
    descriptionErrors: string[];
  };
  questions: QuestionValidationResult[];
};

export type QuizDraftResponse = {
  draft: QuizImportDraft;
  validation: QuizDraftValidation;
};

export type GenerateQuizPreferences = {
  questionCount?: number;
  types?: QuestionType[];
  instructions?: string;
};

export type GenerateQuizRequest = {
  sourceText: string;
  preferences?: GenerateQuizPreferences;
};

export type PlayQuestion = {
  id: string;
  quizId: string;
  type: QuestionType;
  text: string;
  order: number;
  options: { id: string; label: string }[] | null;
};

export type PlayQuiz = {
  id: string;
  title: string;
  description: string | null;
  visibility: QuizVisibility;
  questions: PlayQuestion[];
};

/** `skipped` = AI budget ran out, `error` = AI call failed — neither is a real verdict. */
export type GradingMethod = 'exact' | 'ai' | 'unavailable' | 'skipped' | 'error';

export function isUnverifiedGrading(method?: GradingMethod | null): boolean {
  return method === 'skipped' || method === 'error';
}

export type CheckAnswerResult = {
  questionId: string;
  type: QuestionType;
  isCorrect: boolean;
  userAnswer: boolean | string | string[];
  gradingMethod?: GradingMethod;
};

export type AttemptUser = {
  id: string;
  email: string;
  name: string | null;
};

export type AttemptListItem = {
  id: string;
  quizId: string;
  quizTitle?: string;
  scoreCorrect: number;
  scoreTotal: number;
  createdAt: string;
  user: AttemptUser | null;
};

export type AttemptAnswerItem = {
  id: string;
  questionId: string | null;
  questionText: string;
  questionType: QuestionType;
  /** Human-readable: option labels, not ids. */
  userAnswer: boolean | string | string[];
  isCorrect: boolean;
  order: number;
  gradingMethod?: GradingMethod | null;
};

export type AttemptDetail = AttemptListItem & {
  answers: AttemptAnswerItem[];
  quizTitle?: string;
  /** Answers the grader could not verify (AI budget/outage). */
  scoreUnverified?: number;
};

export type SubmitAttemptInput = {
  inviteToken?: string;
  answers: Array<
    | { questionId: string; type: 'BOOLEAN'; answer: boolean }
    | { questionId: string; type: 'INPUT'; answer: string }
    | { questionId: string; type: 'SINGLE'; answer: string }
    | { questionId: string; type: 'MULTIPLE'; answer: string[] }
  >;
};
