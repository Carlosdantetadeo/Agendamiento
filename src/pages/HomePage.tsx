import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Calendar, Clock, Sparkles, CheckCircle2, AlertCircle, Loader2, ChevronRight } from "lucide-react";
import type { Service, Professional, AvailabilitySlot } from "../types";

export default function HomePage() {
  const [services, setServices] = useState<Service[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [service, setService] = useState<Service | null>(null);
  const [professional, setProfessional] = useState<Professional | null>(null);
  const [date, setDate] = useState("");
  const [slot, setSlot] = useState("");
  const [clientName, setClientName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadAvail, setLoadAvail] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [lastBooking, setLastBooking] = useState<{
    clientName: string;
    phone: string;
    serviceName: string;
    date: string;
    time: string;
    token?: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/services")
      .then((r) => r.json())
      .then(setServices)
      .catch(console.error);
    fetch("/api/professionals")
      .then((r) => r.json())
      .then(setProfessionals)
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!date || !service) return;
    setLoadAvail(true);
    const professionalId = professional ? professional.id : "";
    const url = `/api/availability?date=${date}&serviceId=${service.id}${
      professionalId ? `&professionalId=${professionalId}` : ""
    }`;
    fetch(url)
      .then((r) => r.json())
      .then((data) => setAvailability(Array.isArray(data) ? data : []))
      .catch(() => setAvailability([]))
      .finally(() => setLoadAvail(false));
  }, [date, service, professional]);

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName || !phone || !date || !slot || !service) return;

    setLoading(true);
    setStatus("idle");
    const dateTime = new Date(`${date}T${slot}`).toISOString();
    try {
      const res = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName,
          phone,
          email: email || undefined,
          serviceId: service.id,
          professionalId: professional?.id,
          dateTime,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al reservar");
      setLastBooking({
        clientName,
        phone,
        serviceName: service.name,
        date,
        time: slot,
        token: data.token,
      });
      setStatus("success");
      setClientName("");
      setPhone("");
      setEmail("");
      setSlot("");
    } catch (err: any) {
      setStatus("error");
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF9] text-[#2C2C2C] font-sans">
      <header className="pt-16 pb-8 px-6 text-center max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
          <h1 className="text-3xl md:text-4xl font-serif tracking-tight mb-2 italic">Glow Skins</h1>
          <p className="text-[10px] uppercase tracking-[0.3em] text-[#2C2C2C]/60 font-medium">By Nilda Reyes</p>
          <div className="h-px w-12 bg-[#2C2C2C]/20 mx-auto mt-6" />
        </motion.div>
      </header>

      <main className="max-w-md mx-auto px-6 pb-20">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-white/50 backdrop-blur-sm border border-[#F3EFEC] rounded-3xl p-8 shadow-sm"
        >
          {status === "success" && lastBooking ? (
            <SuccessStep lastBooking={lastBooking} />
          ) : (
            <form onSubmit={handleBook} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-semibold text-[#2C2C2C]/50 ml-1">
                  Servicio
                </label>
                <select
                  value={service?.id ?? ""}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    setService(services.find((s) => s.id === id) ?? null);
                    setProfessional(null);
                  }}
                  className="w-full bg-[#F3EFEC]/30 border-b border-[#2C2C2C]/10 py-3 px-1 focus:border-[#2C2C2C] outline-none"
                >
                  <option value="">Selecciona un servicio</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} — {s.durationMinutes} min (S/. {s.price})
                    </option>
                  ))}
                </select>
              </div>

              {service && (
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest font-semibold text-[#2C2C2C]/50 ml-1">
                    Profesional (opcional)
                  </label>
                  <select
                    value={professional?.id ?? ""}
                    onChange={(e) => {
                      const id = Number(e.target.value);
                      setProfessional(id ? professionals.find((p) => p.id === id) ?? null : null);
                    }}
                    className="w-full bg-[#F3EFEC]/30 border-b border-[#2C2C2C]/10 py-3 px-1 focus:border-[#2C2C2C] outline-none"
                  >
                    <option value="">Cualquier disponible</option>
                    {professionals.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-semibold text-[#2C2C2C]/50 ml-1 flex items-center gap-2">
                  <Calendar className="w-3 h-3" /> Fecha
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value);
                    setSlot("");
                  }}
                  min={new Date().toISOString().slice(0, 10)}
                  className="w-full bg-transparent border-b border-[#2C2C2C]/10 py-3 pl-6 pr-1 focus:border-[#2C2C2C] outline-none"
                />
              </div>

              {date && service && (
                <div className="space-y-4">
                  <label className="text-[10px] uppercase tracking-widest font-semibold text-[#2C2C2C]/50 ml-1 flex items-center gap-2">
                    <Clock className="w-3 h-3" /> Hora disponible
                  </label>
                  {loadAvail ? (
                    <div className="flex items-center gap-2 text-[#2C2C2C]/60">
                      <Loader2 className="w-4 h-4 animate-spin" /> Cargando...
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-2">
                      {availability.map((a) => (
                        <button
                          key={a.time}
                          type="button"
                          onClick={() => setSlot(a.time)}
                          className={`py-2 rounded-lg text-xs font-medium border transition-all ${
                            slot === a.time
                              ? "bg-[#2C2C2C] text-white border-[#2C2C2C]"
                              : "bg-white border-[#F3EFEC] hover:border-[#2C2C2C]/20"
                          }`}
                        >
                          {a.time}
                        </button>
                      ))}
                    </div>
                  )}
                  {!loadAvail && availability.length === 0 && date && service && (
                    <p className="text-sm text-amber-700">
                      No hay horarios disponibles este día. Elige otra fecha o configura horarios en Admin.
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-semibold text-[#2C2C2C]/50 ml-1">
                  Nombre
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. María García"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full bg-[#F3EFEC]/30 border-b border-[#2C2C2C]/10 py-3 px-1 focus:border-[#2C2C2C] outline-none placeholder:text-[#2C2C2C]/20"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-semibold text-[#2C2C2C]/50 ml-1">
                  Teléfono (Perú)
                </label>
                <div className="relative">
                  <span className="absolute left-1 top-1/2 -translate-y-1/2 text-sm text-[#2C2C2C]/40">+51</span>
                  <input
                    type="tel"
                    required
                    placeholder="987 654 321"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 9))}
                    className="w-full bg-[#F3EFEC]/30 border-b border-[#2C2C2C]/10 py-3 pl-10 pr-1 focus:border-[#2C2C2C] outline-none placeholder:text-[#2C2C2C]/20"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-semibold text-[#2C2C2C]/50 ml-1">
                  Email (opcional)
                </label>
                <input
                  type="email"
                  placeholder="correo@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#F3EFEC]/30 border-b border-[#2C2C2C]/10 py-3 px-1 focus:border-[#2C2C2C] outline-none placeholder:text-[#2C2C2C]/20"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !service || !date || !slot}
                className="w-full group relative overflow-hidden bg-[#2C2C2C] text-[#FDFBF9] py-5 rounded-2xl font-medium tracking-wide transition-all active:scale-[0.98] disabled:opacity-70"
              >
                <div className="relative z-10 flex items-center justify-center gap-2">
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Confirmar Cita <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </div>
              </button>
            </form>
          )}

          <AnimatePresence>
            {status === "error" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-8 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-800 text-sm"
              >
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                <p>{errorMessage}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <div className="mt-12 text-center space-y-4">
          <div className="flex justify-center gap-8 text-[10px] uppercase tracking-[0.2em] text-[#2C2C2C]/40">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3 h-3" /> Alta Gama
            </span>
            <span>•</span>
            <span>Cuidado Experto</span>
          </div>
          <p className="text-[11px] text-[#2C2C2C]/30">Lima, Perú — Cuidado de la piel profesional</p>
          <Link to="/admin" className="text-[11px] text-[#2C2C2C]/50 hover:text-[#C5A059]">
            Panel admin
          </Link>
        </div>
      </main>
    </div>
  );
}

function SuccessStep({
  lastBooking,
}: {
  lastBooking: { clientName: string; serviceName: string; date: string; time: string; token?: string };
}) {
  const link = lastBooking.token ? `${window.location.origin}/cita/${lastBooking.token}` : null;
  const businessPhone = "51906959989";

  const sendWhatsApp = () => {
    const msg =
      `✨ *GLOW SKINS BY NILDA REYES* ✨%0A` +
      `----------------------------%0A` +
      `🗓️ *NUEVA CITA AGENDADA*%0A%0A` +
      `👤 *Clienta:* ${lastBooking.clientName}%0A` +
      `⭐ *Servicio:* ${lastBooking.serviceName}%0A` +
      `📅 *Fecha:* ${lastBooking.date}%0A` +
      `⏰ *Hora:* ${lastBooking.time}%0A` +
      `%0A` +
      `✅ *Estado:* Confirmado%0A` +
      `----------------------------%0A` +
      `¡Te esperamos en Glow Skins! ✨`;
    window.open(`https://wa.me/${businessPhone}?text=${msg}`, "_blank");
  };

  return (
    <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-2xl space-y-4">
      <div className="flex items-center gap-3 text-emerald-800 text-sm">
        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
        <p>¡Cita agendada!</p>
      </div>
      <p className="text-sm text-[#2C2C2C]/80">
        {lastBooking.clientName} — {lastBooking.serviceName} — {lastBooking.date} {lastBooking.time}
      </p>
      {link && (
        <p className="text-xs text-[#2C2C2C]/60 break-all">
          Para cancelar o reprogramar:{" "}
          <a href={link} className="text-[#C5A059] underline">
            {link}
          </a>
        </p>
      )}
      <button
        type="button"
        onClick={sendWhatsApp}
        className="mt-4 w-full py-3 rounded-xl bg-[#25D366] text-white text-xs font-bold uppercase tracking-widest hover:bg-[#128C7E] transition-colors"
      >
        Enviar confirmación por WhatsApp
      </button>
    </div>
  );
}

