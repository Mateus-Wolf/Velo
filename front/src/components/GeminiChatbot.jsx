import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMessageSquare, FiX, FiSend, FiMaximize2, FiPlus, FiClock, FiChevronLeft, FiTrash2 } from 'react-icons/fi';
import api from '../services/api';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../store/useAuthStore';

const INIT_SIZE = { width: '384px', height: '450px' };
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

const defaultMessage = {
    id: 1,
    sender: 'bot',
    text: 'Olá! Eu sou o assistente virtual Velo. Como posso ajudar com seus agendamentos hoje?'
};



export default function GeminiChatbot() {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);

    // Sessions State
    const [sessions, setSessions] = useState(() => {
        const saved = localStorage.getItem('velo_chatbot_sessions');
        return saved ? JSON.parse(saved) : [];
    });
    const [currentSessionId, setCurrentSessionId] = useState(null);
    const [showHistory, setShowHistory] = useState(false);

    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Auth State
    const token = useAuthStore((state) => state.token);
    const user = useAuthStore((state) => state.user);

    const messagesEndRef = useRef(null);
    const modalRef = useRef(null);

    const [position, setPosition] = useState(() => {
        return localStorage.getItem('velo_chatbot_pos') || 'bottom-right';
    });
    const [dragCounter, setDragCounter] = useState(0);

    const [size, setSize] = useState(() => {
        const saved = localStorage.getItem('velo_chatbot_size');
        return saved ? JSON.parse(saved) : INIT_SIZE;
    });

    const isResizing = useRef(false);
    const resizeOrigin = useRef(null);

    // Save sessions to localStorage whenever they change
    useEffect(() => {
        localStorage.setItem('velo_chatbot_sessions', JSON.stringify(sessions));
    }, [sessions]);

    // Session Timeout & Init Logic
    useEffect(() => {
        if (!isOpen) {
            setShowHistory(false);
            return;
        }

        const now = Date.now();
        let targetSessionId = null;

        if (sessions.length > 0) {
            // Find the most recently active session
            const sortedSessions = [...sessions].sort((a, b) => b.lastActive - a.lastActive);
            const mostRecent = sortedSessions[0];

            if (now - mostRecent.lastActive > SESSION_TIMEOUT_MS) {
                // Timeout exceeded, start fresh if previous had inputs
                if (mostRecent.messages.length > 1) {
                    targetSessionId = createNewSession();
                } else {
                    // Reuse empty session
                    targetSessionId = mostRecent.id;
                    updateSessionActivity(targetSessionId);
                }
            } else {
                targetSessionId = mostRecent.id;
                updateSessionActivity(targetSessionId);
            }
        } else {
            targetSessionId = createNewSession();
        }

        setCurrentSessionId(targetSessionId);
    }, [isOpen]);

    useEffect(() => {
        if (messagesEndRef.current && !showHistory) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [sessions, currentSessionId, isOpen, showHistory]);

    if (!token || user?.role !== 'admin') return null;

    // --- Core Session Functions ---
    const createNewSession = () => {
        const newSession = {
            id: Date.now().toString(),
            title: `Chat ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
            lastActive: Date.now(),
            messages: [defaultMessage]
        };
        setSessions(prev => [newSession, ...prev]);
        setShowHistory(false);
        return newSession.id;
    };

    const updateSessionActivity = (id) => {
        setSessions(prev => prev.map(s => s.id === id ? { ...s, lastActive: Date.now() } : s));
    };

    const handleNewChatClick = () => {
        const currentActive = sessions.find(s => s.id === currentSessionId);
        if (currentActive && currentActive.messages.length <= 1) {
            // Already effectively a new chat
            setShowHistory(false);
            return;
        }
        const newId = createNewSession();
        setCurrentSessionId(newId);
    };

    const deleteSession = (idToDel, e) => {
        e.stopPropagation();
        setSessions(prev => {
            const updated = prev.filter(s => s.id !== idToDel);
            if (currentSessionId === idToDel) {
                if (updated.length > 0) {
                    setCurrentSessionId(updated[0].id);
                } else {
                    const newSess = {
                        id: Date.now().toString(),
                        title: 'Novo Chat',
                        lastActive: Date.now(),
                        messages: [defaultMessage]
                    };
                    updated.push(newSess);
                    setCurrentSessionId(newSess.id);
                }
            }
            return updated;
        });
    };

    const currentSession = sessions.find(s => s.id === currentSessionId);
    const messages = currentSession?.messages || [defaultMessage];

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || isLoading || !currentSessionId) return;

        const userText = input.trim();
        const userMsgId = Date.now();

        let newTitle = currentSession.title;
        // Auto-rename chat based on first user input if it still has default title
        if (currentSession && currentSession.messages.length === 1) {
            newTitle = userText.length > 25 ? userText.substring(0, 25) + "..." : userText;
        }

        // Optimistically add user message
        setSessions(prev => prev.map(s => {
            if (s.id === currentSessionId) {
                return {
                    ...s,
                    title: newTitle,
                    lastActive: Date.now(),
                    messages: [...s.messages, { id: userMsgId, sender: 'user', text: userText }]
                };
            }
            return s;
        }));

        setInput('');
        setIsLoading(true);

        try {
            const response = await api.post('/gemini/chat', { message: userText });

            setSessions(prev => prev.map(s => {
                if (s.id === currentSessionId) {
                    return {
                        ...s,
                        lastActive: Date.now(),
                        messages: [...s.messages, { id: Date.now(), sender: 'bot', text: response.data.reply }]
                    };
                }
                return s;
            }));
        } catch (error) {
            console.error("Gemini API Error:", error);
            setSessions(prev => prev.map(s => {
                if (s.id === currentSessionId) {
                    return {
                        ...s,
                        messages: [...s.messages, { id: Date.now(), sender: 'bot', text: 'Desculpe, ocorreu um erro ao me comunicar com o servidor.' }]
                    };
                }
                return s;
            }));
        } finally {
            setIsLoading(false);
        }
    };

    const handleDragEnd = (event, info) => {
        const x = info.point.x;
        const y = info.point.y;
        const w = window.innerWidth;
        const h = window.innerHeight;

        let newPos = '';
        if (y < h / 2) {
            newPos = x < w / 2 ? 'top-left' : 'top-right';
        } else {
            newPos = x < w / 2 ? 'bottom-left' : 'bottom-right';
        }

        if (newPos !== position) {
            setPosition(newPos);
            localStorage.setItem('velo_chatbot_pos', newPos);
        } else {
            setDragCounter(prev => prev + 1);
        }
    };

    const getContainerClass = () => {
        let classes = "fixed z-50 flex gap-4 ";
        switch (position) {
            case 'bottom-left':
                return classes + "bottom-6 left-6 flex-col-reverse items-start";
            case 'top-right':
                return classes + "top-6 right-6 flex-col items-end";
            case 'top-left':
                return classes + "top-6 left-6 flex-col items-start";
            case 'bottom-right':
            default:
                return classes + "bottom-6 right-6 flex-col-reverse items-end";
        }
    };

    // --- Resizing Logic ---
    const handleResizeStart = (e, edge) => {
        e.preventDefault();
        e.stopPropagation();
        if (showHistory) return;

        isResizing.current = true;
        resizeOrigin.current = {
            startX: e.clientX,
            startY: e.clientY,
            startW: parseInt(size.width, 10),
            startH: parseInt(size.height, 10),
            edge
        };

        const handleMouseMove = (moveEvent) => {
            if (!isResizing.current) return;
            const { startX, startY, startW, startH, edge } = resizeOrigin.current;
            const dx = moveEvent.clientX - startX;
            const dy = moveEvent.clientY - startY;

            let newW = startW;
            let newH = startH;

            if (edge.includes('right')) newW = startW + dx;
            if (edge.includes('left')) newW = startW - dx; // if dragging left edge leftwards, width increases
            if (edge.includes('bottom')) newH = startH + dy;
            if (edge.includes('top')) newH = startH - dy; // if dragging top edge upwards, height increases

            // Constraints
            newW = Math.max(280, Math.min(newW, window.innerWidth * 0.9));
            newH = Math.max(350, Math.min(newH, window.innerHeight * 0.9));

            setSize({ width: `${newW}px`, height: `${newH}px` });
        };

        const handleMouseUp = () => {
            if (isResizing.current) {
                isResizing.current = false;
                resizeOrigin.current = null;
                localStorage.setItem('velo_chatbot_size', JSON.stringify({ width: modalRef.current.style.width, height: modalRef.current.style.height }));
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            }
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    return (
        <div className={getContainerClass()}>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        ref={modalRef}
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        style={{
                            width: showHistory ? Math.max(parseInt(size.width), 320) + 'px' : size.width,
                            height: size.height,
                            overflow: 'hidden',
                            minWidth: '280px',
                            minHeight: '350px',
                            maxWidth: '90vw',
                            maxHeight: '90vh'
                        }}
                        className="bg-surface-900 rounded-2xl shadow-2xl flex flex-col border border-surface-700 relative text-surface-50"
                    >
                        {!showHistory && (
                            <>
                                {/* Resize Handles */}
                                <div className="absolute top-0 left-0 right-0 h-2 cursor-ns-resize z-20" onMouseDown={(e) => handleResizeStart(e, 'top')} />
                                <div className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize z-20" onMouseDown={(e) => handleResizeStart(e, 'bottom')} />
                                <div className="absolute top-0 bottom-0 left-0 w-2 cursor-ew-resize z-20" onMouseDown={(e) => handleResizeStart(e, 'left')} />
                                <div className="absolute top-0 bottom-0 right-0 w-2 cursor-ew-resize z-20" onMouseDown={(e) => handleResizeStart(e, 'right')} />
                                <div className="absolute top-0 left-0 w-4 h-4 cursor-nwse-resize z-30" onMouseDown={(e) => handleResizeStart(e, 'top-left')} />
                                <div className="absolute top-0 right-0 w-4 h-4 cursor-nesw-resize z-30" onMouseDown={(e) => handleResizeStart(e, 'top-right')} />
                                <div className="absolute bottom-0 left-0 w-4 h-4 cursor-nesw-resize z-30" onMouseDown={(e) => handleResizeStart(e, 'bottom-left')} />
                                <div className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize z-30" onMouseDown={(e) => handleResizeStart(e, 'bottom-right')} />
                            </>
                        )}

                        {/* Header */}
                        <div className="bg-brand-600 p-4 text-white flex justify-between items-center shadow-md z-10 shrink-0 rounded-t-2xl">
                            <div className="flex items-center gap-2 max-w-[60%]">
                                {showHistory ? (
                                    <button
                                        onClick={() => setShowHistory(false)}
                                        className="text-brand-100 hover:text-white transition-colors p-1 rounded-full hover:bg-brand-700 -ml-2"
                                    >
                                        <FiChevronLeft className="w-5 h-5" />
                                    </button>
                                ) : (
                                    <FiMessageSquare className="w-5 h-5 text-brand-100 shrink-0" />
                                )}
                                <span className="font-semibold text-sm truncate" title={showHistory ? 'Histórico de Chats' : currentSession?.title || 'Assistente Velo'}>
                                    {showHistory ? 'Histórico de Chats' : currentSession?.title || 'Assistente Velo'}
                                </span>
                            </div>
                            <div className="flex items-center gap-1">
                                {!showHistory && (
                                    <>
                                        <button
                                            onClick={() => setShowHistory(true)}
                                            title="Ver Histórico"
                                            className="text-brand-100 hover:text-white transition-colors p-1.5 rounded-full hover:bg-brand-700"
                                        >
                                            <FiClock className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={handleNewChatClick}
                                            title="Novo Chat"
                                            className="text-brand-100 hover:text-white transition-colors p-1.5 rounded-full hover:bg-brand-700"
                                        >
                                            <FiPlus className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => {
                                                setSize(INIT_SIZE);
                                                localStorage.removeItem('velo_chatbot_size');
                                                if (modalRef.current) {
                                                    modalRef.current.style.width = INIT_SIZE.width;
                                                    modalRef.current.style.height = INIT_SIZE.height;
                                                }
                                            }}
                                            title="Resetar Tamanho"
                                            className="text-brand-100 hover:text-white transition-colors p-1.5 rounded-full hover:bg-brand-700 ml-1"
                                        >
                                            <FiMaximize2 className="w-4 h-4" />
                                        </button>
                                    </>
                                )}
                                <button
                                    onClick={() => setIsOpen(false)}
                                    title="Fechar"
                                    className="text-brand-100 hover:text-white transition-colors p-1.5 rounded-full hover:bg-brand-700"
                                >
                                    <FiX className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {showHistory ? (
                            /* History View */
                            <div className="flex-1 overflow-y-auto bg-surface-950 p-2">
                                {sessions.length === 0 && (
                                    <div className="text-center text-surface-200 mt-10 text-sm">
                                        Nenhum histórico encontrado.
                                    </div>
                                )}
                                {sessions.map(sess => (
                                    <div
                                        key={sess.id}
                                        onClick={() => {
                                            setCurrentSessionId(sess.id);
                                            setShowHistory(false);
                                        }}
                                        className={`p-3 mb-2 rounded-xl cursor-pointer transition-colors border flex justify-between items-center group
                                            ${currentSessionId === sess.id
                                                ? 'bg-surface-800 border-brand-500 ring-1 ring-brand-500'
                                                : 'bg-surface-900 border-surface-700 hover:bg-surface-800'}`}
                                    >
                                        <div className="flex-1 min-w-0 pr-2">
                                            <p className="font-medium text-surface-50 text-sm truncate">
                                                {sess.title}
                                            </p>
                                            <p className="text-xs text-surface-100 opacity-80 mt-1">
                                                {new Date(sess.lastActive).toLocaleDateString()} às {new Date(sess.lastActive).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                            <p className="text-xs text-surface-200 opacity-60 mt-0.5">
                                                {sess.messages.length} msg(s)
                                            </p>
                                        </div>
                                        <button
                                            onClick={(e) => deleteSession(sess.id, e)}
                                            className="text-surface-200 opacity-0 group-[.group:hover]:opacity-100 hover:text-red-500 transition-opacity p-2"
                                            title="Apagar conversa"
                                        >
                                            <FiTrash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <>
                                {/* Chat Body */}
                                <div className="flex-1 p-4 overflow-y-auto bg-surface-950 flex flex-col gap-3 min-h-[100px]">
                                    {messages.map((msg) => (
                                        <div
                                            key={msg.id}
                                            className={`flex w-full ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                                        >
                                            <div
                                                className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${msg.sender === 'user'
                                                    ? 'bg-brand-600 text-white rounded-br-none shadow-sm'
                                                    : 'bg-surface-900 border border-surface-700 text-surface-50 rounded-bl-none shadow-md'
                                                    }`}
                                            >
                                                {msg.text}
                                            </div>
                                        </div>
                                    ))}

                                    <div ref={messagesEndRef} />
                                </div>

                                {/* Input Footer */}
                                <div className="p-3 bg-surface-900 border-t border-surface-700 shrink-0">
                                    <form onSubmit={handleSend} className="flex gap-2 relative">
                                        <input
                                            type="text"
                                            value={input}
                                            onChange={(e) => setInput(e.target.value)}
                                            placeholder="Digite sua mensagem..."
                                            className="flex-1 bg-surface-950 text-surface-50 placeholder-surface-200/50 text-sm rounded-full py-2.5 pl-4 pr-12 focus:outline-none focus:ring-2 focus:ring-brand-500 border border-transparent focus:border-transparent transition-all"
                                            disabled={isLoading}
                                        />
                                        <button
                                            type="submit"
                                            disabled={isLoading || !input.trim()}
                                            className="absolute right-1 top-1 bottom-1 w-9 flex items-center justify-center text-white bg-brand-600 hover:bg-brand-500 rounded-full disabled:opacity-50 disabled:bg-surface-700 transition-colors"
                                        >
                                            <FiSend className="w-4 h-4 ml-[-2px]" />
                                        </button>
                                    </form>
                                </div>
                            </>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Floating Button */}
            <motion.button
                key={position + '-' + dragCounter}
                drag
                dragMomentum={false}
                onDragEnd={handleDragEnd}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(!isOpen)}
                title="Arrastar ou Clicar"
                className="w-14 h-14 bg-brand-600 text-white rounded-full shadow-lg shadow-brand-600/30 flex items-center justify-center hover:shadow-brand-600/50 transition-shadow focus:outline-none shrink-0"
            >
                {isOpen ? <FiX className="w-6 h-6" /> : <FiMessageSquare className="w-6 h-6" />}
            </motion.button>
        </div>
    );
}

