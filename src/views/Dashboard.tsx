"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Ticket, ListChecks, Inbox, Timer, ArchiveX, Eye, Search, Trash2, ChevronsLeft, ChevronsRight } from "lucide-react";
import type { DashboardContactTrackRow } from "@/types/dashboard-contact-track";
import type { LucideIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { API_ROUTES } from "@/routes/index";
import { formatUsDate } from "@/lib/date-format";

type TicketRecord = DashboardContactTrackRow;

type DashboardProps = {
  initialTracks: DashboardContactTrackRow[];
  loadError?: string | null;
};

const PAGE_SIZE = 10;

/** Avoid rendering DB values that arrive as Date/objects after serialization edge cases. */
function asText(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (value instanceof Date) {
    return formatUsDate(value);
  }
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string") {
    const s = value.trim();
    if (s === "") return "—";
    const maybeDate = formatUsDate(s, "");
    return maybeDate || s;
  }
  if (typeof value === "object") return "[object]";
  return String(value);
}

function formatStatCount(n: number): string {
  return n.toLocaleString();
}

const priorityVariant = (p: string) => {
  switch (p) {
    case "High": return "destructive";
    case "Medium": return "default";
    case "Low": return "secondary";
    default: return "outline";
  }
};

const statusVariant = (s: string) => {
  switch (s) {
    case "Open": return "outline";
    case "In Progress": return "default";
    case "Resolved": return "secondary";
    case "Closed": return "outline";
    default: return "outline";
  }
};

