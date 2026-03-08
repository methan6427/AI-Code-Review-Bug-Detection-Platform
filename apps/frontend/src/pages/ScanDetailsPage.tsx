import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { IssueCategory, IssueSeverity, IssueStatus } from "@ai-review/shared";
import { issueCategories, issueSeverities, issueStatuses } from "@ai-review/shared";
import { IssueCard } from "../components/IssueCard";
import { Badge } from "../components/ui/Badge";
import { Card } from "../components/ui/Card";
import { SectionHeader } from "../components/ui/SectionHeader";
import { Select } from "../components/ui/Select";
import { EmptyState, ErrorState, LoadingState } from "../components/ui/StatePanel";
import { apiClient } from "../lib/api-client";
import { hasActiveScan } from "../lib/scans";
import { formatDateTime } from "../lib/utils";

export function ScanDetailsPage() {
  const params = useParams();
  const scanId = params.scanId!;
  const [severity, setSeverity] = useState<IssueSeverity | "">("");
  const [category, setCategory] = useState<IssueCategory | "">("");
  const [status, setStatus] = useState<IssueStatus | "">("");

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

  if (scanQuery.isLoading) {
    return <LoadingState title="Loading scan details..." />;
  }

  if (scanQuery.isError) {
    return <ErrorState message={scanQuery.error.message} retry={() => void scanQuery.refetch()} />;
  }

  if (!scanQuery.data) {
    return <LoadingState title="Preparing scan report..." />;
  }

  if (issuesQuery.isError) {
    return <ErrorState message={issuesQuery.error.message} retry={() => void issuesQuery.refetch()} />;
  }

  const { scan, repository } = scanQuery.data;
  const issues = issuesQuery.data?.issues ?? [];

  return (
    <div className="space-y-8">
      <SectionHeader
        title={`Scan ${scan.id.slice(0, 8)}`}
        description={`Report for ${repository.owner}/${repository.name}`}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="p-5">
          <p className="text-sm text-slate-400">Status</p>
          <div className="mt-3">
            <Badge tone={scan.status}>{scan.status}</Badge>
          </div>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-slate-400">Total issues</p>
          <p className="mt-3 text-3xl font-semibold text-white">{scan.summary.totalIssues ?? 0}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-slate-400">Started</p>
          <p className="mt-3 text-sm text-white">{formatDateTime(scan.startedAt ?? scan.createdAt)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-slate-400">Completed</p>
          <p className="mt-3 text-sm text-white">{formatDateTime(scan.completedAt)}</p>
        </Card>
      </div>

      <Card className="p-5">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm text-slate-400">Severity</label>
            <Select value={severity} onChange={(event) => setSeverity(event.target.value as IssueSeverity | "")}>
              <option value="">All severities</option>
              {issueSeverities.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-2 block text-sm text-slate-400">Category</label>
            <Select value={category} onChange={(event) => setCategory(event.target.value as IssueCategory | "")}>
              <option value="">All categories</option>
              {issueCategories.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-2 block text-sm text-slate-400">Status</label>
            <Select value={status} onChange={(event) => setStatus(event.target.value as IssueStatus | "")}>
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

      {issuesQuery.isLoading ? <LoadingState title="Loading issues..." /> : null}

      {!issuesQuery.isLoading && issues.length > 0 ? (
        <div className="space-y-4">
          {issues.map((issue) => (
            <IssueCard key={issue.id} issue={issue} />
          ))}
        </div>
      ) : !issuesQuery.isLoading ? (
        <EmptyState title="No issues match the active filters" description="Adjust filters or run a new scan with richer repository samples." />
      ) : null}
    </div>
  );
}
