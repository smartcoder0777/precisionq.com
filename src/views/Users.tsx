"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DataTablePagination } from "@/components/data-table-pagination";
import { usePagedList } from "@/hooks/use-paged-list";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Pencil, Trash2, KeyRound, ShieldQuestion, Building2, Users as UsersIcon } from "lucide-react";
import UserDialog from "@/components/UserDialog";
import { useToast } from "@/hooks/use-toast";
import { API_ROUTES } from "@/routes";
import type { UserRecord, UserSavePayload, UsersPagePayload } from "@/types/users-page";
import { uploadPublicMedia } from "@/lib/upload-public-media";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { userPhotoUrl } from "@/lib/public-media";
import { useAuth } from "@/contexts/AuthContext";

const PAGE_SIZE = 10;

/** Show individual clinic badges only up to this count; above it, summarize. */
const CLINIC_INLINE_MAX = 2;

export type UsersProps = UsersPagePayload;

const roleBadgeVariant = (roleName: string) => {
  switch (roleName) {
    case "Super Admin":
      return "default";
    case "Admin":
      return "default";
    case "Doctor":
      return "secondary";
    default:
      return "outline";
  }
};

async function readErrorMessage(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { message?: string };
    if (typeof j.message === "string" && j.message.trim()) return j.message.trim();
  } catch {
    /* ignore */
  }
  return `Request failed (${res.status})`;
}

function ClinicsCell({
  clinicIds,
  clinicNameById,
}: {
  clinicIds: string[];
  clinicNameById: Map<string, string>;
}) {
  if (clinicIds.length === 0) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  if (clinicIds.length > CLINIC_INLINE_MAX) {
    return (
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Building2 className="h-4 w-4 shrink-0" />
        <span>Selected {clinicIds.length} clinics…</span>
      </div>
    );
  }
  return (
    <div className="flex gap-1 flex-wrap">
      {clinicIds.map(cid => (
        <Badge key={cid} variant="outline" className="text-xs">
          <Building2 className="h-3 w-3 mr-1" />
          {clinicNameById.get(cid) ?? `#${cid}`}
        </Badge>
      ))}
    </div>
  );
}

