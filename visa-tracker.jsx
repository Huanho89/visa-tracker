import { useState, useEffect, useRef } from "react";

// ── Constants ─────────────────────────────────────────────────────────
const VI_MONTHS = ["january","february","march","april","may","june","july","august","september","october","november","december"];
const VI_MONTH_NAMES = ["Tháng 1","Tháng 2","Tháng 3","Tháng 4","Tháng 5","Tháng 6","Tháng 7","Tháng 8","Tháng 9","Tháng 10","Tháng 11","Tháng 12"];

const VISA_CATEGORIES = ["F1","F2A","F2B","F3","F4","EB1","EB2","EB3"];
const CHARGEABILITY_AREAS = ["All Areas (Mặc định)","CHINA","INDIA","MEXICO","PHILIPPINES"];

// Seed bulletins — full F2B "All Areas" data
const SEED_BULLETINS = [
  { month:"Tháng 5/2026",  data:{ F2B:{ finalAction:new Date("2017-09-22"), filing:new Date("2018-03-22") } } },
  { month:"Tháng 6/2026",  data:{ F2B:{ finalAction:new Date("2017-09-22"), filing:new Date("2018-03-22") } } },
  { month:"Tháng 7/2026",  data:{ F2B:{ finalAction:new Date("2017-11-22"), filing:new Date("2018-06-08") } } },
];

// Default profile (Huân)
const DEFAULT_CASE = {
  id: "huan",
  name: "Huân",
  category: "F2B",
  chargeability: "All Areas (Mặc định)",
  priorityDate: "2017-11-20",
  nvcCase: "HCM2021526022",
  invoiceId: "IVSCA00001821415",
  consulate: "Ho Chi Minh City",
  petitioner: "Gilbert, AZ",
};

// ── Helpers ───────────────────────────────────────────────────────────
function fmt(date) {
  if (!date || isNaN(date)) return "—";
  return date.toLocaleDateString("vi-VN", { day:"2-digit", month:"2-digit", year:"numeric" });
}
function fmtTime(date) {
  if (!date) return "";
  return date.toLocaleString("vi-VN", { hour:"2-digit", minute:"2-digit", day:"2-digit", month:"2-digit", year:"numeric" });
}
function daysBetween(a, b) { return Math.round((b - a) / 86400000); }

function parseVisaDate(str) {
  if (!str) return null;
  const M = { JAN:0,FEB:1,MAR:2,APR:3,MAY:4,JUN:5,JUL:6,AUG:7,SEP:8,OCT:9,NOV:10,DEC:11 };
  const m = str.trim().match(/^(\d{2})([A-Z]{3})(\d{4})$/);
  if (!m) return null;
  return new Date(parseInt(m[3]), M[m[2]], parseInt(m[1]));
}

function getBulletinForCase(bulletins, caseInfo) {
  // For now all seed data is F2B All Areas; AI fetch will populate others
  return bulletins.map(b => {
    const key = caseInfo.category;
    const entry = b.data?.[key];
    return { month: b.month, finalAction: entry?.finalAction || null, filing: entry?.filing || null };
  }).filter(b => b.finalAction);
}

function uid() { return Math.random().toString(36).slice(2,8); }

// ── AI fetch ──────────────────────────────────────────────────────────
async function fetchBulletinFromAI(monthLabel, url, category) {
  const prompt = `Fetch nội dung trang Visa Bulletin tại URL: ${url}

Trích xuất thông tin diện ${category} (Family/Employment preference) cho cột "All Chargeability Areas Except Those Listed":

1. Final Action Date cho ${category} (bảng FINAL ACTION DATES)
2. Dates for Filing cho ${category} (bảng DATES FOR FILING)

Trả lời CHỈ JSON:
{"finalAction":"DDMMMYYYY","filing":"DDMMMYYYY","found":true}

Nếu không tìm thấy: {"found":false}`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({
      model:"claude-sonnet-4-6", max_tokens:500,
      tools:[{ type:"web_search_20250305", name:"web_search" }],
      messages:[{ role:"user", content:prompt }]
    })
  });
  const data = await response.json();
  const text = data.content?.filter(b=>b.type==="text").map(b=>b.text).join("") || "";
  const clean = text.replace(/```json|```/g,"").trim();
  const parsed = JSON.parse(clean);
  if (!parsed.found) return null;
  return { finalAction: parseVisaDate(parsed.finalAction), filing: parseVisaDate(parsed.filing) };
}

