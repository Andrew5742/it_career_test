import { useEffect, useRef, useState } from "react";
import { fallbackItProfessionsQuiz } from "../../data/fallbackItProfessionsQuiz";
import { supabase } from "../../lib/supabaseClient";
import type { Quiz } from "../../lib/contentTypes";

const audioPath = "/it_career_test/audio/before-the-clock-stops.mp3";

function createQuizUrl(slug: string, count: number, sessionId: string) {
  const expires = Date.now() + 15 * 60 * 1000;
  const url = new URL(window.location.href);
  url.search = "";
  url.searchParams.set("mode", "it-quiz");
  url.searchParams.set("live", "1");
  url.searchParams.set("quiz", slug);
  url.searchParams.set("count", String(count));
  url.searchParams.set("expires", String(expires));
  url.searchParams.set("sessionId", sessionId);
  return { url: url.toString(), expires };
}

export function ItQuizTeacherPanel({
  onBack,
  onLaunchQr,
  soundOn,
  setSoundOn,
}: {
  onBack: () => void;
  onLaunchQr: (url: string, expires: number) => void;
  soundOn: boolean;
  setSoundOn: (value: boolean | ((current: boolean) => boolean)) => void;
}) {
  const [quizzes, setQuizzes] = useState<Quiz[]>([fallbackItProfessionsQuiz]);
  const [quizSlug, setQuizSlug] = useState(fallbackItProfessionsQuiz.slug);
  const [count, setCount] = useState(fallbackItProfessionsQuiz.default_question_count);
  const [status, setStatus] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let mounted = true;
    async function loadQuizzes() {
      if (!supabase) return;
      const { data, error } = await supabase
        .from("quizzes")
        .select("id,slug,title,description,default_question_count,is_active,created_at,updated_at")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (!mounted || error || !data || data.length === 0) return;
      setQuizzes(data as Quiz[]);
      setQuizSlug((data[0] as Quiz).slug);
      setCount(Math.min(20, Math.max(8, (data[0] as Quiz).default_question_count ?? 10)));
    }
    loadQuizzes();
    return () => {
      mounted = false;
    };
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

  async function generateQr() {
    if (!supabase) {
      setStatus("Supabase ще не налаштований. Live-квіз потребує базу даних.");
      return;
    }

    const sessionId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
    const selectedQuiz = quizzes.find((item) => item.slug === quizSlug) ?? fallbackItProfessionsQuiz;
    const next = createQuizUrl(quizSlug, count, sessionId);

    const { error } = await supabase.from("live_quiz_sessions").insert({
      id: sessionId,
      quiz_id: selectedQuiz.id.startsWith("fallback-") ? null : selectedQuiz.id,
      quiz_slug: quizSlug,
      question_count: count,
      question_order: [],
      status: "lobby",
      phase: "lobby",
      current_question_index: -1,
      expires_at: new Date(next.expires).toISOString(),
    });

    if (error) {
      setStatus("Не вдалося створити live-сесію. Виконай SQL для live quiz у Supabase.");
      return;
    }

    setStatus("");
    onLaunchQr(next.url, next.expires);
  }

  return (
    <>
      <audio ref={audioRef} src={audioPath} loop preload="none" />
      <button className="ghost-button" type="button" onClick={onBack}>
        ← На головну
      </button>
      <h2>Квіз: Професії в ІТ</h2>
      <p className="lead">
        Учні сканують QR-код і проходять міні-гру про те, хто чим займається в ІТ-команді.
      </p>
      {status && <p className="inline-status">{status}</p>}

      <label className="field">
        <span>Активний квіз</span>
        <select value={quizSlug} onChange={(event) => setQuizSlug(event.target.value)}>
          {quizzes.map((quiz) => (
            <option key={quiz.id} value={quiz.slug}>
              {quiz.title}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>Кількість питань: {count}</span>
        <input type="range" min="8" max="20" value={count} onChange={(event) => setCount(Number(event.target.value))} />
      </label>

      <button className="secondary-button" type="button" onClick={() => setSoundOn((current) => !current)}>
        Звук на екрані викладача: {soundOn ? "увімкнено" : "вимкнено"}
      </button>

      <div className="actions-row actions-row-single centered-action">
        <button className="primary-button" type="button" onClick={generateQr}>
          Згенерувати QR-код
        </button>
      </div>
    </>
  );
}
