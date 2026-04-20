import { useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import type { IssueActivity, IssueCategory, IssueSeverity, IssueStatus } from "@ai-review/shared";
import { issueCategories, issueSeverities, issueStatuses } from "@ai-review/shared";
import { IssueCard } from "../components/IssueCard";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { InlineMessage } from "../components/ui/InlineMessage";
import { Input } from "../components/ui/Input";
import { SectionHeader } from "../components/ui/SectionHeader";
import { Select } from "../components/ui/Select";
import { EmptyState, ErrorState, ListItemSkeleton, MetricCardSkeleton } from "../components/ui/StatePanel";
import { useToast } from "../components/ui/Toast";
import { apiClient } from "../lib/api-client";
import { feedbackMessages } from "../lib/feedback";
import { getScanSourceLabel, getScanSourceTone, getSourceTypeLabel, hasActiveScan } from "../lib/scans";
import { formatDateTime, formatRelativeTime, humanizeToken, truncateMiddle } from "../lib/utils";

type TriagePayload = {
  status?: IssueStatus;
  triageNote?: string | null;
  assignedTo?: string | null;
};

export function ScanDetailsPage() {
  const params = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const scanId = params.scanId!;
  const queryClient = useQueryClient();
  const { pushToast } = useToast();
  const initialSeverity = searchParams.get("severity");
  const initialCategory = searchParams.get("category");
  const initialStatus = searchParams.get("status");
  const [severity, setSeverity] = useState<IssueSeverity | "">(issueSeverities.includes(initialSeverity as IssueSeverity) ? (initialSeverity as IssueSeverity) : "");
  const [category, setCategory] = useState<IssueCategory | "">(issueCategories.includes(initialCategory as IssueCategory) ? (initialCategory as IssueCategory) : "");
  const [status, setStatus] = useState<IssueStatus | "">(issueStatuses.includes(initialStatus as IssueStatus) ? (initialStatus as IssueStatus) : "");
  const [search, setSearch] = useState("");
  const [statusError, setStatusError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<IssueStatus | "">("");
  const [bulkAssignee, setBulkAssignee] = useState<string>("");
  const [activeActivityIssueIds, setActiveActivityIssueIds] = useState<Set<string>>(new Set());

  const scanQuery = useQuery({
    queryKey: ["scan", scanId],
    queryFn: () => apiClient.getScan(scanId),
    refetchInterval: (currentQuery) => {
      const scan = currentQuery.state.data?.scan;
      return scan && hasActiveScan([scan]) ? 3000 : false;
    },
  });

  const issuesQuery = useQuery({
    queryKey: ["scan-issues", scanId, severity, category, status],
    queryFn: () =>
      apiClient.getIssuesByScan(scanId, {
        severity: severity || undefined,
        category: category || undefined,
        status: status || undefined,
      }),
    enabled: scanQuery.isSuccess,
  });

  const activityQueries = useQueries({
    queries: Array.from(activeActivityIssueIds).map((issueId) => ({
      queryKey: ["issue-activity", issueId],
      queryFn: () => apiClient.getIssueActivity(issueId),
      staleTime: 30_000,
    })),
  });

  const activityByIssueId = useMemo(() => {
    const map = new Map<string, { activity?: IssueActivity[]; isLoading: boolean }>();
    Array.from(activeActivityIssueIds).forEach((issueId, index) => {
      const q = activityQueries[index];
      map.set(issueId, { activity: q?.data?.activity, isLoading: Boolean(q?.isLoading) });
    });
    return map;
  }, [activeActivityIssueIds, activityQueries]);

  const updateIssueStatusMutation = useMutation({
    mutationFn: ({ issueId, nextStatus }: { issueId: string; nextStatus: IssueStatus }) => apiClient.updateIssueStatus(issueId, nextStatus),
    onSuccess: async (_data, variables) => {
      setStatusError(null);
      pushToast(feedbackMessages.issueTriaged(humanizeToken(variables.nextStatus)));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["scan-issues", scanId] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] }),
        queryClient.invalidateQueries({ queryKey: ["issue-activity", variables.issueId] }),
      ]);
    },
    onError: (mutationError) => {
      const message = mutationError instanceof Error ? mutationError.message : "Unable to update issue status";
      setStatusError(message);
      pushToast({ tone: "error", title: "Issue triage failed", description: message });
    },
  });

  const updateTriageMutation = useMutation({
    mutationFn: ({ issueId, payload }: { issueId: string; payload: TriagePayload }) => apiClient.updateIssueTriage(issueId, payload),
    onSuccess: async (_data, variables) => {
      setStatusError(null);
      pushToast({ tone: "success", title: "Triage updated", description: "The issue triage details were saved." });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["scan-issues", scanId] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] }),
        queryClient.invalidateQueries({ queryKey: ["issue-activity", variables.issueId] }),
      ]);
    },
    onError: (mutationError) => {
      const message = mutationError instanceof Error ? mutationError.message : "Unable to update triage";
      setStatusError(message);
      pushToast({ tone: "error", title: "Triage update failed", description: message });
    },
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: (payload: { issueIds: string[]; status?: IssueStatus; assignedTo?: string | null }) => apiClient.bulkUpdateIssues(payload),
    onSuccess: async (data) => {
      setStatusError(null);
      const failed = data.failedIds.length;
      pushToast({
        tone: failed > 0 ? "warning" : "success",
        title: failed > 0 ? "Bulk update partially applied" : "Bulk update applied",
        description: failed > 0
          ? `Updated ${data.updated.length} issue(s); ${failed} failed.`
          : `Updated ${data.updated.length} issue(s).`,
      });
      setSelectedIds(new Set());
      setBulkStatus("");
      setBulkAssignee("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["scan-issues", scanId] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] }),
      ]);
    },
    onError: (mutationError) => {
      const message = mutationError instanceof Error ? mutationError.message : "Bulk update failed";
      setStatusError(message);
      pushToast({ tone: "error", title: "Bulk update failed", description: message });
    },
  });

  if (scanQuery.isLoading) {
    return (
      <div className="space-y-8">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCardSkeleton />
          <MetricCardSkeleton />
          <MetricCardSkeleton />
          <MetricCardSkeleton />
        </div>
        <Card className="p-5 sm:p-6">
          <div className="space-y-3">
            <ListItemSkeleton />
            <ListItemSkeleton />
          </div>
        </Card>
      </div>
    );
  }

  if (scanQuery.isError) {
    return (
      <ErrorState
        title="Scan details unavailable"
        message={scanQuery.error.message}
        retry={() => void scanQuery.refetch()}
        action={
          <Link to="/scans">
            <Button variant="ghost">Back to scans</Button>
          </Link>
        }
      />
    );
  }

  if (!scanQuery.data) {
    return null;
  }

  if (issuesQuery.isError) {
    return <ErrorState title="Issue list unavailable" message={issuesQuery.error.message} retry={() => void issuesQuery.refetch()} />;
  }

  const { scan, repository, events } = scanQuery.data;
  const issues = issuesQuery.data?.issues ?? [];
  const filteredIssues = issues.filter((issue) => {
    const query = search.trim().toLowerCase();
    return (
      !query ||
      [issue.title, issue.description, issue.recommendation, issue.filePath ?? "", issue.ruleCode ?? "", issue.severity, issue.category, issue.status]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  });
  const groupedIssues = filteredIssues.reduce<Record<string, typeof filteredIssues>>((accumulator, issue) => {
    const key = issue.filePath ?? "Unknown file";
    accumulator[key] ??= [];
    accumulator[key].push(issue);
    return accumulator;
  }, {});
  const hasActiveFilters = Boolean(severity || category || status || search.trim());
  const filteredIds = filteredIssues.map((issue) => issue.id);
  const allFilteredSelected = filteredIds.length > 0 && filteredIds.every((id) => selectedIds.has(id));
  const selectedCount = selectedIds.size;
  const bulkPending = bulkUpdateMutation.isPending;
  const bulkCanApply = selectedCount > 0 && (bulkStatus !== "" || bulkAssignee.trim() !== "" || bulkAssignee === "");
  const updateFilters = (next: { severity?: IssueSeverity | ""; category?: IssueCategory | ""; status?: IssueStatus | "" }) => {
    const params = new URLSearchParams(searchParams);
    const nextSeverity = next.severity ?? severity;
    const nextCategory = next.category ?? category;
    const nextStatus = next.status ?? status;

    if (nextSeverity) {
      params.set("severity", nextSeverity);
    } else {
      params.delete("severity");
    }

    if (nextCategory) {
      params.set("category", nextCategory);
    } else {
      params.delete("category");
    }

    if (nextStatus) {
      params.set("status", nextStatus);
    } else {
      params.delete("status");
    }

    setSearchParams(params, { replace: true });
  };

  const toggleSelection = (issueId: string, selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (selected) {
        next.add(issueId);
      } else {
        next.delete(issueId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredIds));
    }
  };

  const toggleActivityLoad = (issueId: string) => {
    setActiveActivityIssueIds((prev) => {
      if (prev.has(issueId)) {
        return prev;
      }
      const next = new Set(prev);
      next.add(issueId);
      return next;
    });
  };

  const applyBulk = () => {
    const issueIds = Array.from(selectedIds);
    if (issueIds.length === 0) {
      return;
    }
    const payload: { issueIds: string[]; status?: IssueStatus; assignedTo?: string | null } = { issueIds };
    if (bulkStatus) {
      payload.status = bulkStatus;
    }
    const trimmedAssignee = bulkAssignee.trim();
    if (trimmedAssignee !== bulkAssignee || trimmedAssignee.length > 0) {
      payload.assignedTo = trimmedAssignee.length > 0 ? trimmedAssignee : null;
    }
    if (payload.status === undefined && payload.assignedTo === undefined) {
      pushToast({ tone: "warning", title: "Nothing to apply", description: "Pick a status or provide an assignee before applying." });
      return;
    }
    bulkUpdateMutation.mutate(payload);
  };

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Scan Report"
        title={`Scan ${scan.id.slice(0, 8)}`}
        description={`Report for ${repository.owner}/${repository.name}`}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Status</p>
          <div className="mt-3 flex items-center gap-2">
            <Badge tone={scan.status}>{scan.status}</Badge>
            <span className="text-sm text-slate-400">{scan.status === "failed" ? "Retry or inspect errors" : scan.status === "completed" ? "Report ready" : "Execution active"}</span>
          </div>
        </Card>
        <Card className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Total issues</p>
          <p className="mt-3 text-3xl font-semibold text-white">{scan.summary.totalIssues ?? 0}</p>
          <p className="mt-2 text-sm text-slate-400">Current finding count for this scan result.</p>
        </Card>
        <Card className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Started</p>
          <p className="mt-3 text-sm font-medium text-white">{formatDateTime(scan.startedAt ?? scan.createdAt)}</p>
          <p className="mt-2 text-sm text-slate-400">{formatRelativeTime(scan.startedAt ?? scan.createdAt)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Completed</p>
          <p className="mt-3 text-sm font-medium text-white">{formatDateTime(scan.completedAt)}</p>
          <p className="mt-2 text-sm text-slate-400">{formatRelativeTime(scan.completedAt)}</p>
        </Card>
      </div>

      <Card className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">Scan context</h2>
            <p className="mt-1 text-sm text-slate-400">Make the source and execution metadata explicit so triage decisions have the right engineering context.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={getScanSourceTone(scan.context.source)}>{getScanSourceLabel(scan.context.source)}</Badge>
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">{scan.context.source}</span>
          </div>
        </div>
        <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Execution metadata</p>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-white/8 bg-slate-950/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Branch</p>
            <p className="mt-2 text-sm text-slate-200">{scan.context.branch ?? "N/A"}</p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-slate-950/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Commit</p>
            <p className="mt-2 break-all font-mono text-sm text-slate-200">{scan.context.commitSha ? truncateMiddle(scan.context.commitSha, 12, 8) : "N/A"}</p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-slate-950/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Source type</p>
            <div className="mt-2 flex items-center gap-2">
              <Badge tone={scan.context.sourceType ?? "default"}>{getSourceTypeLabel(scan.context.sourceType)}</Badge>
            </div>
          </div>
          <div className="rounded-2xl border border-white/8 bg-slate-950/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Changed files</p>
            <p className="mt-2 text-sm text-slate-200">{scan.context.changedFiles.length}</p>
            <p className="mt-2 text-xs text-slate-500">Analyzed file totals are not exposed yet.</p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-white/8 bg-slate-950/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Attempts</p>
            <p className="mt-2 text-sm text-slate-200">
              {scan.attemptCount} / {scan.maxAttempts}
            </p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-slate-950/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Next retry</p>
            <p className="mt-2 text-sm text-slate-200">{formatDateTime(scan.nextRetryAt)}</p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-slate-950/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Last error</p>
            <p className="mt-2 text-sm text-slate-200">{formatDateTime(scan.lastErrorAt)}</p>
            <p className="mt-2 text-xs text-slate-500">{scan.errorMessage ?? "Previous failure details are not available."}</p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-slate-950/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Pull request</p>
            <p className="mt-2 text-sm text-slate-200">{scan.context.pullRequestNumber ? `#${scan.context.pullRequestNumber}` : "N/A"}</p>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-5">
        <Card className="p-5 xl:col-span-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">Issue filters</h2>
              <p className="mt-1 text-sm text-slate-400">Search and filter by severity, category, or triage status to focus review work.</p>
            </div>
            {hasActiveFilters ? <Badge tone="info">Filtered view</Badge> : <Badge tone="default">All issues</Badge>}
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="md:col-span-2 xl:col-span-1">
              <label className="mb-2 block text-sm font-medium text-slate-300">Search issues</label>
              <Input
                aria-label="Search issues"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search title, file, rule, recommendation"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Severity</label>
              <Select
                value={severity}
                onChange={(event) => {
                  const next = event.target.value as IssueSeverity | "";
                  setSeverity(next);
                  updateFilters({ severity: next });
                }}
              >
                <option value="">All severities</option>
                {issueSeverities.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Category</label>
              <Select
                value={category}
                onChange={(event) => {
                  const next = event.target.value as IssueCategory | "";
                  setCategory(next);
                  updateFilters({ category: next });
                }}
              >
                <option value="">All categories</option>
                {issueCategories.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Status</label>
              <Select
                value={status}
                onChange={(event) => {
                  const next = event.target.value as IssueStatus | "";
                  setStatus(next);
                  updateFilters({ status: next });
                }}
              >
                <option value="">All statuses</option>
                {issueStatuses.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </Card>

        <Card className="p-5 xl:col-span-2">
          <h2 className="text-lg font-semibold text-white">Summary by severity</h2>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/8 bg-slate-950/60 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Critical</p>
              <p className="mt-2 text-2xl font-semibold text-white">{scan.summary.criticalCount ?? 0}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-slate-950/60 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">High</p>
              <p className="mt-2 text-2xl font-semibold text-white">{scan.summary.highCount ?? 0}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-slate-950/60 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Medium</p>
              <p className="mt-2 text-2xl font-semibold text-white">{scan.summary.mediumCount ?? 0}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-slate-950/60 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Low + info</p>
              <p className="mt-2 text-2xl font-semibold text-white">{(scan.summary.lowCount ?? 0) + (scan.summary.infoCount ?? 0)}</p>
            </div>
          </div>
        </Card>
      </div>

      {filteredIssues.length > 0 ? (
        <Card className="p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-200">
                <input
                  type="checkbox"
                  className="h-4 w-4 cursor-pointer rounded border-white/15 bg-slate-950 text-cyan-400 focus:ring-cyan-400/30"
                  checked={allFilteredSelected}
                  onChange={toggleSelectAll}
                />
                {allFilteredSelected ? "Clear selection" : "Select all filtered"}
              </label>
              <Badge tone={selectedCount > 0 ? "info" : "default"}>{selectedCount} selected</Badge>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={bulkStatus} onChange={(event) => setBulkStatus(event.target.value as IssueStatus | "")} className="min-w-[150px]">
                <option value="">Set status…</option>
                {issueStatuses.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </Select>
              <Input
                aria-label="Bulk assignee"
                value={bulkAssignee}
                onChange={(event) => setBulkAssignee(event.target.value)}
                placeholder="Assignee (empty = clear)"
                className="min-w-[220px]"
              />
              <Button
                type="button"
                variant="secondary"
                disabled={!bulkCanApply || bulkPending}
                onClick={applyBulk}
              >
                {bulkPending ? "Applying…" : "Apply to selection"}
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      {statusError ? <InlineMessage tone="error">{statusError}</InlineMessage> : null}

      {!issuesQuery.isLoading && filteredIssues.length > 0 ? (
        <div className="space-y-4">
          {Object.entries(groupedIssues).map(([filePath, fileIssues]) => (
            <Card key={filePath} className="p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/8 pb-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">File group</p>
                  <p className="mt-2 break-all font-mono text-sm text-slate-100">{filePath}</p>
                </div>
                <Badge tone="default">{fileIssues.length} issues</Badge>
              </div>
              <div className="mt-4 space-y-4">
                {fileIssues.map((issue) => {
                  const activityState = activityByIssueId.get(issue.id);
                  const isStatusUpdating = updateIssueStatusMutation.isPending && updateIssueStatusMutation.variables?.issueId === issue.id;
                  const isTriageUpdating = updateTriageMutation.isPending && updateTriageMutation.variables?.issueId === issue.id;
                  return (
                    <IssueCard
                      key={issue.id}
                      issue={issue}
                      selectable
                      isSelected={selectedIds.has(issue.id)}
                      onSelectChange={(selected) => toggleSelection(issue.id, selected)}
                      isUpdating={isStatusUpdating || isTriageUpdating}
                      onStatusChange={(nextStatus) => updateIssueStatusMutation.mutate({ issueId: issue.id, nextStatus })}
                      onTriageUpdate={(payload) => updateTriageMutation.mutate({ issueId: issue.id, payload })}
                      onLoadActivity={() => toggleActivityLoad(issue.id)}
                      activity={activityState?.activity}
                      isActivityLoading={activityState?.isLoading ?? false}
                    />
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      ) : issuesQuery.isLoading ? (
        <div className="space-y-4">
          <ListItemSkeleton />
          <ListItemSkeleton />
        </div>
      ) : (
        <EmptyState
          eyebrow="Issues"
          title={hasActiveFilters ? "No issues match the active filters" : "No issues found for this scan"}
          description={
            hasActiveFilters
              ? "Adjust the search or filter values, or clear the active triage view to review more findings."
              : "This scan does not have recorded findings yet. Review the execution timeline or run a fresh scan if you expected issues."
          }
          action={
            hasActiveFilters ? (
              <Button
                onClick={() => {
                  setSeverity("");
                  setCategory("");
                  setStatus("");
                  setSearch("");
                  setSearchParams({}, { replace: true });
                }}
                variant="secondary"
              >
                Clear filters
              </Button>
            ) : undefined
          }
        />
      )}

      <Card className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">Execution timeline</h2>
            <p className="mt-1 text-sm text-slate-400">Operational events from queueing through retries and report generation.</p>
          </div>
          <Badge tone="info">{events.length} events</Badge>
        </div>
        <div className="mt-4 space-y-3">
          {events.length > 0 ? (
            events.map((event) => (
              <div key={event.id} className="rounded-2xl border border-white/8 bg-slate-950/60 p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Badge tone={event.level === "error" ? "critical" : event.level === "warn" ? "medium" : "info"}>{event.level}</Badge>
                    <span className="text-sm font-medium text-white">{event.stage}</span>
                  </div>
                  {event.stage === "retry" ? <Badge tone="medium">Retry</Badge> : null}
                  <span className="text-xs text-slate-500">{formatDateTime(event.createdAt)}</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-300">{event.message}</p>
              </div>
            ))
          ) : (
            <EmptyState eyebrow="Timeline" title="No execution events yet" description="Worker and reporting events will appear here as the scan progresses." />
          )}
        </div>
      </Card>
    </div>
  );
}
