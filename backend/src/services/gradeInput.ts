type GradeInputParams = {
  questionText: string;
  expected: string;
  actual: string;
};

export type GradeInputResult = {
  isCorrect: boolean;
  method: 'exact' | 'ai' | 'fallback';
};

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function isGradingEnabled(): boolean {
  if (process.env.AI_GRADING_ENABLED === 'false') return false;
  return Boolean(process.env.GROQ_API_KEY?.trim());
}

function getModel(): string {
  return process.env.GROQ_MODEL?.trim() || 'llama-3.1-8b-instant';
}

async function gradeWithGroq(params: GradeInputParams): Promise<boolean> {
  const apiKey = process.env.GROQ_API_KEY!.trim();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: getModel(),
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'You grade short quiz answers in English. Decide if the student answer matches the expected answer by meaning (synonyms and minor rephrasing OK; wrong facts are not). Reply ONLY with JSON: {"isCorrect": true} or {"isCorrect": false}. No explanation.',
          },
          {
            role: 'user',
            content: JSON.stringify({
              question: params.questionText,
              expectedAnswer: params.expected,
              studentAnswer: params.actual,
            }),
          },
        ],
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Groq HTTP ${res.status}: ${text.slice(0, 200)}`);
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('Groq returned empty content');
    }

    const parsed = JSON.parse(content) as { isCorrect?: unknown };
    if (typeof parsed.isCorrect !== 'boolean') {
      throw new Error('Groq JSON missing boolean isCorrect');
    }
    return parsed.isCorrect;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Hybrid INPUT grading:
 * 1) normalized exact match
 * 2) Groq semantic verdict (if enabled)
 * 3) fallback to exact on AI errors
 */
export async function gradeInputAnswer(params: GradeInputParams): Promise<GradeInputResult> {
  if (normalizeText(params.actual) === normalizeText(params.expected)) {
    return { isCorrect: true, method: 'exact' };
  }

  if (!isGradingEnabled()) {
    return { isCorrect: false, method: 'exact' };
  }

  try {
    const isCorrect = await gradeWithGroq(params);
    return { isCorrect, method: 'ai' };
  } catch (err) {
    console.error('[gradeInputAnswer] Groq failed, using exact fallback:', err);
    return { isCorrect: false, method: 'fallback' };
  }
}
