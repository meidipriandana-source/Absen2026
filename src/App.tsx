import React, { useState, useEffect } from "react";
import {
  initAuth,
  googleSignIn,
  googleSignOut,
} from "./lib/firebase";
import {
  getOrCreateSpreadsheet,
  appendAttendanceRecord,
  getAttendanceRecords,
  deleteAttendanceRecord,
  SPREADSHEET_NAME,
} from "./lib/googleApi";
import { AttendanceRecord, UserProfile } from "./types";
import Header from "./components/Header";
import AttendanceForm from "./components/AttendanceForm";
import Dashboard from "./components/Dashboard";
import {
  ClipboardCheck,
  LayoutDashboard,
  ShieldAlert,
  Loader2,
  RefreshCw,
  Bell,
} from "lucide-react";

interface ToastNotification {
  id: string;
  title: string;
  message: string;
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isInitializingDb, setIsInitializingDb] = useState(false);
  const [activeTab, setActiveTab] = useState<"absen" | "rekap">("absen");

  // Database details
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>(() => {
    try {
      const stored = localStorage.getItem("local_attendance_records");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);
  const [appError, setAppError] = useState<string | null>(null);

  const getMergedRecords = (sheetRecords: AttendanceRecord[]): AttendanceRecord[] => {
    let localData: AttendanceRecord[] = [];
    try {
      const stored = localStorage.getItem("local_attendance_records");
      localData = stored ? JSON.parse(stored) : [];
    } catch (err) {
      console.warn("Failed to read local records:", err);
    }
    
    const map = new Map<string, AttendanceRecord>();
    localData.forEach((r) => {
      const key = `${r.tanggalKegiatan}_${r.namaLengkap}`;
      map.set(key, r);
    });
    sheetRecords.forEach((r) => {
      const key = `${r.tanggalKegiatan}_${r.namaLengkap}`;
      map.set(key, r);
    });

    return Array.from(map.values()).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  };

  // Live Toast Notification list
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  // Synthesizer Client-Side Audio Feedback Chime
  const playChimeSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      // Play major third chime
      osc.type = "sine";
      const now = audioCtx.currentTime;
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.12); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.24); // G5

      gainNode.gain.setValueAtTime(0.4, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.6);

      osc.start(now);
      osc.stop(now + 0.6);
    } catch (err) {
      console.warn("Audio Context not supported or allowed yet:", err);
    }
  };

  // Push Toast Notification helper
  const addToast = (title: string, message: string) => {
    const newToast: ToastNotification = {
      id: Date.now().toString(),
      title,
      message,
    };
    setToasts((prev) => [newToast, ...prev]);

    // Request web browser default Notification permission and push true desktop alert if supported
    if ("Notification" in window && Notification.permission === "granted") {
      try {
        new Notification(title, { body: message });
      } catch (e) {
        console.error("Desktop Notification failed to open:", e);
      }
    }

    // Play tactile sound
    playChimeSound();

    // Remove notification after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
    }, 5000);
  };

  // Register push notifications on mount if permissions allowed
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Initialize Auth listeners
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setAccessToken(token);
        setCurrentUser({
          name: user.displayName || "Karyawan",
          email: user.email || "",
          photoURL: user.photoURL || "",
        });
        setNeedsAuth(false);
      },
      () => {
        setNeedsAuth(true);
      }
    );

    return () => unsubscribe();
  }, []);

  // Sync / initialize google sheet database when user token updates
  useEffect(() => {
    if (accessToken) {
      bootstrapDatabase();
    }
  }, [accessToken]);

  const bootstrapDatabase = async () => {
    if (!accessToken) return;
    setIsInitializingDb(true);
    setAppError(null);

    try {
      // Find or create sheet
      const sId = await getOrCreateSpreadsheet(accessToken);
      setSpreadsheetId(sId);
      
      // Fetch latest records
      setIsLoadingRecords(true);
      const data = await getAttendanceRecords(accessToken, sId);
      const merged = getMergedRecords(data);
      setRecords(merged);
      setIsLoadingRecords(false);
    } catch (err: any) {
      console.error("Database startup failure:", err);
      setAppError("Gagal menyambungkan ke Google Sheets. Pastikan Anda menyetujui semua izin yang diminta.");
    } finally {
      setIsInitializingDb(false);
    }
  };

  const handleLogin = async () => {
    setIsAuthenticating(true);
    setAppError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setAccessToken(result.accessToken);
        setCurrentUser({
          name: result.user.displayName || "Karyawan",
          email: result.user.email || "",
          photoURL: result.user.photoURL || "",
        });
        setNeedsAuth(false);
      }
    } catch (err) {
      console.error("Google authentication error:", err);
      setAppError("Masuk akun Google gagal. Silakan coba kembali.");
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLogout = async () => {
    const confirmed = window.confirm("Apakah Anda yakin ingin keluar?");
    if (!confirmed) return;

    try {
      await googleSignOut();
      setAccessToken(null);
      setCurrentUser(null);
      setNeedsAuth(true);
      setRecords([]);
      setSpreadsheetId(null);
    } catch (err) {
      console.error("Logout failure:", err);
    }
  };

  const handleClearLocalHistory = () => {
    try {
      localStorage.removeItem("local_attendance_records");
      setRecords([]);
      addToast("Riwayat Terhapus", "Seluruh riwayat absensi lokal berhasil dihapus.");
    } catch (err) {
      console.error("Failed to clear local records:", err);
      addToast("Penghapusan Gagal", "Gagal menghapus riwayat dari perangkat ini.");
    }
  };

  const handleDeleteRecord = async (timestamp: string) => {
    try {
      // 1. Instantly remove from local storage and React state for optimal responsive latency
      const stored = localStorage.getItem("local_attendance_records");
      if (stored) {
        const parsed: AttendanceRecord[] = JSON.parse(stored);
        const filtered = parsed.filter((r) => r.timestamp !== timestamp);
        localStorage.setItem("local_attendance_records", JSON.stringify(filtered));
      }
      setRecords((prev) => prev.filter((r) => r.timestamp !== timestamp));

      // 2. Safely sync changes to Google Sheets if authorized
      if (accessToken && spreadsheetId) {
        await deleteAttendanceRecord(accessToken, spreadsheetId, timestamp);
        addToast("Absensi Dihapus", "Satu data absen berhasil dihapus dari Google Sheets dan riwayat lokal.");
      } else {
        addToast("Absensi Lokal Dihapus", "Satu data absen berhasil dihapus secara lokal dari perangkat ini.");
      }
    } catch (err) {
      console.error("Failed to delete record:", err);
      addToast("Gagal Menghapus", "Gagal menyelaraskan penghapusan dengan spreadsheet online.");
    }
  };

  const handleRefreshRecords = async () => {
    if (!accessToken || !spreadsheetId) return;
    setIsLoadingRecords(true);
    try {
      const data = await getAttendanceRecords(accessToken, spreadsheetId);
      const merged = getMergedRecords(data);
      
      if (merged.length > records.length) {
        addToast("Entri Absensi Masuk Baru", "Berhasil menyinkronkan rekapan data Google Sheets.");
      } else {
        addToast("Data Sinkron", "Berhasil menyinkronkan rekapan data Google Sheets.");
      }
      
      setRecords(merged);
    } catch (err) {
      console.error("Refresh failure:", err);
    } finally {
      setIsLoadingRecords(false);
    }
  };

  const handleFormSubmission = async (recordData: Omit<AttendanceRecord, "timestamp">) => {
    const timestamp = new Date().toISOString();
    const fullRecord: AttendanceRecord = {
      ...recordData,
      timestamp,
    };

    // Always persist to localStorage
    let updatedLocal: AttendanceRecord[] = [];
    try {
      const stored = localStorage.getItem("local_attendance_records");
      const parsed = stored ? JSON.parse(stored) : [];
      const exists = parsed.some((r: AttendanceRecord) => r.tanggalKegiatan === fullRecord.tanggalKegiatan && r.namaLengkap === fullRecord.namaLengkap);
      if (!exists) {
        updatedLocal = [...parsed, fullRecord];
        localStorage.setItem("local_attendance_records", JSON.stringify(updatedLocal));
      } else {
        updatedLocal = parsed;
      }
    } catch {
      updatedLocal = [fullRecord];
      localStorage.setItem("local_attendance_records", JSON.stringify(updatedLocal));
    }

    // Set local state
    setRecords((prev) => {
      const exists = prev.some(r => r.tanggalKegiatan === fullRecord.tanggalKegiatan && r.namaLengkap === fullRecord.namaLengkap);
      if (exists) return prev;
      return [fullRecord, ...prev];
    });

    // If Google account is connected, also synchronize to Google Sheets database!
    if (accessToken && spreadsheetId) {
      try {
        await appendAttendanceRecord(accessToken, spreadsheetId, fullRecord);
        addToast("Absen Masuk Berhasil!", `Halo ${fullRecord.namaLengkap}, terkirim ke Google Sheets & disimpan.`);
      } catch (err) {
        console.error("Google Sheets append failed:", err);
        addToast("Tersimpan Lokal", "Berhasil disimpan lokal! Sinkronisasi Google Sheets tertunda.");
      }
    } else {
      addToast("Absen Masuk Berhasil!", `Halo ${fullRecord.namaLengkap}, kehadiran Anda terekam di Rekap Harian.`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 font-sans flex items-center justify-center py-0 sm:py-8 relative overflow-hidden">
      {/* Visual Ambient Lights */}
      <div className="absolute top-[-10%] left-[-20%] w-[80%] h-[60%] rounded-full bg-indigo-500/15 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-20%] w-[80%] h-[60%] rounded-full bg-violet-500/15 blur-[120px] pointer-events-none" />

      {/* Main Responsive Smartphone Frameless Wrapper */}
      <div className="w-full max-w-md min-h-screen sm:min-h-[820px] bg-slate-50 relative flex flex-col justify-between sm:rounded-[2.8rem] sm:shadow-2xl sm:shadow-indigo-900/40 sm:border-[10px] sm:border-slate-900 overflow-hidden" id="smartphone-outer-shell">
        
        {/* Header Module */}
        <Header user={currentUser} onLogout={handleLogout} />

        {/* Primary View Area */}
        <main className="flex-1 overflow-y-auto px-5 py-6 space-y-6">
          
          {/* Application Initialization Error */}
          {appError && (
            <div className="bg-rose-50 border border-rose-150 rounded-2xl p-4 text-left text-xs text-rose-800 flex gap-2 w-full shadow-2xs">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{appError}</div>
            </div>
          )}

          {activeTab === "absen" ? (
            /* Tab 1: Attendance registration Form */
            <AttendanceForm
              user={currentUser}
              onSubmit={handleFormSubmission}
              isLoading={isLoadingRecords || isInitializingDb}
              needsAuth={needsAuth}
              onLogin={handleLogin}
              isAuthenticating={isAuthenticating}
            />
          ) : (
            /* Tab 2: Dashboard rekap list */
            isInitializingDb ? (
              /* Connecting Database progress screen */
              <div className="flex flex-col items-center justify-center py-24 text-center space-y-5" id="db-init-progress">
                <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
                <div className="space-y-1.5">
                  <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">Menghubungkan Database...</h3>
                  <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                    Mengecek spreadsheet &ldquo;{SPREADSHEET_NAME}&rdquo; Anda di Google Drive...
                  </p>
                </div>
              </div>
            ) : (
              /* Synchronized / Local Records List */
              <div className="space-y-6">
                {needsAuth ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold uppercase tracking-wider">
                      <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block animate-pulse"></span>
                      <span>Penyimpanan Lokal Aktif</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold uppercase tracking-wider">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                      <span>Database Cloud Aktif</span>
                    </div>
                    
                    <button
                      onClick={handleRefreshRecords}
                      disabled={isLoadingRecords}
                      className="flex items-center gap-1.5 text-[10px] font-extrabold text-slate-500 hover:text-indigo-600 border border-slate-200 hover:border-indigo-150 rounded-lg bg-white px-2.5 py-1.5 shadow-2xs transition-all active:scale-95 cursor-pointer uppercase tracking-wider"
                      title="Refresh Data"
                      id="dashboard-refresh-btn"
                    >
                      <RefreshCw className={`w-3 h-3 ${isLoadingRecords ? "animate-spin" : ""}`} />
                      <span>Segarkan</span>
                    </button>
                  </div>
                )}

                <Dashboard
                  records={records}
                  spreadsheetId={spreadsheetId || ""}
                  accessToken={accessToken}
                  onClearHistory={handleClearLocalHistory}
                  onDeleteRecord={handleDeleteRecord}
                />
              </div>
            )
          )}
        </main>

        {/* Sticky Mobile bottom navigation menu */}
        <nav className="border-t border-slate-200 bg-white/95 backdrop-blur-md px-6 py-3 pb-6 flex items-center justify-around z-30 sticky bottom-0 rounded-t-[2.2rem] shadow-lg shadow-indigo-100" id="bottom-navigation-bars">
          <button
            onClick={() => setActiveTab("absen")}
            className={`flex-1 flex flex-col items-center gap-1 py-2 px-3 rounded-2xl transition-all cursor-pointer select-none ${
              activeTab === "absen"
                ? "text-indigo-600 bg-indigo-50 font-black scale-102"
                : "text-slate-400 hover:text-slate-600 font-semibold"
            }`}
            id="tab-btn-absen"
          >
            <ClipboardCheck className="w-5 h-5" />
            <span className="text-[10px] uppercase tracking-wider">Isi Absen</span>
          </button>

          <button
            onClick={() => setActiveTab("rekap")}
            className={`flex-1 flex flex-col items-center gap-1 py-2 px-3 rounded-2xl transition-all cursor-pointer select-none ${
              activeTab === "rekap"
                ? "text-indigo-600 bg-indigo-50 font-black scale-102"
                : "text-slate-400 hover:text-slate-600 font-semibold"
            }`}
            id="tab-btn-rekap"
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-[10px] uppercase tracking-wider">Rekap Harian</span>
          </button>
        </nav>

        {/* Live Simulation Push Notifications container */}
        <div className="absolute top-4 right-4 left-4 z-50 flex flex-col gap-2.5 pointer-events-none" id="toast-notifications-root">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className="bg-indigo-950 text-indigo-50 rounded-2xl p-4 shadow-xl border border-indigo-900/50 flex items-start gap-3 pointer-events-auto transition-all animate-fade-in"
            >
              <div className="w-6.5 h-6.5 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0 mt-0.5 shadow-md">
                <Bell className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="flex-1 text-left min-w-0">
                <h5 className="text-xs font-black leading-snug uppercase tracking-wide text-white">{toast.title}</h5>
                <p className="text-[10px] text-indigo-200 mt-1 leading-relaxed">{toast.message}</p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
