import React, { useState } from "react";
import {
  Calendar,
  Search,
  ExternalLink,
  MapPin,
  Clock,
  UserCheck,
  Users,
  Grid,
  FileSpreadsheet,
  Download,
  Trash2,
  AlertTriangle,
  X,
  Loader2,
  CheckCircle2,
  CloudUpload,
} from "lucide-react";
import { AttendanceRecord } from "../types";
import { jsPDF } from "jspdf";
import { uploadPdfToDrive, EXPLICIT_DRIVE_FOLDER_ID } from "../lib/googleApi";

interface DashboardProps {
  records: AttendanceRecord[];
  spreadsheetId: string | null;
  accessToken: string | null;
  onClearHistory?: () => void;
  onDeleteRecord?: (timestamp: string) => void;
}

export default function Dashboard({
  records,
  spreadsheetId,
  accessToken,
  onClearHistory,
  onDeleteRecord,
}: DashboardProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [drivePdfUrl, setDrivePdfUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<{
    type: "single" | "all";
    timestamp?: string;
    name?: string;
  } | null>(null);

  // Filter records for the selected activity date
  const recordsForDate = records.filter(
    (record) => record.tanggalKegiatan === selectedDate
  );

  // Search filter
  const filteredRecords = recordsForDate.filter(
    (record) =>
      (record.namaLengkap || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (record.nipNrptt || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (record.instansi || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (record.jabatan || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Metric calculation
  const totalSubmissions = recordsForDate.length;
  const uniqueEmployeesCount = new Set(
    recordsForDate.map((r) => r.namaLengkap.trim().toLowerCase())
  ).size;

  // Format historical timestamp
  const formatTime = (tsStr: string) => {
    try {
      const dateObj = new Date(tsStr);
      if (isNaN(dateObj.getTime())) {
        return tsStr.split(" ")[1] || "08:12";
      }
      return dateObj.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {
      return "08:12";
    }
  };

  // Extract Initials for Avatars
  const getInitials = (fullName: string) => {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 0 || !parts[0]) return "ST";
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  // Google Sheet database Link
  const gspreadsheetUrl = spreadsheetId
    ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
    : null;

  // Generate & Download PDF report
  const downloadPDF = async () => {
    if (recordsForDate.length === 0) return;

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const loadImage = (url: string): Promise<HTMLImageElement> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = (err) => reject(err);
        img.src = url;
      });
    };

    // Try to load Kalimantan Utara Logo
    let logoXOffset = 0;
    try {
      const logoUrl = "https://images.weserv.nl/?url=https://i.ibb.co/QFrfgSZJ/LOGO-KALIMANTAN-UTARA-koleksilogo-com-2-1.png&output=png";
      const img = await loadImage(logoUrl);
      doc.addImage(img, "PNG", 15, 6.5, 20, 25);
      logoXOffset = 25;
    } catch (e) {
      console.warn("Failed to load PDF logo:", e);
    }

    // Elegant colors
    const primaryColor = [79, 70, 229]; // Indigo-600
    const textColor = [30, 41, 59]; // Slate-800
    const subtextColor = [100, 116, 139]; // Slate-500
    const lightBg = [248, 250, 252]; // Slate-50

    // Header Background Header
    doc.setFillColor(79, 70, 229);
    doc.rect(0, 0, 210, 38, "F");

    // Header Branding Text
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("LAPORAN REKAPITULASI PRESENSI PESERTA", 15 + logoXOffset, 15);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text("RSUD dr H Jusuf SK", 15 + logoXOffset, 22);

    doc.setFontSize(9);
    doc.setTextColor(199, 210, 254);
    doc.text(`Waktu Cetak: ${new Date().toLocaleDateString("id-ID")} - ${new Date().toLocaleTimeString("id-ID")}`, 15 + logoXOffset, 28);

    // Summary Title & Box
    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("SINOPSIS REKAPITULASI HARIAN", 15, 48);

    doc.setFillColor(248, 250, 252);
    doc.rect(15, 52, 180, 22, "F");
    doc.setDrawColor(226, 232, 240);
    doc.rect(15, 52, 180, 22, "D");

    // Left Stat Box: Tanggal
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("TANGGAL REKAP", 22, 59);
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "bold");
    doc.text(selectedDate, 22, 67);

    // Mid Stat Box: Total Presensi
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("TOTAL PRESENSI", 85, 59);
    doc.setFontSize(12);
    doc.setTextColor(79, 70, 229);
    doc.setFont("helvetica", "bold");
    doc.text(`${totalSubmissions} Peserta`, 85, 67);

    // Right Stat Box: Karyawan Unik
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("STAF / KARYAWAN UNIK", 145, 59);
    doc.setFontSize(12);
    doc.setTextColor(180, 83, 9); // Amber-700
    doc.text(`${uniqueEmployeesCount} Orang`, 145, 67);

    // Table Section Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text("DAFTAR DETAIL PRESENSI", 15, 84);

    let currentY = 89;

    // Header columns configuration
    const headers = ["No", "Nama & NIP / NRPTT", "SKPD / Jabatan", "Waktu Absen", "Tanda Tangan"];
    const colPositions = [15, 23, 85, 137, 162];

    const drawTableHeader = (yPos: number) => {
      doc.setFillColor(79, 70, 229);
      doc.rect(15, yPos, 180, 8, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "bold");
      
      headers.forEach((h, i) => {
        doc.text(h, colPositions[i], yPos + 5.5);
      });
    };

    drawTableHeader(currentY);
    currentY += 8;

    for (let idx = 0; idx < recordsForDate.length; idx++) {
      const record = recordsForDate[idx];

      // If table row overflows page bounds
      if (currentY > 260) {
        doc.addPage();
        currentY = 20;
        drawTableHeader(currentY);
        currentY += 8;
      }

      // Alternate background for rows with slightly updated height (16mm)
      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(15, currentY, 180, 16, "F");
      }
      doc.setDrawColor(241, 245, 249);
      doc.rect(15, currentY, 180, 16, "D");

      doc.setTextColor(30, 41, 59);
      doc.setFontSize(8);

      // No column
      doc.setFont("helvetica", "normal");
      doc.text(`${idx + 1}`, colPositions[0], currentY + 9);

      // Name & NIP/NRPTT column
      doc.setFont("helvetica", "bold");
      const nameText = record.namaLengkap.length > 28 ? record.namaLengkap.substring(0, 26) + "..." : record.namaLengkap;
      doc.text(nameText, colPositions[1], currentY + 6);
      
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      const nipVal = record.nipNrptt ? `NIP: ${record.nipNrptt}` : `Email: ${record.email}`;
      const nipText = nipVal.length > 28 ? nipVal.substring(0, 26) + "..." : nipVal;
      doc.text(nipText, colPositions[1], currentY + 11.5);

      // Unit/Instansi & Jabatan column
      doc.setTextColor(30, 41, 59);
      const instVal = record.instansi || "-";
      const instText = instVal.length > 25 ? instVal.substring(0, 23) + "..." : instVal;
      doc.text(instText, colPositions[2], currentY + 6);
      
      doc.setTextColor(100, 116, 139);
      const jabVal = record.jabatan || "-";
      const jabText = jabVal.length > 25 ? jabVal.substring(0, 23) + "..." : jabVal;
      doc.text(jabText, colPositions[2], currentY + 11.5);

      // Time Column
      doc.setTextColor(30, 41, 59);
      const jamAbsen = formatTime(record.timestamp);
      doc.text(jamAbsen, colPositions[3], currentY + 9);

      // Signature Rendering Column
      let signatureLoaded = false;
      if (record.tandaTangan) {
        try {
          const svgBase64 = btoa(unescape(encodeURIComponent(record.tandaTangan)));
          const svgUrl = `data:image/svg+xml;base64,${svgBase64}`;
          const sigImg = await loadImage(svgUrl);
          // Drawing signature image perfectly centered in the 5th column
          doc.addImage(sigImg, "PNG", colPositions[4] + 5.5, currentY + 2.5, 22, 11);
          signatureLoaded = true;
        } catch (err) {
          console.error("Failed to render signature for PDF row:", err);
        }
      }

      if (!signatureLoaded) {
        doc.setFont("helvetica", "normal");
        doc.setTextColor(148, 163, 184); // Slate-400
        doc.text("Tidak ada TTD", colPositions[4] + 6, currentY + 9);
      }

      currentY += 16;
    }

    // Save to Google Drive if authorized
    if (accessToken) {
      setIsUploading(true);
      setUploadError(null);
      setDrivePdfUrl(null);
      try {
        const pdfBlob = doc.output("blob");
        const fileName = `Rekap_Absen_${selectedDate}.pdf`;
        const webLink = await uploadPdfToDrive(accessToken, pdfBlob, fileName, EXPLICIT_DRIVE_FOLDER_ID);
        setDrivePdfUrl(webLink);
      } catch (err: any) {
        console.error("Gagal mengunggah PDF ke Google Drive:", err);
        setUploadError(err.message || "Terjadi kesalahan saat mengunggah.");
      } finally {
        setIsUploading(false);
      }
    } else {
      // Local fallback
      doc.save(`Rekap_Absen_${selectedDate}.pdf`);
    }
  };

  return (
    <div className="space-y-6" id="dashboard-recapitulation">
      {/* Date Selector & database links */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-widest text-slate-400 font-extrabold block" htmlFor="dashboard-date-picker">
            Tanggal Rekapitulasi
          </label>
          <input
            id="dashboard-date-picker"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs focus:bg-white focus:border-indigo-600 transition-all outline-none text-slate-800 font-bold font-sans"
          />
        </div>

        {isUploading && (
          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 text-center space-y-3" id="drive-uploading-indicator">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wide">Sedang Mengunggah</h4>
              <p className="text-[10px] text-indigo-600 leading-normal">
                Menyimpan Laporan Rekapitulasi Presensi secara aman di Google Drive...
              </p>
            </div>
          </div>
        )}

        {uploadError && (
          <div className="bg-rose-50 border border-rose-105 rounded-2xl p-4 flex gap-3 text-left" id="drive-upload-error-indicator">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-rose-900 uppercase tracking-wide">Gagal Menyimpan</h4>
              <p className="text-[10px] text-rose-600 leading-normal">{uploadError}</p>
            </div>
          </div>
        )}

        {drivePdfUrl && (
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 relative text-center space-y-3" id="drive-upload-success-indicator">
            <button
              onClick={() => setDrivePdfUrl(null)}
              className="absolute top-3 right-3 text-emerald-400 hover:text-emerald-700 outline-none cursor-pointer"
              title="Tutup"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white mx-auto shadow-xs">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-black text-emerald-950 uppercase tracking-wide">Berakhir Sukses</h4>
              <p className="text-[10px] text-emerald-700 leading-normal">
                Format PDF berhasil diunggah langsung ke Google Drive Anda!
              </p>
            </div>
            <a
              href={drivePdfUrl}
              target="_blank"
              rel="noreferrer"
              referrerPolicy="no-referrer"
              className="w-full inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-widest py-3 px-4 rounded-xl shadow-3xs transition-all active:scale-95 cursor-pointer"
            >
              <span>Buka di Google Drive</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

        {gspreadsheetUrl && (
          <a
            href={gspreadsheetUrl}
            target="_blank"
            rel="noreferrer"
            referrerPolicy="no-referrer"
            className="w-full inline-flex items-center justify-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold py-3 px-4 rounded-xl border border-emerald-150 transition-all cursor-pointer"
            id="link-googlesheets-view"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Buka Google Sheets Utama</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}

        {recordsForDate.length > 0 && !drivePdfUrl && (
          <button
            onClick={downloadPDF}
            disabled={isUploading}
            className="w-full inline-flex items-center justify-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-xs font-bold py-3 px-4 rounded-xl border border-indigo-150 transition-all cursor-pointer shadow-3xs active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            id="btn-download-pdf-recap"
          >
            {accessToken ? (
              <>
                <CloudUpload className="w-4 h-4 text-indigo-600 shrink-0 animate-bounce" />
                <span>Simpan Rekap ke Google Drive</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>Unduh Rekap (PDF)</span>
              </>
            )}
          </button>
        )}

        {records.length > 0 && onClearHistory && (
          <button
            onClick={() => {
              setConfirmDelete({
                type: "all",
              });
            }}
            className="w-full inline-flex items-center justify-center gap-2 bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-bold py-3 px-4 rounded-xl border border-rose-150 transition-all cursor-pointer shadow-3xs active:scale-95 mt-2"
            id="btn-clear-local-history"
          >
            <Trash2 className="w-4 h-4 text-rose-600 shrink-0" />
            <span>Hapus Riwayat Lokal</span>
          </button>
        )}
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Metric 1 - Vibrant Indigo */}
        <div className="bg-indigo-600 rounded-3xl p-5 text-white shadow-xl shadow-indigo-100 relative overflow-hidden flex flex-col justify-between min-h-[110px]">
          <div>
            <h4 className="text-[9px] font-black uppercase tracking-widest text-indigo-200">Total Presensi</h4>
          </div>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-3xl font-black tracking-tight">{totalSubmissions}</span>
            <span className="text-xs text-indigo-200">staf</span>
          </div>
          <div className="absolute right-2 bottom-1 opacity-10">
            <UserCheck className="w-14 h-14" />
          </div>
        </div>

        {/* Metric 2 - Warm Amber */}
        <div className="bg-amber-100 rounded-3xl p-5 border border-amber-200 text-amber-900 shadow-2xs relative overflow-hidden flex flex-col justify-between min-h-[110px]">
          <div>
            <h4 className="text-[9px] font-black uppercase tracking-widest text-amber-700">Karyawan Unik</h4>
          </div>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-3xl font-black tracking-tight text-amber-950">{uniqueEmployeesCount}</span>
            <span className="text-xs text-amber-700">orang</span>
          </div>
          <div className="absolute right-2 bottom-1 opacity-10">
            <Users className="w-14 h-14 text-amber-950" />
          </div>
        </div>
      </div>

      {/* Entry List Segment */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-1">
          <label className="text-[10px] uppercase tracking-widest text-slate-400 font-extrabold block">
            Daftar Kehadiran {totalSubmissions > 0 ? `(${filteredRecords.length})` : ""}
          </label>
          <span className="text-[10px] font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-100 py-1 px-3 rounded-full uppercase tracking-wider">
            {selectedDate}
          </span>
        </div>

        {/* Search Input */}
        {totalSubmissions > 0 && (
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama atau email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-xs focus:border-indigo-600 transition-all outline-none text-slate-800 font-medium"
              id="dashboard-search-staf"
            />
          </div>
        )}

        {/* Items Container */}
        {filteredRecords.length > 0 ? (
          <div className="space-y-3.5">
            {filteredRecords.map((record, index) => (
              <div
                key={index}
                className="bg-white p-4 rounded-3xl border border-slate-200 shadow-2xs space-y-4 transition-all"
              >
                {/* Employee Header */}
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    {/* Visual initials badge / Kalimantan Utara Logo */}
                    <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 shadow-3xs p-0.5 overflow-hidden">
                      <img
                        src="https://i.ibb.co.com/pjb9Mb07/LOGO-KALIMANTAN-UTARA-koleksilogo-com-2-1.png"
                        alt="Logo Kalimantan Utara"
                        className="w-7 h-7 object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-sm leading-tight">{record.namaLengkap}</h4>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">{record.email}</p>
                    </div>
                  </div>
                  
                  {/* Attendance badge status & delete action */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-100 text-emerald-700 py-1 px-2.5 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0">
                      <Clock className="w-3 h-3 text-emerald-600" />
                      <span>{formatTime(record.timestamp)}</span>
                    </div>
                    {onDeleteRecord && (
                      <button
                        onClick={() => {
                          setConfirmDelete({
                            type: "single",
                            timestamp: record.timestamp,
                            name: record.namaLengkap,
                          });
                        }}
                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-all cursor-pointer active:scale-90"
                        title="Hapus Absen"
                        id={`btn-delete-record-${index}`}
                      >
                        <Trash2 className="w-4 h-4 shrink-0" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Info Fields */}
                <div className="grid grid-cols-2 gap-4 text-xs">
                  {/* NIP/NRPTT & Jabatan */}
                  <div className="space-y-2">
                    <div>
                      <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">NIP/NRPTT</div>
                      <div className="font-bold text-slate-800 break-words">{record.nipNrptt || "-"}</div>
                    </div>
                    <div>
                      <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Jabatan & Instansi</div>
                      <div className="font-bold text-slate-800 break-words leading-tight">
                        {record.jabatan || "-"}
                        <span className="block text-[10px] text-slate-500 font-medium mt-0.5">{record.instansi || "-"}</span>
                      </div>
                    </div>
                  </div>

                  {/* GPS & TTD Column */}
                  <div className="space-y-2">
                    <div>
                      <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Titik GPS</div>
                      {record.latitude !== null && record.longitude !== null ? (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <a
                            href={record.urlLokasi}
                            target="_blank"
                            rel="noreferrer"
                            referrerPolicy="no-referrer"
                            className="inline-flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 border border-indigo-150 text-indigo-700 py-1 px-2 rounded-lg font-bold text-[10px]"
                          >
                            <span>Buka Peta</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-400 italic">Tanpa GPS</div>
                      )}
                    </div>

                    <div>
                      <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Tanda Tangan</div>
                      {record.tandaTangan ? (
                        <div className="border border-slate-100 bg-slate-50 rounded-xl p-1 h-10 flex items-center justify-center max-w-[100px] overflow-hidden mt-0.5">
                          <div
                            className="w-full h-full text-slate-800 animate-pulse"
                            dangerouslySetInnerHTML={{ __html: record.tandaTangan }}
                          />
                        </div>
                      ) : (
                        <div className="text-[10px] text-rose-500 italic">Tanpa TTD</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-3xl py-12 px-5 text-center shadow-2xs">
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
              {totalSubmissions > 0
                ? "Pencarian tidak ditemukan"
                : "Belum Ada Absensi Masuk"}
            </p>
            <p className="text-[11px] text-slate-400 mt-2 max-w-xs mx-auto leading-relaxed">
              Seluruh data absen harian terekam instan dan disimpan rapi secara real-time langsung di rekap harian perangkat ini.
            </p>
          </div>
        )}
      </div>

      {/* Custom Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-slate-200 shadow-xl relative animate-scale-up">
            {/* Header / Dismiss */}
            <button
              onClick={() => setConfirmDelete(null)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Warning Icon */}
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>

            {/* Content */}
            <h3 className="text-base font-extrabold text-slate-900 leading-snug">
              Konfirmasi Penghapusan
            </h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              {confirmDelete.type === "all"
                ? "Apakah Anda yakin ingin menghapus seluruh riwayat absensi lokal dari penyimpanan perangkat ini? Tindakan ini tidak dapat dibatalkan."
                : `Apakah Anda yakin ingin menghapus data absen milik "${confirmDelete.name}"?`}
            </p>

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 px-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-705 rounded-xl text-xs font-bold font-sans transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  if (confirmDelete.type === "all") {
                    if (onClearHistory) onClearHistory();
                  } else {
                    if (onDeleteRecord && confirmDelete.timestamp) {
                      onDeleteRecord(confirmDelete.timestamp);
                    }
                  }
                  setConfirmDelete(null);
                }}
                className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold font-sans transition-all cursor-pointer shadow-sm shadow-rose-100"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
