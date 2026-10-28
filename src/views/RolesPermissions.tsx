"use client";

import { Fragment, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DataTablePagination } from "@/components/data-table-pagination";
import { usePagedList } from "@/hooks/use-paged-list";
import { Plus, Pencil, Trash2, Shield, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { API_ROUTES } from "@/routes";
import { ALL_ROLE_PAGES, ROLE_PAGE_GROUPS, type RoleAction, type RoleActionMap } from "@/lib/role-permissions";
import type { RoleSettingsRow } from "@/server/roles-permissions-page";

const PAGE_SIZE = 10;

export type RolesPermissionsProps = {
  initialRows?: RoleSettingsRow[];
};

const countPermissions = (perms: RoleActionMap) =>
  Object.values(perms).reduce((s, a) => s + a.length, 0);

const totalPossible = ALL_ROLE_PAGES.reduce((s, p) => s + p.actions.length, 0);

const RolesPermissions = ({ initialRows }: RolesPermissionsProps) => {
  const router = useRouter();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleSettingsRow | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    Object.fromEntries(ROLE_PAGE_GROUPS.map(g => [g.group, true]))
  );

  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formPerms, setFormPerms] = useState<RoleActionMap>({});

  const filtered = useMemo(
    () => {
      const rows = initialRows ?? [];
      return rows.filter((r) => `${r.code} ${r.name} ${r.description}`.toLowerCase().includes(search.toLowerCase()));
    },
    [initialRows, search],
  );
  const { pagedItems, page, totalPages, totalItems, rangeFrom, rangeTo, goPage } = usePagedList(filtered, PAGE_SIZE, search);

  const openAdd = () => {
    setEditingRole(null);
    setFormName("");
    setFormCode("");
    setFormDesc("");
    setFormPerms({});
    setDialogOpen(true);
  };

  const openEdit = (role: RoleSettingsRow) => {
    setEditingRole(role);
    setFormName(role.name);
    setFormCode(role.code);
    setFormDesc(role.description);
    setFormPerms(JSON.parse(JSON.stringify(role.permissions)));
    setDialogOpen(true);
  };

  const toggleAction = (pageKey: string, action: RoleAction) => {
    setFormPerms(prev => {
      const current = prev[pageKey] || [];
      if (current.includes(action)) {
        const next = current.filter(a => a !== action);
        // if removing view, remove all actions
        if (action === "view") {
          const copy = { ...prev };
          delete copy[pageKey];
          return copy;
        }
        if (next.length === 0) {
          const copy = { ...prev };
          delete copy[pageKey];
          return copy;
        }
        return { ...prev, [pageKey]: next };
      } else {
        // if adding create/edit/delete, ensure view is included
        const next = [...current, action];
        if (action !== "view" && !next.includes("view")) next.push("view");
        return { ...prev, [pageKey]: next };
      }
    });
  };

  const toggleAllForPage = (pageKey: string, actions: readonly RoleAction[]) => {
    setFormPerms(prev => {
      const current = prev[pageKey] || [];
      if (current.length === actions.length) {
        const copy = { ...prev };
        delete copy[pageKey];
        return copy;
      }
      return { ...prev, [pageKey]: [...actions] };
    });
  };

  const toggleGroupAll = (group: string) => {
    const groupPages = ROLE_PAGE_GROUPS.find(g => g.group === group)?.pages || [];
    const allChecked = groupPages.every(p => {
      const current = formPerms[p.key] || [];
      return current.length === p.actions.length;
    });
    setFormPerms(prev => {
      const next = { ...prev };
      groupPages.forEach(p => {
        if (allChecked) {
          delete next[p.key];
        } else {
          next[p.key] = [...p.actions];
        }
      });
      return next;
    });
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast({ title: "Error", description: "Role name is required.", variant: "destructive" });
      return;
    }
    try {
      const rolePayload = { code: formCode, name: formName, description: formDesc };
      let roleId = editingRole?.id;
      if (editingRole) {
        const res = await fetch(API_ROUTES.role(editingRole.id), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(rolePayload),
        });
        const data = (await res.json()) as { ok?: boolean; message?: string };
        if (!res.ok || !data.ok) {
          toast({ title: "Error", description: data.message ?? "Could not update role.", variant: "destructive" });
          return;
        }
      } else {
        const res = await fetch(API_ROUTES.ROLES, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(rolePayload),
        });
        const data = (await res.json()) as { ok?: boolean; id?: number; message?: string };
        if (!res.ok || !data.ok || !data.id) {
          toast({ title: "Error", description: data.message ?? "Could not create role.", variant: "destructive" });
          return;
        }
        roleId = String(data.id);
      }

      const permsRes = await fetch(API_ROUTES.rolePermissions(roleId!), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions: formPerms }),
      });
      const permsData = (await permsRes.json()) as { ok?: boolean; message?: string };
      if (!permsRes.ok || !permsData.ok) {
        toast({ title: "Error", description: permsData.message ?? "Could not save permissions.", variant: "destructive" });
        return;
      }

      toast({ title: editingRole ? "Updated" : "Added", description: `Role ${editingRole ? "updated" : "created"} successfully.` });
      setDialogOpen(false);
      router.refresh();
    } catch {
      toast({ title: "Error", description: "Request failed.", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(API_ROUTES.role(deleteId), { method: "DELETE" });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) {
        toast({ title: "Error", description: data.message ?? "Could not delete role.", variant: "destructive" });
        return;
      }
      setDeleteId(null);
      router.refresh();
    } catch {
      toast({ title: "Error", description: "Request failed.", variant: "destructive" });
    }
  };

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Roles & Permissions</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage roles and control page-level access for your organization</p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4 mr-2" /> Add Role
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <Input
          placeholder="Search roles..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {/* Roles Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Role Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-center">Permissions</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagedItems.map((role) => {
              const count = countPermissions(role.permissions);
              const pct = Math.round((count / totalPossible) * 100);
              return (
                <TableRow key={role.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-primary" />
                      <span className="font-medium">{role.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm max-w-xs truncate">{role.description}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{count}/{totalPossible}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(role)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(role.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No roles found</TableCell>
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
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRole ? "Edit Role" : "Add New Role"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Basic info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Role Code</Label>
                <Input value={formCode} onChange={e => setFormCode(e.target.value)} placeholder="e.g. SUPER_ADMIN" />
              </div>
              <div className="space-y-1.5">
                <Label>Role Name</Label>
                <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g. Billing Manager" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="Describe the role responsibilities..." rows={2} />
            </div>

            {/* Permission matrix */}
            <div className="space-y-1">
              <Label className="text-base font-semibold">Page Permissions</Label>
              <p className="text-xs text-muted-foreground">Select which pages and actions this role can access</p>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-[250px]">Page</TableHead>
                    <TableHead className="text-center w-20">All</TableHead>
                    <TableHead className="text-center w-20">View</TableHead>
                    <TableHead className="text-center w-20">Create</TableHead>
                    <TableHead className="text-center w-20">Edit</TableHead>
                    <TableHead className="text-center w-20">Delete</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ROLE_PAGE_GROUPS.map(group => {
                    const isExpanded = expandedGroups[group.group] !== false;
                    const groupPages = group.pages;
                    const allGroupChecked = groupPages.every(p => {
                      const current = formPerms[p.key] || [];
                      return current.length === p.actions.length;
                    });
                    const someGroupChecked = groupPages.some(p => (formPerms[p.key] || []).length > 0);

                    return (
                      <Fragment key={group.group}>{/* group header */}
                        <TableRow
                          className="bg-muted/30 cursor-pointer hover:bg-muted/50"
                          onClick={() => toggleGroup(group.group)}
                        >
                          <TableCell className="font-semibold text-sm">
                            <div className="flex items-center gap-2">
                              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              {group.group}
                            </div>
                          </TableCell>
                          <TableCell className="text-center" onClick={e => e.stopPropagation()}>
                            <Checkbox
                              checked={
                                allGroupChecked ? true : someGroupChecked ? "indeterminate" : false
                              }
                              onCheckedChange={() => toggleGroupAll(group.group)}
                            />
                          </TableCell>
                          <TableCell colSpan={4} />
                        </TableRow>
                        {/* pages */}
                        {isExpanded && groupPages.map(page => {
                          const current = formPerms[page.key] || [];
                          const pageActions = page.actions as readonly RoleAction[];
                          const allChecked = current.length === pageActions.length;
                          return (
                            <TableRow key={page.key}>
                              <TableCell className="pl-10 text-sm">{page.label}</TableCell>
                              <TableCell className="text-center">
                                <Checkbox
                                  checked={allChecked}
                                  onCheckedChange={() => toggleAllForPage(page.key, pageActions)}
                                />
                              </TableCell>
                              {(["view", "create", "edit", "delete"] as const).map(action => (
                                <TableCell key={action} className="text-center">
                                  {pageActions.includes(action) ? (
                                    <Checkbox
                                      checked={current.includes(action)}
                                      onCheckedChange={() => toggleAction(page.key, action)}
                                    />
                                  ) : (
                                    <span className="text-muted-foreground/30">—</span>
                                  )}
                                </TableCell>
                              ))}
                            </TableRow>
                          );
                        })}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editingRole ? "Update Role" : "Create Role"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Role</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove this role. Users assigned to this role will lose their permissions.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default RolesPermissions;
