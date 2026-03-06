/**
 * Data access: uses Supabase if SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set,
 * otherwise falls back to SQLite (local / Vercel without Supabase).
 *
 * FIXED: Supabase client is now lazy-initialized via getSupabase() to avoid
 * stale connections in Vercel serverless cold starts.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import Database from "better-sqlite3";
import path from "path";

const supabaseUrl = process.env.SUPABASE_URL?.trim();
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
export const useSupabase = Boolean(supabaseUrl && supabaseServiceKey);

// ✅ FIX: lazy singleton — se crea UNA vez por instancia serverless, no al importar el módulo
let _supabaseInstance: SupabaseClient | null = null;

function getSupabase(): SupabaseClient | null {
  if (!useSupabase) return null;
  if (!_supabaseInstance) {
    _supabaseInstance = createClient(supabaseUrl!, supabaseServiceKey!);
  }
  return _supabaseInstance;
}

// SQLite fallback (solo cuando no se usa Supabase)
const dbPath =
  process.env.NODE_ENV === "production"
    ? "/tmp/appointments.db"
    : path.join(process.cwd(), "appointments.db");
export const db: Database.Database = useSupabase
  ? (null as any)
  : new Database(dbPath);

// ----- Services -----

export async function getServices(): Promise<any[]> {
  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .order("category")
      .order("name");
    if (error) throw error;
    return data ?? [];
  }
  return db.prepare("SELECT * FROM services ORDER BY category, name").all() as any[];
}

export async function getServiceById(id: number): Promise<any | null> {
  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .eq("id", id)
      .single();
    if (error && error.code !== "PGRST116") throw error;
    return data;
  }
  return (db.prepare("SELECT * FROM services WHERE id = ?").get(id) as any) ?? null;
}

export async function insertService(row: {
  name: string;
  durationMinutes?: number;
  price?: number;
  category?: string;
}): Promise<any> {
  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from("services")
      .insert({
        name: row.name,
        durationMinutes: row.durationMinutes ?? 60,
        price: row.price ?? 0,
        category: row.category ?? "general",
      })
      .select("*")
      .single();
    if (error) throw error;
    return data;
  }
  const r = db
    .prepare(
      "INSERT INTO services (name, durationMinutes, price, category) VALUES (?,?,?,?)"
    )
    .run(row.name, row.durationMinutes ?? 60, row.price ?? 0, row.category ?? "general");
  return db.prepare("SELECT * FROM services WHERE id = ?").get(Number(r.lastInsertRowid)) as any;
}

export async function updateService(
  id: number,
  row: Partial<{ name: string; durationMinutes: number; price: number; category: string }>
): Promise<any> {
  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from("services")
      .update(row)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  }
  const prev = db.prepare("SELECT * FROM services WHERE id = ?").get(id) as any;
  if (!prev) return null;
  const updates = { ...prev, ...row };
  db.prepare(
    "UPDATE services SET name=?, durationMinutes=?, price=?, category=? WHERE id=?"
  ).run(updates.name, updates.durationMinutes, updates.price, updates.category, id);
  return db.prepare("SELECT * FROM services WHERE id = ?").get(id) as any;
}

export async function deleteService(id: number): Promise<void> {
  const supabase = getSupabase();
  if (supabase) {
    const { error } = await supabase.from("services").delete().eq("id", id);
    if (error) throw error;
    return;
  }
  db.prepare("DELETE FROM services WHERE id = ?").run(id);
}

// ----- Professionals -----

export async function getProfessionals(): Promise<any[]> {
  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from("professionals")
      .select("*")
      .order("name");
    if (error) throw error;
    return data ?? [];
  }
  return db.prepare("SELECT * FROM professionals ORDER BY name").all() as any[];
}

export async function getProfessionalById(id: number): Promise<any | null> {
  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from("professionals")
      .select("*")
      .eq("id", id)
      .single();
    if (error && error.code !== "PGRST116") throw error;
    return data;
  }
  return (db.prepare("SELECT * FROM professionals WHERE id = ?").get(id) as any) ?? null;
}

export async function insertProfessional(name: string): Promise<any> {
  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from("professionals")
      .insert({ name })
      .select("*")
      .single();
    if (error) throw error;
    return data;
  }
  const r = db.prepare("INSERT INTO professionals (name) VALUES (?)").run(name);
  return db.prepare("SELECT * FROM professionals WHERE id = ?").get(Number(r.lastInsertRowid)) as any;
}

export async function updateProfessional(id: number, name: string): Promise<any> {
  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from("professionals")
      .update({ name })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  }
  db.prepare("UPDATE professionals SET name = ? WHERE id = ?").run(name, id);
  return db.prepare("SELECT * FROM professionals WHERE id = ?").get(id) as any;
}

export async function deleteProfessional(id: number): Promise<void> {
  const supabase = getSupabase();
  if (supabase) {
    const { error } = await supabase.from("professionals").delete().eq("id", id);
    if (error) throw error;
    return;
  }
  db.prepare("DELETE FROM professionals WHERE id = ?").run(id);
}

export async function getProfessionalServices(professionalId: number): Promise<any[]> {
  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from("professional_services")
      .select("service_id")
      .eq("professional_id", professionalId);
    if (error) throw error;
    if (!data?.length) return [];
    const { data: services } = await supabase
      .from("services")
      .select("*")
      .in("id", data.map((d) => d.service_id));
    return services ?? [];
  }
  return db
    .prepare(
      "SELECT s.* FROM services s INNER JOIN professional_services ps ON ps.service_id = s.id WHERE ps.professional_id = ?"
    )
    .all(professionalId) as any[];
}

export async function setProfessionalServices(
  professionalId: number,
  serviceIds: number[]
): Promise<void> {
  const supabase = getSupabase();
  if (supabase) {
    await supabase
      .from("professional_services")
      .delete()
      .eq("professional_id", professionalId);
    if (serviceIds.length) {
      const { error } = await supabase.from("professional_services").insert(
        serviceIds.map((service_id) => ({ professional_id: professionalId, service_id }))
      );
      if (error) throw error;
    }
    return;
  }
  db.prepare("DELETE FROM professional_services WHERE professional_id = ?").run(professionalId);
  const stmt = db.prepare(
    "INSERT INTO professional_services (professional_id, service_id) VALUES (?, ?)"
  );
  for (const sid of serviceIds) stmt.run(professionalId, sid);
}

export async function getProfessionalSchedule(professionalId: number): Promise<any[]> {
  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from("professional_schedule")
      .select("*")
      .eq("professional_id", professionalId)
      .order("day_of_week")
      .order("start_time");
    if (error) throw error;
    return data ?? [];
  }
  return db
    .prepare(
      "SELECT * FROM professional_schedule WHERE professional_id = ? ORDER BY day_of_week, start_time"
    )
    .all(professionalId) as any[];
}

export async function setProfessionalSchedule(
  professionalId: number,
  schedule: { dayOfWeek: number; startTime: string; endTime: string }[]
): Promise<void> {
  const supabase = getSupabase();
  if (supabase) {
    await supabase
      .from("professional_schedule")
      .delete()
      .eq("professional_id", professionalId);
    if (schedule.length) {
      const rows = schedule
        .filter((s) => s.dayOfWeek != null && s.startTime != null && s.endTime != null)
        .map((s) => ({
          professional_id: professionalId,
          day_of_week: s.dayOfWeek,
          start_time: s.startTime,
          end_time: s.endTime,
        }));
      if (rows.length) {
        const { error } = await supabase.from("professional_schedule").insert(rows);
        if (error) throw error;
      }
    }
    return;
  }
  db.prepare("DELETE FROM professional_schedule WHERE professional_id = ?").run(professionalId);
  const stmt = db.prepare(
    "INSERT INTO professional_schedule (professional_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?)"
  );
  for (const s of schedule) {
    if (s.dayOfWeek != null && s.startTime != null && s.endTime != null)
      stmt.run(professionalId, s.dayOfWeek, s.startTime, s.endTime);
  }
}

// ----- Blocked slots -----

export async function getBlockedSlots(filters: {
  date?: string;
  professionalId?: number;
}): Promise<any[]> {
  const supabase = getSupabase();
  if (supabase) {
    let q = supabase
      .from("blocked_slots")
      .select("*")
      .order("date")
      .order("start_time");
    if (filters.date) q = q.eq("date", filters.date);
    if (filters.professionalId != null)
      q = q.or(`professional_id.is.null,professional_id.eq.${filters.professionalId}`);
    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  }
  let query = "SELECT * FROM blocked_slots WHERE 1=1";
  const params: (string | number)[] = [];
  if (filters.date) {
    query += " AND date = ?";
    params.push(filters.date);
  }
  if (filters.professionalId != null) {
    query += " AND (professional_id IS NULL OR professional_id = ?)";
    params.push(filters.professionalId);
  }
  query += " ORDER BY date, start_time";
  return db.prepare(query).all(...params) as any[];
}

export async function insertBlockedSlot(row: {
  date: string;
  start_time: string;
  end_time: string;
  professional_id?: number | null;
  reason?: string | null;
}): Promise<any> {
  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from("blocked_slots")
      .insert({
        date: row.date,
        start_time: row.start_time,
        end_time: row.end_time,
        professional_id: row.professional_id ?? null,
        reason: row.reason ?? null,
      })
      .select("*")
      .single();
    if (error) throw error;
    return data;
  }
  const r = db
    .prepare(
      "INSERT INTO blocked_slots (date, start_time, end_time, professional_id, reason) VALUES (?, ?, ?, ?, ?)"
    )
    .run(
      row.date,
      row.start_time,
      row.end_time,
      row.professional_id ?? null,
      row.reason ?? null
    );
  return db.prepare("SELECT * FROM blocked_slots WHERE id = ?").get(Number(r.lastInsertRowid)) as any;
}

export async function deleteBlockedSlot(id: number): Promise<void> {
  const supabase = getSupabase();
  if (supabase) {
    const { error } = await supabase.from("blocked_slots").delete().eq("id", id);
    if (error) throw error;
    return;
  }
  db.prepare("DELETE FROM blocked_slots WHERE id = ?").run(id);
}

// ----- Appointments -----

export async function getAppointments(filters: {
  date?: string;
  professionalId?: number;
  limit?: number;
}): Promise<any[]> {
  const supabase = getSupabase();
  if (supabase) {
    let q = supabase
      .from("appointments")
      .select("*, services(name), professionals(name)")
      .order("dateTime", { ascending: false });
    if (filters.date) q = q.like("dateTime", `${filters.date}%`);
    if (filters.professionalId != null) q = q.eq("professional_id", filters.professionalId);
    if (filters.limit) q = q.limit(filters.limit);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).map((a: any) => ({
      ...a,
      serviceName: a.services?.name,
      professionalName: a.professionals?.name,
      services: undefined,
      professionals: undefined,
    }));
  }
  let query = `
    SELECT a.*, s.name as serviceName, p.name as professionalName
    FROM appointments a
    LEFT JOIN services s ON a.service_id = s.id
    LEFT JOIN professionals p ON a.professional_id = p.id
    WHERE 1=1
  `;
  const params: (string | number)[] = [];
  if (filters.date) {
    query += " AND substr(a.dateTime, 1, 10) = ?";
    params.push(filters.date);
  }
  if (filters.professionalId != null) {
    query += " AND a.professional_id = ?";
    params.push(filters.professionalId);
  }
  query += " ORDER BY a.dateTime DESC";
  if (filters.limit) query += " LIMIT " + filters.limit;
  return db.prepare(query).all(...params) as any[];
}

export async function getAppointmentByToken(token: string): Promise<any | null> {
  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from("appointments")
      .select("*, services(name), professionals(name)")
      .eq("token", token)
      .eq("status", "pending")
      .single();
    if (error && error.code !== "PGRST116") throw error;
    if (!data) return null;
    return {
      ...data,
      serviceName: data.services?.name,
      professionalName: data.professionals?.name,
      services: undefined,
      professionals: undefined,
    };
  }
  const row = db
    .prepare(
      `SELECT a.*, s.name as serviceName, p.name as professionalName
       FROM appointments a
       LEFT JOIN services s ON a.service_id = s.id
       LEFT JOIN professionals p ON a.professional_id = p.id
       WHERE a.token = ? AND a.status = 'pending'`
    )
    .get(token) as any;
  return row ?? null;
}

export async function insertAppointment(row: {
  clientName: string;
  phone: string;
  email?: string | null;
  treatment: string;
  dateTime: string;
  durationMinutes: number;
  googleEventId?: string | null;
  token: string;
  source: string;
  service_id?: number | null;
  professional_id?: number | null;
}): Promise<any> {
  const supabase = getSupabase();
  const payload = {
    clientName: row.clientName,
    phone: row.phone,
    email: row.email ?? null,
    treatment: row.treatment,
    dateTime: row.dateTime,
    durationMinutes: row.durationMinutes,
    googleEventId: row.googleEventId ?? null,
    token: row.token,
    source: row.source,
    service_id: row.service_id ?? null,
    professional_id: row.professional_id ?? null,
  };
  if (supabase) {
    const { data, error } = await supabase
      .from("appointments")
      .insert(payload)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  }
  db.prepare(
    `INSERT INTO appointments
      (clientName, phone, email, treatment, dateTime, durationMinutes,
       googleEventId, token, source, service_id, professional_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    payload.clientName,
    payload.phone,
    payload.email,
    payload.treatment,
    payload.dateTime,
    payload.durationMinutes,
    payload.googleEventId,
    payload.token,
    payload.source,
    payload.service_id,
    payload.professional_id
  );
  return db.prepare("SELECT * FROM appointments WHERE token = ?").get(payload.token) as any;
}

export async function getAppointmentById(id: number): Promise<any | null> {
  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from("appointments")
      .select("*")
      .eq("id", id)
      .single();
    if (error && error.code !== "PGRST116") throw error;
    return data;
  }
  return (db.prepare("SELECT * FROM appointments WHERE id = ?").get(id) as any) ?? null;
}

export async function updateAppointmentStatus(id: number, status: string): Promise<void> {
  const supabase = getSupabase();
  if (supabase) {
    const { error } = await supabase
      .from("appointments")
      .update({ status })
      .eq("id", id);
    if (error) throw error;
    return;
  }
  db.prepare("UPDATE appointments SET status = ? WHERE id = ?").run(status, id);
}

export async function updateAppointmentDateTime(id: number, dateTime: string): Promise<any> {
  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from("appointments")
      .update({ dateTime })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  }
  db.prepare("UPDATE appointments SET dateTime = ? WHERE id = ?").run(dateTime, id);
  return db.prepare("SELECT * FROM appointments WHERE id = ?").get(id) as any;
}

export async function getBookedSlotsForDate(
  dateStr: string
): Promise<{ dateTime: string; durationMinutes: number; professional_id: number | null }[]> {
  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from("appointments")
      .select("dateTime, durationMinutes, professional_id")
      .like("dateTime", `${dateStr}%`)
      .eq("status", "pending");
    if (error) throw error;
    return data ?? [];
  }
  return db
    .prepare(
      "SELECT dateTime, durationMinutes, professional_id FROM appointments WHERE dateTime LIKE ? AND status = 'pending'"
    )
    .all(`${dateStr}%`) as any[];
}

export async function getProfessionalIdsForService(serviceId: number): Promise<number[]> {
  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from("professional_services")
      .select("professional_id")
      .eq("service_id", serviceId);
    if (error) throw error;
    return (data ?? []).map((r) => r.professional_id);
  }
  return (
    db
      .prepare("SELECT professional_id FROM professional_services WHERE service_id = ?")
      .all(serviceId) as any[]
  ).map((r) => r.professional_id);
}

export async function getScheduleForProfessionalAndDay(
  professionalId: number,
  dayOfWeek: number
): Promise<{ start_time: string; end_time: string }[]> {
  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from("professional_schedule")
      .select("start_time, end_time")
      .eq("professional_id", professionalId)
      .eq("day_of_week", dayOfWeek);
    if (error) throw error;
    return data ?? [];
  }
  return db
    .prepare(
      "SELECT start_time, end_time FROM professional_schedule WHERE professional_id = ? AND day_of_week = ?"
    )
    .all(professionalId, dayOfWeek) as any[];
}

export async function getBlockedSlotsForDate(
  dateStr: string,
  professionalIds: number[]
): Promise<{ start_time: string; end_time: string; professional_id: number | null }[]> {
  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from("blocked_slots")
      .select("start_time, end_time, professional_id")
      .eq("date", dateStr);
    if (error) throw error;
    return (data ?? []).filter(
      (b) => b.professional_id == null || professionalIds.includes(b.professional_id)
    );
  }
  if (professionalIds.length === 0) return [];
  const placeholders = professionalIds.map(() => "?").join(",");
  return db
    .prepare(
      `SELECT start_time, end_time, professional_id FROM blocked_slots
       WHERE date = ? AND (professional_id IS NULL OR professional_id IN (${placeholders}))`
    )
    .all(dateStr, ...professionalIds) as any[];
}
