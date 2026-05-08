import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, HashRouter, Routes, Route } from "react-router-dom";

// Em build nativo (Capacitor/WKWebView/Android WebView) usamos HashRouter
// para evitar quebra de rotas, já que o WebView serve via file:// ou capacitor://.
const isNative =
  typeof window !== "undefined" &&
  (window.location.protocol === "capacitor:" ||
    window.location.protocol === "file:" ||
    // @ts-ignore - Capacitor injetado em runtime
    !!(window as any).Capacitor?.isNativePlatform?.());

const Router = isNative ? HashRouter : BrowserRouter;
import LoadingFallback from "./components/LoadingFallback";
import ErrorBoundary from "./components/ErrorBoundary";
import ProtectedRoute from "./components/ProtectedRoute";

const Landing = lazy(() => import("./pages/Landing"));
const Auth = lazy(() => import("./pages/Auth"));
const Feed = lazy(() => import("./pages/Feed"));
const Profile = lazy(() => import("./pages/Profile"));
const Services = lazy(() => import("./pages/Services"));
const Neighborhoods = lazy(() => import("./pages/Neighborhoods"));
const PublicProfile = lazy(() => import("./pages/PublicProfile"));
const NeighborhoodView = lazy(() => import("./pages/NeighborhoodView"));
const Admin = lazy(() => import("./pages/Admin"));
const Messages = lazy(() => import("./pages/Messages"));
const Inbox = lazy(() => import("./pages/Inbox"));
const Premium = lazy(() => import("./pages/Premium"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 2, // 2 minutes
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <Router>
        <ErrorBoundary>
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/auth" element={<Auth />} />
              <Route element={<ProtectedRoute />}>
                <Route path="/feed" element={<Feed />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/profile/:userId" element={<PublicProfile />} />
                <Route path="/services" element={<Services />} />
                <Route path="/neighborhoods" element={<Neighborhoods />} />
                <Route path="/neighborhoods/:neighborhoodId" element={<NeighborhoodView />} />
                <Route path="/messages/:userId" element={<Messages />} />
                <Route path="/inbox" element={<Inbox />} />
                <Route path="/premium" element={<Premium />} />
              </Route>
              <Route element={<ProtectedRoute requireAdmin />}>
                <Route path="/admin" element={<Admin />} />
              </Route>
              <Route path="/privacidade" element={<PrivacyPolicy />} />
              <Route path="/termos" element={<TermsOfService />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </Router>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
