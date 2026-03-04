import "dotenv/config";
import express from "express";
import { google } from "googleapis";
import cors from "cors";
import Database from "better-sqlite3";
import path from "path";

// Initialize DB (In serverless, /tmp is usually the only writable directory)
const dbPath = process.env.NODE_ENV === "production" ? "/tmp/appointments.db" : "./appointments.db";
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    clientName TEXT,
    phone TEXT,
    treatment TEXT,
    dateTime TEXT,
    status TEXT DEFAULT 'pending',
    googleEventId TEXT
  )
`);

// Lightweight migration for local/dev DBs created before googleEventId existed
try {
  const columns = db.prepare(`PRAGMA table_info(appointments)`).all() as Array<{ name: string }>;
  const hasGoogleEventId = columns.some((c) => c.name === "googleEventId");
  if (!hasGoogleEventId) {
    db.exec(`ALTER TABLE appointments ADD COLUMN googleEventId TEXT`);
  }
} catch (e) {
  console.warn("[DB] Migration check failed:", (e as Error).message);
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// API Routes
app.post("/api/book", async (req, res) => {
  const { clientName, phone, treatment, dateTime } = req.body;

  if (!clientName || !phone || !treatment || !dateTime) {
    return res.status(400).json({ error: "Missing required fields" });
  }

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
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

      const eventBody = {
        summary: `✨ Glow Skins: ${treatment} - ${clientName}`,
        description: `Cita de estética para ${clientName}\nTeléfono: +51 ${phone}\nTratamiento: ${treatment}`,
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

  // 2) Luego guardar en SQLite (si Google falló igual guardamos)
  try {
    const insert = db.prepare(
      "INSERT INTO appointments (clientName, phone, treatment, dateTime, googleEventId) VALUES (?, ?, ?, ?, ?)"
    );
    insert.run(clientName, phone, treatment, dateTime, googleEventId);
  } catch (dbError: any) {
    console.error("Booking Error (DB):", dbError);
    return res.status(500).json({ error: "Failed to book appointment", details: dbError.message });
  }

  // 3) Por último responder (ya no hay “background work” que Vercel mate)
  return res.status(200).json({
    success: true,
    message: "Cita agendada localmente",
    googleSync,
    googleEventId,
  });
});

// New endpoint to view appointments (for admin)
app.get("/api/appointments", (req, res) => {
  const { date } = req.query;
  try {
    let query = 'SELECT * FROM appointments';
    const params: any[] = [];

    if (date) {
      query += ' WHERE dateTime LIKE ?';
      params.push(`${date}%`);
    }

    query += ' ORDER BY dateTime DESC';

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
