import type { Request, Response } from "express";
import { createRepositorySchema, repositoryIdParamSchema, updateRepositorySchema } from "./repository.schema";
import { RepositoryService } from "./repository.service";

const repositoryService = new RepositoryService();

export class RepositoryController {
  async list(request: Request, response: Response) {
    const repositories = await repositoryService.listByUser(request.auth!.user.id);
    return response.json({ repositories });
  }

  async create(request: Request, response: Response) {
    const input = createRepositorySchema.parse(request.body);
    const repository = await repositoryService.create(request.auth!.user.id, input);
    return response.status(201).json({ repository });
  }

  async detail(request: Request, response: Response) {
    const params = repositoryIdParamSchema.parse(request.params);
    const detail = await repositoryService.getRepositoryDetail(request.auth!.user.id, params.id);
    return response.json(detail);
  }

  async update(request: Request, response: Response) {
    const params = repositoryIdParamSchema.parse(request.params);
    const input = updateRepositorySchema.parse(request.body);
    const repository = await repositoryService.update(request.auth!.user.id, params.id, input);
    return response.json({ repository });
  }

  async remove(request: Request, response: Response) {
    const params = repositoryIdParamSchema.parse(request.params);
    const result = await repositoryService.remove(request.auth!.user.id, params.id);
    return response.json(result);
  }
}
