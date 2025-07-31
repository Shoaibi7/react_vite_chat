import { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ selectedConversation, setSelectedConversation }) {
  const [users, setUsers] = useState([]);
  const { user } = useAuth();

  useEffect(() => {
    api.get('/api/users')
      .then(res => setUsers(res.data))
      .catch(err => console.error('Failed to load users', err));
  }, []);

  const handleSelectUser = async (otherUser) => {
    try {
      const res = await api.post('/api/conversations', {
        type: 'private',
        user_ids: [otherUser.id],
        created_by: user.id,
      });
      setSelectedConversation(res.data.data);
    } catch (err) {
      console.error('Conversation creation failed', err.response?.data || err.message);
    }
  };

  return (
    <aside className="w-full md:w-64 border-r bg-white overflow-y-auto">
      <div className="p-4 font-semibold text-lg border-b">Users</div>
      {users.map((u) => (
        <div
          key={u.id}
          onClick={() => handleSelectUser(u)}
          className={`cursor-pointer px-4 py-3 hover:bg-blue-50 ${
            selectedConversation?.users?.some(us => us.id === u.id) ? 'bg-blue-100' : ''
          }`}
        >
          <div className="font-medium text-gray-800">{u.name}</div>
          <div className="text-sm text-gray-500 truncate">Click to chat</div>
        </div>
      ))}
    </aside>
  );
}
