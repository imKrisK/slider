import Slider from './Slider';
import Streaming from './Streaming';
import Notification from './Notification';
import './slider.css';
import React from 'react';

function App() {
  const [dark, setDark] = React.useState(true);
  const [notification, setNotification] = React.useState({ message: '', type: 'info' });
  const [view, setView] = React.useState('slider');

  React.useEffect(() => {
    document.body.style.background = dark
      ? 'linear-gradient(135deg, #232526 0%, #414345 100%)'
      : 'linear-gradient(135deg, #f8fafc 0%, #e0e7ef 100%)';
    document.body.style.color = dark ? '#fff' : '#222';
  }, [dark]);

  const notify = (message, type = 'info') => setNotification({ message, type });

  return (
    <div style={{minHeight:'100vh',width:'100vw',overflowX:'hidden',background:'none'}}>
      <header style={{position:'fixed',top:0,left:0,width:'100vw',height:70,background:dark?'#232526cc':'#f8fafccc',backdropFilter:'blur(8px)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 2em',boxShadow:'0 2px 12px #0002'}}>
        <div style={{fontWeight:800,fontSize:'1.5em',letterSpacing:1}}>PokéShowcase</div>
        <nav style={{display:'flex',gap:16}}>
          <button
            onClick={() => setView('slider')}
            style={{padding:'0.5em 1.2em',borderRadius:8,border:'none',background:view==='slider'?'#1a2980':'#e0e7ef',color:view==='slider'?'#fff':'#222',fontWeight:600,cursor:'pointer',boxShadow:'0 2px 8px #0003'}}
          >
            Slider
          </button>
          <button
            onClick={() => setView('streaming')}
            style={{padding:'0.5em 1.2em',borderRadius:8,border:'none',background:view==='streaming'?'#1a2980':'#e0e7ef',color:view==='streaming'?'#fff':'#222',fontWeight:600,cursor:'pointer',boxShadow:'0 2px 8px #0003'}}
          >
            Streaming
          </button>
        </nav>
        <button
          onClick={() => setDark(d => !d)}
          style={{padding:'0.5em 1.2em',borderRadius:8,border:'none',background:dark?'#1a2980':'#e0e7ef',color:dark?'#fff':'#222',fontWeight:600,cursor:'pointer',boxShadow:'0 2px 8px #0003'}}
        >
          {dark ? '🌙 Dark' : '☀️ Light'}
        </button>
      </header>
      <Notification message={notification.message} type={notification.type} onClose={() => setNotification({ message: '', type: 'info' })} />
      <main style={{paddingTop:90,minHeight:'100vh',width:'100vw',boxSizing:'border-box',display:'flex',justifyContent:'center',alignItems:'flex-start'}}>
    
          {view === 'slider' ? <Slider /> : <Streaming notify={notify} />}

      </main>
    </div>
  );
}

export default App;