const Dashboard = ({ initialTracks, loadError = null }: DashboardProps) => {
  const [tickets, setTickets] = useState<TicketRecord[]>(initialTracks);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [previewTicket, setPreviewTicket] = useState<TicketRecord | null>(null);
  const [deleteTicket, setDeleteTicket] = useState<TicketRecord | null>(null);
  const [removing, setRemoving] = useState(false);
  const { toast } = useToast();

  const filtered = useMemo(
    () =>
      tickets.filter((t) =>
        `${t.caseNumber} ${t.clinic} ${t.from} ${t.subject} ${t.priority} ${t.status}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [tickets, search],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageClamped = Math.min(Math.max(1, page), totalPages);
  const pagedRows = filtered.slice((pageClamped - 1) * PAGE_SIZE, pageClamped * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [search]);

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
        title: "Total contact tracks",
        value: formatStatCount(total),
        subtitle: "contact_tracks",
        icon: ListChecks,
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
      const p = Math.min(Math.max(1, next), totalPages);
      setPage(p);
    },
    [totalPages],
  );

  const handleConfirmDelete = async () => {
    if (!deleteTicket) return;
    setRemoving(true);
    try {
      const res = await fetch(API_ROUTES.dashboardContactTrack(deleteTicket.id), { method: "DELETE" });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) {
        toast({
          variant: "destructive",
          title: "Could not remove",
          description: data.message || res.statusText,
        });
        return;
      }
      setTickets((prev) => prev.filter((t) => t.id !== deleteTicket.id));
      setDeleteTicket(null);
      toast({ title: "Removed", description: "Contact track was deleted." });
    } catch {
      toast({ variant: "destructive", title: "Could not remove", description: "Network error." });
    } finally {
      setRemoving(false);
    }
  };

  const rangeFrom = filtered.length === 0 ? 0 : (pageClamped - 1) * PAGE_SIZE + 1;
  const rangeTo = filtered.length === 0 ? 0 : Math.min(pageClamped * PAGE_SIZE, filtered.length);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Overview of your medical services</p>
      </div>

      {loadError && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Could not load contact tracks: {loadError}
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

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2">
              <Ticket className="h-5 w-5 text-primary" />
              Contact tracks ({filtered.length})
            </CardTitle>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search contact tracks..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Case</TableHead>
                <TableHead>Clinic</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>From</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-28">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedRows.map((ticket) => (
                <TableRow key={ticket.id}>
                  <TableCell className="font-medium">{asText(ticket.caseNumber)}</TableCell>
                  <TableCell className="text-muted-foreground">{asText(ticket.clinic)}</TableCell>
                  <TableCell className="text-muted-foreground">{asText(ticket.date)}</TableCell>
                  <TableCell className="text-muted-foreground max-w-[140px] truncate">{asText(ticket.reason)}</TableCell>
                  <TableCell>{asText(ticket.from)}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{asText(ticket.subject)}</TableCell>
                  <TableCell>
                    <Badge variant={priorityVariant(ticket.priority)}>{asText(ticket.priority)}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(ticket.status)}>{asText(ticket.status)}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPreviewTicket(ticket)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteTicket(ticket)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                    No contact tracks found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {filtered.length > 0 && (
            <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Showing <span className="font-medium text-foreground">{rangeFrom}</span>
                {"–"}
                <span className="font-medium text-foreground">{rangeTo}</span>
                {" of "}
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
            <DialogTitle>Contact track — {previewTicket ? asText(previewTicket.caseNumber) : ""}</DialogTitle>
          </DialogHeader>
          {previewTicket && (
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div><span className="font-medium text-muted-foreground">Case:</span><div className="text-foreground">{asText(previewTicket.caseNumber)}</div></div>
              <div><span className="font-medium text-muted-foreground">Type:</span><div className="text-foreground">{asText(previewTicket.type)}</div></div>
              <div><span className="font-medium text-muted-foreground">Clinic:</span><div className="text-foreground">{asText(previewTicket.clinic)}</div></div>
              <div><span className="font-medium text-muted-foreground">Date:</span><div className="text-foreground">{asText(previewTicket.date)}</div></div>
              <div><span className="font-medium text-muted-foreground">Reason:</span><div className="text-foreground">{asText(previewTicket.reason)}</div></div>
              <div><span className="font-medium text-muted-foreground">From:</span><div className="text-foreground">{asText(previewTicket.from)}</div></div>
              <div><span className="font-medium text-muted-foreground">DOB:</span><div className="text-foreground">{asText(previewTicket.dob)}</div></div>
              <div><span className="font-medium text-muted-foreground">Email:</span><div className="text-foreground">{asText(previewTicket.email)}</div></div>
              <div><span className="font-medium text-muted-foreground">Cel:</span><div className="text-foreground">{asText(previewTicket.cel)}</div></div>
              <div><span className="font-medium text-muted-foreground">Language:</span><div className="text-foreground">{asText(previewTicket.language)}</div></div>
              <div><span className="font-medium text-muted-foreground">Best time:</span><div className="text-foreground">{asText(previewTicket.bestTime)}</div></div>
              <div><span className="font-medium text-muted-foreground">Assigned to:</span><div className="text-foreground">{asText(previewTicket.assignedTo)}</div></div>
              <div><span className="font-medium text-muted-foreground">Priority:</span><div className="mt-0.5"><Badge variant={priorityVariant(previewTicket.priority)}>{asText(previewTicket.priority)}</Badge></div></div>
              <div><span className="font-medium text-muted-foreground">Status:</span><div className="mt-0.5"><Badge variant={statusVariant(previewTicket.status)}>{asText(previewTicket.status)}</Badge></div></div>
              <div className="col-span-2"><span className="font-medium text-muted-foreground">Subject:</span><div className="text-foreground">{asText(previewTicket.subject)}</div></div>
              <div className="col-span-2">
                <span className="font-medium text-muted-foreground">Message:</span>
                <div className="text-foreground mt-1 whitespace-pre-wrap break-words bg-muted/50 rounded-md p-3">{asText(previewTicket.message)}</div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTicket} onOpenChange={() => !removing && setDeleteTicket(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete contact track</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete case {deleteTicket ? asText(deleteTicket.caseNumber) : ""} from the database. This cannot be undone.
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

export default Dashboard;
