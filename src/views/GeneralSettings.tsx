"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { API_ROUTES } from "@/routes";

type ThemeMode = "light" | "dark";
type SidebarColor = "blue" | "slate" | "green" | "purple" | "teal" | "orange" | "rose";
type AlertPosition = "top-right" | "top-left" | "bottom-right" | "bottom-left";

export type GeneralSettingsProps = {
  initialSettings: {
    sessionTtlSeconds: number;
    themeMode: ThemeMode;
    sidebarColor: SidebarColor;
    alertPosition: AlertPosition;
  };
};

const GeneralSettings = ({ initialSettings }: GeneralSettingsProps) => {
  const { toast } = useToast();
  const [sessionTtlSeconds, setSessionTtlSeconds] = useState(String(initialSettings.sessionTtlSeconds));
  const [themeMode, setThemeMode] = useState<ThemeMode>(initialSettings.themeMode);
  const [sidebarColor, setSidebarColor] = useState<SidebarColor>(initialSettings.sidebarColor);
  const [alertPosition, setAlertPosition] = useState<AlertPosition>(initialSettings.alertPosition);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const ttl = Number(sessionTtlSeconds);
    if (!Number.isFinite(ttl) || ttl < 300) {
      toast({ title: "Error", description: "Session expired time must be at least 300 seconds.", variant: "destructive" });
      return;
    }
    try {
      setSaving(true);
      const res = await fetch(API_ROUTES.SETTINGS_GENERAL, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionTtlSeconds: ttl,
          themeMode,
          sidebarColor,
          alertPosition,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) {
        toast({ title: "Error", description: data.message ?? "Could not save settings.", variant: "destructive" });
        return;
      }
      toast({ title: "Saved", description: "General settings updated." });
      window.location.reload();
    } catch {
      toast({ title: "Error", description: "Request failed.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">General Settings</h1>
        <p className="text-muted-foreground">Session, page UI and alert location settings</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Session Expired Time</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label>Seconds</Label>
          <Input type="number" min={300} value={sessionTtlSeconds} onChange={(e) => setSessionTtlSeconds(e.target.value)} />
          <p className="text-xs text-muted-foreground">Controls how long users stay logged in after login.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Page UI Settings</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Theme Mode</Label>
            <Select value={themeMode} onValueChange={(v: ThemeMode) => setThemeMode(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Sidebar Color</Label>
            <Select value={sidebarColor} onValueChange={(v: SidebarColor) => setSidebarColor(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="blue">Blue</SelectItem>
                <SelectItem value="slate">Slate</SelectItem>
                <SelectItem value="green">Green</SelectItem>
                <SelectItem value="purple">Purple</SelectItem>
                <SelectItem value="teal">Teal</SelectItem>
                <SelectItem value="orange">Orange</SelectItem>
                <SelectItem value="rose">Rose</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Alert Location</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label>Toast Position</Label>
          <Select value={alertPosition} onValueChange={(v: AlertPosition) => setAlertPosition(v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="bottom-right">Bottom Right</SelectItem>
              <SelectItem value="bottom-left">Bottom Left</SelectItem>
              <SelectItem value="top-right">Top Right</SelectItem>
              <SelectItem value="top-left">Top Left</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
      </div>
    </div>
  );
};

export default GeneralSettings;
