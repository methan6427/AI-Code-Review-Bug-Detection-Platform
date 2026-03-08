import type { Request, Response } from "express";
import { repositoryIdParamSchema } from "../repositories/repository.schema";
import { scanIdParamSchema } from "./scan.schema";
import { ScanService } from "./scan.service";

const scanService = new ScanService();

export class ScanController {
  async createForRepository(request: Request, response: Response) {
    const params = repositoryIdParamSchema.parse(request.params);
    const scan = await scanService.createScan(request.auth!.user.id, params.id);
    return response.status(202).json({ scan });
  }

  async list(request: Request, response: Response) {
    const scans = await scanService.listByUser(request.auth!.user.id);
    return response.json({ scans });
  }

  async detail(request: Request, response: Response) {
    const params = scanIdParamSchema.parse(request.params);
    const detail = await scanService.getDetail(request.auth!.user.id, params.id);
    return response.json(detail);
  }
}

