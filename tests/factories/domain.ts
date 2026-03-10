import type { DashboardSummary, Issue, Profile, Repository, Scan, ScanContext, ScanEvent } from "@ai-review/shared";

const now = "2026-03-10T08:00:00.000Z";

export const makeProfile = (overrides: Partial<Profile> = {}): Profile => ({
  id: "user-1",
  email: "ada@example.com",
  fullName: "Ada Lovelace",
  avatarUrl: null,
  createdAt: now,
  updatedAt: now,
  ...overrides,
});

export const makeRepository = (overrides: Partial<Repository> = {}): Repository => ({
  id: "repo-1",
  userId: "user-1",
  name: "review-platform",
  owner: "openai",
  branch: "main",
  githubUrl: "https://github.com/openai/review-platform",
  githubInstallationId: 123,
  githubRepositoryId: 999,
  accessTokenHint: null,
  description: "Repository under review",
  sampleFiles: [
    {
      path: "src/index.ts",
      content: "export const apiKey = process.env.API_KEY;\nconsole.log(apiKey);\n",
    },
    {
      path: "package.json",
      content: '{ "dependencies": { "request": "^2.88.0" } }',
    },
  ],
  lastScanAt: null,
  createdAt: now,
  updatedAt: now,
  ...overrides,
});

const baseContext: ScanContext = {
  source: "manual",
  branch: "main",
  commitSha: null,
  baseBranch: null,
  baseCommitSha: null,
  installationId: null,
  pullRequestNumber: null,
  changedFiles: [],
  sourceType: null,
};

export const makeScan = (overrides: Partial<Scan> = {}): Scan => ({
  id: "scan-1",
  repositoryId: "repo-1",
  triggeredBy: "user-1",
  status: "completed",
  context: {
    ...baseContext,
    ...(overrides.context ?? {}),
  },
  attemptCount: 1,
  maxAttempts: 3,
  nextRetryAt: null,
  lastErrorAt: null,
  summary: {
    totalIssues: 2,
    criticalCount: 1,
    highCount: 0,
    mediumCount: 1,
    lowCount: 0,
    infoCount: 0,
    categories: {
      bug: 1,
      security: 1,
      performance: 0,
      maintainability: 0,
    },
  },
  errorMessage: null,
  startedAt: now,
  completedAt: now,
  createdAt: now,
  updatedAt: now,
  ...overrides,
});

export const makeManualScan = (overrides: Partial<Scan> = {}) =>
  makeScan({
    ...overrides,
    context: {
      ...baseContext,
      source: "manual",
      ...(overrides.context ?? {}),
    },
  });

export const makeGithubPushScan = (overrides: Partial<Scan> = {}) =>
  makeScan({
    ...overrides,
    context: {
      ...baseContext,
      source: "github_push",
      branch: "main",
      commitSha: "abc123",
      baseCommitSha: "def456",
      installationId: 123,
      changedFiles: ["src/index.ts", "package.json"],
      sourceType: "git_clone",
      ...(overrides.context ?? {}),
    },
  });

export const makeGithubPullRequestScan = (overrides: Partial<Scan> = {}) =>
  makeScan({
    ...overrides,
    context: {
      ...baseContext,
      source: "github_pull_request",
      branch: "feature/test",
      baseBranch: "main",
      commitSha: "pr-head",
      baseCommitSha: "pr-base",
      pullRequestNumber: 42,
      installationId: 123,
      sourceType: "git_clone",
      ...(overrides.context ?? {}),
    },
  });

export const makeRetryingScan = (overrides: Partial<Scan> = {}) =>
  makeScan({
    status: "queued",
    attemptCount: 2,
    nextRetryAt: "2026-03-10T08:05:00.000Z",
    errorMessage: "Previous failure",
    completedAt: null,
    ...overrides,
  });

export const makeIssue = (overrides: Partial<Issue> = {}): Issue => ({
  id: "issue-1",
  scanId: "scan-1",
  repositoryId: "repo-1",
  severity: "critical",
  category: "security",
  status: "open",
  title: "Hardcoded secret",
  description: "A secret-like token was detected in source.",
  recommendation: "Move the secret to environment configuration.",
  filePath: "src/index.ts",
  lineNumber: 4,
  ruleCode: "secret-detection",
  metadata: {},
  createdAt: now,
  ...overrides,
});

export const makeScanEvent = (overrides: Partial<ScanEvent> = {}): ScanEvent => ({
  id: "event-1",
  scanId: "scan-1",
  level: "info",
  stage: "queued",
  message: "Scan queued for worker execution",
  metadata: {},
  createdAt: now,
  ...overrides,
});

export const makeDashboardSummary = (overrides: Partial<DashboardSummary> = {}): DashboardSummary => {
  const repository = makeRepository();
  const recentScan = {
    ...makeGithubPushScan(),
    repositoryName: repository.name,
    repositoryOwner: repository.owner,
  };

  return {
    profile: makeProfile(),
    metrics: {
      repositoryCount: 1,
      scanCount: 3,
      openIssueCount: 2,
      criticalIssueCount: 1,
    },
    issueCountsBySeverity: {
      critical: 1,
      high: 0,
      medium: 1,
      low: 0,
      info: 0,
    },
    recentScans: [recentScan],
    repositories: [repository],
    ...overrides,
  };
};
