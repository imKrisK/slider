import React, { useState, useEffect } from 'react';

function Notification({ message, type = 'info', onClose }) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onClose, 3500);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;
  return (
    <div style={{
      position: 'fixed',
      top: 80,
      right: 30,
      zIndex: 2000,
      background: type === 'error' ? '#c00' : type === 'success' ? '#1a2980' : '#232526',
      color: '#fff',
      padding: '1em 2em',
      borderRadius: 10,
      boxShadow: '0 2px 12px #0007',
      fontWeight: 600,
      fontSize: '1.1em',
      minWidth: 200,
      textAlign: 'center',
      transition: 'opacity 0.3s',
    }}>
      {message}
    </div>
  );
}

export default Notification;
