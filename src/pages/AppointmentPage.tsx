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
  const [newDateTime, setNewDateTime] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) return;
    fetch(`/api/appointments/by-token/${token}`)
      .then((r) => {
        if (!r.ok) throw new Error("Cita no encontrada");
        return r.json();
      })
      .then(setAppt)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  const handleCancel = async () => {
    if (!token) return;
    setAction("cancelling");
    try {
      const res = await fetch("/api/appointments/cancel-by-token", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al cancelar");
      setMessage("Cita cancelada correctamente.");
      setAppt((p) => (p ? { ...p, status: "cancelled" } : null));
      setAction("done");
    } catch (e: any) {
      setMessage(e.message);
      setAction("idle");
    }
  };

  const handleReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newDateTime) return;
    setAction("rescheduling");
    try {
      const res = await fetch("/api/appointments/reschedule-by-token", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, dateTime: new Date(newDateTime).toISOString() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al reprogramar");
      setAppt((p) => (p ? { ...p, dateTime: data.dateTime } : null));
      setMessage("Cita reprogramada correctamente.");
      setNewDateTime("");
      setAction("done");
    } catch (e: any) {
      setMessage(e.message);
      setAction("idle");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFBF9] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#2C2C2C]/50" />
      </div>
    );
  }
  if (error || !appt) {
    return (
      <div className="min-h-screen bg-[#FDFBF9] flex items-center justify-center p-6">
        <div className="bg-white/80 border border-[#F3EFEC] rounded-2xl p-8 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <p className="text-[#2C2C2C]">{error || "Cita no encontrada"}</p>
        </div>
      </div>
    );
  }

  const dt = new Date(appt.dateTime);
  const dateStr = dt.toLocaleDateString("es-PE", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const timeStr = dt.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", hour12: false });

  return (
    <div className="min-h-screen bg-[#FDFBF9] text-[#2C2C2C] font-sans">
      <header className="pt-12 pb-6 px-6 text-center">
        <h1 className="text-2xl font-serif italic">Glow Skins</h1>
        <p className="text-[10px] uppercase tracking-widest text-[#2C2C2C]/60 mt-1">Tu cita</p>
      </header>

      <main className="max-w-md mx-auto px-6 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/50 border border-[#F3EFEC] rounded-3xl p-8 shadow-sm space-y-6"
        >
          {appt.status !== "pending" ? (
            <p className="text-center text-[#2C2C2C]/70">Esta cita ya no está activa (cancelada o completada).</p>
          ) : (
            <>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-[#2C2C2C]/50">Cliente</p>
                <p className="font-medium">{appt.clientName}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-[#2C2C2C]/50">Servicio</p>
                <p className="font-medium">{appt.serviceName || appt.treatment}</p>
                {appt.professionalName && <p className="text-sm text-[#2C2C2C]/70">Con {appt.professionalName}</p>}
              </div>
              <div className="flex items-center gap-3 text-[#2C2C2C]/80">
                <Calendar className="w-4 h-4" />
                <span>{dateStr}</span>
              </div>
              <div className="flex items-center gap-3 text-[#2C2C2C]/80">
                <Clock className="w-4 h-4" />
                <span>{timeStr}</span>
              </div>

              {message && (
                <div className={`p-4 rounded-xl text-sm ${action === "done" ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>
                  {message}
                </div>
              )}

              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={action === "cancelling"}
                  className="w-full py-3 rounded-xl border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {action === "cancelling" ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Cancelar cita
                </button>

                <form onSubmit={handleReschedule} className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-[#2C2C2C]/50 block">Reprogramar (nueva fecha y hora)</label>
                  <input
                    type="datetime-local"
                    value={newDateTime}
                    onChange={(e) => setNewDateTime(e.target.value)}
                    className="w-full bg-[#F3EFEC]/30 border border-[#2C2C2C]/10 py-2 px-3 rounded-lg outline-none focus:border-[#2C2C2C]"
                  />
                  <button
                    type="submit"
                    disabled={!newDateTime || action === "rescheduling"}
                    className="w-full py-3 rounded-xl bg-[#2C2C2C] text-white disabled:opacity-70 flex items-center justify-center gap-2"
                  >
                    {action === "rescheduling" ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Reprogramar
                  </button>
                </form>
              </div>

              <p className="text-[11px] text-[#2C2C2C]/50">
                Solo puedes cancelar o reprogramar con al menos 2 horas de anticipación.
              </p>
            </>
          )}
        </motion.div>
      </main>
    </div>
  );
}
