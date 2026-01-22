
import React, { useEffect, useState, useMemo } from 'react';
import { Offer } from '../types';
import { mockApiService } from '../services/mockApi';

interface ProfileViewProps {
  clippedIds: string[];
  onOffersClipped: (ids: string[]) => void;
}

interface OfferListItemProps {
  offer: Offer;
  isClipped: boolean;
  onToggleClip: (id: string) => void | Promise<void>;
}

const OfferListItem: React.FC<OfferListItemProps> = ({ 
  offer, 
  isClipped, 
  onToggleClip 
}) => {
  const [imageError, setImageError] = useState(false);

  return (
    <div 
      className={`bg-white p-3 rounded-xl shadow-sm border transition-all duration-300 flex gap-4 items-center group animate-in fade-in slide-in-from-right-2 ${
        isClipped ? 'border-blue-100 opacity-90' : 'border-gray-100 hover:border-blue-200'
      }`}
    >
      <div className="relative shrink-0">
        {!imageError ? (
          <img 
            src={offer.image} 
            onError={() => setImageError(true)}
            className={`w-16 h-16 rounded-lg object-cover transition-all ${isClipped ? 'grayscale-[0.5]' : ''}`} 
            alt={offer.deal} 
          />
        ) : (
          <div 
            className={`w-16 h-16 rounded-lg flex items-center justify-center bg-gray-50 border border-gray-100 transition-all ${isClipped ? 'grayscale-[0.5] opacity-50' : ''}`}
          >
            <i className="fa-solid fa-basket-shopping text-gray-300 text-lg"></i>
          </div>
        )}
        
        {isClipped && (
          <div className="absolute -top-1 -right-1 bg-blue-500 text-white text-[8px] w-4 h-4 flex items-center justify-center rounded-full border-2 border-white">
            <i className="fa-solid fa-check"></i>
          </div>
        )}
      </div>
      
      <div className="flex-grow min-w-0">
        <h4 className="font-bold text-gray-900 text-[11px] truncate group-hover:text-blue-700 transition-colors">
          {offer.deal}
        </h4>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[9px] text-red-500 font-bold whitespace-nowrap">
            Exp: {offer.expiry}
          </span>
          <span className="text-[9px] text-gray-400 font-medium uppercase tracking-tight">{offer.category}</span>
        </div>
      </div>

      <button
        onClick={() => onToggleClip(offer.id)}
        className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
          isClipped 
            ? 'bg-red-50 text-red-600 hover:bg-red-600 hover:text-white active:scale-90' 
            : 'bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white active:scale-90 shadow-sm'
        }`}
      >
        <i className={`fa-solid ${isClipped ? 'fa-trash-can' : 'fa-plus'}`}></i>
      </button>
    </div>
  );
};

export const ProfileView: React.FC<ProfileViewProps> = ({ clippedIds, onOffersClipped }) => {
  const [allOffers, setAllOffers] = useState<Offer[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sortAsc, setSortAsc] = useState<boolean | null>(null);

  useEffect(() => {
    mockApiService.getOffers().then(offers => {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const validOffers = offers.filter(o => new Date(o.expiry) >= now);
      setAllOffers(validOffers);
    });
  }, []);

  const handleToggleClip = async (offerId: string) => {
    const isAlreadyClipped = clippedIds.includes(offerId);
    try {
      if (isAlreadyClipped) {
        await mockApiService.unclipOffer(offerId);
        onOffersClipped(clippedIds.filter(id => id !== offerId));
      } else {
        await mockApiService.clipOffer(offerId);
        onOffersClipped([...clippedIds, offerId]);
      }
    } catch (error) {
      console.error("Failed to toggle clip offer", error);
    }
  };

  const handleClipAll = async () => {
    const unclipped = allOffers.filter(o => !clippedIds.includes(o.id));
    if (unclipped.length === 0) return;
    setIsProcessing(true);
    try {
      const clipPromises = unclipped.map(async (offer) => {
        await mockApiService.clipOffer(offer.id);
        return offer.id;
      });
      const clippedResultIds = await Promise.all(clipPromises);
      onOffersClipped([...clippedIds, ...clippedResultIds]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUnclipAll = async () => {
    if (clippedIds.length === 0) return;
    setIsProcessing(true);
    try {
      const unclipPromises = clippedIds.map(async (id) => {
        await mockApiService.unclipOffer(id);
      });
      await Promise.all(unclipPromises);
      onOffersClipped([]);
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleSort = () => {
    setSortAsc(prev => (prev === null ? true : prev === true ? false : true));
  };

  const sortedOffers = useMemo(() => {
    const list = [...allOffers];
    if (sortAsc === null) return list;
    return list.sort((a, b) => {
      const dateA = new Date(a.expiry).getTime();
      const dateB = new Date(b.expiry).getTime();
      return sortAsc ? dateA - dateB : dateB - dateA;
    });
  }, [allOffers, sortAsc]);

  const unclippedCount = allOffers.filter(o => !clippedIds.includes(o.id)).length;

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 shadow-inner">
              <i className="fa-solid fa-list-check"></i>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800 leading-tight">My Deals</h2>
              <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">
                {clippedIds.length} Saved • {allOffers.length} Total
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {unclippedCount > 0 && (
            <button
              onClick={handleClipAll}
              disabled={isProcessing}
              className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all active:scale-[0.98] shadow-lg shadow-blue-100 flex items-center justify-center gap-2"
            >
              {isProcessing ? <i className="fa-solid fa-circle-notch animate-spin"></i> : <i className="fa-solid fa-bolt"></i>}
              Save All Available ({unclippedCount})
            </button>
          )}

          <div className="flex gap-2">
            <button
              onClick={toggleSort}
              className="flex-grow py-2.5 bg-white border border-gray-200 text-gray-600 rounded-xl text-[10px] font-bold hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
            >
              <i className={`fa-solid fa-sort-amount-${sortAsc === false ? 'down' : 'up'}`}></i>
              Sort {sortAsc === null ? '' : sortAsc ? '(Soonest)' : '(Latest)'}
            </button>

            {clippedIds.length > 0 && (
              <button
                onClick={handleUnclipAll}
                disabled={isProcessing}
                className="px-4 py-2.5 bg-red-50 border border-red-100 text-red-600 rounded-xl text-[10px] font-bold hover:bg-red-600 hover:text-white transition-all active:scale-[0.98]"
                title="Clear All Saved"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-grow overflow-y-auto p-4 space-y-3 bg-gray-50/30">
        {allOffers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-300 mb-3">
              <i className="fa-solid fa-basket-shopping"></i>
            </div>
            <p className="text-gray-400 text-[11px] font-medium uppercase tracking-widest">No Active Offers</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2">
            {sortedOffers.map((offer) => (
              <OfferListItem 
                key={offer.id} 
                offer={offer} 
                isClipped={clippedIds.includes(offer.id)} 
                onToggleClip={handleToggleClip} 
              />
            ))}
          </div>
        )}
      </div>
      
      {clippedIds.length > 0 && (
        <div className="p-4 border-t border-gray-100 bg-white">
          <button className="w-full py-3 bg-gray-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-md">
            <i className="fa-solid fa-barcode"></i>
            In-Store Member Card
          </button>
        </div>
      )}
    </div>
  );
};
