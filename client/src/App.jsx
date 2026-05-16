import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";
import Layout from "./components/Layout.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import ProductsPage from "./pages/ProductsPage.jsx";
import CategoriesPage from "./pages/CategoriesPage.jsx";
import NewSalePage from "./pages/NewSalePage.jsx";
import OrdersPage from "./pages/OrdersPage.jsx";
import InventoryPage from "./pages/InventoryPage.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";
import ReportsPage from "./pages/ReportsPage.jsx";

function Shell({ children }) {
  return <Layout>{children}</Layout>;
}

export default function App() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-600">Starting…</p>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route
          path="/"
          element={
            <Shell>
              <DashboardPage />
            </Shell>
          }
        />
        <Route
          path="/sale"
          element={
            <Shell>
              <NewSalePage />
            </Shell>
          }
        />
        <Route
          path="/orders"
          element={
            <Shell>
              <OrdersPage />
            </Shell>
          }
        />
        <Route
          path="/products"
          element={
            <Shell>
              <ProductsPage />
            </Shell>
          }
        />
        <Route
          path="/inventory"
          element={
            <Shell>
              <InventoryPage />
            </Shell>
          }
        />
      </Route>

      <Route element={<ProtectedRoute roles={["admin"]} />}>
        <Route
          path="/categories"
          element={
            <Shell>
              <CategoriesPage />
            </Shell>
          }
        />
        <Route
          path="/settings"
          element={
            <Shell>
              <SettingsPage />
            </Shell>
          }
        />
        <Route
          path="/reports"
          element={
            <Shell>
              <ReportsPage />
            </Shell>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
