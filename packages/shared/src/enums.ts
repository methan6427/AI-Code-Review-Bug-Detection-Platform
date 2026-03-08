export const scanStatuses = ["queued", "running", "completed", "failed"] as const;
export const issueSeverities = ["critical", "high", "medium", "low", "info"] as const;
export const issueCategories = ["bug", "security", "performance", "maintainability"] as const;
export const issueStatuses = ["open", "resolved", "ignored"] as const;

export type ScanStatus = (typeof scanStatuses)[number];
export type IssueSeverity = (typeof issueSeverities)[number];
export type IssueCategory = (typeof issueCategories)[number];
export type IssueStatus = (typeof issueStatuses)[number];

