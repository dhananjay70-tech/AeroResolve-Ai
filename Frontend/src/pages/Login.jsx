import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertCircle, Lock, Mail, Plane, User } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import GlassCard from "../components/GlassCard";
import ActionButton from "../components/ActionButton";
import FloatingAircraft from "../components/FloatingAircraft";
import AmbientBackground from "../components/AmbientBackground";

export default function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState("signin");
  const [form, setForm] = useState({ email: "", password: "", fullName: "" });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");
  const [loading, setLoading] = useState(false);

  function validate() {
    const nextErrors = {};
    if (!/^\S+@\S+\.\S+$/.test(form.email)) nextErrors.email = "Enter a valid email address.";
    if (form.password.length < 8) nextErrors.password = "Password must be at least 8 characters.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setApiError("");
    if (!validate()) return;

    setLoading(true);
    try {
      if (mode === "signin") {
        await login(form.email, form.password);
      } else {
        await register(form.email, form.password, form.fullName);
      }
      navigate("/dashboard");
    } catch (error) {
      setApiError(error.message);
    } finally {
      setLoading(false);
    }
  }

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <AmbientBackground />

      <div className="grid w-full max-w-5xl items-center gap-12 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center lg:text-left"
        >
          <div className="mb-6 inline-flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg btn-gradient text-white">
              <Plane size={17} />
            </div>
            <span className="font-bold tracking-tight">AeroResolve AI</span>
          </div>

          <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl">
            Your disruption.
            <br />
            <span className="text-gradient">Resolved intelligently.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-white/55 lg:mx-0">
            AI-powered airline assistance for faster, policy-aware resolutions.
          </p>

          <div className="mt-12 hidden lg:block">
            <FloatingAircraft size={260} />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
        >
          <GlassCard glow className="mx-auto max-w-sm p-8">
            <h2 className="text-xl font-bold">
              {mode === "signin" ? "Welcome back" : "Create your account"}
            </h2>
            <p className="mt-1 text-sm text-white/50">
              {mode === "signin"
                ? "Sign in to manage your journey."
                : "Set up access to your resolution dashboard."}
            </p>

            <form onSubmit={handleSubmit} className="mt-7 space-y-4">
              {mode === "signup" && (
                <div>
                  <label htmlFor="fullName" className="mb-1.5 block text-xs font-medium text-white/50">
                    Full name
                  </label>
                  <div className="flex items-center gap-2 rounded-xl bg-white/5 px-3.5 py-3 ring-1 ring-white/10 focus-within:ring-violet-400/60">
                    <User size={16} className="text-white/40" />
                    <input
                      id="fullName"
                      type="text"
                      autoComplete="name"
                      value={form.fullName}
                      onChange={(event) => updateField("fullName", event.target.value)}
                      className="w-full bg-transparent text-sm outline-none placeholder-white/30"
                      placeholder="Priya Nair"
                    />
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-white/50">
                  Email
                </label>
                <div className="flex items-center gap-2 rounded-xl bg-white/5 px-3.5 py-3 ring-1 ring-white/10 focus-within:ring-violet-400/60">
                  <Mail size={16} className="text-white/40" />
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={(event) => updateField("email", event.target.value)}
                    className="w-full bg-transparent text-sm outline-none placeholder-white/30"
                    placeholder="you@aeroresolve.com"
                  />
                </div>
                {errors.email && (
                  <p className="mt-1.5 text-xs text-rose-300">{errors.email}</p>
                )}
              </div>

              <div>
                <label htmlFor="password" className="mb-1.5 block text-xs font-medium text-white/50">
                  Password
                </label>
                <div className="flex items-center gap-2 rounded-xl bg-white/5 px-3.5 py-3 ring-1 ring-white/10 focus-within:ring-violet-400/60">
                  <Lock size={16} className="text-white/40" />
                  <input
                    id="password"
                    type="password"
                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
                    value={form.password}
                    onChange={(event) => updateField("password", event.target.value)}
                    className="w-full bg-transparent text-sm outline-none placeholder-white/30"
                    placeholder="••••••••"
                  />
                </div>
                {errors.password && (
                  <p className="mt-1.5 text-xs text-rose-300">{errors.password}</p>
                )}
              </div>

              {apiError && (
                <div className="flex items-center gap-2 rounded-lg bg-rose-500/10 px-3 py-2.5 text-sm text-rose-300">
                  <AlertCircle size={15} className="shrink-0" />
                  {apiError}
                </div>
              )}

              <ActionButton type="submit" loading={loading} className="mt-2 w-full">
                {mode === "signin" ? "Sign In" : "Create Account"}
              </ActionButton>
            </form>

            <button
              type="button"
              onClick={() => {
                setMode((prev) => (prev === "signin" ? "signup" : "signin"));
                setApiError("");
                setErrors({});
              }}
              className="mt-5 w-full text-center text-xs font-medium text-white/45 hover:text-white/70 cursor-pointer"
            >
              {mode === "signin"
                ? "New here? Create an account"
                : "Already have an account? Sign in"}
            </button>
          </GlassCard>
        </motion.div>
      </div>
    </div>
  );
}
