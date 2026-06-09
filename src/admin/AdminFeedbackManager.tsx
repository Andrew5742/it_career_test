import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { supabase } from "../lib/supabaseClient";
import type { FeedbackFormRecord, FeedbackQuestionRecord, WorkshopRecord } from "../lib/contentTypes";

const emptyWorkshop = {
  title: "",
  description: "",
  event_date: "",
  location: "",
  is_active: true,
};

const emptyForm = {
  workshop_id: "",
  title: "",
  description: "",
  is_active: true,
};

const emptyQuestion = {
  question_text: "",
  question_type: "text",
  options: "",
  is_required: false,
  sort_order: 0,
};

type ResponseWithAnswers = {
  id: string;
  participant_name: string | null;
  participant_contact: string | null;
  created_at: string;
  feedback_answers?: {
    question_id: string;
    answer_text: string | null;
    answer_value: unknown | null;
  }[];
};

type QuestionReport = {
  question: FeedbackQuestionRecord;
  totalAnswers: number;
  averageRating: number | null;
  distribution: { label: string; count: number; percent: number }[];
  textAnswers: string[];
};

export function AdminFeedbackManager() {
  const pdfReportRef = useRef<HTMLDivElement | null>(null);
  const [workshops, setWorkshops] = useState<WorkshopRecord[]>([]);
  const [forms, setForms] = useState<FeedbackFormRecord[]>([]);
  const [questions, setQuestions] = useState<FeedbackQuestionRecord[]>([]);
  const [responses, setResponses] = useState<ResponseWithAnswers[]>([]);
  const [workshopDraft, setWorkshopDraft] = useState(emptyWorkshop);
  const [formDraft, setFormDraft] = useState(emptyForm);
  const [questionDraft, setQuestionDraft] = useState(emptyQuestion);
  const [selectedFormId, setSelectedFormId] = useState("");
  const [status, setStatus] = useState("");

  async function loadFeedback() {
    if (!supabase) {
      setStatus("Supabase ще не налаштований");
      return;
    }

    const [{ data: workshopData }, { data: formData }] = await Promise.all([
      supabase.from("workshops").select("id,title,description,event_date,location,is_active,created_at").order("created_at"),
      supabase.from("feedback_forms").select("id,workshop_id,title,description,is_active,created_at").order("created_at"),
    ]);

    const nextWorkshops = (workshopData ?? []) as WorkshopRecord[];
    const nextForms = (formData ?? []) as FeedbackFormRecord[];
    setWorkshops(nextWorkshops);
    setForms(nextForms);
    setSelectedFormId((current) => current || nextForms[0]?.id || "");
    setFormDraft((current) => ({ ...current, workshop_id: current.workshop_id || nextWorkshops[0]?.id || "" }));
    setStatus("");
  }

  async function loadQuestionsAndResponses(formId: string) {
    if (!supabase || !formId) {
      setQuestions([]);
      setResponses([]);
      return;
    }

    const [{ data: questionData }, { data: responseData }] = await Promise.all([
      supabase
        .from("feedback_questions")
        .select("id,form_id,question_text,question_type,options,is_required,sort_order")
        .eq("form_id", formId)
        .order("sort_order", { ascending: true }),
      supabase
        .from("feedback_responses")
        .select("id,participant_name,participant_contact,created_at,feedback_answers(question_id,answer_text,answer_value)")
        .eq("form_id", formId)
        .order("created_at", { ascending: false }),
    ]);

    setQuestions((questionData ?? []) as FeedbackQuestionRecord[]);
    setResponses((responseData ?? []) as ResponseWithAnswers[]);
  }

  useEffect(() => {
    loadFeedback();
  }, []);

  useEffect(() => {
    loadQuestionsAndResponses(selectedFormId);
  }, [selectedFormId]);

  const selectedForm = useMemo(() => forms.find((item) => item.id === selectedFormId), [forms, selectedFormId]);
  const selectedWorkshop = useMemo(
    () => workshops.find((item) => item.id === selectedForm?.workshop_id),
    [selectedForm?.workshop_id, workshops],
  );
  const reportData = useMemo(() => {
    return questions.map((question): QuestionReport => {
      const values = responses
        .map((response) => (response.feedback_answers ?? []).find((answer) => answer.question_id === question.id)?.answer_text?.trim() ?? "")
        .filter(Boolean);

      if (question.question_type === "rating_1_5") {
        const ratingCounts = [1, 2, 3, 4, 5].map((rating) => ({
          label: String(rating),
          count: values.filter((value) => Number(value) === rating).length,
          percent: values.length > 0 ? Math.round((values.filter((value) => Number(value) === rating).length / values.length) * 100) : 0,
        }));
        const ratingSum = values.reduce((sum, value) => sum + Number(value || 0), 0);
        return {
          question,
          totalAnswers: values.length,
          averageRating: values.length > 0 ? ratingSum / values.length : null,
          distribution: ratingCounts,
          textAnswers: [],
        };
      }

      if (question.question_type === "choice") {
        const counts = new Map<string, number>();
        for (const value of values) {
          counts.set(value, (counts.get(value) ?? 0) + 1);
        }
        return {
          question,
          totalAnswers: values.length,
          averageRating: null,
          distribution: [...counts.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([label, count]) => ({
              label,
              count,
              percent: values.length > 0 ? Math.round((count / values.length) * 100) : 0,
            })),
          textAnswers: [],
        };
      }

      return {
        question,
        totalAnswers: values.length,
        averageRating: null,
        distribution: [],
        textAnswers: values,
      };
    });
  }, [questions, responses]);

  function updateWorkshopDraft(field: keyof typeof emptyWorkshop) {
    return (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value =
        event.currentTarget.type === "checkbox" ? (event.currentTarget as HTMLInputElement).checked : event.currentTarget.value;
      setWorkshopDraft((current) => ({ ...current, [field]: value }));
    };
  }

  function updateFormDraft(field: keyof typeof emptyForm) {
    return (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const value =
        event.currentTarget.type === "checkbox" ? (event.currentTarget as HTMLInputElement).checked : event.currentTarget.value;
      setFormDraft((current) => ({ ...current, [field]: value }));
    };
  }

  function updateQuestionDraft(field: keyof typeof emptyQuestion) {
    return (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const value =
        event.currentTarget.type === "checkbox"
          ? (event.currentTarget as HTMLInputElement).checked
          : event.currentTarget.type === "number"
            ? Number(event.currentTarget.value)
            : event.currentTarget.value;
      setQuestionDraft((current) => ({ ...current, [field]: value }));
    };
  }

  async function createWorkshop(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;

    const { error } = await supabase.from("workshops").insert({
      title: workshopDraft.title,
      description: workshopDraft.description || null,
      event_date: workshopDraft.event_date || null,
      location: workshopDraft.location || null,
      is_active: workshopDraft.is_active,
    });

    if (error) {
      setStatus(error.message);
      return;
    }

    setWorkshopDraft(emptyWorkshop);
    await loadFeedback();
  }

  async function createForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;

    const { error } = await supabase.from("feedback_forms").insert({
      workshop_id: formDraft.workshop_id || null,
      title: formDraft.title,
      description: formDraft.description || null,
      is_active: formDraft.is_active,
    });

    if (error) {
      setStatus(error.message);
      return;
    }

    setFormDraft(emptyForm);
    await loadFeedback();
  }

  async function createQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !selectedFormId) return;

    const options = questionDraft.options
      ? questionDraft.options
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      : null;

    const { error } = await supabase.from("feedback_questions").insert({
      form_id: selectedFormId,
      question_text: questionDraft.question_text,
      question_type: questionDraft.question_type,
      options,
      is_required: questionDraft.is_required,
      sort_order: Number(questionDraft.sort_order),
    });

    if (error) {
      setStatus(error.message);
      return;
    }

    setQuestionDraft(emptyQuestion);
    await loadQuestionsAndResponses(selectedFormId);
  }

  function exportCsv() {
    const headers = ["created_at", "participant_name", "participant_contact", ...questions.map((item) => item.question_text)];
    const rows = responses.map((response) => {
      const answersByQuestion = new Map((response.feedback_answers ?? []).map((item) => [item.question_id, item.answer_text ?? ""]));
      return [
        response.created_at,
        response.participant_name ?? "",
        response.participant_contact ?? "",
        ...questions.map((question) => answersByQuestion.get(question.id) ?? ""),
      ];
    });

    const csv = `sep=;\r\n${[headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(";"))
      .join("\r\n")}`;

    const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `feedback-${selectedFormId || "responses"}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  async function clearResponses() {
    if (!supabase || !selectedFormId || responses.length === 0) return;

    const confirmed = window.confirm("Очистити всі відповіді для поточної форми? Цю дію не можна скасувати.");
    if (!confirmed) return;

    const { error } = await supabase.from("feedback_responses").delete().eq("form_id", selectedFormId);
    if (error) {
      setStatus(error.message);
      return;
    }

    setStatus("Відповіді очищено.");
    await loadQuestionsAndResponses(selectedFormId);
  }

  async function exportPdf() {
    const node = pdfReportRef.current;
    if (!node || !selectedForm) return;

    const previousStyle = node.getAttribute("style") ?? "";
    node.style.position = "fixed";
    node.style.left = "0";
    node.style.top = "0";
    node.style.width = "1120px";
    node.style.background = "#ffffff";
    node.style.zIndex = "-1";
    node.style.opacity = "1";
    node.style.pointerEvents = "none";

    try {
      if (document.fonts?.ready) {
        await document.fonts.ready;
      }

      const pages = Array.from(node.querySelectorAll<HTMLElement>(".feedback-pdf-page"));
      if (pages.length === 0) return;

      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
      const pageWidth = 210;
      const pageHeight = 297;

      for (let index = 0; index < pages.length; index += 1) {
        const canvas = await html2canvas(pages[index], {
          scale: 2,
          backgroundColor: "#ffffff",
          width: 1120,
          height: 1584,
          windowWidth: 1120,
          windowHeight: 1584,
          scrollX: 0,
          scrollY: 0,
          useCORS: true,
          logging: false,
        });
        const image = canvas.toDataURL("image/png", 1);
        if (index > 0) {
          pdf.addPage();
        }
        pdf.addImage(image, "PNG", 0, 0, pageWidth, pageHeight);
      }

      pdf.save(`feedback-report-${selectedFormId || "responses"}.pdf`);
    } finally {
      node.setAttribute("style", previousStyle);
    }
  }

  return (
    <div className="admin-manager">
      <h2>Відгуки</h2>
      <p className="lead">Воркшопи, форми, питання, перегляд відповідей і простий CSV-експорт.</p>
      {status && <p className="inline-status">{status}</p>}

      <div className="admin-two-columns">
        <form className="admin-edit-grid" onSubmit={createWorkshop}>
          <h3>Створити воркшоп</h3>
          <input placeholder="title" value={workshopDraft.title} onChange={updateWorkshopDraft("title")} required />
          <textarea placeholder="description" value={workshopDraft.description} onChange={updateWorkshopDraft("description")} />
          <input type="date" value={workshopDraft.event_date} onChange={updateWorkshopDraft("event_date")} />
          <input placeholder="location" value={workshopDraft.location} onChange={updateWorkshopDraft("location")} />
          <label className="admin-checkbox">
            <input type="checkbox" checked={workshopDraft.is_active} onChange={updateWorkshopDraft("is_active")} />
            is_active
          </label>
          <button className="primary-button" type="submit">
            Створити воркшоп
          </button>
        </form>

        <form className="admin-edit-grid" onSubmit={createForm}>
          <h3>Створити форму</h3>
          <select value={formDraft.workshop_id} onChange={updateFormDraft("workshop_id")}>
            <option value="">Без воркшопу</option>
            {workshops.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
          <input placeholder="title" value={formDraft.title} onChange={updateFormDraft("title")} required />
          <textarea placeholder="description" value={formDraft.description} onChange={updateFormDraft("description")} />
          <label className="admin-checkbox">
            <input type="checkbox" checked={formDraft.is_active} onChange={updateFormDraft("is_active")} />
            is_active
          </label>
          <button className="primary-button" type="submit">
            Створити форму
          </button>
        </form>
      </div>

      <label className="field">
        <span>Поточна форма</span>
        <select value={selectedFormId} onChange={(event) => setSelectedFormId(event.target.value)}>
          {forms.map((item) => (
            <option key={item.id} value={item.id}>
              {item.title}
            </option>
          ))}
        </select>
      </label>

      {selectedForm && (
        <form className="admin-edit-grid" onSubmit={createQuestion}>
          <h3>Додати питання до форми: {selectedForm.title}</h3>
          <textarea
            placeholder="question_text"
            value={questionDraft.question_text}
            onChange={updateQuestionDraft("question_text")}
            required
          />
          <select value={questionDraft.question_type} onChange={updateQuestionDraft("question_type")}>
            <option value="text">text</option>
            <option value="rating_1_5">rating_1_5</option>
            <option value="choice">choice</option>
          </select>
          <input placeholder="options через кому для choice" value={questionDraft.options} onChange={updateQuestionDraft("options")} />
          <input type="number" value={questionDraft.sort_order} onChange={updateQuestionDraft("sort_order")} />
          <label className="admin-checkbox">
            <input type="checkbox" checked={questionDraft.is_required} onChange={updateQuestionDraft("is_required")} />
            is_required
          </label>
          <button className="primary-button" type="submit">
            Додати питання
          </button>
        </form>
      )}

      <div className="admin-list">
        <h3>Питання</h3>
        {questions.map((item) => (
          <article key={item.id} className="admin-list-card compact">
            <strong>{item.question_text}</strong>
            <span>{item.question_type}</span>
          </article>
        ))}
      </div>

      <div className="admin-list">
        <div className="admin-section-head">
          <h3>Responses</h3>
          <button className="secondary-button" type="button" onClick={exportCsv} disabled={!selectedFormId || responses.length === 0}>
            Експорт CSV
          </button>
          <button className="secondary-button" type="button" onClick={exportPdf} disabled={!selectedFormId || responses.length === 0}>
            Експорт PDF
          </button>
          <button className="secondary-button danger-button" type="button" onClick={clearResponses} disabled={!selectedFormId || responses.length === 0}>
            Очистити відповіді
          </button>
        </div>
        {responses.map((response) => (
          <article key={response.id} className="admin-list-card compact">
            <strong>{response.participant_name || "Без імені"}</strong>
            <span>{response.participant_contact || "Без контакту"}</span>
            <small>{new Date(response.created_at).toLocaleString()}</small>
            {(response.feedback_answers ?? []).map((answer) => (
              <p key={`${response.id}-${answer.question_id}`}>{answer.answer_text}</p>
            ))}
          </article>
        ))}
      </div>

      <div ref={pdfReportRef} className="feedback-pdf-report" aria-hidden="true">
        <section className="feedback-pdf-page">
          <header className="feedback-pdf-hero">
            <span>Звіт за відгуками</span>
            <h1>{selectedForm?.title ?? "Форма відгуків"}</h1>
            <p>{selectedForm?.description || "Підсумок відповідей учасників воркшопу."}</p>
          </header>

          <section className="feedback-pdf-summary">
            <div>
              <strong>{responses.length}</strong>
              <span>відповідей</span>
            </div>
            <div>
              <strong>{questions.length}</strong>
              <span>питань</span>
            </div>
            <div>
              <strong>{selectedWorkshop?.title ?? "Без воркшопу"}</strong>
              <span>воркшоп</span>
            </div>
          </section>

          <section className="feedback-pdf-section">
            <h2>Огляд</h2>
            <p>PDF створено як окремі сторінки, щоб графіки й відповіді не розривалися між аркушами.</p>
          </section>
        </section>

        {reportData.map((item, index) => (
          <section key={item.question.id} className="feedback-pdf-page">
            <section className="feedback-pdf-section">
              <span className="feedback-pdf-kicker">Питання {index + 1}</span>
              <article className="feedback-pdf-question">
                <h3>{item.question.question_text}</h3>
                <p>
                  Тип: {item.question.question_type} · Відповідей: {item.totalAnswers}
                  {item.averageRating !== null ? ` · Середня оцінка: ${item.averageRating.toFixed(1)} / 5` : ""}
                </p>

                {item.distribution.length > 0 && (
                  <div className="feedback-pdf-bars">
                    {item.distribution.map((bar) => (
                      <div key={bar.label} className="feedback-pdf-bar-row">
                        <span>{bar.label}</span>
                        <div>
                          <i style={{ width: `${Math.max(4, bar.percent)}%` }} />
                        </div>
                        <strong>{bar.count}</strong>
                      </div>
                    ))}
                  </div>
                )}

                {item.textAnswers.length > 0 && (
                  <div className="feedback-pdf-text-list">
                    {item.textAnswers.slice(0, 12).map((answer, answerIndex) => (
                      <p key={`${item.question.id}-${answerIndex}`}>{answer}</p>
                    ))}
                  </div>
                )}
              </article>
            </section>
          </section>
        ))}
      </div>
    </div>
  );
}
