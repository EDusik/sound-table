"use client";

import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthGuard } from "./AuthGuard";
import { AudioBar } from "./AudioBar";
import { GlobalAuthLoading } from "./GlobalAuthLoading";

function AuthShell({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth();
  if (loading) return <GlobalAuthLoading />;
  return (
    <AuthGuard>
      {children}
      <AudioBar />
    </AuthGuard>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AuthShell>{children}</AuthShell>
      </AuthProvider>
    </ThemeProvider>
  );
}
