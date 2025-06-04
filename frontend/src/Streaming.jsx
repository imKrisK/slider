import React, { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import ShippingForm from './ShippingForm';

const SOCKET_URL = 'http://localhost:3000';

function Streaming({ notify }) {
  // --- State ---
  const [chat, setChat] = useState([]);
  const [message, setMessage] = useState('');
  const [products, setProducts] = useState([
    { id: 1, name: 'Rare Pikachu Card', price: '$100', status: 'Available' },
    { id: 2, name: 'Charizard Figure', price: '$250', status: 'Available' }
  ]);
  const [viewerCount, setViewerCount] = useState(1);
  const [username, setUsername] = useState('');
  const [auth, setAuth] = useState(false);
  const [bid, setBid] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [auctionTimers, setAuctionTimers] = useState({});
  const [isAdmin, setIsAdmin] = useState(false);
  const [productImage, setProductImage] = useState(null);
  const [role, setRole] = useState('user');
  const [showShipping, setShowShipping] = useState(false);
  const [shippingData, setShippingData] = useState(null);
  const [isBroadcaster, setIsBroadcaster] = useState(false);
  const [roomId, setRoomId] = useState('main');
  const [viewers, setViewers] = useState(0);
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(false);
  const [volume, setVolume] = useState(1);
  const [, setAudioLevel] = useState(0);
  const [recording, setRecording] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState([]);

  // --- Refs ---
  const localStreamRef = useRef(null);
  const peerConnections = useRef({});
  const socketRef = useRef(null);
  const videoRef = useRef(null);
  const secondaryVideoRef = useRef(null);
  const audioTrackRef = useRef(null);
  const analyserRef = useRef(null);
  const audioContextRef = useRef(null);
  const animationRef = useRef(null);
  const mediaRecorderRef = useRef(null);

  // --- Chat auto-scroll ref ---
  const chatEndRef = useRef(null);

  useEffect(() => {
    socketRef.current = io(SOCKET_URL);
    socketRef.current.on('chat-history', history => setChat(history));
    socketRef.current.on('chat-message', msg => setChat(c => [...c, msg]));
    socketRef.current.on('product-update', updatedProducts => setProducts(updatedProducts));
    socketRef.current.on('viewer-count', count => setViewerCount(count));
    socketRef.current.on('bid-success', ({ productId, amount, user }) => {
      notify(`Bid of ${amount} placed by ${user}!`, 'success');
    });
    socketRef.current.on('bid-fail', ({ reason }) => {
      notify(reason, 'error');
    });
    socketRef.current.on('auction-timer', timers => setAuctionTimers(timers));
    socketRef.current.on('buy-success', ({ productId, user }) => {
      notify(`${user} bought the product!`, 'success');
    });
    socketRef.current.on('buy-fail', ({ reason }) => {
      notify(reason, 'error');
    });
    return () => socketRef.current.disconnect();
  }, [notify]);

  useEffect(() => {
    // Request camera access on mount
    navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      .then(stream => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch(err => {
        notify('Camera access denied or unavailable', 'error');
      });
  }, []);

  // Join a room on connect
  useEffect(() => {
    if (!socketRef.current) return;
    socketRef.current.emit('join-room', roomId);
    socketRef.current.on('viewer-count', setViewers);
    return () => {
      socketRef.current.emit('leave-room', roomId);
    };
  }, [roomId]);

  // Single camera WebRTC logic
  useEffect(() => {
    if (!socketRef.current) return;
    if (isBroadcaster) {
      let streamPromise;
      if (cameraOn) {
        streamPromise = navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
      streamPromise.then(stream => {
        if (videoRef.current) videoRef.current.srcObject = stream;
        // Join a room on connect
        socketRef.current.emit('join-room', roomId);
        socketRef.current.on('viewer-count', setViewers);
        socketRef.current.on('viewer-joined', ({ socketId }) => {
          const pc = new window.RTCPeerConnection();
          peerConnections.current[socketId] = pc;
          stream.getTracks().forEach(track => pc.addTrack(track, stream));
          pc.onicecandidate = e => {
            if (e.candidate) socketRef.current.emit('ice-candidate', { candidate: e.candidate, to: socketId });
          };
          pc.createOffer().then(offer => {
            pc.setLocalDescription(offer);
            socketRef.current.emit('offer', { offer, to: socketId });
          });
        });
        socketRef.current.on('answer', ({ answer, from }) => {
          const pc = peerConnections.current[from];
          if (pc) pc.setRemoteDescription(new window.RTCSessionDescription(answer));
        });
        socketRef.current.on('ice-candidate', ({ candidate, from }) => {
          const pc = peerConnections.current[from];
          if (pc) pc.addIceCandidate(new window.RTCIceCandidate(candidate));
        });
        socketRef.current.on('viewer-left', ({ socketId }) => {
          if (peerConnections.current[socketId]) {
            peerConnections.current[socketId].close();
            delete peerConnections.current[socketId];
          }
        });
      });
    } else {
      let pc;
      socketRef.current.on('offer', ({ offer, from }) => {
        pc = new window.RTCPeerConnection();
        peerConnections.current[from] = pc;
        pc.ontrack = e => {
          if (videoRef.current) videoRef.current.srcObject = e.streams[0];
        };
        pc.onicecandidate = e => {
          if (e.candidate) socketRef.current.emit('ice-candidate', { candidate: e.candidate, to: from });
        };
        pc.setRemoteDescription(new window.RTCSessionDescription(offer)).then(() => {
          return pc.createAnswer();
        }).then(answer => {
          pc.setLocalDescription(answer);
          socketRef.current.emit('answer', { answer, to: from });
        });
      });
      socketRef.current.on('ice-candidate', ({ candidate, from }) => {
        if (pc) pc.addIceCandidate(new window.RTCIceCandidate(candidate));
      });
      socketRef.current.on('broadcaster-left', () => {
        if (videoRef.current) videoRef.current.srcObject = null;
        if (pc) pc.close();
      });
    }
    // Cleanup on unmount
    return () => {
      Object.values(peerConnections.current).forEach(pc => pc.close());
      peerConnections.current = {};
    };
  }, [isBroadcaster, roomId, cameraOn]);

  // --- Helper for emoji ---
  const [floatingEmojis, setFloatingEmojis] = useState([]);
  const emojiList = ['😀','😂','😍','🔥','🎉','👍','😎','🥳','😮','😭','👏','❤️','🤩','😡','😱'];

  // Add floating emoji
  const handleEmojiClick = (emoji) => {
    const id = Math.random().toString(36).substr(2, 9);
    setFloatingEmojis(f => [...f, { id, emoji, left: Math.random()*80+10 }]);
    setTimeout(() => {
      setFloatingEmojis(f => f.filter(e => e.id !== id));
    }, 1800);
  };

  // --- Emoji in messages ---
  const addEmojiToMessage = (emoji) => {
    setMessage(msg => msg + emoji);
  };

  // --- Chat message structure with timestamp ---
  const sendMessageWithMeta = e => {
    e.preventDefault();
    if (!auth) {
      notify('Please log in to chat.', 'error');
      return;
    }
    if (message.trim()) {
      const msgObj = {
        user: username,
        text: message,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      socketRef.current.emit('chat-message', msgObj);
      setMessage('');
    }
  };

  useEffect(() => {
    // Request camera access on mount
    navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      .then(stream => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch(err => {
        notify('Camera access denied or unavailable', 'error');
      });
  }, []);

  // Join a room on connect
  useEffect(() => {
    if (!socketRef.current) return;
    socketRef.current.emit('join-room', roomId);
    socketRef.current.on('viewer-count', setViewers);
    return () => {
      socketRef.current.emit('leave-room', roomId);
    };
  }, [roomId]);

  // Single camera WebRTC logic
  useEffect(() => {
    if (!socketRef.current) return;
    if (isBroadcaster) {
      let streamPromise;
      if (cameraOn) {
        streamPromise = navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
      streamPromise.then(stream => {
        if (videoRef.current) videoRef.current.srcObject = stream;
        // Join a room on connect
        socketRef.current.emit('join-room', roomId);
        socketRef.current.on('viewer-count', setViewers);
        socketRef.current.on('viewer-joined', ({ socketId }) => {
          const pc = new window.RTCPeerConnection();
          peerConnections.current[socketId] = pc;
          stream.getTracks().forEach(track => pc.addTrack(track, stream));
          pc.onicecandidate = e => {
            if (e.candidate) socketRef.current.emit('ice-candidate', { candidate: e.candidate, to: socketId });
          };
          pc.createOffer().then(offer => {
            pc.setLocalDescription(offer);
            socketRef.current.emit('offer', { offer, to: socketId });
          });
        });
        socketRef.current.on('answer', ({ answer, from }) => {
          const pc = peerConnections.current[from];
          if (pc) pc.setRemoteDescription(new window.RTCSessionDescription(answer));
        });
        socketRef.current.on('ice-candidate', ({ candidate, from }) => {
          const pc = peerConnections.current[from];
          if (pc) pc.addIceCandidate(new window.RTCIceCandidate(candidate));
        });
        socketRef.current.on('viewer-left', ({ socketId }) => {
          if (peerConnections.current[socketId]) {
            peerConnections.current[socketId].close();
            delete peerConnections.current[socketId];
          }
        });
      });
    } else {
      let pc;
      socketRef.current.on('offer', ({ offer, from }) => {
        pc = new window.RTCPeerConnection();
        peerConnections.current[from] = pc;
        pc.ontrack = e => {
          if (videoRef.current) videoRef.current.srcObject = e.streams[0];
        };
        pc.onicecandidate = e => {
          if (e.candidate) socketRef.current.emit('ice-candidate', { candidate: e.candidate, to: from });
        };
        pc.setRemoteDescription(new window.RTCSessionDescription(offer)).then(() => {
          return pc.createAnswer();
        }).then(answer => {
          pc.setLocalDescription(answer);
          socketRef.current.emit('answer', { answer, to: from });
        });
      });
      socketRef.current.on('ice-candidate', ({ candidate, from }) => {
        if (pc) pc.addIceCandidate(new window.RTCIceCandidate(candidate));
      });
      socketRef.current.on('broadcaster-left', () => {
        if (videoRef.current) videoRef.current.srcObject = null;
        if (pc) pc.close();
      });
    }
    // Cleanup on unmount
    return () => {
      Object.values(peerConnections.current).forEach(pc => pc.close());
      peerConnections.current = {};
    };
  }, [isBroadcaster, roomId, cameraOn]);

  const sendMessage = e => {
    e.preventDefault();
    if (!auth) {
      notify('Please log in to chat.', 'error');
      return;
    }
    if (message.trim()) {
      const msgObj = {
        user: username,
        text: message,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      socketRef.current.emit('chat-message', msgObj);
      setMessage('');
    }
  };

  const handleLogin = e => {
    e.preventDefault();
    if (!username.trim()) {
      notify('Username required!', 'error');
      return;
    }
    setAuth(true);
    notify(`Welcome, ${username}!`, 'success');
  };

  const placeBid = (e) => {
    e.preventDefault();
    if (!auth) {
      notify('Please log in to bid.', 'error');
      return;
    }
    if (!selectedProduct) {
      notify('Select a product to bid on.', 'error');
      return;
    }
    if (!bid || isNaN(Number(bid)) || Number(bid) <= 0) {
      notify('Enter a valid bid amount.', 'error');
      return;
    }
    socketRef.current.emit('place-bid', {
      productId: selectedProduct.id,
      amount: bid,
      user: username
    });
    setBid('');
  };

  const buyNow = (product) => {
    if (!auth) {
      notify('Please log in to buy.', 'error');
      return;
    }
    socketRef.current.emit('buy-now', {
      productId: product.id,
      user: username
    });
  };

  const startAuction = (product) => {
    socketRef.current.emit('start-auction', { productId: product.id, duration: 30 }); // 30s auction
  };

  // Admin: Add new product with image
  const handleProductImage = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProductImage(file);
    }
  };

  // --- Timer for auction countdown re-render ---
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const addProduct = async (e) => {
    e.preventDefault();
    const name = e.target.name.value;
    // Parse price as number
    const price = parseFloat(e.target.price.value);
    const startAuction = e.target.startAuction.checked;
    const auctionDuration = parseInt(e.target.auctionDuration.value, 10) || 30;
    if (!name || !price || !productImage) {
      notify('All fields and image required.', 'error');
      return;
    }
    let imageUrl = '';
    if (productImage) {
      const formData = new FormData();
      formData.append('image', productImage);
      try {
        const res = await fetch('http://localhost:3000/upload-image', {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        imageUrl = data.imageUrl;
      } catch (err) {
        notify('Image upload failed', 'error');
        return;
      }
    }
    const productData = {
      name,
      price, // always a number
      imageUrl
    };
    if (startAuction) {
      productData.auction = true;
      productData.duration = auctionDuration;
    }
    socketRef.current.emit('add-product', productData);
    notify(`Product "${name}" added!`, 'success');
    setProductImage(null);
    e.target.reset();
  };

  const handleStripePayment = async (product) => {
    if (!auth) {
      notify('Please log in to pay.', 'error');
      return;
    }
    notify('Redirecting to payment...', 'info');
    try {
      const res = await fetch('http://localhost:3000/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id, user: username })
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        notify(data.error || 'Payment error', 'error');
      }
    } catch (err) {
      notify('Payment error', 'error');
    }
  };

  // Show shipping form after payment success
  React.useEffect(() => {
    if (window.location.pathname === '/payment-success') {
      setShowShipping(true);
    }
  }, []);

  const handleShippingSubmit = async (data) => {
    setShippingData(data);
    notify('Shipping info submitted! Confirmation email will be sent.', 'success');
    // Send to backend for email (see backend step)
    await fetch('http://localhost:3000/shipping-info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  };

  // Camera control logic
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      if (videoRef.current) videoRef.current.srcObject = stream;
      localStreamRef.current = stream;
      setCameraOn(true);
    } catch (err) {
      notify('Camera access denied or unavailable', 'error');
    }
  };
  const stopCamera = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
  };

  // Microphone control logic
  const startMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioTrack = stream.getAudioTracks()[0];
      audioTrackRef.current = audioTrack;
      
      // Attach to localStreamRef if camera is on
      if (localStreamRef.current) {
        localStreamRef.current.addTrack(audioTrack);
      } else {
        // If camera is off, create a new stream for audio
        localStreamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      }
      setMicOn(true);
    } catch (err) {
      notify('Microphone access denied or unavailable', 'error');
    }
  };
  const stopMic = () => {
    if (audioTrackRef.current) {
      audioTrackRef.current.stop();
      if (localStreamRef.current) {
        localStreamRef.current.removeTrack(audioTrackRef.current);
      }
      audioTrackRef.current = null;
    }
    setMicOn(false);
  };

  // Volume control
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
    }
  }, [volume]);

  // Audio visualization (waveform/spectrum)
  useEffect(() => {
    if (!micOn || !localStreamRef.current) return;
    audioContextRef.current = new (window.AudioContext || window.webkit.AudioContext)();
    const source = audioContextRef.current.createMediaStreamSource(localStreamRef.current);
    analyserRef.current = audioContextRef.current.createAnalyser();
    analyserRef.current.fftSize = 256;
    source.connect(analyserRef.current);
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    const canvas = document.getElementById('audio-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    function draw() {
      analyserRef.current.getByteFrequencyData(dataArray);
      // Spectrum visualization
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const barWidth = (canvas.width / dataArray.length) * 1.5;
        let x = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const barHeight = dataArray[i] / 2;
          ctx.fillStyle = `rgb(${50+barHeight*2},${80+barHeight},200)`;
          ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
          x += barWidth + 1;
        }
      }
      // Simple volume for UI
      const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      setAudioLevel(avg);
      animationRef.current = requestAnimationFrame(draw);
    }
    draw();
    return () => {
      if (audioContextRef.current) audioContextRef.current.close();
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [micOn]);

  // --- Broadcast both feeds to viewers ---
  // When both cameras are on, merge tracks into a single MediaStream for WebRTC
  const getCombinedStream = () => {
    const tracks = [];
    if (localStreamRef.current) tracks.push(...localStreamRef.current.getTracks());
    return new window.MediaStream(tracks);
  };

  // --- Recording both streams ---
  const startRecording = () => {
    if (!localStreamRef.current) return notify('Local stream not ready', 'error');
    const recorder = new window.MediaRecorder(localStreamRef.current);
    mediaRecorderRef.current = recorder;
    setRecordedChunks([]);
    recorder.ondataavailable = e => {
      if (e.data.size > 0) setRecordedChunks(prev => [...prev, e.data]);
    };
    recorder.onstop = () => {
      const blob = new Blob(recordedChunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = 'recording.webm';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 100);
    };
    recorder.start();
    setRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  // Auto-scroll to latest message
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chat]);

  // --- Secondary Camera Support ---
  const [secondaryCameraOn, setSecondaryCameraOn] = useState(false);
  const [videoDevices, setVideoDevices] = useState([]);
  const [selectedSecondaryDeviceId, setSelectedSecondaryDeviceId] = useState('');

  // --- Secondary Camera Flexibility ---
  const [secondaryMode, setSecondaryMode] = useState('column'); // 'column' or 'overlay'
  const [overlayPos, setOverlayPos] = useState({ x: 100, y: 100 });
  const [overlaySize, setOverlaySize] = useState({ width: 320, height: 180 });
  const overlayRef = useRef(null);
  const dragging = useRef(false);
  const resizing = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  // Drag logic for overlay
  const onOverlayMouseDown = e => {
    dragging.current = true;
    dragOffset.current = {
      x: e.clientX - overlayPos.x,
      y: e.clientY - overlayPos.y
    };
    document.addEventListener('mousemove', onOverlayMouseMove);
    document.addEventListener('mouseup', onOverlayMouseUp);
  };
  const onOverlayMouseMove = e => {
    if (!dragging.current) return;
    setOverlayPos({
      x: e.clientX - dragOffset.current.x,
      y: e.clientY - dragOffset.current.y
    });
  };
  const onOverlayMouseUp = () => {
    dragging.current = false;
    document.removeEventListener('mousemove', onOverlayMouseMove);
    document.removeEventListener('mouseup', onOverlayMouseUp);
  };
  // Resize logic for overlay
  const onResizeMouseDown = e => {
    e.stopPropagation();
    resizing.current = true;
    dragOffset.current = {
      x: e.clientX,
      y: e.clientY,
      width: overlaySize.width,
      height: overlaySize.height
    };
    document.addEventListener('mousemove', onResizeMouseMove);
    document.addEventListener('mouseup', onResizeMouseUp);
  };
  const onResizeMouseMove = e => {
    if (!resizing.current) return;
    setOverlaySize({
      width: Math.max(160, dragOffset.current.width + (e.clientX - dragOffset.current.x)),
      height: Math.max(90, dragOffset.current.height + (e.clientY - dragOffset.current.y))
    });
  };
  const onResizeMouseUp = () => {
    resizing.current = false;
    document.removeEventListener('mousemove', onResizeMouseMove);
    document.removeEventListener('mouseup', onResizeMouseUp);
  };

  // Fetch available video devices on mount
  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then(devices => {
      const videos = devices.filter(d => d.kind === 'videoinput');
      setVideoDevices(videos);
      if (videos.length > 1) setSelectedSecondaryDeviceId(videos[1].deviceId);
    });
  }, []);

  // Start/stop secondary camera
  const startSecondaryCamera = async () => {
    if (!selectedSecondaryDeviceId) return notify('No secondary camera found', 'error');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: selectedSecondaryDeviceId } }, audio: false });
      if (secondaryVideoRef.current) secondaryVideoRef.current.srcObject = stream;
      setSecondaryCameraOn(true);
    } catch (err) {
      notify('Secondary camera access denied or unavailable', 'error');
    }
  };
  const stopSecondaryCamera = () => {
    if (secondaryVideoRef.current && secondaryVideoRef.current.srcObject) {
      secondaryVideoRef.current.srcObject.getTracks().forEach(track => track.stop());
      secondaryVideoRef.current.srcObject = null;
    }
    setSecondaryCameraOn(false);
  };

  // Real-time auction countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setProducts(products => [...products]); // Trigger re-render for countdown
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        height: '100dvh',
        background: '#181a20',
        flexWrap: 'nowrap',
        overflowX: 'auto',
        minWidth: 0,
        width: '100vw',
        boxSizing: 'border-box',
        alignItems: 'stretch',
      }}
    >
      {/* Main Video Section */}
      <div
        style={{
          flex: '1 1 700px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: `linear-gradient(120deg, #232526e6 60%, #414345e6 100%), url('/assets/image/lugia.png') right 30% bottom 10%/auto 80% no-repeat`,
          backdropFilter: 'blur(2px)',
          minWidth: 400,
          maxWidth: 1000,
          width: '100%',
          height: '100%',
          boxSizing: 'border-box',
          marginLeft: 0,
          marginRight: 16,
          borderTopLeftRadius: 0,
          borderBottomLeftRadius: 0,
        }}
      >
        {/* Main Camera Controls - relocated above camera */}
        <div
          style={{
            width: '100%',
            maxWidth: 900,
            margin: '1.5em 0 0.5em 0',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(24,26,32,0.98)',
            borderRadius: 8,
            boxShadow: '0 2px 8px #0003',
            padding: '0.7em 0.5em',
          }}
        >
          <input value={roomId} onChange={e => setRoomId(e.target.value)} placeholder="Room ID" style={{padding:'0.5em', borderRadius:6, border:'none', width:120}} />
          <button onClick={() => setIsBroadcaster(b => !b)} style={{padding:'0.5em 1.2em',borderRadius:8,border:'none',background:isBroadcaster?'#ff9800':'#1a2980',color:'#fff',fontWeight:600,boxShadow:'0 2px 8px #0003'}}>
            {isBroadcaster ? 'Stop Broadcasting (WebRTC)' : 'Start Broadcasting (WebRTC)'}
          </button>
          <button onClick={cameraOn ? stopCamera : startCamera} style={{padding:'0.5em 1.2em',borderRadius:8,border:'none',background:cameraOn?'#c00':'#28a745',color:'#fff',fontWeight:600,boxShadow:'0 2px 8px #0003'}}>
            {cameraOn ? 'Turn Camera Off' : 'Turn Camera On'}
          </button>
          <button onClick={micOn ? stopMic : startMic} style={{padding:'0.5em 1.2em',borderRadius:8,border:'none',background:micOn?'#c00':'#28a745',color:'#fff',fontWeight:600,boxShadow:'0 2px 8px #0003'}}>
            {micOn ? 'Mute Mic' : 'Unmute Mic'}
          </button>
          <input type="range" min={0} max={1} step={0.01} value={volume} onChange={e => setVolume(Number(e.target.value))} style={{width:80}} />
          <span style={{color:'#fff',marginLeft:8}}>🔊</span>
          <span style={{color:'#fff',marginLeft:12}}>Viewers: {viewers}</span>
          <button onClick={recording ? stopRecording : startRecording} style={{padding:'0.5em 1.2em',borderRadius:8,border:'none',background:recording?'#c00':'#1a2980',color:'#fff',fontWeight:600,boxShadow:'0 2px 8px #0003',marginLeft:8}}>
            {recording ? 'Stop Recording' : 'Record'}
          </button>
        </div>
        <div
          style={{
            width: '100%',
            maxWidth: 900,
            aspectRatio: '16/9',
            background: '#000',
            borderRadius: 16,
            overflow: 'hidden',
            margin: '2em 0',
            boxShadow: '0 4px 32px #000a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 200,
            minWidth: 0,
            height: 'auto',
            flexShrink: 0,
            touchAction: 'manipulation',
          }}
        >
          {/* Main Camera Display */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              minHeight: 200,
              minWidth: 0,
              background: '#000',
              borderRadius: 16,
              maxHeight: '60vw',
              maxWidth: '100vw',
              aspectRatio: '16/9',
              boxSizing: 'border-box',
              touchAction: 'manipulation',
            }}
            onTouchStart={e => e.stopPropagation()}
            onDoubleClick={() => {
              // Fullscreen on double tap
              if (videoRef.current.requestFullscreen) videoRef.current.requestFullscreen();
            }}
          />
        </div>
        <div style={{color:'#fff', fontWeight:600, fontSize:'1.2em', marginBottom:8}}>Viewers: {viewerCount}</div>
      </div>
      {/* Product List */}
      <div
        style={{
          flex: '0 1 350px',
          background: `linear-gradient(120deg, #1a2980e6 60%, #26d0cee6 100%), url('/assets/image/charizard.png') left 10% bottom 10%/auto 70% no-repeat`,
          backdropFilter: 'blur(2px)',
          color: '#fff',
          padding: '2em 1em',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          minWidth: 300,
          maxWidth: 480,
          width: '100%',
          height: '100%',
          boxSizing: 'border-box',
          alignItems: 'center',
          marginRight: 16,
          overflowY: 'auto',
          borderRadius: 16,
          boxShadow: '0 2px 12px #0005',
        }}
      >
        <h2>Live Products</h2>
        {isAdmin && (
          <form onSubmit={addProduct} style={{marginBottom:16, background:'#232526', borderRadius:8, padding:'1em', display:'flex', flexDirection:'column', gap:8}}>
            <input name="name" placeholder="Product Name" style={{padding:'0.5em', borderRadius:4, border:'none'}} />
            <input name="price" placeholder="Start Price" type="number" min="1" style={{padding:'0.5em', borderRadius:4, border:'none'}} />
            <input type="file" accept="image/*" onChange={handleProductImage} style={{color:'#fff'}} />
            <label style={{color:'#fff',marginTop:8}}>
              <input type="checkbox" id="startAuction" name="startAuction" style={{marginRight:6}} /> Start as Auction
            </label>
            <input name="auctionDuration" placeholder="Auction Duration (seconds)" type="number" min="10" defaultValue="30" style={{padding:'0.5em', borderRadius:4, border:'none'}} />
            <button type="submit" style={{padding:'0.5em 1em', borderRadius:4, border:'none', background:'#1a2980', color:'#fff', fontWeight:600}}>Add Product</button>
          </form>
        )}
        {/* Auction Section */}
        <div style={{width:'100%',marginBottom:24}}>
          <h2 style={{color:'#ffd700',marginBottom:8}}>Live Auctions</h2>
          {products.filter(p => p.auction && p.auctionEnd && p.auctionEnd > Date.now()).length === 0 && (
            <div style={{color:'#aaa',marginBottom:8}}>No live auctions at the moment.</div>
          )}
          {products.filter(p => p.auction && p.auctionEnd && p.auctionEnd > Date.now()).map(p => (
            <div key={p.id} style={{background:'#232526',borderRadius:8,padding:'1.2em 1.5em',margin:'0 0 20px 0',boxShadow:'0 2px 12px #0005',maxWidth:'340px',width:'100%',alignSelf:'center',display:'flex',flexDirection:'column',alignItems:'flex-start',gap:'0.5em',boxSizing:'border-box',border:'2px solid #ffd700'}}>
              {/* Use the same image logic as product list */}
              {(() => {
                // Only use /assets/image for built-in Pokémon
                const pokemonNames = [
                  'mewtwo', 'lugia', 'ho-oh', 'rayquaza', 'kyogre', 'groudon', 'zekrom', 'reshiram',
                  'lucario', 'gengar', 'snorlax', 'dragonite', 'pikachu', 'bulbasaur', 'charmander',
                  'squirtle', 'eevee', 'zangoose'
                ];
                const lowerName = p.name.toLowerCase();
                const match = pokemonNames.find(mon => lowerName.includes(mon));
                if (match) {
                  return (
                    <img src={`/assets/image/${match}.png`} alt={p.name} style={{width: '100%', maxWidth: 220, borderRadius: 8, marginBottom: 8, objectFit: 'cover', background: '#111'}} onError={e => { e.target.onerror = null; e.target.src = '/assets/image/img1.png'; }} />
                  );
                }
                // Fallback
                return (
                  <img src={'/assets/image/img1.png'} alt={p.name} style={{width: '100%', maxWidth: 220, borderRadius: 8, marginBottom: 8, objectFit: 'cover', background: '#111'}} />
                );
              })()}
              <div style={{fontWeight:600, fontSize:'1.1em', marginBottom:2}}>{p.name}</div>
              <div style={{fontWeight:500, color:'#ffd700', marginBottom:2}}>{p.price}</div>
              <div style={{color: p.status === 'Available' ? 'lime' : 'red', marginBottom:2}}>{p.status}</div>
              <div style={{margin:'8px 0', color:'#ffd700', fontWeight:600}}>
                Auction Live! Ends in: {Math.max(0, Math.floor((p.auctionEnd - Date.now())/1000))}s
              </div>
              {/* Optionally, add bid/buy buttons here if needed */}
            </div>
          ))}
        </div>
        {products.map(p => (
          <div key={p.id} style={{
            background:'#232526',
            borderRadius:8,
            padding:'1.2em 1.5em',
            margin:'0 0 20px 0',
            boxShadow:selectedProduct && selectedProduct.id===p.id?'0 0 0 3px #1a2980':'0 2px 12px #0005',
            maxWidth: '340px',
            width: '100%',
            alignSelf: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: '0.5em',
            boxSizing: 'border-box',
          }}>
            {(() => {
              // Only use /assets/image for built-in Pokémon
              const pokemonNames = [
                'mewtwo', 'lugia', 'ho-oh', 'rayquaza', 'kyogre', 'groudon', 'zekrom', 'reshiram',
                'lucario', 'gengar', 'snorlax', 'dragonite', 'pikachu', 'bulbasaur', 'charmander',
                'squirtle', 'eevee', 'zangoose'
              ];
              const lowerName = p.name.toLowerCase();
              const match = pokemonNames.find(mon => lowerName.includes(mon));
              if (match) {
                return (
                  <img src={`/assets/image/${match}.png`} alt={p.name} style={{width: '100%', maxWidth: 220, borderRadius: 8, marginBottom: 8, objectFit: 'cover', background: '#111'}} onError={e => { e.target.onerror = null; e.target.src = '/assets/image/img1.png'; }} />
                );
              }
              // Fallback
              return (
                <img src={'/assets/image/img1.png'} alt={p.name} style={{width: '100%', maxWidth: 220, borderRadius: 8, marginBottom: 8, objectFit: 'cover', background: '#111'}} />
              );
            })()}
            <div style={{fontWeight:600, fontSize:'1.1em', marginBottom:2}}>{p.name}</div>
            <div style={{fontWeight:500, color:'#ffd700', marginBottom:2}}>{p.price}</div>
            <div style={{color: p.status === 'Available' ? 'lime' : 'red', marginBottom:2}}>{p.status}</div>
            {p.auction && p.auctionEnd && p.auctionEnd > Date.now() ? (
              <div style={{margin:'8px 0', color:'#ffd700', fontWeight:600}}>
                Auction Live! Ends in: {Math.max(0, Math.floor((p.auctionEnd - Date.now())/1000))}s
              </div>
            ) : p.auction ? (
              <div style={{margin:'8px 0', color:'#ffd700', fontWeight:600}}>
                Auction Live!
              </div>
            ) : null}
            <button
              style={{marginTop:8, padding:'0.3em 1em', borderRadius:6, border:'none', background:'#1a2980', color:'#fff', fontWeight:600, cursor:'pointer'}}
              onClick={() => setSelectedProduct(p)}
              disabled={p.status !== 'Available'}
            >
              {selectedProduct && selectedProduct.id === p.id ? 'Selected' : 'Select'}
            </button>
            <button
              style={{marginTop:8, marginLeft:8, padding:'0.3em 1em', borderRadius:6, border:'none', background:'#28a745', color:'#fff', fontWeight:600, cursor:'pointer'}}
              onClick={() => buyNow(p)}
              disabled={p.status !== 'Available'}
            >
              Buy Now
            </button>
            {isAdmin && (
              <>
                <button
                  style={{marginTop:8, marginLeft:8, padding:'0.3em 1em', borderRadius:6, border:'none', background:'#ff9800', color:'#fff', fontWeight:600, cursor:'pointer'}}
                  onClick={() => socketRef.current.emit('start-auction', { productId: p.id, duration: 30 })}
                  disabled={p.auction}
                >
                  {p.auction ? 'Auction Live' : 'Start Auction'}
                </button>
                <button
                  style={{marginTop:8, marginLeft:8, padding:'0.3em 1em', borderRadius:6, border:'none', background:'#c00', color:'#fff', fontWeight:600, cursor:'pointer'}}
                  onClick={() => socketRef.current.emit('delete-product', p.id)}
                >
                  Delete
                </button>
              </>
            )}
            <button
              style={{marginTop:8, marginLeft:8, padding:'0.3em 1em', borderRadius:6, border:'none', background:'#007bff', color:'#fff', fontWeight:600, cursor:'pointer'}}
              onClick={() => handleStripePayment(p)}
              disabled={p.status !== 'Available'}
            >
              Pay Now
            </button>
          </div>
        ))}
        {auth && selectedProduct && (
          <form onSubmit={placeBid} style={{marginTop:16, display:'flex', gap:8, alignItems:'center'}}>
            <input
              value={bid}
              onChange={e => setBid(e.target.value)}
              style={{flex:1, padding:'0.5em', borderRadius:4, border:'none'}}
              placeholder={`Bid on ${selectedProduct.name}`}
              type="number"
              min="1"
            />
            <button type="submit" style={{padding:'0.5em 1em', borderRadius:4, border:'none', background:'#1a2980', color:'#fff', fontWeight:600}}>Place Bid</button>
          </form>
        )}
      </div>
      {/* Chat Section */}
      <div
        style={{
          flex: '0 1 350px',
          background: `linear-gradient(120deg, #232526e6 60%, #414345e6 100%), url('/assets/image/pikachu.png') right 10% top 10%/auto 60% no-repeat`,
          backdropFilter: 'blur(2px)',
          color: '#fff',
          display: 'flex',
          flexDirection: 'column',
          padding: '2em 1em',
          minWidth: 300,
          maxWidth: 480,
          width: '100%',
          alignItems: 'center',
          boxSizing: 'border-box',
          height: '100%',
          marginRight: 16,
          borderRadius: 16,
          boxShadow: '0 2px 12px #0005',
        }}
      >
        {/* Sticky Chat Header */}
        <div style={{position:'sticky',top:0,background:'#232526',zIndex:2,width:'100%',paddingBottom:8}}>
          <h2 style={{margin:0}}>Live Chat</h2>
          <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:4}}>
            {emojiList.map(e => (
              <button key={e} onClick={() => { handleEmojiClick(e); addEmojiToMessage(e); }} style={{fontSize:22,padding:'0.2em 0.4em',border:'none',background:'none',cursor:'pointer',transition:'transform 0.1s',outline:'none'}}>{e}</button>
            ))}
          </div>
        </div>
        {/* Floating Emojis Animation Layer */}
        <style>{`
          @keyframes float-emoji {
            0% { opacity: 1; transform: translateY(0) scale(1); }
            80% { opacity: 1; transform: translateY(-120px) scale(1.3); }
            100% { opacity: 0; transform: translateY(-180px) scale(1.1); }
          }
        `}</style>
        <div style={{position:'absolute',pointerEvents:'none',top:0,left:0,width:'100%',height:'100%',zIndex:10}}>
          {floatingEmojis.map(({id,emoji,left}) => (
            <span key={id} style={{
              position:'absolute',
              left:`${left}%`,
              bottom:20,
              fontSize:36,
              animation:'float-emoji 1.8s linear',
              pointerEvents:'none',
              userSelect:'none',
            }}>{emoji}</span>
          ))}
        </div>
        {!auth ? (
          <form onSubmit={handleLogin} style={{marginBottom:16, display:'flex', gap:8}}>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              style={{flex:1, padding:'0.5em', borderRadius:4, border:'none'}}
              placeholder="Enter username to chat..."
            />
            <button type="submit" style={{padding:'0.5em 1em', borderRadius:4, border:'none', background:'#1a2980', color:'#fff'}}>Login</button>
          </form>
        ) : null}
        <div style={{flex:1, overflowY:'auto', marginBottom:8, background:'#181a20', borderRadius:8, padding:'1em', width:'100%'}}>
          {chat.length === 0 && <div style={{color:'#888',textAlign:'center'}}>No messages yet.</div>}
          {chat.map((msg, i) => (
            <div key={i} style={{
              marginBottom:4,
              background: msg.user === username ? '#1a2980' : 'transparent',
              color: msg.user === username ? '#fff' : '#eee',
              borderRadius: msg.user === username ? 8 : 0,
              padding: msg.user === username ? '0.3em 0.7em' : 0,
              alignSelf: msg.user === username ? 'flex-end' : 'flex-start',
              maxWidth: '90%',
              wordBreak: 'break-word',
              position: 'relative',
              fontWeight: msg.user === username ? 600 : 400
            }}>
              <span style={{fontSize:12,opacity:0.7,marginRight:6}}>{msg.time}</span>
              <span style={{fontWeight:600}}>{msg.user}</span>
              <span style={{marginLeft:8}}>{msg.text}</span>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
        <form onSubmit={sendMessageWithMeta} style={{display:'flex', gap:8}}>
          <input
            value={message}
            onChange={e => setMessage(e.target.value)}
            style={{flex:1, padding:'0.5em', borderRadius:4, border:'none'}}
            placeholder={auth ? "Type a message..." : "Login to chat..."}
            disabled={!auth}
          />
          <button type="submit" style={{padding:'0.5em 1em', borderRadius:4, border:'none', background:'#1a2980', color:'#fff'}} disabled={!auth}>Send</button>
        </form>
      </div>
      {/* Secondary Camera Section (right of chat, in its own column or as overlay) */}
      {secondaryMode === 'column' ? (
        <div
          style={{
            flex: '0 1 350px',
            background: `linear-gradient(120deg, #232526e6 60%, #1a2980e6 100%), url('/assets/image/rayquaza.png') left 10% top 10%/auto 60% no-repeat`,
            backdropFilter: 'blur(2px)',
            color: '#fff',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2em 1em',
            minWidth: 300,
            maxWidth: 480,
            width: '100%',
            boxSizing: 'border-box',
            height: '100%',
            marginRight: 0,
            borderRadius: 16,
            boxShadow: '0 2px 12px #0005',
          }}
        >
          <h2>Secondary Camera</h2>
          <div style={{marginBottom:16, width:'100%'}}>
            <label style={{color:'#fff',marginRight:8}}>Select Camera:</label>
            <select
              value={selectedSecondaryDeviceId}
              onChange={e => setSelectedSecondaryDeviceId(e.target.value)}
              style={{padding:'0.5em',borderRadius:6,border:'none',minWidth:120}}
              disabled={secondaryCameraOn}
            >
              {videoDevices.map(d => (
                <option key={d.deviceId} value={d.deviceId}>{d.label || `Camera ${d.deviceId.slice(-4)}`}</option>
              ))}
            </select>
            <button
              onClick={secondaryCameraOn ? stopSecondaryCamera : startSecondaryCamera}
              style={{marginLeft:8,padding:'0.5em 1em',borderRadius:6,border:'none',background:secondaryCameraOn?'#c00':'#28a745',color:'#fff',fontWeight:600,cursor:'pointer'}}
            >
              {secondaryCameraOn ? 'Stop' : 'Start'}
            </button>
            <button
              onClick={() => setSecondaryMode('overlay')}
              style={{marginLeft:8,padding:'0.5em 1em',borderRadius:6,border:'none',background:'#1a2980',color:'#fff',fontWeight:600,cursor:'pointer'}}
            >
              Overlay Mode
            </button>
          </div>
          <div style={{width:'100%',maxWidth:480,aspectRatio:'16/9',background:'#111',borderRadius:16,overflow:'hidden',margin:'2em 0',boxShadow:'0 4px 32px #000a',display:'flex',alignItems:'center',justifyContent:'center',minHeight:200,minWidth:0,height:'auto',flexShrink:0}}>
            <video
              ref={secondaryVideoRef}
              autoPlay
              playsInline
              muted
              style={{width:'100%',height:'100%',objectFit:'cover',minHeight:200,minWidth:0,background:'#111',borderRadius:16,maxHeight:'60vw',maxWidth:'100vw',aspectRatio:'16/9',boxSizing:'border-box',touchAction:'manipulation'}}
            />
          </div>
        </div>
      ) : (
        <>
          <div
            ref={overlayRef}
            style={{
              position: 'fixed',
              left: overlayPos.x,
              top: overlayPos.y,
              width: overlaySize.width,
              height: overlaySize.height,
              background: '#111',
              borderRadius: 16,
              boxShadow: '0 4px 32px #000a',
              zIndex: 200,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'stretch',
              justifyContent: 'flex-start',
              overflow: 'hidden',
              minWidth: 160,
              minHeight: 90,
              resize: 'none',
              userSelect: 'none',
              border: '2px solid #1a2980',
              cursor: dragging.current ? 'grabbing' : 'grab',
            }}
            onMouseDown={onOverlayMouseDown}
          >
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',background:'#232526',color:'#fff',padding:'0.3em 0.7em',fontWeight:600,fontSize:16,cursor:'grab',userSelect:'none'}}>
              <span>Secondary Camera</span>
              <span>
                <button onClick={e => { e.stopPropagation(); setSecondaryMode('column'); }} style={{marginLeft:8,padding:'0.2em 0.7em',borderRadius:6,border:'none',background:'#1a2980',color:'#fff',fontWeight:600,cursor:'pointer',fontSize:14}}>Column</button>
              </span>
            </div>
            <div style={{flex:1,position:'relative',width:'100%',height:'100%'}}>
              <video
                ref={secondaryVideoRef}
                autoPlay
                playsInline
                muted
                style={{width:'100%',height:'100%',objectFit:'cover',background:'#111',borderRadius:0,boxSizing:'border-box',touchAction:'manipulation'}}
              />
              {/* Resize handle */}
              <div
                onMouseDown={onResizeMouseDown}
                style={{position:'absolute',right:0,bottom:0,width:18,height:18,background:'#1a2980',borderRadius:'0 0 12px 0',cursor:'nwse-resize',zIndex:2,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:900,fontSize:16}}>
                ↘
              </div>
            </div>
            <div style={{padding:'0.5em',background:'#232526',color:'#fff',fontSize:13}}>
              <label style={{marginRight:8}}>Select Camera:</label>
              <select
                value={selectedSecondaryDeviceId}
                onChange={e => setSelectedSecondaryDeviceId(e.target.value)}
                style={{padding:'0.3em',borderRadius:6,border:'none',minWidth:100,fontSize:13}}
                disabled={secondaryCameraOn}
              >
                {videoDevices.map(d => (
                  <option key={d.deviceId} value={d.deviceId}>{d.label || `Camera ${d.deviceId.slice(-4)}`}</option>
                ))}
              </select>
              <button
                onClick={secondaryCameraOn ? stopSecondaryCamera : startSecondaryCamera}
                style={{marginLeft:8,padding:'0.3em 0.8em',borderRadius:6,border:'none',background:secondaryCameraOn?'#c00':'#28a745',color:'#fff',fontWeight:600,cursor:'pointer',fontSize:13}}
              >
                {secondaryCameraOn ? 'Stop' : 'Start'}
              </button>
            </div>
          </div>
        </>
      )}
      {/* Admin login for demo */}
      {auth && !isAdmin && (
        <button onClick={() => { setIsAdmin(true); setRole('admin'); notify('Admin mode enabled', 'success'); }} style={{margin:'2em auto 0 auto',display:'block',padding:'0.5em 1.5em',borderRadius:8,border:'none',background:'#ff9800',color:'#fff',fontWeight:600,cursor:'pointer'}}>Admin Login (Demo)</button>
      )}
      {/* User role display */}
      {auth && (
        <div style={{margin:'1em auto 0 auto',textAlign:'center',color:'#fff',fontWeight:600}}>
          Role: {role === 'admin' ? 'Admin' : 'User'}
        </div>
      )}
      {showShipping && !shippingData && (
        <ShippingForm onSubmit={handleShippingSubmit} />
      )}
      {showShipping && shippingData && (
        <div style={{textAlign:'center',color:'#fff',margin:'2em'}}>Thank you! Your shipping info has been received.</div>
      )}
    </div>
  );
}

export default Streaming;
