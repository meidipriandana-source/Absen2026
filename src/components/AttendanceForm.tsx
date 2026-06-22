import React, { useState, useEffect } from "react";
import { Send, CheckCircle2, Loader2 } from "lucide-react";
import SignaturePad from "./SignaturePad";
import { AttendanceRecord, UserProfile } from "../types";

interface AttendanceFormProps {
  user: UserProfile | null;
  onSubmit: (record: Omit<AttendanceRecord, "timestamp">) => Promise<void>;
  isLoading: boolean;
  needsAuth: boolean;
  onLogin: () => Promise<void>;
  isAuthenticating: boolean;
}

export default function AttendanceForm({
  user,
  onSubmit,
  isLoading,
  needsAuth,
  onLogin,
  isAuthenticating,
}: AttendanceFormProps) {
  const [employeeName, setEmployeeName] = useState(() => {
    return localStorage.getItem("temp_employeeName") || user?.name || "";
  });
  const [nipNrptt, setNipNrptt] = useState(() => {
    return localStorage.getItem("temp_nipNrptt") || "";
  });
  const [instansi, setInstansi] = useState(() => {
    return localStorage.getItem("temp_instansi") || "";
  });
  const [jabatan, setJabatan] = useState(() => {
    return localStorage.getItem("temp_jabatan") || "";
  });
  const [activityDate, setActivityDate] = useState("");
  const [signatureSvg, setSignatureSvg] = useState(() => {
    return localStorage.getItem("temp_signatureSvg") || "";
  });
  const [formSubmitted, setFormSubmitted] = useState(false);

  // Sync back state on mount/update when Google profile is fetched
  useEffect(() => {
    if (user?.name && !employeeName) {
      setEmployeeName(user.name);
    }
  }, [user]);

  // Persist edits to localStorage to prevent state loss across Google OAuth redirects
  useEffect(() => {
    localStorage.setItem("temp_employeeName", employeeName);
  }, [employeeName]);

  useEffect(() => {
    localStorage.setItem("temp_nipNrptt", nipNrptt);
  }, [nipNrptt]);

  useEffect(() => {
    localStorage.setItem("temp_instansi", instansi);
  }, [instansi]);

  useEffect(() => {
    localStorage.setItem("temp_jabatan", jabatan);
  }, [jabatan]);

  useEffect(() => {
    if (signatureSvg) {
      localStorage.setItem("temp_signatureSvg", signatureSvg);
    } else {
      localStorage.removeItem("temp_signatureSvg");
    }
  }, [signatureSvg]);

  // Set default date to today in YYYY-MM-DD
  useEffect(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    setActivityDate(`${year}-${month}-${day}`);
  }, []);

  // Show a confirmation dialog before closing browser tab if form has unsaved edits
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const isDirty = !formSubmitted && (
        (employeeName.trim() !== "" && employeeName !== (user?.name || "")) ||
        nipNrptt.trim() !== "" ||
        instansi.trim() !== "" ||
        jabatan.trim() !== "" ||
        signatureSvg !== ""
      );

      if (isDirty) {
        e.preventDefault();
        // Modern browsers require setting returnValue
        e.returnValue = "Ada data absensi yang belum terkirim. Apakah Anda yakin ingin meninggalkan halaman ini?";
        return e.returnValue;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [employeeName, nipNrptt, instansi, jabatan, signatureSvg, formSubmitted, user]);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!employeeName.trim()) {
      alert("Silakan isi nama lengkap Anda.");
      return;
    }

    if (!nipNrptt.trim()) {
      alert("Silakan isi NIP/NRPTT Anda.");
      return;
    }

    if (!instansi.trim()) {
      alert("Silakan isi Instansi Anda.");
      return;
    }

    if (!jabatan.trim()) {
      alert("Silakan isi Jabatan Anda.");
      return;
    }

    if (!activityDate) {
      alert("Silakan tentukan tanggal kegiatan.");
      return;
    }

    if (!signatureSvg) {
      alert("Silakan bubuhkan tanda tangan Anda sebelum mengirim.");
      return;
    }

    try {
      const recordEmail = user?.email || "-";
      await onSubmit({
        namaLengkap: employeeName,
        nipNrptt,
        instansi,
        jabatan,
        email: recordEmail,
        tanggalKegiatan: activityDate,
        latitude: null,
        longitude: null,
        urlLokasi: "-",
        tandaTangan: signatureSvg,
      });
      // Clear specific drafts on successful submit
      localStorage.removeItem("temp_signatureSvg");
      setFormSubmitted(true);
    } catch (err) {
      console.error("Attendance submission error:", err);
      alert("Gagal mengirim absensi: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const resetForm = () => {
    setFormSubmitted(false);
    setNipNrptt("");
    setInstansi("");
    setJabatan("");
    setSignatureSvg("");
    localStorage.removeItem("temp_nipNrptt");
    localStorage.removeItem("temp_instansi");
    localStorage.removeItem("temp_jabatan");
    localStorage.removeItem("temp_signatureSvg");
  };

  if (formSubmitted) {
    return (
      <div className="flex flex-col items-center justify-center py-10 px-4 text-center animate-fade-in" id="success-screen">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6 animate-bounce">
          <CheckCircle2 className="w-12 h-12 text-emerald-600" />
        </div>
        <h3 className="text-2xl font-black text-slate-900 tracking-tight">Absensi Berhasil!</h3>
        <p className="text-slate-500 mt-2 max-w-md text-xs leading-relaxed">
          Kehadiran Anda telah berhasil dikunci dan database Google Sheets / Firestore telah diperbarui secara instan.
        </p>

        <div className="mt-8 bg-slate-50 rounded-3xl p-5 border border-slate-200 text-left w-full max-w-sm shadow-sm space-y-2.5">
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Rincian Singkat</div>
          <div className="space-y-2.5 text-xs text-slate-700">
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-400 font-semibold uppercase tracking-wider text-[9px]">Nama Lengkap</span>
              <span className="font-bold text-slate-950 text-right">{employeeName}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-400 font-semibold uppercase tracking-wider text-[9px]">NIP/NRPTT</span>
              <span className="font-bold text-slate-950 text-right">{nipNrptt}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-400 font-semibold uppercase tracking-wider text-[9px]">Instansi</span>
              <span className="font-bold text-slate-950 text-right">{instansi}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-400 font-semibold uppercase tracking-wider text-[9px]">Jabatan</span>
              <span className="font-bold text-slate-950 text-right">{jabatan}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-semibold uppercase tracking-wider text-[9px]">Tanggal</span>
              <span className="font-bold text-slate-950 text-right">{activityDate}</span>
            </div>
          </div>
        </div>

        <button
          onClick={resetForm}
          className="mt-8 w-full max-w-sm bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-150 active:scale-95 transition-all text-sm cursor-pointer"
          id="btn-back-form"
        >
          Isi Absen Baru
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleFormSubmit} className="space-y-6" id="attendance-submission-form">
      {/* Input Nama Lengkap */}
      <div className="space-y-1">
        <label className="text-[10px] uppercase tracking-widest text-slate-400 font-extrabold block" htmlFor="field-nama">
          Nama Lengkap <span className="text-rose-500">*</span>
        </label>
        <div className="relative">
          <input
            id="field-nama"
            type="text"
            required
            value={employeeName}
            onChange={(e) => setEmployeeName(e.target.value)}
            placeholder="Ketik nama lengkap Anda"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:bg-white focus:border-indigo-600 transition-all outline-none text-slate-800 font-semibold shadow-2xs"
          />
        </div>
      </div>

      {/* Input NIP/NRPTT */}
      <div className="space-y-1">
        <label className="text-[10px] uppercase tracking-widest text-slate-400 font-extrabold block" htmlFor="field-nip">
          NIP/NRPTT <span className="text-rose-500">*</span>
        </label>
        <div className="relative">
          <input
            id="field-nip"
            type="text"
            required
            value={nipNrptt}
            onChange={(e) => setNipNrptt(e.target.value)}
            placeholder="Nomor Induk Pegawai / NRPTT"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:bg-white focus:border-indigo-600 transition-all outline-none text-slate-800 font-semibold shadow-2xs"
          />
        </div>
      </div>

      {/* Input Instansi */}
      <div className="space-y-1">
        <label className="text-[10px] uppercase tracking-widest text-slate-400 font-extrabold block" htmlFor="field-instansi">
          Instansi <span className="text-rose-500">*</span>
        </label>
        <div className="relative">
          <input
            id="field-instansi"
            type="text"
            required
            value={instansi}
            onChange={(e) => setInstansi(e.target.value)}
            placeholder="Ketik nama instansi tempat bertugas"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:bg-white focus:border-indigo-600 transition-all outline-none text-slate-800 font-semibold shadow-2xs"
          />
        </div>
      </div>

      {/* Input Jabatan */}
      <div className="space-y-1">
        <label className="text-[10px] uppercase tracking-widest text-slate-400 font-extrabold block" htmlFor="field-jabatan">
          Jabatan <span className="text-rose-500">*</span>
        </label>
        <div className="relative">
          <input
            id="field-jabatan"
            type="text"
            required
            value={jabatan}
            onChange={(e) => setJabatan(e.target.value)}
            placeholder="Ketik jabatan Anda sekarang"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:bg-white focus:border-indigo-600 transition-all outline-none text-slate-800 font-semibold shadow-2xs"
          />
        </div>
      </div>

      {/* Input Tanggal Kegiatan */}
      <div className="space-y-1">
        <label className="text-[10px] uppercase tracking-widest text-slate-400 font-extrabold block" htmlFor="field-tanggal">
          Tanggal Kegiatan <span className="text-rose-500">*</span>
        </label>
        <input
          id="field-tanggal"
          type="date"
          required
          value={activityDate}
          onChange={(e) => setActivityDate(e.target.value)}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:bg-white focus:border-indigo-600 transition-all outline-none text-slate-800 font-semibold font-sans shadow-2xs"
        />
      </div>

      {/* Signature Module */}
      <SignaturePad onSave={setSignatureSvg} onClear={() => setSignatureSvg("")} />

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading}
        className={`w-full text-white font-extrabold py-4 rounded-2xl shadow-lg transition-all active:scale-95 select-none text-sm mt-6 flex items-center justify-center gap-2 ${
          isLoading
            ? "bg-slate-400 cursor-not-allowed shadow-none"
            : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-150 cursor-pointer"
        }`}
        id="btn-submit-absensi"
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Send className="w-4 h-4" />
        )}
        {isLoading ? "Mengirim Presensi..." : "Kirim Absen Sekarang"}
      </button>
    </form>
  );
}
