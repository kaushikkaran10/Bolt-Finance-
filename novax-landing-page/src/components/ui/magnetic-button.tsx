"use client";

import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { cn } from "@/lib/utils";

interface MagneticButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "outline";
}

export const MagneticButton = React.forwardRef<HTMLButtonElement, MagneticButtonProps>(
  ({ children, className, variant = "primary", ...props }, _ref) => {
    const buttonRef = useRef<HTMLButtonElement>(null);
    const textRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
      const button = buttonRef.current;
      const text = textRef.current;
      if (!button || !text) return;

      const xTo = gsap.quickTo(button, "x", { duration: 1, ease: "elastic.out(1, 0.3)" });
      const yTo = gsap.quickTo(button, "y", { duration: 1, ease: "elastic.out(1, 0.3)" });

      const xTextTo = gsap.quickTo(text, "x", { duration: 1, ease: "elastic.out(1, 0.3)" });
      const yTextTo = gsap.quickTo(text, "y", { duration: 1, ease: "elastic.out(1, 0.3)" });

      const handleMouseMove = (e: MouseEvent) => {
        const { clientX, clientY } = e;
        const { height, width, left, top } = button.getBoundingClientRect();
        const x = clientX - (left + width / 2);
        const y = clientY - (top + height / 2);

        xTo(x * 0.4);
        yTo(y * 0.4);
        xTextTo(x * 0.2);
        yTextTo(y * 0.2);
      };

      const handleMouseLeave = () => {
        xTo(0);
        yTo(0);
        xTextTo(0);
        yTextTo(0);
      };

      button.addEventListener("mousemove", handleMouseMove);
      button.addEventListener("mouseleave", handleMouseLeave);

      return () => {
        button.removeEventListener("mousemove", handleMouseMove);
        button.removeEventListener("mouseleave", handleMouseLeave);
      };
    }, []);

    const variants = {
      primary: "bg-brand text-black font-semibold shadow-[0_0_20px_rgba(0,255,136,0.5)] hover:bg-[#00e67a]",
      secondary: "bg-brand-dark text-foreground border border-[rgba(255,255,255,0.1)] hover:bg-[#123624]",
      outline: "bg-transparent border border-brand-muted text-foreground hover:border-brand-primary/50",
    };

    return (
      <button
        ref={buttonRef}
        className={cn(
          "relative flex items-center justify-center px-8 py-4 rounded-full overflow-hidden transition-colors duration-300",
          variants[variant],
          className
        )}
        {...props}
      >
        <span ref={textRef} className="relative z-10 pointer-events-none">
          {children}
        </span>
      </button>
    );
  }
);
MagneticButton.displayName = "MagneticButton";
