import { Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage.tsx";
import AppointmentPage from "./pages/AppointmentPage.tsx";
import AdminPage from "./pages/AdminPage.tsx";
import ProfessionalDetailPage from "./pages/ProfessionalDetailPage.tsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/cita/:token" element={<AppointmentPage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="/admin/professional/:id" element={<ProfessionalDetailPage />} />
    </Routes>
  );
}
