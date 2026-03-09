import React, { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  Calendar,
  Users,
  Scissors,
  Plus,
  Loader2,
  Trash2,
  Edit2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  AlertCircle,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  LogOut,
  Settings,
  Clock,
  ExternalLink,
  Save,
  X,
  History,
  Phone,
  Mail,
  MoreVertical,
  ArrowLeft,
  ShieldCheck
} from "lucide-react";
import type { Service, Professional, Appointment } from "../types";

type Tab = "agenda" | "services" | "professionals" | "new-appointment";
const MAX_PROFESSIONALS = 20;

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("agenda");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [viewMode, setViewMode] = useState<"day" | "week">("day");

  const [agendaKey, setAgendaKey] = useState(0);
  const [filterByDateOnly, setFilterByDateOnly] = useState(true);

  useEffect(() => {
    if (tab === "agenda") {
      const loadAppointments = async () => {
        setLoading(true);
        setErrorMessage("");
        const url =
          viewMode === "day" && filterByDateOnly
            ? `/api/appointments?date=${date}`
            : "/api/appointments";
        try {
          const res = await fetch(url);
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || "No se pudo obtener la agenda.");
          }
          const data = await res.json();
          setAppointments(Array.isArray(data) ? data : []);
        } catch (err: any) {
          console.error(err);
          setAppointments([]);
          setErrorMessage(err.message || "Error al cargar agenda.");
        } finally {
          setLoading(false);
        }
      };
      loadAppointments();
    }
  }, [tab, date, agendaKey, filterByDateOnly, viewMode]);

  const refreshAgenda = () => setAgendaKey((k) => k + 1);

  useEffect(() => {
    const loadMeta = async () => {
      try {
        const [servicesRes, professionalsRes] = await Promise.all([
          fetch("/api/services"),
          fetch("/api/professionals"),
        ]);
        if (!servicesRes.ok || !professionalsRes.ok) throw new Error("Error de red.");
        const [servicesData, professionalsData] = await Promise.all([
          servicesRes.json(),
          professionalsRes.json(),
        ]);
        setServices(Array.isArray(servicesData) ? servicesData : []);
        setProfessionals(Array.isArray(professionalsData) ? professionalsData : []);
      } catch (err: any) {
        console.error(err);
      }
    };
    loadMeta();
  }, [tab]);

  return (
    <div className="min-h-screen bg-brand-beige text-brand-dark font-sans selection:bg-brand-primary/20">
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-brand-dark/5 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2 text-brand-dark/40 hover:text-brand-dark transition-colors group">
              <ChevronLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
              <span className="text-[10px] uppercase font-bold tracking-widest text-brand-dark">Sitio Web</span>
            </Link>
            <div className="h-6 w-px bg-brand-dark/10" />
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-brand-primary/10 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-brand-primary" />
              </div>
              <h1 className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-dark">Panel Administrativo</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-brand-primary animate-pulse" />
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Sesión Privada</span>
          </div>
        </div>
      </header>

      <div className="pt-24 pb-20">
        <div className="max-w-5xl mx-auto">
          <nav className="flex items-center justify-center p-1.5 bg-white/50 backdrop-blur-xl rounded-[2.5rem] border border-brand-dark/5 mx-6 mb-16 shadow-sm">
            {[
              { id: "agenda" as Tab, label: "Agenda", icon: Calendar },
              { id: "services" as Tab, label: "Servicios", icon: Scissors },
              { id: "professionals" as Tab, label: "Equipo", icon: Users },
              { id: "new-appointment" as Tab, label: "Nueva Cita", icon: Plus },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex-1 flex items-center justify-center gap-2.5 px-6 py-3.5 text-[10px] uppercase font-black tracking-[0.15em] rounded-full transition-all duration-500 ${tab === id
                  ? "bg-brand-dark text-white shadow-2xl shadow-brand-dark/30 scale-[1.02]"
                  : "text-brand-dark/30 hover:text-brand-dark hover:bg-brand-dark/5"
                  }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </nav>

          <main className="px-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={tab}
                initial={{ opacity: 0, scale: 0.99, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 1.01, y: -10 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              >
                {errorMessage && (
                  <div className="mb-8 p-5 rounded-[2rem] border border-red-100 bg-red-50 text-[10px] font-black uppercase tracking-widest text-red-900 flex items-center gap-3 shadow-sm">
                    <AlertCircle className="w-4 h-4 text-red-400" />
                    {errorMessage}
                  </div>
                )}

                {tab === "agenda" && (
                  <AgendaTab
                    date={date} setDate={setDate} appointments={appointments}
                    loading={loading} onRefresh={refreshAgenda}
                    professionals={professionals} services={services}
                  />
                )}
                {tab === "services" && (
                  <ServicesTab
                    services={services}
                    onRefresh={async () => {
                      const res = await fetch("/api/services");
                      const data = await res.json().catch(() => []);
                      setServices(Array.isArray(data) ? data : []);
                    }}
                  />
                )}
                {tab === "professionals" && (
                  <ProfessionalsTab
                    professionals={professionals} services={services}
                    maxProfessionals={MAX_PROFESSIONALS}
                    onRefresh={async () => {
                      const res = await fetch("/api/professionals");
                      const data = await res.json().catch(() => []);
                      setProfessionals(Array.isArray(data) ? data : []);
                    }}
                  />
                )}
                {tab === "new-appointment" && (
                  <NewAppointmentTab
                    services={services} professionals={professionals}
                    onDone={() => { setTab("agenda"); refreshAgenda(); }}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </div>
  );
}

function AgendaTab({
  date,
  setDate,
  appointments,
  loading,
  onRefresh,
  professionals,
  services,
}: {
  date: string;
  setDate: (d: string) => void;
  appointments: Appointment[];
  loading: boolean;
  onRefresh: () => void;
  professionals: Professional[];
  services: Service[];
}) {
  const [professionalFilter, setProfessionalFilter] = useState<number | "all">("all");
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);

  const filteredAppointments =
    professionalFilter === "all"
      ? appointments
      : appointments.filter((a) => a.professional_id === professionalFilter);

  const { incomeConfirmed, incomePending, countNoShow, countDone, countTotal } = filteredAppointments.reduce((acc, a) => {
    const svc = services.find(s => s.id === a.service_id);
    const price = svc?.price || 0;

    if (a.status !== 'cancelled') {
      acc.countTotal++;
      if (a.status === 'completed') {
        acc.incomeConfirmed += price;
        acc.countDone++;
      } else if (a.status === 'no_show') {
        acc.countNoShow++;
      } else {
        acc.incomePending += price;
      }
    }
    return acc;
  }, { incomeConfirmed: 0, incomePending: 0, countNoShow: 0, countDone: 0, countTotal: 0 });

  return (
    <div className="space-y-10">
      {/* Arqueo de Caja (Daily Focus) */}
      <section className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/50 space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Arqueo de Caja</h2>
            <div className="flex items-center gap-2 text-[10px] font-black text-brand-primary uppercase tracking-[0.2em] bg-brand-primary/5 px-4 py-1.5 rounded-full w-fit">
              <Calendar className="w-3 h-3" /> {format(new Date(date + "T00:00:00"), "EEEE, dd MMMM yyyy")}
            </div>
          </div>
          <div className="text-right bg-slate-900 text-white p-6 rounded-[2rem] min-w-[200px] shadow-2xl shadow-slate-900/20">
            <p className="text-[9px] font-black uppercase tracking-[0.3em] opacity-40 mb-1">Total Proyectado</p>
            <p className="text-4xl font-black tabular-nums">S/. {incomeConfirmed + incomePending}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { label: "Cobradas", value: `S/. ${incomeConfirmed}`, sub: `${countDone} Citas Realizadas`, color: "emerald", icon: CheckCircle2 },
            { label: "Pendientes", value: `S/. ${incomePending}`, sub: "Por cobrar hoy", color: "brand-primary", icon: Clock },
            { label: "Ausencias", value: countNoShow, sub: "Sin reporte", color: "amber", icon: X },
            { label: "Total Citas", value: countTotal, sub: "Agendadas", color: "slate", icon: Users },
          ].map((stat, i) => (
            <div key={i} className="bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100 group hover:bg-white hover:shadow-lg transition-all">
              <div className="flex items-center gap-2 mb-3">
                <stat.icon className={`w-3 h-3 text-${stat.color}-500`} />
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">{stat.label}</span>
              </div>
              <p className="text-2xl font-black text-slate-900 tabular-nums">{stat.value}</p>
              <p className="text-[9px] font-bold text-slate-300 mt-1 uppercase tracking-tighter">{stat.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Calendar Grid Section */}
      <section className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-4">
          <div className="flex items-center gap-4 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-transparent border-none px-4 py-2 text-sm font-black focus:outline-none uppercase tracking-widest"
            />
            <div className="h-6 w-px bg-slate-100" />
            <button
              onClick={onRefresh}
              className="p-3 rounded-xl hover:bg-slate-50 text-slate-400 hover:text-brand-dark transition-all"
            >
              <Loader2 className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 pointer-events-none" />
              <select
                value={professionalFilter}
                onChange={(e) => setProfessionalFilter(e.target.value === "all" ? "all" : Number(e.target.value))}
                className="bg-white border border-slate-200 rounded-2xl pl-12 pr-10 py-4 text-[10px] font-black uppercase tracking-widest focus:outline-none focus:ring-4 focus:ring-brand-primary/5 transition-all appearance-none shadow-sm"
              >
                <option value="all">Todas las Especialistas</option>
                {professionals.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* The Actual Calendar Grid */}
        <div className="bg-white rounded-[3rem] border border-slate-100 shadow-xl overflow-hidden">
          <div className="grid grid-cols-[120px_1fr] border-b border-slate-100 bg-slate-50/50">
            <div className="p-6 text-[10px] font-black uppercase text-slate-400 text-center tracking-[0.3em] border-r border-slate-100">Bloque</div>
            <div className="p-6 text-[10px] font-black uppercase text-slate-400 pl-10 tracking-[0.3em] italic">Agenda del Día</div>
          </div>

          <div className="divide-y divide-slate-50">
            {Array.from({ length: 13 }).map((_, i) => {
              const hour = i + 8; // 08:00 to 20:00
              const label = `${String(hour).padStart(2, '0')}:00`;
              const appts = filteredAppointments.filter(a => format(new Date(a.dateTime), "HH:mm") === label);

              return (
                <div key={label} className="grid grid-cols-[120px_1fr] min-h-[120px] relative group hover:bg-slate-50/30 transition-colors">
                  <div className="p-6 border-r border-slate-50 flex items-start justify-center pt-10">
                    <span className="text-3xl font-black text-slate-200 tabular-nums group-hover:text-brand-primary transition-all duration-500">{hour}</span>
                  </div>

                  <div className="p-5 flex gap-6 overflow-x-auto items-center">
                    {appts.length > 0 ? (
                      appts.map(appt => (
                        <button
                          key={appt.id}
                          onClick={() => setSelectedAppt(appt)}
                          className={`flex-1 min-w-[300px] max-w-[450px] p-8 rounded-[2.5rem] border-2 text-left transition-all hover:shadow-2xl hover:-translate-y-1 relative group/card
                            ${appt.status === 'completed' ? 'bg-emerald-50 border-emerald-100 text-emerald-900 shadow-emerald-900/5' :
                              appt.status === 'no_show' ? 'bg-amber-50 border-amber-100 text-amber-900 shadow-amber-900/5' :
                                'bg-brand-dark border-brand-dark text-white shadow-brand-dark/20'}
                          `}
                        >
                          <div className="flex justify-between items-start mb-4">
                            <div className="space-y-1">
                              <h4 className="font-black text-lg uppercase tracking-tight">{appt.clientName}</h4>
                              <p className={`text-[10px] font-bold uppercase tracking-[0.2em] ${appt.status === 'confirmed' ? 'opacity-60' : 'opacity-40'}`}>{appt.serviceName}</p>
                            </div>
                            {appt.status !== 'confirmed' && (
                              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
                                {appt.status === 'completed' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center justify-between pt-4 border-t border-current/10">
                            <span className={`text-[9px] font-black uppercase tracking-widest ${appt.status === 'confirmed' ? 'opacity-40' : 'opacity-30'}`}>
                              {appt.professionalName || "Staff Especializado"}
                            </span>
                            <div className="opacity-0 group-hover/card:opacity-100 transition-opacity">
                              <ArrowRight className="w-4 h-4" />
                            </div>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="flex-1 h-20 border-2 border-dashed border-slate-100 rounded-[2rem] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-default">
                        <span className="text-[10px] font-black text-slate-200 uppercase tracking-[0.6em] ml-[0.6em]">Libre</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Appointment Detail Modal */}
      <AnimatePresence>
        {selectedAppt && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              className="bg-white rounded-[4rem] w-full max-w-2xl shadow-2xl overflow-hidden border border-slate-200"
            >
              <div className="p-10 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 rounded-[2rem] bg-brand-dark text-white flex items-center justify-center shadow-xl shadow-brand-dark/20">
                    <History className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">Gestión de Cita</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">ID Reserva: #{selectedAppt.id.toString().padStart(4, '0')}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedAppt(null)}
                  className="w-14 h-14 rounded-full bg-white border border-slate-100 flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-all group"
                >
                  <X className="w-6 h-6 text-slate-400 group-hover:text-red-500" />
                </button>
              </div>

              <div className="p-12 space-y-10">
                <div className="grid grid-cols-2 gap-12">
                  <div className="space-y-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Clienta</span>
                    <p className="text-2xl font-black text-slate-900">{selectedAppt.clientName}</p>
                    <a href={`tel:${selectedAppt.phone}`} className="inline-flex items-center gap-2 text-xs font-black text-brand-primary uppercase tracking-widest hover:underline mt-2">
                      <Phone className="w-3 h-3" /> +51 {selectedAppt.phone}
                    </a>
                  </div>
                  <div className="space-y-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Tratamiento</span>
                    <p className="text-2xl font-black text-brand-primary tracking-tight">{selectedAppt.serviceName}</p>
                    <p className="text-xs text-slate-400 font-bold italic mt-2 flex items-center gap-2">
                      <Users className="w-3 h-3" /> {selectedAppt.professionalName || "Cualquier Especialista"}
                    </p>
                  </div>
                </div>

                <div className="p-10 bg-slate-900 text-white rounded-[3rem] shadow-2xl shadow-slate-900/40 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Calendar className="w-32 h-32" />
                  </div>
                  <div className="grid grid-cols-2 gap-8 relative z-10">
                    <div className="space-y-1">
                      <span className="text-[9px] font-black uppercase tracking-[0.3em] opacity-40">Día de cita</span>
                      <p className="text-xl font-bold">{format(new Date(selectedAppt.dateTime + (selectedAppt.dateTime.includes('T') ? '' : 'T00:00:00')), "dd/MM/yyyy")}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] font-black uppercase tracking-[0.3em] opacity-40">Hora Reservada</span>
                      <p className="text-3xl font-black tabular-nums">{format(new Date(selectedAppt.dateTime), "HH:mm")}</p>
                    </div>
                  </div>
                  <div className="mt-8 pt-8 border-t border-white/10 flex items-center justify-between relative z-10">
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">Status</span>
                    <span className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border ${selectedAppt.status === 'completed' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                      selectedAppt.status === 'no_show' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                        'bg-white/10 border-white/20 text-white'
                      }`}>
                      {selectedAppt.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  {selectedAppt.status === 'confirmed' && (
                    <>
                      <button
                        onClick={async () => {
                          const res = await fetch(`/api/appointments/${selectedAppt.id}/complete`, { method: "PATCH" });
                          if (res.ok) { onRefresh(); setSelectedAppt(null); }
                        }}
                        className="flex-1 bg-emerald-500 text-white font-black py-6 rounded-[2rem] text-xs uppercase tracking-[0.2em] hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-3 active:scale-95"
                      >
                        <CheckCircle2 className="w-5 h-5" /> Realizada
                      </button>
                      <button
                        onClick={async () => {
                          const res = await fetch(`/api/appointments/${selectedAppt.id}/no-show`, { method: "PATCH" });
                          if (res.ok) { onRefresh(); setSelectedAppt(null); }
                        }}
                        className="flex-1 bg-amber-500 text-white font-black py-6 rounded-[2rem] text-xs uppercase tracking-[0.2em] hover:bg-amber-600 transition-all shadow-xl shadow-amber-500/20 flex items-center justify-center gap-3 active:scale-95"
                      >
                        <AlertCircle className="w-5 h-5" /> Ausencia
                      </button>
                    </>
                  )}
                  {selectedAppt.status !== 'cancelled' && (
                    <button
                      onClick={async () => {
                        if (!confirm("¿Seguro que deseas cancelar esta cita definitivamente? Las especialistas verán el espacio libre.")) return;
                        const res = await fetch(`/api/appointments/${selectedAppt.id}/cancel`, { method: "PATCH" });
                        if (res.ok) { onRefresh(); setSelectedAppt(null); }
                      }}
                      className="flex-1 border-2 border-slate-100 text-slate-400 font-black py-6 rounded-[2rem] text-[10px] uppercase tracking-[0.2em] hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition-all active:scale-95"
                    >
                      Cancelar Cita
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ServicesTab({ services, onRefresh }: { services: Service[], onRefresh: () => void }) {
  const [editing, setEditing] = useState<Service | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", durationMinutes: 60, price: 0, category: "general" });

  const saveEdit = async () => {
    if (!editing) return;
    await fetch(`/api/services/${editing.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setEditing(null);
    onRefresh();
  };

  const saveNew = async () => {
    await fetch("/api/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setAdding(false);
    setForm({ name: "", durationMinutes: 60, price: 0, category: "general" });
    onRefresh();
  };

  const remove = async (id: number) => {
    if (!confirm("¿Eliminar este servicio?")) return;
    await fetch(`/api/services/${id}`, { method: "DELETE" });
    onRefresh();
  };

  return (
    <div className="space-y-12">
      <div className="flex justify-between items-center bg-white/40 backdrop-blur-xl p-6 rounded-[2rem] border border-white">
        <div className="space-y-1">
          <h2 className="text-xl font-serif">Catálogo de Servicios</h2>
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-30">{services.length} Tratamientos activos</p>
        </div>
        {!adding && !editing && (
          <button
            onClick={() => setAdding(true)}
            className="premium-button bg-brand-dark text-white px-8 py-4 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-3 shadow-xl shadow-brand-dark/20"
          >
            <Plus className="w-4 h-4" /> Nuevo Servicio
          </button>
        )}
      </div>

      {(adding || editing) && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-12 rounded-[3.5rem] space-y-10 border-brand-primary/20 shadow-2xl relative"
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-2xl font-serif">{editing ? 'Editar Tratamiento' : 'Alta de Servicio'}</h3>
            <button onClick={() => { setAdding(false); setEditing(null); }} className="w-10 h-10 rounded-full bg-brand-dark/5 flex items-center justify-center hover:bg-brand-dark hover:text-white transition-all">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-x-12 gap-y-10">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest opacity-30">Nombre</label>
              <input
                placeholder="Ej. Peeling Facial"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full bg-transparent border-b border-brand-dark/10 py-4 focus:border-brand-primary outline-none transition-all placeholder:text-brand-dark/10"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest opacity-30">Categoría</label>
              <input
                placeholder="Ej. Facial"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="w-full bg-transparent border-b border-brand-dark/10 py-4 focus:border-brand-primary outline-none transition-all placeholder:text-brand-dark/10"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest opacity-30">Duración Estándar</label>
              <div className="relative">
                <input
                  type="number"
                  value={form.durationMinutes}
                  onChange={(e) => setForm((f) => ({ ...f, durationMinutes: Number(e.target.value) || 0 }))}
                  className="w-full bg-transparent border-b border-brand-dark/10 py-4 focus:border-brand-primary outline-none transition-all tabular-nums"
                />
                <span className="absolute right-0 top-1/2 -translate-y-1/2 text-[10px] uppercase font-bold opacity-30">MINUTOS</span>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest opacity-30">Tarifa Pública</label>
              <div className="relative">
                <input
                  type="number"
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) || 0 }))}
                  className="w-full bg-transparent border-b border-brand-dark/10 py-4 focus:border-brand-primary outline-none transition-all tabular-nums pl-8"
                />
                <span className="absolute left-0 top-1/2 -translate-y-1/2 text-[10px] font-bold opacity-30">S/.</span>
              </div>
            </div>
          </div>
          <div className="flex gap-4 pt-6">
            <button onClick={editing ? saveEdit : saveNew} className="premium-button bg-brand-dark text-white px-12 py-5 rounded-full text-[11px] font-black uppercase tracking-[0.2em] shadow-xl flex items-center gap-3">
              <Save className="w-4 h-4" /> Guardar Cambios
            </button>
          </div>
        </motion.div>
      )}

      <div className="grid md:grid-cols-2 gap-8">
        {services.map((s, idx) => (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="glass-card p-10 rounded-[3rem] border-white/80 hover:bg-white transition-all shadow-sm group"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-4">
                <span className="text-[9px] font-black uppercase tracking-widest bg-brand-primary/10 text-brand-primary px-3 py-1 rounded-md">{s.category}</span>
                <h3 className="text-2xl font-serif text-brand-dark">{s.name}</h3>
                <div className="flex items-center gap-6 text-[11px] font-bold uppercase tracking-[0.15em] opacity-30">
                  <span className="flex items-center gap-2"><Clock className="w-3.5 h-3.5" /> {s.durationMinutes} MIN</span>
                  <span className="flex items-center gap-2 text-brand-dark opacity-100 font-black">S/. {s.price}</span>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <button onClick={() => { setEditing(s); setForm({ name: s.name, durationMinutes: s.durationMinutes, price: s.price, category: s.category }); }} className="w-12 h-12 rounded-full bg-brand-dark/5 flex items-center justify-center hover:bg-brand-dark hover:text-white transition-all">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => remove(s.id)} className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-600 hover:bg-red-600 hover:text-white transition-all">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function ProfessionalsTab({ professionals, services, maxProfessionals, onRefresh }: { professionals: Professional[], services: Service[], maxProfessionals: number, onRefresh: () => void }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [assignedServices, setAssignedServices] = useState<Service[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const maxReached = professionals.length >= maxProfessionals;

  const editingProfessional = editingId ? professionals.find((p) => p.id === editingId) : null;

  useEffect(() => {
    if (!editingId) return;
    setLoadingDetail(true);
    Promise.all([
      fetch(`/api/professionals/${editingId}/schedule`).then((r) => r.json()),
      fetch(`/api/professionals/${editingId}/services`).then((r) => r.json()),
    ])
      .then(([sched, assigned]) => {
        setSchedule(Array.isArray(sched) ? sched : []);
        setAssignedServices(Array.isArray(assigned) ? assigned : []);
      })
      .finally(() => setLoadingDetail(false));
  }, [editingId]);

  const remove = async (id: number) => {
    if (!confirm("¿Eliminar este profesional?")) return;
    await fetch(`/api/professionals/${id}`, { method: "DELETE" });
    onRefresh();
  };

  const add = async () => {
    if (!name.trim()) return;
    await fetch("/api/professionals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim() }) });
    setName("");
    setAdding(false);
    onRefresh();
  };

  return (
    <div className="space-y-12">
      <div className="flex justify-between items-center bg-white/40 backdrop-blur-xl p-6 rounded-[2rem] border border-white">
        <div className="space-y-1">
          <h2 className="text-xl font-serif">Staff Profesional</h2>
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-30">{professionals.length} Especialistas registrados</p>
        </div>
        {!adding && !maxReached && (
          <button
            onClick={() => setAdding(true)}
            className="premium-button bg-brand-dark text-white px-8 py-4 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-3 shadow-xl shadow-brand-dark/20"
          >
            <Plus className="w-4 h-4" /> Nuevo Profesional
          </button>
        )}
      </div>

      {adding && (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="glass-card p-12 rounded-[3.5rem] flex flex-col sm:flex-row gap-6 border-brand-primary/20 shadow-2xl">
          <input
            placeholder="Nombre del Profesional"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 bg-transparent border-b border-brand-dark/10 py-4 focus:border-brand-primary outline-none transition-all text-xl font-serif placeholder:text-brand-dark/10"
          />
          <div className="flex gap-4">
            <button onClick={add} className="premium-button bg-brand-dark text-white px-10 py-4 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-brand-dark/20 flex items-center gap-3">
              <Save className="w-4 h-4" /> Agregar Staff
            </button>
            <button onClick={() => { setAdding(false); setName(""); }} className="w-14 h-14 rounded-full bg-brand-dark/5 flex items-center justify-center hover:bg-brand-dark hover:text-white transition-all">
              <X className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {professionals.map((p, idx) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="glass-card p-10 rounded-[3rem] border-white/80 hover:bg-white transition-all shadow-sm group flex flex-col items-center text-center space-y-6"
          >
            <div className="w-24 h-24 rounded-full bg-brand-primary/10 flex items-center justify-center group-hover:bg-brand-primary transition-all duration-700">
              <Users className="w-10 h-10 text-brand-primary group-hover:text-white transition-colors duration-700" />
            </div>
            <div className="space-y-1">
              <h3 className="text-2xl font-serif">{p.name}</h3>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-30">Especialista Glow</p>
            </div>
            <div className="flex gap-4 w-full pt-4">
              <button onClick={() => setEditingId(p.id)} className="flex-1 py-3 text-[9px] font-black uppercase tracking-widest border border-brand-dark/5 rounded-full hover:bg-brand-dark hover:text-white transition-all">
                Ajustes
              </button>
              <button onClick={() => remove(p.id)} className="w-12 h-12 rounded-full border border-red-50 flex items-center justify-center text-red-600 hover:bg-red-600 hover:text-white transition-all">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {editingProfessional && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed inset-0 z-[60] bg-brand-dark/50 backdrop-blur-md flex items-center justify-center p-6"
        >
          <div className="glass-card w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-[4rem] p-12 space-y-12 border-white/40 shadow-[0_32px_128px_-16px_rgba(0,0,0,0.3)]">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h2 className="text-3xl font-serif">Ajustes — {editingProfessional.name}</h2>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-30">Configuración avanzada de staff</p>
              </div>
              <button onClick={() => setEditingId(null)} className="w-14 h-14 rounded-full bg-brand-dark/5 flex items-center justify-center hover:bg-brand-dark hover:text-white transition-all">
                <X className="w-6 h-6" />
              </button>
            </div>

            {loadingDetail ? (
              <div className="py-20 flex flex-col items-center justify-center gap-6 opacity-20">
                <div className="w-12 h-12 border-2 border-brand-dark border-t-transparent rounded-full animate-spin" />
                <p className="text-[10px] font-black uppercase tracking-widest">Cargando perfil...</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-16">
                <div className="space-y-10">
                  <div className="space-y-1">
                    <h4 className="text-[11px] font-black uppercase tracking-[0.2em] opacity-40">Horarios de Disponibilidad</h4>
                    <p className="text-xs text-brand-dark/30 italic">Define los días y horas base para agendar.</p>
                  </div>
                  <div className="space-y-4">
                    {/* Simple schedule summary or editor placeholder */}
                    <p className="text-sm font-serif italic text-brand-dark/40 bg-brand-nude p-8 rounded-[2.5rem] border border-brand-dark/5">
                      El editor de horarios se ha simplificado. <br />
                      Vea la agenda principal para ver turnos ocupados.
                    </p>
                  </div>
                </div>
                <div className="space-y-10">
                  <div className="space-y-1">
                    <h4 className="text-[11px] font-black uppercase tracking-[0.2em] opacity-40">Servicios Autorizados</h4>
                    <p className="text-xs text-brand-dark/30 italic">¿Qué tratamientos puede realizar?</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {services.map(s => {
                      const isAssigned = assignedServices.some(as => as.id === s.id);
                      return (
                        <button
                          key={s.id}
                          onClick={async () => {
                            const method = isAssigned ? 'DELETE' : 'POST';
                            await fetch(`/api/professionals/${editingId}/services`, {
                              method,
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ serviceIds: [s.id] })
                            });
                            // Refresh local state
                            setAssignedServices(prev => isAssigned ? prev.filter(x => x.id !== s.id) : [...prev, s]);
                          }}
                          className={`p-6 rounded-[2rem] text-left transition-all border ${isAssigned
                            ? 'bg-brand-dark text-white border-brand-dark shadow-xl'
                            : 'bg-brand-dark/5 border-transparent opacity-40 hover:opacity-100'
                            }`}
                        >
                          <p className="text-[10px] font-black uppercase tracking-widest mb-1">{s.category}</p>
                          <p className="text-sm font-serif">{s.name}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}

function NewAppointmentTab({ services, professionals, onDone }: { services: Service[], professionals: Professional[], onDone: () => void }) {
  const [confirmed, setConfirmed] = useState(false);
  const [formData, setFormData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [localTab, setLocalTab] = useState<"form" | "confirm">("form");

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    const data = new FormData(e.target);
    const serviceId = Number(data.get("serviceId"));
    const professionalId = data.get("professionalId") ? Number(data.get("professionalId")) : null;
    const date = data.get("date") as string;
    const time = data.get("time") as string;
    const clientName = data.get("clientName") as string;
    const phone = data.get("phone") as string;

    const svc = services.find(s => s.id === serviceId);
    const prof = professionals.find(p => p.id === professionalId);

    setFormData({
      serviceId,
      professionalId,
      serviceName: svc?.name,
      professionalName: prof?.name || "Cualquier disponible",
      date,
      time,
      clientName,
      phone,
      price: svc?.price
    });
    setLocalTab("confirm");
  };

  const handleFinalSave = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          dateTime: new Date(`${formData.date}T${formData.time}`).toISOString(),
          status: "confirmed",
          source: "admin"
        }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Error al guardar la cita.");
      }
      setConfirmed(true);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (confirmed && formData) {
    const waUrl = `https://wa.me/51${formData.phone}?text=${encodeURIComponent(
      `✨ *GLOW SKINS* ✨\n\nHola *${formData.clientName}*,\nConfirmamos tu cita para el día *${formData.date}* a las *${formData.time}*.\nTratamiento: *${formData.serviceName}*.\n\n¡Te esperamos!`
    )}`;

    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card p-12 rounded-[4rem] text-center space-y-10 border-emerald-100 bg-emerald-50/50">
        <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/20">
          <CheckCircle2 className="w-10 h-10 text-white" />
        </div>
        <div className="space-y-3">
          <h2 className="text-3xl font-serif">¡Cita Registrada!</h2>
          <p className="text- brand-dark/40 text-sm font-medium">La cita ha sido añadida a la agenda local y de Google.</p>
        </div>

        <div className="flex flex-col gap-4">
          <a href={waUrl} target="_blank" rel="noopener noreferrer" className="premium-button bg-[#25D366] text-white py-5 rounded-full text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl">
            Enviar Confirmación por WhatsApp
          </a>
          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => window.location.reload()} className="py-4 border border-brand-dark/10 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-brand-dark hover:text-white transition-all">
              Nueva Cita
            </button>
            <button onClick={onDone} className="py-4 bg-brand-dark text-white rounded-full text-[10px] font-black uppercase tracking-widest">
              Ver Agenda
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  if (localTab === "confirm" && formData) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card p-12 rounded-[4rem] space-y-10">
        <div className="space-y-2">
          <h2 className="text-3xl font-serif">Verificar Datos</h2>
          <p className="text-[10px] font-black uppercase tracking-widest opacity-30">Revisa antes de confirmar la reserva</p>
        </div>

        <div className="grid gap-6 text-sm bg-brand-nude p-10 rounded-[2.5rem] border border-brand-dark/5">
          <div className="flex justify-between border-b border-brand-dark/5 pb-4">
            <span className="opacity-40 uppercase font-black text-[9px] tracking-widest">Clienta</span>
            <span className="font-bold">{formData.clientName}</span>
          </div>
          <div className="flex justify-between border-b border-brand-dark/5 pb-4">
            <span className="opacity-40 uppercase font-black text-[9px] tracking-widest">WhatsApp</span>
            <span className="font-bold">+51 {formData.phone}</span>
          </div>
          <div className="flex justify-between border-b border-brand-dark/5 pb-4">
            <span className="opacity-40 uppercase font-black text-[9px] tracking-widest">Servicio</span>
            <span className="font-bold text-brand-primary">{formData.serviceName}</span>
          </div>
          <div className="flex justify-between border-b border-brand-dark/5 pb-4">
            <span className="opacity-40 uppercase font-black text-[9px] tracking-widest">Especialista</span>
            <span className="font-bold italic">{formData.professionalName}</span>
          </div>
          <div className="flex justify-between text-lg pt-4">
            <span className="font-serif">Total Cita</span>
            <span className="font-serif font-black tabular-nums">S/. {formData.price}</span>
          </div>
        </div>

        <div className="flex gap-4">
          <button onClick={handleFinalSave} disabled={loading} className="premium-button flex-1 bg-brand-dark text-white py-5 rounded-full text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-2xl">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle2 className="w-4 h-4" />Confirmar y Agendar</>}
          </button>
          <button onClick={() => setLocalTab("form")} className="w-16 h-16 rounded-full bg-brand-dark/5 flex items-center justify-center hover:bg-brand-dark hover:text-white transition-all">
            <X className="w-6 h-6" />
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="glass-card p-12 rounded-[4rem] space-y-12">
      <div className="space-y-1">
        <h2 className="text-3xl font-serif">Nueva Reserva Manual</h2>
        <p className="text-[10px] font-black uppercase tracking-widest opacity-30">Para clientes que agendan presencial o por llamada</p>
      </div>

      <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-x-12 gap-y-10">
        <div className="space-y-3">
          <label className="text-[10px] font-black uppercase tracking-widest opacity-30">Elegir Servicio</label>
          <select
            name="serviceId"
            required
            className="w-full bg-transparent border-b border-brand-dark/10 py-4 focus:border-brand-primary outline-none transition-all text-sm font-bold appearance-none pr-12"
          >
            {services.map(s => <option key={s.id} value={s.id}>{s.name} — S/. {s.price}</option>)}
          </select>
        </div>
        <div className="space-y-3">
          <label className="text-[10px] font-black uppercase tracking-widest opacity-30">Asignar Especialista</label>
          <select
            name="professionalId"
            className="w-full bg-transparent border-b border-brand-dark/10 py-4 focus:border-brand-primary outline-none transition-all text-sm font-bold appearance-none pr-12"
          >
            <option value="">Cualquier disponible</option>
            {professionals.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="space-y-3">
          <label className="text-[10px] font-black uppercase tracking-widest opacity-30">Fecha de Cita</label>
          <input
            type="date"
            name="date"
            required
            min={new Date().toISOString().slice(0, 10)}
            className="w-full bg-transparent border-b border-brand-dark/10 py-4 focus:border-brand-primary outline-none transition-all text-sm font-bold"
          />
        </div>
        <div className="space-y-3">
          <label className="text-[10px] font-black uppercase tracking-widest opacity-30">Horario</label>
          <input
            type="time"
            name="time"
            required
            step="3600"
            className="w-full bg-transparent border-b border-brand-dark/10 py-4 focus:border-brand-primary outline-none transition-all text-sm font-bold"
          />
          <p className="text-[9px] uppercase font-bold text-brand-primary/40 mt-1">Solo horas exactas (Ej: 14:00)</p>
        </div>
        <div className="space-y-3">
          <label className="text-[10px] font-black uppercase tracking-widest opacity-30">Nombre de la Clienta</label>
          <input
            name="clientName"
            required
            placeholder="Ej. Ana Victoria"
            className="w-full bg-transparent border-b border-brand-dark/10 py-4 focus:border-brand-primary outline-none transition-all text-sm font-bold placeholder:opacity-10"
          />
        </div>
        <div className="space-y-3">
          <label className="text-[10px] font-black uppercase tracking-widest opacity-30">WhatsApp (Sin +51)</label>
          <input
            name="phone"
            required
            pattern="[0-9]{9}"
            placeholder="999888777"
            className="w-full bg-transparent border-b border-brand-dark/10 py-4 focus:border-brand-primary outline-none transition-all text-sm font-bold placeholder:opacity-10"
          />
        </div>
        <div className="md:col-span-2 pt-6">
          <button type="submit" className="premium-button bg-brand-dark text-white px-16 py-5 rounded-full text-[11px] font-black uppercase tracking-[0.2em] shadow-xl flex items-center justify-center gap-4">
            Proceder al Resumen <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
}
