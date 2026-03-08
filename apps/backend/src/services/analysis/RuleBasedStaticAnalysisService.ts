import type { SampleFile } from "@ai-review/shared";
import type { AnalysisContext, AnalysisIssue, StaticAnalysisService } from "./types";

const findLineNumber = (content: string, matcher: RegExp): number | null => {
  const lines = content.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    if (matcher.test(lines[index] ?? "")) {
      return index + 1;
    }
  }

  return null;
};

const countOccurrences = (content: string, expression: RegExp): number =>
  (content.match(expression) ?? []).length;

const findLongFunction = (file: SampleFile): AnalysisIssue | null => {
  const lines = file.content.split(/\r?\n/);
  let functionStart = -1;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    if (/function\s+\w+|\=\s*\(?.*\)?\s*=>/.test(line)) {
      functionStart = index;
    }

    if (functionStart >= 0 && line.includes("}")) {
      const length = index - functionStart + 1;
      if (length >= 25) {
        return {
          title: "Long function detected",
          description: `A function in ${file.path} spans ${length} lines, which raises complexity and maintenance risk.`,
          severity: "medium",
          category: "maintainability",
          filePath: file.path,
          lineNumber: functionStart + 1,
          recommendation: "Split the function into smaller units with clearer responsibilities.",
          ruleCode: "maintainability.long-function",
          metadata: { length },
        };
      }
      functionStart = -1;
    }
  }

  return null;
};

export class RuleBasedStaticAnalysisService implements StaticAnalysisService {
  async analyze(context: AnalysisContext): Promise<AnalysisIssue[]> {
    const issues: AnalysisIssue[] = [];

    for (const file of context.files) {
      const { content, path } = file;

      if (/\beval\s*\(/.test(content)) {
        issues.push({
          title: "Use of eval detected",
          description: "Dynamic code execution via eval introduces security and stability risks.",
          severity: "critical",
          category: "security",
          filePath: path,
          lineNumber: findLineNumber(content, /\beval\s*\(/),
          recommendation: "Remove eval and replace it with explicit parsing or safe execution logic.",
          ruleCode: "security.eval",
        });
      }

      if (/console\.(log|debug)\s*\(/.test(content)) {
        issues.push({
          title: "Console logging found in application code",
          description: "Production-facing code still contains console logging that can leak internal state and create noise.",
          severity: "low",
          category: "maintainability",
          filePath: path,
          lineNumber: findLineNumber(content, /console\.(log|debug)\s*\(/),
          recommendation: "Replace console statements with structured logging or remove them before release.",
          ruleCode: "maintainability.console-log",
        });
      }

      if (/(api[_-]?key|secret|token|password)\s*[:=]\s*['"`][^'"`\n]{8,}/i.test(content)) {
        issues.push({
          title: "Potential hardcoded secret",
          description: "The file contains a value that looks like a secret or credential stored in source code.",
          severity: "critical",
          category: "security",
          filePath: path,
          lineNumber: findLineNumber(content, /(api[_-]?key|secret|token|password)\s*[:=]\s*['"`][^'"`\n]{8,}/i),
          recommendation: "Move secrets into environment variables or a secret manager and rotate exposed credentials.",
          ruleCode: "security.hardcoded-secret",
        });
      }

      if (countOccurrences(content, /\bfunction\s*\(/g) + countOccurrences(content, /\=\s*\([^)]*\)\s*=>/g) >= 3 &&
          countOccurrences(content, /\}\s*\)/g) >= 2) {
        issues.push({
          title: "Nested callbacks reduce readability",
          description: "The file appears to rely on layered callbacks, which often makes error flow and control flow difficult to follow.",
          severity: "medium",
          category: "maintainability",
          filePath: path,
          lineNumber: 1,
          recommendation: "Refactor callback chains to async/await or smaller composable functions.",
          ruleCode: "maintainability.nested-callbacks",
        });
      }

      if (/\bfetch\s*\(/.test(content) && !/try\s*\{/.test(content) && !/\.catch\s*\(/.test(content)) {
        issues.push({
          title: "Missing error handling around async request",
          description: "A network request is executed without visible error handling.",
          severity: "high",
          category: "bug",
          filePath: path,
          lineNumber: findLineNumber(content, /\bfetch\s*\(/),
          recommendation: "Wrap async requests in try/catch or attach a catch handler and surface fallback behavior.",
          ruleCode: "bug.missing-error-handling",
        });
      }

      if (path.endsWith("package.json") && /"request"\s*:|"lodash"\s*:|"left-pad"\s*:/i.test(content)) {
        issues.push({
          title: "Dependency review recommended",
          description: "The repository references a dependency often flagged for deprecation, maintenance concerns, or legacy risk.",
          severity: "info",
          category: "performance",
          filePath: path,
          lineNumber: findLineNumber(content, /"request"\s*:|"lodash"\s*:|"left-pad"\s*:/i),
          recommendation: "Review dependency versions and replace unsupported packages with maintained alternatives.",
          ruleCode: "performance.dependency-review",
        });
      }

      const longFunctionIssue = findLongFunction(file);
      if (longFunctionIssue) {
        issues.push(longFunctionIssue);
      }
    }

    return issues;
  }
}

