import { Link, useNavigate } from "react-router-dom";
import { Plane } from "lucide-react";
import { pnrStorage } from "../utils/storage";

const PRODUCT_LINKS = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/booking", label: "My Booking" },
  { to: "/chat", label: "AI Assistant" },
  { to: "/escalations", label: "Escalations" },
];

// Support/Privacy/Terms have no dedicated pages in this product yet, so they
// render as plain static labels rather than dead links.
const INFO_LINKS = ["Support / Help", "Privacy", "Terms"];

export default function Footer() {
  const navigate = useNavigate();

  function handleNav(to, event) {
    if (to !== "/dashboard" && !pnrStorage.get()) {
      event.preventDefault();
      navigate("/dashboard");
    }
  }

  return (
    <footer className="mx-auto mt-8 w-full max-w-6xl border-t border-white/10 px-4 pb-6 pt-6 md:px-6">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-xs">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg btn-gradient text-white">
              <Plane size={13} />
            </div>
            <span className="font-bold tracking-tight text-white/85">AeroResolve AI</span>
          </Link>
          <p className="mt-1.5 text-xs text-white/40">AI Resolution Platform for airline disruptions.</p>
        </div>

        <div className="flex flex-wrap gap-x-10 gap-y-4 text-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/35">Product</p>
            <ul className="mt-2 space-y-1.5">
              {PRODUCT_LINKS.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    onClick={(event) => handleNav(link.to, event)}
                    className="text-white/55 hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/35">Company</p>
            <ul className="mt-2 space-y-1.5">
              {INFO_LINKS.map((label) => (
                <li key={label} className="text-white/40">
                  {label}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <p className="mt-6 border-t border-white/5 pt-4 text-xs text-white/30">
        © {new Date().getFullYear()} AeroResolve AI. All rights reserved.
      </p>
    </footer>
  );
}
