export interface AttendanceRecord {
  timestamp: string;
  tanggalKegiatan: string;
  namaLengkap: string;
  nipNrptt: string;
  instansi: string;
  jabatan: string;
  email: string;
  latitude: number | null;
  longitude: number | null;
  urlLokasi: string;
  tandaTangan: string; // Base64 or lightweight SVG representation
}

export interface UserProfile {
  name: string;
  email: string;
  photoURL: string;
}
