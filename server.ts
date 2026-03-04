import "dotenv/config";
import express from "express";
import { google } from "googleapis";
import cors from "cors";
import Database from "better-sqlite3";
import path from "path";
import crypto from "crypto";

// Initialize DB (In serverless, /tmp is usually the only writable directory)
const dbPath = process.env.NODE_ENV === "production" ? "/tmp/appointments.db" : "./appointments.db";
const db = new Database(dbPath);

const TIMEZONE = "America/Lima";
const CANCELLATION_MIN_HOURS_BEFORE = 2;

// ----- Phase 1 schema -----
db.exec(`
  CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    durationMinutes INTEGER NOT NULL DEFAULT 60,
    price REAL NOT NULL DEFAULT 0,
    category TEXT DEFAULT 'general'
  );
  CREATE TABLE IF NOT EXISTS professionals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS professional_services (
    professional_id INTEGER NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
    service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    PRIMARY KEY (professional_id, service_id)
  );
  CREATE TABLE IF NOT EXISTS professional_schedule (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    professional_id INTEGER NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS blocked_slots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    professional_id INTEGER REFERENCES professionals(id) ON DELETE CASCADE,
    reason TEXT
  );
  CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    clientName TEXT,
    phone TEXT,
    email TEXT,
    treatment TEXT,
    dateTime TEXT,
    durationMinutes INTEGER DEFAULT 60,
    status TEXT DEFAULT 'pending',
    googleEventId TEXT,
    token TEXT UNIQUE,
    source TEXT DEFAULT 'web',
    service_id INTEGER REFERENCES services(id),
    professional_id INTEGER REFERENCES professionals(id)
  )
`);

// Migrations: add new columns to appointments if missing
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
// For existing DBs, add token without UNIQUE to avoid migration errors.
ensureColumn("appointments", "token", "ALTER TABLE appointments ADD COLUMN token TEXT");
ensureColumn("appointments", "source", "ALTER TABLE appointments ADD COLUMN source TEXT DEFAULT 'web'");
ensureColumn("appointments", "service_id", "ALTER TABLE appointments ADD COLUMN service_id INTEGER REFERENCES services(id)");
ensureColumn("appointments", "professional_id", "ALTER TABLE appointments ADD COLUMN professional_id INTEGER REFERENCES professionals(id)");
ensureColumn("appointments", "durationMinutes", "ALTER TABLE appointments ADD COLUMN durationMinutes INTEGER DEFAULT 60");

// Seed default service and professional if tables are empty (optional, for quick start)
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

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

function generateToken() {
  return crypto.randomBytes(16).toString("hex");
}

