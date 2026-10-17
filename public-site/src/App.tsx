import { useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { BackgroundGlow } from "./components/layout/BackgroundGlow";
import { Footer } from "./components/layout/Footer";
import { Header } from "./components/layout/Header";
import { CertificateRequestPage } from "./pages/CertificateRequestPage";
import { LandingPage } from "./pages/LandingPage";
import { TrackRequestPage } from "./pages/TrackRequestPage";
import { ServiceDetailPage } from "./pages/ServiceDetailPage";

// Reset scroll on route change (anchor scrolling within a page still works).
function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) { window.scrollTo({ top: 0 }); return; }
    const frame = requestAnimationFrame(() => document.getElementById(hash.slice(1))?.scrollIntoView());
    return () => cancelAnimationFrame(frame);
  }, [pathname, hash]);
  return null;
}

export default function App() {
  return (
    <div className="min-h-screen overflow-x-clip text-ink">
      <BackgroundGlow />
      <ScrollToTop />
      <Header />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/request-certificate" element={<CertificateRequestPage />} />
        <Route path="/track" element={<TrackRequestPage />} />
        <Route path="/services/:serviceId" element={<ServiceDetailPage />} />
      </Routes>
      <Footer />
    </div>
  );
}
