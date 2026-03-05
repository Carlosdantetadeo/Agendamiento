import React, { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronLeft, Loader2, Plus, Trash2 } from "lucide-react";
import type { Service, Professional } from "../types";

const DAY_NAMES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

type ScheduleRow = { dayOfWeek: number; startTime: string; endTime: string };

export default function ProfessionalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const professionalId = id ? Number(id) : null;

  const [professional, setProfessional] = useState<Professional | null>(null);
  const [schedule, setSchedule] = useState<ScheduleRow[]>([]);
  const [assignedServices, setAssignedServices] = useState<Service[]>([]);
  const [allServices, setAllServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [savingServices, setSavingServices] = useState(false);

  useEffect(() => {
    if (!professionalId) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/professionals/${professionalId}`).then((r) => r.json()),
      fetch(`/api/professionals/${professionalId}/schedule`).then((r) => r.json()),
      fetch(`/api/professionals/${professionalId}/services`).then((r) => r.json()),
      fetch("/api/services").then((r) => r.json()),
    ])
      .then(([prof, sched, assigned, all]) => {
        setProfessional(prof);
        setSchedule(
          (sched as { day_of_week: number; start_time: string; end_time: string }[]).map((s) => ({
            dayOfWeek: s.day_of_week,
            startTime: s.start_time || "09:00",
            endTime: s.end_time || "18:00",
          }))
        );
        setAssignedServices(assigned);
        setAllServices(all);
      })
      .catch(() => setProfessional(null))
      .finally(() => setLoading(false));
  }, [professionalId]);

  const assignedIds = new Set(assignedServices.map((s) => s.id));

  const addScheduleRow = () => {
    setSchedule((prev) => [...prev, { dayOfWeek: 1, startTime: "09:00", endTime: "18:00" }]);
  };

  const removeScheduleRow = (index: number) => {
    setSchedule((prev) => prev.filter((_, i) => i !== index));
  };

  const updateScheduleRow = (index: number, field: keyof ScheduleRow, value: number | string) => {
    setSchedule((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  };

  const saveSchedule = async () => {
    if (!professionalId) return;
    setSavingSchedule(true);
    try {
      const payload = schedule.filter(
        (s) => s.startTime && s.endTime && s.dayOfWeek != null
      );
      const res = await fetch(`/api/professionals/${professionalId}/schedule`, {
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
      const svc = allServices.find((s) => s.id === serviceId);
      if (svc) setAssignedServices((prev) => [...prev, svc]);
    }
  };

  const saveServices = async () => {
    if (!professionalId) return;
    setSavingServices(true);
    try {
      const serviceIds = assignedServices.map((s) => s.id);
      const res = await fetch(`/api/professionals/${professionalId}/services`, {
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

  if (professionalId == null) {
    return (
      <div className="min-h-screen bg-[#FDFBF9] p-6">
        <p className="text-[#2C2C2C]/70">ID de profesional no válido.</p>
        <Link to="/admin" className="mt-4 inline-block text-[#C5A059] underline">Volver al panel</Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFBF9] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#2C2C2C]/40" />
      </div>
    );
  }

  if (!professional) {
    return (
      <div className="min-h-screen bg-[#FDFBF9] p-6">
        <p className="text-[#2C2C2C]/70">Profesional no encontrado.</p>
        <Link to="/admin" className="mt-4 inline-block text-[#C5A059] underline">Volver al panel</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF9] text-[#2C2C2C] font-sans">
      <header className="border-b border-[#F3EFEC] bg-white/80 backdrop-blur px-6 py-4">
        <Link
          to="/admin"
          className="inline-flex items-center gap-2 text-[#2C2C2C]/70 hover:text-[#2C2C2C]"
        >
          <ChevronLeft className="w-4 h-4" /> Volver a Profesionales
        </Link>
        <h1 className="mt-2 text-lg font-semibold">Horarios y servicios — {professional.name}</h1>
      </header>

      <main className="max-w-2xl mx-auto p-6 space-y-8">
        {/* Servicios */}
        <section className="bg-white border border-[#F3EFEC] rounded-xl p-4">
          <h2 className="text-sm font-semibold text-[#2C2C2C]/80 mb-3">Servicios que ofrece</h2>
          <p className="text-xs text-[#2C2C2C]/50 mb-3">Marca los servicios que este profesional puede realizar.</p>
          <ul className="space-y-2 max-h-48 overflow-y-auto">
            {allServices.map((s) => (
              <li key={s.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id={`svc-${s.id}`}
                  checked={assignedIds.has(s.id)}
                  onChange={() => toggleService(s.id)}
                  className="rounded border-[#2C2C2C]/30"
                />
                <label htmlFor={`svc-${s.id}`} className="text-sm cursor-pointer">
                  {s.name} — {s.durationMinutes} min
                </label>
              </li>
            ))}
          </ul>
          {allServices.length === 0 && (
            <p className="text-sm text-[#2C2C2C]/50">Primero crea servicios en la pestaña Servicios.</p>
          )}
          <button
            type="button"
            onClick={saveServices}
            disabled={savingServices}
            className="mt-3 px-4 py-2 bg-[#2C2C2C] text-white rounded-lg text-sm disabled:opacity-70 flex items-center gap-2"
          >
            {savingServices ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Guardar servicios
          </button>
        </section>

        {/* Horario */}
        <section className="bg-white border border-[#F3EFEC] rounded-xl p-4">
          <h2 className="text-sm font-semibold text-[#2C2C2C]/80 mb-3">Horario de trabajo</h2>
          <p className="text-xs text-[#2C2C2C]/50 mb-3">Día 0 = Domingo, 1 = Lunes, … 6 = Sábado. Sin horario no habrá turnos disponibles.</p>
          <div className="space-y-2">
            {schedule.map((row, index) => (
              <div key={index} className="flex flex-wrap items-center gap-2">
                <select
                  value={row.dayOfWeek}
                  onChange={(e) => updateScheduleRow(index, "dayOfWeek", Number(e.target.value))}
                  className="border border-[#2C2C2C]/20 rounded-lg px-2 py-1.5 text-sm w-24"
                >
                  {DAY_NAMES.map((name, d) => (
                    <option key={d} value={d}>{name}</option>
                  ))}
                </select>
                <input
                  type="time"
                  value={row.startTime}
                  onChange={(e) => updateScheduleRow(index, "startTime", e.target.value)}
                  className="border border-[#2C2C2C]/20 rounded-lg px-2 py-1.5 text-sm"
                />
                <span className="text-[#2C2C2C]/50">a</span>
                <input
                  type="time"
                  value={row.endTime}
                  onChange={(e) => updateScheduleRow(index, "endTime", e.target.value)}
                  className="border border-[#2C2C2C]/20 rounded-lg px-2 py-1.5 text-sm"
                />
                <button
                  type="button"
                  onClick={() => removeScheduleRow(index)}
                  className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                  title="Quitar fila"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-3">
            <button
              type="button"
              onClick={addScheduleRow}
              className="flex items-center gap-1 px-3 py-2 border border-[#2C2C2C]/20 rounded-lg text-sm hover:bg-[#F3EFEC]/50"
            >
              <Plus className="w-4 h-4" /> Añadir horario
            </button>
            <button
              type="button"
              onClick={saveSchedule}
              disabled={savingSchedule}
              className="px-4 py-2 bg-[#2C2C2C] text-white rounded-lg text-sm disabled:opacity-70 flex items-center gap-2"
            >
              {savingSchedule ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Guardar horario
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
