import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { motion } from "motion/react";
import { Calendar, Clock, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

interface AppointmentDetail {
  id: number;
  clientName: string;
  phone: string;
  dateTime: string;
  treatment: string;
  serviceName?: string;
  professionalName?: string;
  status: string;
}

export default function AppointmentPage() {
  const { token } = useParams<{ token: string }>();
  const [appt, setAppt] = useState<AppointmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [action, setAction] = useState<"idle" | "cancelling" | "rescheduling" | "done">("idle");
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) return;
    fetch(`/api/appointments/by-token/${token}`)
      .then((r) => {
        if (!r.ok) throw new Error("No encontramos tu cita. Por favor verifica el enlace.");
        return r.json();
      })
      .then(setAppt)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  const handleCancel = async () => {
    if (!token) return;
    if (!confirm("¿Estás segura que deseas cancelar tu cita? Esta acción no se puede deshacer.")) return;

    setAction("cancelling");
    try {
      const res = await fetch("/api/appointments/cancel-by-token", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo cancelar la cita.");
      setMessage("Tu cita ha sido cancelada exitosamente.");
      setAppt((p) => (p ? { ...p, status: "cancelled" } : null));
      setAction("done");
    } catch (e: any) {
      setMessage(e.message);
      setAction("idle");
    }
  };

  const handleReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newDate || !newTime) return;

    setAction("rescheduling");
    try {
      const dateTime = new Date(`${newDate}T${newTime}`).toISOString();
      const res = await fetch("/api/appointments/reschedule-by-token", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, dateTime }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "El horario seleccionado no está disponible.");

      setAppt((p) => (p ? { ...p, dateTime: data.dateTime } : null));
      setMessage("¡Tu cita ha sido reprogramada con éxito!");
      setNewDate("");
      setNewTime("");
      setAction("done");
    } catch (e: any) {
      setMessage(e.message);
      setAction("idle");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-brand-primary" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Cargando tu sesión...</p>
      </div>
    );
  }

  if (error || !appt) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white border border-slate-100 rounded-[3rem] p-12 max-w-sm text-center shadow-2xl shadow-slate-200/50"
        >
          <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-amber-500" />
          </div>
          <h2 className="text-xl font-black text-slate-900 mb-2">Lo sentimos</h2>
          <p className="text-slate-500 text-sm font-medium leading-relaxed mb-8">{error || "Cita no encontrada"}</p>
          <a href="/" className="inline-block w-full py-4 bg-brand-dark text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-brand-dark/20">Ir al inicio</a>
        </motion.div>
      </div>
    );
  }

  const dt = new Date(appt.dateTime);
  const isPending = appt.status === "pending";

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-brand-primary/10">
      <header className="p-10 sticky top-0 bg-white/80 backdrop-blur-xl border-b border-slate-100 z-50">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-black tracking-tighter uppercase italic">Glow Skins</h1>
          <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full tracking-widest ${appt.status === 'cancelled' ? 'bg-red-500 text-white' :
            appt.status === 'completed' ? 'bg-emerald-500 text-white' :
              'bg-brand-primary text-white animate-pulse'
            }`}>
            {appt.status}
          </span>
        </div>
      </header>

      <main className="max-w-xl mx-auto p-8 pt-12 space-y-12 pb-24">
        <section className="space-y-4 text-center">
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Gestionar Reserva</h2>
          <p className="text-slate-500 font-medium">Aquí puedes ver los detalles o modificar tu cita.</p>
        </section>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-50 rounded-[3.5rem] p-12 border border-slate-100 shadow-2xl shadow-slate-200/50 space-y-10"
        >
          {/* Appointment Identity Card */}
          <div className="space-y-8">
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Clienta</label>
                <p className="text-xl font-bold">{appt.clientName}</p>
              </div>
              <div className="space-y-1 text-right">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Tratamiento</label>
                <p className="text-xl font-bold text-brand-primary">{appt.serviceName || appt.treatment}</p>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm grid grid-cols-2 gap-6 items-center">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-brand-primary" />
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Fecha</p>
                  <p className="text-sm font-bold">{dt.toLocaleDateString("es-PE", { day: '2-digit', month: 'long' })}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 border-l border-slate-100 pl-6">
                <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-brand-primary" />
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Hora</p>
                  <p className="text-sm font-bold">{dt.toLocaleTimeString("es-PE", { hour: '2-digit', minute: '2-digit', hour12: false })}</p>
                </div>
              </div>
            </div>
          </div>

          {message && (
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`p-6 rounded-3xl text-sm font-bold text-center flex items-center justify-center gap-3 ${action === "done" ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"
                }`}
            >
              {action === "done" ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              {message}
            </motion.div>
          )}

          {isPending && action !== "done" && (
            <div className="space-y-8 pt-6 border-t border-slate-200">
              <div className="space-y-6">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest text-center">¿Deseas reprogramar?</h3>
                <form onSubmit={handleReschedule} className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-4">Nuevo Día</label>
                    <input
                      type="date"
                      required
                      min={new Date().toISOString().split('T')[0]}
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      className="w-full bg-white border border-slate-200 py-4 px-6 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-brand-primary/5 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-4">Nueva Hora</label>
                    <select
                      required
                      value={newTime}
                      onChange={(e) => setNewTime(e.target.value)}
                      className="w-full bg-white border border-slate-200 py-4 px-6 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-brand-primary/5 transition-all appearance-none"
                    >
                      <option value="">Seleccionar hora</option>
                      {Array.from({ length: 13 }).map((_, i) => {
                        const h = String(i + 8).padStart(2, "0");
                        const label = `${h}:00`;
                        return <option key={label} value={label}>{label}</option>;
                      })}
                    </select>
                  </div>
                  <button
                    type="submit"
                    disabled={!newDate || !newTime || action === "rescheduling"}
                    className="col-span-2 py-5 bg-brand-dark text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-brand-dark/20 disabled:opacity-30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                  >
                    {action === "rescheduling" ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirmar nuevo horario'}
                  </button>
                </form>
              </div>

              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100" /></div>
                <div className="relative flex justify-center text-[10px] uppercase font-black text-slate-200 tracking-[0.4em] bg-slate-50 px-4">O bien</div>
              </div>

              <button
                type="button"
                onClick={handleCancel}
                disabled={action === "cancelling"}
                className="w-full py-5 rounded-2xl border-2 border-slate-100 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:border-red-100 hover:text-red-500 hover:bg-red-50 transition-all active:scale-[0.98]"
              >
                {action === "cancelling" ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Cancelar cita definitivamente'}
              </button>

              <p className="text-[9px] text-slate-300 font-bold text-center leading-relaxed px-8">
                * Recuerda que los cambios deben realizarse con al menos 2 horas de anticipación para respetar el tiempo de nuestras especialistas.
              </p>
            </div>
          )}

          {!isPending && (
            <div className="text-center pt-6">
              <a href="/" className="inline-block px-10 py-5 bg-brand-primary text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl shadow-brand-primary/20">Programar nueva cita</a>
            </div>
          )}
        </motion.div>

        <section className="text-center space-y-6">
          <p className="text-xs text-slate-400 font-medium italic">¿Tienes alguna duda técnica? Contáctanos por WhatsApp:</p>
          <a
            href="https://wa.me/51906959989"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-3 px-8 py-4 bg-[#25D366] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-500/10 hover:scale-105 transition-all"
          >
            Chat de Soporte Glow
          </a>
        </section>
      </main>

      <footer className="p-16 border-t border-slate-100 text-center space-y-4">
        <p className="text-[10px] font-black uppercase text-slate-300 tracking-[0.5em]">Glow Skins by Nilda Reyes</p>
        <p className="text-[9px] font-bold text-slate-200 italic">Expertos en el cuidado de tu piel</p>
      </footer>
    </div>
  );
}
