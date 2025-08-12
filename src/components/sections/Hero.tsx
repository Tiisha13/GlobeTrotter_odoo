import { motion, useScroll, useTransform } from "framer-motion";
import hero from "@/assets/hero-travel.jpg";
import mascot from "@/assets/mascot-plane.png";
import { Button } from "@/components/ui/button";
import { NavLink } from "react-router-dom";
import { useI18n } from "@/context/I18nProvider";
import { useAuth } from "@/context/AuthContext";

const Hero = () => {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 300], [0, 80]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0.85]);

  const { t } = useI18n();
  const { isAuthenticated } = useAuth();
  return (
    <section className="relative overflow-hidden">
      <motion.div style={{ y, opacity }} className="absolute inset-0">
        <img src={hero} alt="Aerial coastline hero image for GlobeTrotter" className="h-[70vh] w-full object-cover" loading="eager" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/10 via-background/30 to-background" />
      </motion.div>

      <div className="container relative z-10 flex min-h-[70vh] flex-col items-start justify-center">
        <motion.h1
          className="font-poppins text-4xl md:text-6xl font-bold leading-tight max-w-3xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          Plan unforgettable journeys with a premium travel builder
        </motion.h1>
        <motion.p
          className="mt-4 max-w-2xl text-base md:text-lg text-muted-foreground"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          Build itineraries, track budgets, and discover popular cities — all in one delightful experience.
        </motion.p>

        <motion.div
          className="mt-8 flex flex-wrap gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {isAuthenticated ? (
            <>
              <NavLink to="/create-trip"><Button variant="hero" size="xl">{t('startPlanning')}</Button></NavLink>
              <NavLink to="/trips"><Button variant="secondary" size="xl">{t('viewTrips')}</Button></NavLink>
            </>
          ) : (
            <>
              <NavLink to="/signup"><Button variant="hero" size="xl">Sign up</Button></NavLink>
              <NavLink to="/login"><Button variant="secondary" size="xl">Log in</Button></NavLink>
            </>
          )}
        </motion.div>

        <motion.img
          src={mascot}
          alt="GlobeTrotter mascot"
          className="pointer-events-none absolute -right-2 -bottom-6 md:right-10 md:bottom-10 w-28 md:w-36 select-none"
          initial={{ y: 10, rotate: -4, opacity: 0 }}
          animate={{ y: [10, -6, 10], rotate: [-4, -2, -4], opacity: 1 }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
    </section>
  );
};

export default Hero;