// ── Steps ─────────────────────────────────────────────────────────────
function getSteps(caseInfo, bulletinEntry) {
  const pd = new Date(caseInfo.priorityDate);
  if (!bulletinEntry || !bulletinEntry.finalAction) return [];
  const isFiling = pd < bulletinEntry.filing;
  const isFinal  = pd < bulletinEntry.finalAction;
  const daysLeft = daysBetween(pd, bulletinEntry.finalAction);
  return [
    { id:"uscis",     label:"USCIS Approved",              sub:"I-130 petition được chấp thuận",               done:true,    active:false },
    { id:"nvc",       label:"NVC Received",                sub:"Hồ sơ đã chuyển đến NVC",                      done:true,    active:false },
    { id:"filing",    label:"Dates for Filing — Current",
      sub: isFiling ? "✅ Đủ điều kiện nộp hồ sơ" : `⏳ Chờ — Filing Date: ${fmt(bulletinEntry.filing)}`,
      done:isFiling,  active:!isFiling },
    { id:"fee",       label:"Thanh toán IV Fee",
      sub:`Người bảo lãnh tại ${caseInfo.petitioner} thanh toán qua CEAC`,
      done:false,     active:isFiling, action:"ceac.state.gov/IV" },
    { id:"ds260",     label:"Nộp DS-260 + Hồ sơ",         sub:"Đơn xin visa + I-864 + giấy tờ dân sự",        done:false,   active:false },
    { id:"final",     label:"Final Action Date — Current",
      sub: isFinal ? "🎉 HỒ SƠ CURRENT! Có thể lên lịch phỏng vấn"
         : daysLeft<=30 ? `🔥 RẤT GẦN — còn ${daysLeft} ngày` : `⏳ Còn ${daysLeft} ngày`,
      done:isFinal,   active:!isFinal && isFiling, urgent:!isFinal && daysLeft<=30 },
    { id:"dq",        label:"Documentarily Qualified (DQ)", sub:"NVC xác nhận hồ sơ đầy đủ",                  done:false,   active:false },
    { id:"interview", label:"Phỏng vấn",                   sub:`Lãnh sự quán Mỹ tại ${caseInfo.consulate}`,    done:false,   active:false },
    { id:"visa",      label:"Visa được cấp 🇺🇸",           sub:"Nhận visa và chuẩn bị định cư",                done:false,   active:false },
  ];
}

