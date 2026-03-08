import type { SampleFile } from "@ai-review/shared";

export const defaultRepositoryFiles: SampleFile[] = [
  {
    path: "src/index.ts",
    content: `export function bootApp(userInput: string) {
  console.log("Booting app", userInput);
  return eval(userInput);
}
`,
  },
  {
    path: "src/api/client.ts",
    content: `export async function loadData() {
  const response = await fetch("/api/data");
  return response.json();
}
`,
  },
  {
    path: "package.json",
    content: `{
  "name": "demo-repo",
  "dependencies": {
    "request": "^2.88.0"
  }
}
`,
  },
];

