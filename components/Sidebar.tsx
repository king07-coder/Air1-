import React from 'react';
import { Trophy, MessageSquare, Plus, Trash2, X } from 'lucide-react';
import { ChatSession } from '../types';

interface SidebarProps {
  sessions: ChatSession[];
  currentSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (e: React.MouseEvent, id: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  sessions, 
  currentSessionId, 
  onSelectSession, 
  onNewChat,
  onDeleteSession,
  isOpen, 
  onClose 
}) => {
  return (
    <>
      {/* Mobile Overlay */}
      <div 
        className={`fixed inset-0 bg-black/60 z-40 lg:hidden transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Sidebar Content */}
      <div className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-950 border-r border-slate-800 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-auto ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-indigo-600 rounded-lg">
                <Trophy className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-white text-base">AIR 1 Senior</h1>
                <p className="text-[10px] text-slate-400">Your Personal Mentor</p>
              </div>
            </div>
            <button onClick={onClose} className="lg:hidden p-1 text-slate-400">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* New Chat Button */}
          <div className="p-4">
            <button
              onClick={() => {
                onNewChat();
                onClose();
              }}
              className="w-full flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl transition-all duration-200 font-medium shadow-lg shadow-indigo-900/20"
            >
              <Plus className="w-5 h-5" />
              <span>New Mentorship</span>
            </button>
          </div>

          {/* History List */}
          <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-2 mt-2">Previous Chats</h3>
            
            {sessions.length === 0 ? (
              <div className="text-center py-10 px-4">
                <p className="text-slate-600 text-sm">No history yet.</p>
                <p className="text-slate-700 text-xs mt-1">Start a new chat to get advice.</p>
              </div>
            ) : (
              sessions.sort((a, b) => b.lastModified - a.lastModified).map((session) => (
                <div
                  key={session.id}
                  onClick={() => {
                    onSelectSession(session.id);
                    onClose();
                  }}
                  className={`group relative w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer ${
                    currentSessionId === session.id 
                      ? 'bg-slate-800 text-slate-100 border border-slate-700' 
                      : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                  }`}
                >
                  <MessageSquare className={`w-4 h-4 shrink-0 ${currentSessionId === session.id ? 'text-indigo-400' : 'text-slate-600'}`} />
                  <span className="font-medium text-sm truncate flex-1 text-left">
                    {session.title}
                  </span>
                  
                  {/* Delete Button (Visible on hover or active) */}
                  <button 
                    onClick={(e) => onDeleteSession(e, session.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/20 hover:text-red-400 rounded-md transition-all"
                    title="Delete Chat"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Footer Info */}
          <div className="p-4 border-t border-slate-800 bg-slate-950">
            <div className="text-[10px] text-slate-600 text-center">
              "Success is the sum of small efforts, repeated day in and day out."
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
