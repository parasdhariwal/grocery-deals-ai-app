import React, { useState } from 'react';
import { ChatInterface } from './components/ChatInterface';
import { ProfileView } from './components/ProfileView';

const App: React.FC = () => {
  const [clippedIds, setClippedIds] = useState<string[]>([]);
  const [showProfile, setShowProfile] = useState(false);

  return (
    <div className="h-screen w-full flex flex-col md:flex-row bg-gray-100 p-0 sm:p-4 lg:p-8 gap-4 overflow-hidden">
      {/* Mobile Header Nav */}
      <div className="md:hidden bg-white px-4 py-3 flex justify-between items-center shadow-sm border-b border-gray-200">
        <div className="flex items-center gap-2 text-blue-600 font-bold italic">
          <i className="fa-solid fa-cart-shopping"></i>
          DealScout
        </div>
        <button 
          onClick={() => setShowProfile(!showProfile)}
          className="relative w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-600"
        >
          <i className={`fa-solid ${showProfile ? 'fa-message' : 'fa-wallet'}`}></i>
          {clippedIds.length > 0 && !showProfile && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">
              {clippedIds.length}
            </span>
          )}
        </button>
      </div>

      {/* Main Chat Container */}
      <div className={`flex-grow h-full ${showProfile ? 'hidden' : 'flex'} md:flex flex-col`}>
        <ChatInterface 
          clippedIds={clippedIds} 
          onOffersClipped={setClippedIds} 
        />
      </div>

      {/* Profile/Clipped Offers Sidebar */}
      <div className={`
        ${showProfile ? 'flex w-full' : 'hidden'} 
        md:flex md:w-80 lg:w-96 flex-col bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden h-full
      `}>
        <ProfileView clippedIds={clippedIds} onOffersClipped={setClippedIds} />
      </div>

      {/* Desktop Toggle (Floating Button) */}
      <div className="hidden md:block fixed bottom-12 right-12 z-50">
         <div className="bg-white p-2 rounded-full shadow-2xl border border-gray-100 flex flex-col gap-2">
            <button 
              onClick={() => setShowProfile(false)}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${!showProfile ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-50'}`}
              title="Chat"
            >
              <i className="fa-solid fa-message"></i>
            </button>
            <button 
              onClick={() => setShowProfile(true)}
              className={`w-12 h-12 rounded-full flex items-center justify-center relative transition-all ${showProfile ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-50'}`}
              title="Wallet"
            >
              <i className="fa-solid fa-wallet"></i>
              {clippedIds.length > 0 && !showProfile && (
                <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">
                  {clippedIds.length}
                </span>
              )}
            </button>
         </div>
      </div>
    </div>
  );
};

export default App;