// ── Trend Chart ───────────────────────────────────────────────────────
function TrendChart({ entries, priorityDate }) {
  const pd = new Date(priorityDate);
  const allDates = entries.map(e=>e.finalAction).filter(Boolean);
  if (!allDates.length) return null;
  const minDate = new Date(Math.min(...allDates, pd) - 45*86400000);
  const maxDate = new Date(Math.max(...allDates, pd) + 45*86400000);
  const range   = maxDate - minDate;
  const pdPct   = Math.min(100, Math.max(0, ((pd-minDate)/range)*100));

  return (
    <div style={{ background:"#0f172a", borderRadius:16, padding:"18px 20px", marginTop:20 }}>
      <div style={{ color:"#94a3b8", fontSize:10, fontWeight:700, letterSpacing:2, textTransform:"uppercase", marginBottom:14 }}>
        Lịch sử Final Action Date
      </div>
      {entries.map((e,i) => {
        const pct = Math.min(100, Math.max(0, ((e.finalAction-minDate)/range)*100));
        const over = e.finalAction > pd;
        return (
          <div key={i} style={{ marginBottom:12 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ color:"#64748b", fontSize:10, width:72, flexShrink:0 }}>{e.month.replace("Tháng ","T")}</div>
              <div style={{ flex:1, position:"relative", height:7, background:"#1e293b", borderRadius:4 }}>
                <div style={{ position:"absolute", left:0, width:`${pct}%`, height:"100%",
                  background: over ? "linear-gradient(90deg,#3b82f6,#10b981)" : "linear-gradient(90deg,#3b82f6,#6366f1)",
                  borderRadius:4, transition:"width 0.8s ease" }} />
                <div style={{ position:"absolute", left:`${pdPct}%`, top:-4, width:2, height:15,
                  background:"#f59e0b", borderRadius:2, transform:"translateX(-50%)" }} />
              </div>
              <div style={{ color:over?"#10b981":"#94a3b8", fontSize:10, width:72, textAlign:"right" }}>
                {fmt(e.finalAction)}
              </div>
            </div>
          </div>
        );
      })}
      <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:4 }}>
        <div style={{ width:10, height:2, background:"#f59e0b" }} />
        <span style={{ color:"#f59e0b", fontSize:9 }}>Priority Date: {fmt(pd)}</span>
      </div>
    </div>
  );
}