const Users = ({
  rows: initialRows,
  roleOptions,
  clinicOptions,
  securityQuestionOptions,
}: UsersProps) => {
  const router = useRouter();
  const [users, setUsers] = useState<UserRecord[]>(initialRows);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [deleteUser, setDeleteUser] = useState<UserRecord | null>(null);
  const { toast } = useToast();
  const { user: authUser, refreshSession } = useAuth();

  const [passwordUser, setPasswordUser] = useState<UserRecord | null>(null);
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const [securityUser, setSecurityUser] = useState<UserRecord | null>(null);
  const [securityQuestionId, setSecurityQuestionId] = useState("");
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [savingSecurity, setSavingSecurity] = useState(false);

  useEffect(() => {
    setUsers(initialRows);
  }, [initialRows]);

  useEffect(() => {
    if (passwordUser) {
      setPassword("");
      setPasswordConfirm("");
    }
  }, [passwordUser]);

  useEffect(() => {
    if (securityUser) {
      setSecurityQuestionId(
        securityQuestionOptions[0] ? String(securityQuestionOptions[0].id) : "",
      );
      setSecurityAnswer("");
    }
  }, [securityUser, securityQuestionOptions]);

  const clinicNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of clinicOptions) m.set(String(c.id), c.name);
    return m;
  }, [clinicOptions]);

  const filtered = useMemo(
    () =>
      users.filter(u =>
        `${u.firstName} ${u.lastName} ${u.email} ${u.roleName} ${u.permission}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [users, search],
  );
  const { pagedItems, page, totalPages, totalItems, rangeFrom, rangeTo, goPage } = usePagedList(
    filtered,
    PAGE_SIZE,
    search,
  );

  const handleSave = async (data: UserSavePayload) => {
    const uploadedPhotoPath = data.photoFile
      ? await uploadPublicMedia(data.photoFile, { into: "users" })
      : data.photo;
    const body = {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      address: data.address,
      city: data.city,
      state: data.state,
      zip: data.zip,
      phone: data.phone,
      fax: data.fax,
      roleId: data.roleId,
      clinicIds: data.clinicIds,
      photo: uploadedPhotoPath || "",
    };

    if (data.id) {
      const res = await fetch(API_ROUTES.user(data.id), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        toast({
          variant: "destructive",
          title: "Update failed",
          description: await readErrorMessage(res),
        });
        throw new Error("update failed");
      }
      toast({
        title: "User updated",
        description: `${data.firstName} ${data.lastName} has been updated.`,
      });
      if (authUser && authUser.id === data.id) {
        await refreshSession();
      }
    } else {
      const res = await fetch(API_ROUTES.USERS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        toast({
          variant: "destructive",
          title: "Create failed",
          description: await readErrorMessage(res),
        });
        throw new Error("create failed");
      }
      toast({
        title: "User added",
        description: `${data.firstName} ${data.lastName} has been added.`,
      });
    }
    setEditingUser(null);
    router.refresh();
  };

  const handleDelete = async () => {
    if (!deleteUser) return;
    const res = await fetch(API_ROUTES.user(deleteUser.id), { method: "DELETE" });
    if (!res.ok) {
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: await readErrorMessage(res),
      });
      return;
    }
    toast({
      title: "User removed",
      description: `${deleteUser.firstName} ${deleteUser.lastName} has been removed.`,
    });
    setDeleteUser(null);
    router.refresh();
  };

  const submitPasswordUpdate = async () => {
    if (!passwordUser) return;
    if (password.length < 8) {
      toast({
        variant: "destructive",
        title: "Invalid password",
        description: "Password must be at least 8 characters.",
      });
      return;
    }
    if (password !== passwordConfirm) {
      toast({
        variant: "destructive",
        title: "Mismatch",
        description: "Password and confirmation do not match.",
      });
      return;
    }
    setSavingPassword(true);
    try {
      const res = await fetch(API_ROUTES.userPassword(passwordUser.id), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        toast({
          variant: "destructive",
          title: "Update failed",
          description: await readErrorMessage(res),
        });
        return;
      }
      toast({ title: "Password updated", description: `Login password set for ${passwordUser.email}.` });
      setPasswordUser(null);
      router.refresh();
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Request failed." });
    } finally {
      setSavingPassword(false);
    }
  };

  const submitSecurityQuestion = async () => {
    if (!securityUser) return;
    if (!securityQuestionId) {
      toast({
        variant: "destructive",
        title: "Question required",
        description: "Choose a security question.",
      });
      return;
    }
    if (!securityAnswer.trim()) {
      toast({
        variant: "destructive",
        title: "Answer required",
        description: "Enter an answer for the security question.",
      });
      return;
    }
    setSavingSecurity(true);
    try {
      const res = await fetch(API_ROUTES.userSecurityQuestions(securityUser.id), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: Number(securityQuestionId),
          answer: securityAnswer.trim(),
        }),
      });
      if (!res.ok) {
        toast({
          variant: "destructive",
          title: "Save failed",
          description: await readErrorMessage(res),
        });
        return;
      }
      toast({
        title: "Security answer saved",
        description: `Added or updated for ${securityUser.firstName} ${securityUser.lastName}. Other saved answers are kept; at login, one question is chosen at random.`,
      });
      setSecurityUser(null);
      router.refresh();
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Request failed." });
    } finally {
      setSavingSecurity(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Users</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage system users and their permissions</p>
        </div>
        <Button
          onClick={() => {
            setEditingUser(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" /> Add User
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <UsersIcon className="h-5 w-5 text-primary" />
              All Users ({filtered.length})
            </CardTitle>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Permission</TableHead>
                <TableHead>Clinics</TableHead>
                <TableHead className="text-right w-[200px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedItems.map(user => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-11 w-11">
                        <AvatarImage src={userPhotoUrl(user.photo)} alt={`${user.firstName} ${user.lastName}`} />
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                          {`${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <span>{user.firstName} {user.lastName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{user.email}</TableCell>
                  <TableCell className="text-muted-foreground">{user.phone}</TableCell>
                  <TableCell>
                    <Badge variant={roleBadgeVariant(user.roleName)}>{user.roleName}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{user.permission}</TableCell>
                  <TableCell>
                    <ClinicsCell clinicIds={user.clinicIds} clinicNameById={clinicNameById} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex items-center justify-end gap-0.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Edit user"
                        onClick={() => {
                          setEditingUser(user);
                          setDialogOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Update password"
                        onClick={() => setPasswordUser(user)}
                      >
                        <KeyRound className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Set security question"
                        onClick={() => setSecurityUser(user)}
                      >
                        <ShieldQuestion className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        title="Remove user"
                        onClick={() => setDeleteUser(user)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    No users found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <DataTablePagination
            totalItems={totalItems}
            page={page}
            totalPages={totalPages}
            rangeFrom={rangeFrom}
            rangeTo={rangeTo}
            onPageChange={goPage}
          />
        </CardContent>
      </Card>

      <UserDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        user={editingUser}
        roleOptions={roleOptions}
        clinicOptions={clinicOptions}
        onSave={handleSave}
      />

      <Dialog
        open={!!passwordUser}
        onOpenChange={open => {
          if (!open) setPasswordUser(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update password</DialogTitle>
            <p className="text-sm text-muted-foreground font-normal">
              Set a new login password for {passwordUser?.firstName} {passwordUser?.lastName} (
              {passwordUser?.email}). The password is hashed with bcrypt on the server before it is stored.
            </p>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="user-new-password">New password</Label>
              <PasswordInput
                id="user-new-password"
                autoComplete="new-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                minLength={8}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="user-new-password-confirm">Confirm password</Label>
              <PasswordInput
                id="user-new-password-confirm"
                autoComplete="new-password"
                value={passwordConfirm}
                onChange={e => setPasswordConfirm(e.target.value)}
                minLength={8}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setPasswordUser(null)} disabled={savingPassword}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void submitPasswordUpdate()} disabled={savingPassword}>
              {savingPassword ? "Saving…" : "Save password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!securityUser}
        onOpenChange={open => {
          if (!open) setSecurityUser(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Security question</DialogTitle>
            <p className="text-sm text-muted-foreground font-normal">
              Choose a question and answer for {securityUser?.firstName} {securityUser?.lastName}. This follows the
              same verification flow as after login; the answer is stored as a bcrypt hash.
            </p>
          </DialogHeader>
          {securityQuestionOptions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              No active security questions exist in the database. Add questions under Settings first.
            </p>
          ) : (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>Security question</Label>
                <Select value={securityQuestionId || undefined} onValueChange={setSecurityQuestionId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a question" />
                  </SelectTrigger>
                  <SelectContent>
                    {securityQuestionOptions.map(q => (
                      <SelectItem key={q.id} value={String(q.id)}>
                        {q.question}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="security-answer">Your answer</Label>
                <PasswordInput
                  id="security-answer"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="Enter answer"
                  value={securityAnswer}
                  onChange={e => setSecurityAnswer(e.target.value)}
                  toggleAriaLabels={{ show: "Show answer", hide: "Hide answer" }}
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setSecurityUser(null)} disabled={savingSecurity}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void submitSecurityQuestion()}
              disabled={savingSecurity || securityQuestionOptions.length === 0}
            >
              {savingSecurity ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteUser}
        onOpenChange={open => {
          if (!open) setDeleteUser(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deleteUser?.firstName} {deleteUser?.lastName}? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleDelete()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Users;
