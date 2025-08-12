import { NavLink, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plane } from "lucide-react";
import ThemeLangSwitcher from "@/components/layout/ThemeLangSwitcher";
import { useAuth } from "@/context/AuthContext";

const Header = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  
  const navCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? "text-primary font-medium" : "text-muted-foreground hover:text-foreground";
    
  const handleItineraryClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const lastTripId = localStorage.getItem('lastViewedTripId');
    if (lastTripId) {
      navigate(`/itinerary/${lastTripId}`);
    } else {
      navigate('/trips');
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur supports-[backdrop-filter]:bg-background/70 border-b border-border">
      <div className="container flex h-16 items-center justify-between">
        <NavLink to="/" className="flex items-center gap-2" aria-label="GlobeTrotter home">
          <Plane className="h-5 w-5 text-primary" />
          <span className="font-poppins text-lg font-semibold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            GlobeTrotter
          </span>
        </NavLink>

        {isAuthenticated && (
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <NavLink to="/" end className={navCls}>
              Home
            </NavLink>
            <NavLink to="/dashboard" className={navCls}>
              Dashboard
            </NavLink>
            <NavLink to="/trips" className={navCls} end>
              My Trips
            </NavLink>
            <NavLink 
              to="#"
              onClick={(e) => {
                e.preventDefault();
                if (!isAuthenticated) {
                  return;
                }
                
                // For testing: Clear localStorage and navigate to sample trip
                localStorage.removeItem('globetrotter_app_state_v1');
                localStorage.setItem('lastViewedTripId', 'sample-trip-001');
                navigate('/itinerary/sample-trip-001');
             }}
              className={({ isActive }) => isActive ? 'text-primary font-medium' : 'text-muted-foreground hover:text-foreground'}
            >
              Itinerary
            </NavLink>
            <NavLink to="/search/cities" className={navCls}>
              Cities
            </NavLink>
            <NavLink to="/search/activities" className={navCls}>
              Activities
            </NavLink>
            <NavLink to="/budget" className={navCls}>
              Budget
            </NavLink>
            <NavLink to="/calendar" className={navCls}>
              Calendar
            </NavLink>
            <NavLink to="/ai-planner" className={navCls}>
              AI Planner
            </NavLink>
          </nav>
        )}

        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <NavLink to="/profile" className="text-sm text-muted-foreground hover:text-foreground">
                Profile
              </NavLink>
              <Button 
                variant="hero" 
                size="lg" 
                disabled={!isAuthenticated}
                onClick={() => isAuthenticated && navigate('/create-trip')}
              >
                Plan New Trip
              </Button>
            </>
          ) : (
            <>
              <NavLink to="/login" className="text-sm text-muted-foreground hover:text-foreground">
                Log in
              </NavLink>
              <Button 
                variant="hero" 
                size="lg"
                onClick={() => navigate('/signup')}
              >
                Sign up
              </Button>
            </>
          )}
          <ThemeLangSwitcher />
        </div>
      </div>
    </header>
  );
};

export default Header;
