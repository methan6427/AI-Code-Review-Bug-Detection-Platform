import type { SampleFile } from "@ai-review/shared";
import { buildSummary } from "../services/analysis/summary";
import { PlaceholderAIAnalysisService } from "../services/analysis/PlaceholderAIAnalysisService";
import { RuleBasedStaticAnalysisService } from "../services/analysis/RuleBasedStaticAnalysisService";
import { supabaseAdmin } from "../services/supabase/client";
import type { RepositoryRow, ScanRow } from "../types/database";

const staticAnalysisService = new RuleBasedStaticAnalysisService();
const aiAnalysisService = new PlaceholderAIAnalysisService();

const demoUser = {
  email: process.env.DEMO_USER_EMAIL ?? "demo@aireview.local",
  password: process.env.DEMO_USER_PASSWORD ?? "DemoPass123!",
  fullName: process.env.DEMO_USER_FULL_NAME ?? "Demo Analyst",
};

const demoRepositories: Array<{
  name: string;
  owner: string;
  branch: string;
  githubUrl: string;
  description: string;
  sampleFiles: SampleFile[];
}> = [
  {
    name: "bug-hunter-api",
    owner: "demo-org",
    branch: "main",
    githubUrl: "https://github.com/demo-org/bug-hunter-api",
    description: "Express-style API with a few intentional reliability and security smells for demo scans.",
    sampleFiles: [
      {
        path: "src/index.ts",
        content: `export async function boot(payload: string) {
  console.log("boot payload", payload);
  return eval(payload);
}
`,
      },
      {
        path: "src/payments.ts",
        content: `export async function syncPayments() {
  const response = await fetch("https://example.com/payments");
  return response.json();
}
`,
      },
      {
        path: "package.json",
        content: `{
  "name": "bug-hunter-api",
  "dependencies": {
    "request": "^2.88.0"
  }
}
`,
      },
    ],
  },
  {
    name: "review-dashboard",
    owner: "demo-org",
    branch: "develop",
    githubUrl: "https://github.com/demo-org/review-dashboard",
    description: "Frontend demo app with callback nesting and timer-based orchestration for scan output variety.",
    sampleFiles: [
      {
        path: "src/app.ts",
        content: `const apiKey = "sk-demo-secret-token";

export function renderDashboard(callback: () => void) {
  setTimeout(() => {
    Promise.resolve().then(() => {
      callback();
    });
  }, 0);
}
`,
      },
      {
        path: "src/report.ts",
        content: `export function buildReport() {
  function stepOne() {
    return function () {
      return function () {
        console.debug("nested");
      };
    };
  }

  return stepOne();
}
`,
      },
      {
        path: "package.json",
        content: `{
  "name": "review-dashboard",
  "dependencies": {
    "lodash": "^4.17.21"
  }
}
`,
      },
    ],
  },
];

async function getOrCreateDemoUser() {
  const createResult = await supabaseAdmin.auth.admin.createUser({
    email: demoUser.email,
    password: demoUser.password,
    email_confirm: true,
    user_metadata: {
      full_name: demoUser.fullName,
    },
  });

  if (!createResult.error && createResult.data.user) {
    return createResult.data.user;
  }

  const listResult = await supabaseAdmin.auth.admin.listUsers();
  if (listResult.error) {
    throw listResult.error;
  }

  const existingUser = listResult.data.users.find((user) => user.email?.toLowerCase() === demoUser.email.toLowerCase());
  if (!existingUser) {
    throw createResult.error ?? new Error("Unable to create demo user");
  }

  return existingUser;
}

async function ensureProfile(userId: string) {
  const { error } = await supabaseAdmin.from("profiles").upsert({
    id: userId,
    email: demoUser.email,
    full_name: demoUser.fullName,
  });

  if (error) {
    throw error;
  }
}

async function ensureRepository(userId: string, repository: (typeof demoRepositories)[number]) {
  const { data, error } = await supabaseAdmin
    .from("repositories")
    .upsert(
      {
        user_id: userId,
        name: repository.name,
        owner: repository.owner,
        branch: repository.branch,
        github_url: repository.githubUrl,
        description: repository.description,
        sample_files: repository.sampleFiles,
      },
      { onConflict: "user_id,owner,name" },
    )
    .select("*")
    .single<RepositoryRow>();

  if (error || !data) {
    throw error ?? new Error(`Unable to seed repository ${repository.owner}/${repository.name}`);
  }

  return data;
}

async function ensureCompletedScan(userId: string, repository: RepositoryRow) {
  const existingScanResult = await supabaseAdmin
    .from("scans")
    .select("*")
    .eq("repository_id", repository.id)
    .limit(1)
    .returns<ScanRow[]>();

  if (existingScanResult.error) {
    throw existingScanResult.error;
  }

  if ((existingScanResult.data ?? []).length > 0) {
    return;
  }

  const scanStartedAt = new Date().toISOString();
  const scanInsertResult = await supabaseAdmin
    .from("scans")
    .insert({
      repository_id: repository.id,
      triggered_by: userId,
      status: "running",
      started_at: scanStartedAt,
    })
    .select("*")
    .single<ScanRow>();

  if (scanInsertResult.error || !scanInsertResult.data) {
    throw scanInsertResult.error ?? new Error(`Unable to create demo scan for ${repository.name}`);
  }

  const context = {
    repositoryId: repository.id,
    files: repository.sample_files,
  };
  const issues = [
    ...(await staticAnalysisService.analyze(context)),
    ...(await aiAnalysisService.analyze(context)),
  ];
  const summary = buildSummary(issues);
  const completedAt = new Date().toISOString();

  if (issues.length > 0) {
    const issueInsertResult = await supabaseAdmin.from("issues").insert(
      issues.map((issue) => ({
        scan_id: scanInsertResult.data.id,
        repository_id: repository.id,
        severity: issue.severity,
        category: issue.category,
        status: "open",
        title: issue.title,
        description: issue.description,
        recommendation: issue.recommendation,
        file_path: issue.filePath,
        line_number: issue.lineNumber,
        rule_code: issue.ruleCode,
        metadata: issue.metadata ?? {},
      })),
    );

    if (issueInsertResult.error) {
      throw issueInsertResult.error;
    }
  }

  const scanUpdateResult = await supabaseAdmin
    .from("scans")
    .update({
      status: "completed",
      summary,
      completed_at: completedAt,
    })
    .eq("id", scanInsertResult.data.id);

  if (scanUpdateResult.error) {
    throw scanUpdateResult.error;
  }

  const repositoryUpdateResult = await supabaseAdmin
    .from("repositories")
    .update({ last_scan_at: completedAt })
    .eq("id", repository.id);

  if (repositoryUpdateResult.error) {
    throw repositoryUpdateResult.error;
  }
}

async function main() {
  const user = await getOrCreateDemoUser();
  await ensureProfile(user.id);

  for (const repository of demoRepositories) {
    const savedRepository = await ensureRepository(user.id, repository);
    await ensureCompletedScan(user.id, savedRepository);
  }

  console.log("Demo seed completed.");
  console.log(`Email: ${demoUser.email}`);
  console.log(`Password: ${demoUser.password}`);
}

void main().catch((error) => {
  console.error("Demo seed failed.");
  console.error(error);
  process.exit(1);
});
