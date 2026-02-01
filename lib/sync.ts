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
      range: `'${sourceSheetName}'!A2:AB`, // Read from row 2 to column AB
    });

    const sourceRows = sourceData.data.values || [];
    
    // Transform Data
    // We need to extract 5 groups of columns for each row
    // Group 1: D(3), E(4), F(5), G(6)
    // Group 2: J(9), K(10), L(11), M(12)
    // Group 3: O(14), P(15), Q(16), R(17)
    // Group 4: T(19), U(20), V(21), W(22)
    // Group 5: Y(24), Z(25), AA(26), AB(27)
    
    const transformedRows: any[][] = [
      ["Players Name", "Players IGN", "# Server", "# UID"] // Headers
    ];

    const groups = [
      [3, 4, 5, 6],    // Group 1
      [9, 10, 11, 12], // Group 2
      [14, 15, 16, 17],// Group 3
      [19, 20, 21, 22],// Group 4
      [24, 25, 26, 27] // Group 5
    ];

    const cleanValue = (val: any) => {
      if (!val) return "";
      let strVal = String(val).trim();
      // Remove leading dash (equivalent to REGEXREPLACE(..., "^-", ""))
      if (strVal.startsWith("-")) {
        strVal = strVal.substring(1);
      }
      return strVal;
    };

    for (const row of sourceRows) {
      for (const [nameIdx, ignIdx, serverIdx, uidIdx] of groups) {
        // Ensure the row has enough columns (pad with undefined if needed)
        const name = row[nameIdx];
        const ign = row[ignIdx];
        const server = row[serverIdx];
        const uid = row[uidIdx];

        // Skip if all fields are empty
        if (!name && !ign && !server && !uid) continue;

        transformedRows.push([
          name ? String(name).trim() : "",
          ign ? String(ign).trim() : "",
          cleanValue(server),
          cleanValue(uid)
        ]);
      }
    }

    const rows = transformedRows;
    
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
