export type MaterialRecord = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  view_url: string | null;
  download_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
};

export type WorkshopRecord = {
  id: string;
  title: string;
  description: string | null;
  event_date: string | null;
  location: string | null;
  is_active: boolean;
  created_at?: string;
};

export type FeedbackFormRecord = {
  id: string;
  workshop_id: string | null;
  title: string;
  description: string | null;
  is_active: boolean;
  created_at?: string;
};

export type FeedbackQuestionRecord = {
  id: string;
  form_id: string;
  question_text: string;
  question_type: "rating_1_5" | "text" | "choice";
  options: unknown[] | null;
  is_required: boolean;
  sort_order: number;
};

export type FeedbackResponseRecord = {
  id: string;
  form_id: string;
  participant_name: string | null;
  participant_contact: string | null;
  created_at: string;
};

export type FeedbackAnswerRecord = {
  id: string;
  response_id: string;
  question_id: string;
  answer_text: string | null;
  answer_value: unknown | null;
};

export type QuestionType = "role" | "task" | "tool" | "myth" | "situation" | "specialty";

export type VisualType =
  | "frontend"
  | "backend"
  | "fullstack"
  | "qa"
  | "ux"
  | "data"
  | "ai"
  | "cybersecurity"
  | "devops"
  | "sysadmin"
  | "database"
  | "network"
  | "embedded"
  | "gamedev"
  | "manager"
  | "general";

export type QuizDifficulty = "easy" | "medium" | "hard";

export type Quiz = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  default_question_count: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

export type QuizQuestion = {
  id: string;
  quiz_id: string;
  question_text: string;
  question_type: QuestionType;
  explanation: string | null;
  visual_type: VisualType;
  difficulty: QuizDifficulty;
  tags: string[];
  is_active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
};

export type QuizAnswer = {
  id: string;
  question_id: string;
  answer_text: string;
  is_correct: boolean;
  tags: string[];
  sort_order: number;
};
