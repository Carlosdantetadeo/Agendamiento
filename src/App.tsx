import { Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import AppointmentPage from "./pages/AppointmentPage";
import AdminPage from "./pages/AdminPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/cita/:token" element={<AppointmentPage />} />
      <Route path="/admin" element={<AdminPage />} />
    </Routes>
  );
}
