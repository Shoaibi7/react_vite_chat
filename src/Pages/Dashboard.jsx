import { useState } from 'react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import Chat from '../components/Chat';

export default function Dashboard() {
  const [selectedConversation, setSelectedConversation] = useState(null);

  return (
    <div className="h-screen flex flex-col">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar selectedConversation={selectedConversation} setSelectedConversation={setSelectedConversation} />
        <main className="flex-1 bg-gray-50 overflow-hidden">
          <Chat selectedConversation={selectedConversation} />
        </main>
      </div>
    </div>
  );
}
