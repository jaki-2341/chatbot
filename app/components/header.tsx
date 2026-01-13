'use client';

import { Bot, Bell, LogOut } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '../contexts/auth-context';
import { useRouter } from 'next/navigation';

export default function Header() {
  const { logout, user } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.refresh();
  };

  const getUserInitials = () => {
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    if (user?.name) {
      const names = user.name.split(' ');
      if (names.length >= 2) {
        return (names[0][0] + names[1][0]).toUpperCase();
      }
      return names[0][0].toUpperCase();
    }
    return 'U';
  };

  return (
    <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-6 shrink-0 z-20">
      <Link href="/" className="flex items-center gap-2 cursor-pointer">
        <div className="bg-blue-600 text-white p-1.5 rounded-lg">
          <Bot className="w-6 h-6" />
        </div>
        <span className="font-bold text-xl tracking-tight text-slate-900">BotForge</span>
      </Link>
      <div className="flex items-center gap-4">
        <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
        </button>
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-500 text-white flex items-center justify-center font-medium text-sm border-2 border-white shadow-sm">
          {getUserInitials()}
        </div>
        <button
          onClick={handleLogout}
          className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-2"
          title="Logout"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
