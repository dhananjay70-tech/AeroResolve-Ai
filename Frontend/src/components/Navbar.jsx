import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { LogOut, Plane } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { pnrStorage } from "../utils/storage";
import NotificationCenter from "./NotificationCenter";

const LINKS = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/booking", label: "My Booking" },
  { to: "/chat", label: "AI Assistant" },
  { to: "/escalations", label: "Escalations" },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  function handleNav(to, event) {
    if (to !== "/dashboard" && !pnrStorage.get()) {
      event.preventDefault();
      navigate("/dashboard");
    }
  }

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <motion.header
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="sticky top-4 z-40 mx-auto hidden w-[95%] max-w-6xl items-center justify-between rounded-[20px] glass px-5 py-3 md:flex"
    >
      <Link to="/dashboard" className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg btn-gradient text-white">
          <Plane size={16} />
        </div>
        <div className="leading-none">
          <span className="block font-bold tracking-tight">AeroResolve AI</span>
          <span className="block text-[10px] font-medium uppercase tracking-widest text-white/35">
            AI Resolution Platform
          </span>
        </div>
      </Link>

      <nav className="flex items-center gap-1">
        {LINKS.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            onClick={(event) => handleNav(link.to, event)}
            className={({ isActive }) =>
              `rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
                isActive ? "bg-white/10 text-white" : "text-white/60 hover:text-white"
              }`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>

      <div className="relative flex items-center gap-3">
        <span className="hidden max-w-36 truncate text-sm font-medium text-white/60 lg:inline">
          {user?.fullName || user?.email}
        </span>
        <NotificationCenter />

        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          className="flex h-9 w-9 items-center justify-center rounded-full btn-gradient text-sm font-bold text-white cursor-pointer"
        >
          {user?.fullName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "A"}
        </button>

        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute right-0 top-11 w-52 rounded-2xl glass p-3 text-sm"
          >
            <p className="truncate font-semibold text-white/90">
              {user?.fullName || "AeroResolve Customer"}
            </p>
            <p className="truncate text-xs text-white/45">{user?.email}</p>
            <button
              type="button"
              onClick={handleLogout}
              className="mt-3 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-rose-300 hover:bg-rose-500/10 cursor-pointer"
            >
              <LogOut size={15} />
              Log out
            </button>
          </motion.div>
        )}
      </div>
    </motion.header>
  );
}
