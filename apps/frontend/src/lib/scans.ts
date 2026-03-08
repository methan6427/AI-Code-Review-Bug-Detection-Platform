import type { Repository, Scan } from "@ai-review/shared";

export const hasActiveScan = (scans: Scan[]) => scans.some((scan) => scan.status === "queued" || scan.status === "running");

export const getRepositoryLabel = (repository: Pick<Repository, "owner" | "name">) => `${repository.owner}/${repository.name}`;
