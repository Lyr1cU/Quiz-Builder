export type QuestionType = 'BOOLEAN' | 'INPUT' | 'SINGLE' | 'MULTIPLE';
export type QuizVisibility = 'PUBLIC' | 'PRIVATE';

export type ChoiceOption = {
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

export type PlayQuestion = {
  id: string;
  quizId: string;
  type: QuestionType;
  text: string;
  order: number;
  options: { label: string }[] | null;
};

export type PlayQuiz = {
  id: string;
  title: string;
  description: string | null;
  visibility: QuizVisibility;
  questions: PlayQuestion[];
};

export type CheckAnswerResult = {
  questionId: string;
  type: QuestionType;
  isCorrect: boolean;
  userAnswer: boolean | string | string[];
  correctAnswer: boolean | string | string[] | null;
  gradingMethod?: 'exact' | 'ai' | 'fallback';
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
  userAnswer: boolean | string | string[];
  isCorrect: boolean;
  order: number;
};

export type AttemptDetail = AttemptListItem & {
  answers: AttemptAnswerItem[];
  quizTitle?: string;
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
