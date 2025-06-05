import React, { useState } from 'react';
import API_CONFIG from './config';
import { apiPost } from './apiUtils';

function ShippingForm({ onSubmit }) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [zip, setZip] = useState('');
  const [email, setEmail] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ name, address, city, zip, email });
  };

  return (
    <form onSubmit={handleSubmit} style={{maxWidth:400,margin:'2em auto',background:'#232526',padding:'2em',borderRadius:12,boxShadow:'0 2px 12px #0007',color:'#fff'}}>
      <h2>Shipping Information</h2>
      <input value={name} onChange={e=>setName(e.target.value)} placeholder="Full Name" required style={{width:'100%',marginBottom:10,padding:8,borderRadius:6,border:'none'}} />
      <input value={address} onChange={e=>setAddress(e.target.value)} placeholder="Address" required style={{width:'100%',marginBottom:10,padding:8,borderRadius:6,border:'none'}} />
      <input value={city} onChange={e=>setCity(e.target.value)} placeholder="City" required style={{width:'100%',marginBottom:10,padding:8,borderRadius:6,border:'none'}} />
      <input value={zip} onChange={e=>setZip(e.target.value)} placeholder="ZIP Code" required style={{width:'100%',marginBottom:10,padding:8,borderRadius:6,border:'none'}} />
      <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" type="email" required style={{width:'100%',marginBottom:10,padding:8,borderRadius:6,border:'none'}} />
      <button type="submit" style={{padding:'0.7em 2em',borderRadius:8,border:'none',background:'#1a2980',color:'#fff',fontWeight:600,marginTop:10}}>Submit</button>
    </form>
  );
}

export default ShippingForm;
