import React, { useState } from 'react';
import './slider.css';

const pokemonList = [
  'mewtwo', 'lugia', 'ho-oh', 'rayquaza', 'kyogre', 'groudon', 'zekrom', 'reshiram',
  'lucario', 'gengar', 'snorlax', 'dragonite', 'pikachu', 'bulbasaur', 'charmander',
  'squirtle', 'eevee'
];

const pokemonDescriptions = {
  mewtwo: 'Mewtwo is a Legendary Psychic-type Pokémon created from the DNA of Mew. It is known for its immense psychic powers and intelligence.',
  lugia: 'Lugia is a Legendary Psychic/Flying-type Pokémon, known as the guardian of the seas. It can calm and control storms.',
  'ho-oh': 'Ho-Oh is a Legendary Fire/Flying-type Pokémon, said to bring happiness to those who see it. Its feathers glow in seven colors.',
  rayquaza: 'Rayquaza is a Legendary Dragon/Flying-type Pokémon that lives in the ozone layer. It is known for calming the weather and stopping conflicts between Kyogre and Groudon.',
  kyogre: 'Kyogre is a Legendary Water-type Pokémon, said to have expanded the seas. It can summon heavy rain and storms.',
  groudon: 'Groudon is a Legendary Ground-type Pokémon, said to have expanded the continents. It can summon intense sunlight and drought.',
  zekrom: 'Zekrom is a Legendary Dragon/Electric-type Pokémon, known for its power to generate electricity and its pursuit of ideals.',
  reshiram: 'Reshiram is a Legendary Dragon/Fire-type Pokémon, known for its power to create flames and its pursuit of truth.',
  lucario: 'Lucario is a rare Fighting/Steel-type Pokémon known for its aura-sensing abilities and strong sense of justice.',
  gengar: 'Gengar is a rare Ghost/Poison-type Pokémon, famous for its mischievous nature and ability to hide in shadows.',
  snorlax: 'Snorlax is a rare Normal-type Pokémon, known for its enormous size, strength, and love of sleeping.',
  dragonite: 'Dragonite is a rare Dragon/Flying-type Pokémon, admired for its intelligence, speed, and gentle nature.',
  pikachu: 'Pikachu is an iconic Electric-type Pokémon, beloved for its cuteness and powerful electric attacks.',
  bulbasaur: 'Bulbasaur is a Grass/Poison-type Pokémon, known for the plant bulb on its back that grows as it evolves.',
  charmander: 'Charmander is a Fire-type Pokémon, recognized by the flame on its tail that burns brighter as it grows.',
  squirtle: 'Squirtle is a Water-type Pokémon, famous for its shell and its ability to shoot water at high pressure.',
  eevee: 'Eevee is a Normal-type Pokémon, unique for its ability to evolve into many different forms.'
};

