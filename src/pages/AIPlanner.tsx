import Header from "@/components/layout/Header";
import Seo from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import LottiePlayer from "@/components/ui/LottiePlayer";
import { motion, AnimatePresence, useAnimationControls } from "framer-motion";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { useEffect, useMemo, useRef, useState } from "react";
import { 
  Mic, Send, Paperclip, Leaf, Download, Globe2, CloudSun, DollarSign, 
  ChevronRight, ChevronLeft, Search, Menu, User, Bot, MapPin, Calendar,
  Users, CreditCard, Train, Bus, Plane, Hotel, Star, Eye, EyeOff,
  Plus, Settings, LogOut, X
} from "lucide-react";
import { chatWithAI, processVoiceInput, getTravelAlerts, getAITravelTips } from '@/services/api';

// Define types locally to avoid import issues
interface IChatMessage { 
  id: string; 
  role: 'ai' | 'user'; 
  text: string;
}

interface IActivity {
  id: string;
  time: string;
  name: string;
  cost: number;
  weather: string;
  crowd?: number;
  thumb?: string;
}

interface IDayPlan {
  id: string;
  date: string;
  city: string;
  budget: number;
  activities: IActivity[];
}

interface ITripContext {
  destinations?: string[];
  start_date?: string;
  end_date?: string;
  duration_days?: number;
  budget_total?: number;
  currency?: string;
  travelers_adults?: number;
  travelers_children?: number;
  transport_pref?: 'train' | 'bus' | 'flight' | 'any' | 'not_sure';
  accommodation?: string;
  restrictions?: string[];
  eco_mode?: boolean;
}

const formatCurrency = (n: number) => new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

const CountUp = ({ value }: { value: number }) => {
  const [display, setDisplay] = useState(0);
  useState(() => {
    const from = display;
    const to = value;
    const start = performance.now();
    const duration = 650;
    let raf: number;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const current = Math.round(from + (to - from) * eased);
      setDisplay(current);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  });
  return <span>{formatCurrency(display)}</span>;
};

const HeatBar = ({ value }: { value: number }) => (
  <div className="h-2 w-16 rounded-full bg-muted overflow-hidden" aria-label={`Crowd level ${Math.round(value * 100)}%`}>
    <div className="h-full" style={{ width: `${Math.round(value * 100)}%`, background: 'linear-gradient(90deg, #2ECC71, #FF7043)' }} />
  </div>
);

// Animation variants for typewriter effect
const typewriterVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.6,
      ease: [0.16, 1, 0.3, 1],
    },
  }),
};

// Animation variants for container
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.2,
    },
  },
};

// Typewriter effect component for animated text display
const TypewriterText = ({ text, delay = 0, onComplete = () => {} }: { text: string; delay?: number; onComplete?: () => void }) => {
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (text.length === 0) return;
    
    let timeoutId: NodeJS.Timeout;
    
    if (currentIndex < text.length) {
      // Add a small random delay between characters for a more natural typing effect
      const typingSpeed = Math.random() * 30 + 10; // 10-40ms per character
      
      timeoutId = setTimeout(() => {
        setDisplayText(text.substring(0, currentIndex + 1));
        setCurrentIndex(prev => prev + 1);
      }, typingSpeed);
    } else if (!isComplete) {
      setIsComplete(true);
      onComplete();
    }

    return () => clearTimeout(timeoutId);
  }, [text, currentIndex, isComplete, onComplete]);

  // Reset when text changes
  useEffect(() => {
    setDisplayText('');
    setCurrentIndex(0);
    setIsComplete(false);
  }, [text]);

  return (
    <span>
      {displayText}
      {!isComplete && <span className="animate-pulse">|</span>}
    </span>
  );
};

