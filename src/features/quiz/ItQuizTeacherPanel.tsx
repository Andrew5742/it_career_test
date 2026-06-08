import { useEffect, useState } from "react";
import { fallbackItProfessionsQuiz } from "../../data/fallbackItProfessionsQuiz";
import { supabase } from "../../lib/supabaseClient";
import type { Quiz } from "../../lib/contentTypes";

function createQuizUrl(slug: string, count: number) {
  const expires = Date.now() + 15 * 60 * 1000;
  const sessionId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
  const url = new URL(window.location.href);
  url.search = "";
  url.searchParams.set("mode", "it-quiz");
  url.searchParams.set("quiz", slug);
  url.searchParams.set("count", String(count));
  url.searchParams.set("expires", String(expires));
  url.searchParams.set("sessionId", sessionId);
  return { url: url.toString(), expires };
}

export function ItQuizTeacherPanel({
  onBack,
  onLaunchQr,
}: {
  onBack: () => void;
  onLaunchQr: (url: string, expires: number) => void;
}) {
  const [quizzes, setQuizzes] = useState<Quiz[]>([fallbackItProfessionsQuiz]);
  const [quizSlug, setQuizSlug] = useState(fallbackItProfessionsQuiz.slug);
  const [count, setCount] = useState(fallbackItProfessionsQuiz.default_question_count);

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

  function generateQr() {
    const next = createQuizUrl(quizSlug, count);
    onLaunchQr(next.url, next.expires);
  }

  return (
    <>
      <button className="ghost-button" type="button" onClick={onBack}>
        ← На головну
      </button>
      <h2>Квіз: Професії в ІТ</h2>
      <p className="lead">
        Учні сканують QR-код і проходять міні-гру про те, хто чим займається в ІТ-команді.
      </p>

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

      <div className="actions-row actions-row-single centered-action">
        <button className="primary-button" type="button" onClick={generateQr}>
          Згенерувати QR-код
        </button>
      </div>
    </>
  );
}
