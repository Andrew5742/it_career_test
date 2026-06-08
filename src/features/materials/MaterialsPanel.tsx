import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import type { MaterialRecord } from "../../lib/contentTypes";

type MaterialsPanelProps = {
  fallbackMaterials: MaterialRecord[];
};

export function MaterialsPanel({ fallbackMaterials }: MaterialsPanelProps) {
  const [materials, setMaterials] = useState<MaterialRecord[]>(fallbackMaterials);
  const [source, setSource] = useState<"database" | "fallback">("fallback");

  useEffect(() => {
    let isMounted = true;

    async function loadMaterials() {
      if (!supabase) {
        setMaterials(fallbackMaterials);
        setSource("fallback");
        return;
      }

      const { data, error } = await supabase
        .from("materials")
        .select("id,title,description,type,view_url,download_url,is_active,sort_order,created_at")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });

      if (!isMounted) {
        return;
      }

      if (error || !data || data.length === 0) {
        setMaterials(fallbackMaterials);
        setSource("fallback");
        return;
      }

      setMaterials(data as MaterialRecord[]);
      setSource("database");
    }

    loadMaterials();

    return () => {
      isMounted = false;
    };
  }, [fallbackMaterials]);

  return (
    <>
      <p className="lead">
        У цьому розділі матеріали завантажуються з Supabase, а якщо база ще не налаштована або запит не вдався,
        використовується локальний fallback.
      </p>

      {source === "fallback" && (
        <p className="inline-status">Показано локальні матеріали, бо Supabase недоступний або ще не заповнений.</p>
      )}

      <div className="materials-list">
        {materials.map((doc) => (
          <article key={doc.id} className="material-card">
            <div className="material-type">{doc.type}</div>
            <h3>{doc.title}</h3>
            <p>{doc.description}</p>
            {doc.view_url && (
              <a className="primary-button" href={doc.view_url} target="_blank" rel="noreferrer">
                Відкрити презентацію
              </a>
            )}
            {doc.download_url && (
              <a className="secondary-button" href={doc.download_url} target="_blank" rel="noreferrer">
                Завантажити PPTX
              </a>
            )}
          </article>
        ))}
      </div>
    </>
  );
}
