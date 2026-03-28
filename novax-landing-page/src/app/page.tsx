"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { MagneticButton } from "@/components/ui/magnetic-button";
import { UserMenu } from "@/components/ui/user-menu";
import { AnimatedGraph } from "@/components/ui/animated-graph";
import { ArrowRight, ChevronRight, Shield, Zap, TrendingUp, Sparkles, Brain, Lock } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

gsap.registerPlugin(ScrollTrigger);

export default function Home() {
  const heroRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const intelligenceRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  const { novaxToken, firebaseUser, loading } = useAuth();
  const isAuthenticated = !!(novaxToken || firebaseUser);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Cinematic Intro Timeline
      const tl = gsap.timeline({ defaults: { ease: "power4.out" } });

      tl.from(".hero-badge", {
        y: 20,
        opacity: 0,
        duration: 0.8,
        delay: 0.2,
      })
      .from(".hero-word-1", {
        y: 100,
        opacity: 0,
        duration: 1,
        stagger: 0.1,
      }, "-=0.4")
      .from(".hero-word-2", {
        y: 100,
        opacity: 0,
        color: "#00ff88", // Flash green
        duration: 1,
      }, "-=0.8")
      .to(".hero-word-2", {
        color: "#00ff88",
        duration: 0.5,
      })
      .from(".hero-desc", {
        y: 30,
        opacity: 0,
        duration: 0.8,
      }, "-=0.6")
      .from(".hero-actions", {
        y: 20,
        opacity: 0,
        duration: 0.8,
      }, "-=0.6")
      .from(".hero-stats", {
        y: 40,
        opacity: 0,
        duration: 1,
        stagger: 0.1,
      }, "-=0.4");

      // Scroll Parallax for Hero
      gsap.to(triggerRef.current, {
        scrollTrigger: {
          trigger: triggerRef.current,
          start: "top top",
          end: "bottom top",
          scrub: 1,
        },
        y: 150,
        opacity: 0,
      });

      // Advanced Intelligence Cards Stagger
      const cards = gsap.utils.toArray(".intel-card");
      gsap.from(cards, {
        scrollTrigger: {
          trigger: intelligenceRef.current,
          start: "top 70%",
        },
        y: 60,
        opacity: 0,
        duration: 0.8,
        stagger: 0.2,
        ease: "power3.out",
      });

      // CTA Text Reveal
      gsap.from(".cta-text", {
        scrollTrigger: {
          trigger: ctaRef.current,
          start: "top 80%",
        },
        y: 50,
        opacity: 0,
        duration: 1,
        ease: "power3.out",
      });

      gsap.from(".cta-buttons", {
        scrollTrigger: {
          trigger: ctaRef.current,
          start: "top 70%",
        },
        y: 30,
        opacity: 0,
        duration: 0.8,
        delay: 0.2,
      });
      
    }); // end gsap.context

    return () => ctx.revert();
  }, []);

  return (
    <main className="min-h-screen relative selection:bg-brand selection:text-black">
      {/* Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80vw] h-[50vh] bg-[radial-gradient(circle,rgba(0,255,136,0.05)_0%,transparent_70%)] pointer-events-none -z-10 blur-3xl" />
      
      {/* Navbar Placeholder */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-6 mix-blend-difference">
        <Link href="/" className="text-xl font-bold tracking-tighter flex items-center gap-2">
          <div className="w-4 h-4 rounded-sm bg-brand" />
          BOLT<span className="text-gray-400">FINANCE</span>
        </Link>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-400">
          <Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
          <Link href="/learning" className="hover:text-white transition-colors">Learning</Link>
          <Link href="/community" className="hover:text-white transition-colors">Community</Link>
        </div>
        <div className="flex items-center gap-4">
          {!loading && isAuthenticated ? (
            <UserMenu />
          ) : (
            <>
              <Link href="/login"><button className="text-sm font-medium hover:text-brand transition-colors">Sign In</button></Link>
              <Link href="/login"><MagneticButton className="px-5 py-2 text-sm">Get Started</MagneticButton></Link>
            </>
          )}
        </div>
      </nav>

      <section ref={heroRef} className="relative min-h-[90vh] flex flex-col items-center justify-center pt-32 px-4 overflow-hidden">
        <div ref={triggerRef} className="max-w-6xl w-full mx-auto flex flex-col items-center text-center z-10">
          
          <div className="hero-badge inline-flex items-center gap-2 px-3 py-1 rounded-full border border-brand/20 bg-brand/5 text-brand text-xs font-semibold uppercase tracking-widest mb-8">
            <span className="w-2 h-2 rounded-full bg-brand animate-pulse" />
            V2.0 AI Engine Live
          </div>

          <h1 ref={headlineRef} className="text-6xl md:text-8xl lg:text-9xl font-bold tracking-tighter leading-[0.9] text-white">
            <div className="overflow-hidden pb-4">
              <span className="hero-word-1 inline-block">Swift.</span>{" "}
              <span className="hero-word-1 inline-block">Secure.</span>{" "}
              <span className="hero-word-2 inline-block text-brand">Simple.</span>
            </div>
          </h1>

          <p className="hero-desc mt-8 text-xl md:text-2xl text-gray-400 max-w-2xl font-mono tracking-tight text-balance">
            The AI-Powered Finance Education & Investment Intelligence Platform designed for the next generation of wealth builders.
          </p>

          <div className="hero-actions mt-12 flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            {!loading && isAuthenticated ? (
              <Link href="/dashboard" className="w-full sm:w-auto">
                <MagneticButton className="w-full text-lg h-14 px-10">
                  Go to Dashboard
                </MagneticButton>
              </Link>
            ) : (
              <Link href="/login" className="w-full sm:w-auto">
                <MagneticButton className="w-full text-lg h-14 px-10">
                  Join the Future of Finance
                </MagneticButton>
              </Link>
            )}
          </div>

          <AnimatedGraph />

          {/* Core Stats / Grid Intro */}
          <div className="mt-24 grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-4xl opacity-80 hover:opacity-100 transition-opacity">
            {[
              { label: "Active Investors", value: "500K+", sub: "+12.4% MoM" },
              { label: "AI Accuracy", value: "94.2%", sub: "Standardized" },
              { label: "Assets Managed", value: "$2.4B", sub: "Global Reach" },
              { label: "Modules", value: "200+", sub: "New weekly" },
            ].map((stat, i) => (
              <div key={i} className="hero-stats glass-panel rounded-2xl p-6 text-left hover:-translate-y-1 transition-transform border border-white/5 hover:border-brand/30">
                <div className="text-xs text-brand-muted font-mono mb-2">{stat.label}</div>
                <div className="text-3xl font-bold tracking-tight text-white mb-1">{stat.value}</div>
                <div className="text-xs text-brand">{stat.sub}</div>
              </div>
            ))}
          </div>

        </div>
      </section>
      
      {/* Advanced Intelligence Section */}
      <section ref={intelligenceRef} className="relative py-32 px-4 border-t border-white/5 bg-brand-dark/30">
        <div className="max-w-6xl mx-auto z-10 relative">
          <div className="mb-16">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 text-white">
              Advanced Intelligence
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl font-mono text-balance">
              Powerful tools built into a seamless interface to give you the competitive edge in modern markets.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1 */}
            <div className="intel-card glass-panel p-8 rounded-3xl hover:border-brand/50 transition-colors group">
              <div className="w-12 h-12 rounded-xl bg-brand/10 flex items-center justify-center mb-6 group-hover:bg-brand/20 transition-colors">
                <svg className="w-6 h-6 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-3 text-white">AI Stock Predictions</h3>
              <p className="text-gray-400 mb-6 text-balance">
                Harness proprietary machine learning models for high-probability market forecasts and sentiment analysis.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-sm text-gray-300">
                  <div className="w-4 h-4 rounded-full bg-brand/20 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand" />
                  </div>
                  Real-time signal alerts
                </li>
                <li className="flex items-center gap-3 text-sm text-gray-300">
                  <div className="w-4 h-4 rounded-full bg-brand/20 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand" />
                  </div>
                  Risk assessment scores
                </li>
              </ul>
            </div>

            {/* Card 2 */}
            <div className="intel-card glass-panel p-8 rounded-3xl hover:border-[#00d2ff]/50 transition-colors group">
              <div className="w-12 h-12 rounded-xl bg-[#00d2ff]/10 flex items-center justify-center mb-6 group-hover:bg-[#00d2ff]/20 transition-colors">
                <svg className="w-6 h-6 text-[#00d2ff]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-3 text-white">Learning Modules</h3>
              <p className="text-gray-400 mb-6 text-balance">
                Master finance from core basics to advanced algorithmic trading strategies with interactive pathways.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-sm text-gray-300">
                  <div className="w-4 h-4 rounded-full bg-[#00d2ff]/20 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#00d2ff]" />
                  </div>
                  Gamified progression
                </li>
                <li className="flex items-center gap-3 text-sm text-gray-300">
                  <div className="w-4 h-4 rounded-full bg-[#00d2ff]/20 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#00d2ff]" />
                  </div>
                  Certified credentials
                </li>
              </ul>
            </div>

            {/* Card 3 */}
            <div className="intel-card glass-panel p-8 rounded-3xl hover:border-[#00e676]/50 transition-colors group">
              <div className="w-12 h-12 rounded-xl bg-[#00e676]/10 flex items-center justify-center mb-6 group-hover:bg-[#00e676]/20 transition-colors">
                <svg className="w-6 h-6 text-[#00e676]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-3 text-white">Web3 Integration</h3>
              <p className="text-gray-400 mb-6 text-balance">
                Seamlessly connect with decentralized finance (DeFi) protocols and blockchain assets in one unified hub.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-sm text-gray-300">
                  <div className="w-4 h-4 rounded-full bg-[#00e676]/20 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#00e676]" />
                  </div>
                  Multi-chain support
                </li>
                <li className="flex items-center gap-3 text-sm text-gray-300">
                  <div className="w-4 h-4 rounded-full bg-[#00e676]/20 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#00e676]" />
                  </div>
                  Yield optimization
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section ref={ctaRef} className="relative py-32 px-4 overflow-hidden">
        {/* Glow behind CTA */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl h-[400px] bg-brand/10 blur-[100px] -z-10 rounded-full" />
        
        <div className="max-w-4xl mx-auto glass-panel p-12 md:p-20 rounded-[3rem] text-center relative z-10 border-brand/20">
          <h2 className="cta-text text-5xl md:text-7xl font-bold tracking-tighter mb-6 text-white text-glow">
            Ready to scale your wealth?
          </h2>
          <p className="cta-text text-xl text-gray-300 mb-10 max-w-2xl mx-auto font-mono">
            Join 500,000+ investors using AI to make smarter, faster financial decisions.
          </p>
          <div className="cta-buttons flex flex-col sm:flex-row items-center justify-center gap-4 relative z-20">
            {!loading && isAuthenticated ? (
              <Link href="/dashboard" className="w-full sm:w-auto">
                <MagneticButton className="h-14 px-8 text-lg w-full">
                  Go to Dashboard
                </MagneticButton>
              </Link>
            ) : (
              <Link href="/login" className="w-full sm:w-auto">
                <MagneticButton className="h-14 px-8 text-lg w-full">
                  Create Free Account
                </MagneticButton>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 pt-20 pb-10 px-8 bg-black">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="col-span-1 md:col-span-1">
            <div className="text-xl font-bold tracking-tighter flex items-center gap-2 mb-6">
              <div className="w-4 h-4 rounded-sm bg-brand" />
              BOLT<span className="text-gray-400">FINANCE</span>
            </div>
            <p className="text-sm text-gray-500 max-w-xs text-balance">
              Empowering your financial journey with cutting-edge technology and deep insights.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-6">Platform</h4>
            <ul className="space-y-4 text-sm text-gray-400">
              <li><a href="#" className="hover:text-brand transition-colors">Predictions</a></li>
              <li><a href="#" className="hover:text-brand transition-colors">Learning Hub</a></li>
              <li><a href="#" className="hover:text-brand transition-colors">Portfolio</a></li>
              <li><a href="#" className="hover:text-brand transition-colors">API Access</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-6">Company</h4>
            <ul className="space-y-4 text-sm text-gray-400">
              <li><a href="#" className="hover:text-brand transition-colors">About Us</a></li>
              <li><a href="#" className="hover:text-brand transition-colors">Careers</a></li>
              <li><a href="#" className="hover:text-brand transition-colors">Press Kit</a></li>
              <li><a href="#" className="hover:text-brand transition-colors">Contact</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-6">Legal</h4>
            <ul className="space-y-4 text-sm text-gray-400">
              <li><a href="#" className="hover:text-brand transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-brand transition-colors">Terms of Use</a></li>
              <li><a href="#" className="hover:text-brand transition-colors">Risk Disclosure</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between pt-8 border-t border-white/5 text-sm text-gray-600">
          <p>© 2026 BoltFinance Inc. All rights reserved.</p>
          <div className="flex items-center gap-6 mt-4 md:mt-0">
            <a href="#" className="hover:text-white transition-colors">Twitter</a>
            <a href="#" className="hover:text-white transition-colors">LinkedIn</a>
            <a href="#" className="hover:text-white transition-colors">GitHub</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
