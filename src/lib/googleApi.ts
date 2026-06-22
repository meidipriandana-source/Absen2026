import { AttendanceRecord } from "../types";

// Constant for the name of the database spreadsheet
export const SPREADSHEET_NAME = "Database Absensi Karyawan";

// User-provided explicit resource details
export const EXPLICIT_SPREADSHEET_ID = "1Fu2MejKfS_Nm7AdqwERfaU22QBanPeYG8fQeILciwpw";
export const EXPLICIT_DRIVE_FOLDER_ID = "1UseBW7ICFFT-cUPD1HC3KrJUhLCVgEgR";

/**
 * Searches Google Drive for a file with the given name and mimeType.
 * Returns the file ID if found, otherwise null.
 */
export async function findSpreadsheet(accessToken: string): Promise<string | null> {
  const query = `name='${SPREADSHEET_NAME}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)`;

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("Error finding spreadsheet in Drive:", errorText);
      return null;
    }

    const data = await res.json();
    if (data.files && data.files.length > 0) {
      return data.files[0].id; // Return the first match
    }
    return null;
  } catch (error) {
    console.error("Network error finding spreadsheet:", error);
    return null;
  }
}

/**
 * Moves a file to a specific Google Drive folder.
 */
export async function moveFileToFolder(accessToken: string, fileId: string, folderId: string): Promise<void> {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?addParents=${encodeURIComponent(folderId)}&fields=id,parents`;
  try {
    const res = await fetch(url, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) {
      const errorText = await res.text();
      console.error(`Warning: Failed to move spreadsheet to designated folder ${folderId}:`, errorText);
    } else {
      console.log(`Successfully placed/copied reference in designated Google Drive folder: ${folderId}`);
    }
  } catch (error) {
    console.error("Network error moving file in Drive:", error);
  }
}

/**
 * Creates a new Google Spreadsheet and initializes its headers.
 * Returns the spreadsheet ID on success.
 */
export async function createSpreadsheet(accessToken: string): Promise<string> {
  // Create spreadsheet metadata
  const createUrl = "https://sheets.googleapis.com/v4/spreadsheets";
  const body = {
    properties: {
      title: SPREADSHEET_NAME,
    },
  };

  const createRes = await fetch(createUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Failed to create spreadsheet: ${errText}`);
  }

  const sheetData = await createRes.json();
  const spreadsheetId = sheetData.spreadsheetId;

  // Move it to the specified Drive folder if available
  if (EXPLICIT_DRIVE_FOLDER_ID) {
    await moveFileToFolder(accessToken, spreadsheetId, EXPLICIT_DRIVE_FOLDER_ID);
  }

  // Now, initialize the column headers in Sheet1
  const initHeadersUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A1:K1?valueInputOption=USER_ENTERED`;
  const headersBody = {
    range: "Sheet1!A1:K1",
    majorDimension: "ROWS",
    values: [
      [
        "Timestamp",
        "Tanggal Kegiatan",
        "Nama Lengkap",
        "NIP/NRPTT",
        "Instansi",
        "Jabatan",
        "Email",
        "Latitude",
        "Longitude",
        "URL Lokasi",
        "Tanda Tangan (SVG)"
      ],
    ],
  };

  const headersRes = await fetch(initHeadersUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(headersBody),
  });

  if (!headersRes.ok) {
    const errText = await headersRes.text();
    console.error("Warning: Failed to initialize column headers in Sheets:", errText);
  }

  return spreadsheetId;
}

/**
 * Helper to retrieve or automatically create the spreadsheet.
 */
export async function getOrCreateSpreadsheet(accessToken: string): Promise<string> {
  // 1. Attempt to check if we can query/write to the user-supplied explicit Google Sheet
  if (EXPLICIT_SPREADSHEET_ID) {
    try {
      const pingUrl = `https://sheets.googleapis.com/v4/spreadsheets/${EXPLICIT_SPREADSHEET_ID}?fields=spreadsheetId`;
      const pingRes = await fetch(pingUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (pingRes.ok) {
        console.log(`Verified access to handpicked Google Sheet ID: ${EXPLICIT_SPREADSHEET_ID}`);
        
        // Check if headers are already initialized in Sheet1
        try {
          const checkUrl = `https://sheets.googleapis.com/v4/spreadsheets/${EXPLICIT_SPREADSHEET_ID}/values/Sheet1!A1:A1`;
          const checkRes = await fetch(checkUrl, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });
          if (checkRes.ok) {
            const checkData = await checkRes.json();
            if (!checkData.values || checkData.values.length === 0) {
              // Create column headers
              const initHeadersUrl = `https://sheets.googleapis.com/v4/spreadsheets/${EXPLICIT_SPREADSHEET_ID}/values/Sheet1!A1:K1?valueInputOption=USER_ENTERED`;
              const headersBody = {
                range: "Sheet1!A1:K1",
                majorDimension: "ROWS",
                values: [
                  [
                    "Timestamp",
                    "Tanggal Kegiatan",
                    "Nama Lengkap",
                    "NIP/NRPTT",
                    "Instansi",
                    "Jabatan",
                    "Email",
                    "Latitude",
                    "Longitude",
                    "URL Lokasi",
                    "Tanda Tangan (SVG)"
                  ],
                ],
              };
              await fetch(initHeadersUrl, {
                method: "PUT",
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(headersBody),
              });
              console.log("Initialized column headers on handpicked spreadsheet.");
            }
          }
        } catch (hdrErr) {
          console.warn("Could not auto-initialize headers on custom spreadsheet:", hdrErr);
        }
        
        return EXPLICIT_SPREADSHEET_ID;
      } else {
        console.warn(`Handpicked Google Sheet ID ${EXPLICIT_SPREADSHEET_ID} returned status ${pingRes.status}. Reverting to standard flow...`);
      }
    } catch (e) {
      console.warn("Error contacting custom spreadsheet ID, reverting to discovery:", e);
    }
  }

  // 2. Discover or create dynamically
  const existingId = await findSpreadsheet(accessToken);
  if (existingId) {
    return existingId;
  }
  return await createSpreadsheet(accessToken);
}

