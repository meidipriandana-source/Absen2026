import React, { useState, useEffect } from "react";
import { MapPin, Calendar, User, Mail, Send, CheckCircle2, ShieldAlert, Loader2 } from "lucide-react";
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
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [signatureSvg, setSignatureSvg] = useState(() => {
    return localStorage.getItem("temp_signatureSvg") || "";
  });
  const [formSubmitted, setFormSubmitted] = useState(false);

  // Fallback states for manual coordinates if Geolocation is blocked
  const [isManualLocation, setIsManualLocation] = useState(false);
  const [manualLatitude, setManualLatitude] = useState("3.3259");
  const [manualLongitude, setManualLongitude] = useState("117.5936");

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

  // Request location automatically on mount
  useEffect(() => {
    fetchLocation();
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

  const fetchLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Browser Anda tidak mendukung deteksi lokasi (Geolokasi).");
      return;
    }

    setIsGettingLocation(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude);
        setLongitude(position.coords.longitude);
        setIsGettingLocation(false);
      },
      (error) => {
        console.error("Error getting geolocation:", error);
        setIsGettingLocation(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError("Izin lokasi ditolak. Silakan aktifkan GPS layanan lokasi di browser/ponsel Anda.");
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError("Informasi lokasi tidak tersedia.");
            break;
          case error.TIMEOUT:
            setLocationError("Waktu permintaan lokasi habis.");
            break;
          default:
            setLocationError("Gagal mendeteksi lokasi real-time.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

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

    let finalLat = latitude;
    let finalLng = longitude;

    if (isManualLocation) {
      const parsedLat = parseFloat(manualLatitude);
      const parsedLng = parseFloat(manualLongitude);
      if (isNaN(parsedLat) || parsedLat < -90 || parsedLat > 90) {
        alert("Silakan masukkan nilai Lintang (Latitude) koordinat yang valid (-90 sampai 90).");
        return;
      }
      if (isNaN(parsedLng) || parsedLng < -180 || parsedLng > 180) {
        alert("Silakan masukkan nilai Bujur (Longitude) koordinat yang valid (-180 sampai 180).");
        return;
      }
      finalLat = parsedLat;
      finalLng = parsedLng;
    } else {
      if (latitude === null || longitude === null) {
        alert("Sistem memerlukan lokasi GPS. Jika sensor perangkat atau browser Anda mengalami kendala atau memberi peringatan ditolak, silakan aktifkan opsi 'Input Koordinat Manual/Kantor' di bawah untuk melanjutkan.");
        return;
      }
    }

    if (!signatureSvg) {
      alert("Silakan bubuhkan tanda tangan Anda sebelum mengirim.");
      return;
    }

    try {
      const gmapsUrl = `https://www.google.com/maps?q=${finalLat},${finalLng}`;
      const recordEmail = user?.email || "-";
      await onSubmit({
        namaLengkap: employeeName,
        nipNrptt,
        instansi,
        jabatan,
        email: recordEmail,
        tanggalKegiatan: activityDate,
        latitude: finalLat,
        longitude: finalLng,
        urlLokasi: gmapsUrl,
        tandaTangan: signatureSvg,
      });
      // Clear specific drafts on successful submit
      localStorage.removeItem("temp_signatureSvg");
      setLatitude(finalLat);
      setLongitude(finalLng);
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
    // re-trigger location
    fetchLocation();
  };

  if (formSubmitted) {
    return (
      <div className="flex flex-col items-center justify-center py-10 px-4 text-center animate-fade-in" id="success-screen">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6 animate-bounce">
          <CheckCircle2 className="w-12 h-12 text-emerald-600" />
        </div>
        <h3 className="text-2xl font-black text-slate-900 tracking-tight">Absensi Berhasil!</h3>
        <p className="text-slate-500 mt-2 max-w-md text-xs leading-relaxed">
          Kehadiran Anda telah berhasil dikunci dan database Google Sheets telah diperbarui secara instan.
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
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-400 font-semibold uppercase tracking-wider text-[9px]">Tanggal</span>
              <span className="font-bold text-slate-950 text-right">{activityDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-semibold uppercase tracking-wider text-[9px]">Titik Lokasi</span>
              <a
                href={`https://www.google.com/maps?q=${latitude},${longitude}`}
                target="_blank"
                referrerPolicy="no-referrer"
                rel="noreferrer"
                className="font-bold text-indigo-600 underline hover:text-indigo-700"
              >
                Lihat di Google Maps
              </a>
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
      {/* Intro info alert */}
      <div className="bg-indigo-50/75 p-4 rounded-2xl border border-indigo-100 flex gap-3 text-xs text-indigo-950">
        <MapPin className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-bold">Informasi Sistem:</span> Presensi menggunakan GPS real-time untuk memvalidasi posisi kerja Anda secara akurat.
        </div>
      </div>

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

      {/* GPS Location Module */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[10px] uppercase tracking-widest text-slate-400 font-extrabold block">
            Lokasi Deteksi <span className="text-rose-500">*</span>
          </label>
          <button
            type="button"
            onClick={() => setIsManualLocation(!isManualLocation)}
            className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 underline focus:outline-none"
          >
            {isManualLocation ? "Gunakan Sensor GPS Otomatis" : "Input Koordinat Manual/Kantor"}
          </button>
        </div>
        
        {isManualLocation ? (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3.5 shadow-2xs">
            <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">
              Mode Manual Aktif. Anda dapat memasukkan titik Lintang & Bujur koordinat Anda atau memilih preset lokasi saat sensor GPS diblokir.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[9px] uppercase tracking-wider text-slate-400 font-extrabold block" htmlFor="manual-lat">
                  Latitude (Lintang)
                </label>
                <input
                  id="manual-lat"
                  type="text"
                  required
                  value={manualLatitude}
                  onChange={(e) => setManualLatitude(e.target.value)}
                  placeholder="-6.2088"
                  className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs font-semibold font-mono text-slate-800 focus:border-indigo-650 outline-none shadow-2xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] uppercase tracking-wider text-slate-400 font-extrabold block" htmlFor="manual-lng">
                  Longitude (Bujur)
                </label>
                <input
                  id="manual-lng"
                  type="text"
                  required
                  value={manualLongitude}
                  onChange={(e) => setManualLongitude(e.target.value)}
                  placeholder="106.8456"
                  className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs font-semibold font-mono text-slate-800 focus:border-indigo-650 outline-none shadow-2xs"
                />
              </div>
            </div>
            
            <div className="flex flex-wrap gap-1.5 pt-1.5 border-t border-slate-200">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block w-full">Preset Lokasi Kantor:</span>
              <button
                type="button"
                onClick={() => {
                  setManualLatitude("3.3259");
                  setManualLongitude("117.5936");
                }}
                className="bg-indigo-600 text-white hover:bg-indigo-700 font-extrabold px-3 py-1 rounded-lg text-[10px] transition-all active:scale-95 shadow-xs"
              >
                RSUD dr H Jusuf SK (3.3259, 117.5936)
              </button>
              <button
                type="button"
                onClick={() => {
                  setManualLatitude("-6.2088");
                  setManualLongitude("106.8456");
                }}
                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-2.5 py-1 rounded-lg text-[10px] transition-all active:scale-95"
              >
                Jakarta (Back-up)
              </button>
            </div>
          </div>
        ) : (
          latitude !== null && longitude !== null ? (
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3.5 flex items-center gap-3 shadow-2xs">
              <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white shrink-0 shadow-xs animate-pulse">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-black text-emerald-800 flex items-center gap-1.5 leading-none">
                  <span>GPS Terkunci Aktif</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-ping"></span>
                </div>
                <div className="text-[10px] text-emerald-600 font-mono mt-1 break-words">
                  {latitude.toFixed(5)}, {longitude.toFixed(5)} • <button type="button" onClick={fetchLocation} className="underline font-bold hover:text-emerald-700">Segarkan</button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 shadow-2xs">
              <p className="text-xs text-slate-500 leading-relaxed">Sistem memerlukan akses GPS untuk menentukan lokasi real-time Anda.</p>
              
              {locationError && (
                <div className="bg-amber-50 rounded-xl p-3 border border-amber-200 text-xs text-amber-800 flex gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">{locationError}</div>
                </div>
              )}

              <button
                type="button"
                onClick={fetchLocation}
                disabled={isGettingLocation}
                className="w-full bg-indigo-50 border border-indigo-100 text-indigo-700 hover:bg-indigo-100 active:scale-95 text-xs font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer"
              >
                <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                {isGettingLocation ? "Membaca GPS..." : "Dapatkan Lokasi Real-time"}
              </button>
            </div>
          )
        )}
      </div>

      {/* Signature Module */}
      <SignaturePad onSave={setSignatureSvg} onClear={() => setSignatureSvg("")} />

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading || isGettingLocation}
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
