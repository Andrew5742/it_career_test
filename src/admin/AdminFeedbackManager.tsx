import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
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

export function AdminFeedbackManager() {
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

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `feedback-${selectedFormId || "responses"}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
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
    </div>
  );
}
