import React, { useState, useRef } from 'react';
import axios from 'axios';
import { Shield, Lock, Eye, Activity, MousePointer2, Download, Zap, HelpCircle, Search, CheckCircle2, AlertCircle } from 'lucide-react';

export default function App() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [message, setMessage] = useState("");
  const [key, setKey] = useState("");
  const [res, setRes] = useState({ url: null, psnr: "--", out: "", used: 0 });
  const [logs, setLogs] = useState(["System Ready..."]);
  const [coord, setCoord] = useState({ x: 0, y: 0, vX: 0, vY: 0 });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('embed'); // 'embed' atau 'extract'
  const imgRef = useRef();

  const handleImg = (e) => {
    const f = e.target.files[0];
    if (f) { 
      setFile(f); 
      setPreview(URL.createObjectURL(f));
      setRes({ url: null, psnr: "--", out: "", used: 0 });
    }
  };

  const getClick = (e) => {
    if (!imgRef.current || activeTab === 'extract') return;
    const rect = imgRef.current.getBoundingClientRect();
    const scaleX = imgRef.current.naturalWidth / rect.width;
    const scaleY = imgRef.current.naturalHeight / rect.height;
    setCoord({ 
      x: Math.round((e.clientX - rect.left) * scaleX), 
      y: Math.round((e.clientY - rect.top) * scaleY),
      vX: e.clientX - rect.left,
      vY: e.clientY - rect.top
    });
  };

  const run = async (mode) => {
    if (!file || !key) return alert("Mohon pilih gambar dan masukkan kunci!");
    setLoading(true);
    setRes(prev => ({...prev, out: ""})); // Reset pesan lama
    
    const fd = new FormData();
    fd.append("image", file);
    fd.append("key", key);
    
    // Embed butuh koordinat, Extract sekarang AUTO
    if(mode === 'in') {
        fd.append("x", coord.x);
        fd.append("y", coord.y);
        fd.append("message", message);
        setLogs([...logs, `[START] Menanam pesan di koordinat (${coord.x}, ${coord.y})...`]);
    } else {
        setLogs([...logs, `[SCAN] Memulai Auto-Scanning seluruh pixel gambar...`]);
    }

    try {
      const response = await axios.post(`http://localhost:5000/${mode === 'in' ? 'process' : 'extract'}`, fd);
      
      if(mode === 'in') {
        setRes({ ...res, url: response.data.url, psnr: response.data.psnr, used: response.data.used_pixels });
        setLogs(prev => [...prev, `[SUCCESS] PSNR: ${response.data.psnr}dB. Gambar siap diunduh.`]);
      } else {
        setRes({ ...res, out: response.data.message });
        setLogs(prev => [...prev, `[SUCCESS] Pesan rahasia ditemukan!`]);
      }
    } catch (e) {
      const errorMsg = e.response?.data?.error || "Koneksi terputus!";
      setLogs(prev => [...prev, `[ERROR] ${errorMsg}`]);
      alert(errorMsg);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Section */}
        <header className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6 border-b border-white/5 pb-8">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl shadow-2xl shadow-blue-500/20 ring-1 ring-white/20">
              <Shield className="text-white" size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic">Stega<span className="text-blue-500 text-not-italic">AI</span>_v5</h1>
              <p className="text-[10px] text-slate-500 font-bold tracking-[0.3em]">HYBRID CHACHA20 + AUTO-SCAN LSB</p>
            </div>
          </div>
          <div className="flex bg-slate-900 p-1 rounded-2xl ring-1 ring-white/10">
            <button onClick={() => setActiveTab('embed')} className={`px-8 py-3 rounded-xl text-[10px] font-bold tracking-widest transition-all ${activeTab === 'embed' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>EMBED MODE</button>
            <button onClick={() => setActiveTab('extract')} className={`px-8 py-3 rounded-xl text-[10px] font-bold tracking-widest transition-all ${activeTab === 'extract' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>EXTRACT MODE</button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Panel Kontrol */}
          <div className="lg:col-span-4 space-y-6">
            <section className="bg-slate-900/40 border border-white/5 p-6 rounded-[2.5rem] backdrop-blur-xl">
              <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2 mb-8">
                {activeTab === 'embed' ? <Zap size={14} className="text-yellow-500"/> : <Search size={14} className="text-purple-500"/>}
                {activeTab === 'embed' ? 'Encryption Settings' : 'Auto-Scan Decryption'}
              </h3>
              
              <div className="space-y-5">
                <div className="p-4 bg-black/40 border border-white/5 rounded-2xl group hover:border-blue-500/50 transition-all">
                   <label className="text-[9px] font-bold text-slate-500 uppercase block mb-3 tracking-widest italic">Input Source</label>
                   <input type="file" onChange={handleImg} className="w-full text-[10px] file:bg-blue-600 file:border-0 file:rounded-lg file:px-4 file:py-2 file:text-white file:font-bold cursor-pointer" />
                </div>

                {activeTab === 'embed' && (
                  <div className="space-y-2 animate-in slide-in-from-top-2">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest ml-2">Secret Message</label>
                    <textarea onChange={e => setMessage(e.target.value)} className="w-full bg-black/60 border border-white/5 rounded-2xl p-4 text-sm focus:ring-2 ring-blue-500/20 outline-none h-28" placeholder="Masukkan pesan rahasia..."/>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest ml-2">Security Key</label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-4 top-4 text-slate-600" />
                    <input type="password" onChange={e => setKey(e.target.value)} className="w-full bg-black/60 border border-white/5 rounded-2xl p-4 pl-12 text-sm focus:ring-2 ring-blue-500/20 outline-none" placeholder="Master Password" />
                  </div>
                </div>

                <button 
                  onClick={() => run(activeTab === 'embed' ? 'in' : 'ex')}
                  disabled={loading}
                  className={`w-full py-5 rounded-[1.5rem] font-black text-[10px] tracking-[0.3em] text-white transition-all ${loading ? 'bg-slate-800 animate-pulse' : activeTab === 'embed' ? 'bg-blue-600 hover:scale-[1.02] active:scale-95 shadow-blue-500/20 shadow-2xl' : 'bg-purple-600 hover:scale-[1.02] shadow-purple-500/20 shadow-2xl'}`}
                >
                  {loading ? "PROCESSING DATA..." : activeTab === 'embed' ? "CONSTRUCT STEGO IMAGE" : "RUN AUTO SCAN"}
                </button>
              </div>
            </section>

            {/* Hint Box */}
            <div className="bg-gradient-to-br from-slate-900 to-black p-6 rounded-[2rem] border border-white/5">
                <div className="flex items-center gap-3 mb-4">
                    <HelpCircle size={16} className="text-blue-400" />
                    <span className="text-[10px] font-black uppercase tracking-widest">User Guide</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed italic">
                    {activeTab === 'embed' 
                    ? "Pilih gambar, ketik pesan & kunci, lalu KLIK pada canvas gambar untuk menentukan titik awal penyisipan sebelum menekan tombol Embed."
                    : "Pilih gambar hasil stego dan masukkan kunci yang benar. Klik 'Run Auto Scan' dan sistem akan mencari pesan secara otomatis di seluruh pixel."}
                </p>
            </div>
          </div>

          {/* Panel Canvas (Tengah) */}
          <div className="lg:col-span-5">
            <section className="bg-slate-900/40 border border-white/5 p-6 rounded-[2.5rem] h-full flex flex-col backdrop-blur-xl relative group">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                  <MousePointer2 size={14} className="text-purple-500"/> {activeTab === 'embed' ? 'Target Mapping' : 'Scanning View'}
                </h3>
                {activeTab === 'embed' && (
                    <div className="flex gap-4">
                        <span className="text-[9px] font-mono bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full uppercase">X: {coord.x}</span>
                        <span className="text-[9px] font-mono bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full uppercase">Y: {coord.y}</span>
                    </div>
                )}
              </div>

              <div className="flex-1 bg-black rounded-[2rem] border border-white/10 overflow-hidden flex items-center justify-center relative shadow-inner shadow-black" onClick={getClick}>
                {preview ? (
                  <img ref={imgRef} src={preview} className={`max-h-full transition-all duration-700 ${loading ? 'blur-sm grayscale' : ''}`} alt="canvas" />
                ) : (
                  <div className="text-center opacity-10">
                    <Eye size={64} className="mx-auto mb-4" />
                    <p className="text-xs font-black uppercase tracking-[0.5em]">Awaiting_Signal</p>
                  </div>
                )}
                
                {/* Visual Target Area (Hanya di mode Embed) */}
                {activeTab === 'embed' && coord.vX > 0 && (
                  <div 
                    className="absolute border-2 border-blue-500 bg-blue-500/10 pointer-events-none transition-all duration-300 flex items-center justify-center animate-pulse"
                    style={{ 
                      left: coord.vX, 
                      top: coord.vY, 
                      width: res.used > 0 ? Math.max(50, Math.sqrt(res.used)) : '40px',
                      height: res.used > 0 ? Math.max(50, Math.sqrt(res.used)) : '40px',
                      transform: 'translate(-50%, -50%)'
                    }}
                  >
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full shadow-[0_0_10px_#3b82f6]"></div>
                    <span className="absolute -bottom-8 text-[8px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter">Start_Point</span>
                  </div>
                )}

                {/* Scanning Animation (Hanya di mode Extract saat Loading) */}
                {loading && activeTab === 'extract' && (
                    <div className="absolute inset-0 bg-purple-600/10 flex flex-col items-center justify-center">
                        <div className="w-full h-1 bg-purple-500 shadow-[0_0_20px_#a855f7] absolute top-0 animate-scan"></div>
                        <p className="text-[10px] font-black text-purple-400 tracking-[0.5em] animate-pulse">DECRYPTING_BITS...</p>
                    </div>
                )}
              </div>
            </section>
          </div>

          {/* Panel Hasil (Kanan) */}
          <div className="lg:col-span-3 space-y-6">
            <section className="bg-[#0f0f0f] border border-white/5 p-6 rounded-[2.5rem] h-full flex flex-col shadow-2xl">
              <h3 className="text-xs font-black text-white uppercase tracking-widest mb-8 flex items-center gap-2">
                <Activity size={14} className="text-green-500"/> System Output
              </h3>
              
              <div className="flex-1 space-y-6">
                {/* PSNR Card */}
                <div className="bg-black/60 p-6 rounded-[2rem] border border-white/5 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-20 transition-opacity"><Zap /></div>
                  <p className="text-[8px] text-slate-600 font-black uppercase mb-2 tracking-[0.2em] text-center italic">Image Integrity (PSNR)</p>
                  <p className="text-4xl font-mono font-black text-center text-green-500 drop-shadow-[0_0_10px_#22c55e44]">{res.psnr}</p>
                </div>

                {/* Logs Card */}
                <div className="bg-black/60 p-5 rounded-[2rem] border border-white/5 h-48 flex flex-col">
                  <p className="text-[8px] text-slate-600 font-black uppercase mb-4 tracking-widest border-b border-white/5 pb-2">Kernel Logs</p>
                  <div className="flex-1 overflow-y-auto font-mono text-[9px] space-y-2 custom-scrollbar pr-2">
                    {logs.map((l, i) => (
                      <div key={i} className={`${l.includes('[ERROR]') ? 'text-red-400' : l.includes('[SUCCESS]') ? 'text-blue-400' : 'text-slate-500'} leading-relaxed tracking-tighter`}>
                        <span className="opacity-30 mr-1">#</span>{l}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Download / Result Card */}
                {res.url && activeTab === 'embed' && (
                  <a href={res.url} download className="w-full bg-green-600 hover:bg-green-500 py-5 rounded-2xl text-white text-[10px] font-black tracking-[0.3em] flex items-center justify-center gap-3 transition-all hover:shadow-[0_0_30px_#22c55e33] animate-in slide-in-from-bottom-4">
                    <Download size={16}/> SAVE IMAGE
                  </a>
                )}

                {res.out && activeTab === 'extract' && (
                  <div className="p-6 bg-purple-600/10 rounded-[2rem] border border-purple-500/30 animate-in zoom-in-95 shadow-[0_0_40px_#a855f711]">
                    <div className="flex items-center gap-2 mb-3">
                        <CheckCircle2 size={12} className="text-purple-400" />
                        <span className="text-[9px] font-black text-purple-400 uppercase tracking-widest">Message Decoded</span>
                    </div>
                    <p className="text-white text-sm font-bold italic bg-black/40 p-4 rounded-xl border border-white/5 leading-relaxed break-words">"{res.out}"</p>
                  </div>
                )}
              </div>
            </section>
          </div>

        </div>
        
        {/* Footer */}
        <footer className="mt-12 py-8 text-center border-t border-white/5">
          <p className="text-[9px] font-bold text-slate-700 tracking-[0.5em] uppercase">Security Protocol: ChaCha20 Stream Cipher & Least Significant Bit Projection • UTS 2026</p>
        </footer>
      </div>

      {/* Tambahkan Animasi Custom CSS di sini */}
      <style>{`
        @keyframes scan {
          0% { top: 0; }
          100% { top: 100%; }
        }
        .animate-scan {
          position: absolute;
          width: 100%;
          animation: scan 2s linear infinite;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #1e293b;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}