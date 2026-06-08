import { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "../../lib/supabaseClient";
import type { FeedbackFormRecord, WorkshopRecord } from "../../lib/contentTypes";

function createFeedbackUrl(formId: string) {
  const expires = Date.now() + 15 * 60 * 1000;
  const sessionId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.floor(Math.random() * 1000000)}`;

  const url = new URL(window.location.href);
  url.search = "";
  url.searchParams.set("mode", "feedback");
  url.searchParams.set("formId", formId);
  url.searchParams.set("expires", String(expires));
  url.searchParams.set("sessionId", sessionId);

  return { url: url.toString(), expires };
}

export function FeedbackTeacherPanel({ onBack }: { onBack: () => void }) {
  const [workshops, setWorkshops] = useState<WorkshopRecord[]>([]);
  const [forms, setForms] = useState<FeedbackFormRecord[]>([]);
  const [workshopId, setWorkshopId] = useState("");
  const [formId, setFormId] = useState("");
  const [qrUrl, setQrUrl] = useState("");
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadFeedbackOptions() {
      if (!supabase) {
        setStatus("Форма відгуків ще не налаштована");
        return;
      }

      const [{ data: workshopData, error: workshopError }, { data: formData, error: formError }] = await Promise.all([
        supabase
          .from("workshops")
          .select("id,title,description,event_date,location,is_active,created_at")
          .eq("is_active", true)
          .order("event_date", { ascending: false, nullsFirst: false }),
        supabase
          .from("feedback_forms")
          .select("id,workshop_id,title,description,is_active,created_at")
          .eq("is_active", true)
          .order("created_at", { ascending: false }),
      ]);

      if (!isMounted) {
        return;
      }

      if (workshopError || formError) {
        setStatus("Форма відгуків ще не налаштована");
        return;
      }

      const nextWorkshops = (workshopData ?? []) as WorkshopRecord[];
      const nextForms = (formData ?? []) as FeedbackFormRecord[];
      setWorkshops(nextWorkshops);
      setForms(nextForms);
      setWorkshopId(nextWorkshops[0]?.id ?? "");
      setFormId(nextForms[0]?.id ?? "");
      setStatus(nextForms.length > 0 ? "" : "Форма відгуків ще не налаштована");
    }

    loadFeedbackOptions();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredForms = useMemo(() => {
    if (!workshopId) {
      return forms;
    }

    return forms.filter((item) => item.workshop_id === workshopId);
  }, [forms, workshopId]);

  useEffect(() => {
    if (filteredForms.length > 0 && !filteredForms.some((item) => item.id === formId)) {
      setFormId(filteredForms[0].id);
    }
  }, [filteredForms, formId]);

  function generateQr() {
    if (!formId) {
      setStatus("Спочатку обери активну форму.");
      return;
    }

    const next = createFeedbackUrl(formId);
    setQrUrl(next.url);
    setExpiresAt(next.expires);
    setStatus("");
  }

  if (qrUrl) {
    return (
      <main className="qr-fullscreen">
        <button className="ghost-button qr-back" type="button" onClick={() => setQrUrl("")}>
          ← Назад
        </button>

        <section className="qr-stage">
          <div className="qr-live-badge">QR-відгук активний</div>
          <QRCodeSVG value={qrUrl} size={360} />
          <h1>Відгуки про воркшоп</h1>
          <p>Посилання активне 15 хвилин. Учні відкривають форму зі своїх телефонів.</p>
          {expiresAt && <strong>Дійсний до: {new Date(expiresAt).toLocaleTimeString()}</strong>}
          <p className="session-link">{qrUrl}</p>
        </section>
      </main>
    );
  }

  return (
    <>
      <button className="ghost-button" type="button" onClick={onBack}>
        ← На головну
      </button>
      <h2>Відгуки про воркшоп</h2>
      <p className="lead">Обери активний воркшоп і форму, а потім згенеруй QR-код для учнів.</p>

      {!supabase && <p className="inline-status">Форма відгуків ще не налаштована</p>}
      {status && supabase && <p className="inline-status">{status}</p>}

      {supabase && (
        <>
          <label className="field">
            <span>Воркшоп</span>
            <select value={workshopId} onChange={(event) => setWorkshopId(event.target.value)}>
              <option value="">Усі активні форми</option>
              {workshops.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Форма</span>
            <select value={formId} onChange={(event) => setFormId(event.target.value)}>
              {filteredForms.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </label>

          <div className="actions-row actions-row-single">
            <button className="primary-button" type="button" onClick={generateQr}>
              Згенерувати QR-код
            </button>
          </div>
        </>
      )}
    </>
  );
}
