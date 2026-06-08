import { useEffect, useState, type FormEvent } from "react";
import { type User } from "@supabase/supabase-js";
import { AdminFeedbackManager } from "./AdminFeedbackManager";
import { AdminMaterialsManager } from "./AdminMaterialsManager";
import { AdminQuizManager } from "./AdminQuizManager";
import { supabase } from "../lib/supabaseClient";

const dashboardSections = ["Матеріали", "Квізи", "Відгуки", "Результати"];
type AdminSection = "dashboard" | "materials" | "quizzes" | "feedback";

export function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [activeSection, setActiveSection] = useState<AdminSection>("dashboard");
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) {
      return;
    }

    setIsLoading(true);
    setStatus("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setStatus(error.message);
    } else {
      setUser(data.user);
    }

    setIsLoading(false);
  }

  async function handleLogout() {
    if (!supabase) {
      return;
    }

    await supabase.auth.signOut();
    setUser(null);
    setPassword("");
    setStatus("");
  }

  return (
    <main className="supabase-admin-page">
      <section className="supabase-admin-card">
        <div className="badge">Supabase admin</div>
        <h1>Адмін-панель</h1>

        {!supabase && (
          <p className="supabase-admin-notice">
            Supabase ще не налаштований. Додай VITE_SUPABASE_URL і VITE_SUPABASE_ANON_KEY у .env.local.
          </p>
        )}

        {supabase && !user && (
          <form className="supabase-admin-form" onSubmit={handleLogin}>
            <label className="field">
              <span>Email</span>
              <input
                autoComplete="email"
                name="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>

            <label className="field">
              <span>Password</span>
              <input
                autoComplete="current-password"
                name="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>

            {status && <p className="supabase-admin-error">{status}</p>}

            <button className="primary-button" type="submit" disabled={isLoading}>
              {isLoading ? "Вхід..." : "Увійти"}
            </button>
          </form>
        )}

        {supabase && user && (
          <div className="supabase-admin-dashboard">
            <p className="supabase-admin-success">Вхід виконано</p>
            <p className="lead">{user.email}</p>

            <div className="admin-tabs">
              <button className="ghost-button" type="button" onClick={() => setActiveSection("dashboard")}>
                Dashboard
              </button>
              <button className="ghost-button" type="button" onClick={() => setActiveSection("materials")}>
                Матеріали
              </button>
              <button className="ghost-button" type="button" onClick={() => setActiveSection("quizzes")}>
                Квізи
              </button>
              <button className="ghost-button" type="button" onClick={() => setActiveSection("feedback")}>
                Відгуки
              </button>
            </div>

            {activeSection === "dashboard" && (
              <div className="supabase-admin-grid">
                {dashboardSections.map((item) => (
                  <article key={item} className="supabase-admin-placeholder">
                    <h2>{item}</h2>
                    <p>{item === "Матеріали" || item === "Квізи" || item === "Відгуки" ? "Модуль доступний у вкладках вище." : "CRUD буде додано на наступних етапах."}</p>
                  </article>
                ))}
              </div>
            )}

            {activeSection === "materials" && <AdminMaterialsManager />}
            {activeSection === "quizzes" && <AdminQuizManager />}
            {activeSection === "feedback" && <AdminFeedbackManager />}

            <button className="secondary-button" type="button" onClick={handleLogout}>
              Вийти
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
