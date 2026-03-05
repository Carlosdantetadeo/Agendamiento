import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import {
  Calendar,
  Users,
  Scissors,
  Plus,
  Loader2,
  Trash2,
  Edit2,
  ChevronLeft,
} from "lucide-react";
import type { Service, Professional, Appointment } from "../types";

type Tab = "agenda" | "services" | "professionals" | "new-appointment";

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("agenda");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(false);

  const [agendaKey, setAgendaKey] = useState(0);
  const [filterByDateOnly, setFilterByDateOnly] = useState(true);
  useEffect(() => {
    if (tab === "agenda") {
      setLoading(true);
      const url = filterByDateOnly ? `/api/appointments?date=${date}` : "/api/appointments";
      fetch(url)
        .then((r) => r.json())
        .then(setAppointments)
        .catch(() => setAppointments([]))
        .finally(() => setLoading(false));
    }
  }, [tab, date, agendaKey, filterByDateOnly]);
  const refreshAgenda = () => setAgendaKey((k) => k + 1);

  useEffect(() => {
    fetch("/api/services").then((r) => r.json()).then(setServices);
    fetch("/api/professionals").then((r) => r.json()).then(setProfessionals);
  }, [tab]);

  return (
    <div className="min-h-screen bg-[#FDFBF9] text-[#2C2C2C] font-sans">
      <header className="border-b border-[#F3EFEC] bg-white/80 backdrop-blur px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-[#2C2C2C]/70 hover:text-[#2C2C2C]">
          <ChevronLeft className="w-4 h-4" /> Volver
        </Link>
        <h1 className="text-lg font-semibold">Panel Admin</h1>
        <span className="w-16" />
      </header>

      <nav className="flex border-b border-[#F3EFEC] overflow-x-auto">
        {[
          { id: "agenda" as Tab, label: "Agenda", icon: Calendar },
          { id: "services" as Tab, label: "Servicios", icon: Scissors },
          { id: "professionals" as Tab, label: "Profesionales", icon: Users },
          { id: "new-appointment" as Tab, label: "Nueva cita", icon: Plus },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              tab === id ? "border-[#2C2C2C] text-[#2C2C2C]" : "border-transparent text-[#2C2C2C]/60 hover:text-[#2C2C2C]"
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </nav>

      <main className="max-w-4xl mx-auto p-6">
        {tab === "agenda" && (
          <AgendaTab
            date={date}
            setDate={setDate}
            appointments={appointments}
            loading={loading}
            filterByDateOnly={filterByDateOnly}
            setFilterByDateOnly={setFilterByDateOnly}
            onRefresh={refreshAgenda}
          />
        )}
        {tab === "services" && <ServicesTab services={services} onRefresh={() => fetch("/api/services").then((r) => r.json()).then(setServices)} />}
        {tab === "professionals" && <ProfessionalsTab professionals={professionals} services={services} onRefresh={() => fetch("/api/professionals").then((r) => r.json()).then(setProfessionals)} />}
        {tab === "new-appointment" && <NewAppointmentTab services={services} professionals={professionals} onDone={() => { setTab("agenda"); refreshAgenda(); }} />}
      </main>
    </div>
  );
}

function AgendaTab({
  date,
  setDate,
  appointments,
  loading,
  filterByDateOnly,
  setFilterByDateOnly,
  onRefresh,
}: {
  date: string;
  setDate: (d: string) => void;
  appointments: Appointment[];
  loading: boolean;
  filterByDateOnly: boolean;
  setFilterByDateOnly: (v: boolean) => void;
  onRefresh: () => void;
}) {
  const handleCancel = async (id: number) => {
    if (!confirm("¿Cancelar esta cita?")) return;
    await fetch(`/api/appointments/${id}/cancel`, { method: "PATCH" });
    onRefresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-[#2C2C2C]/80">Fecha</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={!filterByDateOnly}
            className="border border-[#2C2C2C]/20 rounded-lg px-3 py-2 outline-none focus:border-[#2C2C2C] disabled:opacity-60 disabled:bg-[#F3EFEC]/30"
          />
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-[#2C2C2C]/80">
          <input
            type="checkbox"
            checked={filterByDateOnly}
            onChange={(e) => setFilterByDateOnly(e.target.checked)}
            className="rounded border-[#2C2C2C]/30"
          />
          Solo esta fecha
        </label>
        {!filterByDateOnly && (
          <span className="text-xs text-[#2C2C2C]/50">Mostrando últimas 100 citas</span>
        )}
      </div>
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-[#2C2C2C]/40" /></div>
      ) : (
        <ul className="space-y-3">
          {appointments.length === 0 ? (
            <li className="rounded-xl border border-[#F3EFEC] bg-white/60 p-8 text-center">
              <p className="text-[#2C2C2C]/70 font-medium">
                {filterByDateOnly ? "No hay citas para esta fecha." : "No hay citas en la base local."}
              </p>
              <p className="mt-2 text-sm text-[#2C2C2C]/50">
                Las reservas también se sincronizan con Google Calendar; revisa allí si no ves citas aquí (en Vercel la base local puede ser efímera).
              </p>
            </li>
          ) : (
            appointments.map((a) => {
              const dt = new Date(a.dateTime);
              const timeStr = dt.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", hour12: false });
              return (
                <li
                  key={a.id}
                  className="flex items-center justify-between gap-4 p-4 bg-white border border-[#F3EFEC] rounded-xl"
                >
                  <div>
                    <p className="font-medium">{a.clientName}</p>
                    <p className="text-sm text-[#2C2C2C]/70">{a.serviceName || a.treatment} — {timeStr}</p>
                    {a.professionalName && <p className="text-xs text-[#2C2C2C]/50">{a.professionalName}</p>}
                    {a.source === "manual" && <span className="text-[10px] uppercase text-amber-600">Presencial</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    {a.status === "pending" && a.token && (
                      <a href={`/cita/${a.token}`} target="_blank" rel="noopener noreferrer" className="text-xs text-[#C5A059] underline">Link</a>
                    )}
                    {a.status === "pending" && (
                      <button
                        type="button"
                        onClick={() => handleCancel(a.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        title="Cancelar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    {a.status !== "pending" && <span className="text-xs text-[#2C2C2C]/50">{a.status}</span>}
                  </div>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}

function ServicesTab({ services, onRefresh }: { services: Service[]; onRefresh: () => void }) {
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
    <div className="space-y-4">
      {!adding && !editing && (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#2C2C2C] text-white rounded-xl text-sm"
        >
          <Plus className="w-4 h-4" /> Nuevo servicio
        </button>
      )}
      {(adding || editing) && (
        <div className="p-4 bg-white border border-[#F3EFEC] rounded-xl space-y-3">
          <input
            placeholder="Nombre"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="w-full border border-[#2C2C2C]/20 rounded-lg px-3 py-2"
          />
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Duración (min)"
              value={form.durationMinutes}
              onChange={(e) => setForm((f) => ({ ...f, durationMinutes: Number(e.target.value) || 0 }))}
              className="flex-1 border border-[#2C2C2C]/20 rounded-lg px-3 py-2"
            />
            <input
              type="number"
              placeholder="Precio"
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) || 0 }))}
              className="flex-1 border border-[#2C2C2C]/20 rounded-lg px-3 py-2"
            />
          </div>
          <input
            placeholder="Categoría"
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            className="w-full border border-[#2C2C2C]/20 rounded-lg px-3 py-2"
          />
          <div className="flex gap-2">
            <button type="button" onClick={editing ? saveEdit : saveNew} className="px-4 py-2 bg-[#2C2C2C] text-white rounded-lg text-sm">Guardar</button>
            <button type="button" onClick={() => { setAdding(false); setEditing(null); }} className="px-4 py-2 border border-[#2C2C2C]/20 rounded-lg text-sm">Cancelar</button>
          </div>
        </div>
      )}
      <ul className="space-y-2">
        {services.map((s) => (
          <li key={s.id} className="flex items-center justify-between p-4 bg-white border border-[#F3EFEC] rounded-xl">
            <div>
              <p className="font-medium">{s.name}</p>
              <p className="text-sm text-[#2C2C2C]/60">{s.durationMinutes} min — S/. {s.price}</p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => { setEditing(s); setForm({ name: s.name, durationMinutes: s.durationMinutes, price: s.price, category: s.category }); }} className="p-2 hover:bg-[#F3EFEC] rounded-lg"><Edit2 className="w-4 h-4" /></button>
              <button type="button" onClick={() => remove(s.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

const DAY_NAMES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

type ScheduleRow = { dayOfWeek: number; startTime: string; endTime: string };

function ProfessionalsTab({
  professionals,
  services,
  onRefresh,
}: {
  professionals: Professional[];
  services: Service[];
  onRefresh: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [schedule, setSchedule] = useState<ScheduleRow[]>([]);
  const [assignedServices, setAssignedServices] = useState<Service[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [savingServices, setSavingServices] = useState(false);
  const editorRef = React.useRef<HTMLDivElement>(null);

  const editingProfessional = editingId ? professionals.find((p) => Number(p.id) === Number(editingId)) : null;

  useEffect(() => {
    if (!editingId) return;
    setLoadingDetail(true);
    Promise.all([
      fetch(`/api/professionals/${editingId}/schedule`).then((r) => r.json()),
      fetch(`/api/professionals/${editingId}/services`).then((r) => r.json()),
    ])
      .then(([sched, assigned]) => {
        setSchedule(
          (sched as { day_of_week: number; start_time: string; end_time: string }[]).map((s) => ({
            dayOfWeek: s.day_of_week,
            startTime: s.start_time || "09:00",
            endTime: s.end_time || "18:00",
          }))
        );
        setAssignedServices(Array.isArray(assigned) ? assigned : []);
      })
      .catch(() => setSchedule([]))
      .finally(() => setLoadingDetail(false));
  }, [editingId]);

  useEffect(() => {
    if (editingId && editorRef.current) {
      editorRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [editingId]);

  const assignedIds = new Set(assignedServices.map((s) => s.id));

  const add = async () => {
    if (!name.trim()) return;
    await fetch("/api/professionals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim() }) });
    setName("");
    setAdding(false);
    onRefresh();
  };

  const remove = async (id: number) => {
    if (!confirm("¿Eliminar este profesional?")) return;
    await fetch(`/api/professionals/${id}`, { method: "DELETE" });
    if (editingId === id) setEditingId(null);
    onRefresh();
  };

  const addScheduleRow = () => setSchedule((prev) => [...prev, { dayOfWeek: 1, startTime: "09:00", endTime: "18:00" }]);
  const removeScheduleRow = (i: number) => setSchedule((prev) => prev.filter((_, idx) => idx !== i));
  const updateScheduleRow = (i: number, field: keyof ScheduleRow, value: number | string) => {
    setSchedule((prev) => prev.map((row, idx) => (idx === i ? { ...row, [field]: value } : row)));
  };

  const saveSchedule = async () => {
    if (!editingId) return;
    setSavingSchedule(true);
    try {
      const payload = schedule.filter((s) => s.startTime && s.endTime && s.dayOfWeek != null);
      const res = await fetch(`/api/professionals/${editingId}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schedule: payload }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
    } catch (e: any) {
      alert(e.message || "Error al guardar horario");
    } finally {
      setSavingSchedule(false);
    }
  };

  const toggleService = (serviceId: number) => {
    if (assignedIds.has(serviceId)) {
      setAssignedServices((prev) => prev.filter((s) => s.id !== serviceId));
    } else {
      const svc = services.find((s) => s.id === serviceId);
      if (svc) setAssignedServices((prev) => [...prev, svc]);
    }
  };

  const saveServices = async () => {
    if (!editingId) return;
    setSavingServices(true);
    try {
      const serviceIds = assignedServices.map((s) => s.id);
      const res = await fetch(`/api/professionals/${editingId}/services`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceIds }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
    } catch (e: any) {
      alert(e.message || "Error al guardar servicios");
    } finally {
      setSavingServices(false);
    }
  };

  return (
    <div className="space-y-4">
      {!adding && (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#2C2C2C] text-white rounded-xl text-sm"
        >
          <Plus className="w-4 h-4" /> Nuevo profesional
        </button>
      )}
      {adding && (
        <div className="flex gap-2">
          <input
            placeholder="Nombre del profesional"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 border border-[#2C2C2C]/20 rounded-lg px-3 py-2"
          />
          <button type="button" onClick={add} className="px-4 py-2 bg-[#2C2C2C] text-white rounded-lg text-sm">Agregar</button>
          <button type="button" onClick={() => { setAdding(false); setName(""); }} className="px-4 py-2 border rounded-lg text-sm">Cancelar</button>
        </div>
      )}
      <ul className="space-y-2">
        {professionals.map((p) => (
          <li key={p.id} className="flex items-center justify-between p-4 bg-white border border-[#F3EFEC] rounded-xl">
            <p className="font-medium">{p.name}</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEditingId(Number(p.id))}
                className="text-sm font-medium text-[#C5A059] underline hover:no-underline"
              >
                Horarios y servicios
              </button>
              <button type="button" onClick={() => remove(p.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
            </div>
          </li>
        ))}
      </ul>

      {editingProfessional && (
        <div ref={editorRef} className="bg-white border-2 border-[#C5A059]/40 rounded-xl p-4 space-y-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Horarios y servicios — {editingProfessional.name}</h2>
            <button type="button" onClick={() => setEditingId(null)} className="text-sm text-[#2C2C2C]/60 hover:text-[#2C2C2C] underline">Cerrar</button>
          </div>

          {loadingDetail ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-[#2C2C2C]/40" /></div>
          ) : (
            <>
              <section>
                <h3 className="text-sm font-medium text-[#2C2C2C]/80 mb-2">Servicios que ofrece</h3>
                <ul className="space-y-1.5 max-h-40 overflow-y-auto">
                  {services.map((s) => (
                    <li key={s.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`svc-${editingId}-${s.id}`}
                        checked={assignedIds.has(s.id)}
                        onChange={() => toggleService(s.id)}
                        className="rounded border-[#2C2C2C]/30"
                      />
                      <label htmlFor={`svc-${editingId}-${s.id}`} className="text-sm cursor-pointer">{s.name} — {s.durationMinutes} min</label>
                    </li>
                  ))}
                </ul>
                {services.length === 0 && <p className="text-sm text-[#2C2C2C]/50">Crea servicios en la pestaña Servicios.</p>}
                <button type="button" onClick={saveServices} disabled={savingServices} className="mt-2 px-3 py-1.5 bg-[#2C2C2C] text-white rounded-lg text-sm disabled:opacity-70 flex items-center gap-1">
                  {savingServices ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Guardar servicios
                </button>
              </section>

              <section>
                <h3 className="text-sm font-medium text-[#2C2C2C]/80 mb-2">Horario (0=Dom, 1=Lun … 6=Sáb)</h3>
                <div className="space-y-2">
                  {schedule.map((row, i) => (
                    <div key={i} className="flex flex-wrap items-center gap-2">
                      <select value={row.dayOfWeek} onChange={(e) => updateScheduleRow(i, "dayOfWeek", Number(e.target.value))} className="border border-[#2C2C2C]/20 rounded-lg px-2 py-1.5 text-sm w-24">
                        {DAY_NAMES.map((name, d) => <option key={d} value={d}>{name}</option>)}
                      </select>
                      <input type="time" value={row.startTime} onChange={(e) => updateScheduleRow(i, "startTime", e.target.value)} className="border border-[#2C2C2C]/20 rounded-lg px-2 py-1.5 text-sm" />
                      <span className="text-[#2C2C2C]/50">a</span>
                      <input type="time" value={row.endTime} onChange={(e) => updateScheduleRow(i, "endTime", e.target.value)} className="border border-[#2C2C2C]/20 rounded-lg px-2 py-1.5 text-sm" />
                      <button type="button" onClick={() => removeScheduleRow(i)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-2">
                  <button type="button" onClick={addScheduleRow} className="flex items-center gap-1 px-3 py-1.5 border border-[#2C2C2C]/20 rounded-lg text-sm">+ Añadir horario</button>
                  <button type="button" onClick={saveSchedule} disabled={savingSchedule} className="px-3 py-1.5 bg-[#2C2C2C] text-white rounded-lg text-sm disabled:opacity-70 flex items-center gap-1">
                    {savingSchedule ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Guardar horario
                  </button>
                </div>
              </section>
            </>
          )}
        </div>
      )}

      <p className="text-xs text-[#2C2C2C]/50">Haz clic en <strong>Horarios y servicios</strong> de un profesional: se abrirá el formulario debajo para asignar servicios y horarios. Luego pulsa &quot;Guardar servicios&quot; y &quot;Guardar horario&quot;.</p>
    </div>
  );
}

function NewAppointmentTab({
  services,
  professionals,
  onDone,
}: {
  services: Service[];
  professionals: Professional[];
  onDone: () => void;
}) {
  const [clientName, setClientName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [serviceId, setServiceId] = useState<number | "">("");
  const [professionalId, setProfessionalId] = useState<number | "">("");
  const [dateTime, setDateTime] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName || !phone || !dateTime) return;
    setSending(true);
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName,
          phone,
          email: email || undefined,
          serviceId: serviceId || undefined,
          professionalId: professionalId || undefined,
          dateTime: new Date(dateTime).toISOString(),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setDone(true);
      setClientName("");
      setPhone("");
      setEmail("");
      setDateTime("");
      setServiceId("");
      setProfessionalId("");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSending(false);
    }
  };

  if (done) {
    return (
      <div className="p-8 bg-emerald-50 border border-emerald-100 rounded-2xl text-center">
        <p className="text-emerald-800 font-medium">Cita agregada (presencial/telefónica).</p>
        <button type="button" onClick={() => { setDone(false); onDone(); }} className="mt-4 text-[#C5A059] underline">Ver agenda</button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4 max-w-md">
      <input
        required
        placeholder="Nombre del cliente"
        value={clientName}
        onChange={(e) => setClientName(e.target.value)}
        className="w-full border border-[#2C2C2C]/20 rounded-lg px-3 py-2"
      />
      <input
        required
        placeholder="Teléfono"
        value={phone}
        onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 9))}
        className="w-full border border-[#2C2C2C]/20 rounded-lg px-3 py-2"
      />
      <input
        type="email"
        placeholder="Email (opcional)"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full border border-[#2C2C2C]/20 rounded-lg px-3 py-2"
      />
      <select
        value={serviceId}
        onChange={(e) => setServiceId(e.target.value ? Number(e.target.value) : "")}
        className="w-full border border-[#2C2C2C]/20 rounded-lg px-3 py-2"
      >
        <option value="">Servicio (opcional)</option>
        {services.map((s) => (
          <option key={s.id} value={s.id}>{s.name} — {s.durationMinutes} min</option>
        ))}
      </select>
      <select
        value={professionalId}
        onChange={(e) => setProfessionalId(e.target.value ? Number(e.target.value) : "")}
        className="w-full border border-[#2C2C2C]/20 rounded-lg px-3 py-2"
      >
        <option value="">Profesional (opcional)</option>
        {professionals.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
      <input
        required
        type="datetime-local"
        value={dateTime}
        onChange={(e) => setDateTime(e.target.value)}
        className="w-full border border-[#2C2C2C]/20 rounded-lg px-3 py-2"
      />
      <button type="submit" disabled={sending} className="w-full py-3 bg-[#2C2C2C] text-white rounded-xl font-medium disabled:opacity-70 flex items-center justify-center gap-2">
        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        Agregar cita (presencial/telefónica)
      </button>
    </form>
  );
}
