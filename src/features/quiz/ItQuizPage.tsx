import { useEffect, useRef, useState } from "react";
import { ProfessionVisual } from "../../components/ProfessionVisual";
import { fallbackItProfessionsQuiz } from "../../data/fallbackItProfessionsQuiz";
import { supabase } from "../../lib/supabaseClient";
import type { Quiz, QuizAnswer, QuizQuestion, VisualType } from "../../lib/contentTypes";
import { LiveQuizPlayerPage } from "./LiveQuizPlayerPage";

type PlayQuestion = QuizQuestion & {
  answers: QuizAnswer[];
};

type QuizStep = "start" | "question" | "result";
type SoundPreference = "on" | "off";

const soundStorageKey = "itQuizSound";
const audioPath = "/it_career_test/audio/it-quiz-theme.mp3";

function seededRandom(seed: string) {
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

function shuffleWithSeed<T>(items: T[], seed: string) {
  const random = seededRandom(seed);
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

function resultLevel(score: number, total: number) {
  const percent = total > 0 ? (score / total) * 100 : 0;
  if (percent <= 40) return "Початок знайомства з ІТ";
  if (percent <= 70) return "Ти вже непогано орієнтуєшся";
  if (percent <= 90) return "Сильний результат";
  return "Майже ІТ-навігатор";
}

function topTagsFromAnswers(answers: QuizAnswer[]) {
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

function pickVisualType(tags: string[]): VisualType {
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

export function ItQuizPage() {
  const searchParams = new URLSearchParams(window.location.search);
  const quizSlug = searchParams.get("quiz") || fallbackItProfessionsQuiz.slug;
  const liveMode = searchParams.get("live") === "1";
  const requestedCount = Math.min(20, Math.max(8, Number(searchParams.get("count") || fallbackItProfessionsQuiz.default_question_count)));
  const expires = Number(searchParams.get("expires") || "0");
  const sessionId = searchParams.get("sessionId") || "local";
  const isExpired = Number.isFinite(expires) && expires > 0 ? Date.now() > expires : true;

  if (liveMode) {
    return <LiveQuizPlayerPage />;
  }

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [quiz, setQuiz] = useState<Quiz>(fallbackItProfessionsQuiz);
  const [questions, setQuestions] = useState<PlayQuestion[]>([]);
  const [step, setStep] = useState<QuizStep>("start");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswerId, setSelectedAnswerId] = useState<string | null>(null);
  const [correctAnswers, setCorrectAnswers] = useState<QuizAnswer[]>([]);
  const [locked, setLocked] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [savedResult, setSavedResult] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [soundPreference, setSoundPreference] = useState<SoundPreference>(() =>
    localStorage.getItem(soundStorageKey) === "on" ? "on" : "off",
  );
  const [feedbackUrl, setFeedbackUrl] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadQuiz() {
      if (isExpired) return;

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

        const { data: formData } = await supabase
          .from("feedback_forms")
          .select("id")
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(1);
        if (mounted && formData?.[0]?.id) {
          const url = new URL(window.location.href);
          url.search = "";
          url.searchParams.set("mode", "feedback");
          url.searchParams.set("formId", formData[0].id);
          url.searchParams.set("expires", String(Date.now() + 15 * 60 * 1000));
          url.searchParams.set("sessionId", sessionId);
          setFeedbackUrl(url.toString());
        }
      }

      const picked = shuffleWithSeed(loadedQuestions, sessionId)
        .slice(0, Math.min(requestedCount, loadedQuestions.length))
        .map((question) => ({
          ...question,
          answers: shuffleWithSeed(question.answers, `${sessionId}-${question.id}`),
        }));

      if (mounted) {
        setQuiz(loadedQuiz);
        setQuestions(picked);
      }
    }

    loadQuiz();
    return () => {
      mounted = false;
    };
  }, [isExpired, quizSlug, requestedCount, sessionId]);

  useEffect(() => {
    localStorage.setItem(soundStorageKey, soundPreference);
    if (!audioRef.current) return;
    audioRef.current.volume = 0.25;
    if (soundPreference === "on" && step !== "start") {
      audioRef.current.play().catch(() => undefined);
    } else {
      audioRef.current.pause();
    }
  }, [soundPreference, step]);

  const currentQuestion = questions[currentIndex];
  const score = correctAnswers.length;
  const topTags = topTagsFromAnswers(correctAnswers);
  const resultVisual = pickVisualType(topTags);

  function startQuiz() {
    setStep("question");
    if (soundPreference === "on") {
      audioRef.current?.play().catch(() => undefined);
    }
  }

  function toggleSound() {
    setSoundPreference((current) => {
      const next = current === "on" ? "off" : "on";
      if (next === "on") {
        audioRef.current?.play().catch(() => undefined);
      } else {
        audioRef.current?.pause();
      }
      return next;
    });
  }

  function selectAnswer(answer: QuizAnswer, eventTarget: EventTarget & HTMLElement) {
    eventTarget.blur();
    if (locked || !currentQuestion) return;
    setLocked(true);
    setSelectedAnswerId(answer.id);
    setShowExplanation(true);
    setFeedbackMessage(answer.is_correct ? "Правильно" : "Не зовсім");
    if (answer.is_correct) {
      setCorrectAnswers((current) => [...current, answer]);
    }
    window.setTimeout(() => {
      nextQuestion();
    }, 3000);
  }

  function nextQuestion() {
    setSelectedAnswerId(null);
    setShowExplanation(false);
    setFeedbackMessage("");
    setLocked(false);
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((value) => value + 1);
    } else {
      setStep("result");
    }
  }

  useEffect(() => {
    async function saveResult() {
      if (!supabase || step !== "result" || savedResult) return;
      setSavedResult(true);
      await supabase.from("quiz_results").insert({
        quiz_id: quiz.id.startsWith("fallback-") ? null : quiz.id,
        quiz_slug: quiz.slug,
        session_id: sessionId,
        score,
        total: questions.length,
        top_tags: topTags,
      });
    }
    saveResult();
  }, [step, savedResult, quiz, questions.length, score, sessionId, topTags]);

  async function shareResult() {
    const text = `Квіз: Професії в ІТ\nМій результат: ${score} / ${questions.length}\n${resultLevel(score, questions.length)}\n\nКафедра компʼютерної інженерії та інформаційних систем ХНУ`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Квіз: Професії в ІТ", text });
      } else {
        await navigator.clipboard.writeText(text);
        alert("Результат скопійовано.");
      }
    } catch {
      await navigator.clipboard.writeText(text);
      alert("Результат скопійовано.");
    }
  }

  if (isExpired) {
    return (
      <main className="it-quiz-page">
        <section className="it-quiz-card center">
          <h1>QR-код уже неактивний</h1>
          <p>Попроси викладача згенерувати новий QR-код.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="it-quiz-page">
      <audio ref={audioRef} src={audioPath} loop preload="none" />

      {step === "start" && (
        <section className="it-quiz-card">
          <ProfessionVisual visualType="general" />
          <h1>Квіз: Професії в ІТ</h1>
          <p className="lead">Перевір, чи знаєш ти, хто чим займається в ІТ-команді.</p>
          <div className="it-quiz-start-actions">
            <button className="primary-button" type="button" onClick={startQuiz}>
              Почати
            </button>
            <button className="secondary-button" type="button" onClick={toggleSound}>
              Звук {soundPreference === "on" ? "увімкнено" : "вимкнено"}
            </button>
          </div>
        </section>
      )}

      {step === "question" && currentQuestion && (
        <section className="it-quiz-card">
          <div className="top-row">
            <span>Питання {currentIndex + 1} з {questions.length}</span>
            <button className="sound-toggle" type="button" onClick={toggleSound}>
              Звук {soundPreference === "on" ? "увімкнено" : "вимкнено"}
            </button>
          </div>
          <div className="progress">
            <div style={{ width: `${Math.round(((currentIndex + 1) / questions.length) * 100)}%` }} />
          </div>
          <ProfessionVisual visualType={currentQuestion.visual_type} compact />
          <h1 className="question-title">{currentQuestion.question_text}</h1>

          <div className="answers">
            {currentQuestion.answers.map((answer) => (
              <button
                key={`${currentQuestion.id}-${answer.id}`}
                type="button"
                className={`answer-button it-quiz-answer ${selectedAnswerId === answer.id ? (answer.is_correct ? "correct" : "wrong") : ""}`}
                disabled={locked}
                onPointerDown={(event) => event.currentTarget.blur()}
                onPointerUp={(event) => event.currentTarget.blur()}
                onTouchEnd={(event) => event.currentTarget.blur()}
                onClick={(event) => selectAnswer(answer, event.currentTarget)}
              >
                {answer.answer_text}
              </button>
            ))}
          </div>

          {showExplanation && (
            <div className="answer-feedback answer-feedback-floating">
              <strong>{feedbackMessage}</strong>
              <p>{currentQuestion.explanation}</p>
              <button className="secondary-button" type="button" onClick={nextQuestion}>
                Далі
              </button>
            </div>
          )}
        </section>
      )}

      {step === "result" && (
        <section className="it-quiz-card result">
          <ProfessionVisual visualType={resultVisual} compact />
          <h1>Квіз завершено!</h1>
          <p className="it-quiz-score">Твій результат: {score} / {questions.length}</p>
          <p className="it-quiz-level">{resultLevel(score, questions.length)}</p>

          <div className="fit-box quiz-dark-box">
            <strong>Найкраще ти розумієш:</strong>
            <p>{topTags.length > 0 ? topTags.join(", ") : "загальні ІТ-ролі"}</p>
          </div>

          <div className="department-box">
            <strong>Кафедра компʼютерної інженерії та інформаційних систем ХНУ</strong>
            <p>F6 — Інформаційні системи і технології</p>
            <p>F6 — Інформаційні системи штучного інтелекту</p>
            <p>F7 — Компʼютерна інженерія та програмування</p>
          </div>

          <button className="primary-button" type="button" onClick={shareResult}>
            Поділитися результатом
          </button>
          {feedbackUrl ? (
            <a className="secondary-button" href={feedbackUrl}>
              Залишити відгук
            </a>
          ) : (
            <p className="inline-status">Форма відгуків ще не налаштована.</p>
          )}
          <a className="secondary-button" href={window.location.pathname}>
            На головну
          </a>
        </section>
      )}
    </main>
  );
}
