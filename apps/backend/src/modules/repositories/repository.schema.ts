import { z } from "zod";

export const sampleFileSchema = z.object({
  path: z.string().trim().min(1).max(255),
  content: z.string().trim().min(1),
});

export const createRepositorySchema = z.object({
  name: z.string().trim().min(2).max(120),
  owner: z.string().trim().min(2).max(120),
  branch: z.string().trim().min(1).max(120).default("main"),
  githubUrl: z.string().trim().url(),
  accessTokenHint: z.string().trim().max(255).optional(),
  description: z.string().trim().max(500).optional(),
  sampleFiles: z.array(sampleFileSchema).max(20).optional(),
});

export const updateRepositorySchema = createRepositorySchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });

export const repositoryIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const importGithubRepositorySchema = z.object({
  githubUrl: z.string().trim().url(),
});
