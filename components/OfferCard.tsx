
import React, { useState, useMemo } from 'react';
import { Offer } from '../types';

interface OfferCardProps {
  offer: Offer;
  onClip: (id: string) => void;
  isClipped: boolean;
}

export const OfferCard: React.FC<OfferCardProps> = ({ offer, onClip, isClipped }) => {
  const [imageError, setImageError] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const toggleModal = () => setIsModalOpen(!isModalOpen);

  // Determine if this is a special multi-buy or BOGO offer
  const specialOfferType = useMemo(() => {
    const p = offer.price.toLowerCase();
    if (p.includes('buy') || p.includes('bogo')) return 'BOGO';
    if (p.includes('for $')) return 'MULTI';
    return null;
  }, [offer.price]);

  const expiryInfo = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiryDate = new Date(offer.expiry);
    expiryDate.setHours(0, 0, 0, 0);
    
    const diffTime = expiryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { label: 'Expired', color: 'text-gray-400', badge: null };
    if (diffDays === 0) return { label: 'Expires Today', color: 'text-red-600', badge: 'bg-red-600 text-white' };
    if (diffDays <= 3) return { label: 'Expires Soon', color: 'text-red-600', badge: 'bg-red-500 text-white' };
    if (diffDays <= 7) return { label: 'Expires This Week', color: 'text-red-600', badge: 'bg-red-100 text-red-700 border border-red-200' };
    
    return { label: `Exp ${offer.expiry}`, color: 'text-gray-400', badge: null };
  }, [offer.expiry]);

  return (
    <>
      <div className={`bg-white rounded-xl border shadow-sm p-5 flex flex-col gap-4 relative transition-all hover:shadow-md h-full overflow-hidden ${
        specialOfferType 
          ? 'border-amber-400 ring-1 ring-amber-100 ring-inset' 
          : 'border-gray-300'
      }`}>
        {/* Special Offer Ribbon/Badge */}
        {specialOfferType && (
          <div className="absolute top-0 left-0 bg-amber-400 text-amber-950 text-[9px] font-black px-3 py-1 rounded-br-lg uppercase tracking-widest flex items-center gap-1 shadow-sm z-10">
            <i className="fa-solid fa-star"></i>
            {specialOfferType === 'BOGO' ? 'BOGO Deal' : 'Multi-Buy'}
          </div>
        )}

        {/* Top Header Row */}
        <div className="flex justify-between items-start pt-2">
          {/* Expiry Badge */}
          <div>
            {expiryInfo.badge && (
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter ${expiryInfo.badge} flex items-center gap-1 shadow-sm`}>
                <i className="fa-solid fa-clock"></i>
                {expiryInfo.label}
              </span>
            )}
          </div>
          {/* Main Price Area */}
          <div className="flex flex-col items-end">
            <div className={`text-2xl font-black ${specialOfferType ? 'text-amber-600 drop-shadow-sm' : 'text-red-800'}`}>
              {offer.price}
            </div>
            {specialOfferType && (
              <div className="text-[10px] font-bold text-amber-700 uppercase tracking-tighter -mt-1">
                Value Deal
              </div>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex justify-between items-center mt-1">
          <div className="flex flex-col gap-1 max-w-[60%]">
            {offer.originalPrice && (
              <div className="text-gray-900 text-sm font-semibold opacity-70">
                Reg: {offer.originalPrice}
              </div>
            )}
            
            <div className="mt-2">
              <h3 className="text-gray-900 text-xl font-bold leading-tight">
                {offer.deal}
              </h3>
              <p className="text-gray-700 text-sm mt-1 line-clamp-2">
                {offer.description}
              </p>
              <button 
                onClick={toggleModal}
                className={`text-sm font-bold underline mt-2 block transition-colors ${
                  specialOfferType ? 'text-amber-700 hover:text-amber-900' : 'text-red-800 hover:text-red-900'
                }`}
              >
                Offer Details
              </button>
            </div>
          </div>

          {/* Product Image or Fallback */}
          <div className="w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center bg-gray-50 rounded-lg overflow-hidden border border-gray-100">
            {!imageError ? (
              <img 
                src={offer.image} 
                alt={offer.deal} 
                onError={() => setImageError(true)}
                className="max-w-full max-h-full object-contain p-1"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-3 w-full h-full bg-gradient-to-br from-gray-50 to-gray-100">
                <i className="fa-solid fa-basket-shopping text-gray-300 text-2xl mb-1.5"></i>
                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter leading-tight line-clamp-3">
                  {offer.deal}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer Area */}
        <div className="mt-4 flex justify-between items-end border-t border-gray-100 pt-4">
          {isClipped ? (
            <button
              onClick={() => onClip(offer.id)}
              className="group flex items-center gap-2 text-blue-600 font-bold text-sm bg-blue-50 px-4 py-2 rounded-lg border border-blue-100 hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all active:scale-95"
            >
              <i className="fa-solid fa-check group-hover:hidden"></i>
              <i className="fa-solid fa-trash-can hidden group-hover:block"></i>
              <span className="group-hover:hidden">Clipped</span>
              <span className="hidden group-hover:block">Unclip</span>
            </button>
          ) : (
            <button
              onClick={() => onClip(offer.id)}
              className={`px-6 py-2 rounded-lg font-bold text-sm transition-all active:scale-95 shadow-sm ${
                specialOfferType 
                  ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-amber-100' 
                  : 'bg-red-800 text-white hover:bg-red-900 shadow-red-100'
              }`}
            >
              Clip Offer
            </button>
          )}

          <div className="text-right flex flex-col">
            <span className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">{offer.category}</span>
            <span className={`text-[10px] font-bold ${expiryInfo.color}`}>
              {expiryInfo.label.includes('Exp') ? expiryInfo.label : `Exp ${offer.expiry}`}
            </span>
          </div>
        </div>
      </div>

      {/* Details Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div 
            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={toggleModal}
          />
          
          <div className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 border border-gray-100">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${
                  specialOfferType ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                }`}>
                  {specialOfferType ? `${specialOfferType} Deal` : 'Exclusive Offer'}
                </span>
                <span className="text-gray-500 text-xs font-medium">{offer.category}</span>
              </div>
              <button 
                onClick={toggleModal}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 transition-colors text-gray-400"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div className="p-6">
              <div className="flex flex-col sm:flex-row gap-6">
                <div className="w-full sm:w-40 h-40 flex-shrink-0 bg-white border border-gray-100 rounded-xl flex items-center justify-center p-4">
                   {!imageError ? (
                      <img src={offer.image} alt={offer.deal} className="max-w-full max-h-full object-contain" />
                    ) : (
                      <i className="fa-solid fa-basket-shopping text-gray-200 text-5xl"></i>
                    )}
                </div>

                <div className="flex-grow">
                  <h4 className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1">{offer.merchant}</h4>
                  <h2 className="text-gray-900 text-2xl font-black leading-tight mb-2">{offer.deal}</h2>
                  
                  <div className="flex items-baseline gap-2 mb-4">
                    <span className={`text-3xl font-black ${specialOfferType ? 'text-amber-600' : 'text-red-700'}`}>
                      {offer.price}
                    </span>
                    {offer.originalPrice && (
                      <span className="text-gray-400 text-sm line-through font-medium">Reg: {offer.originalPrice}</span>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h5 className="text-gray-900 text-sm font-bold flex items-center gap-2">
                        <i className="fa-solid fa-circle-info text-blue-500"></i>
                        Description
                      </h5>
                      <p className="text-gray-600 text-sm mt-1 leading-relaxed">
                        {offer.description}
                      </p>
                    </div>

                    <div>
                      <h5 className="text-gray-900 text-sm font-bold flex items-center gap-2">
                        <i className="fa-solid fa-shield-halved text-red-500"></i>
                        Restrictions & Usage
                      </h5>
                      <p className="text-gray-600 text-sm mt-1">
                        {offer.usageInfo || "Subject to in-store availability. Limit one per customer unless otherwise stated."}
                      </p>
                    </div>

                    <div className={`p-3 rounded-lg border flex items-center justify-between ${expiryInfo.badge ? 'bg-red-50 border-red-100' : 'bg-blue-50 border-blue-100'}`}>
                      <div className="flex items-center gap-2">
                        <i className={`fa-solid fa-calendar-check ${expiryInfo.badge ? 'text-red-600' : 'text-blue-600'}`}></i>
                        <span className={`text-xs font-bold ${expiryInfo.badge ? 'text-red-900' : 'text-blue-900'}`}>
                          {expiryInfo.label.includes('Exp') ? expiryInfo.label : `${expiryInfo.label} (${offer.expiry})`}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => onClip(offer.id)}
                className={`flex-grow py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg ${
                  isClipped 
                    ? 'bg-blue-600 text-white shadow-blue-200' 
                    : specialOfferType 
                      ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-amber-200'
                      : 'bg-red-800 text-white hover:bg-red-900 shadow-red-200'
                }`}
              >
                {isClipped ? (
                  <>
                    <i className="fa-solid fa-check"></i>
                    Offer Clipped
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-scissors"></i>
                    Clip This Offer
                  </>
                )}
              </button>
              <button 
                onClick={toggleModal}
                className="px-6 py-3 bg-white border border-gray-200 text-gray-700 font-bold text-sm rounded-xl hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
