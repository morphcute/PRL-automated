import { prisma } from "@/lib/prisma";
import { SyncJob } from "@prisma/client";
import { google } from "googleapis";
import { getUserAuth } from "./google";
import { verifyMlbbId } from "./mlbb";

export async function syncPreRegisteredList(job: SyncJob, runId?: string) {
  console.log(`Starting sync for job ${job.id} (${job.name})`);

  // Helper to update progress
  const updateProgress = async (percentage: number, message?: string) => {
    if (runId) {
      try {
        await prisma.syncRun.update({
          where: { id: runId },
          data: { 
            progress: Math.min(Math.max(percentage, 0), 100),
            progressMessage: message 
          }
        });
      } catch (e) {
        console.error("Failed to update progress:", e);
      }
    }
  };

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
    await updateProgress(5, "Reading source data...");
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
    // 3v3 = 3 players, 5v5/onsite/verifier = 5 players
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

    // 5v5/3v3 Online Mappings (Tighter Gap)
    // Group 1: D(3), E(4), F(5), G(6)
    // Group 2: J(9), K(10), L(11), M(12)
    // Group 3: O(14), P(15), Q(16), R(17)
    // Group 4: T(19), U(20), V(21), W(22)
    // Group 5: Y(24), Z(25), AA(26), AB(27)
    const groupsOnline = [
      [3, 4, 5, 6],    // Group 1
      [9, 10, 11, 12], // Group 2
      [14, 15, 16, 17],// Group 3
      [19, 20, 21, 22],// Group 4
      [24, 25, 26, 27] // Group 5
    ];

    // Onsite Mappings (Wider Gap)
    // Group 1: D(3), E(4), F(5), G(6)
    // Group 2: K(10), L(11), M(12), N(13)
    // Group 3: P(15), Q(16), R(17), S(18)
    // Group 4: U(20), V(21), W(22), X(23)
    // Group 5: Z(25), AA(26), AB(27), AC(28)
    const groupsOnsite = [
      [3, 4, 5, 6],      // Group 1
      [10, 11, 12, 13],  // Group 2
      [15, 16, 17, 18],  // Group 3
      [20, 21, 22, 23],  // Group 4
      [25, 26, 27, 28]   // Group 5
    ];

    // Select mapping based on job type
    // 5v5, 3v3 -> Use Online Mapping
    // Onsite -> Use Onsite Mapping
    const groups = (job.type === "onsite") ? groupsOnsite : groupsOnline;

    const cleanValue = (val: any) => {
      if (!val) return "";
      let strVal = String(val).trim();
      // Remove leading dash (equivalent to REGEXREPLACE(..., "^-", ""))
      if (strVal.startsWith("-")) {
        strVal = strVal.substring(1);
      }
      return strVal;
    };

    // --- Special Handling for Verifier Mode ---
    // If job.type === "verifier", we skip the standard team transformation
    // and process the sheet exactly as requested: 
    // Read C(IGN), D(Server), E(ID) -> Write Status to F
    
    if (job.type === "verifier") {
       await updateProgress(10, "Starting Verifier Mode...");
       
       // In verifier mode, we assume the user provided a spreadsheet with data already populated.
       // The requirement is to read specific columns and update the status column IN PLACE.
       // However, this function is designed to READ from Source and WRITE to Target.
       // To adapt this without breaking the "Source -> Target" model:
       // 1. We will read the source sheet (C, D, E).
       // 2. We will verify the IDs.
       // 3. We will write the result (IGN + Status) back to the TARGET sheet in a similar format.
       
       // BUT, the user prompt implies updating the sheet in place ("checking this columns and adding the result... in Column F").
       // Since this is a "Sync" job that defines a Source and Target, let's stick to the pattern:
       // Read Source -> Verify -> Write to Target (copying the structure).
       
       // Source Columns based on user description:
       // Col A (Index 0) = No.
       // Col B (Index 1) = Players Name
       // Col C (Index 2) = IGN
       // Col D (Index 3) = Server
       // Col E (Index 4) = User ID
       
       const verifierRows: any[][] = [["No.", "Players Name", "Players IGN", "# Server", "# UID", "Status"]];
       
       // Batch Verification Logic for Verifier Mode
       const verifierQueue: { no: string, name: string, ign: string, server: string, uid: string, rowIndex: number }[] = [];
       
       for (let r = 0; r < sourceRows.length; r++) {
          const row = sourceRows[r];
          // Ensure we don't access out of bounds
          const no = cleanValue(row[0]);     // Col A
          const name = cleanValue(row[1]);   // Col B
          const ign = cleanValue(row[2]);    // Col C
          const server = cleanValue(row[3]); // Col D
          const uid = cleanValue(row[4]);    // Col E
          
          if (uid && server) {
             verifierQueue.push({ no, name, ign, server, uid, rowIndex: r });
          } else if (ign || server || uid || name || no) {
             // Keep incomplete rows to maintain structure if they have *some* data
             verifierQueue.push({ no, name, ign, server, uid, rowIndex: r });
          } else {
             // Keep empty rows to maintain structure
             verifierQueue.push({ no: "", name: "", ign: "", server: "", uid: "", rowIndex: r });
          }
       }
       
       const totalToVerify = verifierQueue.length;
       let completedCount = 0;
       const BATCH_SIZE = 10;
       
       // Process queue
       for (let i = 0; i < verifierQueue.length; i += BATCH_SIZE) {
          const batch = verifierQueue.slice(i, i + BATCH_SIZE);
          
          await Promise.all(batch.map(async (item) => {
             let status = "";
             let finalIgn = item.ign;
             
             if (item.uid && item.server) {
                try {
                   const result = await verifyMlbbId(item.uid, item.server);
                   if (result.success && result.ign) {
                      finalIgn = result.ign;
                      status = "Verified";
                   } else {
                      status = "Not Found";
                   }
                } catch (e) {
                   console.error(`Verifier error for ${item.uid}`, e);
                   // Don't fail the whole job, just mark this row
                   status = "Error"; 
                }
             }
             
             // Store result in the row: A, B, C, D, E, F
             verifierRows.push([item.no, item.name, finalIgn, item.server, item.uid, status]);
          }));
          
          completedCount += batch.length;
          const progress = 10 + Math.floor((completedCount / totalToVerify) * 80);
          await updateProgress(progress, `Verifying IDs: ${completedCount}/${totalToVerify}`);
       }
       
       // Write to Target
       await updateProgress(95, "Writing results...");
       
       // Reuse the existing sheet writing logic, but with our new `verifierRows`
       // We need to bypass the standard loop below.
       
       // ... existing sheet creation/clearing logic ...
       const targetId = job.targetSpreadsheetId;
       const TAB_NAME = job.sheetName || "Pre Registered List";
       let targetSheetId: number | null = null;
       let reusedExistingTab = false;

       const targetSpreadsheet = await sheets.spreadsheets.get({ spreadsheetId: targetId });
       let targetSheet = targetSpreadsheet.data.sheets?.find(s => s.properties?.title === TAB_NAME);
       
       // Sheet1 renaming logic (reused)
       if (!targetSheet) {
          const sheet1 = targetSpreadsheet.data.sheets?.find(s => s.properties?.title === "Sheet1");
          if (sheet1) {
             await sheets.spreadsheets.batchUpdate({
                spreadsheetId: targetId,
                requestBody: {
                   requests: [{
                      updateSheetProperties: {
                         properties: { sheetId: sheet1.properties?.sheetId, title: TAB_NAME },
                         fields: "title"
                      }
                   }]
                }
             });
             targetSheetId = sheet1.properties?.sheetId || 0;
             reusedExistingTab = true;
          }
       } else {
          targetSheetId = targetSheet.properties?.sheetId || 0;
          reusedExistingTab = true;
       }
       
       if (targetSheetId === null && !targetSheet) {
          const createResp = await sheets.spreadsheets.batchUpdate({
             spreadsheetId: targetId,
             requestBody: { requests: [{ addSheet: { properties: { title: TAB_NAME } } }] }
          });
          targetSheetId = createResp.data.replies?.[0].addSheet?.properties?.sheetId || 0;
       }
       
        // Write Verifier Data
        if (targetSheetId !== null) {
          const valuesToWrite = reusedExistingTab ? verifierRows.slice(1) : verifierRows;
          const startCell = reusedExistingTab ? "A2" : "A1";

          // Keep manual template content intact for reused tabs.
          if (!reusedExistingTab) {
             await sheets.spreadsheets.values.clear({ spreadsheetId: targetId, range: `'${TAB_NAME}'!A:F` });
          }
          if (valuesToWrite.length > 0) {
             await sheets.spreadsheets.values.update({
                spreadsheetId: targetId,
                range: `'${TAB_NAME}'!${startCell}`,
                valueInputOption: "USER_ENTERED",
                requestBody: { values: valuesToWrite },
             });
          }
          
          // Apply Formatting for Verifier
          if (!reusedExistingTab) {
             const requests: any[] = [];
             // Header
             requests.push({
                repeatCell: {
                   range: { sheetId: targetSheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 4 },
                   cell: { userEnteredFormat: { backgroundColor: { red: 0.1, green: 0.3, blue: 0.2 }, textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true } } },
                   fields: "userEnteredFormat(backgroundColor,textFormat)"
                }
             });
             // Conditional Formatting
             requests.push({
                addConditionalFormatRule: {
                   rule: {
                      ranges: [{ sheetId: targetSheetId, startRowIndex: 1, endRowIndex: verifierRows.length, startColumnIndex: 3, endColumnIndex: 4 }],
                      booleanRule: { condition: { type: "TEXT_EQ", values: [{ userEnteredValue: "Verified" }] }, format: { backgroundColor: { red: 0.8, green: 1, blue: 0.8 } } }
                   }, index: 0
                }
             });
             requests.push({
                addConditionalFormatRule: {
                   rule: {
                      ranges: [{ sheetId: targetSheetId, startRowIndex: 1, endRowIndex: verifierRows.length, startColumnIndex: 3, endColumnIndex: 4 }],
                      booleanRule: { condition: { type: "TEXT_EQ", values: [{ userEnteredValue: "Not Found" }] }, format: { backgroundColor: { red: 1, green: 0.8, blue: 0.8 } } }
                   }, index: 1
                }
             });
             
             await sheets.spreadsheets.batchUpdate({ spreadsheetId: targetId, requestBody: { requests } });
          }
       }
       
       return { rowsWritten: verifierRows.length, success: true };
    }
    // --- End Verifier Mode Handling ---

    let teamCount = 1;
    // We'll collect ranges to merge: { startRow, endRow } (0-based inclusive/exclusive logic of Sheets API)
    const mergeRanges: { startRow: number, endRow: number }[] = [];
    
    // Total rows to process
    const totalSourceRows = sourceRows.length;
    let processedRows = 0;

    // --- Optimization: Batch Verification ---
    // Identify all IDs that need verification upfront
    const verificationQueue: { uVal: string, sVal: string, rowIndex: number, colIndex: number }[] = [];

    // Pre-scan loop to build verification queue
    // This allows us to run verifications in parallel later
    if (job.validationEnabled) {
       await updateProgress(5, "Scanning for IDs to verify...");
       for (let r = 0; r < sourceRows.length; r++) {
          const row = sourceRows[r];
          // Check for data
          let hasAnyData = false;
          for (const grp of groups) {
             if (row[grp[0]] || row[grp[1]] || row[grp[2]] || row[grp[3]]) {
                 hasAnyData = true;
                 break;
             }
          }
          if (!hasAnyData) continue;

          for (let i = 0; i < teamSize; i++) {
             const [nameIdx, ignIdx, serverIdx, uidIdx] = groups[i];
             const server = row[serverIdx];
             const uid = row[uidIdx];
             
             let sVal = cleanValue(server);
             let uVal = cleanValue(uid);

             // Auto-correct swapped
             if (sVal.length >= 7 && uVal.length <= 6 && uVal.length > 0) {
                const temp = sVal;
                sVal = uVal;
                uVal = temp;
             }

             // Only verify if both ID and Server are present
             if (sVal && uVal) {
                verificationQueue.push({ uVal, sVal, rowIndex: r, colIndex: i });
             }
          }
       }
    }

    // Process Verification Queue in Batches (Parallel)
    const BATCH_SIZE = 10; // 10 requests at a time
    const verificationResults = new Map<string, { ign?: string, status: string }>();
    
    if (verificationQueue.length > 0) {
       let completedCount = 0;
       const totalToVerify = verificationQueue.length;

       for (let i = 0; i < verificationQueue.length; i += BATCH_SIZE) {
          const batch = verificationQueue.slice(i, i + BATCH_SIZE);
          
          // Run batch in parallel
          await Promise.all(batch.map(async (item) => {
             const key = `${item.rowIndex}-${item.colIndex}`;
             try {
                const result = await verifyMlbbId(item.uVal, item.sVal);
                if (result.success && result.ign) {
                   verificationResults.set(key, { ign: result.ign, status: "Verified" });
                } else {
                   verificationResults.set(key, { status: "Not Found" });
                }
             } catch (e) {
                console.error(`Verification error for ${item.uVal}`, e);
                verificationResults.set(key, { status: "Error" });
             }
          }));

          completedCount += batch.length;
          // Update progress based on verification (first 50% of progress bar)
          const progress = Math.floor((completedCount / totalToVerify) * 50);
          await updateProgress(progress, `Verifying IDs: ${completedCount}/${totalToVerify}`);
       }
    } else {
       await updateProgress(50, "No IDs to verify, proceeding..."); // Jump to 50% if no verification needed
    }

    // --- End Optimization ---

    for (let r = 0; r < sourceRows.length; r++) {
      const row = sourceRows[r];
      processedRows++;
      
      // Update Progress (remaining 50%)
      if (totalSourceRows > 0 && processedRows % Math.max(1, Math.floor(totalSourceRows / 10)) === 0) {
        const percentage = 50 + Math.floor((processedRows / totalSourceRows) * 40);
        await updateProgress(percentage, `Processing row ${processedRows}/${totalSourceRows}`);
      }

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
        if (sVal.length >= 7 && uVal.length <= 6 && uVal.length > 0) {
           const temp = sVal;
           sVal = uVal;
           uVal = temp;
        }

        let currentIgn = ign ? String(ign).trim() : "";
        let status = "";

        // Retrieve pre-verified result
        if (job.validationEnabled) {
           const key = `${r}-${i}`;
           const result = verificationResults.get(key);
           if (result) {
              status = result.status;
              if (result.ign) {
                 currentIgn = result.ign;
              }
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
    
    await updateProgress(90, "Writing to spreadsheet...");

    // 2. Write to Target (Pre Registered List)
    const targetId = job.targetSpreadsheetId;
    const TAB_NAME = job.sheetName || "Pre Registered List";
    let targetSheetId: number | null = null;
    let reusedExistingTab = false;
    
    // Check if target tab exists in target spreadsheet
    const targetSpreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: targetId,
    });

    // Check if TAB_NAME exists
    let targetSheet = targetSpreadsheet.data.sheets?.find(
      (s) => s.properties?.title === TAB_NAME
    );

    // Special Handling: If "Sheet1" exists and it's the only sheet (or we want to reuse it), rename it to TAB_NAME
    if (!targetSheet) {
       const sheet1 = targetSpreadsheet.data.sheets?.find(
          (s) => s.properties?.title === "Sheet1"
       );
       
       if (sheet1) {
          // Rename Sheet1 to TAB_NAME
          await sheets.spreadsheets.batchUpdate({
             spreadsheetId: targetId,
             requestBody: {
                requests: [{
                   updateSheetProperties: {
                      properties: {
                         sheetId: sheet1.properties?.sheetId,
                         title: TAB_NAME
                      },
                      fields: "title"
                   }
                }]
             }
          });
          targetSheetId = sheet1.properties?.sheetId || 0;
          reusedExistingTab = true;
          console.log(`Renamed 'Sheet1' to '${TAB_NAME}'`);
       }
    } else {
       targetSheetId = targetSheet.properties?.sheetId || 0;
       reusedExistingTab = true;
    }

    const outputEndColumn = job.validationEnabled ? "F" : "E";

    if (targetSheetId !== null) {
      // Keep manual template content intact for reused tabs.
      if (!reusedExistingTab) {
        await sheets.spreadsheets.values.clear({
          spreadsheetId: targetId,
          range: `'${TAB_NAME}'!A:${outputEndColumn}`,
        });
      }
      
      const valuesToWrite = reusedExistingTab ? rows.slice(1) : rows;
      const startCell = reusedExistingTab ? "A2" : "A1";

      // Write new data
      if (valuesToWrite.length > 0) {
        await sheets.spreadsheets.values.update({
          spreadsheetId: targetId,
          range: `'${TAB_NAME}'!${startCell}`,
          valueInputOption: "USER_ENTERED",
          requestBody: { values: valuesToWrite },
        });
      }
      console.log(`Updated tab '${TAB_NAME}'`);

    } else {
      // Create the sheet (tab) if Sheet1 wasn't found/renamed and target doesn't exist
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
      console.log(`Created and populated new tab '${TAB_NAME}'`);
    }

    // 3. Apply Formatting (Borders, Colors, Merging)
    if (targetSheetId !== null && rows.length > 0 && !reusedExistingTab) {
        await updateProgress(95, "Applying formatting...");
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
