"use client";

/**
 * NovaX Auth Context
 * Provides Firebase user state + NovaX backend JWT to the entire app.
 * Usage: wrap app in <AuthProvider>, then call useAuth() anywhere.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  auth,
  onFirebaseAuthChange,
  firebaseSignOut,
  type FirebaseUser,
} from "@/lib/firebase";

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  novaxToken: string | null;
  loading: boolean;
  logout: () => Promise<void>;
  setNovaxToken: (token: string) => void;
}

const AuthContext = createContext<AuthContextType>({
  firebaseUser: null,
  novaxToken: null,
  loading: true,
  logout: async () => {},
  setNovaxToken: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [novaxToken, setNovaxTokenState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Listen to Firebase auth state changes
  useEffect(() => {
    const unsub = onFirebaseAuthChange((user) => {
      setFirebaseUser(user);
      if (!user) {
        // Clear NovaX token when Firebase user signs out
        setNovaxTokenState(null);
        localStorage.removeItem("novax_token");
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  // Hydrate token from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("novax_token");
    if (stored) setNovaxTokenState(stored);
  }, []);

  const setNovaxToken = useCallback((token: string) => {
    setNovaxTokenState(token);
    localStorage.setItem("novax_token", token);
  }, []);

  const logout = useCallback(async () => {
    await firebaseSignOut();
    setNovaxTokenState(null);
    localStorage.removeItem("novax_token");
  }, []);

  return (
    <AuthContext.Provider
      value={{ firebaseUser, novaxToken, loading, logout, setNovaxToken }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