function Slider() {
  const [active, setActive] = useState(0);
  const [search, setSearch] = useState('');
  const [apiResult, setApiResult] = useState(null);
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);
  const [customSlides, setCustomSlides] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [filter, setFilter] = useState('all');

  // Compose all slides and descriptions
  const allSlides = [...pokemonList, ...customSlides.map(p => p.name)];
  const allDescriptions = { ...pokemonDescriptions };
  customSlides.forEach(p => {
    allDescriptions[p.name] = p.description || `Custom Pokémon: ${p.name}`;
  });

  // Filtering
  let filteredSlides = allSlides;
  if (filter === 'favorites') filteredSlides = allSlides.filter(name => favorites.includes(name));
  if (filter === 'custom') filteredSlides = customSlides.map(p => p.name);
  React.useEffect(() => { setActive(0); }, [filter, filteredSlides.length]);

  // Navigation
  const next = () => setActive((prev) => (prev + 1) % filteredSlides.length);
  const prev = () => setActive((prev) => (prev - 1 + filteredSlides.length) % filteredSlides.length);
  const goTo = (idx) => setActive(idx);

  // Search and fetch from PokéAPI
  const handleSearch = async (e) => {
    e.preventDefault();
    setApiResult(null);
    setApiError('');
    setLoading(true);
    try {
      const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${search.toLowerCase()}`);
      if (!res.ok) throw new Error('Pokémon not found');
      const data = await res.json();
      setApiResult({
        name: data.name,
        id: data.id,
        sprite: data.sprites.other['official-artwork'].front_default || data.sprites.front_default,
        types: data.types.map(t => t.type.name).join(', '),
        stats: data.stats.map(s => ({ name: s.stat.name, value: s.base_stat })),
        description: `Type: ${data.types.map(t => t.type.name).join(', ')} | Stats: ${data.stats.map(s => s.stat.name + ': ' + s.base_stat).join(', ')}`
      });
    } catch (e) {
      setApiError('Pokémon not found.');
    }
    setLoading(false);
  };

  const addToSlider = () => {
    if (!apiResult) return;
    if (allSlides.includes(apiResult.name)) return;
    setCustomSlides([...customSlides, apiResult]);
    setActive(filteredSlides.length); // Go to the new slide
  };

  const removeFromSlider = (name) => {
    setCustomSlides(customSlides.filter(p => p.name !== name));
    if (filteredSlides[active] === name) {
      setActive((prev) => (prev - 1 + filteredSlides.length - 1) % (filteredSlides.length - 1));
    }
  };

  const toggleFavorite = (name) => {
    setFavorites(favs => favs.includes(name) ? favs.filter(f => f !== name) : [...favs, name]);
  };

  // Keyboard navigation
  React.useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  });

  // Auto-play (pause on hover)
  React.useEffect(() => {
    let interval = setInterval(next, 5000);
    const slider = document.querySelector('.slider');
    if (slider) {
      slider.addEventListener('mouseenter', () => clearInterval(interval));
      slider.addEventListener('mouseleave', () => interval = setInterval(next, 5000));
    }
    return () => {
      clearInterval(interval);
      if (slider) {
        slider.removeEventListener('mouseenter', () => clearInterval(interval));
        slider.removeEventListener('mouseleave', () => interval = setInterval(next, 5000));
      }
    };
  }, [active, filteredSlides.length]);

  // --- Layout ---
  return (
    <main style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      minHeight: '100vh',
      width: '100vw',
      background: 'linear-gradient(135deg, #232526 0%, #414345 100%)',
      overflowX: 'hidden',
      boxSizing: 'border-box'
    }}>
      <header style={{width:'100%', maxWidth:1200, margin:'2em auto 1em auto', display:'flex', alignItems:'center', justifyContent:'space-between'}}>
        <div className="logo" style={{fontWeight:'bold', fontSize:'2em'}}>iMacKris</div>
        <nav>
          <ul className="menu" style={{display:'flex', gap:'2em', listStyle:'none', margin:0, padding:0, fontWeight:500}}>
            <li>Home</li>
            <li>Designs</li>
            <li>About Me</li>
          </ul>
        </nav>
        <div className="search">
          <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20" style={{width:25}}>
            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"/>
          </svg>
        </div>
      </header>
      <section className="slider" style={{
        width: '100vw',
        maxWidth: '100vw',
        minHeight: 'calc(100vh - 120px)',
        borderRadius: 0,
        boxShadow: '0 8px 32px #0007',
        background: `linear-gradient(120deg, #232526e6 60%, #1a2980e6 100%), url('/assets/image/lugia.png') right 20% bottom 10%/auto 90% no-repeat`,
        backdropFilter: 'blur(2px)',
        padding: '2em 0',
        margin: 0,
        position: 'relative',
        overflow: 'hidden',
        boxSizing: 'border-box'
      }}>
        <form onSubmit={handleSearch} style={{margin: '2em 0', textAlign: 'center'}}>
          <label htmlFor="pokemon-search" style={{marginRight:'0.5em', fontWeight:600}}>Search Pokémon:</label>
          <input
            id="pokemon-search"
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Enter name or ID"
            style={{padding: '0.5em', fontSize: '1em'}}
            aria-label="Search Pokémon by name or ID"
          />
          <button type="submit" style={{padding: '0.5em', fontSize: '1em', marginLeft: '0.5em'}} disabled={loading}>Search</button>
        </form>
        {apiResult && allSlides.includes(apiResult.name) && (
          <div style={{color: 'orange', textAlign: 'center', marginBottom: '1em'}}>
            This Pokémon is already in the slider.
          </div>
        )}
        {apiResult && !allSlides.includes(apiResult.name) && (
          <div style={{textAlign: 'center', marginBottom: '2em', background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: '1em 2em', boxShadow: '0 2px 8px #0003'}}>
            <h3 style={{marginBottom: 8}}>{apiResult.name.charAt(0).toUpperCase() + apiResult.name.slice(1)} (#{apiResult.id})</h3>
            <img src={apiResult.sprite} alt={apiResult.name} style={{height: 150, marginBottom: 8}} />
            <p style={{margin: 0}}>Type: <b>{apiResult.types}</b></p>
            <ul style={{display:'inline-block', textAlign:'left', margin:'1em auto 0 auto', padding:'0', background:'rgba(0,0,0,0.1)', borderRadius:8, fontSize:'1em'}}>
              {apiResult.stats.map(s => (
                <li key={s.name} style={{padding:'2px 8px'}}>{s.name}: <b>{s.value}</b></li>
              ))}
            </ul>
            <button onClick={addToSlider} style={{marginTop:'1em', padding:'0.5em 1em', background:'#1a2980', color:'#fff', border:'none', borderRadius:8, fontWeight:600, cursor:'pointer'}}>Add to Slider</button>
          </div>
        )}
        {apiError && <div style={{color: 'red', textAlign: 'center', marginBottom: '1em'}}>{apiError}</div>}
        <div className="list" style={{
          minHeight: '60vh',
          height: '60vh',
          width: '100vw',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          boxSizing: 'border-box'
        }}>
          {filteredSlides.length === 0 && <div style={{color:'#fff',textAlign:'center',padding:'2em', fontSize:'1.2em', background:'rgba(0,0,0,0.2)', borderRadius:12}}>No Pokémon to display. Try searching or changing your filter.</div>}
          {filteredSlides.map((name, idx) => {
            const custom = customSlides.find(p => p.name === name);
            const isFavorite = favorites.includes(name);
            return (
              <div
                className={`item${active === idx ? ' active' : ''}`}
                key={name + idx}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transition: 'opacity 0.5s',
                  opacity: active === idx ? 1 : 0,
                  pointerEvents: active === idx ? 'auto' : 'none',
                  zIndex: active === idx ? 2 : 1
                }}
              >
                {custom ? (
                  <>
                    <img src={custom.sprite} alt={`${name} artwork`} style={{width:'auto',maxWidth:'100%',height:'60vh',maxHeight:400,display:'block',margin:'0 auto',objectFit:'contain',background:'#222',borderRadius:20,boxShadow:'0 4px 24px #0008'}} onError={e => { e.target.onerror = null; e.target.src = '/assets/image/img1.png'; }} />
                    <div className="content" style={{background:'rgba(0,0,0,0.5)',borderRadius:12,padding:'1em 2em',marginTop:'1em', boxShadow:'0 2px 8px #0003'}}>
                      <h2>{name.charAt(0).toUpperCase() + name.slice(1)}{' '}
                        <span
                          style={{cursor:'pointer',color:isFavorite?'gold':'#fff',fontSize:'1.2em'}}
                          title={isFavorite?'Unfavorite':'Favorite'}
                          onClick={() => toggleFavorite(name)}
                        >★</span>
                      </h2>
                      <p>{custom.description}</p>
                      <ul style={{paddingLeft: 0, listStyle: 'none'}}>
                        {custom.stats.map(s => (
                          <li key={s.name}>{s.name}: {s.value}</li>
                        ))}
                      </ul>
                      <button onClick={() => removeFromSlider(name)} style={{marginTop:'1em', padding:'0.3em 0.8em', background:'#c00', color:'#fff', border:'none', borderRadius:'6px', fontWeight:600, cursor:'pointer'}}>Remove</button>
                    </div>
                  </>
                ) : (
                  <>
                    <img src={`/assets/image/${name}.png`} alt={`${name} artwork`} style={{width:'auto',maxWidth:'100%',height:'60vh',maxHeight:400,display:'block',margin:'0 auto',objectFit:'contain',background:'#222',borderRadius:20,boxShadow:'0 4px 24px #0008'}} onError={e => { e.target.onerror = null; e.target.src = '/assets/image/img1.png'; }} />
                    <div className="content" style={{background:'rgba(0,0,0,0.5)',borderRadius:12,padding:'1em 2em',marginTop:'1em', boxShadow:'0 2px 8px #0003'}}>
                      <h2>{name.charAt(0).toUpperCase() + name.slice(1)}{' '}
                        <span
                          style={{cursor:'pointer',color:isFavorite?'gold':'#fff',fontSize:'1.2em'}}
                          title={isFavorite?'Unfavorite':'Favorite'}
                          onClick={() => toggleFavorite(name)}
                        >★</span>
                      </h2>
                      <p>{pokemonDescriptions[name]}</p>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
        <div className="arrows" style={{position:'absolute',top:'50%',right:30,transform:'translateY(-50%)',zIndex:100}}>
          <button id="prev" onClick={prev}>&lt;</button>
          <button id="next" onClick={next}>&gt;</button>
        </div>
        <div className="thumbnail" style={{position:'absolute',bottom:30,zIndex:11,display:'flex',gap:10,width:'100%',height:120,padding:'0 50px',boxSizing:'border-box',overflow:'auto',justifyContent:'center',background:'rgba(30,30,40,0.7)',borderRadius:16,boxShadow:'0 2px 12px #0005'}}>
          {filteredSlides.map((name, idx) => {
            const custom = customSlides.find(p => p.name === name);
            return (
              <div
                className={`item${active === idx ? ' active' : ''}`}
                key={name + '-thumb-' + idx}
                onClick={() => goTo(idx)}
                style={{width:100,height:100,flexShrink:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',cursor:'pointer',filter:active===idx?'brightness(1.5)':'brightness(0.5)'}}
              >
                {custom ? (
                  <img src={custom.sprite} alt={`${name} thumbnail`} style={{width:80,height:80,objectFit:'contain',background:'#222',borderRadius:12,boxShadow:'0 2px 8px #0005'}} onError={e => { e.target.onerror = null; e.target.src = '/assets/image/img1.png'; }} />
                ) : (
                  <img src={`/assets/image/${name}.png`} alt={`${name} thumbnail`} style={{width:80,height:80,objectFit:'contain',background:'#222',borderRadius:12,boxShadow:'0 2px 8px #0005'}} onError={e => { e.target.onerror = null; e.target.src = '/assets/image/img1.png'; }} />
                )}
                <div className="content" style={{background:'rgba(0,0,0,0.7)',borderRadius:8,padding:'0.3em 0.7em',color:'#fff',fontSize:'1em',textAlign:'center',marginTop:'0.5em'}}>{name.charAt(0).toUpperCase() + name.slice(1)}</div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}

export default Slider;
