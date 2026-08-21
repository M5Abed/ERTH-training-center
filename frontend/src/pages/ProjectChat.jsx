import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';
import { useAuth } from '../contexts/AuthContext';
import { getChatMessages, sendChatMessage, getProject } from '../services/api';
import { ArrowLeft, Send, MessageCircle } from 'lucide-react';
import './ProjectChat.css';

export default function ProjectChat() {
    const { id } = useParams();
    const { lang } = useI18n();
    const { user } = useAuth();
    const [messages, setMessages] = useState([]);
    const [project, setProject] = useState(null);
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);
    const [loading, setLoading] = useState(true);
    const bottomRef = useRef(null);
    const lastIdRef = useRef(0);
    const intervalRef = useRef(null);

    const L = {
        en: { back: 'Back to Project', chat: 'Team Discussion', placeholder: 'Type a message...', empty: 'No messages yet. Be the first to say something!', today: 'Today', yesterday: 'Yesterday' },
        ar: { back: 'العودة للمشروع', chat: 'نقاش الفريق', placeholder: 'اكتب رسالة...', empty: 'لا توجد رسائل بعد. كن أول من يكتب!', today: 'اليوم', yesterday: 'أمس' },
    }[lang] || { back: 'Back to Project', chat: 'Team Discussion', placeholder: 'Type a message...', empty: 'No messages yet. Be the first to say something!', today: 'Today', yesterday: 'Yesterday' };

    // Initial load
    useEffect(() => {
        async function init() {
            const [msgs, p] = await Promise.all([getChatMessages(id), getProject(id)]);
            setMessages(msgs);
            setProject(p);
            if (msgs.length > 0) lastIdRef.current = msgs[msgs.length - 1].id;
            setLoading(false);
        }
        init();
    }, [id]);

    // Poll for new messages every 5s
    useEffect(() => {
        intervalRef.current = setInterval(async () => {
            const newMsgs = await getChatMessages(id, lastIdRef.current);
            if (newMsgs.length > 0) {
                setMessages(prev => [...prev, ...newMsgs]);
                lastIdRef.current = newMsgs[newMsgs.length - 1].id;
            }
        }, 5000);
        return () => clearInterval(intervalRef.current);
    }, [id]);

    // Auto-scroll to bottom
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        if (!text.trim() || sending) return;
        setSending(true);
        const success = await sendChatMessage(id, text.trim());
        if (success) {
            setText('');
            // Immediately fetch new messages
            const newMsgs = await getChatMessages(id, lastIdRef.current);
            if (newMsgs.length > 0) {
                setMessages(prev => [...prev, ...newMsgs]);
                lastIdRef.current = newMsgs[newMsgs.length - 1].id;
            }
        }
        setSending(false);
    };

    const formatTime = (dateStr) => {
        const d = new Date(dateStr);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatDateSep = (dateStr) => {
        const d = new Date(dateStr);
        const now = new Date();
        const diff = Math.floor((now - d) / 86400000);
        if (diff === 0) return L.today;
        if (diff === 1) return L.yesterday;
        return d.toLocaleDateString();
    };

    // Group messages by date
    const grouped = [];
    let lastDate = '';
    messages.forEach(m => {
        const date = new Date(m.created_at).toDateString();
        if (date !== lastDate) {
            grouped.push({ type: 'date', date: formatDateSep(m.created_at) });
            lastDate = date;
        }
        grouped.push({ type: 'msg', ...m });
    });

    if (loading) return <div className="loading-state"><div className="spinner" /></div>;

    return (
        <div className="chat-page">
            <div className="chat-header">
                <Link to={`/project/${id}`} className="btn btn-ghost btn-sm">
                    <ArrowLeft size={16} /> {L.back}
                </Link>
                <div className="chat-title-area">
                    <MessageCircle size={20} />
                    <h1>{L.chat}</h1>
                    {project && <span className="chat-project-name">{project.title}</span>}
                </div>
            </div>

            <div className="chat-body">
                {messages.length === 0 && (
                    <div className="chat-empty">
                        <MessageCircle size={48} />
                        <p>{L.empty}</p>
                    </div>
                )}

                {grouped.map((item, i) => {
                    if (item.type === 'date') {
                        return <div key={`d-${i}`} className="chat-date-sep"><span>{item.date}</span></div>;
                    }
                    const isMe = String(item.user_id) === String(user?.id);
                    return (
                        <div key={item.id} className={`chat-bubble-row ${isMe ? 'chat-bubble-row--me' : ''}`}>
                            {!isMe && (
                                <div className="chat-avatar">
                                    {item.sender_avatar
                                        ? <img src={item.sender_avatar} alt="" />
                                        : (item.sender_name || '?')[0].toUpperCase()
                                    }
                                </div>
                            )}
                            <div className={`chat-bubble ${isMe ? 'chat-bubble--me' : ''}`}>
                                {!isMe && <span className="chat-sender">{item.sender_name || 'Unknown'}</span>}
                                <p>{item.message}</p>
                                <span className="chat-time">{formatTime(item.created_at)}</span>
                            </div>
                        </div>
                    );
                })}
                <div ref={bottomRef} />
            </div>

            <div className="chat-input-bar">
                <input
                    type="text"
                    placeholder={L.placeholder}
                    value={text}
                    onChange={e => setText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                    disabled={sending}
                />
                <button className="chat-send-btn" onClick={handleSend} disabled={sending || !text.trim()}>
                    <Send size={18} />
                </button>
            </div>
        </div>
    );
}
