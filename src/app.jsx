import React, { useEffect, useRef, useState } from "react";

// City search uses Open-Meteo geocoding API — works worldwide, no key needed

// ── PATREON TIER LINKS ────────────────────────────────────────────────────────
const PATREON_WATCH   = "https://www.patreon.com/membership/28012041";
const PATREON_PLANNER = "https://www.patreon.com/membership/28012031";
const PATREON_PRO     = "https://www.patreon.com/membership/28012026";
const PATREON_POST    = "https://www.patreon.com/posts/151815836/";
const PATREON_LOGIN   = "/patreon/login.php";
const PATREON_MANAGE  = "https://www.patreon.com/settings/memberships";

// ── UPSELL MODAL ──────────────────────────────────────────────────────────────
function UpsellModal({ onClose, currentTier = 0 }) {
  return (
    <div style={{
      position:"fixed",inset:0,zIndex:1000,
      background:"rgba(0,0,0,0.85)",
      display:"flex",alignItems:"flex-end",justifyContent:"center",
      backdropFilter:"blur(4px)",
    }} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{
        background:"#141414",borderRadius:"20px 20px 0 0",
        padding:"24px 20px 40px",width:"100%",maxWidth:"430px",
        border:"1px solid rgba(255,255,255,0.1)",
        borderBottom:"none",
      }}>
        {/* handle */}
        <div style={{width:36,height:4,background:"rgba(255,255,255,0.2)",borderRadius:2,margin:"0 auto 20px"}}/>

        <div style={{fontFamily:"Montserrat,sans-serif",fontSize:"20px",fontWeight:900,color:"#fff",marginBottom:4}}>
          🍁 Want More Maple?
        </div>
        <div style={{fontSize:"12px",color:"rgba(255,255,255,0.4)",marginBottom:20,lineHeight:1.6}}>
          Unlock the full forecast with a Backcountry Princess membership on Patreon.
        </div>

        {/* Tier cards */}
        {[
          { name:"SAP Watch",   price:"$10/mo", color:"#3b82f6", rank:1,
            perks:["7-day sap dot forecast","Color-coded daily flow","Perfect for planning weekend taps"] },
          { name:"SAP Planner", price:"$25/mo", color:"#a855f7", rank:2,
            perks:["Full 7-day ring charts","Temp candlestick view","Solar + sap index per day"] },
          { name:"SAP Pro",     price:"$50/mo", color:"#cbd5e1", rank:3,
            perks:["Historical season charts","Advanced analytics","Coming soon — join waitlist"] },
        ].filter(t => t.rank > currentTier).map(tier => (
          <div key={tier.name} style={{
            border:`1px solid ${tier.color}55`,
            background:`${tier.color}12`,
            borderRadius:12,padding:"14px 16px",marginBottom:10,
          }}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <div style={{fontFamily:"Montserrat,sans-serif",fontSize:"14px",fontWeight:700,color:"#fff"}}>{tier.name}</div>
              <div style={{
                background:tier.color,color:"#000",
                fontFamily:"Montserrat,sans-serif",fontSize:"11px",fontWeight:700,
                padding:"4px 10px",borderRadius:999,
              }}>{tier.price}</div>
            </div>
            {tier.perks.map(p => (
              <div key={p} style={{fontSize:"11px",color:"rgba(255,255,255,0.5)",lineHeight:1.8}}>✓ {p}</div>
            ))}
          </div>
        ))}

        {/* Single CTA → Patreon post */}
        <button onClick={()=>window.open(PATREON_POST,"_blank")} style={{
          width:"100%",padding:"14px",marginTop:6,marginBottom:2,
          background:"#e8003d",border:"none",borderRadius:12,
          fontFamily:"Montserrat,sans-serif",fontSize:"13px",fontWeight:700,
          color:"#fff",cursor:"pointer",letterSpacing:"0.5px",
        }}>🍁 Subscribe on Patreon →</button>

        <div style={{textAlign:"center",marginTop:14}}>
          <div style={{fontSize:"11px",color:"rgba(255,255,255,0.3)",marginBottom:8}}>
            Already a Patreon member?
          </div>
          <button onClick={()=>{window.location.href=PATREON_LOGIN;}} style={{
            width:"100%",padding:"10px",
            background:"transparent",border:"1px solid rgba(255,255,255,0.15)",
            borderRadius:10,color:"rgba(255,255,255,0.6)",
            fontFamily:"Montserrat,sans-serif",fontSize:"11px",fontWeight:600,
            cursor:"pointer",letterSpacing:"0.5px",
          }}>LOGIN WITH PATREON</button>
        </div>

        <button onClick={onClose} style={{
          marginTop:12,width:"100%",padding:"10px",
          background:"transparent",border:"none",
          color:"rgba(255,255,255,0.25)",fontSize:"12px",cursor:"pointer",
        }}>Maybe later</button>
      </div>
    </div>
  );
}

