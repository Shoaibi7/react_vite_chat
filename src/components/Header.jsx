import { LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="flex justify-between items-center px-6 py-4 bg-white border-b shadow-sm">
      <div className="text-xl font-bold text-blue-600">Chat App</div>
      <div className="flex items-center gap-4">
        <span className="text-gray-700">{user?.name}</span>
        <button onClick={logout} className="text-red-600 hover:text-red-800" title="Logout">
          <LogOut />
        </button>
      </div>
    </header>
  );
}
