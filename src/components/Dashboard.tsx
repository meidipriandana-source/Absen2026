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
} from "lucide-react";
import { AttendanceRecord } from "../types";

interface DashboardProps {
  records: AttendanceRecord[];
  spreadsheetId: string | null;
}

export default function Dashboard({ records, spreadsheetId }: DashboardProps) {
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });

  const [searchQuery, setSearchQuery] = useState("");

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
  const uniqueEmployeesCount = new Set(recordsForDate.map((r) => r.email)).size;

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
            <h4 className="text-[9px] font-black uppercase tracking-widest text-amber-700">Akun Berbeda</h4>
          </div>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-3xl font-black tracking-tight text-amber-950">{uniqueEmployeesCount}</span>
            <span className="text-xs text-amber-700">email</span>
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
                    {/* Visual initials badge */}
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center justify-center font-bold text-xs uppercase shrink-0 shadow-3xs">
                      {getInitials(record.namaLengkap || "")}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-sm leading-tight">{record.namaLengkap}</h4>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">{record.email}</p>
                    </div>
                  </div>
                  
                  {/* Attendance badge status */}
                  <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-100 text-emerald-700 py-1 px-2.5 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0">
                    <Clock className="w-3 h-3 text-emerald-600" />
                    <span>{formatTime(record.timestamp)}</span>
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
              Data presensi karyawan harian otomatis tersimpan rapi dan ditarik langsung dari instrumen Google Sheets database utama.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
