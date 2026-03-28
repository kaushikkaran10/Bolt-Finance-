"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, BookOpen, PieChart, LineChart, Users, LogOut, Newspaper } from "lucide-react";

export function Navigation() {
  const pathname = usePathname();
  const router = useRouter();

  const links = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/predictions", label: "Predictions", icon: LineChart },
    { href: "/news", label: "News Intelligence", icon: Newspaper },
    { href: "/learning", label: "Learning Edge", icon: BookOpen },
    { href: "/portfolio", label: "Portfolio", icon: PieChart },
    { href: "/community", label: "Community", icon: Users },
  ];

  return (
    <nav className="fixed left-0 top-0 bottom-0 w-64 bg-[#050f0a]/80 border-r border-white/5 backdrop-blur-xl z-50 p-6 flex flex-col">
      <div className="text-2xl font-bold tracking-tighter flex items-center gap-2 mb-12">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-sm bg-brand shadow-[0_0_15px_rgba(0,255,136,0.3)]" />
          BOLT<span className="text-gray-400">FINANCE</span>
        </Link>
      </div>

      <div className="flex flex-col gap-2">
        {links.map((link) => {
          const isActive = pathname.startsWith(link.href);
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-medium text-sm",
                isActive 
                  ? "bg-brand/10 text-brand border border-brand/20 shadow-[inset_0_0_20px_rgba(0,255,136,0.05)]" 
                  : "text-gray-400 hover:text-white hover:bg-white/5 border border-transparent"
              )}
            >
              <Icon className={cn("w-5 h-5", isActive ? "text-brand" : "text-gray-500")} />
              {link.label}
            </Link>
          );
        })}
      </div>
      
      <div className="mt-auto space-y-4">
        <button 
          onClick={() => {
            localStorage.removeItem("novax_token");
            router.push("/login");
          }}
          className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-medium text-sm text-gray-400 hover:text-red-400 hover:bg-red-400/10 border border-transparent w-full"
        >
          <LogOut className="w-5 h-5 text-gray-500 group-hover:text-red-400" />
          Sign Out
        </button>

        <div className="glass-panel p-4 rounded-xl text-center border-white/5 border">
            <div className="text-xs text-gray-400 mb-2 font-mono">AI Engine Status</div>
            <div className="flex items-center justify-center gap-2 text-sm text-brand font-semibold">
                <span className="w-2 h-2 rounded-full bg-brand animate-pulse" />
                Optimal
            </div>
        </div>
      </div>
    </nav>
  );
}
