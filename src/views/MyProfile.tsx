"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { API_ROUTES } from "@/routes";
import { normalizeUsPhone, US_PHONE_PATTERN } from "@/lib/phone-format";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { userPhotoUrl } from "@/lib/public-media";
import { uploadPublicMedia } from "@/lib/upload-public-media";

export type MyProfileProps = {
  initialProfile: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    fax: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    roleName: string;
    photo: string;
  };
};

const MyProfile = ({ initialProfile }: MyProfileProps) => {
  const { toast } = useToast();
  const { refreshSession } = useAuth();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    firstName: initialProfile.firstName,
    lastName: initialProfile.lastName,
    email: initialProfile.email,
    phone: initialProfile.phone,
    fax: initialProfile.fax,
    address: initialProfile.address,
    city: initialProfile.city,
    state: initialProfile.state,
    zip: initialProfile.zip,
    photo: initialProfile.photo,
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");

  const saveProfile = async () => {
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim()) {
      toast({
        title: "Error",
        description: "First name, last name and email are required.",
        variant: "destructive",
      });
      return;
    }
    try {
      setSaving(true);
      const photoPath = photoFile
        ? await uploadPublicMedia(photoFile, { into: "users" })
        : form.photo;
      const res = await fetch(API_ROUTES.PROFILE, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, photo: photoPath }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) {
        toast({
          title: "Error",
          description: data.message ?? "Could not update profile.",
          variant: "destructive",
        });
        return;
      }
      setForm((prev) => ({ ...prev, photo: photoPath || "" }));
      setPhotoFile(null);
      setPhotoPreview("");
      await refreshSession();
      toast({ title: "Saved", description: "Profile updated successfully." });
    } catch {
      toast({ title: "Error", description: "Request failed.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const formatPhoneField = (field: "phone" | "fax") => {
    setForm((prev) => {
      const formatted = normalizeUsPhone(prev[field]);
      if (!prev[field].trim()) return prev;
      return { ...prev, [field]: formatted ?? prev[field] };
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Profile</h1>
        <p className="text-muted-foreground">Update your personal account information</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account Info</CardTitle>
          <CardDescription>Your role: {initialProfile.roleName}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Photo</Label>
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage
                  src={photoPreview || userPhotoUrl(form.photo)}
                  alt={`${form.firstName} ${form.lastName}`}
                />
                <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                  {`${form.firstName?.[0] ?? ""}${form.lastName?.[0] ?? ""}`.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  setPhotoFile(file);
                  setPhotoPreview(file ? URL.createObjectURL(file) : "");
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setPhotoFile(null);
                  setPhotoPreview("");
                  setForm((p) => ({ ...p, photo: "" }));
                }}
              >
                Clear Photo
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>First Name</Label>
              <Input value={form.firstName} onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Last Name</Label>
              <Input value={form.lastName} onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                placeholder={US_PHONE_PATTERN}
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                onBlur={() => formatPhoneField("phone")}
              />
            </div>
            <div className="space-y-2">
              <Label>Fax</Label>
              <Input
                placeholder={US_PHONE_PATTERN}
                value={form.fax}
                onChange={(e) => setForm((p) => ({ ...p, fax: e.target.value }))}
                onBlur={() => formatPhoneField("fax")}
              />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>City</Label>
              <Input value={form.city} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>State</Label>
              <Input value={form.state} onChange={(e) => setForm((p) => ({ ...p, state: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Zip</Label>
              <Input value={form.zip} onChange={(e) => setForm((p) => ({ ...p, zip: e.target.value }))} />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => void saveProfile()} disabled={saving}>
              {saving ? "Saving..." : "Save Profile"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MyProfile;
