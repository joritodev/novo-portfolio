"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Pencil, X, Upload, GripVertical } from "lucide-react";
import Sidebar from "@/app/admin/Sidebar";
import { supabase } from "@/lib/supabase";
import { persistOrder, nextSortOrder } from "@/lib/reorder";
import SortableItem from "@/components/admin/SortableItem";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import Swal from "sweetalert2";

export default function CertificatesPage() {
  const [certificates, setCertificates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  const [title, setTitle] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState("");

  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchCertificates();

    const channel = supabase
      .channel("certificates-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "certificates",
        },
        () => {
          fetchCertificates();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchCertificates = async () => {
  const { data } = await supabase
    .from("certificates")
    .select("*")
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  setCertificates(data || []);
  setLoading(false);
};

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = certificates.findIndex((c) => c.id === active.id);
    const newIndex = certificates.findIndex((c) => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(certificates, oldIndex, newIndex);
    setCertificates(reordered);

    await persistOrder("certificates", reordered);
  };

  const resetForm = () => {
    setTitle("");
    setImage(null);
    setPreview("");
    setEditId(null);
  };

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) return;

    setImage(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === "Enter" && (e.target as HTMLElement).tagName !== "TEXTAREA") {
      e.preventDefault();
      const form = e.currentTarget;
      const elements = Array.from(form.elements) as HTMLElement[];
      const focusable = elements.filter(el => 
        !(el as any).disabled && 
        (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'BUTTON') &&
        el.getAttribute('type') !== 'hidden'
      );
      const index = focusable.indexOf(e.target as HTMLElement);
      if (index > -1 && index < focusable.length - 1) {
        if (focusable[index].getAttribute('type') === 'submit') {
          form.requestSubmit();
        } else {
          focusable[index + 1].focus();
        }
      } else if (index === focusable.length - 1) {
        form.requestSubmit();
      }
    }
  };

  const handleSave = async () => {
    if (!title.trim()) return;

    setSaving(true);

    let imageUrl = preview;

    if (image) {
      const fileName = `certificate-${Date.now()}-${image.name}`;

      const { error: uploadError } = await supabase.storage
        .from("certificates")
        .upload(fileName, image);

      if (!uploadError) {
        const { data } = supabase.storage
          .from("certificates")
          .getPublicUrl(fileName);

        imageUrl = data.publicUrl;
      } else {
        setSaving(false);
        Swal.fire({
          title: "Erro no Upload",
          text: "Não foi possível fazer upload da imagem. Verifique o bucket 'certificates' no Supabase.",
          icon: "error",
          background: "#111",
          color: "#fff",
        });
        return;
      }
    }

    // Impede salvar URLs temporárias blob:
    if (imageUrl && imageUrl.startsWith("blob:")) {
      imageUrl = "";
    }

    const { error } = editId
      ? await supabase
          .from("certificates")
          .update({
            title,
            image_url: imageUrl,
          })
          .eq("id", editId)
      : await supabase.from("certificates").insert([
          {
            title,
            image_url: imageUrl,
            sort_order: nextSortOrder(certificates),
          },
        ]);

    setSaving(false);

    if (error) {
      console.error("Erro ao salvar certificado:", error);
      Swal.fire({
        title: "Falha",
        text: error.message.includes("row-level security")
          ? "Sem permissão para salvar. Configure as políticas RLS no Supabase."
          : "Falha ao salvar certificado.",
        icon: "error",
        background: "#111",
        color: "#fff",
      });
      return;
    }

    setOpen(false);
    resetForm();
    fetchCertificates();
  };

  const handleDelete = async (id: number) => {
    const result = await Swal.fire({
      title: "Deletar Certificado?",
      text: "O certificado deletado não pode ser recuperado.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sim, Deletar",
      cancelButtonText: "Cancelar",
      background: "#111",
      color: "#fff",
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#27272a",
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    const { error } = await supabase.from("certificates").delete().eq("id", id);

    if (!error) {
      setCertificates((prev) => prev.filter((item) => item.id !== id));

      Swal.fire({
        title: "Deletado!",
        text: "Certificado deletado com sucesso.",
        icon: "success",
        timer: 1800,
        showConfirmButton: false,
        background: "#111",
        color: "#fff",
      });
    } else {
      Swal.fire({
        title: "Falha",
        text: "Falha ao deletar certificado.",
        icon: "error",
        background: "#111",
        color: "#fff",
      });
    }
  };

  const handleEdit = (item: any) => {
    setTitle(item.title);
    setPreview(item.image_url);
    setEditId(item.id);
    setOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* SIDEBAR */}
      <Sidebar />

      {/* MAIN */}
      <main className="lg:ml-[250px] min-h-screen px-4 sm:px-6 lg:px-8 pt-[90px] lg:pt-6 pb-6">
        <div className="py-6 lg:py-8">
          {/* HEADER */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Certificados</h1>

              <p className="text-sm text-white/40 mt-1">
                Gerencie seus certificados · arraste pelo ícone para reordenar
              </p>
            </div>

            <button
              onClick={() => {
                resetForm();
                setOpen(true);
              }}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-white text-black hover:scale-[1.02] transition"
            >
              <Plus size={16} />
              Adicionar Certificado
            </button>
          </div>

          {/* CONTENT */}
          {loading ? (
            <div className="text-white/50 text-sm">Carregando certificados...</div>
          ) : certificates.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] h-[240px] flex items-center justify-center text-white/35">
              Nenhum certificado encontrado
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={certificates.map((c) => c.id)}
                strategy={rectSortingStrategy}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5 pb-6">
                  {certificates.map((item) => (
                    <SortableItem key={item.id} id={item.id}>
                      {({ attributes, listeners }) => (
                        <div className="relative border border-white/10 bg-white/[0.03] rounded-2xl p-4 hover:border-white/25 transition-all duration-300 flex flex-col h-full">
                          {/* DRAG HANDLE */}
                          <button
                            type="button"
                            {...attributes}
                            {...listeners}
                            className="absolute top-2 left-2 z-10 w-8 h-8 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/60 hover:text-white cursor-grab active:cursor-grabbing touch-none"
                            title="Arraste para reordenar"
                            aria-label="Arraste para reordenar"
                          >
                            <GripVertical size={15} />
                          </button>

                          {/* IMAGE */}
                          <div className="w-full h-[150px] rounded-xl overflow-hidden bg-white/[0.03] mb-4">
                            {item.image_url ? (
                              <img
                                src={item.image_url}
                                className="w-full h-full object-cover hover:scale-105 transition duration-500"
                              />
                            ) : (
                              <div className="w-full h-full bg-white/[0.03]" />
                            )}
                          </div>

                          {/* TITLE */}
                          <h2 className="font-semibold text-[15px] mb-3 line-clamp-2 min-h-[42px]">
                            {item.title}
                          </h2>

                          {/* DATE */}
                          <span className="text-[11px] text-white/30 mb-4">
                            {item.created_at
                              ? new Date(item.created_at).toLocaleDateString()
                              : "No Date"}
                          </span>

                          {/* ACTION */}
                          <div className="flex gap-2 mt-auto">
                            <button
                              onClick={() => handleEdit(item)}
                              className="flex-1 px-3 py-2 rounded-xl border border-white/10 hover:bg-white/10 transition flex items-center justify-center gap-2 text-sm"
                            >
                              <Pencil size={14} />
                              Editar
                            </button>

                            <button
                              onClick={() => handleDelete(item.id)}
                              className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition flex items-center justify-center text-red-300"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      )}
                    </SortableItem>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </main>

      {/* MODAL */}
      {open && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center px-3 sm:px-4 py-4">
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSave(); }}
            onKeyDown={handleFormKeyDown}
            className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-[#111] border border-white/10 p-5 sm:p-6 max-h-[92vh] overflow-y-auto"
          >
            {/* HEADER */}
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg sm:text-xl font-semibold">
                {editId ? "Editar Certificado" : "Adicionar Certificado"}
              </h2>

              <button
                onClick={() => {
                  setOpen(false);
                  resetForm();
                }}
                className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>

            {/* IMAGE */}
            <label className="border border-dashed border-white/10 rounded-2xl bg-[#0f0f0f] h-44 sm:h-52 flex flex-col items-center justify-center cursor-pointer overflow-hidden mb-4">
              {preview ? (
                <img src={preview} className="w-full h-full object-cover" />
              ) : (
                <>
                  <Upload size={24} className="text-white/50 mb-2" />

                  <p className="text-sm text-white/60">
                    Upload Imagem
                  </p>
                </>
              )}

              <input
                type="file"
                hidden
                accept="image/*"
                onChange={handleImage}
              />
            </label>

            {/* TITLE */}
            <input
              placeholder="Título do Certificado"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-[#0f0f0f] border border-white/10 outline-none mb-5 text-sm"
            />

            {/* BUTTON */}
            <div className="flex flex-col sm:flex-row justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  resetForm();
                }}
                className="w-full sm:w-auto px-4 py-3 rounded-xl border border-white/10 hover:bg-white/5"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={saving}
                className="w-full sm:w-auto px-5 py-3 rounded-xl bg-white text-black font-medium"
              >
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
