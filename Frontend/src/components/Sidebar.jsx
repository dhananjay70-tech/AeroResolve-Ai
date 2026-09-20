import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, MessageCircle, ShieldAlert, Ticket } from "lucide-react";
import { pnrStorage } from "../utils/storage";

const LINKS = [
  { to: "/dashboard", label: "Home", icon: LayoutDashboard },
  { to: "/booking", label: "Booking", icon: Ticket },
  { to: "/chat", label: "Assistant", icon: MessageCircle },
  { to: "/escalations", label: "Escalate", icon: ShieldAlert },
];

export default function Sidebar() {
  const navigate = useNavigate();

  function handleNav(to, event) {
    if (to !== "/dashboard" && !pnrStorage.get()) {
      event.preventDefault();
      navigate("/dashboard");
    }
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-white/10 bg-black/70 px-2 py-2 backdrop-blur-xl md:hidden">
      {LINKS.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          onClick={(event) => handleNav(to, event)}
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 rounded-lg px-3 py-1.5 text-[11px] font-medium ${
              isActive ? "text-violet-300" : "text-white/50"
            }`
          }
        >
          <Icon size={19} />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
