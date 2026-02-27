"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Mail, Lock, User, AlertCircle, Wallet } from "lucide-react";
import { apiClient } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    username: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (isLogin) {
        // We use application/x-www-form-urlencoded for OAuth2 password bearer
        const params = new URLSearchParams();
        params.append("username", formData.email); // FastAPI OAuth2 expects 'username' field, which is our email here
        params.append("password", formData.password);

        const res = await apiClient.post("/auth/login", params, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        
        localStorage.setItem("novax_token", res.data.access_token);
        router.push("/dashboard");
      } else {
        // Register flow
        await apiClient.post("/auth/register", {
          email: formData.email,
          username: formData.username || formData.email.split('@')[0], // fallback if empty
          password: formData.password,
        });
        
        // Auto login after register
        const params = new URLSearchParams();
        params.append("username", formData.email);
        params.append("password", formData.password);
        const loginRes = await apiClient.post("/auth/login", params, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        
        localStorage.setItem("novax_token", loginRes.data.access_token);
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      if (err instanceof Error && 'response' in err) {
         setError((err as { response?: { data?: { detail?: string } } }).response?.data?.detail || "Authentication failed. Please check your credentials.");
      } else {
         setError("Authentication failed. Please check your credentials.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleWeb3Login = async () => {
    setLoading(true);
    setError("");

    try {
      if (!(window as any).ethereum) {
        throw new Error("MetaMask or a Web3 wallet is not installed. Please install it to continue.");
      }

      // 1. Request accounts
      const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
      const address = accounts[0];

      // 2. Prepare message to sign
      const message = "Sign this message to authenticate with NovaX Terminal.";

      // 3. Request signature
      const signature = await (window as any).ethereum.request({
        method: 'personal_sign',
        params: [message, address],
      });

      // 4. Send to backend
      const res = await apiClient.post("/auth/web3", {
        address,
        message,
        signature
      });

      localStorage.setItem("novax_token", res.data.access_token);
      router.push("/dashboard");
    } catch (err: any) {
      console.error("Web3 Error:", err);
      if (err.code === 4001) {
        setError("User rejected the signature request.");
      } else {
        setError(err.message || "Failed to authenticate with Web3 wallet.");
      }
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
            {/* Inner subtle glow */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#00ff88]/20 to-transparent" />
            
            {error && (
                <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-3 rounded-xl flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <span>{error}</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                    <div className="space-y-1.5">
                        <label className="text-xs font-mono text-gray-400 uppercase tracking-widest ml-1">Username</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <User className="h-4 w-4 text-gray-500 group-focus-within:text-brand transition-colors" />
                            </div>
                            <input
                                type="text"
                                required={!isLogin}
                                value={formData.username}
                                onChange={(e) => setFormData({...formData, username: e.target.value})}
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
                            type="email"
                            required
                            value={formData.email}
                            onChange={(e) => setFormData({...formData, email: e.target.value})}
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
                            type="password"
                            required
                            value={formData.password}
                            onChange={(e) => setFormData({...formData, password: e.target.value})}
                            className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/50 transition-all"
                            placeholder="••••••••"
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
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
                    type="button"
                    onClick={handleWeb3Login}
                    disabled={loading}
                    className="w-full bg-white/5 border border-white/10 text-white font-medium py-3 px-4 rounded-xl hover:bg-white/10 hover:border-brand/30 transition-all flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    <Wallet className="w-5 h-5 text-gray-400 group-hover:text-brand transition-colors" />
                    Connect Web3 Wallet
                </button>
            </form>

            <div className="mt-8 text-center">
                <p className="text-sm text-gray-500">
                    {isLogin ? "New to the platform?" : "Already possess clearance?"} {" "}
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