/**
 * Appends a new attendance record as a row in Sheet1.
 */
export async function appendAttendanceRecord(
  accessToken: string,
  spreadsheetId: string,
  record: AttendanceRecord
): Promise<void> {
  const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A:K:append?valueInputOption=USER_ENTERED`;
  
  const body = {
    range: "Sheet1!A:K",
    majorDimension: "ROWS",
    values: [
      [
        record.timestamp,
        record.tanggalKegiatan,
        record.namaLengkap,
        record.nipNrptt,
        record.instansi,
        record.jabatan,
        record.email,
        record.latitude !== null ? record.latitude : "",
        record.longitude !== null ? record.longitude : "",
        record.urlLokasi,
        record.tandaTangan,
      ],
    ],
  };

  const res = await fetch(appendUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to append attendance record: ${errText}`);
  }
}

/**
 * Fetches all attendance records from the sheet and parses them.
 */
export async function getAttendanceRecords(
  accessToken: string,
  spreadsheetId: string
): Promise<AttendanceRecord[]> {
  const readUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A2:K1000`;

  const res = await fetch(readUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    // If the error indicates Sheet1 doesn't have any rows, it means database is empty
    if (res.status === 400 || errText.includes("range")) {
      return [];
    }
    throw new Error(`Failed to fetch records: ${errText}`);
  }

  const data = await res.json();
  if (!data.values || data.values.length === 0) {
    return [];
  }

  // Parse rows: [timestamp, tanggal, namaLengkap, nipNrptt, instansi, jabatan, email, lat, lng, mapUrl, signature]
  return data.values.map((row: any[]) => {
    // If table values are from the old format with only 8 columns, handle gracefully
    const isOldFormat = row.length <= 8;
    
    if (isOldFormat) {
      const latNum = parseFloat(row[4]);
      const lngNum = parseFloat(row[5]);
      return {
        timestamp: row[0] || "",
        tanggalKegiatan: row[1] || "",
        namaLengkap: row[2] || "",
        nipNrptt: "-",
        instansi: "-",
        jabatan: "-",
        email: row[3] || "",
        latitude: isNaN(latNum) ? null : latNum,
        longitude: isNaN(lngNum) ? null : lngNum,
        urlLokasi: row[6] || "",
        tandaTangan: row[7] || "",
      };
    }

    const latNum = parseFloat(row[7]);
    const lngNum = parseFloat(row[8]);
    return {
      timestamp: row[0] || "",
      tanggalKegiatan: row[1] || "",
      namaLengkap: row[2] || "",
      nipNrptt: row[3] || "",
      instansi: row[4] || "",
      jabatan: row[5] || "",
      email: row[6] || "",
      latitude: isNaN(latNum) ? null : latNum,
      longitude: isNaN(lngNum) ? null : lngNum,
      urlLokasi: row[9] || "",
      tandaTangan: row[10] || "",
    };
  });
}

/**
 * Deletes a row containing the specified timestamp from Google Sheets.
 */
export async function deleteAttendanceRecord(
  accessToken: string,
  spreadsheetId: string,
  timestamp: string
): Promise<void> {
  // First, retrieve current sheet values to locate the correct row index
  const readUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A1:A1000`;

  const res = await fetch(readUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to read spreadsheet for deletion`);
  }

  const data = await res.json();
  if (!data.values || data.values.length === 0) {
    return;
  }

  // Row 1 is header (index 0). Find match:
  const rowIndex = data.values.findIndex((row: any[]) => row[0] === timestamp);
  
  if (rowIndex === -1) {
    console.warn("Timestamp not found in Google Sheets");
    return;
  }

  const deleteUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;

  // Try standard delete with sheetId 0
  const body = {
    requests: [
      {
        deleteDimension: {
          range: {
            sheetId: 0,
            dimension: "ROWS",
            startIndex: rowIndex,
            endIndex: rowIndex + 1
          }
        }
      }
    ]
  };

  const response = await fetch(deleteUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.warn("Deletions fallback because:", errText);
    
    // Attempt dynamic sheetId retrieval if sheetId 0 doesn't work
    const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets(properties(sheetId,title))`;
    const metaRes = await fetch(metaUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (metaRes.ok) {
      const metaData = await metaRes.json();
      const sheet = metaData.sheets?.find(
        (s: any) => s.properties?.title === "Sheet1"
      );
      if (sheet) {
        const dynamicSheetId = sheet.properties.sheetId;
        const fallbackBody = {
          requests: [
            {
              deleteDimension: {
                range: {
                  sheetId: dynamicSheetId,
                  dimension: "ROWS",
                  startIndex: rowIndex,
                  endIndex: rowIndex + 1
                }
              }
            }
          ]
        };
        const fallbackRes = await fetch(deleteUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(fallbackBody),
        });
        if (!fallbackRes.ok) {
          const fbErr = await fallbackRes.text();
          throw new Error(`Failed code deletion: ${fbErr}`);
        }
      } else {
        throw new Error(`Failed to find Sheet1 in spreadsheet metadata`);
      }
    } else {
      throw new Error(`Failed to delete row from Google Sheets: ${errText}`);
    }
  }
}

/**
 * Uploads a generated PDF blob directly to Google Drive.
 */
export async function uploadPdfToDrive(
  accessToken: string,
  pdfBlob: Blob,
  fileName: string,
  parentFolderId?: string
): Promise<string> {
  const metadata: any = {
    name: fileName,
    mimeType: "application/pdf",
  };

  if (parentFolderId) {
    metadata.parents = [parentFolderId];
  }

  const boundary = "314159265358979323846";
  const header = 
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: application/pdf\r\n\r\n`;
    
  const footer = `\r\n--${boundary}--`;

  const multipartBlob = new Blob([
    header,
    pdfBlob,
    footer
  ], { type: `multipart/related; boundary=${boundary}` });

  const url = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink";
  
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: multipartBlob,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gagal mengunggah ke Google Drive: ${errText}`);
  }

  const data = await res.json();
  return data.webViewLink || `https://drive.google.com/file/d/${data.id}/view`;
}

