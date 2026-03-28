"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Mail,
  Lock,
  User,
  AlertCircle,
  Wallet,
  Chrome,
} from "lucide-react";
import {
  signInWithGoogle,
  signInWithEmail,
  registerWithEmail,
} from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";

async function exchangeFirebaseToken(idToken: string) {
  const res = await fetch("/api/auth/firebase-verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Authentication failed");
  }
  return res.json();
}

export default function LoginPage() {
  const router = useRouter();
  const { setNovaxToken } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    username: "",
  });

  // ---- Email / Password ----
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      let firebaseUser;

      if (isLogin) {
        firebaseUser = await signInWithEmail(formData.email, formData.password);
      } else {
        firebaseUser = await registerWithEmail(formData.email, formData.password);
      }

      // Get Firebase ID token and exchange for NovaX JWT
      const idToken = await firebaseUser.getIdToken();
      const data = await exchangeFirebaseToken(idToken);
      setNovaxToken(data.access_token);
      router.push("/dashboard");
    } catch (err: any) {
      const msg: Record<string, string> = {
        "auth/user-not-found": "No account found with this email.",
        "auth/wrong-password": "Incorrect password.",
        "auth/email-already-in-use": "Email is already registered.",
        "auth/weak-password": "Password must be at least 6 characters.",
        "auth/invalid-credential": "Invalid email or password.",
        "auth/too-many-requests": "Too many attempts. Please try again later.",
      };
      setError(msg[err.code] || err.message || "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  // ---- Google Sign-In ----
  const handleGoogleLogin = async () => {
    setError("");
    try {
      const firebaseUser = await signInWithGoogle();
      setGoogleLoading(true);
      const idToken = await firebaseUser.getIdToken();
      const data = await exchangeFirebaseToken(idToken);
      setNovaxToken(data.access_token);
      router.push("/dashboard");
    } catch (err: any) {
      if (err.code === "auth/popup-closed-by-user") return;
      setError(err.message || "Google sign-in failed.");
    } finally {
      setGoogleLoading(false);
    }
  };

  // ---- Web3 Wallet ----
  const handleWeb3Login = async () => {
    setLoading(true);
    setError("");
    try {
      if (!(window as any).ethereum) {
        throw new Error("MetaMask is not installed.");
      }
      const accounts = await (window as any).ethereum.request({ method: "eth_requestAccounts" });
      const address = accounts[0];
      const message = "Sign this message to authenticate with NovaX Terminal.";
      const signature = await (window as any).ethereum.request({
        method: "personal_sign",
        params: [message, address],
      });

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/auth/web3`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address, message, signature }),
        }
      );
      if (!res.ok) throw new Error("Web3 authentication failed.");
      const data = await res.json();
      setNovaxToken(data.access_token);
      router.push("/dashboard");
    } catch (err: any) {
      if (err.code === 4001) setError("Signature request rejected.");
      else setError(err.message || "Web3 authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020804] flex flex-col justify-center relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vh] bg-[radial-gradient(circle,rgba(0,255,136,0.05)_0%,transparent_70%)] pointer-events-none -z-10 blur-3xl" />

      <div className="absolute top-8 left-8 z-50">
        <Link href="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-white transition-colors text-sm font-mono">
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>
      </div>

      <div className="w-full max-w-md mx-auto p-8 relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex flex-col items-center justify-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-md bg-brand shadow-[0_0_20px_rgba(0,255,136,0.4)] relative overflow-hidden">
              <div className="absolute inset-0 bg-white/20 blur-sm translate-x-full animate-[shimmer_2s_infinite]" />
            </div>
            <div className="text-2xl font-bold tracking-tighter">BOLT<span className="text-gray-400">FINANCE</span></div>
          </Link>
          <h1 className="text-2xl font-bold text-white mb-2">{isLogin ? "Welcome Back" : "Create Account"}</h1>
          <p className="text-gray-400 font-mono text-sm max-w-[280px] mx-auto">
            {isLogin ? "Enter your credentials to access the terminal." : "Join the next generation of algorithmic traders."}
          </p>
        </div>

        <div className="glass-panel p-8 rounded-3xl border-white/5 shadow-2xl backdrop-blur-3xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#00ff88]/20 to-transparent" />

          {error && (
            <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-3 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Google Sign-In */}
          <button
            type="button"
            id="google-signin-btn"
            onClick={handleGoogleLogin}
            disabled={googleLoading || loading}
            className="w-full bg-white/5 border border-white/10 text-white font-medium py-3 px-4 rounded-xl hover:bg-white/10 hover:border-brand/30 transition-all flex items-center justify-center gap-3 group disabled:opacity-70 disabled:cursor-not-allowed mb-4"
          >
            {googleLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                {/* Google SVG icon */}
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </>
            )}
          </button>

          <div className="relative py-3 flex items-center mb-4">
            <div className="flex-grow border-t border-white/10"></div>
            <span className="flex-shrink-0 mx-4 text-xs font-mono text-gray-500 uppercase tracking-widest">Or</span>
            <div className="flex-grow border-t border-white/10"></div>
          </div>

          {/* Email / Password form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-gray-400 uppercase tracking-widest ml-1">Username</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-gray-500 group-focus-within:text-brand transition-colors" />
                  </div>
                  <input
                    id="username-input"
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/50 transition-all"
                    placeholder="quant_trader_01"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-mono text-gray-400 uppercase tracking-widest ml-1">Email</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-gray-500 group-focus-within:text-brand transition-colors" />
                </div>
                <input
                  id="email-input"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/50 transition-all"
                  placeholder="pilot@boltfinance.ai"
                />
              </div>
            </div>

            <div className="space-y-1.5 pb-2">
              <div className="flex justify-between items-center ml-1">
                <label className="text-xs font-mono text-gray-400 uppercase tracking-widest">Password</label>
                {isLogin && <a href="#" className="text-xs text-brand hover:text-brand/80 transition-colors">Forgot?</a>}
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-gray-500 group-focus-within:text-brand transition-colors" />
                </div>
                <input
                  id="password-input"
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/50 transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              id="auth-submit-btn"
              type="submit"
              disabled={loading || googleLoading}
              className="w-full bg-brand text-black font-bold py-3 px-4 rounded-xl hover:bg-[#00ff88]/90 transition-all flex items-center justify-center gap-2 group shadow-[0_0_20px_rgba(0,255,136,0.2)] hover:shadow-[0_0_30px_rgba(0,255,136,0.4)] disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                isLogin ? "Authenticate" : "Initialize Access"
              )}
            </button>

            <div className="relative py-3 flex items-center">
              <div className="flex-grow border-t border-white/10"></div>
              <span className="flex-shrink-0 mx-4 text-xs font-mono text-gray-500 uppercase tracking-widest">Or Access Via</span>
              <div className="flex-grow border-t border-white/10"></div>
            </div>

            <button
              id="web3-login-btn"
              type="button"
              onClick={handleWeb3Login}
              disabled={loading || googleLoading}
              className="w-full bg-white/5 border border-white/10 text-white font-medium py-3 px-4 rounded-xl hover:bg-white/10 hover:border-brand/30 transition-all flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <Wallet className="w-5 h-5 text-gray-400 group-hover:text-brand transition-colors" />
              Connect Web3 Wallet
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              {isLogin ? "New to the platform?" : "Already possess clearance?"}{" "}
              <button
                onClick={() => { setIsLogin(!isLogin); setError(""); }}
                className="text-white hover:text-brand font-medium transition-colors border-b border-transparent hover:border-brand pb-0.5"
              >
                {isLogin ? "Request Access" : "Sign In Here"}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
