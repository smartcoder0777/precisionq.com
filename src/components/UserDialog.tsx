import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Building2 } from "lucide-react";
import type { ClinicOption, RoleOption, UserRecord, UserSavePayload } from "@/types/users-page";
import { normalizeUsPhone, US_PHONE_PATTERN } from "@/lib/phone-format";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { userPhotoUrl } from "@/lib/public-media";

export type { UserRecord, UserSavePayload } from "@/types/users-page";

type DialogForm = Omit<UserRecord, "id" | "roleName" | "permission">;

const emptyForm: DialogForm = {
  firstName: "",
  lastName: "",
  email: "",
  address: "",
  city: "",
  state: "",
  zip: "",
  phone: "",
  fax: "",
  roleId: "",
  clinicIds: [],
  photo: "",
};

interface UserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: UserRecord | null;
  roleOptions: RoleOption[];
  clinicOptions: ClinicOption[];
  onSave: (user: UserSavePayload) => void | Promise<void>;
}

const UserDialog = ({
  open,
  onOpenChange,
  user,
  roleOptions,
  clinicOptions,
  onSave,
}: UserDialogProps) => {
  const { toast } = useToast();
  const [form, setForm] = useState<DialogForm>(emptyForm);
  const [clinicModalOpen, setClinicModalOpen] = useState(false);
  const [draftClinicIds, setDraftClinicIds] = useState<string[]>([]);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const isEdit = !!user;

  useEffect(() => {
    if (user) {
      setForm({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        address: user.address,
        city: user.city,
        state: user.state,
        zip: user.zip,
        phone: user.phone,
        fax: user.fax,
        roleId: user.roleId,
        clinicIds: [...user.clinicIds],
        photo: user.photo,
      });
    } else {
      setForm(emptyForm);
    }
    setPhotoFile(null);
    setPhotoPreview("");
  }, [user, open]);

  const handleChange = (field: keyof DialogForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handlePhoneBlur = (field: "phone" | "fax") => {
    setForm((prev) => {
      const formatted = normalizeUsPhone(prev[field]);
      if (!prev[field].trim()) return prev;
      return { ...prev, [field]: formatted ?? prev[field] };
    });
  };

  const openClinicModal = () => {
    setDraftClinicIds([...form.clinicIds]);
    setClinicModalOpen(true);
  };

  const toggleClinicDraft = (idStr: string) => {
    setDraftClinicIds(prev =>
      prev.includes(idStr) ? prev.filter(x => x !== idStr) : [...prev, idStr],
    );
  };

  const toggleAllClinicsDraft = () => {
    if (clinicOptions.length === 0) return;
    if (draftClinicIds.length === clinicOptions.length) {
      setDraftClinicIds([]);
    } else {
      setDraftClinicIds(clinicOptions.map(c => String(c.id)));
    }
  };

  const applyClinicSelection = () => {
    setForm(prev => ({ ...prev, clinicIds: [...draftClinicIds] }));
    setClinicModalOpen(false);
  };

  const permissionLabel =
    roleOptions.find(r => String(r.id) === form.roleId)?.description?.trim() || "—";
  const initials = `${form.firstName?.[0] ?? ""}${form.lastName?.[0] ?? ""}`.toUpperCase() || "U";
  const avatarSrc = photoPreview || userPhotoUrl(form.photo);

  const clinicModalTitle = user
    ? `Clinics — ${user.firstName} ${user.lastName}`
    : "Clinics — new user";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.roleId.trim()) {
      toast({ variant: "destructive", title: "Role required", description: "Please select a role." });
      return;
    }
    const payload: UserSavePayload = user ? { ...form, id: user.id } : { ...form };
    payload.photoFile = photoFile;
    try {
      await Promise.resolve(onSave(payload));
      onOpenChange(false);
    } catch {
      /* parent surfaced error; keep dialog open */
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit User" : "Add New User"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={form.firstName}
                  onChange={e => handleChange("firstName", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={form.lastName}
                  onChange={e => handleChange("lastName", e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="photo">Photo</Label>
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14">
                  <AvatarImage src={avatarSrc} alt="User photo preview" />
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <Input
                  id="photo"
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
                    setForm((prev) => ({ ...prev, photo: "" }));
                  }}
                >
                  Clear Photo
                </Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={e => handleChange("email", e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="address">Address</Label>
              <Input id="address" value={form.address} onChange={e => handleChange("address", e.target.value)} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="city">City</Label>
                <Input id="city" value={form.city} onChange={e => handleChange("city", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="state">State</Label>
                <Input id="state" value={form.state} onChange={e => handleChange("state", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="zip">Zip</Label>
                <Input id="zip" value={form.zip} onChange={e => handleChange("zip", e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  placeholder={US_PHONE_PATTERN}
                  value={form.phone}
                  onChange={e => handleChange("phone", e.target.value)}
                  onBlur={() => handlePhoneBlur("phone")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fax">Fax</Label>
                <Input
                  id="fax"
                  placeholder={US_PHONE_PATTERN}
                  value={form.fax}
                  onChange={e => handleChange("fax", e.target.value)}
                  onBlur={() => handlePhoneBlur("fax")}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select
                  value={form.roleId || undefined}
                  onValueChange={v => handleChange("roleId", v)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map(r => (
                      <SelectItem key={r.id} value={String(r.id)}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Permission</Label>
                <div className="rounded-md border border-input bg-muted/30 px-3 py-2 text-sm text-muted-foreground min-h-10 flex items-center">
                  {permissionLabel}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Assigned Clinics</Label>
              <p className="text-sm text-muted-foreground">
                {form.clinicIds.length === 0
                  ? "No clinics assigned."
                  : `${form.clinicIds.length} clinic${form.clinicIds.length === 1 ? "" : "s"} selected.`}
              </p>
              <Button type="button" variant="outline" size="sm" onClick={openClinicModal}>
                Select clinics…
              </Button>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!form.roleId.trim()}>
                {isEdit ? "Update User" : "Add User"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={clinicModalOpen} onOpenChange={open => !open && setClinicModalOpen(false)}>
        <DialogContent className="flex max-h-[min(90dvh,900px)] w-[calc(100vw-1.5rem)] max-w-lg flex-col gap-0 overflow-y-auto overflow-x-hidden p-0 sm:max-w-lg">
          <div className="shrink-0 border-b border-border bg-muted/30 px-5 py-4">
            <DialogHeader className="space-y-1 text-left">
              <DialogTitle className="text-lg">{clinicModalTitle}</DialogTitle>
              <p className="text-sm font-normal text-muted-foreground">
                Select one or more clinics for this user (same as Insurance clinic assignment).
              </p>
            </DialogHeader>
          </div>
          <div className="space-y-4 px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label className="text-sm font-medium">Clinics</Label>
              {clinicOptions.length > 0 && (
                <Button type="button" variant="outline" size="sm" onClick={toggleAllClinicsDraft}>
                  {draftClinicIds.length === clinicOptions.length ? "Deselect all" : "Select all"}
                </Button>
              )}
            </div>
            {clinicOptions.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                No clinics in the database.
              </p>
            ) : (
              <div className="grid max-h-[50vh] gap-2 overflow-y-auto sm:grid-cols-2">
                {clinicOptions.map(opt => {
                  const idStr = String(opt.id);
                  const on = draftClinicIds.includes(idStr);
                  return (
                    <label
                      key={opt.id}
                      className={`flex min-h-[3.25rem] cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                        on
                          ? "border-primary bg-primary/10 shadow-sm"
                          : "border-border bg-background hover:bg-muted/40"
                      }`}
                    >
                      <Checkbox checked={on} onCheckedChange={() => toggleClinicDraft(idStr)} />
                      <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="leading-snug">{opt.name}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
          <DialogFooter className="shrink-0 gap-2 border-t border-border bg-muted/20 px-5 py-3 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setClinicModalOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={applyClinicSelection}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default UserDialog;
