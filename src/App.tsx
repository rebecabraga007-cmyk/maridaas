import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LoadingFallback from "./components/LoadingFallback";

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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/feed" element={<Feed />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/profile/:userId" element={<PublicProfile />} />
            <Route path="/services" element={<Services />} />
            <Route path="/neighborhoods" element={<Neighborhoods />} />
            <Route path="/neighborhoods/:neighborhoodId" element={<NeighborhoodView />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/messages/:userId" element={<Messages />} />
            <Route path="/inbox" element={<Inbox />} />
            <Route path="/premium" element={<Premium />} />
            <Route path="/privacidade" element={<PrivacyPolicy />} />
            <Route path="/termos" element={<TermsOfService />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
