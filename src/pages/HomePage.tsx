import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence, useScroll, useTransform } from "motion/react";
import {
  Calendar,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronRight,
  ArrowRight,
  ShieldCheck,
  Star,
  MapPin,
  ChevronDown
} from "lucide-react";
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
    professionalName?: string | null;
    date: string;
    time: string;
    token?: string;
  } | null>(null);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [servicesRes, professionalsRes] = await Promise.all([
          fetch("/api/services"),
          fetch("/api/professionals"),
        ]);
        if (!servicesRes.ok || !professionalsRes.ok) {
          throw new Error("No pudimos cargar los servicios.");
        }
        const [servicesData, professionalsData] = await Promise.all([
          servicesRes.json(),
          professionalsRes.json(),
        ]);
        setServices(Array.isArray(servicesData) ? servicesData : []);
        setProfessionals(Array.isArray(professionalsData) ? professionalsData : []);
      } catch (err: any) {
        console.error(err);
        setStatus("error");
        setErrorMessage(err.message || "Error al cargar datos.");
      }
    };
    loadInitialData();
  }, []);

  useEffect(() => {
    if (!date || !service) return;
    setErrorMessage("");
    setLoadAvail(true);
    const professionalId = professional ? professional.id : "";
    const url = `/api/availability?date=${date}&serviceId=${service.id}${professionalId ? `&professionalId=${professionalId}` : ""
      }`;
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error("No hay disponibilidad.");
        return r.json();
      })
      .then((data) => setAvailability(Array.isArray(data) ? data : []))
      .catch((err: any) => {
        console.error(err);
        setAvailability([]);
        setErrorMessage(err.message || "Error al cargar disponibilidad.");
      })
      .finally(() => setLoadAvail(false));
  }, [date, service, professional]);

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName || !phone || !date || !slot || !service) {
      setErrorMessage("Por favor completa todos los campos.");
      return;
    }

    setErrorMessage("");
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
        professionalName: data.professionalName ?? professional?.name ?? null,
        date,
        time: slot,
        token: data.token,
      });
      setStatus("success");
    } catch (err: any) {
      setStatus("error");
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-brand-primary/10">
      <header className="p-8 sticky top-0 bg-white/80 backdrop-blur-xl border-b border-slate-100 z-50">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tighter uppercase italic">Glow Skins</h1>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Abierto</span>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-6 md:p-8 space-y-12 pb-24">
        {status === "success" && lastBooking ? (
          <SuccessStep lastBooking={lastBooking} />
        ) : (
          <div className="space-y-12">
            <section className="space-y-4">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900">Agenda tu cita</h2>
              <p className="text-slate-500 font-medium">Selecciona el tratamiento que deseas realizarte hoy.</p>
            </section>

            <section className="space-y-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs uppercase font-bold text-brand-primary tracking-[0.2em]">1. Elige un tratamiento</h3>
                {service && <button onClick={() => setService(null)} className="text-[10px] font-bold text-slate-400 uppercase hover:text-red-500">Cambiar</button>}
              </div>

              <AnimatePresence mode="wait">
                {!service ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-4"
                  >
                    {services.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setService(s)}
                        className="p-6 text-left border border-slate-200 rounded-2xl hover:border-brand-primary hover:bg-brand-primary/5 transition-all group relative overflow-hidden"
                      >
                        <div className="flex items-start justify-between mb-4 relative z-10">
                          <div className="w-10 h-10 rounded-xl bg-brand-dark/5 flex items-center justify-center group-hover:bg-brand-primary transition-colors">
                            <Sparkles className="w-5 h-5 group-hover:text-white transition-colors" />
                          </div>
                          <span className="text-lg font-bold tabular-nums">S/. {s.price}</span>
                        </div>
                        <div className="relative z-10">
                          <h4 className="font-bold text-slate-900 mb-1">{s.name}</h4>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Clock className="w-3 h-3 text-brand-primary" /> {s.durationMinutes} minutos
                          </span>
                        </div>
                      </button>
                    ))}
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-6 bg-brand-primary/5 border border-brand-primary/20 rounded-2xl flex items-center justify-between"
                  >
                    <div>
                      <h4 className="font-bold text-slate-900">{service.name}</h4>
                      <p className="text-[10px] font-bold text-brand-primary uppercase tracking-widest">{service.durationMinutes} min • S/. {service.price}</p>
                    </div>
                    <CheckCircle2 className="w-6 h-6 text-brand-primary" />
                  </motion.div>
                )}
              </AnimatePresence>
            </section>

            {service && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-12"
              >
                <div className="space-y-6">
                  <h3 className="text-xs uppercase font-bold text-brand-primary tracking-[0.2em]">2. Fecha y Horario</h3>
                  <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
                    <div className="relative bg-slate-50 p-6 rounded-2xl border border-slate-200">
                      <label className="text-[10px] font-bold text-slate-400 uppercase mb-3 block">Calendario</label>
                      <input
                        type="date"
                        value={date}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-brand-primary/20 outline-none"
                      />
                    </div>
                    {availability.length > 0 && (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {availability.map((a) => (
                          <button
                            key={a.time}
                            onClick={() => setSlot(a.time)}
                            className={`py-3 rounded-xl text-xs font-bold transition-all border ${slot === a.time
                                ? 'bg-brand-dark text-white border-brand-dark'
                                : 'bg-white text-slate-600 border-slate-200 hover:border-brand-primary'
                              }`}
                          >
                            {a.time}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-xs uppercase font-bold text-brand-primary tracking-[0.2em]">3. Tus datos</h3>
                  <div className="space-y-4">
                    <input
                      placeholder="Nombre Completo"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 text-sm focus:ring-2 focus:ring-brand-primary/20 outline-none"
                    />
                    <div className="relative">
                      <span className="absolute left-5 top-1/2 -translate-y-1/2 text-sm font-bold opacity-30">+51</span>
                      <input
                        placeholder="WhatsApp"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 9))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-14 pr-5 py-4 text-sm focus:ring-2 focus:ring-brand-primary/20 outline-none"
                      />
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {errorMessage && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-[10px] font-bold text-red-500 uppercase tracking-widest text-center"
                    >
                      {errorMessage}
                    </motion.p>
                  )}
                </AnimatePresence>

                <button
                  onClick={handleBook}
                  disabled={loading || !slot || !clientName || phone.length < 9}
                  className="w-full bg-brand-dark text-white py-5 rounded-2xl font-bold uppercase tracking-widest text-sm hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-30 flex items-center justify-center gap-3"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirmar ahora'}
                </button>
              </motion.section>
            )}
          </div>
        )}
      </main>

      <footer className="p-12 border-t border-slate-100 text-center">
        <p className="text-[10px] font-bold uppercase text-slate-300 tracking-[0.5em]">Glow Skins by Nilda Reyes</p>
        <Link to="/admin" className="text-[8px] font-bold uppercase text-slate-200 mt-8 block hover:text-slate-400 underline">Panel Privado</Link>
      </footer>
    </div>
  );
}

