import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const nav = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/sale", label: "New sale" },
  { to: "/orders", label: "Orders" },
  { to: "/products", label: "Products" },
  { to: "/categories", label: "Categories", adminOnly: true },
  { to: "/inventory", label: "Inventory" },
  { to: "/settings", label: "Shop settings", adminOnly: true },
  { to: "/reports", label: "Reports", adminOnly: true },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const links = nav.filter((n) => !n.adminOnly || user?.role === "admin");

  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      <aside className="border-b border-slate-200 bg-white lg:w-56 lg:border-b-0 lg:border-r lg:min-h-screen">
        <div className="flex items-center justify-between gap-3 px-4 py-4 lg:flex-col lg:items-stretch">
          <div>
            <p className="text-lg font-semibold text-brand-700">QuickBill</p>
            <p className="text-xs text-slate-500">Retail shop billing</p>
          </div>
          <div className="hidden rounded-lg bg-slate-100 px-3 py-2 text-xs lg:block">
            <p className="font-medium text-slate-800">{user?.name}</p>
            <p className="capitalize text-slate-600">{user?.role}</p>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-3 lg:flex-col lg:px-3">
          {links.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                [
                  "whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition",
                  isActive
                    ? "bg-brand-600 text-white shadow-sm"
                    : "text-slate-700 hover:bg-slate-100",
                ].join(" ")
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden px-3 pb-6 lg:block">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Log out
          </button>
        </div>
      </aside>

      <main className="flex-1">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <div>
            <p className="text-sm font-semibold">{user?.name}</p>
            <p className="text-xs capitalize text-slate-500">{user?.role}</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700"
          >
            Log out
          </button>
        </header>
        <div className="mx-auto max-w-6xl px-4 py-6">{children}</div>
      </main>
    </div>
  );
}
