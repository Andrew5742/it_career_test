import { fallbackItProfessionsQuiz } from "../../data/fallbackItProfessionsQuiz";
import { supabase } from "../../lib/supabaseClient";
import type { Quiz, QuizAnswer, QuizQuestion, VisualType } from "../../lib/contentTypes";

export type PlayQuestion = QuizQuestion & {
  answers: QuizAnswer[];
};

export function seededRandom(seed: string) {
  let value = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    value ^= seed.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return () => {
    value += value << 13;
    value ^= value >>> 7;
    value += value << 3;
    value ^= value >>> 17;
    value += value << 5;
    return ((value >>> 0) % 1000000) / 1000000;
  };
}

export function shuffleWithSeed<T>(items: T[], seed: string) {
  const random = seededRandom(seed);
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

export function resultLevel(score: number, total: number) {
  const percent = total > 0 ? (score / total) * 100 : 0;
  if (percent <= 40) return "Початок знайомства з ІТ";
  if (percent <= 70) return "Ти вже непогано орієнтуєшся";
  if (percent <= 90) return "Сильний результат";
  return "Майже ІТ-навігатор";
}

export function topTagsFromAnswers(answers: QuizAnswer[]) {
  const counts = new Map<string, number>();
  for (const answer of answers) {
    for (const tag of answer.tags ?? []) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([tag]) => tag);
}

export function pickVisualType(tags: string[]): VisualType {
  const supported: VisualType[] = [
    "frontend",
    "backend",
    "fullstack",
    "qa",
    "ux",
    "data",
    "ai",
    "cybersecurity",
    "devops",
    "sysadmin",
    "database",
    "network",
    "embedded",
    "gamedev",
    "manager",
  ];
  return supported.find((item) => tags.includes(item)) ?? "general";
}

export async function loadQuizContent(quizSlug: string, requestedCount: number, sessionId: string, questionOrder?: string[]) {
  let loadedQuiz: Quiz = fallbackItProfessionsQuiz;
  let loadedQuestions: PlayQuestion[] = fallbackItProfessionsQuiz.questions;

  if (supabase) {
    const { data: quizData, error: quizError } = await supabase
      .from("quizzes")
      .select("id,slug,title,description,default_question_count,is_active,created_at,updated_at")
      .eq("slug", quizSlug)
      .eq("is_active", true)
      .maybeSingle();

    if (!quizError && quizData) {
      const { data: questionData, error: questionError } = await supabase
        .from("quiz_questions")
        .select("id,quiz_id,question_text,question_type,explanation,visual_type,difficulty,tags,is_active,sort_order")
        .eq("quiz_id", (quizData as Quiz).id)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (!questionError && questionData && questionData.length > 0) {
        const questionIds = (questionData as QuizQuestion[]).map((item) => item.id);
        const { data: answerData, error: answerError } = await supabase
          .from("quiz_answers")
          .select("id,question_id,answer_text,is_correct,tags,sort_order")
          .in("question_id", questionIds)
          .order("sort_order", { ascending: true });

        if (!answerError && answerData) {
          const grouped = new Map<string, QuizAnswer[]>();
          for (const answer of answerData as QuizAnswer[]) {
            grouped.set(answer.question_id, [...(grouped.get(answer.question_id) ?? []), answer]);
          }
          const dbQuestions = (questionData as QuizQuestion[])
            .map((question) => ({ ...question, answers: grouped.get(question.id) ?? [] }))
            .filter((question) => question.answers.length >= 4);
          if (dbQuestions.length > 0) {
            loadedQuiz = quizData as Quiz;
            loadedQuestions = dbQuestions;
          }
        }
      }
    }
  }

  const count = Math.min(requestedCount, loadedQuestions.length);
  const ordered =
    questionOrder && questionOrder.length > 0
      ? questionOrder
          .map((questionId) => loadedQuestions.find((question) => question.id === questionId))
          .filter((question): question is PlayQuestion => Boolean(question))
      : shuffleWithSeed(loadedQuestions, sessionId).slice(0, count);

  const picked = ordered.slice(0, count).map((question) => ({
    ...question,
    answers: shuffleWithSeed(question.answers, `${sessionId}-${question.id}`),
  }));

  return { quiz: loadedQuiz, questions: picked };
}
