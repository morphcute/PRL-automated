import { prisma } from "@/lib/prisma";
import { SyncJob } from "@prisma/client";
import { google } from "googleapis";
import { getUserAuth } from "./google";

export async function syncPreRegisteredList(job: SyncJob) {
  console.log(`Starting sync for job ${job.id} (${job.name})`);

  if (!job.userId) {
    throw new Error("Job must belong to a user to run sync");
  }

  if (!job.targetSpreadsheetId) {
    throw new Error("Job missing target spreadsheet ID");
  }

  // Connect to Google Sheets with User Auth
  const authClient = await getUserAuth(job.userId);
  const sheets = google.sheets({ version: "v4", auth: authClient });

  try {
    // 1. Read Source (Responses Sheet)
    // Get spreadsheet to find the first sheet name (assuming data is in first tab)
    const sourceSpreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: job.spreadsheetId,
    });
    
    const sourceSheetName = sourceSpreadsheet.data.sheets?.[0].properties?.title;
    if (!sourceSheetName) throw new Error("Source spreadsheet has no sheets");

    const sourceData = await sheets.spreadsheets.values.get({
      spreadsheetId: job.spreadsheetId,
      range: `'${sourceSheetName}'!A:Z`,
    });

    const rows = sourceData.data.values || [];
    
    // 2. Write to Target (Pre Registered List)
    const targetId = job.targetSpreadsheetId;
    const TAB_NAME = job.sheetName || "Pre Registered List";
    
    // Check if target tab exists in target spreadsheet
    const targetSpreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: targetId,
    });

    const targetSheet = targetSpreadsheet.data.sheets?.find(
      (s) => s.properties?.title === TAB_NAME
    );

    if (targetSheet) {
      // 4a. If exists -> overwrite/fill it
      
      // Clear existing content
      await sheets.spreadsheets.values.clear({
        spreadsheetId: targetId,
        range: `'${TAB_NAME}'!A:Z`,
      });
      
      // Write new data
      if (rows.length > 0) {
        await sheets.spreadsheets.values.update({
          spreadsheetId: targetId,
          range: `'${TAB_NAME}'!A1`,
          valueInputOption: "USER_ENTERED",
          requestBody: { values: rows },
        });
      }
      
      console.log(`Updated existing tab '${TAB_NAME}' in target sheet`);

    } else {
      // 4b. If not exists -> create it -> write
      
      // Create the sheet (tab)
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: targetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: TAB_NAME,
                },
              },
            },
          ],
        },
      });

      // Write new data
      if (rows.length > 0) {
        await sheets.spreadsheets.values.update({
          spreadsheetId: targetId,
          range: `'${TAB_NAME}'!A1`,
          valueInputOption: "USER_ENTERED",
          requestBody: { values: rows },
        });
      }

      console.log(`Created and populated new tab '${TAB_NAME}' in target sheet`);
    }

    return {
      rowsWritten: rows.length,
      success: true,
    };

  } catch (error) {
    console.error("Error syncing to Google Sheets:", error);
    throw error;
  }
}
