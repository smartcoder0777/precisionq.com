"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { API_ROUTES, ROUTES } from "@/routes/index";

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  photo: string | null;
  roleId: number | null;
  securityVerified: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isSecurityVerified: boolean;
  authLoading: boolean;
  securityQuestion: string | null;
  login: (email: string, password: string) => Promise<{ ok: boolean; nextRoute?: string }>;
  verifySecurity: (answer: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [securityVerified, setSecurityVerified] = useState(false);
  const [securityQuestion, setSecurityQuestion] = useState<string | null>(null);

  const refreshSession = useCallback(async () => {
    try {
      const response = await fetch(API_ROUTES.AUTH_SESSION, { cache: "no-store" });
      const data = (await response.json()) as {
        authenticated: boolean;
        securityVerified: boolean;
        user: { id: string; firstName: string; lastName: string; email: string; photo: string | null; roleId: number | null } | null;
        question: string | null;
      };

      if (!data.authenticated || !data.user) {
        setUser(null);
        setSecurityVerified(false);
        setSecurityQuestion(null);
        return;
      }

      setUser({
        id: data.user.id,
        firstName: data.user.firstName,
        lastName: data.user.lastName,
        email: data.user.email,
        photo: data.user.photo,
        roleId: data.user.roleId,
        securityVerified: data.securityVerified,
      });
      setSecurityVerified(data.securityVerified);
      setSecurityQuestion(data.question);
    } finally {
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  const login = useCallback(async (email: string, password: string) => {
    const response = await fetch(API_ROUTES.AUTH_LOGIN, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = (await response.json()) as { ok: boolean; nextRoute?: string };

    if (data.ok) {
      await refreshSession();
      return { ok: true, nextRoute: data.nextRoute || ROUTES.SECURITY };
    }
    return { ok: false };
  }, [refreshSession]);

  const verifySecurity = useCallback(async (answer: string) => {
    const response = await fetch(API_ROUTES.AUTH_SECURITY, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answer }),
    });
    const data = (await response.json()) as { ok: boolean };
    if (data.ok) {
      await refreshSession();
      return true;
    }
    /** Server clears the session on wrong answer; keep client state in sync. */
    await refreshSession();
    return false;
  }, [refreshSession]);

  const logout = useCallback(async () => {
    await fetch(API_ROUTES.AUTH_LOGOUT, { method: "POST" });
    setUser(null);
    setSecurityVerified(false);
    setSecurityQuestion(null);
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isSecurityVerified: securityVerified,
      authLoading,
      securityQuestion,
      login,
      verifySecurity,
      logout,
      refreshSession,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
