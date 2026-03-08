import { z } from "zod";

export const scanIdParamSchema = z.object({
  id: z.string().uuid(),
});

