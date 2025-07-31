"use client"

import { useEffect, useState } from "react"
import { Users, Search, Plus, MessageSquare, Clock } from "lucide-react"
import api from "../api/client"
import { useAuth } from "../context/AuthContext"

export default function Sidebar({ selectedConversation, setSelectedConversation }) {
  const [users, setUsers] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const { user } = useAuth()

  useEffect(() => {
    api
      .get("/api/users")
      .then((res) => setUsers(res.data))
      .catch((err) => console.error("Failed to load users", err))
  }, [])

  const handleSelectUser = async (otherUser) => {
    try {
      const res = await api.post("/api/conversations", {
        type: "private",
        user_ids: [otherUser.id],
        created_by: user.id,
      })
      setSelectedConversation(res.data.data)
    } catch (err) {
      console.error("Conversation creation failed", err.response?.data || err.message)
    }
  }

  const filteredUsers = users.filter((u) => u.name.toLowerCase().includes(searchTerm.toLowerCase()))

  return (
    <aside className="w-full md:w-80 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Sidebar Header */}
      <div className="p-6 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-lg">Chats</h2>
              <p className="text-xs text-gray-500">{users.length} contacts</p>
            </div>
          </div>
          <button className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200 group">
            <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-200" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors">
            <MessageSquare className="w-4 h-4" />
            All Chats
          </button>
          <button className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
            <Clock className="w-4 h-4" />
            Recent
          </button>
        </div>
      </div>

      {/* Users List */}
      <div className="flex-1 overflow-y-auto bg-white">
        <div className="p-2">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">No conversations found</h3>
              <p className="text-sm text-gray-500">Start a new conversation by selecting a user</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredUsers.map((u) => {
                const isSelected = selectedConversation?.users?.some((us) => us.id === u.id)
                return (
                  <div
                    key={u.id}
                    onClick={() => handleSelectUser(u)}
                    className={`cursor-pointer p-4 rounded-xl transition-all duration-200 group ${
                      isSelected
                        ? "bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 shadow-sm"
                        : "hover:bg-gray-50 border border-transparent hover:border-gray-200 hover:shadow-sm"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center shadow-md">
                          <span className="text-white font-semibold text-lg">
                            {u.name?.charAt(0)?.toUpperCase() || "U"}
                          </span>
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 border-2 border-white rounded-full shadow-sm"></div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-semibold text-gray-900 truncate">{u.name}</h3>
                          <span className="text-xs text-gray-500">2m</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-gray-500 truncate">
                            {isSelected ? "Active conversation" : "Click to start chatting"}
                          </p>
                          {!isSelected && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                          )}
                        </div>
                      </div>

                      {isSelected && (
                        <div className="flex flex-col items-center gap-1">
                          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                          <span className="text-xs text-blue-600 font-medium">Active</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Sidebar Footer */}
      <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 border-t border-gray-200">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>© 2025 Chat App</span>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Connected</span>
          </div>
        </div>
      </div>
    </aside>
  )
}
