import { BrowserRouter, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Assets from "./pages/Assets";
import Parts from "./pages/Parts";
import WorkOrders from "./pages/WorkOrders";
import Schedules from "./pages/Schedules";
import Reports from "./pages/Reports";
import Users from "./pages/Users";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="assets" element={<Assets />} />
          <Route path="parts" element={<Parts />} />
          <Route path="work-orders" element={<WorkOrders />} />
          <Route path="schedules" element={<Schedules />} />
          <Route path="reports" element={<Reports />} />
          <Route path="users" element={<Users />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
