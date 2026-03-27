"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { firebaseUser, novaxToken, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !firebaseUser && !novaxToken) {
      router.push("/login");
    }
  }, [loading, firebaseUser, novaxToken, router]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="w-12 h-12 rounded-xl bg-brand/20 shadow-[0_0_30px_rgba(0,255,136,0.3)] relative overflow-hidden animate-pulse flex items-center justify-center">
            <div className="w-3 h-3 bg-brand rounded-full animate-ping" />
        </div>
      </div>
    );
  }

  if (!firebaseUser && !novaxToken) {
    return null; // Prevents flashing protected content before redirect
  }

  return <>{children}</>;
}
