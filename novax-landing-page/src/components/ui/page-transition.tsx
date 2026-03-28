"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { usePathname } from "next/navigation";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    
    // Quick fade and slide up animation when pathname changes
    gsap.fromTo(
      containerRef.current,
      { opacity: 0, y: 15 },
      { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }
    );
  }, [pathname]);

  return <div ref={containerRef} className="w-full min-h-screen">{children}</div>;
}
