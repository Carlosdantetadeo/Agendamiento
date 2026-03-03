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
    status TEXT DEFAULT 'pending'
  )
`);

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

  try {
    // 1. Save to Local SQLite (Immediate)
    const insert = db.prepare('INSERT INTO appointments (clientName, phone, treatment, dateTime) VALUES (?, ?, ?, ?)');
    insert.run(clientName, phone, treatment, dateTime);

    // Responder de inmediato para que la web no se quede colgada
    res.status(200).json({ success: true, message: "Cita agendada localmente" });

    // 2. Intentar sincronizar con Google Calendar en SEGUNDO PLANO
    const gEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    let gKey = process.env.GOOGLE_PRIVATE_KEY;
    const gCalendarId = process.env.GOOGLE_CALENDAR_ID?.trim() || '1a0715b154c84027ed89408d2b4e1ab76c92ec8e0a9810cd1ba430b18e2b5bb3@group.calendar.google.com';

    if (gEmail && gKey) {
      // Limpieza agresiva de la llave (quita comillas, espacios y arregla saltos de línea)
      gKey = gKey.trim();
      if (gKey.startsWith('"') && gKey.endsWith('"')) gKey = gKey.slice(1, -1);
      gKey = gKey.replace(/\\n/g, '\n');

      (async () => {
        try {
          console.log(`[Google Sync] Intentando sincronizar: ${clientName} en ${gCalendarId}`);
          const auth = new google.auth.GoogleAuth({
            credentials: {
              client_email: gEmail,
              private_key: gKey,
            },
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
            await calendar.events.insert({
              calendarId: gCalendarId,
              requestBody: eventBody,
            });
            console.log(`[Google Sync] ✅ Éxito en ${gCalendarId}`);
          } catch (firstError: any) {
            if (firstError.code === 404 && gCalendarId !== 'primary') {
              console.warn(`[Google Sync] ⚠️ ${gCalendarId} no encontrado. Intentando con 'primary'...`);
              await calendar.events.insert({
                calendarId: 'primary',
                requestBody: eventBody,
              });
              console.log(`[Google Sync] ✅ Éxito en 'primary'`);
            } else {
              throw firstError;
            }
          }
        } catch (gError: any) {
          console.error("[Google Sync] ❌ ERROR FINAL:", gError.message);
          if (gError.errors) console.error("[Google Sync] Detalles:", JSON.stringify(gError.errors));
        }
      })();
    }
  } catch (error: any) {
    console.error("Booking Error:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to book appointment", details: error.message });
    }
  }
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
