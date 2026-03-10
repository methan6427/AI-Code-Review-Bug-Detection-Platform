import type { ScanEvent } from "@ai-review/shared";
import { supabaseAdmin } from "../../services/supabase/client";
import type { ScanEventRow } from "../../types/database";
import { mapScanEvent } from "../../utils/mappers";
import { badRequest } from "../../utils/http";

type ScanEventInput = {
  level: ScanEvent["level"];
  stage: string;
  message: string;
  metadata?: Record<string, unknown>;
};

export class ScanEventService {
  async record(scanId: string, input: ScanEventInput) {
    const { error } = await supabaseAdmin.from("scan_events").insert({
      scan_id: scanId,
      level: input.level,
      stage: input.stage,
      message: input.message,
      metadata: input.metadata ?? {},
    });

    if (error) {
      throw badRequest(error.message);
    }
  }

  async listByScan(scanId: string) {
    const { data, error } = await supabaseAdmin
      .from("scan_events")
      .select("*")
      .eq("scan_id", scanId)
      .order("created_at", { ascending: true })
      .returns<ScanEventRow[]>();

    if (error) {
      throw badRequest(error.message);
    }

    return (data ?? []).map(mapScanEvent);
  }
}
