import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Tractor, LayoutDashboard, Users, Truck, ClipboardList, Plus, Languages, RefreshCw, Leaf } from "lucide-react";
import "./style.css";

const API = "/api";
function App() {
  const [page, setPage] = useState("dashboard");
  const [lang, setLang] = useState("en");
  const [stats, setStats] = useState({ customers: 0, equipment: 0, active_rentals: 0, revenue: 0 });
  const [customers, setCustomers] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [rentals, setRentals] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [customerForm, setCustomerForm] = useState({ name: "", phone: "", village: "" });
  const [equipmentForm, setEquipmentForm] = useState({ name: "", category: "Tractor", registration_number: "", rate_type: "hour", rate: 0 });
  const [rentalForm, setRentalForm] = useState({ customer_id: "", equipment_id: "", start_date: new Date().toISOString().slice(0,10), quantity: 1, rate_type: "hour", rate: 0, status: "Booked" });

  const t = (en, ta) => lang === "en" ? en : ta;
  async function request(path, options = {}) {
    const res = await fetch(`${API}${path}`, { headers: { "Content-Type": "application/json" }, ...options });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.detail || `Request failed (${res.status})`);
    }
    return res.status === 204 ? null : res.json();
  }
  async function load() {
    setError("");
    try {
      const [s,c,e,r] = await Promise.all([
        request("/dashboard"), request("/customers"), request("/equipment"), request("/rentals")
      ]);
      setStats(s); setCustomers(c); setEquipment(e); setRentals(r);
    } catch (e) { setError(e.message); }
  }
  useEffect(() => { load(); }, []);

  async function submit(path, body, reset) {
    setBusy(true); setError("");
    try { await request(path, { method: "POST", body: JSON.stringify(body) }); reset(); await load(); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  const nav = [
    ["dashboard", LayoutDashboard, t("Overview", "கண்ணோட்டம்")],
    ["rentals", ClipboardList, t("Rentals", "வாடகைகள்")],
    ["equipment", Tractor, t("Equipment", "உபகரணங்கள்")],
    ["customers", Users, t("Customers", "வாடிக்கையாளர்கள்")]
  ];
  return <div className="shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-icon"><Leaf size={22}/></div><div><b>AgriTrack</b><small>Rental management</small></div></div>
      <div className="nav-label">WORKSPACE</div>
      {nav.map(([id, Icon, label]) => <button key={id} className={`nav-item ${page===id?"active":""}`} onClick={()=>setPage(id)}><Icon size={18}/>{label}</button>)}
      <div className="sidebar-bottom"><span className="online-dot"/> Local workspace <small>AgriTrack MVP 1.0</small></div>
    </aside>
    <main className="main">
      <header className="topbar"><div><div className="eyebrow">AGRICULTURE OPERATIONS</div><h1>{nav.find(n=>n[0]===page)?.[2]}</h1></div>
        <div className="top-actions"><button className="icon-btn" onClick={load} title="Refresh"><RefreshCw size={17}/></button><button className="language" onClick={()=>setLang(lang==="en"?"ta":"en")}><Languages size={16}/>{lang==="en"?"தமிழ்":"English"}</button><div className="avatar">AT</div></div>
      </header>
      {error && <div className="alert">{error}</div>}
      {page==="dashboard" && <section>
        <div className="welcome"><div><span className="pill">● LIVE WORKSPACE</span><h2>Manage your farm rentals<br/>with clarity.</h2><p>Track equipment, customers and rental activity in one place.</p></div><div className="welcome-art"><Tractor size={104} strokeWidth={1.1}/></div></div>
        <div className="stats">
          <Stat label="Total customers" value={stats.customers} icon={<Users/>} />
          <Stat label="Equipment listed" value={stats.equipment} icon={<Tractor/>} />
          <Stat label="Active rentals" value={stats.active_rentals} icon={<ClipboardList/>} />
          <Stat label="Completed rental value" value={`₹${Number(stats.revenue).toLocaleString("en-IN")}`} icon={<Truck/>} />
        </div>
        <div className="section-heading"><div><h3>Recent rentals</h3><p>Your latest equipment bookings</p></div><button className="text-btn" onClick={()=>setPage("rentals")}>View all →</button></div>
        <RentalTable rows={rentals.slice(0,5)} />
      </section>}
      {page==="customers" && <section className="content-grid">
        <div className="panel"><h3>Add customer</h3><p className="muted">Save a customer and their contact details.</p>
          <form onSubmit={e=>{e.preventDefault();submit("/customers",customerForm,()=>setCustomerForm({name:"",phone:"",village:""}));}}>
            <Field label="Customer name"><input required value={customerForm.name} onChange={e=>setCustomerForm({...customerForm,name:e.target.value})}/></Field>
            <Field label="Phone number"><input value={customerForm.phone} onChange={e=>setCustomerForm({...customerForm,phone:e.target.value})}/></Field>
            <Field label="Village / Location"><input value={customerForm.village} onChange={e=>setCustomerForm({...customerForm,village:e.target.value})}/></Field>
            <button className="primary" disabled={busy}><Plus size={16}/> Add customer</button>
          </form>
        </div>
        <div className="panel"><h3>Customers <span className="count">{customers.length}</span></h3><div className="table-wrap"><table><thead><tr><th>Name</th><th>Phone</th><th>Village</th></tr></thead><tbody>{customers.map(c=><tr key={c.id}><td className="strong">{c.name}</td><td>{c.phone||"—"}</td><td>{c.village||"—"}</td></tr>)}</tbody></table>{!customers.length&&<Empty/>}</div></div>
      </section>}
      {page==="equipment" && <section className="content-grid">
        <div className="panel"><h3>Register equipment</h3><p className="muted">Add a tractor or agricultural implement.</p>
          <form onSubmit={e=>{e.preventDefault();submit("/equipment",{...equipmentForm,rate:Number(equipmentForm.rate)},()=>setEquipmentForm({name:"",category:"Tractor",registration_number:"",rate_type:"hour",rate:0}));}}>
            <Field label="Equipment name"><input required placeholder="e.g. Mahindra 575" value={equipmentForm.name} onChange={e=>setEquipmentForm({...equipmentForm,name:e.target.value})}/></Field>
            <Field label="Category"><select value={equipmentForm.category} onChange={e=>setEquipmentForm({...equipmentForm,category:e.target.value})}><option>Tractor</option><option>Rotavator</option><option>Trailer</option><option>Harvester</option><option>Other</option></select></Field>
            <Field label="Registration / ID"><input value={equipmentForm.registration_number} onChange={e=>setEquipmentForm({...equipmentForm,registration_number:e.target.value})}/></Field>
            <div className="form-row"><Field label="Rate type"><select value={equipmentForm.rate_type} onChange={e=>setEquipmentForm({...equipmentForm,rate_type:e.target.value})}><option value="hour">Per hour</option><option value="day">Per day</option><option value="acre">Per acre</option><option value="trip">Per trip</option></select></Field><Field label="Rate (₹)"><input type="number" min="0" required value={equipmentForm.rate} onChange={e=>setEquipmentForm({...equipmentForm,rate:e.target.value})}/></Field></div>
            <button className="primary" disabled={busy}><Plus size={16}/> Save equipment</button>
          </form>
        </div>
        <div className="panel"><h3>Equipment inventory <span className="count">{equipment.length}</span></h3><div className="table-wrap"><table><thead><tr><th>Equipment</th><th>Category</th><th>Rate</th><th>Status</th></tr></thead><tbody>{equipment.map(x=><tr key={x.id}><td className="strong">{x.name}<small className="subline">{x.registration_number}</small></td><td>{x.category}</td><td>₹{x.rate} / {x.rate_type}</td><td><span className={`status ${x.availability==="Available"?"green":"amber"}`}>{x.availability}</span></td></tr>)}</tbody></table>{!equipment.length&&<Empty/>}</div></div>
      </section>}
      {page==="rentals" && <section>
        <div className="panel form-panel"><h3>Create rental</h3><p className="muted">Book equipment for a customer.</p>
          <form className="rental-form" onSubmit={e=>{e.preventDefault();submit("/rentals",{...rentalForm,customer_id:Number(rentalForm.customer_id),equipment_id:Number(rentalForm.equipment_id),quantity:Number(rentalForm.quantity),rate:Number(rentalForm.rate)},()=>setRentalForm({...rentalForm,customer_id:"",equipment_id:"",quantity:1}));}}>
            <Field label="Customer"><select required value={rentalForm.customer_id} onChange={e=>setRentalForm({...rentalForm,customer_id:e.target.value})}><option value="">Select customer</option>{customers.map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select></Field>
            <Field label="Equipment"><select required value={rentalForm.equipment_id} onChange={e=>{const x=equipment.find(i=>i.id===Number(e.target.value));setRentalForm({...rentalForm,equipment_id:e.target.value,rate:x?.rate||0,rate_type:x?.rate_type||"hour"});}}><option value="">Select equipment</option>{equipment.filter(x=>x.availability==="Available").map(x=><option value={x.id} key={x.id}>{x.name}</option>)}</select></Field>
            <Field label="Start date"><input type="date" required value={rentalForm.start_date} onChange={e=>setRentalForm({...rentalForm,start_date:e.target.value})}/></Field>
            <Field label="Quantity (hours / days / acres / trips)"><input type="number" min="0.1" step="0.1" required value={rentalForm.quantity} onChange={e=>setRentalForm({...rentalForm,quantity:e.target.value})}/></Field>
            <Field label="Rate type"><select value={rentalForm.rate_type} onChange={e=>setRentalForm({...rentalForm,rate_type:e.target.value})}><option value="hour">Per hour</option><option value="day">Per day</option><option value="acre">Per acre</option><option value="trip">Per trip</option></select></Field>
            <Field label="Rate (₹)"><input type="number" min="0" required value={rentalForm.rate} onChange={e=>setRentalForm({...rentalForm,rate:e.target.value})}/></Field>
            <div className="estimate">Estimated total <b>₹{(Number(rentalForm.quantity)*Number(rentalForm.rate)).toLocaleString("en-IN")}</b></div>
            <button className="primary" disabled={busy||!customers.length||!equipment.some(x=>x.availability==="Available")}><Plus size={16}/> Create booking</button>
          </form>
        </div>
        <div className="section-heading"><div><h3>Rental register</h3><p>Booking history and current status</p></div></div>
        <RentalTable rows={rentals}/>
      </section>}
      <footer>AgriTrack MVP · Built for agricultural equipment rental operations</footer>
    </main>
  </div>;
}
function Stat({label,value,icon}) { return <div className="stat-card"><div className="stat-top"><span>{label}</span><div className="stat-icon">{icon}</div></div><strong>{value}</strong></div>; }
function Field({label,children}) { return <label className="field"><span>{label}</span>{children}</label>; }
function Empty(){return <div className="empty">No records yet. Add your first entry to get started.</div>}
function RentalTable({rows}) { return <div className="panel table-panel"><div className="table-wrap"><table><thead><tr><th>Customer</th><th>Equipment</th><th>Start date</th><th>Quantity</th><th>Amount</th><th>Status</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td className="strong">{r.customer_name}</td><td>{r.equipment_name}</td><td>{r.start_date}</td><td>{r.quantity} {r.rate_type}</td><td className="strong">₹{Number(r.total_amount).toLocaleString("en-IN")}</td><td><span className={`status ${r.status==="Completed"?"green":r.status==="Cancelled"?"red":"amber"}`}>{r.status}</span></td></tr>)}</tbody></table>{!rows.length&&<Empty/>}</div></div>; }
createRoot(document.getElementById("root")).render(<App/>);
