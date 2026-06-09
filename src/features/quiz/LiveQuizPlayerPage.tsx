import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ProfessionVisual } from "../../components/ProfessionVisual";
import { supabase } from "../../lib/supabaseClient";
import { loadQuizContent, resultLevel, type PlayQuestion } from "./quizRuntime";

type LivePhase = "lobby" | "question" | "answers" | "results";

type LiveSession = {
  id: string;
  quiz_slug: string;
  question_count: number;
  question_order: unknown;
  status: "lobby" | "playing" | "finished";
  phase: LivePhase;
  current_question_index: number;
  phase_ends_at: string | null;
  expires_at: string | null;
  leaderboard: unknown;
};

type LiveAnswer = {
  player_id: string;
  question_id: string;
  answer_id: string | null;
  is_correct: boolean;
  response_ms: number;
  points: number;
};

type LeaderboardEntry = {
  playerId: string;
  nickname: string;
  correct: number;
  points: number;
  responseMs: number;
  place: number;
};

const answerWindowMs = 15000;

function normalizeQuestionOrder(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function normalizeLeaderboard(value: unknown) {
  return Array.isArray(value) ? (value as LeaderboardEntry[]) : [];
}

function countdown(endsAt: string | null) {
  if (!endsAt) return 0;
  return Math.max(0, Math.ceil((new Date(endsAt).getTime() - Date.now()) / 1000));
}

export function LiveQuizPlayerPage() {
  const searchParams = new URLSearchParams(window.location.search);
  const sessionId = searchParams.get("sessionId") || "";
  const expires = Number(searchParams.get("expires") || "0");
  const isExpired = Number.isFinite(expires) && expires > 0 ? Date.now() > expires : true;
  const playerStorageKey = `liveQuizPlayer:${sessionId}`;
  const nicknameStorageKey = `liveQuizNickname:${sessionId}`;

  const [session, setSession] = useState<LiveSession | null>(null);
  const [questions, setQuestions] = useState<PlayQuestion[]>([]);
  const [answers, setAnswers] = useState<LiveAnswer[]>([]);
  const [playerId, setPlayerId] = useState(() => localStorage.getItem(playerStorageKey) ?? "");
  const [nickname, setNickname] = useState(() => localStorage.getItem(nicknameStorageKey) ?? "");
  const [nicknameDraft, setNicknameDraft] = useState(() => localStorage.getItem(nicknameStorageKey) ?? "");
  const [status, setStatus] = useState("");
  const [now, setNow] = useState(Date.now());

  const currentQuestion = questions[session?.current_question_index ?? -1];
  const currentAnswer = currentQuestion ? answers.find((answer) => answer.question_id === currentQuestion.id) : undefined;
  const timeLeft = useMemo(() => countdown(session?.phase_ends_at ?? null), [now, session?.phase_ends_at]);
  const leaderboard = session ? normalizeLeaderboard(session.leaderboard) : [];
  const ownResult = leaderboard.find((entry) => entry.playerId === playerId);
  const score = answers.filter((answer) => answer.is_correct).length;

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      if (!supabase || !sessionId || isExpired) {
        return;
      }

      const { data, error } = await supabase
        .from("live_quiz_sessions")
        .select("id,quiz_slug,question_count,question_order,status,phase,current_question_index,phase_ends_at,expires_at,leaderboard")
        .eq("id", sessionId)
        .maybeSingle();

      if (!mounted) return;
      if (error || !data) {
        setStatus("Live-квіз не знайдено. Попроси викладача згенерувати новий QR-код.");
        return;
      }

      setSession(data as LiveSession);
      setStatus("");

      if (playerId) {
        const { data: answerData } = await supabase
          .from("live_quiz_answers")
          .select("player_id,question_id,answer_id,is_correct,response_ms,points")
          .eq("session_id", sessionId)
          .eq("player_id", playerId);
        if (mounted) {
          setAnswers((answerData ?? []) as LiveAnswer[]);
        }
      }
    }

    loadSession();
    const interval = window.setInterval(loadSession, 900);
    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, [isExpired, playerId, sessionId]);

  useEffect(() => {
    let mounted = true;

    async function loadQuestions() {
      if (!session) return;
      const order = normalizeQuestionOrder(session.question_order);
      const content = await loadQuizContent(session.quiz_slug, session.question_count, session.id, order);
      if (mounted) {
        setQuestions(content.questions);
      }
    }

    loadQuestions();
    return () => {
      mounted = false;
    };
  }, [session?.id, session?.quiz_slug, session?.question_count, session?.question_order]);

  const finalLevel = useMemo(() => resultLevel(ownResult?.correct ?? score, questions.length), [ownResult?.correct, questions.length, score]);

  async function joinSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !sessionId) return;

    const cleanNickname = nicknameDraft.trim().slice(0, 28);
    if (!cleanNickname) {
      setStatus("Введи нікнейм.");
      return;
    }

    const { data, error } = await supabase
      .from("live_quiz_players")
      .insert({ session_id: sessionId, nickname: cleanNickname })
      .select("id,nickname")
      .single();

    if (error || !data) {
      setStatus("Не вдалося приєднатися. Спробуй інший нікнейм.");
      return;
    }

    setPlayerId(data.id);
    setNickname(data.nickname);
    localStorage.setItem(playerStorageKey, data.id);
    localStorage.setItem(nicknameStorageKey, data.nickname);
    setStatus("");
  }

  async function submitAnswer(answerId: string) {
    if (!supabase || !session || !playerId || !currentQuestion || currentAnswer || session.phase !== "answers") return;

    const answer = currentQuestion.answers.find((item) => item.id === answerId);
    if (!answer) return;

    const timeLeft = session.phase_ends_at ? Math.max(0, new Date(session.phase_ends_at).getTime() - Date.now()) : 0;
    const responseMs = Math.min(answerWindowMs, Math.max(0, answerWindowMs - timeLeft));
    const points = answer.is_correct ? 1000 + Math.max(0, answerWindowMs - responseMs) : 0;

    const { error } = await supabase.from("live_quiz_answers").upsert(
      {
        session_id: session.id,
        player_id: playerId,
        question_id: currentQuestion.id,
        answer_id: answer.id,
        is_correct: answer.is_correct,
        response_ms: responseMs,
        points,
      },
      { onConflict: "session_id,player_id,question_id" },
    );

    if (!error) {
      setAnswers((current) => [
        ...current.filter((item) => item.question_id !== currentQuestion.id),
        { player_id: playerId, question_id: currentQuestion.id, answer_id: answer.id, is_correct: answer.is_correct, response_ms: responseMs, points },
      ]);
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

  if (!supabase) {
    return (
      <main className="it-quiz-page">
        <section className="it-quiz-card center">
          <h1>Live-квіз ще не налаштований</h1>
          <p>Потрібен Supabase для синхронної гри.</p>
        </section>
      </main>
    );
  }

  if (!playerId) {
    return (
      <main className="it-quiz-page">
        <section className="it-quiz-card">
          <ProfessionVisual visualType="general" compact />
          <h1>Приєднатися до квізу</h1>
          <p className="lead">Введи нікнейм, який буде видно на екрані викладача.</p>
          <form className="it-quiz-start-actions" onSubmit={joinSession}>
            <label className="field">
              <span>Нікнейм</span>
              <input
                value={nicknameDraft}
                maxLength={28}
                autoComplete="nickname"
                inputMode="text"
                enterKeyHint="done"
                onChange={(event) => setNicknameDraft(event.target.value)}
              />
            </label>
            {status && <p className="inline-status">{status}</p>}
            <button className="primary-button" type="submit">Увійти в гру</button>
          </form>
        </section>
      </main>
    );
  }

  if (status) {
    return (
      <main className="it-quiz-page">
        <section className="it-quiz-card center">
          <h1>{status}</h1>
        </section>
      </main>
    );
  }

  return (
    <main className="it-quiz-page">
      {(!session || session.phase === "lobby") && (
        <section className="it-quiz-card center">
          <ProfessionVisual visualType="general" compact />
          <h1>Ти в грі, {nickname}!</h1>
          <p>Дочекайся старту від викладача. Питання відкриються одночасно для всіх.</p>
        </section>
      )}

      {session?.status === "playing" && currentQuestion && (
        <section className="it-quiz-card">
          <div className="top-row">
            <span>Питання {(session.current_question_index ?? 0) + 1} з {questions.length}</span>
            <strong>{timeLeft} с</strong>
          </div>
          <div className="progress"><div style={{ width: `${Math.round((((session.current_question_index ?? 0) + 1) / questions.length) * 100)}%` }} /></div>
          <ProfessionVisual visualType={currentQuestion.visual_type} compact />
          <h1 className="question-title">{currentQuestion.question_text}</h1>

          {session.phase === "question" ? (
            <p className="live-phase-note">Зараз тільки читаємо питання. Відповіді скоро зʼявляться.</p>
          ) : (
            <>
              <div className="answers">
                {currentQuestion.answers.map((answer) => (
                  <button
                    key={answer.id}
                    type="button"
                    className={`answer-button it-quiz-answer ${currentAnswer?.answer_id === answer.id ? (answer.is_correct ? "correct" : "wrong") : ""}`}
                    disabled={Boolean(currentAnswer)}
                    onClick={() => submitAnswer(answer.id)}
                  >
                    {answer.answer_text}
                  </button>
                ))}
              </div>
              {currentAnswer ? (
                <div className="answer-feedback answer-feedback-floating">
                  <strong>{currentAnswer.is_correct ? "Правильно" : "Не зовсім"}</strong>
                  <p>{currentQuestion.explanation}</p>
                </div>
              ) : (
                <p className="live-phase-note">Обери відповідь до завершення таймера. Якщо не обрати, відповідь зарахується як неправильна.</p>
              )}
            </>
          )}
        </section>
      )}

      {session?.phase === "results" && (
        <section className="it-quiz-card result">
          <div className="place-reveal">#{ownResult?.place ?? "?"}</div>
          <h1>{nickname}, твій результат</h1>
          <p className="it-quiz-score">{ownResult?.correct ?? score} / {questions.length} правильних</p>
          <p className="it-quiz-level">{finalLevel}</p>
          <div className="fit-box quiz-dark-box">
            <strong>Місце в рейтингу:</strong>
            <p>{ownResult ? `${ownResult.place} місце · ${ownResult.points} балів` : "Результат підраховується"}</p>
            <p>У рейтингу враховано правильність і швидкість відповіді.</p>
          </div>
        </section>
      )}
    </main>
  );
}
