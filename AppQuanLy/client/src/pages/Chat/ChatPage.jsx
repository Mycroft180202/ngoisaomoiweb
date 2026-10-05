import toast from 'react-hot-toast';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useConfirm } from '../../contexts/ConfirmContext';
import api, { getSocketConfig } from '../../services/api';
import { getInitials, timeAgo } from '../../utils/helpers';
import {
  MessageSquare, Send, Hash, Users, Paperclip, Archive, BellRing,
  FileText, X, Circle, MoreHorizontal
} from 'lucide-react';

const getConversationKey = (channel, targetUser, user) => {
  if (channel === 'direct' && targetUser) return `direct:${targetUser._id}`;
  if (channel === 'department') return `department:${user?.department}`;
  return 'general';
};

export default function ChatPage() {
  const { user } = useAuth();
  const confirm = useConfirm();
  const [activeChannel, setActiveChannel] = useState('general');
  const [targetUser, setTargetUser] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [inputContent, setInputContent] = useState('');
  const [files, setFiles] = useState([]);
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});
  const [socketReady, setSocketReady] = useState(false);

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const activeRef = useRef({ activeChannel, targetUser });
  const typingTimerRef = useRef(null);

  const activeConversationKey = getConversationKey(activeChannel, targetUser, user);

  const playChatChime = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const now = audioCtx.currentTime;
      const gain = audioCtx.createGain();
      const osc = audioCtx.createOscillator();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, now);
      osc.frequency.setValueAtTime(987.77, now + 0.1);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
      osc.start(now);
      osc.stop(now + 0.42);
    } catch {
      // browser may block sound until user interaction
    }
  };

  useEffect(() => {
    activeRef.current = { activeChannel, targetUser };
  }, [activeChannel, targetUser]);

  useEffect(() => {
    loadConversations();
    loadMessages();
  }, [activeChannel, targetUser]);

  useEffect(() => {
    if (!user?._id) return;
    let isMounted = true;

    import('socket.io-client').then(({ io }) => {
      if (!isMounted) return;
      const { url, options } = getSocketConfig();
      const socket = io(url, options);
      socketRef.current = socket;

      socket.on('connect', () => {
        setSocketReady(true);
        socket.emit('join', user._id);
        joinChatRoom(activeRef.current.activeChannel, activeRef.current.targetUser);
      });

      socket.on('chat:new_message', (message) => {
        const isMine = message.sender?._id === user._id;
        const current = activeRef.current;
        const belongsToActive = isMessageInConversation(message, current.activeChannel, current.targetUser);
        if (belongsToActive) {
          setMessages(prev => prev.some(item => item._id === message._id) ? prev : [...prev, message]);
          markRead(current.activeChannel, current.targetUser);
          scrollToBottom();
          if (!isMine) playChatChime();
        } else if (!isMine) {
          playChatChime();
          toast.custom(() => (
            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--primary)', color: 'var(--text-primary)', borderRadius: 8, padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'center', boxShadow: 'var(--shadow-lg)' }}>
              <BellRing size={18} style={{ color: 'var(--primary)' }} />
              <div>
                <div style={{ fontWeight: 800 }}>{message.sender?.fullName || 'Tin nhắn mới'}</div>
                <div className="text-xs text-muted">{message.content || 'Đã gửi file đính kèm'}</div>
              </div>
            </div>
          ));
        }
        loadConversations();
      });

      socket.on('chat:new_direct_message', (message) => {
        if (message && isMessageInConversation(message, activeRef.current.activeChannel, activeRef.current.targetUser)) {
          let isNew = false;
          setMessages(prev => {
            if (prev.some(item => item._id === message._id)) return prev;
            isNew = true;
            return [...prev, message];
          });
          if (isNew) {
            scrollToBottom();
            if (message.sender?._id !== user._id) playChatChime();
          }
        }
        loadConversations();
      });

      socket.on('chat:typing', (payload) => {
        if (payload.userId === user._id) return;
        const key = payload.channel === 'direct'
          ? `direct:${payload.userId}`
          : payload.channel === 'department'
            ? `department:${payload.department}`
            : 'general';
        setTypingUsers(prev => ({ ...prev, [key]: payload.userName || 'Ai đó' }));
        setTimeout(() => {
          setTypingUsers(prev => {
            const next = { ...prev };
            delete next[key];
            return next;
          });
        }, 2500);
      });
    });

    return () => {
      isMounted = false;
      socketRef.current?.disconnect();
    };
  }, [user?._id]);

  useEffect(() => {
    joinChatRoom(activeChannel, targetUser);
  }, [activeChannel, targetUser, socketReady]);

  const isMessageInConversation = (message, channel, target) => {
    if (channel === 'general') return message.channel === 'general';
    if (channel === 'department') return message.channel === 'department' && message.department === user?.department;
    if (channel === 'direct' && target) {
      return message.channel === 'direct' && [message.sender?._id, message.receiver?._id || message.receiver].includes(target._id);
    }
    return false;
  };

  const joinChatRoom = (channel, target) => {
    if (!socketRef.current || !user?._id) return;
    socketRef.current.emit('chat:join', {
      channel,
      department: channel === 'department' ? user.department : undefined,
      receiver: channel === 'direct' ? target?._id : undefined,
      userId: user._id
    });
  };

  const loadConversations = async () => {
    try {
      const res = await api.get('/chat/conversations');
      setConversations(res.conversations || []);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  };

  const loadMessages = async () => {
    try {
      const params = { channel: activeChannel };
      if (activeChannel === 'direct' && targetUser) params.receiver = targetUser._id;
      if (activeChannel === 'department') params.department = user?.department;
      const res = await api.get('/chat/messages', params);
      setMessages(res.messages || []);
      markRead(activeChannel, targetUser);
      scrollToBottom();
    } catch (err) {
      console.error('Failed to load chat messages:', err);
    }
  };

  const markRead = async (channel, target) => {
    try {
      const payload = { channel };
      if (channel === 'direct' && target) payload.receiver = target._id;
      if (channel === 'department') payload.department = user?.department;
      await api.patch('/chat/read', payload);
      loadConversations();
    } catch {
      // silent
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const selectConversation = (conversation) => {
    if (conversation.channel === 'direct') {
      setTargetUser(conversation.user);
      setActiveChannel('direct');
    } else {
      setTargetUser(null);
      setActiveChannel(conversation.channel);
    }
  };

  const emitTyping = () => {
    if (!socketRef.current || !user?._id) return;
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      socketRef.current.emit('chat:typing', {
        channel: activeChannel,
        department: activeChannel === 'department' ? user.department : undefined,
        receiver: activeChannel === 'direct' ? targetUser?._id : undefined,
        userId: user._id,
        userName: user.fullName
      });
    }, 250);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputContent.trim() && files.length === 0) return;

    try {
      setSending(true);
      const payload = new FormData();
      payload.append('channel', activeChannel);
      payload.append('content', inputContent.trim());
      if (activeChannel === 'direct' && targetUser) payload.append('receiver', targetUser._id);
      if (activeChannel === 'department') payload.append('department', user?.department);
      files.forEach(file => payload.append('files', file));

      const res = await api.upload('/chat/send', payload);
      if (res?.message) {
        setMessages(prev => prev.some(item => item._id === res.message._id) ? prev : [...prev, res.message]);
        scrollToBottom();
      }
      setInputContent('');
      setFiles([]);
      loadConversations();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  };

  const handleArchive = async () => {
    const ok = await confirm({
      title: 'Lưu trữ cuộc trò chuyện',
      message: 'Cuộc trò chuyện này sẽ được ẩn khỏi danh sách của bạn. Tin nhắn không bị xóa với người khác.',
      confirmText: 'Lưu trữ',
      cancelText: 'Hủy',
      type: 'warning'
    });
    if (!ok) return;
    const payload = { channel: activeChannel };
    if (activeChannel === 'direct' && targetUser) payload.receiver = targetUser._id;
    if (activeChannel === 'department') payload.department = user?.department;
    await api.patch('/chat/archive', payload);
    toast.success('Đã lưu trữ cuộc trò chuyện');
    setActiveChannel('general');
    setTargetUser(null);
    loadConversations();
  };

  const openAttachment = async (message, index) => {
    try {
      const response = await fetch(`${api.baseUrl}/chat/messages/${message._id}/attachments/${index}`, {
        headers: { Authorization: `Bearer ${api.getToken()}` }
      });
      if (!response.ok) throw new Error('Không thể tải file');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (err) {
      toast.error(err.message || 'Không thể mở file');
    }
  };

  const activeConversation = useMemo(() => {
    return conversations.find(item => item.channel === activeChannel && (
      activeChannel !== 'direct' || item.user?._id === targetUser?._id
    ));
  }, [conversations, activeChannel, targetUser]);

  const typingName = typingUsers[activeConversationKey];

  return (
    <div className="animate-fadeIn" style={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
      <div className="page-header" style={{ marginBottom: 16 }}>
        <h1><MessageSquare size={24} /> Trao Đổi Nội Bộ</h1>
      </div>

      <div className="card" style={{ flex: 1, display: 'flex', overflow: 'hidden', padding: 0 }}>
        <div style={{ width: 300, borderRight: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)' }}>
          <div style={{ padding: 16, borderBottom: '1px solid var(--border-light)', fontWeight: 800, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <BellRing size={18} style={{ color: 'var(--primary)' }} /> Hội thoại
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {conversations.map(conversation => {
              const isActive = activeConversation?.id === conversation.id;
              const Icon = conversation.channel === 'general' ? Hash : conversation.channel === 'department' ? Users : MessageSquare;
              return (
                <button
                  key={conversation.id}
                  className={`nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => selectConversation(conversation)}
                  style={{
                    width: '100%',
                    justifyContent: 'flex-start',
                    gap: 10,
                    minHeight: 54,
                    border: conversation.unread ? '1px solid var(--primary)' : undefined,
                    background: conversation.unread && !isActive ? 'rgba(14, 165, 233, 0.1)' : undefined
                  }}
                >
                  {conversation.channel === 'direct' ? (
                    <div className="avatar avatar-xs" style={{ width: 28, height: 28, fontSize: '0.72rem', background: 'var(--primary)' }}>
                      {getInitials(conversation.user?.fullName)}
                    </div>
                  ) : <Icon size={18} />}
                  <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                    <span className="truncate" style={{ display: 'block', fontWeight: conversation.unread ? 900 : 700 }}>{conversation.title}</span>
                    <span className="truncate text-xs text-muted" style={{ display: 'block' }}>
                      {typingUsers[conversation.id] ? `${typingUsers[conversation.id]} đang nhắn...` : conversation.lastMessage?.content || (conversation.lastMessage?.attachments?.length ? 'Đã gửi file' : 'Chưa có tin nhắn')}
                    </span>
                  </span>
                  {conversation.unread > 0 && (
                    <span className="badge" style={{ background: 'var(--primary)', color: '#fff', borderRadius: 999 }}>{conversation.unread}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-card)' }}>
          <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
              {activeChannel === 'general' ? <Hash size={20} style={{ color: 'var(--primary)' }} /> : activeChannel === 'department' ? <Users size={20} style={{ color: 'var(--info)' }} /> : <div className="avatar avatar-sm" style={{ background: 'var(--secondary)' }}>{getInitials(targetUser?.fullName)}</div>}
              <div>
                <div className="font-semibold">{activeConversation?.title || targetUser?.fullName || 'Kênh Chung'}</div>
                <div className="text-xs text-muted">
                  {typingName ? `${typingName} đang nhắn...` : socketReady ? 'Đang hoạt động' : 'Đang kết nối'}
                </div>
              </div>
            </div>
            <button className="btn btn-icon btn-ghost btn-sm" onClick={handleArchive} title="Lưu trữ">
              <Archive size={16} />
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {messages.length === 0 ? (
              <div className="text-muted text-center" style={{ marginTop: 'auto', marginBottom: 'auto' }}>Chưa có tin nhắn nào trong cuộc trò chuyện này</div>
            ) : messages.map(msg => {
              const isMe = msg.sender?._id === user?._id;
              return (
                <div key={msg._id} style={{ display: 'flex', gap: 12, flexDirection: isMe ? 'row-reverse' : 'row' }}>
                  <div className="avatar avatar-sm" style={{ flexShrink: 0, background: isMe ? 'var(--primary)' : 'var(--bg-tertiary)' }}>
                    {getInitials(msg.sender?.fullName)}
                  </div>
                  <div style={{ maxWidth: '72%' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 2, textAlign: isMe ? 'right' : 'left' }}>
                      {msg.sender?.fullName} • {new Date(msg.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div style={{ padding: '10px 14px', borderRadius: 12, background: isMe ? 'var(--primary)' : 'var(--bg-tertiary)', color: isMe ? '#FFF' : 'var(--text-primary)', fontSize: '0.9375rem', lineHeight: 1.5, whiteSpace: 'pre-line' }}>
                      {msg.content}
                      {msg.attachments?.length > 0 && (
                        <div style={{ display: 'grid', gap: 8, marginTop: msg.content ? 10 : 0 }}>
                          {msg.attachments.map((file, index) => (
                            <button key={`${file.originalName}-${index}`} className="btn btn-ghost btn-sm" onClick={() => openAttachment(msg, index)} style={{ justifyContent: 'flex-start', color: isMe ? '#fff' : 'var(--text-primary)', borderColor: isMe ? 'rgba(255,255,255,0.35)' : undefined }}>
                              <FileText size={14} /> {file.originalName}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {typingName && <div className="text-xs text-muted">{typingName} đang nhắn...</div>}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSend} style={{ padding: 16, borderTop: '1px solid var(--border-light)', display: 'grid', gap: 10 }}>
            {files.length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {files.map((file, index) => (
                  <span key={`${file.name}-${index}`} className="badge badge-ghost" style={{ textTransform: 'none' }}>
                    <Paperclip size={13} /> {file.name}
                    <button type="button" onClick={() => setFiles(prev => prev.filter((_, i) => i !== index))} style={{ background: 'transparent', color: 'inherit', border: 0, cursor: 'pointer' }}>
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <label className="btn btn-ghost btn-icon" title="Đính kèm file">
                <Paperclip size={18} />
                <input type="file" multiple style={{ display: 'none' }} onChange={e => setFiles(Array.from(e.target.files || []).slice(0, 5))} />
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="Nhập tin nhắn..."
                value={inputContent}
                onChange={e => { setInputContent(e.target.value); emitTyping(); }}
                disabled={sending}
              />
              <button type="submit" className="btn btn-primary" disabled={sending || (!inputContent.trim() && files.length === 0)}>
                <Send size={18} /> Gửi
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
