import "dotenv/config";
import express from "express";
import { google } from "googleapis";
import cors from "cors";
import path from "path";
import crypto from "crypto";
import {
  useSupabase,
  db,
  getServices,
  getServiceById,
  insertService,
  updateService,
  deleteService,
  getProfessionals,
  getProfessionalById,
  insertProfessional,
  updateProfessional,
  deleteProfessional,
  getProfessionalServices,
  setProfessionalServices,
  getProfessionalSchedule,
  setProfessionalSchedule,
  getBlockedSlots,
  insertBlockedSlot,
  deleteBlockedSlot,
  getAppointments,
  getAppointmentByToken,
  getAppointmentById,
  insertAppointment,
  updateAppointmentStatus,
  updateAppointmentDateTime,
  getBookedSlotsForDate,
  getProfessionalIdsForService,
  getScheduleForProfessionalAndDay,
  getBlockedSlotsForDate,
} from "./lib/db.js";

const TIMEZONE = "America/Lima";
const CANCELLATION_MIN_HOURS_BEFORE = 2;

// Inicializar esquema SQLite solo cuando NO se usa Supabase
if (!useSupabase && db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      durationMinutes INTEGER NOT NULL DEFAULT 60,
      price REAL NOT NULL DEFAULT 0,
      category TEXT DEFAULT 'general'
    );
    CREATE TABLE IF NOT EXISTS professionals (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS professional_services (professional_id INTEGER NOT NULL, service_id INTEGER NOT NULL, PRIMARY KEY (professional_id, service_id));
    CREATE TABLE IF NOT EXISTS professional_schedule (id INTEGER PRIMARY KEY AUTOINCREMENT, professional_id INTEGER NOT NULL, day_of_week INTEGER NOT NULL, start_time TEXT NOT NULL, end_time TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS blocked_slots (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT NOT NULL, start_time TEXT NOT NULL, end_time TEXT NOT NULL, professional_id INTEGER, reason TEXT);
    CREATE TABLE IF NOT EXISTS appointments (id INTEGER PRIMARY KEY AUTOINCREMENT, clientName TEXT, phone TEXT, email TEXT, treatment TEXT, dateTime TEXT, durationMinutes INTEGER DEFAULT 60, status TEXT DEFAULT 'pending', googleEventId TEXT, token TEXT, source TEXT DEFAULT 'web', service_id INTEGER, professional_id INTEGER)
  `);
  function ensureColumn(table: string, column: string, sql: string) {
    try {
      const columns = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
      if (!columns.some((c) => c.name === column)) db.exec(sql);
    } catch (e) {
      console.warn("[DB] Migration", column, (e as Error).message);
    }
  }
  ensureColumn("appointments", "googleEventId", "ALTER TABLE appointments ADD COLUMN googleEventId TEXT");
  ensureColumn("appointments", "email", "ALTER TABLE appointments ADD COLUMN email TEXT");
  ensureColumn("appointments", "token", "ALTER TABLE appointments ADD COLUMN token TEXT");
  ensureColumn("appointments", "source", "ALTER TABLE appointments ADD COLUMN source TEXT DEFAULT 'web'");
  ensureColumn("appointments", "service_id", "ALTER TABLE appointments ADD COLUMN service_id INTEGER");
  ensureColumn("appointments", "professional_id", "ALTER TABLE appointments ADD COLUMN professional_id INTEGER");
  ensureColumn("appointments", "durationMinutes", "ALTER TABLE appointments ADD COLUMN durationMinutes INTEGER DEFAULT 60");
  const serviceCount = db.prepare("SELECT COUNT(*) as c FROM services").get() as { c: number };
  const profCount = db.prepare("SELECT COUNT(*) as c FROM professionals").get() as { c: number };
  if (serviceCount.c === 0) {
    db.prepare("INSERT INTO services (name, durationMinutes, price, category) VALUES (?,?,?,?)").run("Limpieza Facial", 60, 50, "facial");
    db.prepare("INSERT INTO services (name, durationMinutes, price, category) VALUES (?,?,?,?)").run("Peeling Químico", 45, 75, "facial");
  }
  if (profCount.c === 0) {
    db.prepare("INSERT INTO professionals (name) VALUES (?)").run("Estilista 1");
    const pid = (db.prepare("SELECT id FROM professionals LIMIT 1").get() as { id: number }).id;
    db.prepare("INSERT INTO professional_services (professional_id, service_id) SELECT ?, id FROM services").run(pid);
    const ins = db.prepare("INSERT INTO professional_schedule (professional_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?)");
    for (let d = 1; d <= 6; d++) ins.run(pid, d, "09:00", "18:00");
  }
}
if (useSupabase) console.log("[DB] Using Supabase");

// The following lines are moved to lib/db.js as per the instruction's intent
// const supabaseUrl = process.env.SUPABASE_URL?.trim();
// const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
// export const useSupabase = Boolean(supabaseUrl && supabaseServiceKey);
//
// export let supabase: SupabaseClient | null = null;
// if (useSupabase) {
//   supabase = createClient(supabaseUrl!, supabaseServiceKey!);
// }

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

function generateToken() {
  return crypto.randomBytes(16).toString("hex");
}

// ----- Services CRUD -----
app.get("/api/services", async (req, res) => {
  try {
    const rows = await getServices();
    res.json(rows);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/services", async (req, res) => {
  const { name, durationMinutes = 60, price = 0, category = "general" } = req.body || {};
  if (!name) return res.status(400).json({ error: "Missing name" });
  try {
    const row = await insertService({ name, durationMinutes, price, category });
    res.status(201).json(row);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/services/:id", async (req, res) => {
  const id = Number(req.params.id);
  const row = await getServiceById(id);
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(row);
});

app.put("/api/services/:id", async (req, res) => {
  const { name, durationMinutes, price, category } = req.body || {};
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid id" });
  try {
    const row = await updateService(id, { name, durationMinutes, price, category });
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(row);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.delete("/api/services/:id", async (req, res) => {
  try {
    await deleteService(Number(req.params.id));
    res.status(204).send();
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ----- Professionals CRUD -----
app.get("/api/professionals", async (req, res) => {
  try {
    const rows = await getProfessionals();
    res.json(rows);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/professionals", async (req, res) => {
  const { name } = req.body || {};
  if (!name) return res.status(400).json({ error: "Missing name" });
  try {
    const row = await insertProfessional(name);
    res.status(201).json(row);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/professionals/:id", async (req, res) => {
  const row = await getProfessionalById(Number(req.params.id));
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(row);
});

app.put("/api/professionals/:id", async (req, res) => {
  const { name } = req.body || {};
  const id = Number(req.params.id);
  if (!name) return res.status(400).json({ error: "Missing name" });
  try {
    const row = await updateProfessional(id, name);
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(row);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.delete("/api/professionals/:id", async (req, res) => {
  try {
    await deleteProfessional(Number(req.params.id));
    res.status(204).send();
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/professionals/:id/services", async (req, res) => {
  try {
    const rows = await getProfessionalServices(Number(req.params.id));
    res.json(rows);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/professionals/:id/services", async (req, res) => {
  const professional_id = Number(req.params.id);
  const { serviceIds } = req.body || {};
  if (!Array.isArray(serviceIds)) return res.status(400).json({ error: "serviceIds must be an array" });
  try {
    await setProfessionalServices(professional_id, serviceIds);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Schedule: array of { dayOfWeek, startTime, endTime } (dayOfWeek 0=Sunday)
app.get("/api/professionals/:id/schedule", async (req, res) => {
  try {
    const rows = await getProfessionalSchedule(Number(req.params.id));
    res.json(rows);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/professionals/:id/schedule", async (req, res) => {
  const professional_id = Number(req.params.id);
  const { schedule } = req.body || {};
  if (!Array.isArray(schedule)) return res.status(400).json({ error: "schedule must be an array of { dayOfWeek, startTime, endTime }" });
  try {
    await setProfessionalSchedule(professional_id, schedule);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Blocked slots (holidays, lunch)
app.get("/api/blocked-slots", async (req, res) => {
  try {
    const date = req.query.date as string | undefined;
    const professionalId = req.query.professionalId ? Number(req.query.professionalId) : undefined;
    const rows = await getBlockedSlots({ date, professionalId });
    res.json(rows);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/blocked-slots", async (req, res) => {
  const { date, startTime, endTime, professionalId, reason } = req.body || {};
  if (!date || !startTime || !endTime) return res.status(400).json({ error: "Missing date, startTime or endTime" });
  try {
    const row = await insertBlockedSlot({
      date,
      start_time: startTime,
      end_time: endTime,
      professional_id: professionalId ?? null,
      reason: reason ?? null,
    });
    res.status(201).json(row);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.delete("/api/blocked-slots/:id", async (req, res) => {
  try {
    await deleteBlockedSlot(Number(req.params.id));
    res.status(204).send();
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Availability: GET /api/availability?date=YYYY-MM-DD&serviceId=1&professionalId=1 (professionalId optional)
app.get("/api/availability", async (req, res) => {
  const { date, serviceId, professionalId } = req.query;
  if (!date || !serviceId) return res.status(400).json({ error: "Missing date or serviceId" });
  try {
    const service = await getServiceById(Number(serviceId));
    if (!service) return res.status(400).json({ error: "Service not found" });
    const durationMin = service.durationMinutes ?? 60;

    let professionalIds: number[] = [];
    if (professionalId) {
      professionalIds = [Number(professionalId)];
    } else {
      professionalIds = await getProfessionalIdsForService(Number(serviceId));
    }
    if (professionalIds.length === 0) return res.json([]);

    const d = new Date(String(date));
    const dayOfWeek = d.getDay();
    const dateStr = String(date);
    const slots: { time: string; professionalId: number }[] = [];

    for (const pid of professionalIds) {
      const sched = await getScheduleForProfessionalAndDay(pid, dayOfWeek);
      for (const s of sched) {
        const [sh, sm] = s.start_time.split(":").map(Number);
        const [eh, em] = s.end_time.split(":").map(Number);
        let min = sh * 60 + sm;
        const endMin = eh * 60 + em;
        while (min + durationMin <= endMin) {
          const h = Math.floor(min / 60);
          const m = min % 60;
          slots.push({ time: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`, professionalId: pid });
          min += 30;
        }
      }
    }

    const [booked, blocked] = await Promise.all([
      getBookedSlotsForDate(dateStr),
      getBlockedSlotsForDate(dateStr, professionalIds),
    ]);

    const occupied = new Set<string>();
    for (const b of booked) {
      const start = new Date(b.dateTime);
      const endMin = (start.getHours() * 60 + start.getMinutes()) + (b.durationMinutes || 60);
      for (let t = start.getHours() * 60 + start.getMinutes(); t < endMin; t += 30) {
        const key = `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
        occupied.add(`${key}-${b.professional_id ?? "any"}`);
      }
    }
    for (const bl of blocked) {
      const [sh, sm] = bl.start_time.split(":").map(Number);
      const [eh, em] = bl.end_time.split(":").map(Number);
      for (let t = sh * 60 + sm; t < eh * 60 + em; t += 30) {
        const key = `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
        occupied.add(bl.professional_id ? `${key}-${bl.professional_id}` : key + "-all");
      }
    }

    const available = slots.filter((s) => {
      const slotStart = s.time.split(":").map(Number);
      const slotMin = slotStart[0] * 60 + slotStart[1];
      const slotEnd = slotMin + durationMin;
      for (let t = slotMin; t < slotEnd; t += 30) {
        const k = `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
        if (occupied.has(`${k}-${s.professionalId}`) || occupied.has(`${k}-any`) || occupied.has(`${k}-all`)) return false;
      }
      return true;
    });

    const byTime = new Map<string, number[]>();
    for (const s of available) {
      if (!byTime.has(s.time)) byTime.set(s.time, []);
      byTime.get(s.time)!.push(s.professionalId);
    }
    const result = Array.from(byTime.entries()).map(([time, pids]) => ({ time, professionalIds: pids }));
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ----- Book (client) -----
app.post("/api/book", async (req, res) => {
  const { clientName, phone, email, treatment, dateTime, serviceId, professionalId } = req.body;

  if (!clientName || !phone || !dateTime) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  let serviceName = treatment || "";
  let durationMinutes = 60;
  if (serviceId) {
    const svc = await getServiceById(Number(serviceId));
    if (svc) {
      serviceName = svc.name;
      durationMinutes = svc.durationMinutes ?? 60;
    }
  }

  const token = generateToken();

  // 1) Primero intentar Google Calendar (await real, antes de responder)
  const gEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  let gKey = process.env.GOOGLE_PRIVATE_KEY;
  const gCalendarId =
    process.env.GOOGLE_CALENDAR_ID?.trim() ||
    "1a0715b154c84027ed89408d2b4e1ab76c92ec8e0a9810cd1ba430b18e2b5bb3@group.calendar.google.com";

  let googleSync: "success" | "failed" | "skipped" = "skipped";
  let googleEventId: string | null = null;

  if (gEmail && gKey) {
    // Key cleanup: Vercel y otros entornos a veces añaden comillas o escapan mal los saltos de línea
    gKey = gKey.trim();
    if (gKey.startsWith('"') && gKey.endsWith('"')) gKey = gKey.slice(1, -1);
    if (gKey.startsWith("'") && gKey.endsWith("'")) gKey = gKey.slice(1, -1);
    gKey = gKey.replace(/\\n/g, "\n");

    try {
      console.log(`[Google Sync] Intentando sincronizar: ${clientName} en ${gCalendarId}`);
      const auth = new google.auth.GoogleAuth({
        credentials: { client_email: gEmail, private_key: gKey },
        scopes: ["https://www.googleapis.com/auth/calendar"],
      });

      const calendar = google.calendar({ version: "v3", auth });
      const startTime = new Date(dateTime);
      const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

      const eventBody = {
        summary: `✨ Glow Skins: ${serviceName} - ${clientName}`,
        description: `Cita de estética para ${clientName}\nTeléfono: +51 ${phone}\nServicio: ${serviceName}`,
        start: { dateTime: startTime.toISOString(), timeZone: "America/Lima" },
        end: { dateTime: endTime.toISOString(), timeZone: "America/Lima" },
      };

      try {
        const response = await calendar.events.insert({
          calendarId: gCalendarId,
          requestBody: eventBody,
        });
        googleEventId = response.data.id || null;
        googleSync = "success";
        console.log(`[Google Sync] ✅ Éxito en ${gCalendarId} (eventId=${googleEventId ?? "n/a"})`);
      } catch (firstError: any) {
        if (firstError.code === 404 && gCalendarId !== "primary") {
          console.warn(`[Google Sync] ⚠️ ${gCalendarId} no encontrado. Intentando con 'primary'...`);
          const response = await calendar.events.insert({
            calendarId: "primary",
            requestBody: eventBody,
          });
          googleEventId = response.data.id || null;
          googleSync = "success";
          console.log(`[Google Sync] ✅ Éxito en 'primary' (eventId=${googleEventId ?? "n/a"})`);
        } else {
          throw firstError;
        }
      }
    } catch (gError: any) {
      googleSync = "failed";
      console.error("[Google Sync] ❌ ERROR:", gError.message);
      if (gError.errors) console.error("[Google Sync] Detalles:", JSON.stringify(gError.errors));
    }
  }

  // 2) Guardar en DB (Supabase o SQLite)
  try {
    await insertAppointment({
      clientName,
      phone,
      email: email || null,
      treatment: serviceName,
      dateTime,
      durationMinutes,
      googleEventId,
      token,
      source: "web",
      service_id: serviceId ? Number(serviceId) : null,
      professional_id: professionalId != null ? Number(professionalId) : null,
    });
  } catch (dbError: any) {
    console.error("Booking Error (DB):", dbError);
    return res.status(500).json({ error: "Failed to book appointment", details: dbError.message });
  }

  // 3) Responder (incluir token y professionalName para la UI)
  let professionalName: string | null = null;
  if (professionalId != null) {
    const prof = await getProfessionalById(Number(professionalId));
    professionalName = prof?.name ?? null;
  }
  return res.status(200).json({
    success: true,
    message: "Cita agendada",
    googleSync,
    googleEventId,
    token,
    professionalName: professionalName ?? null,
  });
});

// ----- Admin: create appointment manually (walk-in / phone) -----
app.post("/api/appointments", async (req, res) => {
  const { clientName, phone, email, serviceId, professionalId, dateTime } = req.body || {};
  if (!clientName || !phone || !dateTime) return res.status(400).json({ error: "Missing clientName, phone or dateTime" });
  let serviceName = "";
  let durationMinutes = 60;
  if (serviceId) {
    const svc = await getServiceById(Number(serviceId));
    if (svc) {
      serviceName = svc.name;
      durationMinutes = svc.durationMinutes ?? 60;
    }
  }
  const token = generateToken();
  try {
    await insertAppointment({
      clientName,
      phone,
      email: email || null,
      treatment: serviceName || "",
      dateTime,
      durationMinutes,
      token,
      source: "manual",
      service_id: serviceId ? Number(serviceId) : null,
      professional_id: professionalId != null ? Number(professionalId) : null,
    });
    const row = await getAppointmentByToken(token);
    if (!row) return res.status(500).json({ error: "Appointment created but could not be read back" });
    res.status(201).json(row);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Get one appointment by token (for public cancel/reschedule page)
app.get("/api/appointments/by-token/:token", async (req, res) => {
  const row = await getAppointmentByToken(req.params.token);
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(row);
});

// Cancel appointment (by id for admin, or by token for client). Time limit: CANCELLATION_MIN_HOURS_BEFORE
app.patch("/api/appointments/:id/cancel", async (req, res) => {
  const id = Number(req.params.id);
  const appt = await getAppointmentById(id);
  if (!appt) return res.status(404).json({ error: "Not found" });
  if (appt.status !== "pending") return res.status(400).json({ error: "Appointment already cancelled or completed" });
  const minCancelMs = CANCELLATION_MIN_HOURS_BEFORE * 60 * 60 * 1000;
  if (new Date(appt.dateTime).getTime() - Date.now() < minCancelMs) {
    return res.status(400).json({ error: `Solo se puede cancelar con al menos ${CANCELLATION_MIN_HOURS_BEFORE}h de anticipación` });
  }
  await updateAppointmentStatus(id, "cancelled");
  res.json({ ok: true });
});

app.patch("/api/appointments/cancel-by-token", async (req, res) => {
  const { token } = req.body || {};
  if (!token) return res.status(400).json({ error: "Missing token" });
  const row = await getAppointmentByToken(token);
  if (!row) return res.status(404).json({ error: "Not found" });
  if (row.status !== "pending") return res.status(400).json({ error: "Appointment already cancelled or completed" });
  const minCancelMs = CANCELLATION_MIN_HOURS_BEFORE * 60 * 60 * 1000;
  if (new Date(row.dateTime).getTime() - Date.now() < minCancelMs) {
    return res.status(400).json({ error: `Solo se puede cancelar con al menos ${CANCELLATION_MIN_HOURS_BEFORE}h de anticipación` });
  }
  await updateAppointmentStatus(row.id, "cancelled");
  res.json({ ok: true });
});

// Reschedule (admin by id; client by token)
app.patch("/api/appointments/:id/reschedule", async (req, res) => {
  const { dateTime } = req.body || {};
  if (!dateTime) return res.status(400).json({ error: "Missing dateTime" });
  const id = Number(req.params.id);
  const appt = await getAppointmentById(id);
  if (!appt) return res.status(404).json({ error: "Not found" });
  await updateAppointmentDateTime(id, dateTime);
  const updated = await getAppointmentById(id);
  res.json(updated);
});

app.patch("/api/appointments/reschedule-by-token", async (req, res) => {
  const { token, dateTime } = req.body || {};
  if (!token || !dateTime) return res.status(400).json({ error: "Missing token or dateTime" });
  const row = await getAppointmentByToken(token);
  if (!row) return res.status(404).json({ error: "Not found" });
  await updateAppointmentDateTime(row.id, dateTime);
  const updated = await getAppointmentById(row.id);
  res.json(updated);
});

// List appointments (admin): ?date=YYYY-MM-DD (opcional) &professionalId=
app.get("/api/appointments", async (req, res) => {
  const date = req.query.date ? String(req.query.date).trim() : undefined;
  const professionalId = req.query.professionalId ? Number(req.query.professionalId) : undefined;
  try {
    const appointments = await getAppointments({
      date: date || undefined,
      professionalId,
      limit: date ? undefined : 100,
    });
    res.json(appointments);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch appointments" });
  }
});

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(process.cwd(), "dist")));
  app.get("*", (req, res) => {
    res.sendFile(path.join(process.cwd(), "dist", "index.html"));
  });
}

if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;
