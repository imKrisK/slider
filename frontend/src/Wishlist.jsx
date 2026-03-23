import React, { useState, useMemo, useEffect } from 'react';
import { wishlistCards, priorityColors, wishlistStats } from './wishlistData';
import { fetchMultipleCards } from './tcgApi';
import { fetchMultipleEbayPrices, formatPrice } from './ebayApi';

function Wishlist({ dark }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [sortBy, setSortBy] = useState('priority'); // priority, name, price
  const [cardData, setCardData] = useState(new Map());
  const [ebayPrices, setEbayPrices] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState(null);
  const [wishlist, setWishlist] = useState(wishlistCards);
  
  // New features state
  const [ownedCards, setOwnedCards] = useState(new Set()); // Cards user possesses
  const [broadcastNotification, setBroadcastNotification] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);

  // Fetch all card data and eBay prices on mount - Optimized with batching
  useEffect(() => {
    const loadAllData = async () => {
      setLoading(true);
      try {
        // Progressive loading: Load critical data first, then supplementary data
        // First batch: TCG images and basic data (most important)
        const tcgDataPromise = fetchMultipleCards(wishlistCards);
        
        // Show results as soon as TCG data arrives
        const tcgData = await tcgDataPromise;
        setCardData(tcgData);
        setLoading(false); // Allow UI to render with TCG data
        
        // Second batch: eBay prices (load in background)
        const ebayData = await fetchMultipleEbayPrices(wishlistCards);
        setEbayPrices(ebayData);
        
      } catch (error) {
        console.error('Error loading wishlist data:', error);
        setLoading(false);
      }
    };
    
    loadAllData();
  }, []);

  // Filter and sort cards
  const displayedCards = useMemo(() => {
    let filtered = wishlist;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(card =>
        card.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by priority
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(card => card.priority === priorityFilter);
    }

    // Sort cards
    filtered = [...filtered].sort((a, b) => {
      if (sortBy === 'priority') {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'price') {
        const aKey = `${a.set}-${a.cardNumber}`;
        const bKey = `${b.set}-${b.cardNumber}`;
        const aPrice = cardData.get(aKey)?.tcgPlayerUrl ? 1 : 0;
        const bPrice = cardData.get(bKey)?.tcgPlayerUrl ? 1 : 0;
        return bPrice - aPrice;
      }
      return 0;
    });

    return filtered;
  }, [searchTerm, priorityFilter, sortBy, wishlist, cardData]);

  const removeFromWishlist = (card) => {
    setWishlist(wishlist.filter(c => 
      !(c.set === card.set && c.cardNumber === card.cardNumber)
    ));
  };

  const updatePriority = (card, newPriority) => {
    setWishlist(wishlist.map(c => 
      (c.set === card.set && c.cardNumber === card.cardNumber)
        ? { ...c, priority: newPriority }
        : c
    ));
  };

  // Toggle card ownership
  const toggleOwnership = (card) => {
    const cardKey = `${card.set}-${card.cardNumber}`;
    const newOwned = new Set(ownedCards);
    if (newOwned.has(cardKey)) {
      newOwned.delete(cardKey);
    } else {
      newOwned.add(cardKey);
    }
    setOwnedCards(newOwned);
  };

  // Export wishlist with images as JSON
  const exportWishlist = () => {
    const exportData = {
      wishlist: wishlist.map(card => {
        const cacheKey = `${card.set}-${card.cardNumber}`;
        const apiCard = cardData.get(cacheKey);
        const ebayPrice = ebayPrices.get(cacheKey);
        const isOwned = ownedCards.has(cacheKey);
        
        return {
          ...card,
          imageUrl: apiCard?.imageSmall || null,
          imageUrlLarge: apiCard?.imageUrl || null,
          tcgData: apiCard || null,
          ebayData: ebayPrice || null,
          owned: isOwned,
          exportedAt: new Date().toISOString()
        };
      }),
      metadata: {
        totalCards: wishlist.length,
        ownedCount: ownedCards.size,
        exportDate: new Date().toISOString(),
        version: '1.0'
      }
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pokemon-wishlist-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setBroadcastNotification('✅ Wishlist exported successfully!');
    setTimeout(() => setBroadcastNotification(''), 3000);
  };

  // Import wishlist from JSON
  const importWishlist = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importData = JSON.parse(e.target.result);
        
        if (importData.wishlist && Array.isArray(importData.wishlist)) {
          // Import wishlist cards
          const importedCards = importData.wishlist.map(card => ({
            name: card.name,
            set: card.set,
            cardNumber: card.cardNumber,
            priority: card.priority || 'medium',
            notes: card.notes || ''
          }));
          
          setWishlist(importedCards);
          
          // Import owned status
          if (importData.wishlist.some(c => c.owned)) {
            const newOwned = new Set();
            importData.wishlist.forEach(card => {
              if (card.owned) {
                newOwned.add(`${card.set}-${card.cardNumber}`);
              }
            });
            setOwnedCards(newOwned);
          }
          
          setBroadcastNotification('✅ Wishlist imported successfully!');
          setTimeout(() => setBroadcastNotification(''), 3000);
        } else {
          setBroadcastNotification('❌ Invalid wishlist format');
          setTimeout(() => setBroadcastNotification(''), 3000);
        }
      } catch (error) {
        console.error('Import error:', error);
        setBroadcastNotification('❌ Error importing wishlist');
        setTimeout(() => setBroadcastNotification(''), 3000);
      }
    };
    reader.readAsText(file);
    event.target.value = ''; // Reset input
  };

  // Broadcast/share wishlist
  const broadcastWishlist = () => {
    setShowShareModal(true);
  };

  const copyShareableText = () => {
    const shareText = `🎴 My Pokemon TCG Wishlist (${wishlist.length} cards)\n\n` +
      `🔴 High Priority (${wishlist.filter(c => c.priority === 'high').length}):\n` +
      wishlist.filter(c => c.priority === 'high').map(c => 
        `• ${c.name} - ${c.set} ${c.cardNumber}${c.notes ? ` (${c.notes})` : ''}`
      ).join('\n') + '\n\n' +
      `🟠 Medium Priority (${wishlist.filter(c => c.priority === 'medium').length}):\n` +
      wishlist.filter(c => c.priority === 'medium').map(c => 
        `• ${c.name} - ${c.set} ${c.cardNumber}${c.notes ? ` (${c.notes})` : ''}`
      ).join('\n') + '\n\n' +
      `🟢 Low Priority (${wishlist.filter(c => c.priority === 'low').length}):\n` +
      wishlist.filter(c => c.priority === 'low').map(c => 
        `• ${c.name} - ${c.set} ${c.cardNumber}${c.notes ? ` (${c.notes})` : ''}`
      ).join('\n');
    
    navigator.clipboard.writeText(shareText).then(() => {
      setBroadcastNotification('📋 Wishlist copied to clipboard!');
      setTimeout(() => setBroadcastNotification(''), 3000);
      setShowShareModal(false);
    });
  };

  const cardStyle = {
    background: dark 
      ? 'linear-gradient(135deg, #2a2d35 0%, #1a1d25 100%)'
      : 'linear-gradient(135deg, #ffffff 0%, #f0f4f8 100%)',
    border: dark ? '2px solid #3a3d45' : '2px solid #e0e7ef',
    borderRadius: '12px',
    padding: '1.2em',
    boxShadow: dark 
      ? '0 4px 16px rgba(0, 0, 0, 0.4)'
      : '0 4px 16px rgba(0, 0, 0, 0.1)',
    transition: 'all 0.3s ease',
    cursor: 'pointer',
    position: 'relative',
    overflow: 'hidden'
  };

  return (
    <div style={{
      width: '100%',
      maxWidth: '1400px',
      padding: '2em',
      boxSizing: 'border-box'
    }}>
      {/* Header with Stats */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '16px',
        padding: '2em',
        marginBottom: '2em',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
        color: '#fff'
      }}>
        <h1 style={{ margin: '0 0 0.5em 0', fontSize: '2.5em', fontWeight: '800' }}>
          ⭐ My Wishlist - Cards to Buy
        </h1>
        <div style={{
          display: 'flex',
          gap: '2em',
          flexWrap: 'wrap',
          fontSize: '1.1em'
        }}>
          <div>
            <strong>Total Cards:</strong> {wishlistStats.totalCards}
          </div>
          <div style={{ color: '#ffcccc' }}>
            <strong>🔴 High Priority:</strong> {wishlistStats.highPriority}
          </div>
          <div style={{ color: '#ffd9b3' }}>
            <strong>🟠 Medium:</strong> {wishlistStats.mediumPriority}
          </div>
          <div style={{ color: '#ccffcc' }}>
            <strong>🟢 Low:</strong> {wishlistStats.lowPriority}
          </div>
          <div style={{ color: '#d0f0ff' }}>
            <strong>✅ I Own:</strong> {ownedCards.size}
          </div>
        </div>
      </div>

      {/* Notification Banner */}
      {broadcastNotification && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
          color: '#fff',
          padding: '1em 2em',
          borderRadius: '12px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
          zIndex: 10000,
          fontSize: '1.1em',
          fontWeight: 'bold',
          animation: 'slideIn 0.3s ease-out'
        }}>
          {broadcastNotification}
        </div>
      )}

      {/* Action Buttons Row */}
      <div style={{
        display: 'flex',
        gap: '1em',
        flexWrap: 'wrap',
        marginBottom: '1.5em'
      }}>
        {/* Upload Wishlist */}
        <label style={{
          padding: '0.8em 1.5em',
          fontSize: '1em',
          borderRadius: '8px',
          border: 'none',
          background: 'linear-gradient(135deg, #1a2980 0%, #26d0ce 100%)',
          color: '#fff',
          cursor: 'pointer',
          fontWeight: '700',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          transition: 'all 0.3s',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5em'
        }}>
          📤 Upload Wishlist
          <input
            type="file"
            accept=".json"
            onChange={importWishlist}
            style={{ display: 'none' }}
          />
        </label>

        {/* Download Wishlist */}
        <button
          onClick={exportWishlist}
          style={{
            padding: '0.8em 1.5em',
            fontSize: '1em',
            borderRadius: '8px',
            border: 'none',
            background: 'linear-gradient(135deg, #26d0ce 0%, #1a2980 100%)',
            color: '#fff',
            cursor: 'pointer',
            fontWeight: '700',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            transition: 'all 0.3s',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5em'
          }}
        >
          💾 Download Wishlist
        </button>

        {/* Broadcast/Share Wishlist */}
        <button
          onClick={broadcastWishlist}
          style={{
            padding: '0.8em 1.5em',
            fontSize: '1em',
            borderRadius: '8px',
            border: 'none',
            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            color: '#fff',
            cursor: 'pointer',
            fontWeight: '700',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            transition: 'all 0.3s',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5em'
          }}
        >
          📢 Share Wishlist
        </button>
      </div>

      {/* Controls */}
      <div style={{
        display: 'flex',
        gap: '1em',
        flexWrap: 'wrap',
        marginBottom: '2em',
        alignItems: 'center'
      }}>
        {/* Search */}
        <div style={{ flex: '1 1 300px' }}>
          <input
            type="text"
            placeholder="🔍 Search wishlist..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '0.8em 1.2em',
              fontSize: '1em',
              borderRadius: '8px',
              border: dark ? '2px solid #3a3d45' : '2px solid #e0e7ef',
              background: dark ? '#2a2d35' : '#fff',
              color: dark ? '#fff' : '#222',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
              outline: 'none'
            }}
          />
        </div>

        {/* Priority Filter */}
        <div>
          <label style={{ marginRight: '0.5em', fontWeight: '600' }}>Priority:</label>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            style={{
              padding: '0.8em 1.2em',
              fontSize: '1em',
              borderRadius: '8px',
              border: dark ? '2px solid #3a3d45' : '2px solid #e0e7ef',
              background: dark ? '#2a2d35' : '#fff',
              color: dark ? '#fff' : '#222',
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            <option value="all">All Priorities</option>
            <option value="high">🔴 High Priority ({wishlistStats.highPriority})</option>
            <option value="medium">🟠 Medium ({wishlistStats.mediumPriority})</option>
            <option value="low">🟢 Low ({wishlistStats.lowPriority})</option>
          </select>
        </div>

        {/* Sort By */}
        <div>
          <label style={{ marginRight: '0.5em', fontWeight: '600' }}>Sort:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              padding: '0.8em 1.2em',
              fontSize: '1em',
              borderRadius: '8px',
              border: dark ? '2px solid #3a3d45' : '2px solid #e0e7ef',
              background: dark ? '#2a2d35' : '#fff',
              color: dark ? '#fff' : '#222',
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            <option value="priority">Priority</option>
            <option value="name">Name</option>
          </select>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div style={{
          textAlign: 'center',
          padding: '3em',
          fontSize: '1.2em',
          color: dark ? '#888' : '#666'
        }}>
          <div style={{
            display: 'inline-block',
            width: '50px',
            height: '50px',
            border: '5px solid ' + (dark ? '#3a3d45' : '#e0e7ef'),
            borderTop: '5px solid #667eea',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <p style={{ marginTop: '1em' }}>Loading wishlist from Pokemon TCG API...</p>
          <style>
            {`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}
          </style>
        </div>
      )}

      {/* Results Count */}
      {!loading && (
        <div style={{
          marginBottom: '1.5em',
          fontSize: '1.1em',
          fontWeight: '600',
          color: dark ? '#aaa' : '#666'
        }}>
          Showing {displayedCards.length} of {wishlistStats.totalCards} cards
        </div>
      )}

      {/* Cards Grid */}
      {!loading && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '1.5em',
          marginBottom: '2em'
        }}>
          {displayedCards.length === 0 ? (
            <div style={{
              gridColumn: '1 / -1',
              textAlign: 'center',
              padding: '3em',
              fontSize: '1.2em',
              color: dark ? '#888' : '#666',
              background: dark ? '#2a2d35' : '#f8f8f8',
              borderRadius: '12px'
            }}>
              No cards found in wishlist.
            </div>
          ) : (
            displayedCards.map((card, index) => {
              const cacheKey = `${card.set}-${card.cardNumber}`;
              const apiCard = cardData.get(cacheKey);
              const ebayPrice = ebayPrices.get(cacheKey);
              const priorityColor = priorityColors[card.priority];
              const isOwned = ownedCards.has(cacheKey);
              
              return (
                <div
                  key={`${card.set}-${card.cardNumber}-${index}`}
                  style={{
                    ...cardStyle,
                    border: isOwned 
                      ? '3px solid #28a745' 
                      : (dark ? '2px solid #3a3d45' : '2px solid #e0e7ef'),
                    opacity: isOwned ? 0.85 : 1
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-8px)';
                    e.currentTarget.style.boxShadow = '0 12px 32px rgba(102, 126, 234, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = dark
                      ? '0 4px 16px rgba(0, 0, 0, 0.4)'
                      : '0 4px 16px rgba(0, 0, 0, 0.1)';
                  }}
                >
                  {/* Owned Badge (if owned) */}
                  {isOwned && (
                    <div style={{
                      position: 'absolute',
                      top: '8px',
                      left: '8px',
                      background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                      color: '#fff',
                      borderRadius: '20px',
                      padding: '0.4em 0.9em',
                      fontSize: '0.85em',
                      fontWeight: 'bold',
                      boxShadow: '0 2px 8px rgba(40, 167, 69, 0.5)',
                      zIndex: 11,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3em'
                    }}>
                      ✅ I Own This
                    </div>
                  )}

                  {/* Priority Badge */}
                  <div style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    background: priorityColor.bg,
                    color: '#fff',
                    borderRadius: '20px',
                    padding: '0.4em 0.9em',
                    fontSize: '0.85em',
                    fontWeight: 'bold',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                    zIndex: 10
                  }}>
                    {priorityColor.label}
                  </div>

                  {/* Card Image */}
                  <div 
                    onClick={() => apiCard && setSelectedCard({ ...card, apiData: apiCard, ebayData: ebayPrice })}
                    style={{
                      width: '100%',
                      height: '300px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '1em',
                      background: dark ? '#1a1d25' : '#f8f8f8',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      cursor: apiCard ? 'pointer' : 'default'
                    }}
                  >
                    {apiCard && apiCard.imageSmall ? (
                      <img 
                        src={apiCard.imageSmall} 
                        alt={card.name}
                        style={{
                          maxWidth: '100%',
                          maxHeight: '100%',
                          objectFit: 'contain',
                          borderRadius: '8px'
                        }}
                      />
                    ) : (
                      <div style={{
                        textAlign: 'center',
                        color: dark ? '#666' : '#999',
                        fontSize: '0.9em',
                        padding: '1em'
                      }}>
                        <div style={{ fontSize: '3em', marginBottom: '0.3em' }}>🎴</div>
                        <div>Loading from TCG API...</div>
                      </div>
                    )}
                  </div>

                  {/* Card Name */}
                  <h3 style={{
                    margin: '0 0 0.5em 0',
                    fontSize: '1.3em',
                    fontWeight: '700',
                    color: dark ? '#fff' : '#222',
                    paddingRight: '120px'
                  }}>
                    {card.name}
                  </h3>

                  {/* Notes */}
                  {card.notes && (
                    <p style={{
                      margin: '0 0 1em 0',
                      fontSize: '0.9em',
                      fontStyle: 'italic',
                      color: dark ? '#aaa' : '#666',
                      background: dark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.05)',
                      padding: '0.5em',
                      borderRadius: '6px'
                    }}>
                      📝 {card.notes}
                    </p>
                  )}

                  {/* Card Details */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5em',
                    fontSize: '0.95em',
                    color: dark ? '#bbb' : '#666',
                    marginBottom: '1em'
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span style={{ fontWeight: '600' }}>Set:</span>
                      <span style={{
                        background: dark ? '#3a3d45' : '#e0e7ef',
                        padding: '0.3em 0.8em',
                        borderRadius: '6px',
                        fontWeight: '700'
                      }}>
                        {card.set}
                      </span>
                    </div>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span style={{ fontWeight: '600' }}>Number:</span>
                      <span style={{ fontFamily: 'monospace', fontWeight: '600' }}>
                        {card.cardNumber}
                      </span>
                    </div>
                    {apiCard && apiCard.rarity && (
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <span style={{ fontWeight: '600' }}>Rarity:</span>
                        <span style={{ fontWeight: '600', color: '#667eea' }}>
                          {apiCard.rarity}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Price Comparison Section */}
                  {(apiCard || ebayPrice) && (
                    <div style={{
                      background: dark 
                        ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)'
                        : 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)',
                      borderRadius: '8px',
                      padding: '1em',
                      marginBottom: '1em',
                      border: dark ? '1px solid #3a3d45' : '1px solid #e0e7ef'
                    }}>
                      <div style={{
                        fontWeight: 'bold',
                        marginBottom: '0.7em',
                        fontSize: '1em',
                        color: dark ? '#fff' : '#222',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5em'
                      }}>
                        💰 Price Comparison
                      </div>
                      
                      {/* TCG Player Prices */}
                      {apiCard && apiCard.tcgPlayerPrices && (apiCard.tcgPlayerPrices.market || apiCard.tcgPlayerPrices.mid) && (
                        <div style={{
                          marginBottom: '0.8em',
                          paddingBottom: '0.8em',
                          borderBottom: dark ? '1px solid #3a3d45' : '1px solid #e0e7ef'
                        }}>
                          <div style={{
                            fontSize: '0.85em',
                            fontWeight: 'bold',
                            color: '#667eea',
                            marginBottom: '0.2em',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                          }}>
                            <span>🎴 TCGPlayer</span>
                            <span style={{ 
                              fontSize: '0.75em', 
                              fontWeight: 'normal',
                              color: dark ? '#888' : '#999',
                              background: dark ? 'rgba(102, 126, 234, 0.1)' : 'rgba(102, 126, 234, 0.05)',
                              padding: '0.2em 0.5em',
                              borderRadius: '4px'
                            }}>
                              Near Mint
                            </span>
                          </div>
                          <div style={{
                            fontSize: '0.7em',
                            color: dark ? '#888' : '#999',
                            marginBottom: '0.5em',
                            fontStyle: 'italic'
                          }}>
                            Based on last 5 NM sold listings
                          </div>
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '0.4em',
                            fontSize: '0.85em'
                          }}>
                            {apiCard.tcgPlayerPrices.market && (
                              <div>
                                <span style={{ color: dark ? '#aaa' : '#666' }}>Market:</span>{' '}
                                <span style={{ fontWeight: 'bold', color: '#28a745' }}>
                                  {formatPrice(apiCard.tcgPlayerPrices.market)}
                                </span>
                              </div>
                            )}
                            {apiCard.tcgPlayerPrices.low && (
                              <div>
                                <span style={{ color: dark ? '#aaa' : '#666' }}>Low:</span>{' '}
                                <span style={{ fontWeight: 'bold' }}>
                                  {formatPrice(apiCard.tcgPlayerPrices.low)}
                                </span>
                              </div>
                            )}
                            {apiCard.tcgPlayerPrices.mid && (
                              <div>
                                <span style={{ color: dark ? '#aaa' : '#666' }}>Mid:</span>{' '}
                                <span style={{ fontWeight: 'bold' }}>
                                  {formatPrice(apiCard.tcgPlayerPrices.mid)}
                                </span>
                              </div>
                            )}
                            {apiCard.tcgPlayerPrices.high && (
                              <div>
                                <span style={{ color: dark ? '#aaa' : '#666' }}>High:</span>{' '}
                                <span style={{ fontWeight: 'bold' }}>
                                  {formatPrice(apiCard.tcgPlayerPrices.high)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* eBay Prices */}
                      {ebayPrice && ebayPrice.available && (
                        <div>
                          <div style={{
                            fontSize: '0.85em',
                            fontWeight: 'bold',
                            color: '#f5576c',
                            marginBottom: '0.2em',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                          }}>
                            <span>🛒 eBay {ebayPrice.estimated && '(Est.)'}</span>
                            <span style={{ 
                              fontSize: '0.75em', 
                              fontWeight: 'normal',
                              color: dark ? '#888' : '#999',
                              background: dark ? 'rgba(245, 87, 108, 0.1)' : 'rgba(245, 87, 108, 0.05)',
                              padding: '0.2em 0.5em',
                              borderRadius: '4px'
                            }}>
                              {ebayPrice.condition || 'Near Mint'}
                            </span>
                          </div>
                          {ebayPrice.timeframe && (
                            <div style={{
                              fontSize: '0.7em',
                              color: dark ? '#888' : '#999',
                              marginBottom: '0.5em',
                              fontStyle: 'italic'
                            }}>
                              {ebayPrice.soldCount || 5} sold • {ebayPrice.timeframe}
                            </div>
                          )}
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '0.4em',
                            fontSize: '0.85em'
                          }}>
                            <div>
                              <span style={{ color: dark ? '#aaa' : '#666' }}>Avg:</span>{' '}
                              <span style={{ fontWeight: 'bold', color: '#28a745' }}>
                                {formatPrice(ebayPrice.average)}
                              </span>
                            </div>
                            <div>
                              <span style={{ color: dark ? '#aaa' : '#666' }}>Low:</span>{' '}
                              <span style={{ fontWeight: 'bold' }}>
                                {formatPrice(ebayPrice.lowest)}
                              </span>
                            </div>
                            <div>
                              <span style={{ color: dark ? '#aaa' : '#666' }}>High:</span>{' '}
                              <span style={{ fontWeight: 'bold' }}>
                                {formatPrice(ebayPrice.highest)}
                              </span>
                            </div>
                            {ebayPrice.recentSales && (
                              <div>
                                <span style={{ color: dark ? '#aaa' : '#666' }}>Sales:</span>{' '}
                                <span style={{ fontWeight: 'bold' }}>
                                  {ebayPrice.recentSales}
                                </span>
                              </div>
                            )}
                          </div>
                          {ebayPrice.note && (
                            <div style={{
                              fontSize: '0.7em',
                              color: dark ? '#888' : '#999',
                              marginTop: '0.4em',
                              fontStyle: 'italic'
                            }}>
                              {ebayPrice.note}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div style={{
                    display: 'flex',
                    gap: '0.5em',
                    marginTop: '1em',
                    flexWrap: 'wrap'
                  }}>
                    {/* I Have This Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleOwnership(card);
                      }}
                      style={{
                        flex: '1 1 auto',
                        padding: '0.6em',
                        background: isOwned 
                          ? 'linear-gradient(135deg, #28a745 0%, #20c997 100%)'
                          : (dark ? '#3a3d45' : '#e0e7ef'),
                        color: isOwned ? '#fff' : (dark ? '#fff' : '#222'),
                        border: 'none',
                        borderRadius: '6px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        fontSize: '0.9em',
                        boxShadow: isOwned ? '0 2px 8px rgba(40, 167, 69, 0.3)' : 'none',
                        transition: 'all 0.3s'
                      }}
                    >
                      {isOwned ? '✅ I Own This' : '👤 I Have This'}
                    </button>
                    
                    {/* Buy Now Button */}
                    {apiCard && apiCard.tcgPlayerUrl && !isOwned && (
                      <a
                        href={apiCard.tcgPlayerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          flex: '1 1 auto',
                          padding: '0.6em',
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          color: '#fff',
                          textDecoration: 'none',
                          borderRadius: '6px',
                          fontWeight: 'bold',
                          textAlign: 'center',
                          fontSize: '0.9em',
                          boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        💳 Buy Now
                      </a>
                    )}
                    
                    {/* Remove Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromWishlist(card);
                      }}
                      style={{
                        padding: '0.6em 1em',
                        background: '#c00',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        fontSize: '0.9em'
                      }}
                    >
                      🗑️
                    </button>
                  </div>

                  {/* Priority Change Buttons */}
                  <div style={{
                    marginTop: '0.8em',
                    display: 'flex',
                    gap: '0.3em',
                    justifyContent: 'center'
                  }}>
                    {['high', 'medium', 'low'].map(priority => (
                      <button
                        key={priority}
                        onClick={(e) => {
                          e.stopPropagation();
                          updatePriority(card, priority);
                        }}
                        disabled={card.priority === priority}
                        style={{
                          padding: '0.3em 0.6em',
                          background: card.priority === priority 
                            ? priorityColors[priority].bg 
                            : (dark ? '#3a3d45' : '#e0e7ef'),
                          color: card.priority === priority ? '#fff' : (dark ? '#aaa' : '#666'),
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '0.75em',
                          cursor: card.priority === priority ? 'default' : 'pointer',
                          opacity: card.priority === priority ? 1 : 0.6
                        }}
                      >
                        {priority === 'high' && '🔴'}
                        {priority === 'medium' && '🟠'}
                        {priority === 'low' && '🟢'}
                      </button>
                    ))}
                  </div>

                  {/* Decorative Gradient Bar */}
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '4px',
                    background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)'
                  }} />
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Card Detail Modal */}
      {selectedCard && selectedCard.apiData && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '2em',
            backdropFilter: 'blur(8px)'
          }}
          onClick={() => setSelectedCard(null)}
        >
          <div
            style={{
              background: dark 
                ? 'linear-gradient(135deg, #2a2d35 0%, #1a1d25 100%)'
                : 'linear-gradient(135deg, #ffffff 0%, #f0f4f8 100%)',
              borderRadius: '16px',
              padding: '2em',
              maxWidth: '800px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              position: 'relative',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setSelectedCard(null)}
              style={{
                position: 'absolute',
                top: '1em',
                right: '1em',
                background: '#c00',
                color: '#fff',
                border: 'none',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                fontSize: '1.5em',
                cursor: 'pointer',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                zIndex: 1
              }}
            >
              ×
            </button>

            {/* Priority Badge in Modal */}
            <div style={{
              position: 'absolute',
              top: '1em',
              left: '1em',
              background: priorityColors[selectedCard.priority].bg,
              color: '#fff',
              borderRadius: '20px',
              padding: '0.5em 1em',
              fontSize: '0.9em',
              fontWeight: 'bold',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
            }}>
              {priorityColors[selectedCard.priority].label}
            </div>

            {/* Modal Content */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1.5em',
              marginTop: '2em'
            }}>
              {/* Large Card Image */}
              <img
                src={selectedCard.apiData.imageUrl}
                alt={selectedCard.name}
                style={{
                  maxWidth: '100%',
                  maxHeight: '500px',
                  borderRadius: '12px',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)'
                }}
              />

              {/* Card Details */}
              <div style={{
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: '1em'
              }}>
                <h2 style={{
                  margin: 0,
                  fontSize: '2em',
                  color: dark ? '#fff' : '#222',
                  textAlign: 'center'
                }}>
                  {selectedCard.name}
                </h2>

                {/* Notes in Modal */}
                {selectedCard.notes && (
                  <div style={{
                    background: dark ? 'rgba(102, 126, 234, 0.1)' : 'rgba(102, 126, 234, 0.05)',
                    padding: '1em',
                    borderRadius: '8px',
                    borderLeft: '4px solid #667eea'
                  }}>
                    <strong>📝 Notes:</strong> {selectedCard.notes}
                  </div>
                )}

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '1em',
                  padding: '1em',
                  background: dark ? '#1a1d25' : '#f8f8f8',
                  borderRadius: '8px'
                }}>
                  <div>
                    <strong>Set:</strong> {selectedCard.apiData.set}
                  </div>
                  <div>
                    <strong>Number:</strong> {selectedCard.apiData.number}
                  </div>
                  <div>
                    <strong>Rarity:</strong> {selectedCard.apiData.rarity}
                  </div>
                  {selectedCard.apiData.hp && (
                    <div>
                      <strong>HP:</strong> {selectedCard.apiData.hp}
                    </div>
                  )}
                  {selectedCard.apiData.types && selectedCard.apiData.types.length > 0 && (
                    <div>
                      <strong>Type:</strong> {selectedCard.apiData.types.join(', ')}
                    </div>
                  )}
                  {selectedCard.apiData.artist && (
                    <div>
                      <strong>Artist:</strong> {selectedCard.apiData.artist}
                    </div>
                  )}
                </div>

                {/* Price Comparison in Modal */}
                {(selectedCard.apiData?.tcgPlayerPrices || selectedCard.ebayData) && (
                  <div style={{
                    background: dark 
                      ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%)'
                      : 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
                    borderRadius: '12px',
                    padding: '1.5em',
                    marginTop: '1em',
                    border: dark ? '2px solid #3a3d45' : '2px solid #e0e7ef'
                  }}>
                    <h3 style={{
                      margin: '0 0 1em 0',
                      fontSize: '1.3em',
                      color: dark ? '#fff' : '#222',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5em'
                    }}>
                      💰 Price Comparison
                    </h3>
                    
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                      gap: '1.5em'
                    }}>
                      {/* TCG Player Prices */}
                      {selectedCard.apiData?.tcgPlayerPrices && (selectedCard.apiData.tcgPlayerPrices.market || selectedCard.apiData.tcgPlayerPrices.mid) && (
                        <div style={{
                          background: dark ? '#1a1d25' : '#fff',
                          borderRadius: '8px',
                          padding: '1em',
                          border: dark ? '1px solid #3a3d45' : '1px solid #e0e7ef'
                        }}>
                          <div style={{
                            fontSize: '1em',
                            fontWeight: 'bold',
                            color: '#667eea',
                            marginBottom: '0.8em',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5em'
                          }}>
                            🎴 TCGPlayer
                          </div>
                          <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.5em',
                            fontSize: '0.95em'
                          }}>
                            {selectedCard.apiData.tcgPlayerPrices.market && (
                              <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                padding: '0.5em',
                                background: dark ? 'rgba(40, 167, 69, 0.1)' : 'rgba(40, 167, 69, 0.05)',
                                borderRadius: '6px'
                              }}>
                                <span style={{ color: dark ? '#aaa' : '#666' }}>Market:</span>
                                <span style={{ fontWeight: 'bold', color: '#28a745', fontSize: '1.1em' }}>
                                  {formatPrice(selectedCard.apiData.tcgPlayerPrices.market)}
                                </span>
                              </div>
                            )}
                            {selectedCard.apiData.tcgPlayerPrices.low && (
                              <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                padding: '0.3em 0.5em'
                              }}>
                                <span style={{ color: dark ? '#aaa' : '#666' }}>Low:</span>
                                <span style={{ fontWeight: 'bold' }}>
                                  {formatPrice(selectedCard.apiData.tcgPlayerPrices.low)}
                                </span>
                              </div>
                            )}
                            {selectedCard.apiData.tcgPlayerPrices.mid && (
                              <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                padding: '0.3em 0.5em'
                              }}>
                                <span style={{ color: dark ? '#aaa' : '#666' }}>Mid:</span>
                                <span style={{ fontWeight: 'bold' }}>
                                  {formatPrice(selectedCard.apiData.tcgPlayerPrices.mid)}
                                </span>
                              </div>
                            )}
                            {selectedCard.apiData.tcgPlayerPrices.high && (
                              <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                padding: '0.3em 0.5em'
                              }}>
                                <span style={{ color: dark ? '#aaa' : '#666' }}>High:</span>
                                <span style={{ fontWeight: 'bold' }}>
                                  {formatPrice(selectedCard.apiData.tcgPlayerPrices.high)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* eBay Prices */}
                      {selectedCard.ebayData && selectedCard.ebayData.available && (
                        <div style={{
                          background: dark ? '#1a1d25' : '#fff',
                          borderRadius: '8px',
                          padding: '1em',
                          border: dark ? '1px solid #3a3d45' : '1px solid #e0e7ef'
                        }}>
                          <div style={{
                            fontSize: '1em',
                            fontWeight: 'bold',
                            color: '#f5576c',
                            marginBottom: '0.8em',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5em'
                          }}>
                            🛒 eBay {selectedCard.ebayData.estimated && '(Est.)'}
                          </div>
                          <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.5em',
                            fontSize: '0.95em'
                          }}>
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              padding: '0.5em',
                              background: dark ? 'rgba(40, 167, 69, 0.1)' : 'rgba(40, 167, 69, 0.05)',
                              borderRadius: '6px'
                            }}>
                              <span style={{ color: dark ? '#aaa' : '#666' }}>Average:</span>
                              <span style={{ fontWeight: 'bold', color: '#28a745', fontSize: '1.1em' }}>
                                {formatPrice(selectedCard.ebayData.average)}
                              </span>
                            </div>
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              padding: '0.3em 0.5em'
                            }}>
                              <span style={{ color: dark ? '#aaa' : '#666' }}>Low:</span>
                              <span style={{ fontWeight: 'bold' }}>
                                {formatPrice(selectedCard.ebayData.lowest)}
                              </span>
                            </div>
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              padding: '0.3em 0.5em'
                            }}>
                              <span style={{ color: dark ? '#aaa' : '#666' }}>High:</span>
                              <span style={{ fontWeight: 'bold' }}>
                                {formatPrice(selectedCard.ebayData.highest)}
                              </span>
                            </div>
                            {selectedCard.ebayData.recentSales && (
                              <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                padding: '0.3em 0.5em',
                                borderTop: dark ? '1px solid #3a3d45' : '1px solid #e0e7ef',
                                marginTop: '0.3em',
                                paddingTop: '0.6em'
                              }}>
                                <span style={{ color: dark ? '#aaa' : '#666' }}>Recent Sales:</span>
                                <span style={{ fontWeight: 'bold', color: '#667eea' }}>
                                  {selectedCard.ebayData.recentSales}
                                </span>
                              </div>
                            )}
                          </div>
                          {selectedCard.ebayData.note && (
                            <div style={{
                              fontSize: '0.75em',
                              color: dark ? '#888' : '#999',
                              marginTop: '0.8em',
                              fontStyle: 'italic',
                              padding: '0.5em',
                              background: dark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.05)',
                              borderRadius: '4px'
                            }}>
                              ℹ️ {selectedCard.ebayData.note}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Purchase Links */}
                <div style={{
                  display: 'flex',
                  gap: '1em',
                  justifyContent: 'center',
                  flexWrap: 'wrap'
                }}>
                  {selectedCard.apiData.tcgPlayerUrl && (
                    <a
                      href={selectedCard.apiData.tcgPlayerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        padding: '1em 2em',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: '#fff',
                        textDecoration: 'none',
                        borderRadius: '8px',
                        fontWeight: 'bold',
                        fontSize: '1.1em',
                        boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
                      }}
                    >
                      💳 Buy on TCGPlayer
                    </a>
                  )}
                  {selectedCard.apiData.cardMarketUrl && (
                    <a
                      href={selectedCard.apiData.cardMarketUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        padding: '1em 2em',
                        background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                        color: '#fff',
                        textDecoration: 'none',
                        borderRadius: '8px',
                        fontWeight: 'bold',
                        fontSize: '1.1em',
                        boxShadow: '0 4px 12px rgba(240, 147, 251, 0.3)'
                      }}
                    >
                      🛒 CardMarket
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Share Wishlist Modal */}
      {showShareModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '2em',
            backdropFilter: 'blur(8px)'
          }}
          onClick={() => setShowShareModal(false)}
        >
          <div
            style={{
              background: dark 
                ? 'linear-gradient(135deg, #2a2d35 0%, #1a1d25 100%)'
                : 'linear-gradient(135deg, #ffffff 0%, #f0f4f8 100%)',
              borderRadius: '16px',
              padding: '2em',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              position: 'relative',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setShowShareModal(false)}
              style={{
                position: 'absolute',
                top: '1em',
                right: '1em',
                background: '#c00',
                color: '#fff',
                border: 'none',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                fontSize: '1.5em',
                cursor: 'pointer',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                zIndex: 1
              }}
            >
              ×
            </button>

            <h2 style={{
              margin: '0 0 1em 0',
              fontSize: '2em',
              color: dark ? '#fff' : '#222',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5em'
            }}>
              📢 Broadcast Wishlist
            </h2>

            <p style={{
              fontSize: '1.1em',
              marginBottom: '1.5em',
              color: dark ? '#bbb' : '#666'
            }}>
              Share your Pokemon TCG wishlist with friends, family, or your trading community!
            </p>

            {/* Share Stats */}
            <div style={{
              background: dark ? '#1a1d25' : '#f8f8f8',
              borderRadius: '12px',
              padding: '1.5em',
              marginBottom: '1.5em'
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: '1em',
                fontSize: '1em',
                color: dark ? '#fff' : '#222'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '2em', fontWeight: 'bold', color: '#667eea' }}>
                    {wishlist.length}
                  </div>
                  <div style={{ fontSize: '0.9em', color: dark ? '#aaa' : '#666' }}>
                    Total Cards
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '2em', fontWeight: 'bold', color: '#ff4444' }}>
                    {wishlist.filter(c => c.priority === 'high').length}
                  </div>
                  <div style={{ fontSize: '0.9em', color: dark ? '#aaa' : '#666' }}>
                    High Priority
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '2em', fontWeight: 'bold', color: '#28a745' }}>
                    {ownedCards.size}
                  </div>
                  <div style={{ fontSize: '0.9em', color: dark ? '#aaa' : '#666' }}>
                    I Own
                  </div>
                </div>
              </div>
            </div>

            {/* Share Actions */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1em'
            }}>
              <button
                onClick={copyShareableText}
                style={{
                  padding: '1em 2em',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  fontSize: '1.1em',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5em',
                  transition: 'all 0.3s'
                }}
              >
                📋 Copy Wishlist to Clipboard
              </button>

              <button
                onClick={() => {
                  exportWishlist();
                  setShowShareModal(false);
                }}
                style={{
                  padding: '1em 2em',
                  background: 'linear-gradient(135deg, #1a2980 0%, #26d0ce 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  fontSize: '1.1em',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(26, 41, 128, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5em',
                  transition: 'all 0.3s'
                }}
              >
                💾 Download as JSON File
              </button>

              <div style={{
                marginTop: '1em',
                padding: '1em',
                background: dark ? 'rgba(102, 126, 234, 0.1)' : 'rgba(102, 126, 234, 0.05)',
                borderRadius: '8px',
                border: dark ? '1px solid #3a3d45' : '1px solid #e0e7ef',
                fontSize: '0.9em',
                color: dark ? '#aaa' : '#666'
              }}>
                <strong>💡 Tip:</strong> Share your wishlist on social media, Discord, or with your local Pokemon TCG community to find traders who might have cards you're looking for!
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Wishlist;
