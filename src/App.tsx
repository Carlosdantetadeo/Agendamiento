import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Clock, Sparkles, CheckCircle2, AlertCircle, Loader2, ChevronRight } from 'lucide-react';

const COLORS = {
  bone: '#FDFBF9',
  graphite: '#2C2C2C',
  beige: '#F3EFEC',
  gold: '#C5A059',
};

const TREATMENTS = [
  { name: 'Limpieza Facial Profunda', duration: '60 min', price: 'S/. 50' },
  { name: 'Peeling Químico', duration: '45 min', price: 'S/. 75' },
  { name: 'HydraFacial Luxury', duration: '90 min', price: 'S/. 120' },
  { name: 'Radiofrecuencia Facial', duration: '60 min', price: 'S/. 85' },
  { name: 'Tratamiento Antimanchas', duration: '60 min', price: 'S/. 95' },
  { name: 'Masaje Facial Kobido', duration: '50 min', price: 'S/. 65' },
];

const TIME_SLOTS = [
  '09:00', '10:00', '11:00', '12:00', '13:00', '14:00',
  '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'
];

export default function App() {
  const [clientName, setClientName] = useState('');
  const [treatment, setTreatment] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [phone, setPhone] = useState('');
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [lastBooking, setLastBooking] = useState<any>(null);

  // Función para obtener citas existentes y bloquear horarios
  const fetchBookedSlots = async (selectedDate: string) => {
    if (!selectedDate) return;
    try {
      const response = await fetch(`/api/appointments?date=${selectedDate}`);
      if (response.ok) {
        const appointments = await response.json();
        // Extraemos solo la parte de la hora (HH:mm) de las citas de esa fecha
        const booked = appointments.map((app: any) => {
          const dateObj = new Date(app.dateTime);
          return dateObj.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false });
        });
        setBookedSlots(booked);
      }
    } catch (err) {
      console.error("Error cargando horarios reservados:", err);
    }
  };

  // Cada vez que cambie la fecha, buscamos qué horas están ocupadas
  React.useEffect(() => {
    fetchBookedSlots(date);
    setTime(''); // Limpiamos la hora seleccionada al cambiar de día
  }, [date]);

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName || !phone || !treatment || !date || !time) return;

    setLoading(true);
    setStatus('idle');

    try {
      const dateTime = new Date(`${date}T${time}`).toISOString();
      const response = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientName, phone, treatment, dateTime }),
      });

      const data = await response.json();

      if (response.ok) {
        setLastBooking({ clientName, phone, treatment, date, time });
        setStatus('success');
        setClientName('');
        setPhone('');
        setTreatment('');
        setDate('');
        setTime('');
        fetchBookedSlots(date);
      } else {
        throw new Error(data.error || 'Error al reservar');
      }
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openWhatsApp = () => {
    // Número fijo del centro de estética (Lima, Perú)
    const businessPhone = '51906959989';

    // Formateamos el mensaje como una "Tarjeta Digital"
    const message = `✨ *LUMIÈRE SKIN STUDIO* ✨%0A` +
      `----------------------------%0A` +
      `🗓️ *NUEVA CITA AGENDADA*%0A%0A` +
      `👤 *Clienta:* ${clientName}%0A` +
      `⭐ *Servicio:* ${treatment}%0A` +
      `📅 *Fecha:* ${date}%0A` +
      `⏰ *Hora:* ${time}%0A` +
      `📞 *Cel:* +51 ${phone}%0A%0A` +
      `✅ *Estado:* Confirmado%0A` +
      `----------------------------%0A` +
      `¡Te esperamos en Lumière! ✨`;

    const whatsappUrl = `https://api.whatsapp.com/send?phone=${businessPhone}&text=${message}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="min-h-screen bg-[#FDFBF9] text-[#2C2C2C] font-sans selection:bg-[#F3EFEC]">
      {/* Header Section */}
      <header className="pt-16 pb-8 px-6 text-center max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-3xl md:text-4xl font-serif tracking-tight mb-2 italic">
            Glow Skins
          </h1>
          <p className="text-[10px] uppercase tracking-[0.3em] text-[#2C2C2C]/60 font-medium">
            By Nilda Reyes
          </p>
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
          <form onSubmit={handleBook} className="space-y-6">
            {/* Input: Name */}
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest font-semibold text-[#2C2C2C]/50 ml-1">
                Nombre de la Clienta
              </label>
              <input
                type="text"
                required
                placeholder="Ej. Isabella García"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full bg-[#F3EFEC]/30 border-b border-[#2C2C2C]/10 py-3 px-1 focus:border-[#2C2C2C] transition-colors outline-none placeholder:text-[#2C2C2C]/20"
              />
            </div>

            {/* Input: Phone */}
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest font-semibold text-[#2C2C2C]/50 ml-1">
                Teléfono / WhatsApp (Perú)
              </label>
              <div className="relative">
                <span className="absolute left-1 top-1/2 -translate-y-1/2 text-sm text-[#2C2C2C]/40 font-medium">
                  +51
                </span>
                <input
                  type="tel"
                  required
                  placeholder="987 654 321"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 9))}
                  className="w-full bg-[#F3EFEC]/30 border-b border-[#2C2C2C]/10 py-3 pl-10 pr-1 focus:border-[#2C2C2C] transition-colors outline-none placeholder:text-[#2C2C2C]/20"
                />
              </div>
            </div>

            {/* Input: Treatment */}
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest font-semibold text-[#2C2C2C]/50 ml-1">
                Tratamiento
              </label>
              <select
                required
                value={treatment}
                onChange={(e) => setTreatment(e.target.value)}
                className="w-full bg-[#F3EFEC]/30 border-b border-[#2C2C2C]/10 py-3 px-1 focus:border-[#2C2C2C] transition-colors outline-none appearance-none cursor-pointer"
              >
                <option value="" disabled>Selecciona un servicio</option>
                {TREATMENTS.map((t) => (
                  <option key={t.name} value={t.name}>
                    {t.name} — {t.duration} ({t.price})
                  </option>
                ))}
              </select>
            </div>

            {/* Date Selection */}
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest font-semibold text-[#2C2C2C]/50 ml-1">
                Fecha de la Cita
              </label>
              <div className="relative">
                <Calendar className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-[#2C2C2C]/30 pointer-events-none" />
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-transparent border-b border-[#2C2C2C]/10 py-3 pl-6 pr-1 focus:border-[#2C2C2C] transition-colors outline-none cursor-pointer"
                />
              </div>
            </div>

            {/* Time Slot Selection */}
            <div className="space-y-4">
              <label className="text-[10px] uppercase tracking-widest font-semibold text-[#2C2C2C]/50 ml-1 flex items-center gap-2">
                <Clock className="w-3 h-3" />
                Selecciona la Hora (9:00 AM - 8:00 PM)
              </label>
              <div className="grid grid-cols-4 gap-2">
                {TIME_SLOTS.map((slot) => {
                  const isBooked = bookedSlots.includes(slot);
                  return (
                    <button
                      key={slot}
                      type="button"
                      disabled={isBooked}
                      onClick={() => setTime(slot)}
                      className={`py-2 rounded-lg text-xs font-medium transition-all duration-200 border ${time === slot
                        ? 'bg-[#2C2C2C] text-white border-[#2C2C2C] shadow-md scale-[1.02]'
                        : isBooked
                          ? 'bg-gray-100 text-gray-300 border-gray-100 cursor-not-allowed line-through'
                          : 'bg-white text-[#2C2C2C]/60 border-[#F3EFEC] hover:border-[#2C2C2C]/20'
                        }`}
                    >
                      {slot}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full group relative overflow-hidden bg-[#2C2C2C] text-[#FDFBF9] py-5 rounded-2xl font-medium tracking-wide transition-all active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100"
            >
              <div className="relative z-10 flex items-center justify-center gap-2">
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Confirmar Cita
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </div>
              <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            </button>
          </form>

          {/* Status Messages */}
          <AnimatePresence>
            {status === 'success' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-8 p-6 bg-emerald-50 border border-emerald-100 rounded-2xl space-y-4"
              >
                <div className="flex items-center gap-3 text-emerald-800 text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  <p>¡Cita agendada! Ahora envía la confirmación:</p>
                </div>
                <button
                  onClick={() => {
                    const businessPhone = '51906959989';
                    const data = lastBooking || { clientName: '---', treatment: '---', date: '---', time: '---', phone: '---' };
                    const msg = `✨ *GLOW SKINS BY NILDA REYES* ✨%0A` +
                      `----------------------------%0A` +
                      `🗓️ *NUEVA CITA AGENDADA*%0A%0A` +
                      `👤 *Clienta:* ${data.clientName}%0A` +
                      `⭐ *Servicio:* ${data.treatment}%0A` +
                      `📅 *Fecha:* ${data.date}%0A` +
                      `⏰ *Hora:* ${data.time}%0A` +
                      `📞 *Cel:* +51 ${data.phone}%0A%0A` +
                      `✅ *Estado:* Confirmado%0A` +
                      `----------------------------%0A` +
                      `¡Te esperamos en Glow Skins! ✨`;
                    window.location.href = `https://wa.me/${businessPhone}?text=${msg}`;
                  }}
                  className="w-full py-4 bg-[#25D366] text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-[#128C7E] transition-all shadow-lg active:scale-95 flex items-center justify-center gap-3"
                >
                  <Sparkles className="w-4 h-4" />
                  Enviar a WhatsApp del Centro
                </button>
              </motion.div>
            )}
            {status === 'error' && (
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

        {/* Footer Info */}
        <div className="mt-12 text-center space-y-4">
          <div className="flex justify-center gap-8 text-[10px] uppercase tracking-[0.2em] text-[#2C2C2C]/40">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3 h-3" />
              Alta Gama
            </span>
            <span>•</span>
            <span>Cuidado Experto</span>
          </div>
          <p className="text-[11px] text-[#2C2C2C]/30">
            Lima, Perú — Cuidado de la piel profesional
          </p>
        </div>
      </main>
    </div>
  );
}
