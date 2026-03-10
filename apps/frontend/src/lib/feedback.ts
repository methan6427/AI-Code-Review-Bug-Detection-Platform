export type FeedbackTone = "success" | "warning" | "error" | "info";

export type FeedbackMessage = {
  tone: FeedbackTone;
  title: string;
  description?: string;
};

const flashFeedbackKey = "ai-review-flash-feedback";

export const feedbackMessages = {
  repositoryImported: (name: string): FeedbackMessage => ({
    tone: "success",
    title: "Repository metadata imported",
    description: `${name} was loaded into the form. Review the fields and save the repository when ready.`,
  }),
  repositoryCreated: (name: string): FeedbackMessage => ({
    tone: "success",
    title: "Repository added",
    description: `${name} is ready for scans and repository-level review.`,
  }),
  repositoryUpdated: (): FeedbackMessage => ({
    tone: "success",
    title: "Repository changes saved",
    description: "The latest metadata and sample files will be used for future scans.",
  }),
  repositoryDeleted: (): FeedbackMessage => ({
    tone: "success",
    title: "Repository deleted",
    description: "Related repository views were refreshed.",
  }),
  scanQueued: (): FeedbackMessage => ({
    tone: "success",
    title: "Scan queued",
    description: "The repository entered the execution queue and live status will update automatically.",
  }),
  issueTriaged: (statusLabel: string): FeedbackMessage => ({
    tone: "success",
    title: "Issue triaged",
    description: `The issue status is now ${statusLabel}.`,
  }),
  authSucceeded: (mode: "login" | "signup"): FeedbackMessage => ({
    tone: "success",
    title: mode === "login" ? "Signed in" : "Account created",
    description: "Your workspace session is active.",
  }),
  authFailed: (description?: string): FeedbackMessage => ({
    tone: "error",
    title: "Authentication failed",
    description: description ?? "Check your credentials or provider setup and try again.",
  }),
  oauthRedirectStarted: (provider: string): FeedbackMessage => ({
    tone: "info",
    title: `Redirecting to ${provider}`,
    description: `Complete the ${provider} authorization flow to finish signing in.`,
  }),
  oauthConnected: (provider: string): FeedbackMessage => ({
    tone: "success",
    title: `${provider} sign-in complete`,
    description: "Your workspace session is active.",
  }),
  oauthActionFailed: (provider: string, description?: string): FeedbackMessage => ({
    tone: "error",
    title: `${provider} sign-in failed`,
    description: description ?? `Check your ${provider} provider setup and try again.`,
  }),
  githubConnectStarted: (): FeedbackMessage => ({
    tone: "info",
    title: "Redirecting to GitHub",
    description: "Complete the GitHub authorization flow to finish linking your account.",
  }),
  githubConnected: (): FeedbackMessage => ({
    tone: "success",
    title: "GitHub connected",
    description: "Your account can now use GitHub-backed repository and auth flows.",
  }),
  githubActionFailed: (description?: string): FeedbackMessage => ({
    tone: "error",
    title: "GitHub action failed",
    description: description ?? "Check your GitHub permissions and integration settings, then try again.",
  }),
  loadingSurface: (label: string): FeedbackMessage => ({
    tone: "info",
    title: label,
  }),
} satisfies Record<string, (...args: any[]) => FeedbackMessage>;

export const storeFlashFeedback = (message: FeedbackMessage) => {
  window.localStorage.setItem(flashFeedbackKey, JSON.stringify(message));
};

export const consumeFlashFeedback = (): FeedbackMessage | null => {
  const rawValue = window.localStorage.getItem(flashFeedbackKey);
  if (!rawValue) {
    return null;
  }

  window.localStorage.removeItem(flashFeedbackKey);

  try {
    return JSON.parse(rawValue) as FeedbackMessage;
  } catch {
    return null;
  }
};