function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
function computeSap(minC, maxC, solar) {
  const ft = minC < 0 && maxC > 0 ? 40 : 0;
  const th = maxC > 0 ? clamp(maxC * 6, 0, 30) : 0;
  const s  = clamp((solar||0) * 2.5, 0, 30);
  return Math.round(clamp(ft + th + s, 0, 100));
}
function sapColor(s) {
  if (s >= 70) return "#22c55e";
  if (s >= 40) return "#f97316";
  if (s >= 15) return "#ef4444";
  return "#4b5563";
}
function sapLabel(s) {
  if (s >= 70) return "Prime";
  if (s >= 40) return "Good";
  if (s >= 15) return "Low";
  return "None";
}
function weatherIcon(precip, solar) {
  if (precip > 3)   return "🌧";
  if (precip > 0.5) return "🌦";
  if (solar > 10)   return "☀️";
  if (solar > 5)    return "🌤";
  return "☁️";
}
function fmtDay(d) { return new Date(d+"T12:00:00").toLocaleDateString("en-CA",{weekday:"short"}).toUpperCase(); }
function fmtDate(d) { return new Date(d+"T12:00:00").toLocaleDateString("en-CA",{month:"short",day:"numeric"}); }

// ── THREE-RING DONUT ──────────────────────────────────────────────────────────
function ThreeRingDonut({ sapScore, solar, maxC, size=44 }) {
  const cx=size/2, cy=size/2;
  const rings = [
    { r:size*0.44, w:size*0.10, color:"#7dd3fc", pct:clamp((maxC+20)/30,0,1) },
    { r:size*0.32, w:size*0.10, color:"#fde68a", pct:clamp((solar||0)/15,0,1) },
    { r:size*0.20, w:size*0.10, color:sapColor(sapScore), pct:sapScore/100 },
  ];
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{display:"block",overflow:"visible"}}>
      {rings.map((ring,i) => {
        const circ=2*Math.PI*ring.r;
        return (
          <g key={i}>
            <circle cx={cx} cy={cy} r={ring.r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={ring.w}/>
            <circle cx={cx} cy={cy} r={ring.r} fill="none"
              stroke={ring.color} strokeWidth={ring.w}
              strokeDasharray={`${circ*ring.pct} ${circ*(1-ring.pct)}`}
              strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`}/>
          </g>
        );
      })}
      <text x={cx} y={cy+1} dominantBaseline="middle" textAnchor="middle"
        fill={sapColor(sapScore)} fontSize={size*0.20} fontWeight="900"
        fontFamily="Montserrat,sans-serif">{sapScore}</text>
    </svg>
  );
}

// ── SINGLE RING (Free hero) ───────────────────────────────────────────────────
function SapDonut({ score, size=96 }) {
  const r=size*0.38, circ=2*Math.PI*r, color=sapColor(score);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{display:"block"}}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={size*0.14}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke={color} strokeWidth={size*0.14}
        strokeDasharray={`${circ*(score/100)} ${circ*(1-score/100)}`}
        strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`}/>
      <text x={size/2} y={size/2+1} dominantBaseline="middle" textAnchor="middle"
        fill={color} fontSize={size*0.24} fontWeight="900" fontFamily="Montserrat,sans-serif">{score}</text>
    </svg>
  );
}

// ── CANDLESTICK ROW — single SVG spanning all 7 columns ──────────────────────
// Draws all 7 candles in one SVG so they stay perfectly aligned with the grid above.
function CandleRow({ rows, globalMin, globalMax }) {
  const W = 350, H = 64, cols = rows.length;
  const colW = W / cols;
  const padY = 14; // room for labels top/bottom
  const innerH = H - padY * 2;
  const range = (globalMax - globalMin) || 1;
  const toY = v => padY + (1 - (v - globalMin) / range) * innerH;
  const zeroY = toY(0);

  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      style={{display:"block", width:"100%"}}>
      <defs>
        <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fca5a5"/>
          <stop offset="100%" stopColor="#7dd3fc"/>
        </linearGradient>
      </defs>

      {/* freeze line across full width */}
      {zeroY >= padY && zeroY <= H - padY && (
        <line x1={0} y1={zeroY} x2={W} y2={zeroY}
          stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="3 3"/>
      )}

      {rows.map((r, i) => {
        const cx   = colW * i + colW / 2;
        const hiY  = toY(r.maxC);
        const loY  = toY(r.minC);
        const barH = Math.max(loY - hiY, 2);
        const bw   = Math.max(colW * 0.28, 4); // body width

        return (
          <g key={r.date}>
            {/* wick */}
            <line x1={cx} y1={padY} x2={cx} y2={hiY} stroke="rgba(255,255,255,0.12)" strokeWidth="1"/>
            <line x1={cx} y1={loY}  x2={cx} y2={H-padY} stroke="rgba(255,255,255,0.12)" strokeWidth="1"/>
            {/* body */}
            <rect x={cx - bw/2} y={hiY} width={bw} height={barH} rx="2"
              fill={r.maxC > 0 ? "url(#cg)" : "#7dd3fc"}/>
            {/* tmax label */}
            <text x={cx} y={hiY - 3} textAnchor="middle"
              fill="#fca5a5" fontSize="7.5" fontWeight="700" fontFamily="Montserrat,sans-serif">
              {r.maxC > 0 ? "+" : ""}{r.maxC.toFixed(0)}°
            </text>
            {/* tmin label */}
            <text x={cx} y={loY + 9} textAnchor="middle"
              fill="#7dd3fc" fontSize="7.5" fontWeight="700" fontFamily="Montserrat,sans-serif">
              {r.minC.toFixed(0)}°
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── WAITLIST CARD ─────────────────────────────────────────────────────────────
function WaitlistCard() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

  async function handleSubmit() {
    if (!email || !email.includes("@")) return;
    setSending(true);
    // TODO: wire to your real endpoint
    await new Promise(r => setTimeout(r, 600));
    setSubmitted(true);
    setSending(false);
  }

  return (
    <div style={{
      marginTop:"14px", borderRadius:"12px", padding:"16px",
      border:"1px solid rgba(203,213,225,0.25)",
      background:"linear-gradient(135deg,rgba(148,163,184,0.07),rgba(203,213,225,0.04))",
    }}>
      <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"6px"}}>
        <span style={{fontSize:"16px"}}>📊</span>
        <span style={{fontFamily:"Montserrat,sans-serif",fontSize:"12px",fontWeight:700,color:"#cbd5e1",letterSpacing:"0.5px"}}>
          SAP Pro — Coming Soon
        </span>
      </div>
      <p style={{fontSize:"12px",color:"rgba(255,255,255,0.5)",lineHeight:1.7,marginBottom:"12px"}}>
        Want <strong style={{color:"#fff"}}>historical charts, full season analytics</strong> and advanced sap flow modelling?
        Join the waitlist and we'll notify you when Pro launches.
      </p>
      {submitted ? (
        <div style={{textAlign:"center",padding:"10px",fontSize:"13px",color:"#22c55e",fontWeight:600,fontFamily:"Montserrat,sans-serif"}}>
          ✓ You're on the list! We'll be in touch.
        </div>
      ) : (
        <div style={{display:"flex",gap:"6px"}}>
          <input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={e=>setEmail(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&handleSubmit()}
            style={{
              flex:1, padding:"9px 12px",
              background:"rgba(255,255,255,0.06)",
              border:"1px solid rgba(203,213,225,0.2)",
              borderRadius:"8px", color:"#fff",
              fontFamily:"Inter,sans-serif", fontSize:"13px", outline:"none",
            }}
          />
          <button
            onClick={handleSubmit}
            disabled={sending}
            style={{
              padding:"9px 14px", background:"#cbd5e1", color:"#0a0a0a",
              border:"none", borderRadius:"8px",
              fontFamily:"Montserrat,sans-serif", fontSize:"11px", fontWeight:700,
              cursor:"pointer", whiteSpace:"nowrap", opacity:sending?0.6:1,
            }}>
            {sending ? "…" : "Notify Me"}
          </button>
        </div>
      )}
    </div>
  );
}

// ── MAP PICKER ────────────────────────────────────────────────────────────────
function MapPicker({ location, onSelect }) {
  const mapRef=useRef(null), lmap=useRef(null), mref=useRef(null);
  useEffect(()=>{
    if(lmap.current)return;
    if(!document.getElementById("leaflet-css")){const l=document.createElement("link");l.id="leaflet-css";l.rel="stylesheet";l.href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";document.head.appendChild(l);}
    const init=()=>{const L=window.L;const map=L.map(mapRef.current,{zoomControl:true}).setView([location.lat,location.lon],5);L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{attribution:"© OSM",maxZoom:18}).addTo(map);const icon=L.divIcon({html:`<div style="width:16px;height:16px;background:#e8003d;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,.5)"></div>`,className:"",iconSize:[16,16],iconAnchor:[8,8]});const marker=L.marker([location.lat,location.lon],{icon,draggable:true}).addTo(map);mref.current=marker;lmap.current=map;marker.on("dragend",e=>{const p=e.target.getLatLng();onSelect({lat:+p.lat.toFixed(4),lon:+p.lng.toFixed(4),name:`${p.lat.toFixed(2)}°, ${p.lng.toFixed(2)}°`});});map.on("click",e=>{const{lat,lng}=e.latlng;marker.setLatLng([lat,lng]);onSelect({lat:+lat.toFixed(4),lon:+lng.toFixed(4),name:`${lat.toFixed(2)}°, ${lng.toFixed(2)}°`});});};
    if(!window.L){const s=document.createElement("script");s.src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";s.onload=init;document.head.appendChild(s);}else init();
    return()=>{if(lmap.current){lmap.current.remove();lmap.current=null;}};
  },[]);
  useEffect(()=>{if(lmap.current&&mref.current){mref.current.setLatLng([location.lat,location.lon]);lmap.current.setView([location.lat,location.lon],lmap.current.getZoom());}},[location.lat,location.lon]);
  return <div ref={mapRef} style={{width:"100%",height:"200px",borderRadius:"10px",overflow:"hidden",border:"1px solid rgba(255,255,255,0.1)",marginTop:"10px"}}/>;
}

// ── CSS ───────────────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@500;700;900&family=Inter:wght@400;500&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  html,body{background:#0a0a0a;-webkit-font-smoothing:antialiased;}
  .app{font-family:'Inter',sans-serif;background:#0a0a0a;color:#f0ebe3;min-height:100vh;max-width:430px;margin:0 auto;}

  .hdr{padding:20px 18px 13px;border-bottom:1px solid rgba(255,255,255,0.07);}
  .brand{font-family:'Montserrat',sans-serif;font-size:9px;letter-spacing:3px;text-transform:uppercase;color:#e8003d;margin-bottom:2px;}
  .title{font-family:'Montserrat',sans-serif;font-size:24px;font-weight:900;color:#fff;}
  .title em{color:#e8003d;font-style:normal;}

  .sec{padding:13px 18px;border-bottom:1px solid rgba(255,255,255,0.06);}
  .sec-lbl{font-size:9px;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.25);margin-bottom:9px;font-family:'Montserrat',sans-serif;}

  .loc-pill{display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.1);border-radius:999px;padding:6px 13px;margin-bottom:9px;}
  .loc-pill-name{font-size:13px;font-weight:600;color:#fff;}
  .search-wrap{position:relative;margin-bottom:7px;}
  .search-in{width:100%;padding:10px 13px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:10px;color:#fff;font-family:'Inter',sans-serif;font-size:13px;outline:none;}
  .search-in::placeholder{color:rgba(255,255,255,0.22);}
  .search-in:focus{border-color:#e8003d;}
  .results{position:absolute;top:calc(100% + 4px);left:0;right:0;background:#1c1c1c;border:1px solid rgba(255,255,255,0.12);border-radius:10px;z-index:999;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,.7);}
  .result-item{padding:11px 13px;font-size:13px;color:#e0dbd3;cursor:pointer;border-bottom:1px solid rgba(255,255,255,0.05);}
  .result-item:last-child{border-bottom:none;}
  .result-item:active{background:rgba(232,0,61,0.2);}
  .map-btn{width:100%;padding:8px;background:transparent;color:rgba(255,255,255,0.3);border:1px solid rgba(255,255,255,0.09);border-radius:10px;font-size:11px;cursor:pointer;}
  .map-hint{font-size:10px;color:rgba(255,255,255,0.2);text-align:center;margin-top:5px;}

  .dot{width:7px;height:7px;border-radius:50%;background:#374151;}
  .dot.on{background:#22c55e;box-shadow:0 0 6px #22c55e88;}
  .acct-row{display:flex;align-items:center;gap:8px;margin-bottom:11px;}
  .btn-login{width:100%;padding:11px;background:#e8003d;color:#fff;border:none;border-radius:10px;font-family:'Montserrat',sans-serif;font-size:12px;font-weight:700;cursor:pointer;letter-spacing:1px;text-transform:uppercase;margin-bottom:7px;}
  .btn-ghost{width:100%;padding:8px;background:transparent;color:rgba(255,255,255,0.28);border:1px solid rgba(255,255,255,0.08);border-radius:10px;font-size:11px;cursor:pointer;}

  .tier-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:7px;}
  .tc{border-radius:10px;padding:10px 9px;border:1px solid;}
  .tc-watch  {border-color:#3b82f6;background:rgba(59,130,246,0.1);}
  .tc-planner{border-color:#a855f7;background:rgba(168,85,247,0.1);}
  .tc-pro    {border-color:#cbd5e1;background:rgba(203,213,225,0.07);}
  .tc.dimmed{opacity:0.35;}
  .tc-status{font-size:8px;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:3px;font-family:'Montserrat',sans-serif;}
  .tc-watch .tc-status{color:#3b82f6;} .tc-planner .tc-status{color:#a855f7;} .tc-pro .tc-status{color:#cbd5e1;}
  .tc-name{font-family:'Montserrat',sans-serif;font-size:12px;font-weight:700;color:#fff;margin-bottom:1px;}
  .tc-price{font-size:10px;color:rgba(255,255,255,0.28);margin-bottom:5px;}
  .tc-feat{font-size:9px;line-height:1.6;}
  .tc-watch .tc-feat{color:rgba(147,197,253,0.75);} .tc-planner .tc-feat{color:rgba(216,180,254,0.75);} .tc-pro .tc-feat{color:rgba(203,213,225,0.55);}



  /* WEEK SECTION */
  .week-sec{padding:14px 18px 20px;border-bottom:1px solid rgba(255,255,255,0.06);}
  .week-hdr{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px;}
  .week-title{font-family:'Montserrat',sans-serif;font-size:15px;font-weight:700;color:#fff;}
  .week-sub{font-size:9px;color:rgba(255,255,255,0.25);letter-spacing:1px;text-transform:uppercase;}

  /* 7-col grid — columns auto-size, no padding inside */
  .week-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;}

  /* PLANNER ring card */
  .pc{border-radius:10px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.03);padding:7px 2px 6px;display:flex;flex-direction:column;align-items:center;gap:4px;}
  .pc.now{border-color:rgba(232,0,61,0.55);background:rgba(232,0,61,0.07);}
  .pc-day{font-family:'Montserrat',sans-serif;font-size:9px;font-weight:700;letter-spacing:0.5px;}
  .pc-date{font-size:7px;color:rgba(255,255,255,0.28);}
  .pc-icon{font-size:12px;line-height:1;}

  /* Candle wrapper — same border style, no inner padding, full width */
  .candle-wrap{border-radius:10px;border:1px solid rgba(255,255,255,0.06);background:rgba(255,255,255,0.02);overflow:hidden;margin-top:4px;}

  /* WATCH card */
  .wc{border-radius:10px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.03);padding:7px 3px 8px;display:flex;flex-direction:column;align-items:center;gap:6px;}
  .wc.now{border-color:rgba(232,0,61,0.5);background:rgba(232,0,61,0.06);}
  .wc-day{font-family:'Montserrat',sans-serif;font-size:9px;font-weight:700;letter-spacing:0.5px;}
  .wc-date{font-size:7px;color:rgba(255,255,255,0.28);}

  .ring-legend{display:flex;justify-content:center;gap:10px;margin-top:9px;}
  .rl{display:flex;align-items:center;gap:4px;font-size:9px;color:rgba(255,255,255,0.35);}
  .rl-dot{width:7px;height:7px;border-radius:50%;}

  /* FREE HERO */
  .free-sec{padding:16px 18px 36px;}
  .free-title{font-family:'Montserrat',sans-serif;font-size:17px;font-weight:700;color:#fff;margin-bottom:2px;}
  .free-sub{font-size:9px;color:rgba(255,255,255,0.25);letter-spacing:1px;text-transform:uppercase;margin-bottom:14px;}
  .hero-card{border-radius:14px;padding:22px 18px 18px;text-align:center;margin-bottom:11px;}
  .hero-label{font-family:'Montserrat',sans-serif;font-size:20px;font-weight:700;letter-spacing:1px;margin-top:8px;}
  .hero-date{font-size:11px;color:rgba(255,255,255,0.3);margin-top:5px;}
  .stat-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:7px;margin-bottom:12px;}
  .stat-box{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:11px 6px;text-align:center;}
  .stat-val{font-family:'Montserrat',sans-serif;font-size:17px;font-weight:700;}
  .stat-lbl{font-size:9px;color:rgba(255,255,255,0.28);text-transform:uppercase;letter-spacing:1px;margin-top:2px;}

  .upsell{border-radius:11px;padding:13px 14px;border:1px solid rgba(168,85,247,0.3);background:rgba(168,85,247,0.07);font-size:12px;line-height:1.75;color:rgba(255,255,255,0.5);}
  .upsell strong{color:#fff;} .upsell a{color:#a855f7;cursor:pointer;font-weight:600;}

  .loading{padding:28px;text-align:center;font-size:12px;color:rgba(255,255,255,0.28);}
  .err{padding:12px;font-size:12px;color:#fca5a5;}
`;

export default function App() {
  const [location, setLocation] = useState({ name:"Sudbury, ON", lat:46.49, lon:-81.01 });
  const [showMap, setShowMap] = useState(false);
  const [cityQuery, setCityQuery] = useState("");
  const [cityResults, setCityResults] = useState([]);
  const searchTimer = useRef(null);
  const [showUpsell, setShowUpsell] = useState(false);
  const openUpsell = () => setShowUpsell(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [member, setMember] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const tierRank = (() => {
    if (!member?.loggedIn) return 0;
    if (member.tierKey === "SAP_PRO")     return 3;
    if (member.tierKey === "SAP_PLANNER") return 2;
    if (member.tierKey === "SAP_WATCH")   return 1;
    return 0;
  })();

  function handleCityInput(e) {
    const q = e.target.value; setCityQuery(q);
    clearTimeout(searchTimer.current);
    if (!q || q.length < 2) { setCityResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=en&format=json`);
        const data = await res.json();
        setCityResults(data.results || []);
      } catch { setCityResults([]); }
    }, 350);
  }
  function selectCity(r) {
    setLocation({ name:`${r.name}, ${r.admin1}`, lat:+r.latitude.toFixed(4), lon:+r.longitude.toFixed(4) });
    setCityQuery(""); setCityResults([]); setShowMap(false);
  }

  async function loadWeather() {
    setLoading(true); setError("");
    try {
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${location.lat}&longitude=${location.lon}&daily=temperature_2m_min,temperature_2m_max,precipitation_sum,shortwave_radiation_sum&timezone=auto`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json(); const d = json?.daily;
      if (!d?.time?.length) throw new Error("No data");
      setRows(d.time.slice(0,7).map((date,i) => ({date,minC:d.temperature_2m_min[i],maxC:d.temperature_2m_max[i],precip:d.precipitation_sum[i],solar:d.shortwave_radiation_sum[i],sap:computeSap(d.temperature_2m_min[i],d.temperature_2m_max[i],d.shortwave_radiation_sum[i])})));
    } catch(e) { setError(String(e?.message||e)); }
    finally { setLoading(false); }
  }

  async function refreshPatreon() {
    setAuthLoading(true);
    try {
      const res = await fetch("/patreon/status.php",{credentials:"include"});
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data?.level && data.level !== "none") {
        const lm={watch:"SAP_WATCH",planner:"SAP_PLANNER",pro:"SAP_PRO"};
        const ll={watch:"SAP Watch",planner:"SAP Planner",pro:"SAP Pro"};
        setMember({loggedIn:true,tierKey:lm[data.level],tierLabel:ll[data.level]});
      } else setMember(null);
    } catch { setMember(null); }
    finally { setAuthLoading(false); }
  }

  useEffect(() => { loadWeather(); }, [location.lat, location.lon]);
  useEffect(() => { refreshPatreon(); }, []);

  const globalMin = rows.length ? Math.min(...rows.map(r=>r.minC)) : -20;
  const globalMax = rows.length ? Math.max(...rows.map(r=>r.maxC)) : 10;
  const today = rows[0];

  return (
    <>
      <style>{css}</style>
      <div className="app">
        {showUpsell && <UpsellModal onClose={()=>setShowUpsell(false)} currentTier={tierRank}/>}

        <div className="hdr">
          <div className="brand">Backcountry Princess</div>
          <div className="title">Maple <em>Sap</em> Predictor</div>
        </div>



        {/* LOCATION */}
        <div className="sec">
          <div className="sec-lbl">Location</div>
          <div className="loc-pill"><span>📍</span><span className="loc-pill-name">{location.name}</span></div>
          <div className="search-wrap">
            <input className="search-in" type="text" placeholder="Search city or region…" value={cityQuery} onChange={handleCityInput} autoComplete="off"/>
            {cityResults.length > 0 && (
              <div className="results">
                {cityResults.map(r => (
                  <div key={r.id} className="result-item" onClick={()=>selectCity(r)}>
                    {r.name}, {r.admin1} · {r.country_code}
                  </div>
                ))}
              </div>
            )}
          </div>
          <button className="map-btn" onClick={()=>setShowMap(v=>!v)} type="button">
            {showMap?"▲ Hide map":"🗺  Pick on map"}
          </button>
          {showMap && <><MapPicker location={location} onSelect={setLocation}/><div className="map-hint">Tap anywhere or drag the pin</div></>}
        </div>

        {/* ACCOUNT */}
        <div className="sec">
          <div className="sec-lbl">Account</div>
          <div className="acct-row">
            <div className={`dot ${member?.loggedIn?"on":""}`}/>
            <span style={{fontSize:"13px",color:"#fff",fontWeight:500}}>
              {authLoading?"Checking…":member?.loggedIn?member.tierLabel:"Not logged in"}
            </span>
          </div>
          {member?.loggedIn ? (
            <>
              <button className="btn-login" onClick={()=>window.open(PATREON_MANAGE,"_blank")} type="button">
                Manage Membership on Patreon ↗
              </button>
              <button className="btn-ghost" onClick={refreshPatreon} type="button">↻ Refresh status</button>
            </>
          ) : (
            <>
              <button className="btn-login" onClick={openUpsell} type="button">
                🍁 Get More Maple
              </button>
              <button className="btn-ghost" onClick={()=>window.location.href=PATREON_LOGIN} type="button">
                Already a member? Login with Patreon
              </button>
            </>
          )}
        </div>

        {/* TIER CARDS */}
        <div className="sec">
          <div className="sec-lbl">Plans</div>
          <div className="tier-grid">
            <div className={`tc tc-watch ${tierRank<1?"dimmed":""}`}
              onClick={tierRank<1?openUpsell:undefined}
              style={{cursor:tierRank<1?"pointer":"default"}}>
              <div className="tc-status">{tierRank>=1?"✓ Active":"🔒 Locked"}</div>
              <div className="tc-name">Watch</div><div className="tc-price">$10/mo</div>
              <div className="tc-feat">7-day sap<br/>dots only</div>
            </div>
            <div className={`tc tc-planner ${tierRank<2?"dimmed":""}`}
              onClick={tierRank<2?openUpsell:undefined}
              style={{cursor:tierRank<2?"pointer":"default"}}>
              <div className="tc-status">{tierRank>=2?"✓ Active":"🔒 Locked"}</div>
              <div className="tc-name">Planner</div><div className="tc-price">$25/mo</div>
              <div className="tc-feat">Full rings<br/>+ candles</div>
            </div>
            <div className="tc tc-pro dimmed" onClick={openUpsell} style={{cursor:"pointer"}}>
              <div className="tc-status">Coming Soon</div>
              <div className="tc-name">Pro</div><div className="tc-price">$50/mo</div>
              <div className="tc-feat">Analytics<br/>+ history</div>
            </div>
          </div>
        </div>

        {/* ── PLANNER VIEW ── */}
        {tierRank >= 2 && (
          <div className="week-sec">
            <div className="week-hdr">
              <div className="week-title">7-Day Forecast</div>
              <div className="week-sub">{location.name}</div>
            </div>
            {loading && <div className="loading">Loading…</div>}
            {error && <div className="err">⚠ {error}</div>}
            {!loading && !error && (
              <>
                {/* Ring cards — one per column */}
                <div className="week-grid">
                  {rows.map((r,i) => (
                    <div key={r.date} className={`pc ${i===0?"now":""}`}>
                      <div className="pc-day" style={{color:i===0?"#e8003d":"#fff"}}>{i===0?"NOW":fmtDay(r.date)}</div>
                      <div className="pc-date">{fmtDate(r.date)}</div>
                      <div className="pc-icon">{weatherIcon(r.precip,r.solar)}</div>
                      <ThreeRingDonut sapScore={r.sap} solar={r.solar} maxC={r.maxC} size={44}/>
                    </div>
                  ))}
                </div>

                {/* Candlestick — single SVG spanning full width, perfectly aligned */}
                <div className="candle-wrap">
                  <CandleRow rows={rows} globalMin={globalMin} globalMax={globalMax}/>
                </div>

                {/* Legend */}
                <div className="ring-legend">
                  <div className="rl"><div className="rl-dot" style={{background:"#7dd3fc"}}/> Temp</div>
                  <div className="rl"><div className="rl-dot" style={{background:"#fde68a"}}/> Solar</div>
                  <div className="rl"><div className="rl-dot" style={{background:"#22c55e"}}/> Sap</div>
                  <div className="rl"><div className="rl-dot" style={{background:"linear-gradient(#fca5a5,#7dd3fc)"}}/> T range</div>
                </div>

                {/* Pro waitlist */}
                <WaitlistCard/>
              </>
            )}
          </div>
        )}

        {/* ── WATCH VIEW ── */}
        {tierRank === 1 && (
          <div className="week-sec">
            <div className="week-hdr">
              <div className="week-title">This Week</div>
              <div className="week-sub">{location.name}</div>
            </div>
            {loading && <div className="loading">Loading…</div>}
            {error && <div className="err">⚠ {error}</div>}
            {!loading && !error && (
              <>
                <div className="week-grid">
                  {rows.map((r,i) => {
                    const color = sapColor(r.sap);
                    return (
                      <div key={r.date} className={`wc ${i===0?"now":""}`}>
                        <div className="wc-day" style={{color:i===0?"#e8003d":"#fff"}}>{i===0?"NOW":fmtDay(r.date)}</div>
                        <div className="wc-date">{fmtDate(r.date)}</div>
                        <div style={{width:32,height:32,borderRadius:"50%",background:color,boxShadow:`0 0 12px ${color}77`}}/>
                      </div>
                    );
                  })}
                </div>
                <div style={{marginTop:"12px",cursor:"pointer"}} onClick={openUpsell}>
                  <div className="upsell">🍁 <strong>Want temp, solar & candle charts?</strong> Upgrade to <strong>Planner ($25/mo)</strong>. <a>Subscribe →</a></div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── FREE VIEW ── */}
        {tierRank === 0 && (
          <div className="free-sec">
            <div className="free-title">Is Sap Running Today?</div>
            <div className="free-sub">{location.name}</div>
            {loading && <div className="loading">Loading…</div>}
            {error && <div className="err">⚠ {error}</div>}
            {!loading && !error && today && (() => {
              const color = sapColor(today.sap);
              return (
                <>
                  <div className="hero-card" style={{background:`${color}18`,border:`1px solid ${color}55`}}>
                    <div style={{display:"flex",justifyContent:"center"}}><SapDonut score={today.sap} size={96}/></div>
                    <div className="hero-label" style={{color}}>{sapLabel(today.sap)} Flow</div>
                    <div className="hero-date">{fmtDate(today.date)}</div>
                  </div>
                  <div className="stat-grid">
                    <div className="stat-box"><div className="stat-val" style={{color:"#7dd3fc"}}>{today.minC.toFixed(1)}°</div><div className="stat-lbl">Min</div></div>
                    <div className="stat-box"><div className="stat-val" style={{color:"#fca5a5"}}>{today.maxC.toFixed(1)}°</div><div className="stat-lbl">Max</div></div>
                    <div className="stat-box"><div className="stat-val" style={{color:"#fde68a"}}>{today.solar.toFixed(1)}</div><div className="stat-lbl">kWh/m²</div></div>
                  </div>
                  <div className="upsell" onClick={openUpsell} style={{cursor:"pointer"}}>🍁 <strong>Plan your whole week.</strong> <strong>Watch ($10/mo)</strong> for 7-day dots · <strong>Planner ($25/mo)</strong> for full details + candle charts. <a>Subscribe →</a></div>
                </>
              );
            })()}
          </div>
        )}

      </div>
    </>
  );
}
