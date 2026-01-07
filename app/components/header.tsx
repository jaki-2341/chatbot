'use client';

import { Bot, Bell } from 'lucide-react';
import Link from 'next/link';

export default function Header() {
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
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-500 text-white flex items-center justify-center font-medium text-sm border-2 border-white shadow-sm cursor-pointer">
          JD
        </div>
      </div>
    </header>
  );
}
