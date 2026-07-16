export type QuestionType = 'BOOLEAN' | 'INPUT' | 'CHECKBOX';

export type CheckboxOption = {
  label: string;
  isCorrect: boolean;
};

export type Question = {
  id: string;
  quizId: string;
  type: QuestionType;
  text: string;
  order: number;
  booleanAnswer: boolean | null;
  inputAnswer: string | null;
  options: CheckboxOption[] | null;
};

export type Quiz = {
  id: string;
  title: string;
  createdAt: string;
  questions: Question[];
};

export type QuizListItem = {
  id: string;
  title: string;
  createdAt: string;
  questionsCount: number;
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
      type: 'CHECKBOX';
      text: string;
      options: CheckboxOption[];
      order?: number;
    };

export type CreateQuizInput = {
  title: string;
  questions: CreateQuestionInput[];
};
