"use client";

import { useEffect, useState, useMemo } from "react";
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
import {
  Plus,
  Trash2,
  Pencil,
  X,
  Upload,
  Search,
  Sparkles,
  Check,
  Image as ImageIcon,
  RefreshCw,
  GripVertical,
} from "lucide-react";
import Swal from "sweetalert2";

interface SvglItem {
  id: number | string;
  title: string;
  category: string | string[];
  route: string | { light?: string; dark?: string };
  url?: string;
}

const getSvgUrl = (route: string | { light?: string; dark?: string }): string => {
  if (typeof route === "string") return route;
  if (!route) return "";
  return route.dark || route.light || "";
};

export default function TechStackPage() {
  const [techStacks, setTechStacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  const [name, setName] = useState("");
  const [logo, setLogo] = useState<File | null>(null);
  const [preview, setPreview] = useState("");

  const [saving, setSaving] = useState(false);

  // SVG Library State
  const [inputTab, setInputTab] = useState<"library" | "upload">("library");
  const [libraryLogos, setLibraryLogos] = useState<SvglItem[]>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [libraryError, setLibraryError] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todas");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchTechStacks();
    fetchLibraryLogos();

    const channel = supabase
      .channel("techstack-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tech_stack",
        },
        () => {
          fetchTechStacks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchTechStacks = async () => {
    const { data } = await supabase
      .from("tech_stack")
      .select("*")
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true });

    setTechStacks(data || []);
    setLoading(false);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = techStacks.findIndex((t) => t.id === active.id);
    const newIndex = techStacks.findIndex((t) => t.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(techStacks, oldIndex, newIndex);
    setTechStacks(reordered);

    await persistOrder("tech_stack", reordered);
  };

  const fetchLibraryLogos = async () => {
    setLoadingLibrary(true);
    setLibraryError(false);
    try {
      const res = await fetch("https://api.svgl.app");
      if (!res.ok) throw new Error("Falha ao carregar biblioteca SVGL");
      const data: SvglItem[] = await res.json();
      setLibraryLogos(data);
    } catch (err) {
      console.error("Erro ao carregar SVGL:", err);
      setLibraryError(true);
    } finally {
      setLoadingLibrary(false);
    }
  };

  const categories = useMemo(() => {
    const set = new Set<string>();
    libraryLogos.forEach((item) => {
      if (Array.isArray(item.category)) {
        item.category.forEach((c) => set.add(c));
      } else if (item.category) {
        set.add(item.category);
      }
    });
    return ["Todas", ...Array.from(set).sort()];
  }, [libraryLogos]);

  const filteredLogos = useMemo(() => {
    return libraryLogos.filter((item) => {
      const matchesSearch = item.title
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

      if (selectedCategory === "Todas") return matchesSearch;

      const itemCats = Array.isArray(item.category)
        ? item.category
        : [item.category];

      return matchesSearch && itemCats.includes(selectedCategory);
    });
  }, [libraryLogos, searchQuery, selectedCategory]);

  const resetForm = () => {
    setName("");
    setLogo(null);
    setPreview("");
    setEditId(null);
    setSearchQuery("");
    setSelectedCategory("Todas");
    setInputTab("library");
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

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLogo(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSelectLibraryItem = (item: SvglItem) => {
    const svgUrl = getSvgUrl(item.route);
    setPreview(svgUrl);
    setLogo(null); // Clear file upload when selecting library logo
    if (!name || editId === null) {
      setName(item.title);
    }
  };

  const handleSelectSimpleIconFallback = (query: string) => {
    const slug = query
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, "");
    if (!slug) return;
    const url = `https://cdn.simpleicons.org/${slug}`;
    setPreview(url);
    setLogo(null);
    if (!name) {
      setName(query);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) return;

    setSaving(true);

    let logoUrl = preview;

    if (logo) {
      const fileName = `tech-${Date.now()}-${logo.name}`;

      const { error: uploadError } = await supabase.storage
        .from("tech-stack")
        .upload(fileName, logo);

      if (!uploadError) {
        const { data } = supabase.storage
          .from("tech-stack")
          .getPublicUrl(fileName);

        logoUrl = data.publicUrl;
      } else {
        setSaving(false);
        Swal.fire({
          title: "Erro no Upload",
          text: "Não foi possível fazer upload da imagem. Verifique o bucket 'tech-stack' no Supabase.",
          icon: "error",
          background: "#111",
          color: "#fff",
        });
        return;
      }
    }

    // Impede salvar URLs temporárias blob:
    if (logoUrl && logoUrl.startsWith("blob:")) {
      logoUrl = "";
    }

    if (editId) {
      await supabase
        .from("tech_stack")
        .update({
          name,
          logo_url: logoUrl,
        })
        .eq("id", editId);
    } else {
      await supabase.from("tech_stack").insert([
        {
          name,
          logo_url: logoUrl,
          sort_order: nextSortOrder(techStacks),
        },
      ]);
    }

    setSaving(false);
    setOpen(false);
    resetForm();

    fetchTechStacks();
  };

  const handleDelete = async (id: number) => {
    const result = await Swal.fire({
      title: "Deletar Tech Stack?",
      text: "Esta ação não pode ser desfeita.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Deletar",
      cancelButtonText: "Cancelar",
      background: "#111",
      color: "#fff",
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#27272a",
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    const { error } = await supabase.from("tech_stack").delete().eq("id", id);

    if (!error) {
      setTechStacks((prev) => prev.filter((item) => item.id !== id));

      Swal.fire({
        title: "Deletado!",
        text: "Tech stack removido com sucesso.",
        icon: "success",
        timer: 1800,
        showConfirmButton: false,
        background: "#111",
        color: "#fff",
      });
    } else {
      Swal.fire({
        title: "Falhou",
        text: "Erro ao deletar tech stack.",
        icon: "error",
        background: "#111",
        color: "#fff",
      });
    }
  };

  const handleEdit = (item: any) => {
    setEditId(item.id);
    setName(item.name);
    setPreview(item.logo_url);
    setOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* SIDEBAR */}
      <div className="fixed left-0 top-0 h-screen z-40">
        <Sidebar />
      </div>

      {/* MAIN */}
      <main className="ml-0 lg:ml-[250px] min-h-screen">
        <div className="px-4 sm:px-6 md:px-8 pt-28 lg:pt-8 pb-8">
          {/* HEADER */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Tech Stack</h1>

              <p className="text-sm text-white/40 mt-1">
                Gerenciar a stack de tecnologia do portfólio · arraste pelo ícone para reordenar
              </p>
            </div>

            <button
              onClick={() => {
                resetForm();
                setOpen(true);
              }}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white text-black hover:scale-[1.02] transition font-medium text-sm"
            >
              <Plus size={16} />
              Adicionar Tech
            </button>
          </div>

          {/* GRID */}
          {loading ? (
            <div className="text-white/40 text-sm">Carregando...</div>
          ) : techStacks.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] h-[220px] flex items-center justify-center text-white/35 text-sm">
              Nenhuma tech stack encontrada
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={techStacks.map((t) => t.id)}
                strategy={rectSortingStrategy}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
                  {techStacks.map((item) => (
                    <SortableItem key={item.id} id={item.id}>
                      {({ attributes, listeners }) => (
                        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5 hover:border-white/20 transition flex flex-col justify-between h-full">
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                {...attributes}
                                {...listeners}
                                className="w-8 h-14 rounded-lg border border-white/10 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white cursor-grab active:cursor-grabbing touch-none"
                                title="Arraste para reordenar"
                                aria-label="Arraste para reordenar"
                              >
                                <GripVertical size={15} />
                              </button>

                              <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/10 overflow-hidden flex items-center justify-center shrink-0 p-2.5">
                                {item.logo_url ? (
                                  <img
                                    src={item.logo_url}
                                    alt={item.name}
                                    className="w-full h-full object-contain"
                                  />
                                ) : (
                                  <div className="w-full h-full bg-white/[0.03]" />
                                )}
                              </div>
                            </div>

                            <div className="flex gap-2 ml-3">
                              <button
                                onClick={() => handleEdit(item)}
                                className="w-9 h-9 rounded-xl border border-white/10 hover:bg-white/10 flex items-center justify-center transition"
                                title="Editar"
                              >
                                <Pencil size={14} />
                              </button>

                              <button
                                onClick={() => handleDelete(item.id)}
                                className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 flex items-center justify-center hover:bg-red-500/20 transition"
                                title="Deletar"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>

                          <h2 className="text-[14px] sm:text-[15px] font-medium break-words leading-relaxed text-white/90">
                            {item.name}
                          </h2>
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center px-4 py-6">
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSave(); }}
            onKeyDown={handleFormKeyDown}
            className="w-full max-w-2xl rounded-3xl bg-[#111] border border-white/10 p-5 sm:p-6 max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
          >
            {/* HEADER */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
              <div>
                <h2 className="text-lg sm:text-xl font-semibold">
                  {editId ? "Editar Tech Stack" : "Adicionar Tech Stack"}
                </h2>
                <p className="text-xs text-white/40 mt-0.5">
                  Escolha um ícone sem fundo da biblioteca ou faça upload
                </p>
              </div>

              <button
                onClick={() => {
                  setOpen(false);
                  resetForm();
                }}
                className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center shrink-0 text-white/60 hover:text-white transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* TAB SELECTOR */}
            <div className="flex gap-2 my-4 p-1 bg-white/[0.04] rounded-2xl border border-white/5 shrink-0">
              <button
                type="button"
                onClick={() => setInputTab("library")}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-medium flex items-center justify-center gap-2 transition ${
                  inputTab === "library"
                    ? "bg-white text-black shadow-md"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                <Sparkles size={15} />
                Biblioteca de Logos (SVG Sem Fundo)
              </button>

              <button
                type="button"
                onClick={() => setInputTab("upload")}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-medium flex items-center justify-center gap-2 transition ${
                  inputTab === "upload"
                    ? "bg-white text-black shadow-md"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                <Upload size={15} />
                Upload Manual
              </button>
            </div>

            {/* CONTENT AREA */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin scrollbar-thumb-white/10">
              {/* PREVIEW BAR */}
              <div className="flex items-center gap-4 p-3 rounded-2xl bg-[#0f0f0f] border border-white/10">
                <div className="w-14 h-14 rounded-2xl bg-white/[0.06] border border-white/10 flex items-center justify-center shrink-0 p-2.5 relative overflow-hidden">
                  {preview ? (
                    <img
                      src={preview}
                      alt="Preview"
                      className="w-full h-full object-contain relative z-10"
                    />
                  ) : (
                    <ImageIcon size={22} className="text-white/30" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <span className="text-[11px] text-white/40 uppercase tracking-wider font-semibold block">
                    Logo Selecionado
                  </span>
                  <p className="text-sm font-medium truncate text-white/90 mt-0.5">
                    {name || "Nenhum nome definido"}
                  </p>
                  {preview ? (
                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 mt-0.5">
                      <Check size={11} /> Pronto com fundo transparente
                    </span>
                  ) : (
                    <span className="text-[11px] text-white/30 mt-0.5 block">
                      Selecione um ícone abaixo ou faça upload
                    </span>
                  )}
                </div>
              </div>

              {/* NAME INPUT */}
              <div>
                <label className="block text-xs font-medium text-white/60 mb-1.5">
                  Nome da Tecnologia
                </label>
                <input
                  placeholder="Ex: React, Next.js, Node.js..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-[#0f0f0f] border border-white/10 outline-none text-sm focus:border-white/30 transition"
                />
              </div>

              {/* TAB 1: LIBRARY SEARCH */}
              {inputTab === "library" && (
                <div className="space-y-3 pt-1">
                  {/* SEARCH & FILTERS */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <Search
                        size={16}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40"
                      />
                      <input
                        placeholder="Buscar por nome (ex: Docker, Tailwind, Python)..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0f0f0f] border border-white/10 outline-none text-xs sm:text-sm focus:border-white/30 transition"
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery("")}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* CATEGORIES PILLS */}
                  {categories.length > 1 && (
                    <div className="flex gap-1.5 overflow-x-auto pb-1.5 scrollbar-none text-xs">
                      {categories.slice(0, 10).map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setSelectedCategory(cat)}
                          className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition border ${
                            selectedCategory === cat
                              ? "bg-white/15 text-white border-white/20 font-medium"
                              : "bg-white/[0.02] text-white/50 border-white/5 hover:text-white hover:bg-white/5"
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* LOGOS GRID */}
                  {loadingLibrary ? (
                    <div className="h-44 flex flex-col items-center justify-center gap-2 text-white/40 text-xs">
                      <RefreshCw size={18} className="animate-spin" />
                      Carregando biblioteca de ícones SVGL...
                    </div>
                  ) : libraryError ? (
                    <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-center text-xs text-red-300">
                      Não foi possível carregar a API SVGL. Você pode fazer o upload manual ou usar o campo de busca com a SimpleIcons.
                    </div>
                  ) : filteredLogos.length === 0 ? (
                    <div className="h-44 flex flex-col items-center justify-center text-center p-4 border border-dashed border-white/10 rounded-2xl bg-white/[0.01]">
                      <p className="text-xs text-white/50 mb-3">
                        Nenhum ícone encontrado para &quot;{searchQuery}&quot; na SVGL.
                      </p>
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => handleSelectSimpleIconFallback(searchQuery)}
                          className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs text-white transition flex items-center gap-1.5"
                        >
                          <Sparkles size={13} />
                          Gerar ícone da SimpleIcons para &quot;{searchQuery}&quot;
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5 max-h-56 overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-white/10">
                      {filteredLogos.map((item) => {
                        const svgUrl = getSvgUrl(item.route);
                        const isSelected = preview === svgUrl;

                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleSelectLibraryItem(item)}
                            className={`group p-2.5 rounded-xl border flex flex-col items-center justify-center gap-2 transition text-center relative ${
                              isSelected
                                ? "bg-white/15 border-white shadow-lg scale-[1.02]"
                                : "bg-white/[0.02] border-white/10 hover:border-white/30 hover:bg-white/[0.06]"
                            }`}
                          >
                            {isSelected && (
                              <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-white text-black flex items-center justify-center shadow">
                                <Check size={10} strokeWidth={3} />
                              </div>
                            )}

                            <div className="w-10 h-10 flex items-center justify-center p-1">
                              <img
                                src={svgUrl}
                                alt={item.title}
                                className="w-full h-full object-contain group-hover:scale-110 transition duration-200"
                                loading="lazy"
                              />
                            </div>

                            <span className="text-[11px] text-white/80 line-clamp-1 font-medium leading-tight">
                              {item.title}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: MANUAL UPLOAD */}
              {inputTab === "upload" && (
                <div className="pt-1">
                  <label className="border border-dashed border-white/15 rounded-2xl bg-[#0f0f0f] h-40 flex flex-col items-center justify-center cursor-pointer hover:border-white/30 transition overflow-hidden">
                    {logo ? (
                      <img
                        src={preview}
                        alt="Preview Upload"
                        className="w-full h-full object-contain p-4"
                      />
                    ) : (
                      <div className="flex flex-col items-center text-center p-4">
                        <Upload size={24} className="text-white/40 mb-2" />
                        <p className="text-xs text-white/70 font-medium">
                          Clique ou arraste a imagem aqui
                        </p>
                        <p className="text-[11px] text-white/40 mt-1">
                          Recomendado: PNG ou SVG com fundo transparente
                        </p>
                      </div>
                    )}

                    <input
                      type="file"
                      hidden
                      accept="image/*"
                      onChange={handleImage}
                    />
                  </label>
                </div>
              )}
            </div>

            {/* FOOTER BUTTONS */}
            <div className="flex items-center justify-between pt-4 border-t border-white/10 mt-4 shrink-0">
              <span className="text-[11px] text-white/40">
                {preview ? "1 logo selecionado" : "Nenhum logo selecionado"}
              </span>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    resetForm();
                  }}
                  className="px-4 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 transition text-xs sm:text-sm font-medium"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={saving || !name.trim() || !preview}
                  className="px-5 py-2.5 rounded-xl bg-white text-black hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition text-xs sm:text-sm font-semibold flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    "Salvar Tech Stack"
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}