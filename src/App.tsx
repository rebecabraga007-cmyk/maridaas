import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
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
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;