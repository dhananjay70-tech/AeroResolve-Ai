import { Navigate, Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "../hooks/useAuth";
import { NotificationsProvider } from "../context/NotificationsContext";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import Footer from "../components/Footer";
import AmbientBackground from "../components/AmbientBackground";
import LoadingScreen from "../components/LoadingScreen";

export default function DashboardLayout() {
  const { isAuthenticated, initializing } = useAuth();
  const location = useLocation();

  if (initializing) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <NotificationsProvider>
      <div className="relative min-h-screen">
        <AmbientBackground />
        <Navbar />
        <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-8 md:px-6 md:pb-16">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
          <Footer />
        </main>
        <Sidebar />
      </div>
    </NotificationsProvider>
  );
}
