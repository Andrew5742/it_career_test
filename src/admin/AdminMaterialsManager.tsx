import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { supabase } from "../lib/supabaseClient";
import type { MaterialRecord } from "../lib/contentTypes";

const emptyMaterial = {
  title: "",
  description: "",
  type: "Google Slides",
  view_url: "",
  download_url: "",
  sort_order: 0,
  is_active: true,
};

type MaterialForm = typeof emptyMaterial;

export function AdminMaterialsManager() {
  const [materials, setMaterials] = useState<MaterialRecord[]>([]);
  const [draft, setDraft] = useState<MaterialForm>(emptyMaterial);
  const [status, setStatus] = useState("");

  async function loadMaterials() {
    if (!supabase) {
      setStatus("Supabase ще не налаштований");
      return;
    }

    const { data, error } = await supabase
      .from("materials")
      .select("id,title,description,type,view_url,download_url,is_active,sort_order,created_at")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      setStatus(error.message);
      return;
    }

    setMaterials((data ?? []) as MaterialRecord[]);
    setStatus("");
  }

  useEffect(() => {
    loadMaterials();
  }, []);

  function updateDraft(field: keyof MaterialForm, value: string | number | boolean) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function updateMaterial(id: string, field: keyof MaterialRecord, value: string | number | boolean | null) {
    setMaterials((current) => current.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  }

  async function createMaterial(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) {
      setStatus("Supabase ще не налаштований");
      return;
    }

    const { error } = await supabase.from("materials").insert({
      title: draft.title,
      description: draft.description || null,
      type: draft.type,
      view_url: draft.view_url || null,
      download_url: draft.download_url || null,
      sort_order: Number(draft.sort_order),
      is_active: draft.is_active,
    });

    if (error) {
      setStatus(error.message);
      return;
    }

    setDraft(emptyMaterial);
    await loadMaterials();
  }

  async function saveMaterial(material: MaterialRecord) {
    if (!supabase) {
      setStatus("Supabase ще не налаштований");
      return;
    }

    const { error } = await supabase
      .from("materials")
      .update({
        title: material.title,
        description: material.description || null,
        type: material.type,
        view_url: material.view_url || null,
        download_url: material.download_url || null,
        sort_order: Number(material.sort_order),
        is_active: material.is_active,
      })
      .eq("id", material.id);

    setStatus(error ? error.message : "Матеріал збережено");
  }

  async function deactivateMaterial(material: MaterialRecord) {
    if (!supabase) {
      setStatus("Supabase ще не налаштований");
      return;
    }

    const { error } = await supabase.from("materials").update({ is_active: false }).eq("id", material.id);
    if (error) {
      setStatus(error.message);
      return;
    }

    updateMaterial(material.id, "is_active", false);
    setStatus("Матеріал деактивовано");
  }

  function handleDraftChange(field: keyof MaterialForm) {
    return (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value =
        event.currentTarget.type === "checkbox"
          ? (event.currentTarget as HTMLInputElement).checked
          : event.currentTarget.type === "number"
            ? Number(event.currentTarget.value)
            : event.currentTarget.value;
      updateDraft(field, value);
    };
  }

  return (
    <div className="admin-manager">
      <h2>Матеріали</h2>
      <p className="lead">Список матеріалів, створення, редагування і деактивація записів з Supabase.</p>
      {status && <p className="inline-status">{status}</p>}

      <form className="admin-edit-grid" onSubmit={createMaterial}>
        <input placeholder="title" value={draft.title} onChange={handleDraftChange("title")} required />
        <input placeholder="type" value={draft.type} onChange={handleDraftChange("type")} required />
        <textarea placeholder="description" value={draft.description} onChange={handleDraftChange("description")} />
        <input placeholder="view_url" value={draft.view_url} onChange={handleDraftChange("view_url")} />
        <input placeholder="download_url" value={draft.download_url} onChange={handleDraftChange("download_url")} />
        <input type="number" value={draft.sort_order} onChange={handleDraftChange("sort_order")} />
        <label className="admin-checkbox">
          <input type="checkbox" checked={draft.is_active} onChange={handleDraftChange("is_active")} />
          is_active
        </label>
        <button className="primary-button" type="submit">
          Створити матеріал
        </button>
      </form>

      <div className="admin-list">
        {materials.map((material) => (
          <article key={material.id} className="admin-list-card">
            <div className="admin-edit-grid">
              <input value={material.title} onChange={(event) => updateMaterial(material.id, "title", event.target.value)} />
              <input value={material.type} onChange={(event) => updateMaterial(material.id, "type", event.target.value)} />
              <textarea
                value={material.description ?? ""}
                onChange={(event) => updateMaterial(material.id, "description", event.target.value)}
              />
              <input
                value={material.view_url ?? ""}
                onChange={(event) => updateMaterial(material.id, "view_url", event.target.value)}
              />
              <input
                value={material.download_url ?? ""}
                onChange={(event) => updateMaterial(material.id, "download_url", event.target.value)}
              />
              <input
                type="number"
                value={material.sort_order}
                onChange={(event) => updateMaterial(material.id, "sort_order", Number(event.target.value))}
              />
              <label className="admin-checkbox">
                <input
                  type="checkbox"
                  checked={material.is_active}
                  onChange={(event) => updateMaterial(material.id, "is_active", event.target.checked)}
                />
                is_active
              </label>
            </div>
            <div className="admin-actions">
              <button className="secondary-button" type="button" onClick={() => saveMaterial(material)}>
                Зберегти
              </button>
              <button className="ghost-button" type="button" onClick={() => deactivateMaterial(material)}>
                Деактивувати
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
