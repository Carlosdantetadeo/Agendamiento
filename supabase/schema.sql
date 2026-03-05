-- Ejecuta este SQL en Supabase: SQL Editor → New query → Pegar y Run
-- https://supabase.com/dashboard/project/TU_PROYECTO/sql

-- Servicios (tratamientos)
CREATE TABLE IF NOT EXISTS services (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  "durationMinutes" INTEGER NOT NULL DEFAULT 60,
  price REAL NOT NULL DEFAULT 0,
  category TEXT DEFAULT 'general'
);

-- Profesionales (estilistas). google_calendar_id = opcional para conectar su Calendar después
CREATE TABLE IF NOT EXISTS professionals (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  google_calendar_id TEXT
);

-- Qué servicios hace cada profesional
CREATE TABLE IF NOT EXISTS professional_services (
  professional_id BIGINT NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  service_id BIGINT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  PRIMARY KEY (professional_id, service_id)
);

-- Horario de trabajo por profesional (día 0=domingo, 1=lunes, ...)
CREATE TABLE IF NOT EXISTS professional_schedule (
  id BIGSERIAL PRIMARY KEY,
  professional_id BIGINT NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL
);

-- Bloqueos (feriados, almuerzo)
CREATE TABLE IF NOT EXISTS blocked_slots (
  id BIGSERIAL PRIMARY KEY,
  date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  professional_id BIGINT REFERENCES professionals(id) ON DELETE CASCADE,
  reason TEXT
);

-- Citas (web + manuales)
CREATE TABLE IF NOT EXISTS appointments (
  id BIGSERIAL PRIMARY KEY,
  "clientName" TEXT,
  phone TEXT,
  email TEXT,
  treatment TEXT,
  "dateTime" TEXT,
  "durationMinutes" INTEGER DEFAULT 60,
  status TEXT DEFAULT 'pending',
  "googleEventId" TEXT,
  token TEXT UNIQUE,
  source TEXT DEFAULT 'web',
  service_id BIGINT REFERENCES services(id),
  professional_id BIGINT REFERENCES professionals(id)
);

-- Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_appointments_datetime ON appointments("dateTime");
CREATE INDEX IF NOT EXISTS idx_appointments_token ON appointments(token);
CREATE INDEX IF NOT EXISTS idx_appointments_professional ON appointments(professional_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

-- Seed inicial: ejecutar solo una vez (si las tablas están vacías)
-- INSERT INTO services (name, "durationMinutes", price, category) VALUES
--   ('Limpieza Facial', 60, 50, 'facial'),
--   ('Peeling Químico', 45, 75, 'facial');
-- INSERT INTO professionals (name) VALUES ('Estilista 1');
-- INSERT INTO professional_services (professional_id, service_id) SELECT 1, id FROM services;
-- INSERT INTO professional_schedule (professional_id, day_of_week, start_time, end_time)
--   SELECT 1, d, '09:00', '18:00' FROM generate_series(1, 6) AS d;
