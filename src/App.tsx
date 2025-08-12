import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import Dashboard from "./pages/Dashboard";
import CreateTrip from "./pages/CreateTrip";
import Trips from "./pages/TripsNew";
import Itinerary from "./pages/Itinerary";
import ItineraryView from "./pages/ItineraryView";
import { ThemeProvider } from "@/context/ThemeProvider";
import { I18nProvider } from "@/context/I18nProvider";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import ShareItinerary from "@/pages/ShareItinerary";
import CitySearch from "@/pages/CitySearch";
import ActivitySearch from "@/pages/ActivitySearch";
import Budget from "@/pages/Budget";
import CalendarView from "@/pages/CalendarView";
import Profile from "@/pages/Profile";
import Admin from "@/pages/Admin";
import AIPlanner from "@/pages/AIPlanner";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

// Protected route wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Public route wrapper (for auth pages)
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <I18nProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AuthProvider>
                <Routes>
                  {/* Public Routes */}
                  <Route path="/" element={<Index />} />
                  <Route path="/login" element={
                    <PublicRoute>
                      <Login />
                    </PublicRoute>
                  } />
                  <Route path="/signup" element={
                    <PublicRoute>
                      <SignUp />
                    </PublicRoute>
                  } />

                  {/* Protected Routes */}
                  <Route
                    path="/dashboard"
                    element={
                      <ProtectedRoute>
                        <Dashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/create-trip"
                    element={
                      <ProtectedRoute>
                        <CreateTrip />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/trips"
                    element={
                      <ProtectedRoute>
                        <Trips />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/itinerary/:tripId"
                    element={
                      <ProtectedRoute>
                        <Itinerary />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/itinerary/:tripId/view"
                    element={
                      <ProtectedRoute>
                        <ItineraryView />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/share/:shareId"
                    element={
                      <ProtectedRoute>
                        <ShareItinerary />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/search/cities"
                    element={
                      <ProtectedRoute>
                        <CitySearch />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/search/activities"
                    element={
                      <ProtectedRoute>
                        <ActivitySearch />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/budget"
                    element={
                      <ProtectedRoute>
                        <Budget />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/calendar"
                    element={
                      <ProtectedRoute>
                        <CalendarView />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/profile"
                    element={
                      <ProtectedRoute>
                        <Profile />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin"
                    element={
                      <ProtectedRoute>
                        <Admin />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/ai-planner"
                    element={
                      <ProtectedRoute>
                        <AIPlanner />
                      </ProtectedRoute>
                    }
                  />

                  {/* 404 Route */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </AuthProvider>
            </BrowserRouter>
          </TooltipProvider>
        </I18nProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};
export default App;
