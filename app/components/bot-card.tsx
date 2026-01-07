'use client';

import { useState, useEffect, useRef } from 'react';
import { Bot } from '@/app/types/bot';
import { Bot as BotIcon, MoreHorizontal, Copy, Trash2, Code } from 'lucide-react';
import Image from 'next/image';

interface BotCardProps {
  bot: Bot;
  onEdit: (bot: Bot) => void;
  onDelete: (id: string) => void;
  onShowEmbed: (bot: Bot) => void;
  onToggleStatus: (id: string) => void;
  activeMenuId: string | null;
  onToggleMenu: (id: string | null) => void;
  knowledgeBaseSize: string;
}

export default function BotCard({ 
  bot, 
  onEdit, 
  onDelete, 
  onShowEmbed, 
  onToggleStatus,
  activeMenuId,
  onToggleMenu,
  knowledgeBaseSize
}: BotCardProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = `menu-${bot.id}`;
  const isMenuOpen = activeMenuId === menuId;
  const isActive = bot.status === 'Active';
  const statusColorClass = isActive 
    ? 'text-green-700 bg-green-50 ring-1 ring-green-600/20' 
    : 'text-slate-700 bg-slate-100 ring-1 ring-slate-600/20';

  // Format date
  const formatDate = (date?: Date) => {
    if (!date) return 'Just now';
    const d = new Date(date);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        if (isMenuOpen) {
          onToggleMenu(null);
        }
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen, onToggleMenu]);

  const handleMenuToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleMenu(isMenuOpen ? null : menuId);
  };

  const handleDuplicate = (e: React.MouseEvent) => {
    e.stopPropagation();
    // TODO: Implement duplicate functionality
    alert('Duplicate functionality coming soon!');
    onToggleMenu(null);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(bot.id);
    onToggleMenu(null);
  };

  const handleToggleStatus = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    onToggleStatus(bot.id);
  };

  return (
    <div 
      className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
      onClick={() => onEdit(bot)}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          {bot.avatarImage ? (
            <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-100 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Image
                src={bot.avatarImage}
                alt={bot.agentName}
                width={40}
                height={40}
                className="w-full h-full object-cover"
                unoptimized
              />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 border border-slate-100 flex items-center justify-center text-blue-600 group-hover:scale-105 transition-transform">
              <BotIcon className="w-5 h-5" />
            </div>
          )}
          <div>
            <h3 className="font-semibold text-slate-900">{bot.name}</h3>
            <p className="text-xs text-slate-400 font-mono">{bot.id} • {formatDate(bot.createdAt)}</p>
          </div>
        </div>
        <div className="relative">
          <button
            onClick={handleMenuToggle}
            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded opacity-0 group-hover:opacity-100 transition-all"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>
          
          {/* Dropdown Menu */}
          {isMenuOpen && (
            <div
              ref={menuRef}
              className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-xl border border-slate-100 z-50 py-1 text-left transform origin-top-right transition-all"
            >
              <button
                onClick={handleDuplicate}
                className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-blue-600 flex items-center gap-2"
              >
                <Copy className="w-4 h-4" />
                Duplicate
              </button>
              <button
                onClick={handleDelete}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Knowledge Base Info */}
      <div className="mb-4">
        <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 flex items-center justify-between px-3">
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Knowledge Base</p>
          <p className="text-sm font-semibold text-slate-700">{knowledgeBaseSize}</p>
        </div>
      </div>

      {/* Footer with Status Toggle and Embed Button */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
        <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
          <label className="relative inline-block w-9 h-5 align-middle select-none cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={handleToggleStatus}
              className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer border-slate-300 checked:left-[calc(100%-1.25rem)] checked:border-blue-500 transition-all opacity-0 z-10"
            />
            <span
              className={`block overflow-hidden h-5 rounded-full transition-colors duration-150 ${
                isActive ? 'bg-blue-500' : 'bg-slate-300'
              }`}
            >
              <span
                className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all duration-150 ${
                  isActive ? 'left-[calc(100%-1rem)]' : 'left-0.5'
                }`}
              ></span>
            </span>
          </label>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${statusColorClass}`}>
            {bot.status || 'Inactive'}
          </span>
        </div>
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            onShowEmbed(bot);
          }}
          className="text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 border border-blue-100"
        >
          <Code className="w-3 h-3" />
          Embed
        </button>
      </div>
    </div>
  );
}

