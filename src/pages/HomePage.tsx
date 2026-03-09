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

  const bookingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [servicesRes, professionalsRes] = await Promise.all([
          fetch("/api/services"),
          fetch("/api/professionals"),
        ]);
        if (!servicesRes.ok || !professionalsRes.ok) {
          throw new Error("No pudimos cargar los servicios. Revisa tu conexion.");
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
        setStatus("error");
        setErrorMessage(err.message || "Error al cargar disponibilidad.");
      })
      .finally(() => setLoadAvail(false));
  }, [date, service, professional]);

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName || !phone || !date || !slot || !service) {
      setStatus("error");
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

  const scrollToBooking = () => {
    bookingRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-brand-beige selection:bg-brand-primary/20">
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src="/assets/hero.png"
            alt="Glow Skins"
            className="w-full h-full object-cover scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-brand-dark/40 via-brand-dark/10 to-brand-beige" />
        </div>

        <div className="relative z-10 text-center px-6 max-w-4xl mx-auto space-y-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          >
            <span className="text-[10px] uppercase tracking-[0.5em] text-white/80 font-bold mb-6 block">
              Glow Skins by Nilda Reyes
            </span>
            <h1 className="text-5xl md:text-7xl lg:text-8xl text-white mb-8 text-glow">
              Revela la mejor <br />
              <span className="italic font-normal">version de tu piel</span>
            </h1>
            <p className="text-lg md:text-xl text-white/90 font-light max-w-2xl mx-auto mb-10 leading-relaxed">
              Tratamientos de alta gama diseñados para resaltar tu brillo natural.
              Vivi la experiencia Glow Skins en Lima.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={scrollToBooking}
                className="premium-button group bg-brand-primary text-white px-10 py-5 rounded-full font-bold flex items-center gap-3 transition-transform hover:scale-105 active:scale-95"
              >
                Reservar mi Experiencia
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </button>
              <div className="flex items-center gap-2 text-white/80 text-sm">
                <div className="flex -space-x-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="w-8 h-8 rounded-full border-2 border-brand-dark/20 bg-brand-nude overflow-hidden">
                      <div className="w-full h-full bg-brand-primary/20 flex items-center justify-center text-[10px] font-bold">GS</div>
                    </div>
                  ))}
                </div>
                <span className="ml-2">+500 clientas felices</span>
              </div>
            </div>
          </motion.div>
        </div>

        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 2.5 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 cursor-pointer text-brand-dark/40"
          onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}
        >
          <ChevronDown className="w-6 h-6" />
        </motion.div>
      </section>

      {/* Problem Section */}
      <section className="py-24 px-6 bg-white overflow-hidden">
        <div className="max-w-screen-xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <span className="text-[10px] uppercase font-bold text-brand-primary tracking-widest">El Problema</span>
            <h2 className="text-4xl md:text-5xl">¿Tu piel ha perdido su <span className="italic">vitalidad natural</span>?</h2>
            <div className="space-y-6 text-brand-dark/70 text-lg font-light leading-relaxed">
              <p>
                El estres diario, el sol de Lima y el paso del tiempo pueden dejar rastro en tu rostro,
                apagando tu luz y afectando tu confianza.
              </p>
              <p>
                No mereces conformarte con soluciones genericas que no brindan resultados reales.
                Tu piel necesita un cuidado tan unico como tu.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-8 pt-6">
              <div className="space-y-2">
                <span className="text-brand-primary font-serif italic text-3xl italic block">85%</span>
                <p className="text-xs uppercase tracking-wider font-bold opacity-40">De nuestras clientas sintieron alivio inmediato</p>
              </div>
              <div className="space-y-2">
                <span className="text-brand-primary font-serif italic text-3xl italic block">100%</span>
                <p className="text-xs uppercase tracking-wider font-bold opacity-40">Personalizacion garantizada</p>
              </div>
            </div>
          </motion.div>
          <div className="relative">
            <div className="aspect-[4/5] rounded-3xl overflow-hidden bg-brand-nude shadow-2xl">
              <div className="w-full h-full glass-card flex items-center justify-center p-12">
                <Sparkles className="w-48 h-48 text-brand-primary/20" />
              </div>
            </div>
            <div className="absolute -bottom-8 -left-8 p-6 bg-white rounded-2xl shadow-xl space-y-2 max-w-[200px]">
              <div className="flex gap-1 text-brand-primary">
                {[1, 2, 3, 4, 5].map(i => <Star key={i} className="w-3 h-3 fill-current" />)}
              </div>
              <p className="text-xs font-medium tabular-nums">"Mis manchas desaparecieron despues de 3 sesiones."</p>
              <p className="text-[10px] uppercase font-bold text-brand-primary/60">Claudia V.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Solution/Services Section */}
      <section className="py-24 px-6 bg-brand-beige">
        <div className="max-w-screen-xl mx-auto space-y-20">
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <span className="text-[10px] uppercase font-bold text-brand-primary tracking-widest">Nuestros Servicios</span>
            <h2 className="text-4xl md:text-5xl">La combinacion perfecta entre <span className="italic">ciencia y arte</span></h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {services.slice(0, 3).map((s, idx) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="glass-card hover:translate-y-[-8px] transition-all p-8 rounded-3xl group"
              >
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-sm group-hover:bg-brand-primary group-hover:text-white transition-colors duration-500">
                  {idx === 0 ? <Sparkles className="w-5 h-5" /> : idx === 1 ? <ShieldCheck className="w-5 h-5" /> : <Star className="w-5 h-5" />}
                </div>
                <h3 className="text-2xl mb-4">{s.name}</h3>
                <p className="text-brand-dark/60 text-sm font-light leading-loose mb-8">
                  {idx === 0 ? "Elimina impurezas y restaura la respiracion de tus poros con nuestra tecnica exclusiva." :
                    idx === 1 ? "Renueva las capas de tu piel para una textura de seda y un tono uniforme." :
                      "No adivinamos, analizamos lo que tu piel realmente necesita para un resultado duradero."}
                </p>
                <div className="flex items-center justify-between pt-6 border-t border-brand-dark/5">
                  <span className="text-xs font-bold uppercase tracking-widest text-brand-primary opacity-80">{s.durationMinutes} MIN</span>
                  <span className="text-lg font-serif">S/. {s.price}</span>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="text-center">
            <button onClick={scrollToBooking} className="text-brand-dark/60 text-sm font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-3 mx-auto hover:text-brand-primary transition-colors">
              Ver todos los tratamientos <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="py-24 px-6 bg-brand-dark text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-primary/10 blur-[150px] rounded-full translate-x-1/2 -translate-y-1/2" />
        <div className="max-w-screen-xl mx-auto flex flex-col items-center gap-16">
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <span className="text-[10px] uppercase font-bold text-brand-primary tracking-widest">El Proceso</span>
            <h2 className="text-4xl md:text-5xl text-white">Tres pasos para tu <span className="italic text-brand-primary">nueva luz</span></h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 w-full">
            {[
              { step: "01", title: "Elige tu tratamiento", desc: "Selecciona el servicio que mejor se adapte a tus objetivos." },
              { step: "02", title: "Reserva tu horario", desc: "Panel intuitivo para elegir fecha y profesional en segundos." },
              { step: "03", title: "Disfruta el cambio", desc: "Ven a nuestro estudio y dejanos cuidar de tu piel." }
            ].map((item, idx) => (
              <div key={idx} className="space-y-6 group">
                <span className="text-5xl font-serif text-white/5 group-hover:text-brand-primary/20 transition-colors duration-700">{item.step}</span>
                <h4 className="text-xl font-bold">{item.title}</h4>
                <p className="text-white/40 text-sm leading-relaxed max-w-[250px]">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Booking Section */}
      <section id="agenda" ref={bookingRef} className="py-24 px-6 bg-brand-nude">
        <div className="max-w-md mx-auto space-y-8">
          <div className="text-center space-y-4">
            <h2 className="text-4xl">Agenda tu <span className="italic">momento</span></h2>
            <p className="text-sm font-light text-brand-dark/60">Selecciona el tratamiento y el horario que prefieras.</p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass-card shadow-2xl p-8 rounded-[40px] space-y-8 border-white/80"
          >
            {status === "success" && lastBooking ? (
              <SuccessStep lastBooking={lastBooking} />
            ) : (
              <form onSubmit={handleBook} className="space-y-10">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-brand-dark/40 ml-1">Servicio</label>
                    <select
                      value={service?.id ?? ""}
                      onChange={(e) => {
                        const id = Number(e.target.value);
                        setService(services.find((s) => s.id === id) ?? null);
                        setProfessional(null);
                      }}
                      className="w-full bg-transparent border-b border-brand-dark/10 py-4 px-1 focus:border-brand-primary outline-none text-sm transition-all"
                    >
                      <option value="">¿Que tratamiento deseas?</option>
                      {services.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} — (S/. {s.price})
                        </option>
                      ))}
                    </select>
                  </div>

                  {service && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest font-bold text-brand-dark/40 ml-1">Especialista</label>
                      <select
                        value={professional?.id ?? ""}
                        onChange={(e) => {
                          const id = Number(e.target.value);
                          setProfessional(id ? professionals.find((p) => p.id === id) ?? null : null);
                        }}
                        className="w-full bg-transparent border-b border-brand-dark/10 py-4 px-1 focus:border-brand-primary outline-none text-sm transition-all"
                      >
                        <option value="">Cualquier disponible</option>
                        {professionals.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </motion.div>
                  )}

                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest font-bold text-brand-dark/40 ml-1 flex items-center gap-2">
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
                        className="w-full bg-transparent border-b border-brand-dark/10 py-4 px-1 focus:border-brand-primary outline-none text-sm transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest font-bold text-brand-dark/40 ml-1 flex items-center gap-2">
                        <Clock className="w-3 h-3" /> Hora
                      </label>
                      <div className="relative">
                        <select
                          required
                          disabled={!date || !service || loadAvail}
                          value={slot}
                          onChange={(e) => setSlot(e.target.value)}
                          className="w-full bg-transparent border-b border-brand-dark/10 py-4 px-1 focus:border-brand-primary outline-none text-sm appearance-none disabled:opacity-30 transition-all"
                        >
                          <option value="">{loadAvail ? "Buscando..." : "Elegir"}</option>
                          {availability.map(a => (
                            <option key={a.time} value={a.time}>{a.time}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none opacity-30" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-8 pt-4">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest font-bold text-brand-dark/40 ml-1">Nombre Completo</label>
                      <input
                        type="text"
                        required
                        placeholder="Como te llamamos?"
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        className="w-full bg-transparent border-b border-brand-dark/10 py-4 px-1 focus:border-brand-primary outline-none text-sm placeholder:text-brand-dark/20"
                      />
                    </div>
                    <div className="flex gap-8">
                      <div className="flex-1 space-y-2">
                        <label className="text-[10px] uppercase tracking-widest font-bold text-brand-dark/40 ml-1">WhatsApp</label>
                        <div className="relative">
                          <span className="absolute left-1 top-1/2 -translate-y-1/2 text-xs font-bold opacity-30">+51</span>
                          <input
                            type="tel"
                            required
                            placeholder="999 888 777"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 9))}
                            className="w-full bg-transparent border-b border-brand-dark/10 py-4 pl-10 pr-1 focus:border-brand-primary outline-none text-sm placeholder:text-brand-dark/20"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !service || !date || !slot}
                  className="premium-button w-full bg-brand-dark text-white py-6 rounded-3xl font-bold tracking-[0.1em] text-sm flex items-center justify-center gap-3 active:scale-[0.98] transition-all"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    "Confirmar Reserva"
                  )}
                </button>
              </form>
            )}

            <AnimatePresence>
              {status === "error" && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="mt-6 p-5 bg-red-50 border border-red-100 rounded-[30px] flex items-center gap-4 text-red-900 text-xs"
                >
                  <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                  <p className="leading-relaxed">{errorMessage}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 px-6 bg-white border-t border-brand-nude">
        <div className="max-w-md mx-auto text-center space-y-12">
          <div className="space-y-4">
            <h3 className="text-3xl font-serif italic">Glow Skins</h3>
            <p className="text-[10px] uppercase tracking-[0.3em] font-bold opacity-30">Pureza • Brillo • Personalidad</p>
          </div>

          <div className="flex flex-col gap-6 text-[11px] font-bold uppercase tracking-[0.15em] opacity-40">
            <div className="flex items-center justify-center gap-3">
              <MapPin className="w-3 h-3 text-brand-primary" /> Miraflores, Lima
            </div>
            <p>Lunes a Sabado: 9AM - 8PM</p>
            <p>Copyright © 2024 Glow Skins</p>
          </div>

          <div className="pt-8 border-t border-brand-dark/5">
            <Link to="/admin" className="text-[9px] uppercase tracking-[0.4em] font-black hover:text-brand-primary transition-colors">Panel Admin</Link>
          </div>
        </div>
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
