import type { CreateRepositoryRequest, SampleFile, UpdateRepositoryRequest } from "@ai-review/shared";

export const defaultRepositoryFormValues = {
  name: "",
  owner: "",
  branch: "main",
  githubUrl: "",
  accessTokenHint: "",
  description: "",
  applicationCode: `export function boot(input: string) {
  console.log('input', input);
  return eval(input);
}
`,
  packageJson: `{
  "name": "demo-repo",
  "dependencies": {
    "request": "^2.88.0"
  }
}
`,
};

export const buildRepositorySampleFiles = (applicationCode: string, packageJson: string): SampleFile[] => {
  const files: SampleFile[] = [];

  if (applicationCode.trim()) {
    files.push({
      path: "src/index.ts",
      content: applicationCode.trim(),
    });
  }

  if (packageJson.trim()) {
    files.push({
      path: "package.json",
      content: packageJson.trim(),
    });
  }

  return files;
};

export const mapRepositoryFormToCreateRequest = (input: typeof defaultRepositoryFormValues): CreateRepositoryRequest => ({
  name: input.name.trim(),
  owner: input.owner.trim(),
  branch: input.branch.trim(),
  githubUrl: input.githubUrl.trim(),
  accessTokenHint: input.accessTokenHint.trim() || undefined,
  description: input.description.trim() || undefined,
  sampleFiles: buildRepositorySampleFiles(input.applicationCode, input.packageJson),
});

export const parseSampleFilesJson = (value: string): SampleFile[] => {
  const parsed = JSON.parse(value) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error("Sample files must be a JSON array");
  }

  return parsed.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw new Error(`Sample file at index ${index} must be an object`);
    }

    const candidate = item as { path?: unknown; content?: unknown };
    if (typeof candidate.path !== "string" || !candidate.path.trim()) {
      throw new Error(`Sample file at index ${index} is missing a valid path`);
    }
    if (typeof candidate.content !== "string" || !candidate.content.trim()) {
      throw new Error(`Sample file at index ${index} is missing valid content`);
    }

    return {
      path: candidate.path.trim(),
      content: candidate.content,
    };
  });
};

export const stringifySampleFiles = (files: SampleFile[]) => JSON.stringify(files, null, 2);

export const mapRepositoryFormToUpdateRequest = (input: {
  name: string;
  owner: string;
  branch: string;
  githubUrl: string;
  accessTokenHint: string;
  description: string;
  sampleFilesJson: string;
}): UpdateRepositoryRequest => ({
  name: input.name.trim(),
  owner: input.owner.trim(),
  branch: input.branch.trim(),
  githubUrl: input.githubUrl.trim(),
  accessTokenHint: input.accessTokenHint.trim() || undefined,
  description: input.description.trim() || undefined,
  sampleFiles: parseSampleFilesJson(input.sampleFilesJson),
});

export const validateRepositoryForm = (input: {
  name: string;
  owner: string;
  branch: string;
  githubUrl: string;
  description: string;
  sampleFiles?: SampleFile[];
}) => {
  if (input.name.trim().length < 2) {
    return "Repository name must be at least 2 characters";
  }
  if (input.owner.trim().length < 2) {
    return "Owner must be at least 2 characters";
  }
  if (!input.branch.trim()) {
    return "Branch is required";
  }
  if (!/^https?:\/\/.+/i.test(input.githubUrl.trim())) {
    return "GitHub URL must be a valid http or https URL";
  }
  if (input.description.trim().length > 500) {
    return "Description must be 500 characters or fewer";
  }
  if (input.sampleFiles && input.sampleFiles.length > 20) {
    return "A maximum of 20 sample files is allowed";
  }

  return null;
};
