import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Send, ArrowRight, MessageCircle, Loader2, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { Conversation, Message, Profile } from '@/types';

export default function MessagesPage() {
  const { profile, session, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!loading && !session) {
      navigate('/auth/signin', { state: { from: '/messages' } });
    }
  }, [session, loading, navigate]);

  const loadConversations = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('conversations')
      .select('*, listing:listings(*), user1:profiles!conversations_user1_id_fkey(*), user2:profiles!conversations_user2_id_fkey(*)')
      .or(`user1_id.eq.${profile.id},user2_id.eq.${profile.id}`)
      .order('updated_at', { ascending: false });

    const convs = (data as Conversation[]) || [];

    // Fetch last message and unread count for each conversation
    const withLast = await Promise.all(
      convs.map(async (conv) => {
        const [lastMsgRes, unreadRes] = await Promise.all([
          supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .neq('sender_id', profile.id)
            .is('read_at', null),
        ]);
        return { ...conv, lastMessage: lastMsgRes.data as Message | undefined, unreadCount: unreadRes.count || 0 };
      })
    );
    setConversations(withLast);
    setLoadingConversations(false);
  }, [profile]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Auto-open conversation from query param
  useEffect(() => {
    const convId = searchParams.get('conv');
    if (convId && conversations.length > 0) {
      setSelectedId(convId);
    }
  }, [searchParams, conversations]);

  const loadMessages = useCallback(async (convId: string) => {
    setLoadingMessages(true);
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });
    setMessages((data as Message[]) || []);
    setLoadingMessages(false);
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    loadMessages(selectedId);

    // Mark unread messages as read
    if (profile) {
      supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('conversation_id', selectedId)
        .neq('sender_id', profile.id)
        .is('read_at', null)
        .then(() => loadConversations());
    }

    // Poll for new messages every 5 seconds
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => loadMessages(selectedId), 5000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [selectedId, profile, loadMessages, loadConversations]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedId || !profile) return;
    setSending(true);
    const body = newMessage.trim();
    setNewMessage('');

    const { data } = await supabase
      .from('messages')
      .insert({
        conversation_id: selectedId,
        sender_id: profile.id,
        body,
      })
      .select('*')
      .single();

    if (data) {
      setMessages((prev) => [...prev, data as Message]);
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', selectedId);
      loadConversations();
    }
    setSending(false);
  };

  if (!session || !profile) return null;

  const getOtherUser = (conv: Conversation): Profile | undefined => {
    return conv.user1_id === profile.id ? conv.user2 : conv.user1;
  };

  const selectedConv = conversations.find((c) => c.id === selectedId);
  const otherUser = selectedConv ? getOtherUser(selectedConv) : undefined;

  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery.trim()) return true;
    const other = getOtherUser(conv);
    return other?.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    if (diffHours < 24) {
      return date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="pb-20 md:pb-8">
      <div className="mx-auto max-w-5xl px-4 py-6">
        <h1 className="text-xl font-black text-slate-800 mb-4">الرسائل</h1>

        {conversations.length === 0 && !loadingConversations ? (
          <div className="card p-12 text-center">
            <MessageCircle size={48} className="mx-auto text-slate-300 mb-4" />
            <p className="text-slate-400 text-lg font-bold mb-1">لا توجد محادثات بعد</p>
            <p className="text-sm text-slate-400">
              ابدأ بالتواصل مع مقدم الخدمة من صفحة الخدمة
            </p>
          </div>
        ) : (
          <div className="flex overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" style={{ height: 'calc(100vh - 200px)', minHeight: '400px' }}>
            {/* Conversation list */}
            <div className={`${selectedId ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-80 border-l border-slate-100 shrink-0`}>
              <div className="p-3 border-b border-slate-100">
                <div className="relative">
                  <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="بحث في المحادثات..."
                    className="input-field !py-2 !text-sm !pr-10"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {loadingConversations ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 size={24} className="animate-spin text-slate-300" />
                  </div>
                ) : (
                  filteredConversations.map((conv) => {
                    const other = getOtherUser(conv);
                    const isActive = conv.id === selectedId;
                    const unreadCount = (conv as Conversation & { unreadCount?: number }).unreadCount || 0;
                    return (
                      <button
                        key={conv.id}
                        onClick={() => setSelectedId(conv.id)}
                        className={`flex w-full items-center gap-3 px-4 py-3 text-right transition-colors border-b border-slate-50 ${
                          isActive ? 'bg-primary-50' : 'hover:bg-slate-50'
                        }`}
                      >
                        {other?.avatar_url ? (
                          <img
                            src={other.avatar_url}
                            alt={other.full_name}
                            className="h-11 w-11 rounded-full object-cover shrink-0"
                            onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }}
                          />
                        ) : null}
                        <div className={`flex h-11 w-11 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700 shrink-0 ${other?.avatar_url ? 'hidden' : ''}`}>
                          {other?.full_name?.charAt(0) || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-sm text-slate-800 truncate">{other?.full_name || 'مستخدم'}</span>
                            {conv.lastMessage && (
                              <span className="text-[10px] text-slate-400 shrink-0">{formatTime(conv.lastMessage.created_at)}</span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 truncate mt-0.5">
                            {conv.lastMessage ? (
                              conv.lastMessage.sender_id === profile.id ? 'أنت: ' : ''
                            ) : ''}
                            {conv.lastMessage?.body || conv.listing?.service_name || 'محادثة جديدة'}
                          </p>
                        </div>
                        {unreadCount > 0 && (
                          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-600 px-1.5 text-[10px] font-bold text-white">
                            {unreadCount}
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Chat view */}
            {selectedId ? (
              <div className="flex flex-1 flex-col">
                {/* Chat header */}
                <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
                  <button
                    onClick={() => setSelectedId(null)}
                    className="md:hidden text-slate-400 hover:text-slate-600"
                  >
                    <ArrowRight size={20} />
                  </button>
                  {otherUser?.avatar_url ? (
                    <img
                      src={otherUser.avatar_url}
                      alt={otherUser.full_name}
                      className="h-10 w-10 rounded-full object-cover"
                      onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }}
                    />
                  ) : null}
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700 ${otherUser?.avatar_url ? 'hidden' : ''}`}>
                    {otherUser?.full_name?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-slate-800 truncate">{otherUser?.full_name}</p>
                    {selectedConv?.listing && (
                      <p className="text-xs text-slate-400 truncate">{selectedConv.listing.service_name}</p>
                    )}
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-slate-50/50">
                  {loadingMessages ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 size={24} className="animate-spin text-slate-300" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <MessageCircle size={32} className="text-slate-300 mb-2" />
                      <p className="text-sm text-slate-400">ابدأ المحادثة بإرسال رسالة</p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isMine = msg.sender_id === profile.id;
                      return (
                        <div key={msg.id} className={`flex ${isMine ? 'justify-start' : 'justify-end'}`}>
                          <div
                            className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                              isMine
                                ? 'bg-primary-600 text-white rounded-bl-md'
                                : 'bg-white text-slate-800 rounded-br-md ring-1 ring-slate-100'
                            }`}
                          >
                            <p className="leading-relaxed whitespace-pre-wrap break-words">{msg.body}</p>
                            <span className={`block text-[10px] mt-1 ${isMine ? 'text-primary-200' : 'text-slate-400'}`}>
                              {formatTime(msg.created_at)}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="border-t border-slate-100 p-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      placeholder="اكتب رسالة..."
                      className="input-field flex-1 !py-2.5"
                      dir="rtl"
                    />
                    <button
                      onClick={handleSend}
                      disabled={!newMessage.trim() || sending}
                      className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-600 text-white transition-colors hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                    >
                      {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="hidden md:flex flex-1 flex-col items-center justify-center text-center">
                <MessageCircle size={48} className="text-slate-200 mb-3" />
                <p className="text-slate-400 font-bold">اختر محادثة لعرض الرسائل</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
