import React from "react";
import { LogOut, CalendarRange, UserCheck } from "lucide-react";
import { UserProfile } from "../types";

interface HeaderProps {
  user: UserProfile | null;
  onLogout: () => void;
  onLogin?: () => void;
}

export default function Header({ user, onLogout, onLogin }: HeaderProps) {
  return (
    <header className="bg-indigo-600 text-white sticky top-0 z-40 px-5 py-4 shadow-lg shadow-indigo-100 rounded-b-[2rem] border-b border-indigo-500/10">
      <div className="max-w-md mx-auto flex items-center justify-between">
        {/* Brand/Title Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-indigo-600 shadow-md">
            <UserCheck className="w-5.5 h-5.5" />
          </div>
          <div>
            <h1 className="text-base font-black leading-tight tracking-tight">Absen Mandiri</h1>
            <p className="text-[9px] font-bold text-indigo-200 uppercase tracking-widest leading-none">PENGISIAN CEPAT</p>
          </div>
        </div>

        {/* User profile & Log Out */}
        {user ? (
          <div className="flex items-center gap-2.5">
            <div className="text-right hidden xs:block">
              <div className="text-xs font-bold text-white line-clamp-1">{user.name}</div>
              <div className="text-[10px] font-medium text-indigo-200 line-clamp-1">{user.email}</div>
            </div>

            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.name}
                referrerPolicy="no-referrer"
                className="w-9 h-9 rounded-xl border border-indigo-400/40 object-cover"
              />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-indigo-500 text-white font-bold text-sm flex items-center justify-center border border-indigo-400/40 uppercase">
                {user.name.substring(0, 2)}
              </div>
            )}

            <button
              onClick={onLogout}
              className="w-9 h-9 bg-indigo-700/50 hover:bg-rose-500 hover:text-white border border-indigo-500/30 rounded-xl flex items-center justify-center text-indigo-100 active:scale-95 transition-all outline-none"
              title="Keluar Akun"
              id="header-logout-btn"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          onLogin && (
            <button
              onClick={onLogin}
              className="bg-indigo-700 hover:bg-indigo-800 text-[10px] uppercase tracking-wider font-extrabold px-3 py-2 rounded-xl border border-indigo-500/40 shadow-sm transition-all active:scale-95"
              id="header-login-btn"
            >
              Log In Google
            </button>
          )
        )}
      </div>
    </header>
  );
}