// ----- Services CRUD -----
app.get("/api/services", (req, res) => {
  try {
    const rows = db.prepare("SELECT * FROM services ORDER BY category, name").all();
    res.json(rows);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/services", (req, res) => {
  const { name, durationMinutes = 60, price = 0, category = "general" } = req.body || {};
  if (!name) return res.status(400).json({ error: "Missing name" });
  try {
    const r = db.prepare("INSERT INTO services (name, durationMinutes, price, category) VALUES (?,?,?,?)").run(name, durationMinutes, price, category);
    const row = db.prepare("SELECT * FROM services WHERE id = ?").get(r.lastInsertRowid);
    res.status(201).json(row);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/services/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM services WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(row);
});

app.put("/api/services/:id", (req, res) => {
  const { name, durationMinutes, price, category } = req.body || {};
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid id" });
  try {
    db.prepare("UPDATE services SET name=COALESCE(?,name), durationMinutes=COALESCE(?,durationMinutes), price=COALESCE(?,price), category=COALESCE(?,category) WHERE id=?")
      .run(name ?? null, durationMinutes ?? null, price ?? null, category ?? null, id);
    const row = db.prepare("SELECT * FROM services WHERE id = ?").get(id);
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(row);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.delete("/api/services/:id", (req, res) => {
  db.prepare("DELETE FROM services WHERE id = ?").run(req.params.id);
  res.status(204).send();
});

// ----- Professionals CRUD -----
app.get("/api/professionals", (req, res) => {
  try {
    const rows = db.prepare("SELECT * FROM professionals ORDER BY name").all();
    res.json(rows);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/professionals", (req, res) => {
  const { name } = req.body || {};
  if (!name) return res.status(400).json({ error: "Missing name" });
  try {
    const r = db.prepare("INSERT INTO professionals (name) VALUES (?)").run(name);
    const row = db.prepare("SELECT * FROM professionals WHERE id = ?").get(r.lastInsertRowid);
    res.status(201).json(row);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/professionals/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM professionals WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(row);
});

app.put("/api/professionals/:id", (req, res) => {
  const { name } = req.body || {};
  const id = Number(req.params.id);
  if (!name) return res.status(400).json({ error: "Missing name" });
  db.prepare("UPDATE professionals SET name = ? WHERE id = ?").run(name, id);
  const row = db.prepare("SELECT * FROM professionals WHERE id = ?").get(id);
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(row);
});

app.delete("/api/professionals/:id", (req, res) => {
  db.prepare("DELETE FROM professionals WHERE id = ?").run(req.params.id);
  res.status(204).send();
});

app.get("/api/professionals/:id/services", (req, res) => {
  const id = req.params.id;
  const rows = db.prepare(
    "SELECT s.* FROM services s INNER JOIN professional_services ps ON ps.service_id = s.id WHERE ps.professional_id = ?"
  ).all(id);
  res.json(rows);
});

app.post("/api/professionals/:id/services", (req, res) => {
  const professional_id = Number(req.params.id);
  const { serviceIds } = req.body || {};
  if (!Array.isArray(serviceIds)) return res.status(400).json({ error: "serviceIds must be an array" });
  db.prepare("DELETE FROM professional_services WHERE professional_id = ?").run(professional_id);
  const stmt = db.prepare("INSERT INTO professional_services (professional_id, service_id) VALUES (?, ?)");
  for (const sid of serviceIds) stmt.run(professional_id, sid);
  res.json({ ok: true });
});

// Schedule: array of { dayOfWeek, startTime, endTime } (dayOfWeek 0=Sunday)
app.get("/api/professionals/:id/schedule", (req, res) => {
  const rows = db.prepare("SELECT * FROM professional_schedule WHERE professional_id = ? ORDER BY day_of_week, start_time").all(req.params.id);
  res.json(rows);
});

app.post("/api/professionals/:id/schedule", (req, res) => {
  const professional_id = Number(req.params.id);
  const { schedule } = req.body || {};
  if (!Array.isArray(schedule)) return res.status(400).json({ error: "schedule must be an array of { dayOfWeek, startTime, endTime }" });
  db.prepare("DELETE FROM professional_schedule WHERE professional_id = ?").run(professional_id);
  const stmt = db.prepare("INSERT INTO professional_schedule (professional_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?)");
  for (const s of schedule) {
    if (s.dayOfWeek != null && s.startTime != null && s.endTime != null)
      stmt.run(professional_id, s.dayOfWeek, s.startTime, s.endTime);
  }
  res.json({ ok: true });
});

// Blocked slots (holidays, lunch)
app.get("/api/blocked-slots", (req, res) => {
  const { date, professionalId } = req.query;
  let query = "SELECT * FROM blocked_slots WHERE 1=1";
  const params: (string | number)[] = [];
  if (date) { query += " AND date = ?"; params.push(String(date)); }
  if (professionalId) { query += " AND (professional_id IS NULL OR professional_id = ?)"; params.push(Number(professionalId)); }
  query += " ORDER BY date, start_time";
  const rows = db.prepare(query).all(...params);
  res.json(rows);
});

app.post("/api/blocked-slots", (req, res) => {
  const { date, startTime, endTime, professionalId, reason } = req.body || {};
  if (!date || !startTime || !endTime) return res.status(400).json({ error: "Missing date, startTime or endTime" });
  const r = db.prepare(
    "INSERT INTO blocked_slots (date, start_time, end_time, professional_id, reason) VALUES (?, ?, ?, ?, ?)"
  ).run(date, startTime, endTime, professionalId ?? null, reason ?? null);
  const row = db.prepare("SELECT * FROM blocked_slots WHERE id = ?").get(r.lastInsertRowid);
  res.status(201).json(row);
});

app.delete("/api/blocked-slots/:id", (req, res) => {
  db.prepare("DELETE FROM blocked_slots WHERE id = ?").run(req.params.id);
  res.status(204).send();
});

// Availability: GET /api/availability?date=YYYY-MM-DD&serviceId=1&professionalId=1 (professionalId optional)
app.get("/api/availability", (req, res) => {
  const { date, serviceId, professionalId } = req.query;
  if (!date || !serviceId) return res.status(400).json({ error: "Missing date or serviceId" });
  const d = new Date(String(date));
  const dayOfWeek = d.getDay();
  const service = db.prepare("SELECT * FROM services WHERE id = ?").get(serviceId) as { durationMinutes: number } | undefined;
  if (!service) return res.status(400).json({ error: "Service not found" });
  const durationMin = service.durationMinutes;

  let professionalIds: number[] = [];
  if (professionalId) {
    professionalIds = [Number(professionalId)];
  } else {
    const prows = db.prepare("SELECT professional_id FROM professional_services WHERE service_id = ?").all(serviceId) as { professional_id: number }[];
    professionalIds = prows.map((r) => r.professional_id);
  }
  if (professionalIds.length === 0) return res.json([]);

  const slots: { time: string; professionalId: number }[] = [];
  const dateStr = String(date);

  for (const pid of professionalIds) {
    const sched = db.prepare("SELECT * FROM professional_schedule WHERE professional_id = ? AND day_of_week = ?").all(pid, dayOfWeek) as { start_time: string; end_time: string }[];
    if (sched.length === 0) continue;
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

  const booked = db.prepare(
    "SELECT dateTime, durationMinutes, professional_id FROM appointments WHERE dateTime LIKE ? AND status = 'pending'"
  ).all(`${dateStr}%`) as { dateTime: string; durationMinutes: number; professional_id: number | null }[];
  const blocked = db.prepare(
    "SELECT start_time, end_time, professional_id FROM blocked_slots WHERE date = ? AND (professional_id IS NULL OR professional_id IN (" + professionalIds.map(() => "?").join(",") + "))"
  ).all(dateStr, ...professionalIds) as { start_time: string; end_time: string; professional_id: number | null }[];

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
  const result = Array.from(byTime.entries()).map(([time, professionalIds]) => ({ time, professionalIds }));
  res.json(result);
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
    const svc = db.prepare("SELECT * FROM services WHERE id = ?").get(serviceId) as { name: string; durationMinutes: number } | undefined;
    if (svc) {
      serviceName = svc.name;
      durationMinutes = svc.durationMinutes;
    }
  }

  const token = generateToken();

  // 1) Primero intentar Google Calendar (await real, antes de responder)
  const gEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let gKey = process.env.GOOGLE_PRIVATE_KEY;
  const gCalendarId =
    process.env.GOOGLE_CALENDAR_ID?.trim() ||
    "1a0715b154c84027ed89408d2b4e1ab76c92ec8e0a9810cd1ba430b18e2b5bb3@group.calendar.google.com";

  let googleSync: "success" | "failed" | "skipped" = "skipped";
  let googleEventId: string | null = null;

  if (gEmail && gKey) {
    // Key cleanup (Vercel suele guardar saltos de línea como \n)
    gKey = gKey.trim();
    if (gKey.startsWith('"') && gKey.endsWith('"')) gKey = gKey.slice(1, -1);
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

  // 2) Guardar en SQLite (con token y source 'web')
  try {
    const insert = db.prepare(
      "INSERT INTO appointments (clientName, phone, email, treatment, dateTime, durationMinutes, googleEventId, token, source, service_id, professional_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'web', ?, ?)"
    );
    insert.run(clientName, phone, email || null, serviceName, dateTime, durationMinutes, googleEventId, token, serviceId || null, professionalId || null);
  } catch (dbError: any) {
    console.error("Booking Error (DB):", dbError);
    return res.status(500).json({ error: "Failed to book appointment", details: dbError.message });
  }

  // 3) Responder (incluir token y professionalName para la UI)
  const professionalName =
    professionalId != null
      ? (db.prepare("SELECT name FROM professionals WHERE id = ?").get(professionalId) as { name: string } | undefined)?.name
      : null;
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
app.post("/api/appointments", (req, res) => {
  const { clientName, phone, email, serviceId, professionalId, dateTime } = req.body || {};
  if (!clientName || !phone || !dateTime) return res.status(400).json({ error: "Missing clientName, phone or dateTime" });
  let serviceName = "";
  let durationMinutes = 60;
  if (serviceId) {
    const svc = db.prepare("SELECT * FROM services WHERE id = ?").get(serviceId) as { name: string; durationMinutes: number } | undefined;
    if (svc) {
      serviceName = svc.name;
      durationMinutes = svc.durationMinutes;
    }
  }
  const token = generateToken();
  try {
    db.prepare(
      "INSERT INTO appointments (clientName, phone, email, treatment, dateTime, durationMinutes, token, source, service_id, professional_id) VALUES (?, ?, ?, ?, ?, ?, ?, 'manual', ?, ?)"
    ).run(clientName, phone, email || null, serviceName || null, dateTime, durationMinutes, token, serviceId || null, professionalId || null);
    const row = db.prepare("SELECT * FROM appointments WHERE token = ?").get(token) as Record<string, unknown>;
    res.status(201).json(row);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Get one appointment by token (for public cancel/reschedule page)
app.get("/api/appointments/by-token/:token", (req, res) => {
  const row = db.prepare(
    "SELECT a.*, s.name as serviceName, p.name as professionalName FROM appointments a LEFT JOIN services s ON a.service_id = s.id LEFT JOIN professionals p ON a.professional_id = p.id WHERE a.token = ? AND a.status = 'pending'"
  ).get(req.params.token);
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(row);
});

// Cancel appointment (by id for admin, or by token for client). Time limit: CANCELLATION_MIN_HOURS_BEFORE
app.patch("/api/appointments/:id/cancel", (req, res) => {
  const id = req.params.id;
  const appt = db.prepare("SELECT * FROM appointments WHERE id = ?").get(id) as { dateTime: string; status: string } | undefined;
  if (!appt) return res.status(404).json({ error: "Not found" });
  if (appt.status !== "pending") return res.status(400).json({ error: "Appointment already cancelled or completed" });
  const minCancelMs = CANCELLATION_MIN_HOURS_BEFORE * 60 * 60 * 1000;
  if (new Date(appt.dateTime).getTime() - Date.now() < minCancelMs) {
    return res.status(400).json({ error: `Solo se puede cancelar con al menos ${CANCELLATION_MIN_HOURS_BEFORE}h de anticipación` });
  }
  db.prepare("UPDATE appointments SET status = 'cancelled' WHERE id = ?").run(id);
  res.json({ ok: true });
});

app.patch("/api/appointments/cancel-by-token", (req, res) => {
  const { token } = req.body || {};
  if (!token) return res.status(400).json({ error: "Missing token" });
  const row = db.prepare("SELECT id, dateTime, status FROM appointments WHERE token = ?").get(token) as { id: number; dateTime: string; status: string } | undefined;
  if (!row) return res.status(404).json({ error: "Not found" });
  if (row.status !== "pending") return res.status(400).json({ error: "Appointment already cancelled or completed" });
  const minCancelMs = CANCELLATION_MIN_HOURS_BEFORE * 60 * 60 * 1000;
  if (new Date(row.dateTime).getTime() - Date.now() < minCancelMs) {
    return res.status(400).json({ error: `Solo se puede cancelar con al menos ${CANCELLATION_MIN_HOURS_BEFORE}h de anticipación` });
  }
  db.prepare("UPDATE appointments SET status = 'cancelled' WHERE id = ?").run(row.id);
  res.json({ ok: true });
});

// Reschedule (admin by id; client by token)
app.patch("/api/appointments/:id/reschedule", (req, res) => {
  const { dateTime } = req.body || {};
  if (!dateTime) return res.status(400).json({ error: "Missing dateTime" });
  const id = req.params.id;
  const appt = db.prepare("SELECT * FROM appointments WHERE id = ?").get(id);
  if (!appt) return res.status(404).json({ error: "Not found" });
  db.prepare("UPDATE appointments SET dateTime = ? WHERE id = ?").run(dateTime, id);
  res.json(db.prepare("SELECT * FROM appointments WHERE id = ?").get(id));
});

app.patch("/api/appointments/reschedule-by-token", (req, res) => {
  const { token, dateTime } = req.body || {};
  if (!token || !dateTime) return res.status(400).json({ error: "Missing token or dateTime" });
  const row = db.prepare("SELECT id FROM appointments WHERE token = ? AND status = 'pending'").get(token) as { id: number } | undefined;
  if (!row) return res.status(404).json({ error: "Not found" });
  db.prepare("UPDATE appointments SET dateTime = ? WHERE id = ?").run(dateTime, row.id);
  res.json(db.prepare("SELECT * FROM appointments WHERE id = ?").get(row.id));
});

// List appointments (admin): ?date=YYYY-MM-DD (opcional) &professionalId=
// Si no se envía date, devuelve las últimas citas (útil cuando la DB local es efímera en Vercel)
app.get("/api/appointments", (req, res) => {
  const { date, professionalId } = req.query;
  try {
    let query = `
      SELECT a.*, s.name as serviceName, p.name as professionalName
      FROM appointments a
      LEFT JOIN services s ON a.service_id = s.id
      LEFT JOIN professionals p ON a.professional_id = p.id
      WHERE 1=1
    `;
    const params: (string | number)[] = [];
    if (date && String(date).trim()) {
      query += " AND substr(a.dateTime, 1, 10) = ?";
      params.push(String(date).trim());
    }
    if (professionalId) {
      query += " AND a.professional_id = ?";
      params.push(Number(professionalId));
    }
    query += " ORDER BY a.dateTime DESC";
    if (!date || !String(date).trim()) {
      query += " LIMIT 100";
    }
    const appointments = db.prepare(query).all(...params);
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
