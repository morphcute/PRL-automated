import { z } from "zod";

export const RunModeSchema = z.enum(["manual", "scheduled", "both"]);

export const SyncJobSchema = z.object({
  name: z.string().min(1, "Name is required"),
  spreadsheetId: z.string().min(1, "Response Sheet Link is required"),
  targetSpreadsheetName: z.string().min(1, "Target Name is required"),
  isEnabled: z.boolean().default(true),
  
  // Scheduler fields
  intervalMinutes: z.number().int().positive().optional().nullable(),
  startAt: z.string().optional().nullable(), // Receive as string from JSON/Form (datetime-local format)
  endAt: z.string().optional().nullable(),
  
  // New fields
  runMode: RunModeSchema.default("both"),
  cronEnabled: z.boolean().default(true),
  sheetName: z.string().default("Pre Registered List"),
});

export type SyncJobInput = z.infer<typeof SyncJobSchema>;
