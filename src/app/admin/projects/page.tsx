"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/app/admin/Sidebar";
import { Plus, GripVertical } from "lucide-react";
import AddProjectModal from "./AddProjectModal";
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

export default function ProjectsPage() {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchProjects();

    const channel = supabase
      .channel("projects-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "projects",
        },
        () => {
          fetchProjects();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchProjects = async () => {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true });

    if (!error && data) {
      setProjects(data);
    }

    setLoading(false);
  };

  const handleAdd = (newProject: any) => {
    setProjects((prev) => [...prev, newProject]);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = projects.findIndex((p) => p.id === active.id);
    const newIndex = projects.findIndex((p) => p.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(projects, oldIndex, newIndex);
    setProjects(reordered);

    await persistOrder("projects", reordered);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-hidden">
      {/* SIDEBAR */}
      <div className="fixed left-0 top-0 h-screen z-40">
        <Sidebar />
      </div>

      {/* MAIN */}
      <main className="lg:ml-[250px] pt-[100px] lg:pt-0 min-h-screen flex flex-col">
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-6 lg:py-8">
          {/* HEADER */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5 mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">
                Projetos
              </h1>

              <p className="text-white/40 text-sm mt-1">
                Gerenciar seus projetos do portfólio · arraste pelo ícone para reordenar
              </p>
            </div>

            <button
              onClick={() => setOpen(true)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-3 bg-white text-black rounded-xl hover:scale-[1.02] transition"
            >
              <Plus size={16} />
              Adicionar Projeto
            </button>
          </div>

          {/* GRID */}
          {loading ? (
            <div className="text-white/40 text-sm">
              Carregando projetos...
            </div>
          ) : projects.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] h-[240px] flex items-center justify-center text-white/35">
              Nenhum projeto encontrado
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={projects.map((p) => p.id)}
                strategy={rectSortingStrategy}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 lg:gap-5 pb-6">
                  {projects.map((project) => (
                    <SortableItem key={project.id} id={project.id}>
                      {({ attributes, listeners }) => (
                        <div className="relative border border-white/10 bg-white/[0.03] rounded-2xl p-3 lg:p-4 hover:border-white/25 transition-all duration-300 flex flex-col h-full">
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
                          <div className="w-full h-[150px] sm:h-[160px] lg:h-[140px] rounded-xl overflow-hidden bg-white/[0.03] mb-3">
                            {project.image_url ? (
                              <img
                                src={project.image_url}
                                className="w-full h-full object-cover hover:scale-105 transition duration-500"
                              />
                            ) : (
                              <div className="w-full h-full bg-white/[0.03]" />
                            )}
                          </div>

                          {/* TITLE */}
                          <h2 className="font-semibold text-[14px] mb-1.5 line-clamp-1">
                            {project.title}
                          </h2>

                          {/* DESCRIPTION */}
                          <p className="text-[12px] text-white/50 line-clamp-2 mb-3 leading-relaxed min-h-[34px]">
                            {project.description}
                          </p>

                          {/* FOOTER */}
                          <div className="flex items-center justify-between mt-auto gap-3 flex-wrap">
                            <span className="text-[10px] text-white/30">
                              {project.created_at
                                ? new Date(
                                    project.created_at
                                  ).toLocaleDateString()
                                : "Sem Data"}
                            </span>

                            <button
                              onClick={() =>
                                router.push(
                                  `/admin/projects/${project.id}`
                                )
                              }
                              className="px-3 py-1.5 rounded-xl border border-white/10 hover:bg-white hover:text-black transition text-[12px]"
                            >
                              Detalhes
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
      <AddProjectModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onAdd={handleAdd}
        nextOrder={nextSortOrder(projects)}
      />
    </div>
  );
}
