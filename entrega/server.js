const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

/**
 * Endpoint para crear una cita en Google Calendar
 */
app.post('/api/book', async (req, res) => {
  const { clientName, treatment, dateTime } = req.body;

  if (!clientName || !treatment || !dateTime) {
    return res.status(400).json({ error: "Faltan datos requeridos (clientName, treatment, dateTime)" });
  }

  try {
    // Configuración de Autenticación con Service Account
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      scopes: ["https://www.googleapis.com/auth/calendar"],
    });

    const calendar = google.calendar({ version: "v3", auth });
    
    const startTime = new Date(dateTime);
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // Duración: 1 hora

    const event = {
      summary: `Lumière: ${treatment} - ${clientName}`,
      description: `Cita de Estética\nClienta: ${clientName}\nTratamiento: ${treatment}`,
      start: {
        dateTime: startTime.toISOString(),
        timeZone: "UTC",
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: "UTC",
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 },
          { method: 'popup', minutes: 30 },
        ],
      },
    };

    const response = await calendar.events.insert({
      calendarId: process.env.GOOGLE_CALENDAR_ID,
      requestBody: event,
    });

    console.log(`Cita creada: ${response.data.htmlLink}`);
    
    res.status(200).json({ 
      success: true, 
      eventId: response.data.id,
      link: response.data.htmlLink 
    });

  } catch (error) {
    console.error("Error en Google Calendar API:", error);
    res.status(500).json({ 
      error: "No se pudo agendar la cita", 
      details: error.message 
    });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor Lumière corriendo en puerto ${PORT}`);
});
