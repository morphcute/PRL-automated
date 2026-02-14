import { prisma } from "@/lib/prisma";
import { SyncJob } from "@prisma/client";
import { google } from "googleapis";
import { getUserAuth } from "./google";
import { verifyMlbbId } from "./mlbb";

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
      range: `'${sourceSheetName}'!A2:AC`, // Read from row 2 to column AC
    });

    const sourceRows = sourceData.data.values || [];
    
    // Determine Team Size based on Job Type
    // 3v3 = 3 players, 5v5/onsite = 5 players
    const teamSize = job.type === "3v3" ? 3 : 5;
    
    // Transform Data
    // We need to extract groups of columns for each row
    // Group 1: D(3), E(4), F(5), G(6)
    // Group 2: K(10), L(11), M(12), N(13)
    // Group 3: P(15), Q(16), R(17), S(18)
    // Group 4: U(20), V(21), W(22), X(23)
    // Group 5: Z(25), AA(26), AB(27), AC(28)
    
    // Add "Status" header if validation is enabled
    const headers = ["No.", "Players Name", "Players IGN", "# Server", "# UID"];
    if (job.validationEnabled) {
      headers.push("Status");
    }

    const transformedRows: any[][] = [headers];

    const groups = [
      [3, 4, 5, 6],      // Group 1
      [10, 11, 12, 13],  // Group 2
      [15, 16, 17, 18],  // Group 3
      [20, 21, 22, 23],  // Group 4
      [25, 26, 27, 28]   // Group 5
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

    let teamCount = 1;
    // We'll collect ranges to merge: { startRow, endRow } (0-based inclusive/exclusive logic of Sheets API)
    const mergeRanges: { startRow: number, endRow: number }[] = [];

    for (const row of sourceRows) {
      // Check if row has any data in the relevant columns
      let hasAnyData = false;
      for (const grp of groups) {
         if (row[grp[0]] || row[grp[1]] || row[grp[2]] || row[grp[3]]) {
             hasAnyData = true;
             break;
         }
      }
      if (!hasAnyData) continue;

      const startRowIndex = transformedRows.length; // Current row index in target (0-based)

      for (let i = 0; i < teamSize; i++) {
        const [nameIdx, ignIdx, serverIdx, uidIdx] = groups[i];
        
        const name = row[nameIdx];
        const ign = row[ignIdx];
        const server = row[serverIdx];
        const uid = row[uidIdx];

        // First row of the group gets the number
        const noCol = (i === 0) ? teamCount : "";

        let sVal = cleanValue(server);
        let uVal = cleanValue(uid);

        // Auto-correct swapped Server and UID
        // MLBB Server IDs are typically 4-5 digits (short)
        // MLBB UIDs are typically 8-10 digits (long)
        // Condition: If Server looks like a UID (>=7 chars) AND UID looks like a Server (<=6 chars)
        if (sVal.length >= 7 && uVal.length <= 6 && uVal.length > 0) {
           const temp = sVal;
           sVal = uVal;
           uVal = temp;
        }

        let currentIgn = ign ? String(ign).trim() : "";
        let status = "";

        // Verification Logic
        if (job.validationEnabled) {
          if (sVal && uVal) {
             try {
                // Wait for verification (sequential to avoid rate limits, or we could batch)
                // For now, let's do sequential to be safe with the external API
                const result = await verifyMlbbId(uVal, sVal);
                if (result.success && result.ign) {
                   currentIgn = result.ign;
                   status = "Verified";
                } else {
                   status = "Not Found";
                }
             } catch (e) {
                console.error(`Verification failed for ${uVal}|${sVal}`, e);
                status = "Error";
             }
          } else {
             status = ""; // No ID/Server to verify
          }
        }

        const rowData = [
          noCol,
          name ? String(name).trim() : "",
          currentIgn,
          sVal,
          uVal
        ];

        if (job.validationEnabled) {
          rowData.push(status);
        }

        transformedRows.push(rowData);
      }
      
      // Record merge range for the "No." column (Col 0)
      // startRowIndex is the index of the first row we just added
      // We added teamSize rows.
      mergeRanges.push({
          startRow: startRowIndex,
          endRow: startRowIndex + teamSize
      });

      teamCount++;
    }

    const rows = transformedRows;
    
    // 2. Write to Target (Pre Registered List)
    const targetId = job.targetSpreadsheetId;
    const TAB_NAME = job.sheetName || "Pre Registered List";
    let targetSheetId: number | null = null;
    
    // Check if target tab exists in target spreadsheet
    const targetSpreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: targetId,
    });

    const targetSheet = targetSpreadsheet.data.sheets?.find(
      (s) => s.properties?.title === TAB_NAME
    );

    if (targetSheet) {
      targetSheetId = targetSheet.properties?.sheetId || 0;
      
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
      // Create the sheet (tab)
      const createResp = await sheets.spreadsheets.batchUpdate({
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
      
      targetSheetId = createResp.data.replies?.[0].addSheet?.properties?.sheetId || 0;

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

    // 3. Apply Formatting (Borders, Colors, Merging)
    if (targetSheetId !== null && rows.length > 0) {
        const requests: any[] = [];

        // 1. Format Header (Row 0)
        requests.push({
            repeatCell: {
                range: {
                    sheetId: targetSheetId,
                    startRowIndex: 0,
                    endRowIndex: 1,
                    startColumnIndex: 0,
                    endColumnIndex: job.validationEnabled ? 6 : 5
                },
                cell: {
                    userEnteredFormat: {
                        backgroundColor: { red: 0.1, green: 0.3, blue: 0.2 }, // Dark Green
                        textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true, fontSize: 10 },
                        horizontalAlignment: "CENTER",
                        verticalAlignment: "MIDDLE"
                    }
                },
                fields: "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)"
            }
        });

        // 2. Format Data Cells (Borders & Alignment)
        requests.push({
            repeatCell: {
                range: {
                    sheetId: targetSheetId,
                    startRowIndex: 0, // Include header in borders
                    endRowIndex: rows.length,
                    startColumnIndex: 0,
                    endColumnIndex: job.validationEnabled ? 6 : 5
                },
                cell: {
                    userEnteredFormat: {
                        borders: {
                            top: { style: "SOLID" },
                            bottom: { style: "SOLID" },
                            left: { style: "SOLID" },
                            right: { style: "SOLID" }
                        },
                        horizontalAlignment: "CENTER",
                        verticalAlignment: "MIDDLE",
                        wrapStrategy: "WRAP"
                    }
                },
                fields: "userEnteredFormat(borders,horizontalAlignment,verticalAlignment,wrapStrategy)"
            }
        });

        // Conditional Formatting for Status Column (if enabled)
        if (job.validationEnabled) {
             // Green for "Verified"
             requests.push({
                addConditionalFormatRule: {
                    rule: {
                        ranges: [{
                            sheetId: targetSheetId,
                            startRowIndex: 1,
                            endRowIndex: rows.length,
                            startColumnIndex: 5, // Status Column (F)
                            endColumnIndex: 6
                        }],
                        booleanRule: {
                            condition: {
                                type: "TEXT_EQ",
                                values: [{ userEnteredValue: "Verified" }]
                            },
                            format: {
                                backgroundColor: { red: 0.8, green: 1, blue: 0.8 } // Light Green
                            }
                        }
                    },
                    index: 0
                }
             });

             // Red for "Not Found"
             requests.push({
                addConditionalFormatRule: {
                    rule: {
                        ranges: [{
                            sheetId: targetSheetId,
                            startRowIndex: 1,
                            endRowIndex: rows.length,
                            startColumnIndex: 5,
                            endColumnIndex: 6
                        }],
                        booleanRule: {
                            condition: {
                                type: "TEXT_EQ",
                                values: [{ userEnteredValue: "Not Found" }]
                            },
                            format: {
                                backgroundColor: { red: 1, green: 0.8, blue: 0.8 } // Light Red
                            }
                        }
                    },
                    index: 1
                }
             });
        }

        // 3. Merge "No." Columns
        for (const range of mergeRanges) {
            requests.push({
                mergeCells: {
                    range: {
                        sheetId: targetSheetId,
                        startRowIndex: range.startRow,
                        endRowIndex: range.endRow,
                        startColumnIndex: 0,
                        endColumnIndex: 1
                    },
                    mergeType: "MERGE_ALL"
                }
            });
            
            // Add thick bottom border for each team block
             requests.push({
                updateBorders: {
                    range: {
                        sheetId: targetSheetId,
                        startRowIndex: range.endRow - 1, // Last row of the block
                        endRowIndex: range.endRow,
                        startColumnIndex: 0,
                        endColumnIndex: job.validationEnabled ? 6 : 5
                    },
                    bottom: { style: "SOLID_MEDIUM" } // Thicker border to separate teams
                }
            });
        }
        
        // Add thick border around the header
        requests.push({
             updateBorders: {
                range: {
                    sheetId: targetSheetId,
                    startRowIndex: 0,
                    endRowIndex: 1,
                    startColumnIndex: 0,
                    endColumnIndex: job.validationEnabled ? 6 : 5
                },
                bottom: { style: "SOLID_MEDIUM" }
            }
        });
        
        // Resize columns for better visibility
        requests.push({
            updateDimensionProperties: {
                range: {
                    sheetId: targetSheetId,
                    dimension: "COLUMNS",
                    startIndex: 0,
                    endIndex: 1
                },
                properties: { pixelSize: 40 }, // "No." column narrow
                fields: "pixelSize"
            }
        });
        requests.push({
            updateDimensionProperties: {
                range: {
                    sheetId: targetSheetId,
                    dimension: "COLUMNS",
                    startIndex: 1,
                    endIndex: 3
                },
                properties: { pixelSize: 180 }, // Name/IGN wider
                fields: "pixelSize"
            }
        });

        await sheets.spreadsheets.batchUpdate({
            spreadsheetId: targetId,
            requestBody: { requests }
        });
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
