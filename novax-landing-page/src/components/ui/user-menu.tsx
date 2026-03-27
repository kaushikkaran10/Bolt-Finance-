"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { User, LogOut, LayoutDashboard, ChevronDown } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";

export function UserMenu() {
  const { firebaseUser, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    setIsOpen(false);
    router.push("/");
  };

  const photoURL = firebaseUser?.photoURL || null;
  const displayName = firebaseUser?.displayName || firebaseUser?.email?.split('@')[0] || "User";

  return (
    <div className="relative z-50" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 bg-white/5 border border-white/10 hover:border-brand/30 hover:bg-white/10 transition-colors rounded-full py-1.5 px-2 pr-4 focus:outline-none"
      >
        <div className="w-8 h-8 rounded-full bg-brand/20 overflow-hidden flex items-center justify-center border border-brand/30">
          {photoURL ? (
            <img src={photoURL} alt={displayName} className="w-full h-full object-cover" />
          ) : (
            <User className="w-4 h-4 text-brand" />
          )}
        </div>
        <span className="text-sm font-medium text-white max-w-[100px] truncate">
          {displayName}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-64 glass-panel bg-black/80 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-2xl py-2 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="px-4 py-3 border-b border-white/5 mb-2">
            <p className="text-sm font-medium text-white truncate">{displayName}</p>
            <p className="text-xs text-gray-500 truncate">{firebaseUser?.email}</p>
          </div>
          
          <Link 
            href="/dashboard" 
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </Link>
          
          <Link 
            href="/dashboard/profile" 
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
          >
            <User className="w-4 h-4" />
            Profile Settings
          </Link>
          
          <div className="h-px bg-white/5 my-2" />
          
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors text-left focus:outline-none"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
