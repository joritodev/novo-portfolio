"use client";

import Link from "next/link";
import {
  LayoutDashboard,
  Folder,
  Award,
  MessageSquare,
  Layers,
  Menu,
  X,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function Sidebar() {
  const pathname = usePathname();

  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const menus = [
    {
      name: "Dashboard",
      icon: LayoutDashboard,
      path: "/admin/dashboard",
    },
    {
      name: "Projetos",
      icon: Folder,
      path: "/admin/projects",
    },
    {
      name: "Certificados",
      icon: Award,
      path: "/admin/certificates",
    },
    {
      name: "Comentários",
      icon: MessageSquare,
      path: "/admin/comments",
    },
    {
      name: "Tech Stack",
      icon: Layers,
      path: "/admin/tech",
    },
  ];

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () =>
      window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    const TIMEOUT_MS = 30 * 60 * 1000; // 30 minutos

    const checkTimeout = () => {
      const lastActivity = localStorage.getItem("lastAdminActivity");
      if (lastActivity && Date.now() - parseInt(lastActivity) > TIMEOUT_MS) {
        supabase.auth.signOut().then(() => {
          localStorage.removeItem("lastAdminActivity");
          window.location.href = "/admin/login";
        });
      } else {
        localStorage.setItem("lastAdminActivity", Date.now().toString());
      }
    };

    // Checa ao montar (ex: quando dá F5)
    checkTimeout();

    const updateActivity = () => {
      localStorage.setItem("lastAdminActivity", Date.now().toString());
    };

    window.addEventListener("mousemove", updateActivity);
    window.addEventListener("keydown", updateActivity);
    window.addEventListener("click", updateActivity);

    const interval = setInterval(checkTimeout, 60000); // Verifica a cada minuto

    return () => {
      window.removeEventListener("mousemove", updateActivity);
      window.removeEventListener("keydown", updateActivity);
      window.removeEventListener("click", updateActivity);
      clearInterval(interval);
    };
  }, []);

  const SidebarContent = ({
    hideTitle = false,
  }: {
    hideTitle?: boolean;
  }) => (
    <>
      {/* TOP */}
      <div>
        {!hideTitle && (
          <h1 className="text-lg font-semibold mb-8 tracking-wide text-white">
            Painel de Controle
          </h1>
        )}

        <nav className="space-y-2">
          {menus.map((menu, i) => {
            const Icon = menu.icon;
            const active = pathname === menu.path;

            return (
              <Link
                key={i}
                href={menu.path}
                className="block"
              >
                <motion.div
                  whileHover={{
                    x: 6,
                    scale: 1.02,
                  }}
                  whileTap={{ scale: 0.98 }}
                  transition={{
                    type: "spring",
                    stiffness: 280,
                    damping: 20,
                  }}
                  className={`relative overflow-hidden flex items-center gap-3 px-4 py-3 rounded-[16px] border transition-all duration-300 group ${
                    active
                      ? "bg-white/[0.05] border-white/10 text-white shadow-[0_4px_20px_rgba(0,0,0,0.5)]"
                      : "border-transparent text-white/50 hover:bg-white/[0.02] hover:border-white/5 hover:text-white"
                  }`}
                >
                  {/* Active Indicator */}
                  {active && (
                    <motion.div
                      layoutId="activeSidebar"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-1/2 rounded-r-full bg-white/70"
                      transition={{
                        type: "spring",
                        stiffness: 350,
                        damping: 30,
                      }}
                    />
                  )}

                  {/* Icon */}
                  <motion.div
                    whileHover={{ rotate: -6 }}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                    }}
                    className="relative z-10"
                  >
                    <Icon size={17} />
                  </motion.div>

                  {/* Text */}
                  <span
                    className="relative z-10 text-sm tracking-wide"
                    style={{ fontFamily: "'DM Mono', monospace" }}
                  >
                    {menu.name}
                  </span>
                </motion.div>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* BOTTOM */}
      <div className="text-xs text-white/35 tracking-wide">
        © 2026 João Montenegro - Todos os direitos reservados
      </div>
    </>
  );

  return (
    <>
      {/* DESKTOP */}
      {!isMobile && (
        <aside className="fixed left-0 top-0 h-screen w-[250px] bg-black border-r border-white/10 p-6 flex flex-col justify-between overflow-hidden z-50">
          <SidebarContent />
        </aside>
      )}

      {/* MOBILE */}
      {isMobile && (
        <>
          {/* TOP BAR */}
          <div className="fixed top-0 left-0 right-0 h-[70px] bg-black/95 backdrop-blur-xl border-b border-white/10 flex items-center justify-between px-5 z-[60]">
            <h1 className="text-white font-semibold text-base">
              Painel de Controle
            </h1>

            <button
              onClick={() => setOpen(true)}
              className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white"
            >
              <Menu size={20} />
            </button>
          </div>

          {/* DRAWER */}
          <AnimatePresence>
            {open && (
              <>
                {/* BACKDROP */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setOpen(false)}
                  className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[70]"
                />

                {/* SIDEBAR */}
                <motion.aside
                  initial={{ x: -280 }}
                  animate={{ x: 0 }}
                  exit={{ x: -280 }}
                  transition={{
                    type: "spring",
                    stiffness: 260,
                    damping: 28,
                  }}
                  className="fixed left-0 top-0 h-screen w-[260px] bg-black border-r border-white/10 p-6 flex flex-col justify-between z-[80]"
                >
                  {/* HEADER */}
                  <div className="flex items-center justify-between mb-8">
                    <h1 className="text-lg font-semibold text-white">
                      Painel de Controle
                    </h1>

                    <button
                      onClick={() => setOpen(false)}
                      className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {/* CONTENT */}
                  <div className="flex-1 flex flex-col justify-between">
                    <SidebarContent hideTitle />
                  </div>
                </motion.aside>
              </>
            )}
          </AnimatePresence>
        </>
      )}
    </>
  );
}