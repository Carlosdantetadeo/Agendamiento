# Guía de Configuración: Lumière Skin Studio

Esta carpeta contiene los archivos necesarios para tu aplicación de reserva de citas.

## 1. Backend (Node.js)
El archivo `server.js` es el middleware que conecta tu app con Google Calendar.

### Requisitos:
- Node.js instalado.
- Paquetes: `npm install express googleapis cors dotenv`

### Variables de Entorno (.env):
Crea un archivo `.env` en tu servidor con:
```env
GOOGLE_SERVICE_ACCOUNT_EMAIL=tu-email@proyecto.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_CALENDAR_ID=tu-id-de-calendario@group.calendar.google.com
PORT=3000
```

---

## 2. Frontend (React Native / Expo)
El archivo `App.tsx` es el código para tu aplicación móvil.

### Requisitos:
- Proyecto Expo creado: `npx create-expo-app MiApp -t expo-template-blank-typescript`
- Paquetes: `npx expo install @react-native-community/datetimepicker lucide-react-native`

### Nota importante:
En `App.tsx`, busca la línea del `fetch` y cambia `https://tu-servidor.com` por la URL real donde despliegues tu backend.

---

## 3. Configuración de Google Cloud
1. **Habilitar API**: En Google Cloud Console, busca y activa "Google Calendar API".
2. **Cuenta de Servicio**: 
   - Crea una "Service Account".
   - Genera una clave JSON y descárgala.
   - Copia el `client_email` y la `private_key` a tus variables de entorno.
3. **Compartir Calendario**: 
   - Abre Google Calendar en tu navegador.
   - Ve a Configuración del calendario -> Compartir con personas específicas.
   - Añade el email de la Service Account con permiso de **"Realizar cambios en eventos"**.
