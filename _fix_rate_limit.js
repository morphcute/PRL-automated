const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'lib', 'sync.ts');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Replace Verifier BATCH_SIZE and logic
content = content.replace(
  'const BATCH_SIZE = 10;\n       \n       // Process queue\n       for (let i = 0; i < verifierQueue.length; i += BATCH_SIZE) {\n          const batch = verifierQueue.slice(i, i + BATCH_SIZE);\n          \n          await Promise.all(batch.map(async (item) => {\n             let status = "";\n             let finalIgn = item.ign;\n             \n             if (item.uid && item.server) {\n                try {\n                   const result = await verifyMlbbId(item.uid, item.server);\n                   if (result.success && result.ign) {\n                      finalIgn = result.ign;\n                      status = "Verified";\n                   } else {\n                      status = "Not Found";\n                   }\n                } catch (e) {',
  `const BATCH_SIZE = 5;\n       \n       // Process queue\n       for (let i = 0; i < verifierQueue.length; i += BATCH_SIZE) {\n          const batch = verifierQueue.slice(i, i + BATCH_SIZE);\n          \n          await Promise.all(batch.map(async (item) => {\n             let status = "";\n             let finalIgn = item.ign;\n             \n             if (item.uid && item.server) {\n                try {\n                   const result = await verifyMlbbId(item.uid, item.server);\n                   if (result.success && result.ign) {\n                      finalIgn = result.ign;\n                      status = "Verified";\n                   } else if (result.error === "Player not found") {\n                      status = "Not Found";\n                   } else {\n                      status = "Error: API Timeout";\n                   }\n                } catch (e) {`
);

// Add delay for Verifier Mode
content = content.replace(
  'completedCount += batch.length;\n          const progress = 10 + Math.floor((completedCount / totalToVerify) * 80);\n          await updateProgress(progress, `Verifying IDs: ${completedCount}/${totalToVerify}`);\n       }',
  `completedCount += batch.length;\n          const progress = 10 + Math.floor((completedCount / totalToVerify) * 80);\n          await updateProgress(progress, \`Verifying IDs: \${completedCount}/\${totalToVerify}\`);\n          await new Promise(r => setTimeout(r, 600)); // Rate limit prevention\n       }`
);

// 2. Replace Standard Sync BATCH_SIZE and logic
content = content.replace(
  'const BATCH_SIZE = 10; // 10 requests at a time\n    const verificationResults = new Map<string, { ign?: string, status: string }>();\n    \n    if (verificationQueue.length > 0) {\n       let completedCount = 0;\n       const totalToVerify = verificationQueue.length;\n\n       for (let i = 0; i < verificationQueue.length; i += BATCH_SIZE) {\n          const batch = verificationQueue.slice(i, i + BATCH_SIZE);\n          \n          // Run batch in parallel\n          await Promise.all(batch.map(async (item) => {\n             const key = `${item.rowIndex}-${item.colIndex}`;\n             try {\n                const result = await verifyMlbbId(item.uVal, item.sVal);\n                if (result.success && result.ign) {\n                   verificationResults.set(key, { ign: result.ign, status: "Verified" });\n                } else {\n                   verificationResults.set(key, { status: "Not Found" });\n                }\n             } catch (e) {',
  `const BATCH_SIZE = 5; // 5 requests at a time\n    const verificationResults = new Map<string, { ign?: string, status: string }>();\n    \n    if (verificationQueue.length > 0) {\n       let completedCount = 0;\n       const totalToVerify = verificationQueue.length;\n\n       for (let i = 0; i < verificationQueue.length; i += BATCH_SIZE) {\n          const batch = verificationQueue.slice(i, i + BATCH_SIZE);\n          \n          // Run batch in parallel\n          await Promise.all(batch.map(async (item) => {\n             const key = \`\${item.rowIndex}-\${item.colIndex}\`;\n             try {\n                const result = await verifyMlbbId(item.uVal, item.sVal);\n                if (result.success && result.ign) {\n                   verificationResults.set(key, { ign: result.ign, status: "Verified" });\n                } else if (result.error === "Player not found") {\n                   verificationResults.set(key, { status: "Not Found" });\n                } else {\n                   verificationResults.set(key, { status: "Error: API Timeout" });\n                }\n             } catch (e) {`
);

// Add delay for Standard Mode
content = content.replace(
  'completedCount += batch.length;\n          // Update progress based on verification (first 50% of progress bar)\n          const progress = Math.floor((completedCount / totalToVerify) * 50);\n          await updateProgress(progress, `Verifying IDs: ${completedCount}/${totalToVerify}`);\n       }',
  `completedCount += batch.length;\n          // Update progress based on verification (first 50% of progress bar)\n          const progress = Math.floor((completedCount / totalToVerify) * 50);\n          await updateProgress(progress, \`Verifying IDs: \${completedCount}/\${totalToVerify}\`);\n          await new Promise(r => setTimeout(r, 600)); // Rate limit prevention\n       }`
);

// 3. Add Number Format for Column A
const numberFormatSnippet = `
        // Force Column A to PLAIN TEXT so Google Sheets doesn't turn '1' into '12/31/1899'
        requests.push({
            repeatCell: {
                range: { sheetId: targetSheetId, startRowIndex: 1, endRowIndex: rows.length, startColumnIndex: 0, endColumnIndex: 1 },
                cell: { userEnteredFormat: { numberFormat: { type: "TEXT" } } },
                fields: "userEnteredFormat.numberFormat"
            }
        });
        
        // 4. Merge "No." Columns + team separators`;

content = content.replace('// 4. Merge "No." Columns + team separators', numberFormatSnippet);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Success');
