"use client"

import { LogOut, MessageCircle, Settings } from "lucide-react"
import { useAuth } from "../context/AuthContext"

export default function Header() {
  const { user, logout } = useAuth()

  return (
    <header className="flex justify-between items-center px-6 py-4 bg-white border-b border-gray-200 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
          <MessageCircle className="w-6 h-6 text-white" />
        </div>
        <div>
          <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Chat App
          </div>
          <div className="text-xs text-gray-500">Stay connected</div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-3 bg-gray-50 hover:bg-gray-100 rounded-full px-4 py-2 transition-colors cursor-pointer">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center shadow-sm">
            <span className="text-white font-semibold text-sm">{user?.name?.charAt(0)?.toUpperCase() || "U"}</span>
          </div>
          <div className="hidden sm:block">
            <div className="text-sm font-semibold text-gray-900">{user?.name}</div>
            <div className="text-xs text-green-600 flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              Online
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200"
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>

          <button
            onClick={logout}
            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  )
}
