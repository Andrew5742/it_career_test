import { useEffect, useMemo, useState, type FormEvent } from "react";
import { supabase } from "../../lib/supabaseClient";
import type { FeedbackFormRecord, FeedbackQuestionRecord } from "../../lib/contentTypes";

type FeedbackAnswerState = Record<string, string>;

type FeedbackAnswerRow = {
  question_id: string;
  answer_text: string;
  answer_value: { rating: number } | { choice: string } | null;
};

function createClientId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (character) =>
    (Number(character) ^ (Math.random() * 16) >> (Number(character) / 4)).toString(16),
  );
}

function normalizeOptions(options: unknown[] | null) {
  if (!Array.isArray(options)) {
    return [];
  }

  return options
    .map((item) => {
      if (typeof item === "string") {
        return { label: item, value: item };
      }

      if (item && typeof item === "object" && "label" in item) {
        const option = item as { label?: unknown; value?: unknown };
        const label = String(option.label ?? "");
        return { label, value: String(option.value ?? label) };
      }

      return null;
    })
    .filter((item): item is { label: string; value: string } => Boolean(item?.label));
}

export function FeedbackFormPage() {
  const searchParams = new URLSearchParams(window.location.search);
  const formId = searchParams.get("formId") ?? "";
  const expires = Number(searchParams.get("expires") ?? "0");
  const isExpired = Number.isFinite(expires) && expires > 0 ? Date.now() > expires : true;

  const [form, setForm] = useState<FeedbackFormRecord | null>(null);
  const [questions, setQuestions] = useState<FeedbackQuestionRecord[]>([]);
  const [participantName, setParticipantName] = useState("");
  const [participantContact, setParticipantContact] = useState("");
  const [answers, setAnswers] = useState<FeedbackAnswerState>({});
  const [status, setStatus] = useState("");
  const [isDone, setIsDone] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadForm() {
      if (isExpired) {
        return;
      }

      if (!supabase || !formId) {
        setStatus("Форма відгуків ще не налаштована");
        return;
      }

      const [{ data: formData, error: formError }, { data: questionData, error: questionError }] = await Promise.all([
        supabase
          .from("feedback_forms")
          .select("id,workshop_id,title,description,is_active,created_at")
          .eq("id", formId)
          .eq("is_active", true)
          .maybeSingle(),
        supabase
          .from("feedback_questions")
          .select("id,form_id,question_text,question_type,options,is_required,sort_order")
          .eq("form_id", formId)
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),
      ]);

      if (!isMounted) {
        return;
      }

      if (formError || questionError || !formData) {
        setStatus("Форма відгуків ще не налаштована");
        return;
      }

      setForm(formData as FeedbackFormRecord);
      setQuestions((questionData ?? []) as FeedbackQuestionRecord[]);
      setStatus("");
    }

    loadForm();

    return () => {
      isMounted = false;
    };
  }, [formId, isExpired]);

  const requiredMissing = useMemo(
    () => questions.some((item) => item.is_required && !answers[item.id]?.trim()),
    [answers, questions],
  );

  function updateAnswer(questionId: string, value: string) {
    setAnswers((current) => ({ ...current, [questionId]: value }));
  }

  async function submitFeedback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !form || requiredMissing) {
      return;
    }

    setIsSubmitting(true);
    setStatus("");

    const answerRows = questions
      .map((question) => {
        const value = answers[question.id]?.trim() ?? "";
        if (!value) {
          return null;
        }

        const answerValue =
          question.question_type === "rating_1_5"
            ? { rating: Number(value) }
            : question.question_type === "choice"
              ? { choice: value }
              : null;

        return {
          question_id: question.id,
          answer_text: value,
          answer_value: answerValue,
        };
      })
      .filter((item): item is FeedbackAnswerRow => Boolean(item));

    const { error } = await supabase.rpc("submit_feedback_response", {
      p_form_id: form.id,
      p_participant_name: participantName.trim() || null,
      p_participant_contact: participantContact.trim() || null,
      p_answers: answerRows,
    });

    if (error) {
      const responseId = createClientId();
      const { error: responseError } = await supabase.from("feedback_responses").insert({
        id: responseId,
        form_id: form.id,
        participant_name: participantName.trim() || null,
        participant_contact: participantContact.trim() || null,
      });

      if (responseError) {
        console.error(responseError);
        setStatus("Не вдалося надіслати відгук. Спробуй ще раз.");
        setIsSubmitting(false);
        return;
      }

      if (answerRows.length > 0) {
        const { error: answersError } = await supabase.from("feedback_answers").insert(
          answerRows.map((answer) => ({
            response_id: responseId,
            question_id: answer.question_id,
            answer_text: answer.answer_text,
            answer_value: answer.answer_value,
          })),
        );

        if (answersError) {
          console.error(answersError);
          setStatus("Відгук створено, але відповіді не збереглися. Скажи викладачу перевірити Supabase SQL.");
          setIsSubmitting(false);
          return;
        }
      }
    }

    setIsDone(true);
    setIsSubmitting(false);
  }

  if (isExpired) {
    return (
      <main className="mobile-page feedback-public-page">
        <section className="mobile-card center feedback-card-dark">
          <h1>QR-код уже неактивний</h1>
          <p>Попроси викладача згенерувати новий QR-код.</p>
        </section>
      </main>
    );
  }

  if (isDone) {
    return (
      <main className="mobile-page feedback-public-page">
        <section className="mobile-card center feedback-card-dark">
          <h1>Дякуємо за відгук!</h1>
          <p>Твоя думка допомагає зробити наступні воркшопи кращими.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="mobile-page feedback-public-page">
      <section className="mobile-card feedback-card-dark">
        {!supabase || (!form && status) ? (
          <>
            <h1>Відгуки про воркшоп</h1>
            <p>{status || "Форма відгуків ще не налаштована"}</p>
          </>
        ) : (
          <form onSubmit={submitFeedback}>
            <h1>{form?.title ?? "Відгуки про воркшоп"}</h1>
            {form?.description && <p className="lead">{form.description}</p>}

            <label className="field">
              <span>Імʼя (необовʼязково)</span>
              <input value={participantName} onChange={(event) => setParticipantName(event.target.value)} />
            </label>

            <label className="field">
              <span>Контакт (необовʼязково)</span>
              <input value={participantContact} onChange={(event) => setParticipantContact(event.target.value)} />
            </label>

            <div className="feedback-question-list">
              {questions.map((question) => {
                const options = normalizeOptions(question.options);
                return (
                  <label key={question.id} className="field feedback-question">
                    <span>
                      {question.question_text}
                      {question.is_required ? " *" : ""}
                    </span>

                    {question.question_type === "rating_1_5" && (
                      <select
                        required={question.is_required}
                        value={answers[question.id] ?? ""}
                        onChange={(event) => updateAnswer(question.id, event.target.value)}
                      >
                        <option value="">Обери оцінку</option>
                        {[1, 2, 3, 4, 5].map((value) => (
                          <option key={value} value={value}>
                            {value}
                          </option>
                        ))}
                      </select>
                    )}

                    {question.question_type === "choice" && (
                      <select
                        required={question.is_required}
                        value={answers[question.id] ?? ""}
                        onChange={(event) => updateAnswer(question.id, event.target.value)}
                      >
                        <option value="">Обери відповідь</option>
                        {options.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    )}

                    {question.question_type === "text" && (
                      <textarea
                        required={question.is_required}
                        value={answers[question.id] ?? ""}
                        onChange={(event) => updateAnswer(question.id, event.target.value)}
                      />
                    )}
                  </label>
                );
              })}
            </div>

            {status && <p className="supabase-admin-error">{status}</p>}

            <button className="primary-button" type="submit" disabled={isSubmitting || requiredMissing}>
              {isSubmitting ? "Надсилання..." : "Надіслати відгук"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
