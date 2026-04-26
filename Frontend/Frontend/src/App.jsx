import React, { useState, useRef } from 'react';
import axios from 'axios';
import { Shield, Lock, Search, Download, Zap, Activity, MousePointer2, CheckCircle, AlertCircle } from 'lucide-react';

export default function App() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [message, setMessage] = useState("");
  const [key, setKey] = useState("");
  const [res, setRes] = useState({ url: null, psnr: "--", out: "", map: null });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('embed');
  const imgRef = useRef();

  const handleImg = (e) => {
    const f = e.target.files[0];
    if (f) { setFile(f); setPreview(URL.createObjectURL(f)); setRes({ ...res, url:null, out:"", map:null }); }
  };

  const run = async (mode) => {
    if (!file || !key) return alert("Isi file dan kunci!");
    setLoading(true);
    const fd = new FormData();
    fd.append("image", file); fd.append("key", key);
    if(mode === 'in') { fd.append("message", message); fd.append("x", window.x || 0); fd.append("y", window.y || 0); }

    try {
      const response = await axios.post(`http://localhost:5000/${mode === 'in' ? 'process' : 'extract'}`, fd);
      if(mode === 'in') setRes({ ...res, url: response.data.url, psnr: response.data.psnr });
      else setRes({ ...res, out: response.data.message, map: response.data.map_url });
    } catch (e) { alert(e.response?.data?.error || "Error!"); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex justify-between items-center bg-slate-900/50 p-6 rounded-3xl border border-white/5">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-2xl"><Shield className="text-white"/></div>
            <h1 className="text-2xl font-black text-white tracking-tighter italic">STEGA-PRO <span className="text-blue-500 font-normal text-sm block tracking-widest">CHACHA20 + LSB</span></h1>
          </div>
          <div className="flex bg-black p-1 rounded-xl">
            <button onClick={()=>setActiveTab('embed')} className={`px-6 py-2 rounded-lg text-[10px] font-bold ${activeTab==='embed'?'bg-blue-600 text-white':'text-slate-500'}`}>EMBED</button>
            <button onClick={()=>setActiveTab('extract')} className={`px-6 py-2 rounded-lg text-[10px] font-bold ${activeTab==='extract'?'bg-purple-600 text-white':'text-slate-500'}`}>EXTRACT</button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Kontrol */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-slate-900/50 p-6 rounded-[2rem] border border-white/5 space-y-4">
              <input type="file" onChange={handleImg} className="w-full text-[10px] file:bg-blue-600 file:text-white file:border-0 file:rounded-md file:px-2" />
              {activeTab==='embed' && <textarea onChange={e=>setMessage(e.target.value)} className="w-full bg-black border border-white/10 rounded-xl p-3 text-sm h-24 outline-none focus:border-blue-500" placeholder="Pesan rahasia..."/>}
              <input type="password" onChange={e=>setKey(e.target.value)} className="w-full bg-black border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-blue-500" placeholder="Kunci Keamanan"/>
              <button onClick={()=>run(activeTab==='embed'?'in':'ex')} className={`w-full py-4 rounded-xl font-bold text-[10px] tracking-widest text-white ${activeTab==='embed'?'bg-blue-600':'bg-purple-600'}`}>
                {loading ? 'PROCESSING...' : activeTab.toUpperCase()}
              </button>
            </div>
          </div>

          {/* Canvas */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-black rounded-[2rem] border border-white/5 aspect-video overflow-hidden flex items-center justify-center relative cursor-crosshair" onClick={(e)=>{
              const r = e.target.getBoundingClientRect();
              window.x = Math.round((e.clientX - r.left) * (e.target.naturalWidth/r.width));
              window.y = Math.round((e.clientY - r.top) * (e.target.naturalHeight/r.height));
              alert(`Titik Koordinat Terkunci di X:${window.x} Y:${window.y}`);
            }}>
              {preview ? <img src={preview} className="max-h-full" /> : <Activity className="opacity-10" size={48}/>}
            </div>

            {/* Hasil Extract & Visual Map */}
            {res.out && activeTab === 'extract' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-bottom-4">
                <div className="bg-purple-600/10 border border-purple-500/30 p-6 rounded-3xl">
                  <p className="text-[10px] font-black text-purple-500 uppercase mb-2 italic">Decoded Message:</p>
                  <p className="text-white font-bold italic">"{res.out}"</p>
                </div>
                {res.map && (
                  <div className="bg-slate-900 border border-blue-500/30 p-4 rounded-3xl">
                    <p className="text-[10px] font-black text-blue-500 uppercase mb-2 italic">Forensic Mapping:</p>
                    <img src={res.map} className="rounded-xl w-full border border-white/5" />
                  </div>
                )}
              </div>
            )}

            {res.url && activeTab === 'embed' && (
              <div className="flex justify-between items-center bg-green-600/10 border border-green-500/30 p-6 rounded-3xl">
                <div>
                    <p className="text-[10px] font-black text-green-500 uppercase tracking-widest">Image Ready</p>
                    <p className="text-2xl font-black text-white">PSNR: {res.psnr} dB</p>
                </div>
                <a href={res.url} download className="bg-green-600 p-4 rounded-2xl text-white"><Download/></a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}