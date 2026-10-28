"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { cn } from "@/lib/utils";
import { Search, Ticket, Eye, Plus, Pencil, Trash2, Inbox, Timer, ArchiveX, ChevronsLeft, ChevronsRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ClinicSelectOption, TicketsPageRow, UserSelectOption } from "@/types/tickets-page";
import { useToast } from "@/hooks/use-toast";
import { API_ROUTES } from "@/routes/index";
import { adminFetch, AdminUnauthorizedError } from "@/lib/admin-fetch";

const PAGE_SIZE = 10;

const TYPE_OPTIONS = [
  { code: 1, label: "General" },
  { code: 2, label: "Billing" },
  { code: 3, label: "Appointment" },
  { code: 4, label: "Insurance" },
  { code: 5, label: "Prescription" },
  { code: 6, label: "Complaint" },
  { code: 7, label: "Technical" },
] as const;

const PRIORITIES: TicketsPageRow["priority"][] = ["High", "Medium", "Low"];
const STATUSES: TicketsPageRow["status"][] = ["Open", "In Progress", "Resolved", "Closed"];

const priorityVariant = (p: string) => {
  switch (p) {
    case "High":
      return "destructive";
    case "Medium":
      return "default";
    case "Low":
      return "secondary";
    default:
      return "outline";
  }
};

const statusVariant = (s: string) => {
  switch (s) {
    case "Open":
      return "outline";
    case "In Progress":
      return "default";
    case "Resolved":
      return "secondary";
    case "Closed":
      return "outline";
    default:
      return "outline";
  }
};

type TicketsProps = {
  initialTickets: TicketsPageRow[];
  clinics: ClinicSelectOption[];
  users: UserSelectOption[];
  loadError?: string | null;
};

function formatStatCount(n: number): string {
  return n.toLocaleString();
}

function asText(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return "—";
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string") {
    const s = value.trim();
    if (s === "") return "—";
    return s;
  }
  return String(value);
}

