"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  ArrowUpDown,
  CreditCard,
  Target,
  Bot,
  TrendingUp,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

const navItems = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/transactions", icon: ArrowUpDown, label: "Transacciones" },
  { href: "/installments", icon: CreditCard, label: "Cuotas" },
  { href: "/goals", icon: Target, label: "Metas" },
  { href: "/ai-assistant", icon: Bot, label: "Asistente IA" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  async function handleLogout() {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
    // Borrar cookie de demo
    document.cookie = "finance_demo_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    router.push("/login");
    router.refresh();
  }

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 240 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className="hidden lg:flex flex-col h-screen sticky top-0 overflow-hidden z-40"
      style={{
        background: "hsl(var(--card))",
        borderRight: "1px solid hsl(var(--border))",
      }}
    >
      {/* Logo */}
      <div className={cn("flex items-center gap-3 p-4 h-16", collapsed && "justify-center")}>
        <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0">
          <TrendingUp className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="font-bold text-lg text-gradient"
          >
            FinanceAI
          </motion.span>
        )}
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group relative",
                collapsed && "justify-center",
                isActive
                  ? "gradient-primary text-white shadow-sm"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
              style={{
                color: isActive ? "white" : undefined,
              }}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-sm font-medium"
                >
                  {item.label}
                </motion.span>
              )}
              {/* Active indicator */}
              {isActive && !collapsed && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-xl gradient-primary -z-10"
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="px-2 pb-4 space-y-1 border-t pt-4" style={{ borderColor: "hsl(var(--border))" }}>
        <Link
          href="/settings"
          title={collapsed ? "Configuración" : undefined}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150",
            collapsed && "justify-center",
            pathname === "/settings"
              ? "gradient-primary text-white shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
          style={{
            color: pathname === "/settings" ? "white" : undefined,
          }}
        >
          <Settings className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="text-sm font-medium">Configuración</span>}
        </Link>

        <button
          onClick={handleLogout}
          title={collapsed ? "Cerrar sesión" : undefined}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150",
            collapsed && "justify-center",
            "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          )}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="text-sm font-medium">Salir</span>}
        </button>
      </div>

      {/* Collapse button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full flex items-center justify-center shadow-md z-50"
        style={{
          background: "hsl(var(--card))",
          border: "1px solid hsl(var(--border))",
          color: "hsl(var(--muted-foreground))",
        }}
      >
        {collapsed ? (
          <ChevronRight className="w-3 h-3" />
        ) : (
          <ChevronLeft className="w-3 h-3" />
        )}
      </button>
    </motion.aside>
  );
}