const AIPlanner = () => {
  const [stage, setStage] = useState<'chat' | 'hybrid'>('hybrid'); // Start in hybrid mode
  const [showItinerary, setShowItinerary] = useState(true); // Always show itinerary
  const [historyOpen, setHistoryOpen] = useState(false); // Left sidebar for history
  const [itineraryOpen, setItineraryOpen] = useState(false); // Right sidebar for itinerary
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>({});
  const [messages, setMessages] = useState<IChatMessage[]>([]);
  const [ctx, setCtx] = useState<ITripContext>({});
  const [resultJson, setResultJson] = useState<any | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const daysInitial: IDayPlan[] = useMemo(() => ([
    {
      id: 'd1', date: '2024-12-01', city: 'Your Dream Destination', budget: 450,
      activities: [
        { id: 'a1', time: '09:00', name: '🌅 Morning Exploration', cost: 25, weather: 'sunny', crowd: 0.3 },
        { id: 'a2', time: '12:00', name: '🍽️ Local Cuisine Experience', cost: 35, weather: 'sunny', crowd: 0.5 },
        { id: 'a3', time: '15:00', name: '🏛️ Cultural Discovery', cost: 20, weather: 'sunny', crowd: 0.6 },
        { id: 'a4', time: '18:00', name: '🌆 Evening Adventure', cost: 40, weather: 'clear', crowd: 0.4 },
      ]
    },
    {
      id: 'd2', date: '2024-12-02', city: 'Adventure Awaits', budget: 380,
      activities: [
        { id: 'a5', time: '08:30', name: '🚶 Nature Walk', cost: 15, weather: 'sunny', crowd: 0.3 },
        { id: 'a6', time: '11:00', name: '🎨 Art & Culture', cost: 30, weather: 'sunny', crowd: 0.4 },
        { id: 'a7', time: '14:00', name: '🛍️ Shopping District', cost: 50, weather: 'partly cloudy', crowd: 0.7 },
        { id: 'a8', time: '19:00', name: '🍷 Dinner & Entertainment', cost: 45, weather: 'clear', crowd: 0.6 },
      ]
    },
    {
      id: 'd3', date: '2024-12-03', city: 'Perfect Finale', budget: 320,
      activities: [
        { id: 'a9', time: '10:00', name: '📸 Scenic Views', cost: 20, weather: 'sunny', crowd: 0.4 },
        { id: 'a10', time: '13:00', name: '🏖️ Relaxation Time', cost: 25, weather: 'sunny', crowd: 0.3 },
        { id: 'a11', time: '16:00', name: '🎁 Souvenir Hunt', cost: 35, weather: 'sunny', crowd: 0.5 },
      ]
    },
  ]), []);
  const [days, setDays] = useState<IDayPlan[]>(daysInitial); // Start with intelligent default itinerary
  const [draggedActivity, setDraggedActivity] = useState<IActivity | null>(null);
  const [budgetAnimation, setBudgetAnimation] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number>(0);
  const isFirstLoad = days.length === 0;
  const totalDays = days.length;
  const totalBudget = days.reduce((sum, day) => sum + day.budget, 0);
  const totalActivitiesCost = days.reduce((sum, day) => 
    sum + day.activities.reduce((daySum, activity) => daySum + activity.cost, 0), 0
  );
  const controls = useAnimationControls();

  const gradient = 'from-[#2979FF] to-[#8E24AA]';

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    setCtx((c) => ({ ...c }));
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
    }
  }, [query]);

  function parseUserInput(input: string, prev: ITripContext): ITripContext {
    const next: ITripContext = { ...prev };
    const lower = input.toLowerCase();

    // Destination(s): naive parse by pre-known cities; fallback capture capitalized words
    const knownCities = ['tokyo', 'kyoto', 'paris', 'goa', 'bali', 'lisbon', 'new york', 'singapore', 'london', 'rome'];
    const foundCities = knownCities.filter((c) => lower.includes(c));
    if (foundCities.length) next.destinations = Array.from(new Set([...(next.destinations ?? []), ...foundCities.map((c) => c.replace(/\b\w/g, (m) => m.toUpperCase()))]));

    // Dates (YYYY-MM-DD)
    const dateMatches = input.match(/\d{4}-\d{2}-\d{2}/g);
    if (dateMatches?.length) {
      if (!next.start_date) next.start_date = dateMatches[0];
      if (dateMatches[1]) next.end_date = dateMatches[1];
    }
    // Duration
    const dur = input.match(/(\d+)\s*day/);
    if (dur) next.duration_days = Number(dur[1]);

    // Budget with currency
    const budget = input.match(/([€$₹£])\s?(\d{1,3}(?:[,\s]?\d{3})*|\d+)/);
    if (budget) {
      const symbol = budget[1];
      const numeric = Number((budget[2] || '').replace(/[^\d]/g, ''));
      next.budget_total = numeric;
      next.currency = symbol === '$' ? 'USD' : symbol === '€' ? 'EUR' : symbol === '₹' ? 'INR' : symbol === '£' ? 'GBP' : 'USD';
    }

    // Travelers
    const adults = input.match(/(\d+)\s*(adult|people|person|traveler)s?/i);
    if (adults) next.travelers_adults = Number(adults[1]);
    const children = input.match(/(\d+)\s*(child|children)/i);
    if (children) next.travelers_children = Number(children[1]);

    // Transport
    if (lower.includes('train')) next.transport_pref = 'train';
    else if (lower.includes('bus')) next.transport_pref = 'bus';
    else if (lower.includes('flight') || lower.includes('plane')) next.transport_pref = 'flight';
    else if (lower.includes('any')) next.transport_pref = 'any';
    else if (lower.includes("don't know") || lower.includes('not sure')) next.transport_pref = 'not_sure';

    // Accommodation
    if (lower.includes('hostel')) next.accommodation = 'hostel';
    else if (lower.includes('homestay')) next.accommodation = 'homestay';
    else if (lower.includes('5 star') || lower.includes('five star')) next.accommodation = '5-star-hotel';
    else if (lower.includes('3 star') || lower.includes('three star')) next.accommodation = '3-star-hotel';
    else if (lower.includes('hotel')) next.accommodation = 'hotel';

    // Restrictions
    const restrictions: string[] = [];
    if (lower.includes('vegetarian')) restrictions.push('vegetarian');
    if (lower.includes('vegan')) restrictions.push('vegan');
    if (lower.includes('wheelchair')) restrictions.push('wheelchair');
    if (restrictions.length) next.restrictions = Array.from(new Set([...(next.restrictions ?? []), ...restrictions]));

    return next;
  }

  function hasPrereqs(c: ITripContext): boolean {
    const hasDates = (!!c.start_date && !!c.end_date) || !!c.duration_days;
    return !!(c.destinations && c.destinations.length > 0 && hasDates && (c.budget_total || c.budget_total === 0) && (c.travelers_adults || c.travelers_adults === 0));
  }

  function buildJsonItinerary(c: ITripContext) {
    // Derive dates if only duration provided
    let start = c.start_date;
    let end = c.end_date;
    if (!start && c.duration_days) {
      const today = new Date();
      const s = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 14);
      start = s.toISOString().slice(0, 10);
      const e = new Date(s);
      e.setDate(e.getDate() + (c.duration_days - 1));
      end = e.toISOString().slice(0, 10);
    }

    const title = `${(c.destinations ?? ['Trip']).map((d) => d[0].toUpperCase() + d.slice(1)).join(' & ')} – GlobeTrotter Plan`;
    const currency = c.currency || 'USD';
    const totalDays = c.duration_days ?? (start && end ? Math.max(1, Math.round((new Date(end).getTime() - new Date(start).getTime()) / (1000*60*60*24)) + 1) : days.length);
    const totalBudget = c.budget_total ?? totalDays * 300;

    const cityMeta: Record<string, { country: string; lat: number; lng: number }>= {
      tokyo: { country: 'Japan', lat: 35.6762, lng: 139.6503 },
      kyoto: { country: 'Japan', lat: 35.0116, lng: 135.7681 },
      paris: { country: 'France', lat: 48.8566, lng: 2.3522 },
      goa: { country: 'India', lat: 15.2993, lng: 74.1240 },
      bali: { country: 'Indonesia', lat: -8.4095, lng: 115.1889 },
      lisbon: { country: 'Portugal', lat: 38.7223, lng: -9.1393 },
      'new york': { country: 'USA', lat: 40.7128, lng: -74.0060 },
      singapore: { country: 'Singapore', lat: 1.3521, lng: 103.8198 },
      london: { country: 'UK', lat: 51.5072, lng: -0.1276 },
      rome: { country: 'Italy', lat: 41.9028, lng: 12.4964 },
    };

    const cities = (c.destinations ?? ['tokyo']).map((name, ci) => {
      const key = name.toLowerCase();
      const meta = cityMeta[key] ?? { country: 'Unknown', lat: 0, lng: 0 };
      const dayStartIndex = ci * Math.max(1, Math.floor(totalDays / (c.destinations?.length || 1)));
      const cityDays = Math.max(1, Math.floor(totalDays / (c.destinations?.length || 1)));

      const cityDaysArr = Array.from({ length: cityDays }).map((_, i) => {
        const d = new Date(start || new Date());
        d.setDate(d.getDate() + dayStartIndex + i);
        const dateStr = d.toISOString().slice(0, 10);
        const srcDay = days[i % days.length];
        return {
          day_number: dayStartIndex + i + 1,
          date: dateStr,
          activities: srcDay.activities.map((a) => ({
            activity_id: a.id,
            time: a.time,
            name: a.name,
            description: `${a.name} – placeholder description`,
            estimated_cost: a.cost,
            currency,
            crowd_score: Math.round(a.crowd * 100),
            weather_summary: a.weather,
            place_coords: { lat: meta.lat + (Math.random()-0.5)*0.02, lng: meta.lng + (Math.random()-0.5)*0.02 }
          })),
          daily_budget_total: srcDay.budget,
        };
      });

      return {
        city_name: name[0].toUpperCase() + name.slice(1),
        country: meta.country,
        arrival: { date: start || '', time: '09:00', by: (c.transport_pref && c.transport_pref!=='any' && c.transport_pref!=='not_sure') ? c.transport_pref : 'train' },
        departure: { date: end || '', time: '18:00', by: (c.transport_pref && c.transport_pref!=='any' && c.transport_pref!=='not_sure') ? c.transport_pref : 'train' },
        hotels: [
          { hotel_id: 'h1', name: 'Central Garden Hotel', rating: 4.4, price_per_night: 160, currency, distance_from_center_km: 1.2, blacklisted: false },
          { hotel_id: 'h2', name: 'Eco Stay Riverside', rating: 4.2, price_per_night: 130, currency, distance_from_center_km: 2.1, blacklisted: false },
        ],
        days: cityDaysArr,
        transport_options: {
          train: [ { id: 't1', depart_time: '08:00', arrive_time: '10:30', duration: '2h30m', price: 70, provider: 'JR', booking_link: '#' } ],
          bus: [ { id: 'b1', depart_time: '08:30', arrive_time: '12:00', duration: '3h30m', price: 40, provider: 'KBus', booking_link: '#' } ],
          flight: [ { id: 'f1', depart_time: '09:15', arrive_time: '10:20', duration: '1h05m', price: 120, provider: 'J-Air', booking_link: '#' } ],
        },
      };
    });

    const firstCity = cities[0];
    const map_center = { lat: (firstCity as any).days[0].activities[0].place_coords.lat, lng: (firstCity as any).days[0].activities[0].place_coords.lng, zoom: 6 };

    const payload = {
      ui_actions: {
        collapse_chat: true,
        animate_itinerary: 'drip' as const,
        map_center,
        open_panel: 'itinerary' as const,
      },
      trip: {
        trip_title: title,
        total_days: totalDays,
        start_date: start || '',
        end_date: end || '',
        total_budget: totalBudget,
        currency,
        eco_mode: false,
        cities,
      },
      pdf_payload: {
        title: title,
        content_html: `<html><head><meta charset=\"utf-8\"/><title>${title}</title></head><body><h1>${title}</h1><p>${totalDays} days • Budget ${formatCurrency(totalBudget)}</p></body></html>`
      }
    };

    return payload;
  }

  const handleSubmit = async () => {
    if (!query.trim()) return;

    const userMsg: IChatMessage = { id: `u_${Date.now()}`, role: 'user', text: query.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setQuery('');
    setIsTyping(true);

    try {
      const data = await chatWithAI(newMessages, ctx);
      setIsTyping(false);

      let updatedCtx = ctx;
      if (data.context) {
        updatedCtx = { ...ctx, ...data.context } as ITripContext;
        setCtx(updatedCtx);
      }

      if (data.response) {
        setMessages(prev => [...prev, { id: `a_${Date.now()}`, role: 'ai', text: data.response }]);
      }

      if (data.ui_actions?.open_panel === 'itinerary' || hasPrereqs(updatedCtx)) {
        setStage('hybrid');
        setShowItinerary(true);
        controls.start("visible");
      }

      // Handle both itinerary and trip_plan from backend
      const tripData = data.itinerary || data.trip_plan;
      if (tripData) {
        setResultJson({ trip: tripData } as any);
        // Transform trip plan to days format for the frontend
        if (tripData.cities) {
          const transformedDays = tripData.cities.flatMap((city: any) => 
            city.days.map((day: any) => ({
              id: `d${day.day_number}`,
              date: day.date,
              city: city.city_name,
              budget: day.daily_budget_total,
              activities: day.activities.map((activity: any) => ({
                id: activity.activity_id,
                time: activity.time,
                name: activity.name,
                cost: activity.estimated_cost,
                weather: activity.weather_summary || 'sunny',
                crowd: (activity.crowd_score || 50) / 100
              }))
            }))
          );
          setDays(transformedDays);
        }
        setShowItinerary(true);
        setStage('hybrid');
      }
    } catch (error) {
      setIsTyping(false);
      const errorMsg = error instanceof Error ? error.message : 'An unknown error occurred.';
      console.error('Error getting AI response:', errorMsg);
      setMessages(prev => [...prev, { id: `a_err_${Date.now()}`, role: 'ai', text: `Sorry, I encountered an error: ${errorMsg}` }]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Voice input functionality
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/wav' });
        await processVoiceMessage(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setAudioChunks([]);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
    }
  };

  const processVoiceMessage = async (audioBlob: Blob) => {
    setIsTyping(true);
    try {
      const voiceResult = await processVoiceInput(audioBlob);
      
      // Add transcribed message as user message
      const userMsg: IChatMessage = { 
        id: `u_${Date.now()}`, 
        role: 'user', 
        text: voiceResult.transcription 
      };
      const newMessages = [...messages, userMsg];
      setMessages(newMessages);

      // Process the transcribed message through our AI backend
      const data = await chatWithAI(newMessages, ctx);
      setIsTyping(false);

      let updatedCtx = ctx;
      if (data.context) {
        updatedCtx = { ...ctx, ...data.context } as ITripContext;
        setCtx(updatedCtx);
      }

      if (data.response) {
        setMessages(prev => [...prev, { id: `a_${Date.now()}`, role: 'ai', text: data.response }]);
      }

      if (data.ui_actions?.open_panel === 'itinerary' || hasPrereqs(updatedCtx)) {
        setStage('hybrid');
        setShowItinerary(true);
        controls.start("visible");
      }

      // Handle both itinerary and trip_plan from backend
      const tripData = data.itinerary || data.trip_plan;
      if (tripData) {
        setResultJson({ trip: tripData } as any);
        // Transform trip plan to days format for the frontend
        if (tripData.cities) {
          const transformedDays = tripData.cities.flatMap((city: any) => 
            city.days.map((day: any) => ({
              id: `d${day.day_number}`,
              date: day.date,
              city: city.city_name,
              budget: day.daily_budget_total,
              activities: day.activities.map((activity: any) => ({
                id: activity.activity_id,
                time: activity.time,
                name: activity.name,
                cost: activity.estimated_cost,
                weather: activity.weather_summary || 'sunny',
                crowd: (activity.crowd_score || 50) / 100
              }))
            }))
          );
          setDays(transformedDays);
        }
        setShowItinerary(true);
        setStage('hybrid');
      }
    } catch (error) {
      setIsTyping(false);
      const errorMsg = error instanceof Error ? error.message : 'Voice processing failed';
      console.error('Error processing voice input:', errorMsg);
      setMessages(prev => [...prev, { id: `a_err_${Date.now()}`, role: 'ai', text: `Sorry, I couldn't process your voice input: ${errorMsg}` }]);
    }
  };

  const handleVoiceToggle = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // Intelligent drag-and-drop handlers with real-time price updates
  const handleDragStart = (start: any) => {
    const { draggableId } = start;
    const activity = days.flatMap(day => day.activities).find(act => act.id === draggableId);
    setDraggedActivity(activity || null);
  };

  const handleDragEnd = (result: any) => {
    const { destination, source, draggableId } = result;
    setDraggedActivity(null);

    if (!destination) return;

    // Find source and destination days
    const sourceDayIndex = parseInt(source.droppableId.replace('day-', ''));
    const destDayIndex = parseInt(destination.droppableId.replace('day-', ''));
    
    if (sourceDayIndex === destDayIndex && source.index === destination.index) return;

    const newDays = [...days];
    const sourceDay = newDays[sourceDayIndex];
    const destDay = newDays[destDayIndex];
    
    // Remove activity from source
    const [movedActivity] = sourceDay.activities.splice(source.index, 1);
    
    // Add activity to destination with intelligent cost adjustment
    const adjustedActivity = {
      ...movedActivity,
      cost: calculateIntelligentCost(movedActivity, destDay, destDayIndex)
    };
    
    destDay.activities.splice(destination.index, 0, adjustedActivity);
    
    // Update budgets intelligently
    sourceDay.budget = recalculateDayBudget(sourceDay);
    destDay.budget = recalculateDayBudget(destDay);
    
    setDays(newDays);
    
    // Animate budget change
    setBudgetAnimation(true);
    setTimeout(() => setBudgetAnimation(false), 1000);
  };

  const calculateIntelligentCost = (activity: IActivity, targetDay: IDayPlan, dayIndex: number): number => {
    // Intelligent cost adjustment based on day position, weather, and crowd
    let baseCost = activity.cost;
    
    // Weekend premium (assuming day 6-7 are weekends)
    if (dayIndex % 7 >= 5) baseCost *= 1.15;
    
    // Weather impact
    if (activity.weather === 'rainy') baseCost *= 0.9; // Discounts on rainy days
    if (activity.weather === 'sunny') baseCost *= 1.05; // Premium for sunny days
    
    // Crowd impact
    const crowdLevel = activity.crowd || 0.5;
    if (crowdLevel > 0.8) baseCost *= 1.1; // High crowd premium
    if (crowdLevel < 0.3) baseCost *= 0.95; // Low crowd discount
    
    return Math.round(baseCost);
  };

  const recalculateDayBudget = (day: IDayPlan): number => {
    const activitiesCost = day.activities.reduce((sum, act) => sum + act.cost, 0);
    const accommodationCost = activitiesCost * 0.4; // 40% for accommodation
    const mealsCost = activitiesCost * 0.3; // 30% for meals
    return Math.round(activitiesCost + accommodationCost + mealsCost);
  };

  // Intelligent auto-generation based on user message context
  const generateIntelligentItinerary = (userMessage: string): IDayPlan[] => {
    const message = userMessage.toLowerCase();
    
    // Detect destination from message
    const destinations = {
      'tokyo': { city: 'Tokyo', country: 'Japan', activities: ['🏯 Temple Visit', '🍣 Sushi Experience', '🌸 Cherry Blossoms', '🚅 Bullet Train'] },
      'paris': { city: 'Paris', country: 'France', activities: ['🗼 Eiffel Tower', '🎨 Louvre Museum', '🥐 French Café', '🛍️ Champs-Élysées'] },
      'london': { city: 'London', country: 'UK', activities: ['🏰 Tower Bridge', '🎭 West End Show', '☕ Afternoon Tea', '🚌 Double Decker Tour'] },
      'goa': { city: 'Goa', country: 'India', activities: ['🏖️ Beach Relaxation', '🌴 Coconut Grove', '🍤 Seafood Feast', '🌅 Sunset Cruise'] },
      'ahmedabad': { city: 'Ahmedabad', country: 'India', activities: ['🕌 Heritage Walk', '🍛 Gujarati Thali', '🏛️ Sabarmati Ashram', '🎨 Textile Museum'] },
      'surat': { city: 'Surat', country: 'India', activities: ['💎 Diamond Market', '🏛️ Dutch Garden', '🍽️ Street Food', '🌊 Tapi Riverfront'] }
    };

    // Detect budget type
    const isEconomical = message.includes('economical') || message.includes('budget') || message.includes('cheap');
    const isLuxury = message.includes('luxury') || message.includes('premium') || message.includes('expensive');
    
    // Detect duration
    const durationMatch = message.match(/(\d+)\s*(day|days)/);
    const duration = durationMatch ? parseInt(durationMatch[1]) : 3;

    // Find destination
    const detectedDest = Object.keys(destinations).find(dest => message.includes(dest));
    const destInfo = detectedDest ? destinations[detectedDest] : destinations['tokyo'];

    // Generate budget based on type
    const baseBudget = isEconomical ? 200 : isLuxury ? 800 : 400;
    
    // Generate intelligent itinerary
    const generatedDays: IDayPlan[] = [];
    for (let i = 0; i < Math.min(duration, 5); i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      
      const dayActivities = destInfo.activities.slice(0, 3 + i % 2).map((activity, idx) => ({
        id: `gen_a${i}_${idx}`,
        time: `${9 + idx * 3}:00`,
        name: activity,
        cost: Math.round((baseBudget / 8) * (0.8 + Math.random() * 0.4)),
        weather: ['sunny', 'partly cloudy', 'clear'][Math.floor(Math.random() * 3)],
        crowd: 0.3 + Math.random() * 0.4
      }));

      generatedDays.push({
        id: `gen_d${i + 1}`,
        date: date.toISOString().split('T')[0],
        city: `${destInfo.city} - Day ${i + 1}`,
        budget: Math.round(baseBudget * (0.8 + Math.random() * 0.4)),
        activities: dayActivities
      });
    }

    return generatedDays;
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    
    const newDays = [...days];
    const [movedDay] = newDays.splice(result.source.index, 1);
    newDays.splice(result.destination.index, 0, movedDay);
    
    setDays(newDays);
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] relative overflow-hidden">
      <Seo title="GlobeTrotter AI – Plan Your Dream Trip" description="AI-powered travel planning with interactive itinerary builder." />
      
      {/* Left Sidebar Toggle Button - History */}
      <button 
        onClick={() => setHistoryOpen(!historyOpen)}
        className="fixed left-6 bottom-6 z-[100] p-3 bg-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[hsl(var(--primary))]"
        aria-label={historyOpen ? 'Hide History' : 'Show History'}
      >
        {historyOpen ? (
          <ChevronLeft className="h-6 w-6 text-gray-700" />
        ) : (
          <ChevronRight className="h-6 w-6 text-gray-700" />
        )}
      </button>

      {/* Right Sidebar Toggle Button - Itinerary */}
      <button 
        onClick={() => setItineraryOpen(!itineraryOpen)}
        className="fixed right-6 bottom-6 z-[100] p-3 bg-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[hsl(var(--primary))]"
        aria-label={itineraryOpen ? 'Hide Itinerary' : 'Show Itinerary'}
      >
        {itineraryOpen ? (
          <ChevronRight className="h-6 w-6 text-gray-700" />
        ) : (
          <ChevronLeft className="h-6 w-6 text-gray-700" />
        )}
      </button>

      {/* Stage 1: Full-Screen Chatbot Mode */}
      <AnimatePresence mode="wait">
        {stage === 'chat' && (
          <motion.div
            key="chat-stage"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-10 flex flex-col"
            style={{ pointerEvents: 'none' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6">
              <div className="flex items-center gap-2">
                <Globe2 className="h-6 w-6 text-[hsl(var(--primary))]" />
                <span className="font-poppins text-xl font-semibold gradient-ai-text">GlobeTrotter AI</span>
              </div>
              <div className="flex items-center gap-4 text-[hsl(var(--foreground))]">
                <button className="p-2 rounded-full hover:bg-gray-100 transition-all">
                  <Settings className="h-5 w-5 text-gray-700" />
                </button>
              </div>
            </div>

            {/* Left Sidebar - History */}
            <AnimatePresence>
              {historyOpen && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30"
                    onClick={() => setHistoryOpen(false)}
                    style={{ pointerEvents: 'auto' }}
                  />
                  <motion.div
                    initial={{ x: '-100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '-100%' }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    className="fixed top-0 left-0 h-full w-full sm:w-96 bg-white shadow-xl z-40 overflow-y-auto"
                    onClick={(e) => e.stopPropagation()}
                    style={{ pointerEvents: 'auto' }}
                  >
                    <div className="p-4 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10">
                      <h2 className="text-lg font-semibold">Trip History</h2>
                      <button 
                        onClick={() => setHistoryOpen(false)}
                        className="p-1 rounded-full hover:bg-gray-100"
                        aria-label="Close history"
                      >
                        <X className="h-5 w-5 text-gray-500" />
                      </button>
                    </div>
                    <div className="p-4 space-y-4">
                      <h3 className="font-medium text-gray-900 mb-2">Recent Trips</h3>
                      <div className="space-y-3">
                        {[
                          { id: 't1', name: 'Japan Adventure', date: 'Nov 1-7, 2024', location: 'Tokyo, Kyoto' },
                          { id: 't2', name: 'European Tour', date: 'Aug 15-30, 2024', location: 'Paris, Rome, Barcelona' },
                          { id: 't3', name: 'Beach Getaway', date: 'May 5-12, 2024', location: 'Bali, Indonesia' }
                        ].map(trip => (
                          <div key={trip.id} className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors">
                            <div className="font-medium">{trip.name}</div>
                            <div className="text-sm text-gray-600">{trip.location}</div>
                            <div className="text-xs text-gray-500 mt-1">{trip.date}</div>
                          </div>
                        ))}
                      </div>
                      <button className="w-full mt-4 px-4 py-2 bg-gradient-to-r from-[#2979FF] to-[#8E24AA] text-white rounded-lg hover:opacity-90 transition-opacity">
                        Start New Trip
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>

            {/* Right Sidebar - Itinerary */}
            <AnimatePresence>
              {itineraryOpen && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30"
                    onClick={() => setItineraryOpen(false)}
                    style={{ pointerEvents: 'auto' }}
                  />
                  <motion.div
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '100%' }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    className="fixed top-0 right-0 h-full w-full sm:w-[400px] bg-white shadow-xl z-40 overflow-y-auto"
                    onClick={(e) => e.stopPropagation()}
                    style={{ pointerEvents: 'auto' }}
                  >
                    <div className="p-4 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10">
                      <h2 className="text-lg font-semibold">Your Itinerary</h2>
                      <div className="flex items-center gap-2">
                        <button className="p-1 rounded-full hover:bg-gray-100">
                          <Download className="h-5 w-5 text-gray-500" />
                        </button>
                        <button 
                          onClick={() => setItineraryOpen(false)}
                          className="p-1 rounded-full hover:bg-gray-100"
                          aria-label="Close itinerary"
                        >
                          <X className="h-5 w-5 text-gray-500" />
                        </button>
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-medium">Trip Summary</h3>
                        <span className="text-sm text-gray-500">3 days • 2 cities</span>
                      </div>
                      
                      <DragDropContext onDragEnd={onDragEnd}>
                        <Droppable droppableId="itinerary-days">
                          {(provided) => (
                            <div 
                              {...provided.droppableProps} 
                              ref={provided.innerRef}
                              className="space-y-4"
                            >
                              {days.map((day, index) => (
                                <Draggable key={day.id} draggableId={day.id} index={index}>
                                  {(provided) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      className="border rounded-lg overflow-hidden"
                                    >
                                      <div 
                                        {...provided.dragHandleProps}
                                        className="bg-gray-50 p-3 border-b flex justify-between items-center"
                                      >
                                        <div>
                                          <h4 className="font-medium">Day {index + 1}</h4>
                                          <p className="text-sm text-gray-500">{day.city} • {day.date}</p>
                                        </div>
                                        <div className="text-sm font-medium">
                                          {formatCurrency(day.budget)}
                                        </div>
                                      </div>
                                      <div className="p-3 space-y-3">
                                        {day.activities.map((activity, aIndex) => (
                                          <div key={activity.id} className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded">
                                            <div className="mt-1">
                                              <div className="w-3 h-3 rounded-full border-2 border-blue-500 flex-shrink-0" />
                                            </div>
                                            <div className="flex-1">
                                              <div className="flex justify-between">
                                                <span className="font-medium">{activity.name}</span>
                                                <span className="text-sm text-gray-500">{activity.time}</span>
                                              </div>
                                              <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                                <span>{activity.weather}</span>
                                                <span>•</span>
                                                <span>{formatCurrency(activity.cost)}</span>
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </Draggable>
                              ))}
                              {provided.placeholder}
                            </div>
                          )}
                        </Droppable>
                      </DragDropContext>
                      
                      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium">Total Budget:</span>
                          <span className="font-semibold">{formatCurrency(days.reduce((sum, day) => sum + day.budget, 0))}</span>
                        </div>
                        <div className="flex justify-between text-sm text-gray-600">
                          <span>Activities: {formatCurrency(days.flatMap(d => d.activities).reduce((sum, a) => sum + a.cost, 0))}</span>
                          <span>Hotels: {formatCurrency(0)}</span>
                          <span>Transport: {formatCurrency(0)}</span>
                        </div>
                      </div>
                      
                      <button className="w-full mt-4 px-4 py-2 bg-gradient-to-r from-[#2979FF] to-[#8E24AA] text-white rounded-lg hover:opacity-90 transition-opacity">
                        Book Now
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-6 pb-6" style={{ pointerEvents: 'auto' }}>
              <div className="flex-1 overflow-y-auto space-y-6 mb-6 max-h-[calc(100vh-200px)]">
                {messages.map((message, index) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex items-start gap-3 max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                          message.role === 'ai'
                            ? 'bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--secondary))] shadow-md'
                            : 'bg-gradient-to-br from-gray-100 to-gray-200 shadow-sm'
                        }`}
                      >
                        {message.role === 'ai' ? (
                          <Globe2 className="h-4.5 w-4.5 text-white" />
                        ) : (
                          <User className="h-4.5 w-4.5 text-gray-700" />
                        )}
                      </div>
                      <div
                        className={`rounded-2xl px-4 py-3 shadow max-w-full ${
                          message.role === 'ai'
                            ? 'bg-[hsl(var(--primary)/0.12)] border border-[hsl(var(--primary)/0.35)]'
                            : 'bg-white border border-[hsl(var(--border))]'
                        }`}
                      >
                        <p
                          className={
                            `text-[15px] md:text-[16px] leading-relaxed ` +
                            (message.role === 'user' ? 'text-gray-900' : 'text-[hsl(var(--foreground))]')
                          }
                        >
                          {message.text}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
                
                {/* Typing indicator */}
                {isTyping && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-start"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--secondary))] shadow-md">
                        <Globe2 className="h-4.5 w-4.5 text-white" />
                      </div>
                      <div className="bg-[hsl(var(--primary)/0.12)] border border-[hsl(var(--primary)/0.35)] rounded-2xl px-4 py-3">
                        <div className="flex gap-1.5">
                          <div className="w-2 h-2 bg-[hsl(var(--primary))] rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                          <div className="w-2 h-2 bg-[hsl(var(--secondary))] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                          <div className="w-2 h-2 bg-[hsl(var(--primary))] rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
                <div ref={chatEndRef} />
            </div>

            {/* Input Bar */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-3 border border-gray-100 shadow-sm">
              <div className="flex items-end gap-2">
                <button 
                  onClick={handleVoiceToggle}
                  className={`p-2.5 rounded-xl transition-all shadow-sm hover:shadow-md active:scale-95 ${
                    isRecording 
                      ? 'bg-gradient-to-br from-red-500 to-red-600 text-white animate-pulse' 
                      : 'bg-gradient-to-br from-gray-50 to-gray-100 text-gray-600 hover:from-gray-100 hover:to-gray-200'
                  }`}
                  aria-label={isRecording ? "Stop recording" : "Start voice input"}
                >
                  <Mic className="h-5 w-5" />
                </button>
                <div className="flex-1">
                  <textarea
                    ref={inputRef}
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      // Auto-generate intelligent itinerary as user types
                      if (e.target.value.trim().length > 2) {
                        const intelligentItinerary = generateIntelligentItinerary(e.target.value);
                        setDays(intelligentItinerary);
                        setBudgetAnimation(true);
                        setTimeout(() => setBudgetAnimation(false), 800);
                      }
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="Describe your dream trip..."
                    className="w-full bg-transparent border-none outline-none resize-none text-blue-600 placeholder-gray-500 text-[15px] leading-relaxed font-[450]"
                    rows={1}
                    style={{ 
                      minHeight: '40px', 
                      maxHeight: '160px',
                      scrollbarWidth: 'none',
                      msOverflowStyle: 'none',
                    }}
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <button 
                    className="p-2.5 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors"
                    aria-label="Attach files"
                  >
                    <Paperclip className="h-5 w-5" />
                  </button>
                  <button 
                    onClick={handleSubmit}
                    disabled={!query.trim()}
                    className="p-2.5 rounded-xl bg-gradient-to-br from-[hsl(var(--electric-blue))] to-[hsl(var(--violet))] text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                    aria-label="Send message"
                  >
                    <Send className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stage 2: Itinerary & Map Hybrid Mode (Not fully implemented in the provided code) */}
      <AnimatePresence>
        {stage === 'hybrid' && (
          <motion.div
            key="hybrid-stage"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex"
          >
            {/* Left: compact full-height chat column */}
            <div className="w-[360px] max-w-[360px] min-w-[320px] h-full bg-[hsl(var(--background))]/90 backdrop-blur-sm border-r border-[hsl(var(--border))] flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <div className="flex items-center gap-2 text-[hsl(var(--foreground))]">
                  <Globe2 className="h-5 w-5 text-[hsl(var(--primary))]" />
                  <span className="font-medium">GlobeTrotter AI</span>
                </div>
              </div>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                {messages.map((message) => (
                  <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`rounded-2xl px-3 py-2 text-sm max-w-[80%] shadow-sm ${message.role === 'ai' ? 'bg-[hsl(var(--primary)/0.10)] border border-[hsl(var(--primary)/0.25)] text-[hsl(var(--foreground))]' : 'bg-white border border-[hsl(var(--border))] text-blue-600'}`}>
                      {message.text}
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl px-3 py-2 text-sm bg-[hsl(var(--primary)/0.10)] border border-[hsl(var(--primary)/0.25)]">
                      <div className="flex gap-1.5">
                        <div className="w-2 h-2 bg-[hsl(var(--primary))] rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                        <div className="w-2 h-2 bg-[hsl(var(--secondary))] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                        <div className="w-2 h-2 bg-[hsl(var(--primary))] rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
              {/* Input */}
              <div className="p-3 border-t bg-[hsl(var(--background))]/80 backdrop-blur">
                <div className="flex items-end gap-2">
                  <textarea
                    ref={inputRef}
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      // Auto-generate intelligent itinerary as user types in hybrid mode too
                      if (e.target.value.trim().length > 2) {
                        const intelligentItinerary = generateIntelligentItinerary(e.target.value);
                        setDays(intelligentItinerary);
                        setBudgetAnimation(true);
                        setTimeout(() => setBudgetAnimation(false), 800);
                      }
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask the AI..."
                    className="flex-1 bg-white border border-[hsl(var(--border))] rounded-xl px-3 py-2 text-sm resize-none outline-none text-blue-600 placeholder-gray-400"
                    rows={1}
                    style={{ minHeight: '38px', maxHeight: '120px' }}
                  />
                  <button
                    onClick={handleSubmit}
                    disabled={!query.trim()}
                    className="p-2.5 rounded-xl bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--secondary))] text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Send message"
                  >
                    <Send className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Right: itinerary builder column */}
            <motion.div
              initial={{ x: '100%' }}
              animate={showItinerary ? { x: 0 } : { x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="flex-1 bg-white shadow-xl flex flex-col p-6 overflow-y-auto text-gray-900"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Globe2 className="h-6 w-6 text-[hsl(var(--primary))]" />
                  <h1 className="text-3xl leading-8 font-poppins font-extrabold text-[hsl(var(--primary))] drop-shadow-sm">Your Trip to {ctx.destinations?.[0] || '...'}</h1>
                </div>
                <div className="flex items-center gap-2 text-gray-800">
                  <Button variant="ghost" size="sm" className="bg-gray-100 text-gray-800">
                    <Download className="h-4 w-4 mr-2 text-gray-800" /> PDF
                  </Button>
                  <Button variant="ghost" size="sm" className="bg-gray-100 text-gray-800">
                    <LogOut className="h-4 w-4 mr-2 text-gray-800" /> End Trip
                  </Button>
                </div>
              </div>

              {/* Trip Summary */}
              <div className="flex items-center justify-between py-4 mb-4 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5" style={{ color: '#374151' }} />
                  <span className="font-medium text-sm" style={{ color: '#111827' }}>{ctx.duration_days || totalDays} Days</span>
                </div>
                <div className="flex items-center gap-3">
                  <DollarSign className="h-5 w-5 text-[hsl(var(--primary))]" />
                  <div className="flex flex-col text-right">
                    <motion.span 
                      className={`font-semibold text-lg transition-all duration-300 ${budgetAnimation ? 'scale-110 text-green-600' : ''}`}
                      style={{ color: budgetAnimation ? '#16a34a' : '#111827' }}
                      animate={budgetAnimation ? { scale: [1, 1.1, 1] } : {}}
                      transition={{ duration: 0.5 }}
                    >
                      <CountUp value={ctx.budget_total || totalBudget} />
                    </motion.span>
                    <span className="text-xs" style={{ color: '#374151' }}>
                      Total Budget {budgetAnimation && <span className="text-green-600">• Updated!</span>}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5" style={{ color: '#374151' }} />
                  <span className="font-medium text-sm" style={{ color: '#111827' }}>
                    {ctx.travelers_adults || 2} Traveler(s)
                  </span>
                </div>
              </div>
              
              {/* Day-by-Day Itinerary */}
              <DragDropContext onDragEnd={handleDragEnd} onDragStart={handleDragStart}>
                <div className="space-y-6">
                  {days.map((day, dayIndex) => (
                    <motion.div
                      key={day.id}
                      variants={typewriterVariants}
                      initial="hidden"
                      animate={controls}
                      custom={dayIndex}
                      className="bg-white p-6 rounded-2xl shadow-md border border-gray-200 hover:shadow-lg transition-shadow"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-poppins text-lg font-semibold text-gray-900">Day {dayIndex + 1} - {day.city}</h3>
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <Calendar className="h-4 w-4" />
                          <span>{day.date}</span>
                          <motion.div 
                            className="ml-2 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium"
                            animate={budgetAnimation ? { scale: [1, 1.1, 1] } : {}}
                          >
                            ${day.budget}
                          </motion.div>
                        </div>
                      </div>
                      
                      {/* Activities Drop Zone */}
                      <Droppable droppableId={`day-${dayIndex}`}>
                        {(provided, snapshot) => (
                          <div 
                            {...provided.droppableProps} 
                            ref={provided.innerRef}
                            className={`space-y-4 min-h-[100px] p-4 rounded-xl transition-all ${
                              snapshot.isDraggingOver 
                                ? 'bg-blue-50 border-2 border-blue-300 border-dashed' 
                                : 'bg-gray-50'
                            }`}
                          >
                            {day.activities.map((activity, activityIndex) => (
                              <Draggable key={activity.id} draggableId={activity.id} index={activityIndex}>
                                {(provided, snapshot) => (
                                  <motion.div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className={`flex items-center gap-4 group cursor-pointer p-3 rounded-lg transition-all ${
                                      snapshot.isDragging 
                                        ? 'bg-white shadow-lg scale-105 rotate-2' 
                                        : 'bg-white hover:bg-blue-50 hover:shadow-md'
                                    }`}
                                    whileHover={{ scale: 1.02 }}
                                    whileDrag={{ scale: 1.05, rotate: 2 }}
                                  >
                                    <div className="flex flex-col items-center">
                                      <span className="text-sm text-gray-700 font-medium">{activity.time}</span>
                                      <div className="w-px h-8 bg-gray-200 group-last:hidden" />
                                    </div>
                                    <div className="flex-1 flex gap-4 items-center">
                                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center flex-shrink-0">
                                        <MapPin className="h-5 w-5 text-[hsl(var(--primary))]" />
                                      </div>
                                      <div className="flex-1">
                                        <h4 className="font-medium text-gray-900">{activity.name}</h4>
                                        <div className="flex items-center text-xs text-gray-700 mt-1 gap-3">
                                          <div className="flex items-center gap-1">
                                            <CloudSun className="h-3.5 w-3.5" />
                                            <span className="capitalize">{activity.weather}</span>
                                          </div>
                                          <div className="flex items-center gap-1">
                                            <Users className="h-3.5 w-3.5" />
                                            <HeatBar value={activity.crowd || 0.5} />
                                          </div>
                                          <motion.div 
                                            className="flex items-center gap-1"
                                            animate={draggedActivity?.id === activity.id ? { scale: [1, 1.2, 1] } : {}}
                                          >
                                            <DollarSign className="h-3.5 w-3.5 text-green-600" />
                                            <span className="font-semibold text-green-600">{formatCurrency(activity.cost)}</span>
                                          </motion.div>
                                        </div>
                                      </div>
                                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="w-6 h-6 rounded bg-gray-200 flex items-center justify-center">
                                          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                                          <div className="w-2 h-2 bg-gray-400 rounded-full ml-1"></div>
                                        </div>
                                      </div>
                                    </div>
                                  </motion.div>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                            {day.activities.length === 0 && (
                              <div className="text-center py-8 text-gray-500">
                                <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p>Drop activities here</p>
                              </div>
                            )}
                          </div>
                        )}
                      </Droppable>
                    </motion.div>
                  ))}
                </div>
              </DragDropContext>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AIPlanner;