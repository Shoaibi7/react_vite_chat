"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { Send, Paperclip, Smile, MoreVertical, X, File, Download } from "lucide-react"
import api from "../api/client"
import { useAuth } from "../context/AuthContext"
import { getEcho } from "../echo"
import "emoji-picker-element"

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/jpg"]

export default function Chat({ selectedConversation }) {
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [typingUsers, setTypingUsers] = useState([])
  const [newMessage, setNewMessage] = useState("")
  const [isTyping, setIsTyping] = useState(false)

  // attachments
  const [files, setFiles] = useState([])
  const [previews, setPreviews] = useState([])
  const fileInputRef = useRef(null)

  // input & emoji picker
  const inputRef = useRef(null)
  const [showPicker, setShowPicker] = useState(false)
  const pickerWrapperRef = useRef(null)

  // helpers
  const messagesEndRef = useRef(null)
  const typingTimeoutRef = useRef(null)
  const typingTimersRef = useRef({})

  // Load messages + mark as read
  useEffect(() => {
    if (!selectedConversation) {
      setMessages([])
      return
    }
    ;(async () => {
      try {
        const res = await api.get(`/api/conversations/${selectedConversation.id}/messages`)
        setMessages(res.data.data || res.data.messages || [])
        await api.post(`/api/conversations/${selectedConversation.id}/read`)
      } catch (e) {
        console.error("Fetch messages/read failed", e.response?.data || e.message)
      }
    })()

    setFiles([])
    setPreviews([])
    setNewMessage("")
    setShowPicker(false)
  }, [selectedConversation])

  // Echo subscription
  useEffect(() => {
    const echo = getEcho()
    if (!echo || !selectedConversation) return
    const channelName = `conversation.${selectedConversation.id}`
    const channel = echo.private(channelName)

    const onMessage = (e) => {
      if (!e?.message) return
      setMessages((prev) => (prev.some((m) => m.id === e.message.id) ? prev : [...prev, e.message]))
      if (e.message?.user?.id) {
        setTypingUsers((prev) => prev.filter((u) => u.id !== e.message.user.id))
        const tid = typingTimersRef.current[e.message.user.id]
        if (tid) {
          clearTimeout(tid)
          delete typingTimersRef.current[e.message.user.id]
        }
      }
    }

    const onTyping = (e) => {
      if (!e?.user) return
      if (e.user.id === user.id) return
      if (typingTimersRef.current[e.user.id]) {
        clearTimeout(typingTimersRef.current[e.user.id])
        delete typingTimersRef.current[e.user.id]
      }
      setTypingUsers((prev) => {
        if (e.is_typing) {
          return prev.some((u) => u.id === e.user.id) ? prev : [...prev, e.user]
        }
        return prev.filter((u) => u.id !== e.user.id)
      })
      if (e.is_typing) {
        typingTimersRef.current[e.user.id] = setTimeout(() => {
          setTypingUsers((prev) => prev.filter((u) => u.id !== e.user.id))
          delete typingTimersRef.current[e.user.id]
        }, 6000)
      }
    }

    channel.listen(".MessageSent", onMessage)
    channel.listen(".UserTyping", onTyping)
    channel.subscribed(() => console.log("Subscribed to", channelName))

    return () => {
      channel.stopListening(".MessageSent")
      channel.stopListening(".UserTyping")
      echo.leave(channelName)
      Object.values(typingTimersRef.current).forEach(clearTimeout)
      typingTimersRef.current = {}
    }
  }, [selectedConversation, user])

  useLayoutEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    if (!showPicker) return
    const handler = (e) => {
      const inPicker = pickerWrapperRef.current && pickerWrapperRef.current.contains(e.target)
      const inButton = e.target.closest?.('[data-emoji-button="true"]')
      if (!inPicker && !inButton) setShowPicker(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [showPicker])

  useEffect(() => {
    if (!showPicker) return
    const el = pickerWrapperRef.current?.querySelector("emoji-picker")
    if (!el) return
    const onEmojiClick = (ev) => {
      const sym = ev.detail?.unicode || ""
      if (sym) insertEmojiAtCaret(sym)
    }
    el.addEventListener("emoji-click", onEmojiClick)
    return () => el.removeEventListener("emoji-click", onEmojiClick)
  }, [showPicker, newMessage])

  const insertEmojiAtCaret = (sym) => {
    const el = inputRef.current
    const start = el?.selectionStart ?? newMessage.length
    const end = el?.selectionEnd ?? newMessage.length
    const next = newMessage.slice(0, start) + sym + newMessage.slice(end)
    setNewMessage(next)
    requestAnimationFrame(() => {
      el?.focus()
      const pos = start + sym.length
      el?.setSelectionRange(pos, pos)
    })
    handleTyping(true)
  }

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!selectedConversation) return
    const hasText = !!newMessage.trim()
    const hasFiles = files.length > 0
    if (!hasText && !hasFiles) return

    try {
      const form = new FormData()
      if (hasText) form.append("content", newMessage)
      let type = "text"
      if (hasFiles) {
        const allImages = files.every((f) => IMAGE_TYPES.includes(f.type))
        type = allImages ? "image" : "file"
        files.forEach((f) => form.append("attachments[]", f))
      }
      form.append("type", type)

      const res = await api.post(`/api/conversations/${selectedConversation.id}/messages`, form)
      const msg = res.data.data || res.data.message || res.data
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]))

      setNewMessage("")
      clearAttachments()
      setShowPicker(false)
      await api.post(`/api/conversations/${selectedConversation.id}/typing`, { is_typing: false })
      setIsTyping(false)
    } catch (err) {
      console.error("Send message failed", err.response?.data || err.message)
    }
  }

  const handleTyping = (typing) => {
    if (!selectedConversation || isTyping === typing) return
    setIsTyping(typing)
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(async () => {
      try {
        await api.post(`/api/conversations/${selectedConversation.id}/typing`, {
          is_typing: typing,
        })
      } catch (err) {
        console.error("Typing failed", err.response?.data || err.message)
      }
    }, 300)
  }

  const openFilePicker = () => fileInputRef.current?.click()

  const onFilesPicked = (e) => {
    const picked = Array.from(e.target.files || [])
    if (picked.length === 0) return
    setFiles((prev) => [...prev, ...picked])
    const newPreviews = picked.map((f) => ({
      name: f.name,
      type: f.type,
      url: IMAGE_TYPES.includes(f.type) ? URL.createObjectURL(f) : null,
    }))
    setPreviews((prev) => [...prev, ...newPreviews])
    e.target.value = ""
  }

  const removeFileAt = (idx) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx))
    setPreviews((prev) => {
      const p = [...prev]
      const removed = p.splice(idx, 1)[0]
      if (removed?.url) URL.revokeObjectURL(removed.url)
      return p
    })
  }

  const clearAttachments = () => {
    setFiles([])
    previews.forEach((p) => p.url && URL.revokeObjectURL(p.url))
    setPreviews([])
  }

  if (!selectedConversation) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Send className="w-12 h-12 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-3">Welcome to Chat App</h3>
          <p className="text-gray-600 leading-relaxed">
            Select a conversation from the sidebar to start chatting with your friends and colleagues.
          </p>
        </div>
      </div>
    )
  }

  const visibleTypingUsers = typingUsers.filter((u) => u.id !== user.id)

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Chat Header */}
      <div className="bg-white border-b border-gray-200 p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold text-lg">
                  {selectedConversation.name?.charAt(0)?.toUpperCase() || "C"}
                </span>
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 border-2 border-white rounded-full"></div>
            </div>
            <div>
              <div className="font-semibold text-gray-900 text-lg">{selectedConversation.name}</div>
              <div className="text-sm text-green-600 font-medium">
                {selectedConversation.users?.some((u) => u.is_online) ? "🟢 Online" : "⚫ Offline"}
              </div>
            </div>
          </div>
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="More options">
            <MoreVertical className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-gray-50 to-white">
        {messages.map((m) => {
          const mine = (m.user?.id ?? m.user_id) === user.id
          const atts = Array.isArray(m.attachments) ? m.attachments : []
          const imageAttachments = atts.filter((a) => a.type && a.type.startsWith("image/"))
          const fileAttachments = atts.filter((a) => !(a.type && a.type.startsWith("image/")))
          const hasText = m.content && m.content.trim()
          const hasImages = imageAttachments.length > 0
          const hasFiles = fileAttachments.length > 0

          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`flex space-x-3 max-w-xs lg:max-w-md ${mine ? "flex-row-reverse space-x-reverse" : ""}`}>
                <div className="w-8 h-8 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs font-semibold">
                    {(m.user?.name || "U").charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex flex-col">
                  <div
                    className={`shadow-sm overflow-hidden ${
                      // If only images (no text, no files), use minimal padding and rounded corners
                      hasImages && !hasText && !hasFiles
                        ? `rounded-2xl ${mine ? "bg-gradient-to-r from-blue-500 to-purple-600" : "bg-white border border-gray-200"}`
                        : // Regular message bubble styling
                          `rounded-2xl px-4 py-3 ${mine ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white" : "bg-white text-gray-900 border border-gray-200"}`
                    }`}
                  >
                    {/* Images - Show first, full width if no text */}
                    {hasImages && (
                      <div className={`${hasText || hasFiles ? "mb-3" : ""}`}>
                        {imageAttachments.length === 1 ? (
                          // Single image - show full width
                          <a href={imageAttachments[0].url} target="_blank" rel="noreferrer" className="group block">
                            <img
                              src={imageAttachments[0].url || "/placeholder.svg"}
                              alt={imageAttachments[0].name || "image"}
                              className={`w-full object-cover group-hover:opacity-90 transition-opacity ${
                                hasText || hasFiles ? "rounded-lg max-h-64" : "rounded-2xl max-h-80"
                              }`}
                            />
                          </a>
                        ) : (
                          // Multiple images - grid layout
                          <div
                            className={`grid gap-1 ${imageAttachments.length === 2 ? "grid-cols-2" : imageAttachments.length === 3 ? "grid-cols-2" : "grid-cols-2"}`}
                          >
                            {imageAttachments.slice(0, 4).map((a, idx) => (
                              <a key={idx} href={a.url} target="_blank" rel="noreferrer" className="group relative">
                                <img
                                  src={a.url || "/placeholder.svg"}
                                  alt={a.name || "image"}
                                  className={`w-full h-32 object-cover group-hover:opacity-90 transition-opacity ${
                                    hasText || hasFiles ? "rounded-lg" : "rounded-xl"
                                  }`}
                                />
                                {/* Show +N overlay for more than 4 images */}
                                {idx === 3 && imageAttachments.length > 4 && (
                                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-xl">
                                    <span className="text-white font-semibold text-lg">
                                      +{imageAttachments.length - 4}
                                    </span>
                                  </div>
                                )}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Text content - Show below images */}
                    {hasText && (
                      <div className={hasImages && !hasFiles ? "" : hasImages ? "mt-0" : ""}>
                        <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{m.content}</p>
                      </div>
                    )}

                    {/* File attachments - Show at bottom */}
                    {hasFiles && (
                      <div className={`${hasText || hasImages ? "mt-3" : ""} space-y-2`}>
                        {fileAttachments.map((a, idx) => (
                          <a
                            key={idx}
                            href={a.url}
                            target="_blank"
                            rel="noreferrer"
                            className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
                              mine
                                ? "bg-white/20 hover:bg-white/30 text-white"
                                : "bg-gray-50 hover:bg-gray-100 text-gray-700"
                            }`}
                          >
                            <File className="w-4 h-4" />
                            <span className="text-sm font-medium truncate">{a.name || "Download file"}</span>
                            {a.size && <span className="text-xs opacity-75">({(a.size / 1024).toFixed(0)} KB)</span>}
                            <Download className="w-3 h-3 ml-auto" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1 px-1">
                    {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            </div>
          )
        })}

        {/* Typing Indicator - keep as is */}
        {visibleTypingUsers.length > 0 && (
          <div className="flex justify-start">
            <div className="flex space-x-3 max-w-xs">
              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                <span className="text-gray-600 text-xs font-semibold">
                  {visibleTypingUsers[0].name?.charAt(0)?.toUpperCase() || "U"}
                </span>
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm">
                <div className="flex space-x-1 mb-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.1s" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  ></div>
                </div>
                <p className="text-xs text-gray-600">{visibleTypingUsers.map((u) => u.name).join(", ")} is typing...</p>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Composer */}
      <div className="bg-white border-t border-gray-200 p-4">
        {/* File Previews */}
        {previews.length > 0 && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-3">
              {previews.map((p, idx) => (
                <div
                  key={idx}
                  className="relative bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-center gap-3 shadow-sm"
                >
                  {p.url ? (
                    <img src={p.url || "/placeholder.svg"} alt={p.name} className="w-12 h-12 object-cover rounded-lg" />
                  ) : (
                    <div className="w-12 h-12 flex items-center justify-center rounded-lg bg-gradient-to-br from-gray-200 to-gray-300">
                      <File className="w-6 h-6 text-gray-600" />
                    </div>
                  )}
                  <div className="text-sm font-medium text-gray-700 max-w-[150px] truncate">{p.name}</div>
                  <button
                    type="button"
                    onClick={() => removeFileAt(idx)}
                    className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow-md transition-colors"
                    title="Remove file"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={sendMessage} className="flex items-end gap-3">
          <input ref={fileInputRef} type="file" className="hidden" multiple onChange={onFilesPicked} />

          <div className="flex-1">
            <div className="relative flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all">
              <button
                type="button"
                onClick={openFilePicker}
                className="text-gray-500 hover:text-gray-700 transition-colors"
                title="Attach files"
              >
                <Paperclip className="w-5 h-5" />
              </button>

              <input
                ref={inputRef}
                type="text"
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value)
                  handleTyping(!!e.target.value.trim())
                }}
                onFocus={() => handleTyping(true)}
                onBlur={() => !showPicker && handleTyping(false)}
                placeholder="Type your message..."
                className="flex-1 bg-transparent outline-none text-gray-900 placeholder-gray-500"
              />

              <button
                type="button"
                data-emoji-button="true"
                onClick={() => {
                  inputRef.current?.focus()
                  setShowPicker((s) => !s)
                }}
                className="text-gray-500 hover:text-gray-700 transition-colors"
                title="Add emoji"
              >
                <Smile className="w-5 h-5" />
              </button>

              {/* Emoji Picker */}
              {showPicker && (
                <div ref={pickerWrapperRef} className="absolute bottom-14 right-0 z-50">
                  <div className="shadow-2xl border border-gray-200 rounded-2xl overflow-hidden bg-white">
                    <emoji-picker></emoji-picker>
                  </div>
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={!newMessage.trim() && files.length === 0}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-400 text-white rounded-2xl p-3 shadow-lg transition-all duration-200 disabled:cursor-not-allowed"
            title="Send message"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  )
}
