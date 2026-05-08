import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, HashRouter, Routes, Route } from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary";
import ProtectedRoute from "./components/ProtectedRoute";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Feed from "./pages/Feed";
import Profile from "./pages/Profile";
import Services from "./pages/Services";
import Neighborhoods from "./pages/Neighborhoods";
import PublicProfile from "./pages/PublicProfile";
import NeighborhoodView from "./pages/NeighborhoodView";
import Admin from "./pages/Admin";
import Messages from "./pages/Messages";
import Inbox from "./pages/Inbox";
import Premium from "./pages/Premium";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import NotFound from "./pages/NotFound";

// Em build nativo (Capacitor/WKWebView/Android WebView) usamos HashRouter
// para evitar quebra de rotas, já que o WebView serve via file:// ou capacitor://.
const isNative =
  typeof window !== "undefined" &&
  (window.location.protocol === "capacitor:" ||
    window.location.protocol === "file:" ||
    // @ts-ignore - Capacitor injetado em runtime
    !!(window as any).Capacitor?.isNativePlatform?.());

const Router = isNative ? HashRouter : BrowserRouter;

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
        </ErrorBoundary>
      </Router>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