function SuccessStep({ lastBooking }: { lastBooking: any }) {
  const businessPhone = "51906959989";
  const sendWhatsApp = () => {
    const msg =
      `✨ *GLOW SKINS BY NILDA REYES* ✨%0A` +
      `━━━━━━━━━━━━━━━━━━━━━━%0A` +
      `🗓️ *Tu cita esta confirmada*%0A%0A` +
      `👤 *Cliente:* ${lastBooking.clientName}%0A` +
      `⭐ *Servicio:* ${lastBooking.serviceName}%0A` +
      (lastBooking.professionalName ? `👩‍🦰 *Especialista:* ${lastBooking.professionalName}%0A` : "") +
      `📅 *Fecha:* ${lastBooking.date}%0A` +
      `⏰ *Hora:* ${lastBooking.time}%0A%0A` +
      `✅ *Estado:* Confirmado%0A%0A` +
      `Te esperamos en Glow Skins.`;
    window.open(`https://wa.me/${businessPhone}?text=${msg}`, "_blank");
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div className="text-center space-y-3">
        <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-100">
          <CheckCircle2 className="w-8 h-8 text-emerald-500" />
        </div>
        <h2 className="text-2xl">¡Tu cita esta agendada!</h2>
        <p className="text-sm font-light text-brand-dark/50 italic">Tu momento de autocuidado esta reservado.</p>
      </div>

      <div className="bg-brand-beige rounded-[30px] p-6 space-y-4 border border-white">
        <div className="flex justify-between text-xs">
          <span className="opacity-40 uppercase font-bold tracking-tighter">Servicio</span>
          <span className="font-bold">{lastBooking.serviceName}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="opacity-40 uppercase font-bold tracking-tighter">Fecha y Hora</span>
          <span className="font-bold">{lastBooking.date} • {lastBooking.time}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={sendWhatsApp}
        className="premium-button w-full bg-[#25D366] text-white py-5 rounded-3xl font-bold text-sm shadow-xl shadow-emerald-500/10 active:scale-95 transition-all"
      >
        Guardar en WhatsApp
      </button>

      <button
        type="button"
        onClick={() => window.location.reload()}
        className="w-full text-[10px] uppercase font-bold tracking-[0.2em] opacity-40 hover:opacity-100 transition-opacity"
      >
        Hacer otra reserva
      </button>
    </div>
  );
}
