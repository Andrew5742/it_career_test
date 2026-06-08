import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { supabase } from "../lib/supabaseClient";
import type { QuestionType, Quiz, QuizAnswer, QuizDifficulty, QuizQuestion, VisualType } from "../lib/contentTypes";

const questionTypes: QuestionType[] = ["role", "task", "tool", "myth", "situation", "specialty"];
const visualTypes: VisualType[] = [
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
  "general",
];
const difficulties: QuizDifficulty[] = ["easy", "medium", "hard"];

const emptyQuiz = {
  slug: "",
  title: "",
  description: "",
  default_question_count: 10,
  is_active: true,
};

const emptyQuestion = {
  question_text: "",
  question_type: "role" as QuestionType,
  explanation: "",
  visual_type: "general" as VisualType,
  difficulty: "easy" as QuizDifficulty,
  tags: "",
  is_active: true,
  sort_order: 0,
};

type EditableAnswer = Omit<QuizAnswer, "id" | "question_id" | "tags"> & {
  id?: string;
  question_id?: string;
  tags: string;
};

const emptyAnswers: EditableAnswer[] = [0, 1, 2, 3].map((index) => ({
  answer_text: "",
  is_correct: index === 0,
  tags: "",
  sort_order: index + 1,
}));

function tagsFromText(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function tagsToText(value: string[] | null | undefined) {
  return Array.isArray(value) ? value.join(", ") : "";
}

export function AdminQuizManager() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, QuizAnswer[]>>({});
  const [quizDraft, setQuizDraft] = useState(emptyQuiz);
  const [questionDraft, setQuestionDraft] = useState(emptyQuestion);
  const [answerDrafts, setAnswerDrafts] = useState<EditableAnswer[]>(emptyAnswers);
  const [selectedQuizId, setSelectedQuizId] = useState("");
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  const selectedQuiz = useMemo(() => quizzes.find((item) => item.id === selectedQuizId), [quizzes, selectedQuizId]);

  async function loadQuizzes() {
    if (!supabase) {
      setStatus("Supabase ще не налаштований");
      return;
    }

    const { data, error } = await supabase
      .from("quizzes")
      .select("id,slug,title,description,default_question_count,is_active,created_at,updated_at")
      .order("created_at", { ascending: false });

    if (error) {
      setStatus(error.message);
      return;
    }

    const nextQuizzes = (data ?? []) as Quiz[];
    setQuizzes(nextQuizzes);
    setSelectedQuizId((current) => current || nextQuizzes[0]?.id || "");
    setStatus("");
  }

  async function loadQuestions(quizId: string) {
    if (!supabase || !quizId) {
      setQuestions([]);
      setAnswers({});
      return;
    }

    const { data, error } = await supabase
      .from("quiz_questions")
      .select("id,quiz_id,question_text,question_type,explanation,visual_type,difficulty,tags,is_active,sort_order,created_at,updated_at")
      .eq("quiz_id", quizId)
      .order("sort_order", { ascending: true });

    if (error) {
      setStatus(error.message);
      return;
    }

    const nextQuestions = (data ?? []) as QuizQuestion[];
    setQuestions(nextQuestions);

    if (nextQuestions.length === 0) {
      setAnswers({});
      return;
    }

    const ids = nextQuestions.map((item) => item.id);
    const { data: answerData, error: answerError } = await supabase
      .from("quiz_answers")
      .select("id,question_id,answer_text,is_correct,tags,sort_order")
      .in("question_id", ids)
      .order("sort_order", { ascending: true });

    if (answerError) {
      setStatus(answerError.message);
      return;
    }

    const grouped: Record<string, QuizAnswer[]> = {};
    for (const answer of (answerData ?? []) as QuizAnswer[]) {
      grouped[answer.question_id] = [...(grouped[answer.question_id] ?? []), answer];
    }
    setAnswers(grouped);
  }

  useEffect(() => {
    loadQuizzes();
  }, []);

  useEffect(() => {
    loadQuestions(selectedQuizId);
  }, [selectedQuizId]);

  function updateQuizDraft(field: keyof typeof emptyQuiz) {
    return (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value =
        event.currentTarget.type === "checkbox"
          ? (event.currentTarget as HTMLInputElement).checked
          : event.currentTarget.type === "number"
            ? Number(event.currentTarget.value)
            : event.currentTarget.value;
      setQuizDraft((current) => ({ ...current, [field]: value }));
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

  function updateQuiz(id: string, field: keyof Quiz, value: string | number | boolean | null) {
    setQuizzes((current) => current.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  }

  function updateQuestion(id: string, field: keyof QuizQuestion, value: string | number | boolean | string[] | null) {
    setQuestions((current) => current.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  }

  function updateAnswerDraft(index: number, field: keyof EditableAnswer, value: string | number | boolean) {
    setAnswerDrafts((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)));
  }

  function markCorrectAnswer(index: number) {
    setAnswerDrafts((current) => current.map((item, itemIndex) => ({ ...item, is_correct: itemIndex === index })));
  }

  async function createQuiz(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;

    const { error } = await supabase.from("quizzes").insert({
      slug: quizDraft.slug,
      title: quizDraft.title,
      description: quizDraft.description || null,
      default_question_count: Number(quizDraft.default_question_count),
      is_active: quizDraft.is_active,
    });

    if (error) {
      setStatus(error.message);
      return;
    }

    setQuizDraft(emptyQuiz);
    await loadQuizzes();
  }

  async function saveQuiz(quiz: Quiz) {
    if (!supabase) return;

    const { error } = await supabase
      .from("quizzes")
      .update({
        slug: quiz.slug,
        title: quiz.title,
        description: quiz.description || null,
        default_question_count: Number(quiz.default_question_count),
        is_active: quiz.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", quiz.id);

    setStatus(error ? error.message : "Квіз збережено");
  }

  async function createQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !selectedQuizId) return;

    const { data, error } = await supabase
      .from("quiz_questions")
      .insert({
        quiz_id: selectedQuizId,
        question_text: questionDraft.question_text,
        question_type: questionDraft.question_type,
        explanation: questionDraft.explanation || null,
        visual_type: questionDraft.visual_type,
        difficulty: questionDraft.difficulty,
        tags: tagsFromText(questionDraft.tags),
        is_active: questionDraft.is_active,
        sort_order: Number(questionDraft.sort_order),
      })
      .select("id")
      .single();

    if (error || !data) {
      setStatus(error?.message ?? "Не вдалося створити питання");
      return;
    }

    await saveAnswers(data.id, answerDrafts);
    setQuestionDraft(emptyQuestion);
    setAnswerDrafts(emptyAnswers);
    await loadQuestions(selectedQuizId);
  }

  async function saveQuestion(question: QuizQuestion) {
    if (!supabase) return;

    const { error } = await supabase
      .from("quiz_questions")
      .update({
        question_text: question.question_text,
        question_type: question.question_type,
        explanation: question.explanation || null,
        visual_type: question.visual_type,
        difficulty: question.difficulty,
        tags: question.tags,
        is_active: question.is_active,
        sort_order: Number(question.sort_order),
        updated_at: new Date().toISOString(),
      })
      .eq("id", question.id);

    setStatus(error ? error.message : "Питання збережено");
  }

  async function deactivateQuestion(question: QuizQuestion) {
    if (!supabase) return;
    const { error } = await supabase.from("quiz_questions").update({ is_active: false }).eq("id", question.id);
    if (error) {
      setStatus(error.message);
      return;
    }
    updateQuestion(question.id, "is_active", false);
    setStatus("Питання деактивовано");
  }

  async function deleteQuestion(question: QuizQuestion) {
    if (!supabase) return;
    const { error } = await supabase.from("quiz_questions").delete().eq("id", question.id);
    if (error) {
      setStatus(error.message);
      return;
    }
    setQuestions((current) => current.filter((item) => item.id !== question.id));
    setStatus("Питання видалено");
  }

  async function moveQuestion(question: QuizQuestion, direction: -1 | 1) {
    const nextOrder = Number(question.sort_order) + direction;
    updateQuestion(question.id, "sort_order", nextOrder);
    await saveQuestion({ ...question, sort_order: nextOrder });
    await loadQuestions(selectedQuizId);
  }

  async function saveAnswers(questionId: string, nextAnswers: EditableAnswer[]) {
    if (!supabase) return;

    const rows = nextAnswers.map((answer, index) => ({
      question_id: questionId,
      answer_text: answer.answer_text,
      is_correct: answer.is_correct,
      tags: tagsFromText(answer.tags),
      sort_order: Number(answer.sort_order || index + 1),
    }));

    await supabase.from("quiz_answers").delete().eq("question_id", questionId);
    const { error } = await supabase.from("quiz_answers").insert(rows);
    if (error) {
      setStatus(error.message);
    }
  }

  function beginEditAnswers(question: QuizQuestion) {
    const currentAnswers = answers[question.id] ?? [];
    setEditingQuestionId(question.id);
    setAnswerDrafts(
      [0, 1, 2, 3].map((index) => {
        const answer = currentAnswers[index];
        return answer
          ? {
              id: answer.id,
              question_id: answer.question_id,
              answer_text: answer.answer_text,
              is_correct: answer.is_correct,
              tags: tagsToText(answer.tags),
              sort_order: answer.sort_order,
            }
          : { ...emptyAnswers[index] };
      }),
    );
  }

  async function saveEditingAnswers() {
    if (!editingQuestionId) return;
    await saveAnswers(editingQuestionId, answerDrafts);
    setEditingQuestionId(null);
    setAnswerDrafts(emptyAnswers);
    await loadQuestions(selectedQuizId);
    setStatus("Відповіді збережено");
  }

  return (
    <div className="admin-manager">
      <h2>Квізи</h2>
      <p className="lead">Конструктор квізів: квізи, питання, 4 відповіді, правильна відповідь, теги, visual type і порядок.</p>
      {status && <p className="inline-status">{status}</p>}

      <form className="admin-edit-grid" onSubmit={createQuiz}>
        <h3>Створити квіз</h3>
        <input placeholder="slug" value={quizDraft.slug} onChange={updateQuizDraft("slug")} required />
        <input placeholder="title" value={quizDraft.title} onChange={updateQuizDraft("title")} required />
        <textarea placeholder="description" value={quizDraft.description} onChange={updateQuizDraft("description")} />
        <input type="number" value={quizDraft.default_question_count} onChange={updateQuizDraft("default_question_count")} />
        <label className="admin-checkbox">
          <input type="checkbox" checked={quizDraft.is_active} onChange={updateQuizDraft("is_active")} />
          is_active
        </label>
        <button className="primary-button" type="submit">Створити квіз</button>
      </form>

      <div className="admin-list">
        <h3>Список квізів</h3>
        {quizzes.map((quiz) => (
          <article key={quiz.id} className="admin-list-card">
            <div className="admin-edit-grid">
              <input value={quiz.slug} onChange={(event) => updateQuiz(quiz.id, "slug", event.target.value)} />
              <input value={quiz.title} onChange={(event) => updateQuiz(quiz.id, "title", event.target.value)} />
              <textarea value={quiz.description ?? ""} onChange={(event) => updateQuiz(quiz.id, "description", event.target.value)} />
              <input
                type="number"
                value={quiz.default_question_count}
                onChange={(event) => updateQuiz(quiz.id, "default_question_count", Number(event.target.value))}
              />
              <label className="admin-checkbox">
                <input
                  type="checkbox"
                  checked={quiz.is_active}
                  onChange={(event) => updateQuiz(quiz.id, "is_active", event.target.checked)}
                />
                is_active
              </label>
            </div>
            <div className="admin-actions">
              <button className="secondary-button" type="button" onClick={() => saveQuiz(quiz)}>Зберегти</button>
              <button className="ghost-button" type="button" onClick={() => setSelectedQuizId(quiz.id)}>Відкрити питання</button>
            </div>
          </article>
        ))}
      </div>

      {selectedQuiz && (
        <>
          <h3>Питання квіза: {selectedQuiz.title}</h3>
          <form className="admin-edit-grid" onSubmit={createQuestion}>
            <textarea placeholder="question_text" value={questionDraft.question_text} onChange={updateQuestionDraft("question_text")} required />
            <select value={questionDraft.question_type} onChange={updateQuestionDraft("question_type")}>
              {questionTypes.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <select value={questionDraft.visual_type} onChange={updateQuestionDraft("visual_type")}>
              {visualTypes.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <select value={questionDraft.difficulty} onChange={updateQuestionDraft("difficulty")}>
              {difficulties.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <input placeholder="tags через кому" value={questionDraft.tags} onChange={updateQuestionDraft("tags")} />
            <textarea placeholder="explanation" value={questionDraft.explanation} onChange={updateQuestionDraft("explanation")} />
            <input type="number" value={questionDraft.sort_order} onChange={updateQuestionDraft("sort_order")} />
            <label className="admin-checkbox">
              <input type="checkbox" checked={questionDraft.is_active} onChange={updateQuestionDraft("is_active")} />
              is_active
            </label>

            <div className="quiz-answer-grid">
              {answerDrafts.map((answer, index) => (
                <div key={index} className="quiz-answer-row">
                  <input
                    placeholder={`Відповідь ${index + 1}`}
                    value={answer.answer_text}
                    onChange={(event) => updateAnswerDraft(index, "answer_text", event.target.value)}
                    required
                  />
                  <input
                    placeholder="tags"
                    value={answer.tags}
                    onChange={(event) => updateAnswerDraft(index, "tags", event.target.value)}
                  />
                  <label className="admin-checkbox">
                    <input type="radio" name="new-correct-answer" checked={answer.is_correct} onChange={() => markCorrectAnswer(index)} />
                    правильна
                  </label>
                </div>
              ))}
            </div>
            <button className="primary-button" type="submit">Створити питання</button>
          </form>

          <div className="admin-list">
            {questions.map((question) => (
              <article key={question.id} className="admin-list-card">
                <div className="admin-edit-grid">
                  <textarea value={question.question_text} onChange={(event) => updateQuestion(question.id, "question_text", event.target.value)} />
                  <select value={question.question_type} onChange={(event) => updateQuestion(question.id, "question_type", event.target.value as QuestionType)}>
                    {questionTypes.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                  <select value={question.visual_type} onChange={(event) => updateQuestion(question.id, "visual_type", event.target.value as VisualType)}>
                    {visualTypes.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                  <select value={question.difficulty} onChange={(event) => updateQuestion(question.id, "difficulty", event.target.value as QuizDifficulty)}>
                    {difficulties.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                  <input value={tagsToText(question.tags)} onChange={(event) => updateQuestion(question.id, "tags", tagsFromText(event.target.value))} />
                  <textarea value={question.explanation ?? ""} onChange={(event) => updateQuestion(question.id, "explanation", event.target.value)} />
                  <input type="number" value={question.sort_order} onChange={(event) => updateQuestion(question.id, "sort_order", Number(event.target.value))} />
                  <label className="admin-checkbox">
                    <input
                      type="checkbox"
                      checked={question.is_active}
                      onChange={(event) => updateQuestion(question.id, "is_active", event.target.checked)}
                    />
                    is_active
                  </label>
                </div>
                <div className="admin-actions">
                  <button className="ghost-button" type="button" onClick={() => moveQuestion(question, -1)}>↑</button>
                  <button className="ghost-button" type="button" onClick={() => moveQuestion(question, 1)}>↓</button>
                  <button className="secondary-button" type="button" onClick={() => saveQuestion(question)}>Зберегти питання</button>
                  <button className="secondary-button" type="button" onClick={() => beginEditAnswers(question)}>Редагувати відповіді</button>
                  <button className="ghost-button" type="button" onClick={() => deactivateQuestion(question)}>Деактивувати</button>
                  <button className="ghost-button" type="button" onClick={() => deleteQuestion(question)}>Видалити</button>
                </div>

                {editingQuestionId === question.id && (
                  <div className="quiz-answer-grid">
                    {answerDrafts.map((answer, index) => (
                      <div key={index} className="quiz-answer-row">
                        <input value={answer.answer_text} onChange={(event) => updateAnswerDraft(index, "answer_text", event.target.value)} />
                        <input value={answer.tags} onChange={(event) => updateAnswerDraft(index, "tags", event.target.value)} />
                        <input
                          type="number"
                          value={answer.sort_order}
                          onChange={(event) => updateAnswerDraft(index, "sort_order", Number(event.target.value))}
                        />
                        <label className="admin-checkbox">
                          <input type="radio" name={`correct-${question.id}`} checked={answer.is_correct} onChange={() => markCorrectAnswer(index)} />
                          правильна
                        </label>
                      </div>
                    ))}
                    <button className="primary-button" type="button" onClick={saveEditingAnswers}>Зберегти відповіді</button>
                  </div>
                )}
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
