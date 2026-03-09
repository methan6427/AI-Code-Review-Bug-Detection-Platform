import type { Request, Response } from "express";
import { GithubIntegrationService } from "../../services/github/GithubIntegrationService";
import { badRequest } from "../../utils/http";
import { GithubService, type GithubWebhookPayload } from "./github.service";

const githubService = new GithubService();
const githubIntegrationService = new GithubIntegrationService();

export class GithubController {
  async installUrl(_request: Request, response: Response) {
    return response.json({ url: githubIntegrationService.getAppInstallUrl() });
  }

  async installations(_request: Request, response: Response) {
    const installations = await githubIntegrationService.listInstallations();
    return response.json({ installations });
  }

  async installationRepositories(request: Request, response: Response) {
    const installationId = Number(request.params.installationId);
    if (!Number.isInteger(installationId) || installationId <= 0) {
      throw badRequest("Invalid installation id");
    }

    const repositories = await githubIntegrationService.listInstallationRepositories(installationId);
    return response.json({ repositories });
  }

  async webhook(request: Request, response: Response) {
    const rawBody = request.body;
    if (!Buffer.isBuffer(rawBody)) {
      throw badRequest("GitHub webhook requires a raw request body");
    }

    const eventName = request.header("x-github-event");
    if (!eventName) {
      throw badRequest("Missing GitHub event header");
    }

    githubService.verifyWebhookSignature(request.header("x-hub-signature-256"), rawBody);

    const payload = JSON.parse(rawBody.toString("utf8")) as GithubWebhookPayload;
    const result = await githubService.processWebhookEvent(eventName, request.header("x-github-delivery"), payload);

    return response.status(202).json(result);
  }
}
