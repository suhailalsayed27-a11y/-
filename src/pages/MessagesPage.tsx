import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Send, ArrowRight, MessageCircle, Loader2, Search, CheckCheck } from 'lucide-react';
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

  // تفعيل الاستماع الفوري (Realtime) للرسائل الجديدة بدلاً من التحديث المزعج (Polling)
  useEffect(() => {
    if (!profile) return;

    const channel = supabase
      .channel('public:messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const newMsg = payload.new as Message;
          
          // إذا كانت الرسالة تخص المحادثة المفتوحة حالياً، نعرضها فوراً
          if (selectedId === newMsg.conversation_id) {
            setMessages((prev) => {
              if (prev.find((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
            
            // تحديد الرسالة كمقروءة فور وصولها إذا كنت داخل المحادثة
            if (newMsg.sender_id !== profile.id) {
              supabase.from('messages').update({ read_at: new Date().toISOString() }).eq('id', newMsg.id).then();
            }
          }
          
          // تحديث قائمة المحادثات لظهور الإشعارات والرسالة الأخيرة
          loadConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile, selectedId, loadConversations]);

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
    if (!selectedId || !profile) return;
    loadMessages(selectedId);

    // جعل الرسائل مقروءة عند فتح المحادثة
    supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('conversation_id', selectedId)
      .neq('sender_id', profile.id)
      .is('read_at', null)
      .then(() => loadConversations());

  }, [selectedId, profile, loadMessages, loadConversations]);

  // نزول الشاشة التلقائي لآخر رسالة
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
      // تتم الإضافة للمصفوفة لتظهر بسرعة للمستخدم المرسل
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
          <div className="flex overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" style={{ height: 'calc(100vh - 200px)', minHeight: '500px' }}>
            
            {/* القائمة الجانبية للمحادثات */}
            <div className={`${selectedId ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-80 border-l border-slate-200 bg-white shrink-0`}>
              <div className="p-3 border-b border-slate-100 bg-[#f0f2f5]">
                <div className="relative">
                  <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="بحث أو بدء محادثة جديدة"
                    className="w-full bg-white rounded-lg pl-3 pr-10 py-2 text-sm focus:outline-none border-none shadow-sm"
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
                          isActive ? 'bg-[#f0f2f5]' : 'hover:bg-[#f5f6f6]'
                        }`}
                      >
                        {other?.avatar_url ? (
                          <img
                            src={other.avatar_url}
                            alt={other.full_name}
                            className="h-12 w-12 rounded-full object-cover shrink-0"
                            onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }}
                          />
                        ) : null}
                        <div className={`flex h-12 w-12 items-center justify-center rounded-full bg-slate-200 text-slate-500 font-bold shrink-0 ${other?.avatar_url ? 'hidden' : ''}`}>
                          {other?.full_name?.charAt(0) || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-[15px] text-slate-800 truncate">{other?.full_name || 'مستخدم'}</span>
                            {conv.lastMessage && (
                              <span className={`text-[11px] shrink-0 ${unreadCount > 0 ? 'text-[#00a884] font-bold' : 'text-slate-400'}`}>
                                {formatTime(conv.lastMessage.created_at)}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between gap-2 mt-0.5">
                            <p className="text-[13px] text-slate-500 truncate">
                              {conv.lastMessage ? (
                                conv.lastMessage.sender_id === profile.id ? 'أنت: ' : ''
                              ) : ''}
                              {conv.lastMessage?.body || conv.listing?.service_name || 'محادثة جديدة'}
                            </p>
                            {unreadCount > 0 && (
                              <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#00a884] px-1.5 text-[11px] font-bold text-white shrink-0">
                                {unreadCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* شاشة المحادثة (تصميم واتساب) */}
            {selectedId ? (
              <div className="flex flex-1 flex-col bg-[#efeae2]">
                {/* رأس المحادثة */}
                <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-2.5 bg-[#f0f2f5] shadow-sm z-10">
                  <button
                    onClick={() => setSelectedId(null)}
                    className="md:hidden text-slate-500 hover:text-slate-700 p-1"
                  >
                    <ArrowRight size={22} />
                  </button>
                  {otherUser?.avatar_url ? (
                    <img
                      src={otherUser.avatar_url}
                      alt={otherUser.full_name}
                      className="h-10 w-10 rounded-full object-cover"
                      onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }}
                    />
                  ) : null}
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-slate-300 text-slate-600 font-bold ${otherUser?.avatar_url ? 'hidden' : ''}`}>
                    {otherUser?.full_name?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[15px] text-slate-800 truncate">{otherUser?.full_name}</p>
                    {selectedConv?.listing && (
                      <p className="text-[12px] text-slate-500 truncate">{selectedConv.listing.service_name}</p>
                    )}
                  </div>
                </div>

                {/* منطقة الرسائل */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
                  {loadingMessages ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 size={24} className="animate-spin text-slate-400" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center mt-10">
                      <div className="bg-[#fff5c4] text-slate-700 text-xs px-4 py-2 rounded-lg shadow-sm">
                        هذه المحادثة مشفرة ومؤمنة. ابدأ بإرسال رسالتك الأولى الآن.
                      </div>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isMine = msg.sender_id === profile.id;
                      return (
                        <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                          <div
                            className={`max-w-[80%] md:max-w-[65%] px-3 py-1.5 text-[14px] shadow-sm relative ${
                              isMine
                                ? 'bg-[#dcf8c6] text-slate-900 rounded-2xl rounded-tl-sm'
                                : 'bg-white text-slate-900 rounded-2xl rounded-tr-sm'
                            }`}
                          >
                            <p className="leading-relaxed whitespace-pre-wrap break-words">{msg.body}</p>
                            <div className="flex items-center justify-end gap-1 mt-0.5 float-left mr-3">
                              <span className="text-[10px] text-slate-500">
                                {formatTime(msg.created_at)}
                              </span>
                              {isMine && <CheckCheck size={14} className={msg.read_at ? 'text-sky-500' : 'text-slate-400'} />}
                            </div>
                            {/* Clear float */}
                            <div className="clear-both"></div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* صندوق الإدخال والإرسال */}
                <div className="bg-[#f0f2f5] px-4 py-3 flex items-center gap-2">
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
                    className="flex-1 rounded-full px-4 py-2.5 text-sm focus:outline-none border-none shadow-sm"
                    dir="rtl"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!newMessage.trim() || sending}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-[#00a884] text-white transition-colors hover:bg-[#008f6f] disabled:opacity-50 disabled:cursor-not-allowed shrink-0 shadow-sm"
                  >
                    {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} className="rotate-180 -ml-1" />}
                  </button>
                </div>
              </div>
            ) : (
              <div className="hidden md:flex flex-1 flex-col items-center justify-center text-center bg-[#efeae2]">
                <div className="w-64 h-64 opacity-20 mb-6 bg-[url('https://cdn-icons-png.flaticon.com/512/1041/1041916.png')] bg-contain bg-no-repeat bg-center"></div>
                <h2 className="text-2xl text-slate-600 font-light mb-2">تطبيق مهرة للمراسلة</h2>
                <p className="text-slate-500 text-sm">اختر محادثة لعرض الرسائل الفورية والتواصل مع العملاء</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}