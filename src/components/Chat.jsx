import React, { useEffect, useRef, useState } from 'react';
import { Send, Paperclip, Smile, MoreVertical } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { getEcho } from '../echo';

export default function Chat({ selectedConversation }) {
    const { user } = useAuth();
    const [messages, setMessages] = useState([]);
    const [typingUsers, setTypingUsers] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef(null);
    const typingTimeoutRef = useRef(null);

    useEffect(() => {
        if (!selectedConversation) {
            setMessages([]);
            return;
        }

        const load = async () => {
            try {
                const res = await api.get(`/api/conversations/${selectedConversation.id}/messages`);
                setMessages(res.data.data || res.data.messages || []);
                await api.post(`/api/conversations/${selectedConversation.id}/read`);
            } catch (e) {
                console.error('Fetch messages/read failed', e.response?.data || e.message);
            }
        };
        load();
    }, [selectedConversation?.id]);

    useEffect(() => {
        const echo = getEcho();
        if (!echo || !selectedConversation) return;

        const channelName = `conversation.${selectedConversation.id}`;
        const channel = echo.private(channelName);

        const onMessage = (e) => {
            if (!e?.message) return;
            setMessages((prev) => (prev.some((m) => m.id === e.message.id) ? prev : [...prev, e.message]));
            setTypingUsers((prev) => prev.filter((u) => u.id !== e.message.user.id));
        };

        const onTyping = (e) => {
            if (!e?.user || e.user.id === user.id) return;
            setTypingUsers((prev) => {
                if (e.is_typing) {
                    return prev.some((u) => u.id === e.user.id) ? prev : [...prev, e.user];
                } else {
                    return prev.filter((u) => u.id !== e.user.id);
                }
            });
        };

        channel.listen('.MessageSent', onMessage);
        channel.listen('.UserTyping', onTyping);

        channel.subscribed(() => {
            console.log('Subscribed to', channelName);
        });

        return () => {
            echo.leave(channelName);
        };
    }, [selectedConversation?.id, user?.id]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, typingUsers]);

    const sendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedConversation) return;
        try {
            const res = await api.post(`/api/conversations/${selectedConversation.id}/messages`, {
                content: newMessage,
                type: 'text',
            });
            const msg = res.data.data || res.data.message || res.data;
            setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
            setNewMessage('');
            setIsTyping(false);
            await api.post(`/api/conversations/${selectedConversation.id}/typing`, {
                is_typing: false,
            });
        } catch (err) {
            console.error('Send message failed', err.response?.data || err.message);
        }
    };

    const handleTyping = (typing) => {
        if (!selectedConversation || isTyping === typing) return;
        setIsTyping(typing);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(async () => {
            try {
                await api.post(`/api/conversations/${selectedConversation.id}/typing`, {
                    is_typing: typing,
                });
            } catch (err) {
                console.error('Typing failed', err.response?.data || err.message);
            }
        }, 300);
    };

    if (!selectedConversation) {
        return (
            <div className="h-full flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Send className="w-10 h-10 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Select a conversation</h3>
                    <p className="text-gray-600">Choose a conversation from the sidebar to start chatting</p>
                </div>
            </div>
        );
    }

    const visibleTypingUsers = typingUsers.filter((u) => u.id !== user.id);

    return (
        <div className="h-full flex flex-col">
            <div className="bg-white border-b p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <img
                            src={selectedConversation.avatar || '/default-avatar.png'}
                            alt={selectedConversation.name}
                            className="w-10 h-10 rounded-full object-cover"
                        />
                        <div>
                            <div className="font-medium">{selectedConversation.name}</div>
                            <div className="text-sm text-gray-500">
                                {selectedConversation.users?.some((u) => u.is_online) ? 'Online' : 'Offline'}
                            </div>
                        </div>
                    </div>
                    <button className="p-2 hover:bg-gray-100 rounded">
                        <MoreVertical className="w-5 h-5 text-gray-600" />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {messages.map((m) => {
                    const mine = (m.user?.id ?? m.user_id) === user.id;
                    return (
                        <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                            <div className={`flex space-x-2 max-w-xs lg:max-w-md ${mine ? 'flex-row-reverse space-x-reverse' : ''}`}>
                                <img
                                    src={m.user?.avatar || '/default-avatar.png'}
                                    alt={m.user?.name || 'User'}
                                    className="w-8 h-8 rounded-full object-cover"
                                />
                                <div>
                                    <div className={`rounded-lg px-4 py-2 ${mine ? 'bg-blue-600 text-white' : 'bg-white text-gray-900 border'}`}>
                                        <p className="text-sm">{m.content}</p>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">{m.created_at}</p>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {visibleTypingUsers.length > 0 && (
                    <div className="flex justify-start">
                        <div className="flex space-x-2 max-w-xs">
                            <div className="w-8 h-8 rounded-full bg-gray-300" />
                            <div className="bg-white border rounded-lg px-4 py-2">
                                <div className="flex space-x-1">
                                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" />
                                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                                </div>
                                <p className="text-xs text-gray-600 mt-1">
                                    {visibleTypingUsers.map((u) => u.name).join(', ')} is typing...
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            <div className="bg-white border-t p-4">
                <form onSubmit={sendMessage} className="flex items-end gap-2">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-4 py-2">
                            <button type="button" className="text-gray-500 hover:text-gray-700">
                                <Paperclip className="w-5 h-5" />
                            </button>
                            <input
                                type="text"
                                value={newMessage}
                                onChange={(e) => {
                                    setNewMessage(e.target.value);
                                    handleTyping(!!e.target.value.trim());
                                }}
                                onFocus={() => handleTyping(true)}
                                onBlur={() => handleTyping(false)}
                                placeholder="Type a message..."
                                className="flex-1 bg-transparent outline-none"
                            />
                            <button type="button" className="text-gray-500 hover:text-gray-700">
                                <Smile className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={!newMessage.trim()}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg p-3"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </form>
            </div>
        </div>
    );
}
