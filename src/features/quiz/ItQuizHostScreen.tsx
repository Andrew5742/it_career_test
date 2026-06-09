import { useEffect, useMemo, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { ProfessionVisual } from "../../components/ProfessionVisual";
import { supabase } from "../../lib/supabaseClient";
import { loadQuizContent, type PlayQuestion } from "./quizRuntime";

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

type LivePlayer = {
  id: string;
  nickname: string;
  joined_at: string;
};

type LiveAnswer = {
  player_id: string;
  question_id: string;
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

const audioPath = "/it_career_test/audio/it-quiz-theme.mp3";
const questionPreviewMs = 3000;
const answerWindowMs = 10000;

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

function buildLeaderboard(players: LivePlayer[], answers: LiveAnswer[], questionCount: number): LeaderboardEntry[] {
  const byPlayer = new Map<string, LeaderboardEntry>();
  for (const player of players) {
    byPlayer.set(player.id, {
      playerId: player.id,
      nickname: player.nickname,
      correct: 0,
      points: 0,
      responseMs: 0,
      place: 0,
    });
  }

  for (const answer of answers) {
    const entry = byPlayer.get(answer.player_id);
    if (!entry) continue;
    if (answer.is_correct) {
      entry.correct += 1;
      entry.responseMs += answer.response_ms;
    } else {
      entry.responseMs += answerWindowMs;
    }
    entry.points += answer.points;
  }

  for (const entry of byPlayer.values()) {
    const missing = Math.max(0, questionCount - entry.correct);
    entry.responseMs += missing * answerWindowMs;
  }

  return [...byPlayer.values()]
    .sort((a, b) => b.points - a.points || b.correct - a.correct || a.responseMs - b.responseMs || a.nickname.localeCompare(b.nickname))
    .map((entry, index) => ({ ...entry, place: index + 1 }));
}

export function ItQuizHostScreen({
  sessionId,
  qrUrl,
  expiresAt,
  onBack,
}: {
  sessionId: string;
  qrUrl: string;
  expiresAt: number | null;
  onBack: () => void;
}) {
  const [session, setSession] = useState<LiveSession | null>(null);
  const [players, setPlayers] = useState<LivePlayer[]>([]);
  const [answers, setAnswers] = useState<LiveAnswer[]>([]);
  const [questions, setQuestions] = useState<PlayQuestion[]>([]);
  const [status, setStatus] = useState("");
  const [soundOn, setSoundOn] = useState(false);
  const [now, setNow] = useState(Date.now());
  const transitionRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const currentQuestion = questions[session?.current_question_index ?? -1];
  const answeredCount = useMemo(() => {
    if (!currentQuestion) return 0;
    return new Set(answers.filter((answer) => answer.question_id === currentQuestion.id).map((answer) => answer.player_id)).size;
  }, [answers, currentQuestion]);
  const finalLeaderboard = session ? normalizeLeaderboard(session.leaderboard) : [];

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = 0.22;
    if (soundOn) {
      audioRef.current.play().catch(() => undefined);
    } else {
      audioRef.current.pause();
    }
  }, [soundOn]);

  useEffect(() => {
    let mounted = true;

    async function loadState() {
      if (!supabase || !sessionId) {
        setStatus("Live-квіз потребує налаштований Supabase.");
        return;
      }

      const { data: sessionData, error: sessionError } = await supabase
        .from("live_quiz_sessions")
        .select("id,quiz_slug,question_count,question_order,status,phase,current_question_index,phase_ends_at,expires_at,leaderboard")
        .eq("id", sessionId)
        .maybeSingle();

      if (!mounted) return;

      if (sessionError || !sessionData) {
        setStatus("Live-сесію не знайдено. Перевір SQL для live quiz у Supabase.");
        return;
      }

      const nextSession = sessionData as LiveSession;
      setSession(nextSession);
      setStatus("");

      const [{ data: playerData }, { data: answerData }] = await Promise.all([
        supabase
          .from("live_quiz_players")
          .select("id,nickname,joined_at")
          .eq("session_id", sessionId)
          .order("joined_at", { ascending: true }),
        supabase.from("live_quiz_answers").select("player_id,question_id,is_correct,response_ms,points").eq("session_id", sessionId),
      ]);

      if (!mounted) return;
      setPlayers((playerData ?? []) as LivePlayer[]);
      setAnswers((answerData ?? []) as LiveAnswer[]);
    }

    loadState();
    const interval = window.setInterval(loadState, 1000);
    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, [sessionId]);

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

  useEffect(() => {
    async function transitionIfNeeded() {
      if (!supabase || !session || transitionRef.current || session.status !== "playing") return;
      if (!session.phase_ends_at || new Date(session.phase_ends_at).getTime() > now) return;

      transitionRef.current = true;
      if (session.phase === "question") {
        await supabase
          .from("live_quiz_sessions")
          .update({
            phase: "answers",
            phase_ends_at: new Date(Date.now() + answerWindowMs).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", session.id);
      } else if (session.phase === "answers") {
        if (session.current_question_index < questions.length - 1) {
          await supabase
            .from("live_quiz_sessions")
            .update({
              phase: "question",
              current_question_index: session.current_question_index + 1,
              phase_ends_at: new Date(Date.now() + questionPreviewMs).toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", session.id);
        } else {
          const leaderboard = buildLeaderboard(players, answers, questions.length);
          await supabase
            .from("live_quiz_sessions")
            .update({
              status: "finished",
              phase: "results",
              phase_ends_at: null,
              leaderboard,
              updated_at: new Date().toISOString(),
            })
            .eq("id", session.id);
          await supabase.from("live_quiz_answers").delete().eq("session_id", session.id);
          await supabase.from("live_quiz_players").delete().eq("session_id", session.id);
        }
      }
      transitionRef.current = false;
    }

    transitionIfNeeded();
  }, [answers, now, players, questions.length, session]);

  async function startGame() {
    if (!supabase || !session || questions.length === 0) return;
    const order = questions.map((question) => question.id);
    await supabase
      .from("live_quiz_sessions")
      .update({
        question_order: order,
        status: "playing",
        phase: "question",
        current_question_index: 0,
        phase_ends_at: new Date(Date.now() + questionPreviewMs).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", session.id);
  }

  return (
    <main className="live-host-screen">
      <audio ref={audioRef} src={audioPath} loop preload="none" />
      <button className="ghost-button qr-back" type="button" onClick={onBack}>
        ← Назад
      </button>
      <button className="sound-toggle live-sound-toggle" type="button" onClick={() => setSoundOn((current) => !current)}>
        Звук {soundOn ? "увімкнено" : "вимкнено"}
      </button>

      {status && <section className="live-host-card center"><h1>{status}</h1></section>}

      {!status && session?.phase === "lobby" && (
        <section className="live-host-card live-lobby-grid">
          <div className="live-qr-panel">
            <div className="qr-live-badge">QR-квіз активний</div>
            <QRCodeSVG value={qrUrl} size={360} />
            <h1>Скануйте QR-код</h1>
            <p>Учні вводять нікнейм і чекають старту. Питання та відповіді відкриватимуться синхронно.</p>
            {expiresAt && <strong>Дійсний до: {new Date(expiresAt).toLocaleTimeString()}</strong>}
            <p className="session-link">{qrUrl}</p>
          </div>

          <div className="live-player-panel">
            <h2>Учасники: {players.length}</h2>
            <div className="live-player-list">
              {players.length === 0 ? <p>Поки ніхто не приєднався.</p> : players.map((player) => <span key={player.id}>{player.nickname}</span>)}
            </div>
            <button className="primary-button" type="button" onClick={startGame} disabled={players.length === 0 || questions.length === 0}>
              Почати квіз
            </button>
          </div>
        </section>
      )}

      {!status && session?.status === "playing" && currentQuestion && (
        <section className="live-host-card">
          <div className="top-row">
            <span>Питання {(session.current_question_index ?? 0) + 1} з {questions.length}</span>
            <strong>{countdown(session.phase_ends_at)} с</strong>
          </div>
          <div className="progress"><div style={{ width: `${Math.round((((session.current_question_index ?? 0) + 1) / questions.length) * 100)}%` }} /></div>
          <ProfessionVisual visualType={currentQuestion.visual_type} compact />
          <h1 className="live-question-title">{currentQuestion.question_text}</h1>

          {session.phase === "question" ? (
            <p className="live-phase-note">Запамʼятайте питання. Відповіді відкриються за кілька секунд.</p>
          ) : (
            <>
              <div className="live-answer-grid">
                {currentQuestion.answers.map((answer, index) => (
                  <div key={answer.id} className={`live-answer-tile live-answer-${index + 1}`}>
                    {answer.answer_text}
                  </div>
                ))}
              </div>
              <p className="live-phase-note">Відповіли: {answeredCount} / {players.length}</p>
            </>
          )}
        </section>
      )}

      {!status && session?.phase === "results" && (
        <section className="live-host-card">
          <h1>Фінальний рейтинг</h1>
          <div className="podium">
            {finalLeaderboard.slice(0, 3).map((entry) => (
              <div key={entry.playerId} className={`podium-place podium-${entry.place}`}>
                <strong>{entry.place} місце</strong>
                <span>{entry.nickname}</span>
                <small>{entry.correct} правильних · {entry.points} балів</small>
              </div>
            ))}
          </div>
          <div className="leaderboard-list">
            {finalLeaderboard.slice(3).map((entry) => (
              <div key={entry.playerId}>
                <span>{entry.place}. {entry.nickname}</span>
                <strong>{entry.points}</strong>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
