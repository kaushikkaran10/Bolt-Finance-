"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { User, Mail, Shield, Bell, Key, Save, Edit2, Upload, AlertCircle, CheckCircle2 } from "lucide-react";

export default function ProfilePage() {
  const { firebaseUser } = useAuth();
  const [activeTab, setActiveTab] = useState("general");
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const displayName = firebaseUser?.displayName || firebaseUser?.email?.split('@')[0] || "Trader";
  const photoURL = firebaseUser?.photoURL || null;

  const handleSave = () => {
    setIsSaving(true);
    setSaved(false);
    setTimeout(() => {
      setIsSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }, 1500);
  };

  return (
    <div className="w-full max-w-6xl mx-auto pb-12 animate-in fade-in duration-700">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Profile Settings</h1>
        <p className="text-gray-400 font-mono text-sm">Manage your account credentials, security preferences, and API keys.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Sidebar - Navigation & Summary */}
        <div className="lg:col-span-4 space-y-6">
          {/* Summary Card */}
          <div className="glass-panel p-6 rounded-3xl border border-white/5 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-brand/40 to-transparent" />
            
            <div className="flex flex-col items-center text-center">
              <div className="relative group mb-4">
                <div className="w-24 h-24 rounded-full bg-brand/10 border-2 border-brand/30 flex items-center justify-center overflow-hidden">
                  {photoURL ? (
                    <img src={photoURL} alt={displayName} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-10 h-10 text-brand" />
                  )}
                </div>
                <button className="absolute bottom-0 right-0 p-2 bg-black border border-white/10 rounded-full text-gray-400 hover:text-white hover:border-brand transition-colors group-hover:scale-110">
                  <Upload className="w-3 h-3" />
                </button>
              </div>
              
              <h2 className="text-xl font-bold text-white">{displayName}</h2>
              <div className="inline-flex items-center gap-2 mt-2 px-2.5 py-1 rounded-full bg-brand/10 border border-brand/20">
                <div className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
                <span className="text-xs text-brand font-mono font-medium">Pro Member</span>
              </div>
            </div>
            
            <div className="mt-8 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 font-mono">Member Since</span>
                <span className="text-gray-300">2026</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 font-mono">2FA Status</span>
                <span className="text-red-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Disabled</span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="glass-panel p-2 rounded-3xl border border-white/5 flex flex-col gap-1">
            {[
              { id: "general", label: "General Information", icon: User },
              { id: "security", label: "Security & Login", icon: Shield },
              { id: "notifications", label: "Notifications", icon: Bell },
              { id: "api", label: "API Tokens", icon: Key },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all ${
                    isActive 
                      ? "bg-white/10 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]" 
                      : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-brand" : "text-gray-500"}`} />
                  {tab.label}
                  {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-brand" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Content Area */}
        <div className="lg:col-span-8">
          <div className="glass-panel p-8 rounded-3xl border border-white/5 min-h-[500px] relative">
            
            {activeTab === "general" && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h3 className="text-xl font-bold text-white mb-6">General Information</h3>
                
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-mono text-gray-500 uppercase tracking-wider">Username</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <User className="h-4 w-4 text-brand/50" />
                        </div>
                        <input
                          type="text"
                          defaultValue={displayName}
                          className="w-full bg-black/50 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/50 transition-all font-medium"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-xs font-mono text-gray-500 uppercase tracking-wider">Email Address</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Mail className="h-4 w-4 text-brand/50" />
                        </div>
                        <input
                          type="email"
                          defaultValue={firebaseUser?.email || ""}
                          disabled
                          className="w-full bg-black/20 border border-white/5 rounded-xl py-3 pl-11 pr-4 text-gray-400 focus:outline-none cursor-not-allowed font-medium"
                        />
                      </div>
                      <p className="text-xs text-gray-600 mt-1">Email changes require support verification.</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-mono text-gray-500 uppercase tracking-wider">Bio / Strategy Profile</label>
                    <textarea
                      rows={4}
                      placeholder="Describe your primary trading strategy or investment goals..."
                      className="w-full bg-black/50 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/50 transition-all resize-none font-medium"
                    ></textarea>
                  </div>
                  
                  <div className="pt-6 mt-6 border-t border-white/10 flex items-center justify-between">
                    <div>
                      {saved && (
                        <div className="flex items-center gap-2 text-brand text-sm animate-in zoom-in duration-300">
                          <CheckCircle2 className="w-4 h-4" />
                          Changes saved successfully.
                        </div>
                      )}
                    </div>
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="flex items-center gap-2 bg-brand text-black font-bold py-2.5 px-6 rounded-xl hover:bg-[#00ff88]/90 transition-all shadow-[0_0_15px_rgba(0,255,136,0.2)] hover:shadow-[0_0_25px_rgba(0,255,136,0.4)] disabled:opacity-50 disabled:cursor-wait"
                    >
                      {isSaving ? (
                        <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                      ) : (
                        <><Save className="w-4 h-4" /> Save Profile</>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "security" && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col items-center justify-center text-center h-[400px]">
                <Shield className="w-16 h-16 text-white/10 mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Security Hub</h3>
                <p className="text-gray-400 max-w-sm mb-6">Manage two-factor authentication, device sessions, and connected Web3 wallets.</p>
                <div className="p-4 border border-brand/20 bg-brand/5 rounded-xl text-brand text-sm font-mono inline-block">
                  Awaiting integration with Web3 module
                </div>
              </div>
            )}
            
            {activeTab === "notifications" && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col items-center justify-center text-center h-[400px]">
                <Bell className="w-16 h-16 text-white/10 mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Alerts & Notifications</h3>
                <p className="text-gray-400 max-w-sm mb-6">Configure AI prediction signals, market news alerts, and community mentions.</p>
              </div>
            )}

            {activeTab === "api" && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col items-center justify-center text-center h-[400px]">
                <Key className="w-16 h-16 text-white/10 mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Developer API Tokens</h3>
                <p className="text-gray-400 max-w-sm mb-6">Generate JWTs for programmatic access to the NovaX prediction engine.</p>
                <button className="border border-white/20 bg-white/5 hover:bg-white/10 hover:border-white/40 text-white font-medium py-2 px-6 rounded-xl transition-all">
                  Generate New Token
                </button>
              </div>
            )}
            
          </div>
        </div>
        
      </div>
    </div>
  );
}
