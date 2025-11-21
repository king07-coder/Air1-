import React, { useState, useEffect, useRef } from 'react';
import { Send, Menu, Book, User as UserIcon, Bot } from 'lucide-react';
import { Message, ChatSession } from './types';
import { geminiService } from './services/geminiService';
import { Sidebar } from './components/Sidebar';
import { MarkdownRenderer } from './components/MarkdownRenderer';

const STORAGE_KEY = 'air1_mentor_sessions';

function App() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load sessions from local storage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsedSessions = JSON.parse(stored).map((s: any) => ({
          ...s,
          messages: s.messages.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }))
        }));
        setSessions(parsedSessions);
        
        // If sessions exist, load the most recent one
        if (parsedSessions.length > 0) {
          // Auto-select most recent
          const mostRecent = parsedSessions.sort((a: ChatSession, b: ChatSession) => b.lastModified - a.lastModified)[0];
          loadSession(mostRecent.id, parsedSessions);
        } else {
          startNewChat();
        }
      } catch (e) {
        console.error("Failed to parse storage", e);
        startNewChat();
      }
    } else {
      startNewChat();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save sessions to local storage whenever they change
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    }
  }, [sessions]);

  // Scroll to bottom logic
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [inputText]);

  const startNewChat = () => {
    const newId = Date.now().toString();
    
    const initialMessage: Message = {
      id: 'intro',
      role: 'model',
      text: `**Hey Champ.** I'm your AIR 1 Senior Mentor.\n\nBefore we start strategizing, I need to know two things to help you best:\n\n1.  **Which Exam** are you targeting? (JEE, NEET, UPSC, etc.)\n2.  **Which Language** are you comfortable in? (English, Hindi, Hinglish?)\n\nTell me, and let's get to work.`,
      timestamp: new Date(),
    };

    const newSession: ChatSession = {
      id: newId,
      title: 'New Strategy Session',
      messages: [initialMessage],
      lastModified: Date.now()
    };

    setSessions(prev => [...prev, newSession]);
    setCurrentSessionId(newId);
    setMessages([initialMessage]);
    
    // Initialize Gemini with empty history (it will receive the system prompt)
    geminiService.startChat([]);
    
    setInputText('');
    if (window.innerWidth < 1024) setIsSidebarOpen(false);
  };

  const loadSession = (id: string, allSessions = sessions) => {
    const session = allSessions.find(s => s.id === id);
    if (session) {
      setCurrentSessionId(id);
      setMessages(session.messages);
      
      // Restart Gemini with context from this session
      // We exclude the very last model message if it was an error, but generally pass all
      const historyForAi = session.messages.filter(m => m.id !== 'intro'); // Skip the hardcoded intro for API context if preferred, or keep it. keeping it usually helps context.
      geminiService.startChat(historyForAi);
    }
  };

  const handleDeleteSession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const newSessions = sessions.filter(s => s.id !== id);
    setSessions(newSessions);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSessions));

    if (currentSessionId === id) {
      if (newSessions.length > 0) {
        loadSession(newSessions[0].id, newSessions);
      } else {
        startNewChat();
      }
    }
  };

  const updateCurrentSession = (newMessages: Message[]) => {
    if (!currentSessionId) return;

    setSessions(prev => prev.map(session => {
      if (session.id === currentSessionId) {
        // Generate a smart title based on the first user message if it's still the default title
        let title = session.title;
        if (session.title === 'New Strategy Session' && newMessages.length > 1) {
          const firstUserMsg = newMessages.find(m => m.role === 'user');
          if (firstUserMsg) {
            title = firstUserMsg.text.slice(0, 30) + (firstUserMsg.text.length > 30 ? '...' : '');
          }
        }

        return {
          ...session,
          messages: newMessages,
          title: title,
          lastModified: Date.now()
        };
      }
      return session;
    }));
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || isTyping) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: inputText.trim(),
      timestamp: new Date(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    updateCurrentSession(updatedMessages);
    
    setInputText('');
    setIsTyping(true);
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    // Create a placeholder for the AI response
    const aiMessageId = (Date.now() + 1).toString();
    const loadingMessage: Message = {
      id: aiMessageId,
      role: 'model',
      text: '',
      timestamp: new Date(),
      isTyping: true,
    };

    setMessages(prev => [...prev, loadingMessage]);

    try {
      const stream = geminiService.sendMessageStream(userMessage.text);
      let accumulatedText = '';

      for await (const chunk of stream) {
        accumulatedText += chunk;
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === aiMessageId
              ? { ...msg, text: accumulatedText }
              : msg
          )
        );
      }
      
      // Finalize message
      const finalMessages = [...updatedMessages, { ...loadingMessage, text: accumulatedText, isTyping: false }];
      setMessages(finalMessages);
      updateCurrentSession(finalMessages);

    } catch (error) {
      console.error("Failed to send message", error);
      const errorMsg = "**System Error:** Connection lost. Try again.";
      setMessages((prev) =>
          prev.map((msg) =>
            msg.id === aiMessageId
              ? { ...msg, text: errorMsg, isTyping: false }
              : msg
          )
        );
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex h-full bg-slate-950 text-slate-100">
      {/* Sidebar */}
      <Sidebar 
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={(id) => loadSession(id)}
        onNewChat={startNewChat}
        onDeleteSession={handleDeleteSession}
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full w-full relative transition-all duration-300">
        
        {/* Header */}
        <header className="h-16 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-4 sticky top-0 z-30">
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 hover:bg-slate-800 rounded-lg lg:hidden transition-colors"
            >
              <Menu className="w-6 h-6 text-slate-300" />
            </button>
            <div className="flex items-center space-x-2">
               <span className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)] animate-pulse"></span>
               <span className="font-semibold text-slate-100 text-sm sm:text-base">AIR 1 Mentor</span>
            </div>
          </div>
          
          {currentSessionId && (
             <div className="hidden sm:block px-3 py-1 bg-slate-800/50 rounded-full border border-slate-700/50">
               <span className="text-xs text-slate-400 font-mono">Session ID: {currentSessionId.slice(-4)}</span>
             </div>
          )}
        </header>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 sm:p-6 scroll-smooth">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex w-full ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`flex max-w-[90%] sm:max-w-[80%] lg:max-w-[70%] space-x-3 ${
                  msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : 'flex-row'
                }`}
              >
                {/* Avatar */}
                <div className={`flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shadow-lg ${
                  msg.role === 'user' 
                    ? 'bg-indigo-600' 
                    : 'bg-gradient-to-br from-slate-700 to-slate-900 border border-slate-600'
                }`}>
                   {msg.role === 'user' ? (
                     <UserIcon className="w-5 h-5 text-white" />
                   ) : (
                     <Bot className="w-5 h-5 text-indigo-400" />
                   )}
                </div>

                {/* Message Bubble */}
                <div className={`group relative px-4 py-3 sm:px-6 sm:py-4 rounded-2xl shadow-sm text-sm sm:text-base ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-tr-none'
                    : 'bg-slate-800/60 border border-slate-700/50 text-slate-200 rounded-tl-none backdrop-blur-sm'
                }`}>
                  {msg.role === 'model' ? (
                     <div className="min-h-[20px]">
                       <MarkdownRenderer content={msg.text} />
                       {msg.isTyping && msg.text.length === 0 && (
                         <span className="flex items-center space-x-1 h-6">
                           <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                           <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                           <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                         </span>
                       )}
                     </div>
                  ) : (
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                  )}
                  <span className={`text-[10px] absolute bottom-1 opacity-0 group-hover:opacity-100 transition-opacity ${
                    msg.role === 'user' ? 'left-4 text-indigo-200' : 'right-4 text-slate-500'
                  }`}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-slate-900/90 backdrop-blur-lg border-t border-slate-800">
          <div className="max-w-4xl mx-auto relative flex items-end gap-2 bg-slate-800/50 p-2 rounded-xl border border-slate-700 focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/50 transition-all shadow-lg">
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask your AIR 1 Senior..."
              className="w-full bg-transparent text-slate-100 placeholder-slate-500 text-sm sm:text-base p-2 max-h-40 min-h-[44px] resize-none focus:outline-none custom-scrollbar"
              disabled={isTyping}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputText.trim() || isTyping}
              className={`p-2.5 rounded-lg mb-0.5 shrink-0 transition-all duration-200 ${
                inputText.trim() && !isTyping
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 hover:scale-105'
                  : 'bg-slate-700 text-slate-500 cursor-not-allowed'
              }`}
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          <p className="text-center text-[10px] text-slate-600 mt-2">
            I can make mistakes. Verify with official syllabus.
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