// ── Case Form Modal ───────────────────────────────────────────────────
function CaseForm({ initial, onSave, onCancel }) {
  const empty = { id:uid(), name:"", category:"F2B", chargeability:"All Areas (Mặc định)",
    priorityDate:"", nvcCase:"", invoiceId:"", consulate:"Ho Chi Minh City", petitioner:"" };
  const [form, setForm] = useState(initial || empty);

  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const valid = form.name && form.priorityDate && form.category;

  const inp = (label, key, type="text", placeholder="") => (
    <div style={{ marginBottom:14 }}>
      <div style={{ fontSize:11, color:"#94a3b8", marginBottom:5, fontWeight:600 }}>{label}</div>
      <input type={type} value={form[key]} placeholder={placeholder}
        onChange={e=>set(key,e.target.value)}
        style={{ width:"100%", background:"#0f172a", border:"1px solid #334155", borderRadius:10,
          padding:"10px 12px", color:"#e2e8f0", fontSize:13, outline:"none", boxSizing:"border-box" }} />
    </div>
  );

  const sel = (label, key, opts) => (
    <div style={{ marginBottom:14 }}>
      <div style={{ fontSize:11, color:"#94a3b8", marginBottom:5, fontWeight:600 }}>{label}</div>
      <select value={form[key]} onChange={e=>set(key,e.target.value)}
        style={{ width:"100%", background:"#0f172a", border:"1px solid #334155", borderRadius:10,
          padding:"10px 12px", color:"#e2e8f0", fontSize:13, outline:"none" }}>
        {opts.map(o=><option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", zIndex:100,
      display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
      <div style={{ background:"#1e293b", borderRadius:"20px 20px 0 0", padding:"24px 20px 36px",
        width:"100%", maxWidth:480, maxHeight:"90vh", overflowY:"auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <div style={{ fontSize:16, fontWeight:800, color:"#f1f5f9" }}>
            {initial ? "✏️ Sửa hồ sơ" : "➕ Thêm hồ sơ mới"}
          </div>
          <button onClick={onCancel} style={{ background:"#334155", border:"none", borderRadius:8,
            color:"#94a3b8", width:32, height:32, cursor:"pointer", fontSize:16 }}>✕</button>
        </div>
        {inp("Tên / Ghi chú *", "name", "text", "VD: Nguyễn Văn A")}
        {sel("Diện visa *", "category", VISA_CATEGORIES)}
        {sel("Chargeability Area", "chargeability", CHARGEABILITY_AREAS)}
        {inp("Priority Date *", "priorityDate", "date")}
        {inp("NVC Case Number", "nvcCase", "text", "VD: HCM2021526022")}
        {inp("Invoice ID", "invoiceId", "text", "VD: IVSCA00001821415")}
        {inp("Lãnh sự quán phỏng vấn", "consulate", "text", "VD: Ho Chi Minh City")}
        {inp("Người bảo lãnh / Địa chỉ", "petitioner", "text", "VD: Gilbert, AZ")}

        <div style={{ display:"flex", gap:10, marginTop:8 }}>
          <button onClick={onCancel} style={{ flex:1, padding:"13px", borderRadius:12, border:"1px solid #334155",
            background:"transparent", color:"#94a3b8", fontSize:14, cursor:"pointer" }}>
            Huỷ
          </button>
          <button onClick={() => valid && onSave(form)} disabled={!valid}
            style={{ flex:2, padding:"13px", borderRadius:12, border:"none",
              background: valid ? "linear-gradient(135deg,#3b82f6,#6366f1)" : "#334155",
              color:"#fff", fontSize:14, fontWeight:700, cursor:valid?"pointer":"not-allowed" }}>
            Lưu hồ sơ
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Case Switcher ─────────────────────────────────────────────────────
function CaseSwitcher({ cases, activeId, onSelect, onAdd, onEdit, onDelete }) {
  return (
    <div style={{ display:"flex", gap:8, overflowX:"auto", paddingBottom:4 }}>
      {cases.map(c => (
        <div key={c.id} style={{ display:"flex", alignItems:"center", gap:0, flexShrink:0 }}>
          <button onClick={() => onSelect(c.id)} style={{
            padding:"7px 14px", borderRadius: cases.length>1?"10px 0 0 10px":"10px",
            border:"none", cursor:"pointer",
            background: activeId===c.id ? "#3b82f6" : "#1e293b",
            color: activeId===c.id ? "#fff" : "#64748b",
            fontSize:12, fontWeight:700, transition:"all 0.2s", whiteSpace:"nowrap"
          }}>
            {c.name}
            <span style={{ fontSize:9, opacity:0.7, marginLeft:4 }}>({c.category})</span>
          </button>
          {activeId===c.id && (
            <div style={{ display:"flex" }}>
              <button onClick={()=>onEdit(c)} style={{
                padding:"7px 8px", background:"#334155", border:"none", cursor:"pointer",
                color:"#94a3b8", fontSize:11, borderLeft:"1px solid #1e293b"
              }}>✏️</button>
              {cases.length>1 && (
                <button onClick={()=>onDelete(c.id)} style={{
                  padding:"7px 8px", background:"#334155", border:"none", cursor:"pointer",
                  color:"#ef4444", fontSize:11, borderLeft:"1px solid #1e293b", borderRadius:"0 10px 10px 0"
                }}>🗑</button>
              )}
              {cases.length===1 && <div style={{ width:0, background:"#334155", borderRadius:"0 10px 10px 0" }}/>}
            </div>
          )}
        </div>
      ))}
      <button onClick={onAdd} style={{
        padding:"7px 12px", borderRadius:10, border:"1px dashed #334155",
        background:"transparent", color:"#64748b", fontSize:12, cursor:"pointer", flexShrink:0
      }}>+ Thêm</button>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────
export default function VisaTracker() {
  const [cases, setCases]           = useState([DEFAULT_CASE]);
  const [activeId, setActiveId]     = useState(DEFAULT_CASE.id);
  const [bulletins, setBulletins]   = useState(SEED_BULLETINS);
  const [selBulletin, setSelBulletin] = useState(SEED_BULLETINS.length-1);
  const [showForm, setShowForm]     = useState(false);
  const [editCase, setEditCase]     = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [loading, setLoading]       = useState(false);
  const [loadMsg, setLoadMsg]       = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const intervalRef = useRef(null);

  const activeCase = cases.find(c=>c.id===activeId) || cases[0];
  const entries    = getBulletinForCase(bulletins, activeCase);
  const bulletin   = entries[Math.min(selBulletin, entries.length-1)] || entries[entries.length-1];
  const steps      = bulletin ? getSteps(activeCase, bulletin) : [];
  const doneCount  = steps.filter(s=>s.done).length;
  const progress   = steps.length ? Math.round((doneCount/steps.length)*100) : 0;
  const pd         = new Date(activeCase.priorityDate);
  const isFinal    = bulletin && pd < bulletin.finalAction;
  const daysLeftAbs = bulletin ? Math.abs(daysBetween(pd, bulletin.finalAction)) : 0;

  async function doUpdate() {
    if (loading) return;
    setLoading(true); setLoadMsg(""); 
    const now = new Date();
    let added = 0;
    for (let i=0; i<2; i++) {
      let mo = now.getMonth()+i, yr = now.getFullYear();
      if (mo>11){mo-=12;yr++;}
      const label = `${VI_MONTH_NAMES[mo]}/${yr}`;
      const alreadyHave = bulletins.some(b=>b.month===label);
      if (alreadyHave) continue;
      setLoadMsg(`Đang tải ${label}...`);
      const url = `https://travel.state.gov/content/travel/en/legal/visa-law0/visa-bulletin/${yr}/visa-bulletin-for-${VI_MONTHS[mo]}-${yr}.html`;
      try {
        const res = await fetchBulletinFromAI(label, url, activeCase.category);
        if (res) {
          setBulletins(prev => {
            const next = [...prev, { month:label, data:{ [activeCase.category]: res } }];
            setSelBulletin(next.length-1);
            return next;
          });
          added++;
        }
      } catch(e) { console.error(e); }
    }
    setLoadMsg(added>0 ? `Đã cập nhật ${added} Bulletin mới!` : "Chưa có Bulletin mới");
    setLastUpdated(new Date());
    setLoading(false);
    setTimeout(()=>setLoadMsg(""), 4000);
  }

  useEffect(()=>{
    intervalRef.current = setInterval(doUpdate, 7*24*60*60*1000);
    return ()=>clearInterval(intervalRef.current);
  },[]);

  function saveCase(form) {
    if (editCase) {
      setCases(cs => cs.map(c=>c.id===form.id ? form : c));
    } else {
      setCases(cs => [...cs, form]);
      setActiveId(form.id);
    }
    setShowForm(false); setEditCase(null);
  }
  function deleteCase(id) {
    setCases(cs => { const next=cs.filter(c=>c.id!==id); setActiveId(next[0].id); return next; });
  }

  const spin = loading ? { animation:"spin 1s linear infinite" } : {};

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(160deg,#020617 0%,#0f172a 50%,#0c1a3a 100%)",
      fontFamily:"'Inter',system-ui,sans-serif", color:"#e2e8f0", paddingBottom:48 }}>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}} input,select{color-scheme:dark}`}</style>

      {/* Header */}
      <div style={{ background:"linear-gradient(135deg,#1e3a5f 0%,#1e293b 100%)",
        borderBottom:"1px solid #1e3a5f", padding:"18px 16px 14px", position:"sticky", top:0, zIndex:10 }}>
        <div style={{ maxWidth:480, margin:"0 auto" }}>
          {/* Top row */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
            <div>
              <div style={{ fontSize:10, color:"#60a5fa", fontWeight:700, letterSpacing:2, textTransform:"uppercase", marginBottom:3 }}>
                🇺🇸 Hồ sơ Định cư Mỹ
              </div>
              <div style={{ fontSize:20, fontWeight:800, color:"#f1f5f9" }}>{activeCase.name}</div>
              <div style={{ fontSize:11, color:"#64748b", marginTop:1 }}>
                Diện {activeCase.category} · {activeCase.nvcCase || "—"}
              </div>
            </div>
            <div style={{ background: isFinal
              ? "linear-gradient(135deg,#059669,#10b981)"
              : "linear-gradient(135deg,#1d4ed8,#3b82f6)",
              borderRadius:12, padding:"7px 12px", textAlign:"center", minWidth:56 }}>
              <div style={{ fontSize:20, fontWeight:900 }}>{progress}%</div>
              <div style={{ fontSize:9, color:"rgba(255,255,255,0.7)", textTransform:"uppercase", letterSpacing:1 }}>tiến độ</div>
            </div>
          </div>

          {/* Case switcher */}
          <CaseSwitcher
            cases={cases} activeId={activeId}
            onSelect={id=>{setActiveId(id);setSelBulletin(SEED_BULLETINS.length-1);}}
            onAdd={()=>{setEditCase(null);setShowForm(true);}}
            onEdit={c=>{setEditCase(c);setShowForm(true);}}
            onDelete={deleteCase}
          />

          {/* Progress bar */}
          <div style={{ marginTop:12, background:"#1e293b", borderRadius:6, height:5 }}>
            <div style={{ height:"100%", width:`${progress}%`, borderRadius:6,
              background:"linear-gradient(90deg,#3b82f6,#10b981)", transition:"width 0.6s ease" }} />
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", marginTop:5 }}>
            <span style={{ fontSize:10, color:"#64748b" }}>{doneCount}/{steps.length} bước</span>
            <span style={{ fontSize:10, color:"#64748b" }}>NVC Stage</span>
          </div>

          {/* Update button */}
          <div style={{ display:"flex", alignItems:"center", gap:10, marginTop:12 }}>
            <button onClick={doUpdate} disabled={loading} style={{
              display:"flex", alignItems:"center", gap:6, padding:"7px 16px", borderRadius:20,
              border:"none", cursor:loading?"not-allowed":"pointer",
              background: loading ? "#1e293b" : "linear-gradient(135deg,#3b82f6,#6366f1)",
              color:"#fff", fontSize:12, fontWeight:700, opacity:loading?0.7:1
            }}>
              <span style={{ display:"inline-block", ...spin }}>↻</span>
              {loading ? "Đang tải..." : "Cập nhật Bulletin"}
            </button>
            <div style={{ flex:1 }}>
              {loadMsg && <div style={{ fontSize:11, color:"#60a5fa" }}>{loadMsg}</div>}
              {!loadMsg && lastUpdated && <div style={{ fontSize:10, color:"#475569" }}>Cập nhật lúc {fmtTime(lastUpdated)}</div>}
              {!loadMsg && !lastUpdated && <div style={{ fontSize:10, color:"#334155" }}>Tự động cập nhật mỗi 7 ngày</div>}
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth:480, margin:"0 auto", padding:"0 16px" }}>

        {/* Status card */}
        {bulletin && (
          <div style={{ marginTop:18,
            background: isFinal
              ? "linear-gradient(135deg,rgba(5,150,105,0.2),rgba(16,185,129,0.1))"
              : daysLeftAbs<=10
              ? "linear-gradient(135deg,rgba(245,158,11,0.2),rgba(251,191,36,0.1))"
              : "linear-gradient(135deg,rgba(30,58,95,0.6),rgba(30,41,59,0.6))",
            border: isFinal?"1px solid #059669":daysLeftAbs<=10?"1px solid #f59e0b":"1px solid #1e3a5f",
            borderRadius:16, padding:"14px 18px" }}>
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:1.5, textTransform:"uppercase", marginBottom:6,
              color: isFinal?"#10b981":daysLeftAbs<=10?"#f59e0b":"#60a5fa" }}>
              {isFinal?"✅ CURRENT":daysLeftAbs<=10?"🔥 CỰC KỲ GẦN":"⏳ ĐANG CHỜ"}
            </div>
            <div style={{ fontSize:13, color:"#cbd5e1", lineHeight:1.6 }}>
              {isFinal
                ? "Priority Date đã vượt Final Action Date. NVC sẽ sắp xếp phỏng vấn!"
                : `Final Action Date còn cách Priority Date ${daysLeftAbs} ngày (≈${Math.ceil(daysLeftAbs/7)} tuần).`}
            </div>
            <div style={{ display:"flex", gap:8, marginTop:12 }}>
              {[
                ["Priority Date", fmt(pd), "#f1f5f9"],
                ["Final Action", fmt(bulletin.finalAction), isFinal?"#10b981":"#f1f5f9"],
                ["Filing Date", fmt(bulletin.filing), "#10b981"],
              ].map(([label,val,color])=>(
                <div key={label} style={{ flex:1, background:"rgba(0,0,0,0.25)", borderRadius:10, padding:"8px 10px" }}>
                  <div style={{ fontSize:9, color:"#64748b", textTransform:"uppercase", letterSpacing:1 }}>{label}</div>
                  <div style={{ fontSize:11, fontWeight:700, color, marginTop:2 }}>{val}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bulletin tabs */}
        {entries.length > 0 && (
          <div style={{ marginTop:18 }}>
            <div style={{ fontSize:10, color:"#64748b", fontWeight:700, letterSpacing:1.5, textTransform:"uppercase", marginBottom:8 }}>
              Visa Bulletin đã có
            </div>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {entries.map((e,i)=>(
                <button key={i} onClick={()=>setSelBulletin(i)} style={{
                  padding:"6px 12px", borderRadius:10, border:"none", cursor:"pointer",
                  background: selBulletin===i?"#3b82f6":"#1e293b",
                  color: selBulletin===i?"#fff":"#64748b",
                  fontSize:11, fontWeight:700, transition:"all 0.2s"
                }}>
                  {e.month.replace("Tháng ","T")}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chart */}
        {entries.length > 0 && <TrendChart entries={entries} priorityDate={activeCase.priorityDate} />}

        {/* Steps */}
        {steps.length > 0 && (
          <div style={{ marginTop:22 }}>
            <div style={{ fontSize:10, color:"#64748b", fontWeight:700, letterSpacing:1.5, textTransform:"uppercase", marginBottom:14 }}>
              Tiến độ hồ sơ
            </div>
            {steps.map((step,i)=>{
              const isLast = i===steps.length-1;
              return (
                <div key={step.id} style={{ display:"flex", gap:12, position:"relative" }}>
                  {!isLast && <div style={{ position:"absolute", left:16, top:34, bottom:0, width:2,
                    background:step.done?"linear-gradient(#10b981,#3b82f6)":"#1e293b", zIndex:0 }}/>}
                  <div style={{ width:34, height:34, borderRadius:"50%", flexShrink:0, zIndex:1,
                    display:"flex", alignItems:"center", justifyContent:"center", fontSize:13,
                    background: step.done ? "linear-gradient(135deg,#059669,#10b981)"
                      : step.urgent ? "linear-gradient(135deg,#b45309,#f59e0b)"
                      : step.active ? "linear-gradient(135deg,#1d4ed8,#3b82f6)" : "#1e293b",
                    border: step.active&&!step.done?"2px solid #3b82f6":"2px solid transparent",
                    boxShadow: step.active&&!step.done?"0 0 12px rgba(59,130,246,0.4)":"none" }}>
                    {step.done?"✓":step.urgent?"🔥":step.active?"▶":"○"}
                  </div>
                  <div style={{ flex:1, paddingBottom:18 }}>
                    <div style={{
                      background: step.urgent?"rgba(245,158,11,0.08)":step.active&&!step.done?"rgba(59,130,246,0.08)":"transparent",
                      borderRadius:12, padding:step.active||step.urgent?"10px 14px":"4px 0",
                      border: step.urgent?"1px solid rgba(245,158,11,0.2)":step.active&&!step.done?"1px solid rgba(59,130,246,0.15)":"none"
                    }}>
                      <div style={{ fontSize:13, fontWeight:step.active||step.done?700:500,
                        color:step.done?"#10b981":step.urgent?"#f59e0b":step.active?"#60a5fa":"#475569" }}>
                        {step.label}
                      </div>
                      <div style={{ fontSize:12, color:"#64748b", marginTop:3, lineHeight:1.5 }}>{step.sub}</div>
                      {step.action && (
                        <div style={{ marginTop:6, background:"#1e293b", borderRadius:8, padding:"5px 10px",
                          fontSize:11, color:"#60a5fa", display:"inline-block" }}>
                          🔗 {step.action}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Case detail */}
        <button onClick={()=>setShowDetail(!showDetail)} style={{ width:"100%", marginTop:6, padding:"12px 16px",
          background:"#1e293b", border:"1px solid #334155", borderRadius:12,
          color:"#94a3b8", fontSize:13, cursor:"pointer", textAlign:"left",
          display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span>📁 Thông tin hồ sơ</span>
          <span>{showDetail?"▲":"▼"}</span>
        </button>
        {showDetail && (
          <div style={{ background:"#0f172a", border:"1px solid #1e293b", borderTop:"none",
            borderRadius:"0 0 12px 12px", padding:"12px 16px" }}>
            {[
              ["Tên", activeCase.name],
              ["Diện visa", activeCase.category],
              ["Chargeability", activeCase.chargeability],
              ["Priority Date", fmt(pd)],
              ["NVC Case", activeCase.nvcCase || "—"],
              ["Invoice ID", activeCase.invoiceId || "—"],
              ["Lãnh sự quán", activeCase.consulate || "—"],
              ["Người bảo lãnh", activeCase.petitioner || "—"],
            ].map(([k,v])=>(
              <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"7px 0", borderBottom:"1px solid #1e293b" }}>
                <span style={{ fontSize:12, color:"#64748b" }}>{k}</span>
                <span style={{ fontSize:12, color:"#e2e8f0", fontWeight:600 }}>{v}</span>
              </div>
            ))}
            <button onClick={()=>{setEditCase(activeCase);setShowForm(true);}}
              style={{ marginTop:10, width:"100%", padding:"9px", borderRadius:10, border:"1px solid #334155",
                background:"transparent", color:"#60a5fa", fontSize:12, cursor:"pointer" }}>
              ✏️ Chỉnh sửa hồ sơ này
            </button>
          </div>
        )}

        {/* Next action */}
        {bulletin && (
          <div style={{ marginTop:18, background:"linear-gradient(135deg,#1d4ed8,#7c3aed)", borderRadius:16, padding:"14px 18px" }}>
            <div style={{ fontSize:10, color:"rgba(255,255,255,0.6)", textTransform:"uppercase", letterSpacing:1.5, marginBottom:6 }}>
              ⚡ Việc cần làm ngay
            </div>
            <div style={{ fontSize:13, fontWeight:700, lineHeight:1.6 }}>
              {isFinal
                ? `Liên hệ NVC để xác nhận lịch phỏng vấn tại ${activeCase.consulate}`
                : daysLeftAbs<=5
                ? `🔥 CỰC KỲ KHẨN: Chuẩn bị ngay hồ sơ IV Fee & DS-260 — chỉ còn ${daysLeftAbs} ngày!`
                : `Liên hệ người bảo lãnh tại ${activeCase.petitioner || "..."} để chuẩn bị thanh toán IV Fee qua CEAC`}
            </div>
          </div>
        )}

        <div style={{ textAlign:"center", marginTop:22, fontSize:10, color:"#334155" }}>
          Nguồn: travel.state.gov · Tự động cập nhật mỗi 7 ngày
        </div>
      </div>

      {/* Form modal */}
      {showForm && (
        <CaseForm
          initial={editCase}
          onSave={saveCase}
          onCancel={()=>{setShowForm(false);setEditCase(null);}}
        />
      )}
    </div>
  );
}
