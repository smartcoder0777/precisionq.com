"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { ROUTES } from "@/routes/index";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import LottieLoader from "@/components/LottieLoader";
import { ShieldCheck, Activity } from "lucide-react";

const SecurityQuestion = () => {
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { isAuthenticated, isSecurityVerified, authLoading, verifySecurity, securityQuestion } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) router.replace(ROUTES.LOGIN);
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (authLoading) return;
    if (isAuthenticated && isSecurityVerified) router.replace(ROUTES.DASHBOARD);
  }, [authLoading, isAuthenticated, isSecurityVerified, router]);

  if (authLoading || !isAuthenticated || isSecurityVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LottieLoader label="Loading..." />
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const success = await verifySecurity(answer);
      if (success) {
        router.push(ROUTES.DASHBOARD);
      } else {
        router.replace(ROUTES.LOGIN_SECURITY_FAILED);
      }
    } catch {
      setError("An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2">
            <Activity className="h-7 w-7 text-primary" />
            <span className="text-xl font-bold text-foreground">Precision Quality Central Control</span>
          </div>
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">Security Verification</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Please answer your security question to continue
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm">Security Question</Label>
              <p className="text-foreground font-medium">
                {securityQuestion || "Please answer your security question."}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="answer">Your Answer</Label>
              <PasswordInput
                id="answer"
                autoComplete="off"
                spellCheck={false}
                placeholder="Enter your answer"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                toggleAriaLabels={{ show: "Show answer", hide: "Hide answer" }}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Verifying..." : "Verify & Continue"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default SecurityQuestion;
