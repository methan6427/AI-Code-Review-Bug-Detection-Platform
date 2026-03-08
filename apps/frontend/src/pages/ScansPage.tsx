import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../lib/api-client";
import { getRepositoryLabel, hasActiveScan } from "../lib/scans";
import { ScanRow } from "../components/ScanRow";
import { SectionHeader } from "../components/ui/SectionHeader";
import { EmptyState, ErrorState, LoadingState } from "../components/ui/StatePanel";

export function ScansPage() {
  const scansQuery = useQuery({
    queryKey: ["scans"],
    queryFn: () => apiClient.getScans(),
    refetchInterval: (currentQuery) => {
      const scans = currentQuery.state.data?.scans ?? [];
      return hasActiveScan(scans) ? 3000 : false;
    },
  });

  const repositoriesQuery = useQuery({
    queryKey: ["repositories"],
    queryFn: () => apiClient.getRepositories(),
  });

  if (scansQuery.isLoading || repositoriesQuery.isLoading) {
    return <LoadingState title="Loading scans..." />;
  }

  if (scansQuery.isError) {
    return <ErrorState message={scansQuery.error.message} retry={() => void scansQuery.refetch()} />;
  }

  if (repositoriesQuery.isError) {
    return <ErrorState message={repositoriesQuery.error.message} retry={() => void repositoriesQuery.refetch()} />;
  }

  if (!scansQuery.data || !repositoriesQuery.data) {
    return <LoadingState title="Preparing scans..." />;
  }

  const repositoryLabelLookup = new Map(
    repositoriesQuery.data.repositories.map((repository) => [repository.id, getRepositoryLabel(repository)]),
  );

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Scans"
        description="Monitor queue state, issue totals, and completion timestamps for every scan run."
      />
      {scansQuery.data.scans.length > 0 ? (
        <div className="space-y-3">
          {scansQuery.data.scans.map((scan) => (
            <ScanRow key={scan.id} scan={scan} repositoryLabel={repositoryLabelLookup.get(scan.repositoryId) ?? scan.repositoryId} />
          ))}
        </div>
      ) : (
        <EmptyState title="No scans available" description="Create a repository and trigger a scan to populate this page." />
      )}
    </div>
  );
}