const Tickets = ({ initialTickets, clinics, users, loadError = null }: TicketsProps) => {
  const router = useRouter();
  const { toast } = useToast();
  const [tickets, setTickets] = useState<TicketsPageRow[]>(initialTickets);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [filterClinic, setFilterClinic] = useState("all");
  const [filterAssigned, setFilterAssigned] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [previewTicket, setPreviewTicket] = useState<TicketsPageRow | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TicketsPageRow | null>(null);
  const [deleteTicket, setDeleteTicket] = useState<TicketsPageRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  const [fClinicId, setFClinicId] = useState("");
  const [fType, setFType] = useState("");
  const [fReason, setFReason] = useState("");
  const [fMessage, setFMessage] = useState("");
  const [fAssignedToId, setFAssignedToId] = useState("");
  const [fBackupToId, setFBackupToId] = useState("");
  const [fPriority, setFPriority] = useState<TicketsPageRow["priority"]>("Medium");
  const [fStatus, setFStatus] = useState<TicketsPageRow["status"]>("Open");

  useEffect(() => {
    setTickets(initialTickets);
  }, [initialTickets]);

  const clinicNames = useMemo(() => clinics.map((c) => c.name).sort(), [clinics]);
  const userLabels = useMemo(() => users.map((u) => u.label).sort(), [users]);

  const filtered = useMemo(
    () =>
      tickets.filter((t) => {
        const matchSearch = `${t.no} ${t.clinic} ${t.assignedTo} ${t.reason} ${t.type} ${t.createdAt}`
          .toLowerCase()
          .includes(search.toLowerCase());
        const matchClinic = filterClinic === "all" || t.clinic === filterClinic;
        const matchAssigned = filterAssigned === "all" || t.assignedTo === filterAssigned;
        const matchStatus = filterStatus === "all" || t.status === filterStatus;
        return matchSearch && matchClinic && matchAssigned && matchStatus;
      }),
    [tickets, search, filterClinic, filterAssigned, filterStatus],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageClamped = Math.min(Math.max(1, page), totalPages);
  const pagedRows = filtered.slice((pageClamped - 1) * PAGE_SIZE, pageClamped * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [search, filterClinic, filterAssigned, filterStatus]);

  useEffect(() => {
    setPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  const stats = useMemo(() => {
    const total = tickets.length;
    const open = tickets.filter((t) => t.status === "Open").length;
    const inProgress = tickets.filter((t) => t.status === "In Progress").length;
    const closed = tickets.filter((t) => t.status === "Closed").length;
    const rows: {
      title: string;
      value: string;
      subtitle: string;
      icon: LucideIcon;
      cardClass: string;
      iconWrapClass: string;
    }[] = [
      {
        title: "Total tickets",
        value: formatStatCount(total),
        subtitle: "All records",
        icon: Ticket,
        cardClass: "border-l-4 border-l-violet-600 bg-violet-600/[0.06]",
        iconWrapClass: "bg-violet-600/15 text-violet-700 dark:text-violet-300",
      },
      {
        title: "Open",
        value: formatStatCount(open),
        subtitle: "Status: open",
        icon: Inbox,
        cardClass: "border-l-4 border-l-sky-500 bg-sky-500/[0.07]",
        iconWrapClass: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
      },
      {
        title: "In progress",
        value: formatStatCount(inProgress),
        subtitle: "Status: in progress",
        icon: Timer,
        cardClass: "border-l-4 border-l-amber-500 bg-amber-500/[0.08]",
        iconWrapClass: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
      },
      {
        title: "Closed",
        value: formatStatCount(closed),
        subtitle: "Status: closed",
        icon: ArchiveX,
        cardClass: "border-l-4 border-l-emerald-600 bg-emerald-600/[0.06]",
        iconWrapClass: "bg-emerald-600/15 text-emerald-800 dark:text-emerald-300",
      },
    ];
    return rows;
  }, [tickets]);

  const goPage = useCallback(
    (next: number) => {
      setPage(Math.min(Math.max(1, next), totalPages));
    },
    [totalPages],
  );

  const openAdd = () => {
    setEditing(null);
    setFClinicId("");
    setFType("");
    setFReason("");
    setFMessage("");
    setFAssignedToId("");
    setFBackupToId("");
    setFPriority("Medium");
    setFStatus("Open");
    setDialogOpen(true);
  };

  const openEdit = (t: TicketsPageRow) => {
    setEditing(t);
    setFClinicId(t.clinicId != null ? String(t.clinicId) : "");
    setFType(t.typeCode != null ? String(t.typeCode) : "");
    setFReason(t.reason === "—" ? "" : t.reason);
    setFMessage(t.message === "—" ? "" : t.message);
    setFAssignedToId(t.assignedToId != null ? String(t.assignedToId) : "");
    setFBackupToId(t.backupAssignedId != null ? String(t.backupAssignedId) : "");
    setFPriority(t.priority);
    setFStatus(t.status);
    setDialogOpen(true);
  };

  const buildPayload = () => ({
    clinicId: fClinicId ? Number(fClinicId) : null,
    type: fType ? Number(fType) : null,
    reason: fReason.trim(),
    message: fMessage.trim() || null,
    assignedToId: fAssignedToId ? Number(fAssignedToId) : null,
    backupAssignedId: fBackupToId ? Number(fBackupToId) : null,
    priority: fPriority,
    status: fStatus,
  });

  const handleSave = async () => {
    if (!fClinicId || !fType || !fReason.trim()) {
      toast({ title: "Missing fields", description: "Clinic, type, and reason are required.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload = buildPayload();
      if (editing) {
        const res = await adminFetch(API_ROUTES.ticket(editing.id), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = (await res.json()) as { ok?: boolean; message?: string };
        if (!res.ok || !data.ok) {
          toast({ variant: "destructive", title: "Update failed", description: data.message || res.statusText });
          return;
        }
        toast({ title: "Updated", description: `Ticket ${editing.no} saved.` });
      } else {
        const res = await adminFetch(API_ROUTES.TICKETS, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = (await res.json()) as { ok?: boolean; message?: string; id?: number };
        if (!res.ok || !data.ok) {
          toast({ variant: "destructive", title: "Create failed", description: data.message || res.statusText });
          return;
        }
        toast({ title: "Created", description: data.id != null ? `Ticket #${data.id} created.` : "Ticket created." });
      }
      setDialogOpen(false);
      router.refresh();
    } catch (e) {
      if (e instanceof AdminUnauthorizedError) {
        toast({
          variant: "destructive",
          title: "Session expired",
          description: "Please sign in again to continue.",
        });
        return;
      }
      toast({ variant: "destructive", title: "Request failed", description: "Network error." });
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTicket) return;
    setRemoving(true);
    try {
      const res = await adminFetch(API_ROUTES.ticket(deleteTicket.id), { method: "DELETE" });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) {
        toast({ variant: "destructive", title: "Delete failed", description: data.message || res.statusText });
        return;
      }
      setDeleteTicket(null);
      toast({ title: "Deleted", description: `Ticket ${deleteTicket.no} removed.` });
      router.refresh();
    } catch (e) {
      if (e instanceof AdminUnauthorizedError) {
        toast({
          variant: "destructive",
          title: "Session expired",
          description: "Please sign in again to continue.",
        });
        return;
      }
      toast({ variant: "destructive", title: "Delete failed", description: "Network error." });
    } finally {
      setRemoving(false);
    }
  };

  const rangeFrom = filtered.length === 0 ? 0 : (pageClamped - 1) * PAGE_SIZE + 1;
  const rangeTo = filtered.length === 0 ? 0 : Math.min(pageClamped * PAGE_SIZE, filtered.length);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Tickets</h1>
          <p className="text-muted-foreground text-sm mt-1">Support tickets from the database</p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4 mr-2" /> Add ticket
        </Button>
      </div>

      {loadError && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Could not load tickets: {loadError}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title} className={cn("overflow-hidden shadow-sm", stat.cardClass)}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-2">{stat.subtitle}</p>
                </div>
                <div className={cn("h-10 w-10 shrink-0 rounded-lg flex items-center justify-center", stat.iconWrapClass)}>
                  <stat.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tickets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterClinic} onValueChange={setFilterClinic}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Clinic" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Clinics</SelectItem>
            {clinicNames.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterAssigned} onValueChange={setFilterAssigned}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Assigned To" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Assigned</SelectItem>
            {userLabels.map((a) => (
              <SelectItem key={a} value={a}>
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5 text-primary" /> Tickets ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No</TableHead>
                <TableHead>Clinic</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Created Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-28">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedRows.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{asText(t.no)}</TableCell>
                  <TableCell className="text-muted-foreground">{asText(t.clinic)}</TableCell>
                  <TableCell>{asText(t.assignedTo)}</TableCell>
                  <TableCell className="text-muted-foreground max-w-[200px] truncate">{asText(t.createdAt)}</TableCell>
                  <TableCell className="text-muted-foreground">{asText(t.reason)}</TableCell>
                  <TableCell className="text-muted-foreground">{asText(t.createdDate)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{asText(t.type)}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={priorityVariant(t.priority) as "default" | "secondary" | "destructive" | "outline"}>
                      {asText(t.priority)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(t.status) as "default" | "secondary" | "destructive" | "outline"}>
                      {asText(t.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPreviewTicket(t)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(t)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteTicket(t)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                    No tickets found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {filtered.length > 0 && (
            <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Showing <span className="font-medium text-foreground">{rangeFrom}</span>–
                <span className="font-medium text-foreground">{rangeTo}</span> of{" "}
                <span className="font-medium text-foreground">{filtered.length}</span>
                <span className="hidden sm:inline"> · Page </span>
                <span className="sm:hidden">
                  <br />
                  Page{" "}
                </span>
                <span className="font-medium text-foreground">{pageClamped}</span> of{" "}
                <span className="font-medium text-foreground">{totalPages}</span>
              </p>
              <Pagination className="mx-0 w-full justify-end sm:w-auto">
                <PaginationContent className="flex-wrap justify-end">
                  <PaginationItem>
                    <PaginationLink
                      href="#"
                      size="icon"
                      aria-label="First page"
                      className={pageClamped <= 1 ? "pointer-events-none opacity-40" : undefined}
                      onClick={(e) => {
                        e.preventDefault();
                        goPage(1);
                      }}
                    >
                      <ChevronsLeft className="h-4 w-4" />
                    </PaginationLink>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      className={pageClamped <= 1 ? "pointer-events-none opacity-40" : undefined}
                      onClick={(e) => {
                        e.preventDefault();
                        goPage(pageClamped - 1);
                      }}
                    />
                  </PaginationItem>
                  {totalPages <= 9
                    ? Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                        <PaginationItem key={p}>
                          <PaginationLink
                            href="#"
                            isActive={p === pageClamped}
                            onClick={(e) => {
                              e.preventDefault();
                              goPage(p);
                            }}
                          >
                            {p}
                          </PaginationLink>
                        </PaginationItem>
                      ))
                    : (
                        <PaginationItem>
                          <span className="flex h-9 min-w-[2.5rem] items-center justify-center px-2 text-sm text-muted-foreground">
                            {pageClamped} / {totalPages}
                          </span>
                        </PaginationItem>
                      )}
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      className={pageClamped >= totalPages ? "pointer-events-none opacity-40" : undefined}
                      onClick={(e) => {
                        e.preventDefault();
                        goPage(pageClamped + 1);
                      }}
                    />
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationLink
                      href="#"
                      size="icon"
                      aria-label="Last page"
                      className={pageClamped >= totalPages ? "pointer-events-none opacity-40" : undefined}
                      onClick={(e) => {
                        e.preventDefault();
                        goPage(totalPages);
                      }}
                    >
                      <ChevronsRight className="h-4 w-4" />
                    </PaginationLink>
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!previewTicket} onOpenChange={() => setPreviewTicket(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ticket — {previewTicket ? asText(previewTicket.no) : ""}</DialogTitle>
          </DialogHeader>
          {previewTicket && (
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <span className="font-medium text-muted-foreground">No:</span>
                <div className="text-foreground">{asText(previewTicket.no)}</div>
              </div>
              <div>
                <span className="font-medium text-muted-foreground">Clinic:</span>
                <div className="text-foreground">{asText(previewTicket.clinic)}</div>
              </div>
              <div>
                <span className="font-medium text-muted-foreground">Assigned To:</span>
                <div className="text-foreground">{asText(previewTicket.assignedTo)}</div>
              </div>
              <div>
                <span className="font-medium text-muted-foreground">Backup:</span>
                <div className="text-foreground">{asText(previewTicket.backupAssigned)}</div>
              </div>
              <div className="col-span-2">
                <span className="font-medium text-muted-foreground">Created At:</span>
                <div className="text-foreground">{asText(previewTicket.createdAt)}</div>
              </div>
              <div>
                <span className="font-medium text-muted-foreground">Created date:</span>
                <div className="text-foreground">{asText(previewTicket.createdDate)}</div>
              </div>
              <div>
                <span className="font-medium text-muted-foreground">Creator:</span>
                <div className="text-foreground">{asText(previewTicket.creatorName)}</div>
              </div>
              <div>
                <span className="font-medium text-muted-foreground">Type:</span>
                <div className="text-foreground">{asText(previewTicket.type)}</div>
              </div>
              <div>
                <span className="font-medium text-muted-foreground">Priority:</span>
                <div className="mt-0.5">
                  <Badge variant={priorityVariant(previewTicket.priority) as "default" | "secondary" | "destructive" | "outline"}>
                    {asText(previewTicket.priority)}
                  </Badge>
                </div>
              </div>
              <div>
                <span className="font-medium text-muted-foreground">Status:</span>
                <div className="mt-0.5">
                  <Badge variant={statusVariant(previewTicket.status) as "default" | "secondary" | "destructive" | "outline"}>
                    {asText(previewTicket.status)}
                  </Badge>
                </div>
              </div>
              <div className="col-span-2">
                <span className="font-medium text-muted-foreground">Reason:</span>
                <div className="text-foreground">{asText(previewTicket.reason)}</div>
              </div>
              <div className="col-span-2">
                <span className="font-medium text-muted-foreground">Message:</span>
                <div className="text-foreground mt-1 whitespace-pre-wrap break-words bg-muted/50 rounded-md p-3">
                  {asText(previewTicket.message)}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="flex max-h-[min(90dvh,900px)] w-[calc(100vw-1.5rem)] max-w-2xl flex-col gap-0 overflow-y-auto overflow-x-hidden p-0 sm:max-w-3xl">
          <div className="shrink-0 border-b border-border bg-muted/30 px-5 py-4">
            <DialogHeader className="space-y-1 text-left">
              <DialogTitle className="text-lg">{editing ? "Edit ticket" : "Add ticket"}</DialogTitle>
              <p className="text-sm font-normal text-muted-foreground">Clinic, type, and reason are required. Everything else is optional.</p>
            </DialogHeader>
          </div>
          <div className="space-y-5 px-5 py-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ticket-clinic">Clinic *</Label>
                <Select value={fClinicId} onValueChange={setFClinicId}>
                  <SelectTrigger id="ticket-clinic" className="h-10">
                    <SelectValue placeholder="Select clinic" />
                  </SelectTrigger>
                  <SelectContent>
                    {clinics.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ticket-type">Type *</Label>
                <Select value={fType} onValueChange={setFType}>
                  <SelectTrigger id="ticket-type" className="h-10">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.code} value={String(opt.code)}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ticket-reason">Reason *</Label>
              <Input
                id="ticket-reason"
                className="h-10"
                value={fReason}
                onChange={(e) => setFReason(e.target.value)}
                placeholder="Short summary of the issue"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ticket-message">Message</Label>
              <Textarea
                id="ticket-message"
                className="min-h-[6.5rem] resize-y"
                value={fMessage}
                onChange={(e) => setFMessage(e.target.value)}
                placeholder="Details, steps to reproduce, or context for the team"
                rows={5}
              />
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ticket-assignee">Assigned to</Label>
                <Select value={fAssignedToId || "__none__"} onValueChange={(v) => setFAssignedToId(v === "__none__" ? "" : v)}>
                  <SelectTrigger id="ticket-assignee" className="h-10">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={String(u.id)}>
                        {u.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ticket-backup">Backup assignee</Label>
                <Select value={fBackupToId || "__none__"} onValueChange={(v) => setFBackupToId(v === "__none__" ? "" : v)}>
                  <SelectTrigger id="ticket-backup" className="h-10">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {users.map((u) => (
                      <SelectItem key={`b-${u.id}`} value={String(u.id)}>
                        {u.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ticket-priority">Priority</Label>
                <Select value={fPriority} onValueChange={(v) => setFPriority(v as TicketsPageRow["priority"])}>
                  <SelectTrigger id="ticket-priority" className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ticket-status">Status</Label>
                <Select value={fStatus} onValueChange={(v) => setFStatus(v as TicketsPageRow["status"])}>
                  <SelectTrigger id="ticket-status" className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter className="shrink-0 gap-2 border-t border-border bg-muted/20 px-5 py-3 sm:justify-end">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={() => void handleSave()} disabled={saving}>
              {saving ? "Saving…" : editing ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTicket} onOpenChange={() => !removing && setDeleteTicket(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete ticket</AlertDialogTitle>
            <AlertDialogDescription>
              Permanently delete ticket {deleteTicket ? asText(deleteTicket.no) : ""}? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>Cancel</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={removing}
              onClick={() => void handleConfirmDelete()}
            >
              {removing ? "Deleting…" : "Delete"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Tickets;
