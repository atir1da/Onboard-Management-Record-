import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  MapPin, 
  Calendar, 
  Navigation, 
  Compass, 
  Anchor, 
  Clock, 
  ArrowRight, 
  Search, 
  Gauge, 
  Info, 
  Activity, 
  Map, 
  Layers, 
  Sliders, 
  Ship, 
  ChevronDown, 
  ChevronUp, 
  Play, 
  Pause, 
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  HelpCircle,
  Lock,
  Unlock,
  Save
} from "lucide-react";
import { WORLDWIDE_FLAGS } from "../constants/maritimeData";
import { getExpandedPortsForCountry } from "../constants/expandedPorts";

interface Port {
  name: string;
  code: string;
  lat: string;
  lng: string;
  latDeg: number;
  lngDeg: number;
}

function getPortsForCountry(countryName: string): Port[] {
  return getExpandedPortsForCountry(countryName);
}

function parseCoordinateToDecimal(coordStr: string, isLat: boolean): number {
  if (!coordStr) return 0;
  const cleaned = coordStr.trim().toUpperCase();
  
  // 1. Check if it's already a clean decimal float
  if (/^-?\d+(\.\d+)?$/.test(cleaned)) {
    return parseFloat(cleaned);
  }
  
  // 2. Match standard degrees, minutes, direction: e.g. "41° 18.00' N" or "41 18.00 N"
  const match = cleaned.match(/(\d+(?:\.\d+)?)\s*[°d]?\s*(\d+(?:\.\d+)?)\s*['′]?\s*([NSEW])/);
  if (match) {
    const deg = parseFloat(match[1]);
    const min = parseFloat(match[2]) || 0;
    const dir = match[3];
    let dec = deg + min / 60;
    if (dir === "S" || dir === "W") {
      dec = -dec;
    }
    return dec;
  }
  
  // 3. General numeric float extract fallback
  const numMatch = cleaned.match(/-?\d+(?:\.\d+)?/);
  if (numMatch) {
    let val = parseFloat(numMatch[0]);
    if (cleaned.includes("S") || cleaned.includes("W")) {
      val = -Math.abs(val);
    }
    return val;
  }
  
  return 0;
}

function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3440.065; // Earth radius in Nautical Miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return Math.round(d);
}

export default function VoyagePlanning() {
  const vesselName = useMemo(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sms_vesselName") || "PACIFIC SENTINEL";
    }
    return "PACIFIC SENTINEL";
  }, []);

  // Parse flags & country data from constants
  const parsedNations = useMemo(() => {
    return WORLDWIDE_FLAGS.map((f, idx) => {
      const parts = f.split(" ");
      const flag = parts[parts.length - 1]; // Flag emoji is at the end
      const country = parts.slice(0, parts.length - 1).join(" ");
      return {
        country,
        flag: flag || "🌐"
      };
    });
  }, []);

  // Country selection states
  const [depCountry, setDepCountry] = useState<any>(() => {
    const savedDep = typeof window !== "undefined" ? localStorage.getItem("sms_voyage_dep_country") : null;
    return parsedNations.find(n => savedDep ? n.country === savedDep : n.country.includes("Singapore")) || parsedNations[0];
  });
  
  const [arrCountry, setArrCountry] = useState<any>(() => {
    const savedArr = typeof window !== "undefined" ? localStorage.getItem("sms_voyage_arr_country") : null;
    return parsedNations.find(n => savedArr ? n.country === savedArr : n.country.includes("China")) || parsedNations[1];
  });

  // Available ports based on country selection
  const depPorts = useMemo(() => getPortsForCountry(depCountry.country), [depCountry]);
  const arrPorts = useMemo(() => getPortsForCountry(arrCountry.country), [arrCountry]);

  // Selected ports
  const [selectedDepPort, setSelectedDepPort] = useState<Port>(() => {
    const savedPortCode = typeof window !== "undefined" ? localStorage.getItem("sms_voyage_dep_port_code") : null;
    return depPorts.find(p => p.code === savedPortCode) || depPorts[0];
  });
  
  const [selectedArrPort, setSelectedArrPort] = useState<Port>(() => {
    const savedPortCode = typeof window !== "undefined" ? localStorage.getItem("sms_voyage_arr_port_code") : null;
    return arrPorts.find(p => p.code === savedPortCode) || arrPorts[0];
  });

  // Synchronize port state when country changes
  useEffect(() => {
    if (!depPorts.some(p => p.code === selectedDepPort?.code)) {
      setSelectedDepPort(depPorts[0]);
    }
  }, [depPorts]);

  useEffect(() => {
    if (!arrPorts.some(p => p.code === selectedArrPort?.code)) {
      setSelectedArrPort(arrPorts[0]);
    }
  }, [arrPorts]);

  const activeDepPort = selectedDepPort || depPorts[0];
  const activeArrPort = selectedArrPort || arrPorts[0];

  // Map Activation Gate State
  const [isMapActivated, setIsMapActivated] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sms_voyage_saved") === "true";
    }
    return false;
  });

  // Inputs & Overrides
  const [speed, setSpeed] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const savedSpeed = localStorage.getItem("sms_voyage_speed");
      if (savedSpeed) return parseFloat(savedSpeed);
    }
    return 15.0;
  });
  
  const [etd, setEtd] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const savedEtd = localStorage.getItem("sms_voyage_etd");
      if (savedEtd) return savedEtd;
    }
    return "2026-07-15T08:00";
  });

  // Dropdown states
  const [showDepDropdown, setShowDepDropdown] = useState(false);
  const [showArrDropdown, setShowArrDropdown] = useState(false);
  const [searchDep, setSearchDep] = useState("");
  const [searchArr, setSearchArr] = useState("");

  // Search filter
  const filteredDepNations = useMemo(() => {
    if (!searchDep.trim()) return parsedNations.slice(0, 50);
    return parsedNations.filter(
      n => n.country.toLowerCase().includes(searchDep.toLowerCase())
    );
  }, [parsedNations, searchDep]);

  const filteredArrNations = useMemo(() => {
    if (!searchArr.trim()) return parsedNations.slice(0, 50);
    return parsedNations.filter(
      n => n.country.toLowerCase().includes(searchArr.toLowerCase())
    );
  }, [parsedNations, searchArr]);

  // Editable calibrator coordinates
  const [depLatInput, setDepLatInput] = useState<string>("");
  const [depLngInput, setDepLngInput] = useState<string>("");
  const [arrLatInput, setArrLatInput] = useState<string>("");
  const [arrLngInput, setArrLngInput] = useState<string>("");

  // Saved calibrator coordinates
  const [savedDepCoords, setSavedDepCoords] = useState<{ lat: string; lng: string; latDeg: number; lngDeg: number } | null>(() => {
    if (typeof window !== "undefined") {
      const lat = localStorage.getItem("sms_voyage_saved_dep_lat");
      const lng = localStorage.getItem("sms_voyage_saved_dep_lng");
      const latDeg = localStorage.getItem("sms_voyage_saved_dep_lat_deg");
      const lngDeg = localStorage.getItem("sms_voyage_saved_dep_lng_deg");
      if (lat && lng && latDeg && lngDeg) {
        return { lat, lng, latDeg: parseFloat(latDeg), lngDeg: parseFloat(lngDeg) };
      }
    }
    return null;
  });

  const [savedArrCoords, setSavedArrCoords] = useState<{ lat: string; lng: string; latDeg: number; lngDeg: number } | null>(() => {
    if (typeof window !== "undefined") {
      const lat = localStorage.getItem("sms_voyage_saved_arr_lat");
      const lng = localStorage.getItem("sms_voyage_saved_arr_lng");
      const latDeg = localStorage.getItem("sms_voyage_saved_arr_lat_deg");
      const lngDeg = localStorage.getItem("sms_voyage_saved_arr_lng_deg");
      if (lat && lng && latDeg && lngDeg) {
        return { lat, lng, latDeg: parseFloat(latDeg), lngDeg: parseFloat(lngDeg) };
      }
    }
    return null;
  });

  // Synchronize inputs with ports if they haven't been manually edited/locked
  useEffect(() => {
    if (activeDepPort) {
      setDepLatInput(activeDepPort.lat);
      setDepLngInput(activeDepPort.lng);
    }
  }, [activeDepPort]);

  useEffect(() => {
    if (activeArrPort) {
      setArrLatInput(activeArrPort.lat);
      setArrLngInput(activeArrPort.lng);
    }
  }, [activeArrPort]);

  // Automatically computed Distance
  const distance = useMemo(() => {
    if (isMapActivated && savedDepCoords && savedArrCoords) {
      return calculateHaversineDistance(
        savedDepCoords.latDeg,
        savedDepCoords.lngDeg,
        savedArrCoords.latDeg,
        savedArrCoords.lngDeg
      );
    }

    const currentDepLat = parseCoordinateToDecimal(depLatInput, true);
    const currentDepLng = parseCoordinateToDecimal(depLngInput, false);
    const currentArrLat = parseCoordinateToDecimal(arrLatInput, true);
    const currentArrLng = parseCoordinateToDecimal(arrLngInput, false);

    const lat1 = !isNaN(currentDepLat) && currentDepLat !== 0 ? currentDepLat : (activeDepPort?.latDeg || 0);
    const lon1 = !isNaN(currentDepLng) && currentDepLng !== 0 ? currentDepLng : (activeDepPort?.lngDeg || 0);
    const lat2 = !isNaN(currentArrLat) && currentArrLat !== 0 ? currentArrLat : (activeArrPort?.latDeg || 0);
    const lon2 = !isNaN(currentArrLng) && currentArrLng !== 0 ? currentArrLng : (activeArrPort?.lngDeg || 0);

    return calculateHaversineDistance(lat1, lon1, lat2, lon2);
  }, [isMapActivated, savedDepCoords, savedArrCoords, depLatInput, depLngInput, arrLatInput, arrLngInput, activeDepPort, activeArrPort]);

  // Dynamic calculations
  const durationHours = useMemo(() => {
    if (speed <= 0 || isNaN(speed) || isNaN(distance) || distance <= 0) return 0;
    return distance / speed;
  }, [distance, speed]);

  const eta = useMemo(() => {
    if (durationHours <= 0) return "—";
    const etdDate = new Date(etd);
    if (isNaN(etdDate.getTime())) return "—";
    const etaDate = new Date(etdDate.getTime() + durationHours * 60 * 60 * 1000);
    
    // Format: YYYY-MM-DD HH:mm
    const yyyy = etaDate.getFullYear();
    const mm = String(etaDate.getMonth() + 1).padStart(2, "0");
    const dd = String(etaDate.getDate()).padStart(2, "0");
    const hh = String(etaDate.getHours()).padStart(2, "0");
    const min = String(etaDate.getMinutes()).padStart(2, "0");
    
    return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
  }, [etd, durationHours]);

  const formattedDuration = useMemo(() => {
    if (durationHours <= 0) return "0.0 hrs";
    const days = Math.floor(durationHours / 24);
    const remainingHours = Math.floor(durationHours % 24);
    const minutes = Math.round((durationHours % 1) * 60);
    
    let str = "";
    if (days > 0) str += `${days}d `;
    if (remainingHours > 0 || days > 0) str += `${remainingHours}h `;
    if (minutes > 0) str += `${minutes}m`;
    
    return `${str.trim()} (${durationHours.toFixed(1)} hrs)`;
  }, [durationHours]);

  // Device GPS Tracker
  const [gpsAnchor, setGpsAnchor] = useState<{ lat: string; lng: string }>({
    lat: "34° 02.40' N",
    lng: "118° 29.70' W"
  });

  useEffect(() => {
    const updateGps = () => {
      if (typeof window !== "undefined") {
        const lat = localStorage.getItem("sms_gps_lat") || "34° 02.40' N";
        const lng = localStorage.getItem("sms_gps_lng") || "118° 29.70' W";
        setGpsAnchor({ lat, lng });
      }
    };
    updateGps();
    const interval = setInterval(updateGps, 2000);
    return () => clearInterval(interval);
  }, []);

  // Map Scale States
  type MapScale = "general" | "coastal" | "approach" | "harbor";
  const [mapScale, setMapScale] = useState<MapScale>("general");

  // Route Playback Animation States
  const [isPlaying, setIsPlaying] = useState(false);
  const [simProgress, setSimProgress] = useState(40); // Initial 40% along the path

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying) {
      timer = setInterval(() => {
        setSimProgress((prev) => {
          if (prev >= 100) return 0; // Loop back
          return prev + 1;
        });
      }, 300);
    }
    return () => clearInterval(timer);
  }, [isPlaying]);

  // Notification Banner
  const [notification, setNotification] = useState<string | null>(null);
  const triggerNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSaveVoyagePlan = () => {
    if (depCountry.country === arrCountry.country && activeDepPort.code === activeArrPort.code) {
      triggerNotification("⚠️ Validation Error: Departure and Arrival ports cannot be identical.");
      return;
    }
    if (speed <= 0 || speed > 35) {
      triggerNotification("⚠️ Validation Error: Speed must be between 0.1 and 35.0 knots.");
      return;
    }
    const etdDate = new Date(etd);
    if (isNaN(etdDate.getTime())) {
      triggerNotification("⚠️ Validation Error: Departure time is invalid.");
      return;
    }

    // Capture, parse and lock coordinates
    const currentDepLat = parseCoordinateToDecimal(depLatInput, true);
    const currentDepLng = parseCoordinateToDecimal(depLngInput, false);
    const currentArrLat = parseCoordinateToDecimal(arrLatInput, true);
    const currentArrLng = parseCoordinateToDecimal(arrLngInput, false);

    const depCoords = {
      lat: depLatInput || activeDepPort.lat,
      lng: depLngInput || activeDepPort.lng,
      latDeg: !isNaN(currentDepLat) && currentDepLat !== 0 ? currentDepLat : activeDepPort.latDeg,
      lngDeg: !isNaN(currentDepLng) && currentDepLng !== 0 ? currentDepLng : activeDepPort.lngDeg
    };

    const arrCoords = {
      lat: arrLatInput || activeArrPort.lat,
      lng: arrLngInput || activeArrPort.lng,
      latDeg: !isNaN(currentArrLat) && currentArrLat !== 0 ? currentArrLat : activeArrPort.latDeg,
      lngDeg: !isNaN(currentArrLng) && currentArrLng !== 0 ? currentArrLng : activeArrPort.lngDeg
    };

    setSavedDepCoords(depCoords);
    setSavedArrCoords(arrCoords);

    // Save variables to cache
    localStorage.setItem("sms_voyage_saved", "true");
    localStorage.setItem("sms_voyage_dep_country", depCountry.country);
    localStorage.setItem("sms_voyage_dep_port_code", activeDepPort.code);
    localStorage.setItem("sms_voyage_arr_country", arrCountry.country);
    localStorage.setItem("sms_voyage_arr_port_code", activeArrPort.code);
    localStorage.setItem("sms_voyage_speed", speed.toString());
    localStorage.setItem("sms_voyage_etd", etd);

    localStorage.setItem("sms_voyage_saved_dep_lat", depCoords.lat);
    localStorage.setItem("sms_voyage_saved_dep_lng", depCoords.lng);
    localStorage.setItem("sms_voyage_saved_dep_lat_deg", depCoords.latDeg.toString());
    localStorage.setItem("sms_voyage_saved_dep_lng_deg", depCoords.lngDeg.toString());

    localStorage.setItem("sms_voyage_saved_arr_lat", arrCoords.lat);
    localStorage.setItem("sms_voyage_saved_arr_lng", arrCoords.lng);
    localStorage.setItem("sms_voyage_saved_arr_lat_deg", arrCoords.latDeg.toString());
    localStorage.setItem("sms_voyage_saved_arr_lng_deg", arrCoords.lngDeg.toString());

    setIsMapActivated(true);
    setSimProgress(0); // Reset animation
    triggerNotification("💾 Voyage Plan SAVED! Real-time routing map is now ACTIVE.");
  };

  const handleApplyPreset = (presetName: string, distVal: number, speedVal: number) => {
    if (presetName.includes("Singapore")) {
      const sgNation = parsedNations.find(n => n.country.includes("Singapore"));
      if (sgNation) {
        setDepCountry(sgNation);
        const ports = getPortsForCountry(sgNation.country);
        setSelectedDepPort(ports[0]);
      }
      const chNation = parsedNations.find(n => n.country.includes("China"));
      if (chNation) {
        setArrCountry(chNation);
        const ports = getPortsForCountry(chNation.country);
        setSelectedArrPort(ports[0]);
      }
    } else if (presetName.includes("Rotterdam")) {
      const nlNation = parsedNations.find(n => n.country.includes("Netherlands"));
      if (nlNation) {
        setDepCountry(nlNation);
        const ports = getPortsForCountry(nlNation.country);
        setSelectedDepPort(ports[0]);
      }
      const usNation = parsedNations.find(n => n.country.includes("United States"));
      if (usNation) {
        setArrCountry(usNation);
        const ports = getPortsForCountry(usNation.country);
        const nyPort = ports.find(p => p.code === "USNYNJ") || ports[0];
        setSelectedArrPort(nyPort);
      }
    } else if (presetName.includes("Tokyo")) {
      const jpNation = parsedNations.find(n => n.country.includes("Japan"));
      if (jpNation) {
        setDepCountry(jpNation);
        const ports = getPortsForCountry(jpNation.country);
        setSelectedDepPort(ports[0]);
      }
      const usNation = parsedNations.find(n => n.country.includes("United States"));
      if (usNation) {
        setArrCountry(usNation);
        const ports = getPortsForCountry(usNation.country);
        const laPort = ports.find(p => p.code === "USLAX") || ports[0];
        setSelectedArrPort(laPort);
      }
    }
    setSpeed(speedVal);
    triggerNotification(`Applied preset passage: ${presetName}. Core calculations synchronized.`);
  };

  return (
    <div id="voyage-planning-main-panel" className="space-y-8">
      {/* Toast Notification Banner */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 right-4 z-50 bg-[#0A2540] text-white border-l-4 border-[#00A86B] px-4 py-3 shadow-xl flex items-center gap-3 rounded-none font-mono text-[11px] font-bold"
          >
            <Activity className="w-4 h-4 text-[#00A86B] animate-pulse shrink-0" />
            <span>{notification}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Voyage Header Banner */}
      <div className="bg-white border border-slate-200 p-5 rounded-none flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <h2 className="text-[#0A2540] font-black text-xs uppercase tracking-wider">
              Voyage Planning & Passage Calculator
            </h2>
            <span className="text-[9px] font-mono bg-[#00A86B]/10 text-[#00A86B] px-2 py-0.5 border border-[#00A86B]/20 rounded-none font-bold uppercase">
              IMO STCW COMPLIANT
            </span>
          </div>
          <p className="text-xs text-slate-500 max-w-3xl">
            Design passage pathways in compliance with **SOLAS Chapter V Regulation 34**. Enter Sovereign State flag locations, calculate dynamic transit matrices, and adjust map zoom visualizers for general oceans, traffic schemes, channels, or docks.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono font-bold shrink-0">
          <Compass className="w-4 h-4 text-[#00A86B] animate-spin" style={{ animationDuration: "12s" }} />
          <span>PLANNING ENVELOPE: <span className="text-[#00A86B]">ACTIVE</span></span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Side: Departure/Arrival inputs & Speed Calculator (5 Columns) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Section A: Port Departure / Arrival Registry Console */}
          <div className="bg-white border border-slate-200 p-5 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Navigation className="w-4.5 h-4.5 text-[#0A2540]" />
                <h3 className="text-xs font-black uppercase text-[#0A2540] tracking-wider">
                  Departure & Arrival Ports
                </h3>
              </div>
              <span className="text-[9px] font-mono text-slate-400 font-bold uppercase">Console HUD</span>
            </div>

            {/* DEPARTURE PORT INPUT */}
            <div className="space-y-1 relative">
              <label className="block text-[9px] font-mono uppercase text-slate-500 font-bold tracking-wider">
                Departure Country & Sovereign Flag
              </label>
              
              <div className="flex gap-1.5">
                <button
                  type="button"
                  id="dep-country-select-button"
                  onClick={() => {
                    setShowDepDropdown(!showDepDropdown);
                    setShowArrDropdown(false);
                  }}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-xs flex items-center justify-between font-bold text-slate-800 hover:bg-slate-100/80 transition-colors text-left"
                >
                  <span className="flex items-center gap-2">
                    <span className="text-base leading-none">{depCountry.flag}</span>
                    <span>{depCountry.country}</span>
                  </span>
                  <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                </button>
              </div>

              {/* SEARCH DROPDOWN FOR DEPARTURE */}
              {showDepDropdown && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-300 shadow-2xl z-50 max-h-72 flex flex-col p-2">
                  <div className="flex items-center gap-1.5 border border-slate-200 px-2 py-1.5 mb-2 bg-slate-50">
                    <Search className="w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={searchDep}
                      onChange={(e) => setSearchDep(e.target.value)}
                      placeholder="Search sovereign nation..."
                      className="w-full bg-transparent border-none text-xs focus:outline-none focus:ring-0 text-slate-800 font-sans"
                    />
                  </div>
                  <div className="overflow-y-auto space-y-1 flex-1 pr-1">
                    {filteredDepNations.map((nat) => (
                      <button
                        key={`dep-nat-${nat.country}`}
                        type="button"
                        onClick={() => {
                          setDepCountry(nat);
                          setShowDepDropdown(false);
                          setSearchDep("");
                        }}
                        className="w-full text-left px-2 py-1.5 text-xs hover:bg-slate-100 flex items-center justify-between font-mono"
                      >
                        <span className="flex items-center gap-2">
                          <span className="text-base">{nat.flag}</span>
                          <span className="font-bold text-[#0A2540]">{nat.country}</span>
                        </span>
                      </button>
                    ))}
                    {filteredDepNations.length === 0 && (
                      <p className="text-[10px] text-slate-400 text-center font-mono p-2">No matching nations found.</p>
                    )}
                  </div>
                </div>
              )}

              <div className="mt-1.5">
                <label className="block text-[8px] font-mono uppercase text-slate-400 tracking-wider">
                  Departure Port Selection (Predefined)
                </label>
                <select
                  value={activeDepPort.code}
                  onChange={(e) => {
                    const found = depPorts.find(p => p.code === e.target.value);
                    if (found) setSelectedDepPort(found);
                  }}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:bg-white focus:border-slate-400 cursor-pointer rounded-none"
                >
                  {depPorts.map(p => (
                    <option key={p.code} value={p.code}>
                      {p.name} ({p.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-between text-[9px] font-mono text-slate-400 mt-1">
                <span>Lat: {activeDepPort.lat}</span>
                <span>Lng: {activeDepPort.lng}</span>
              </div>
            </div>

            <div className="flex justify-center my-1">
              <div className="w-8 h-8 rounded-full border border-slate-200 bg-slate-50 flex items-center justify-center">
                <ArrowRight className="w-4 h-4 text-[#00A86B]" />
              </div>
            </div>

            {/* ARRIVAL PORT INPUT */}
            <div className="space-y-1 relative">
              <label className="block text-[9px] font-mono uppercase text-slate-500 font-bold tracking-wider">
                Arrival Country & Sovereign Flag
              </label>
              
              <div className="flex gap-1.5">
                <button
                  type="button"
                  id="arr-country-select-button"
                  onClick={() => {
                    setShowArrDropdown(!showArrDropdown);
                    setShowDepDropdown(false);
                  }}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-xs flex items-center justify-between font-bold text-slate-800 hover:bg-slate-100/80 transition-colors text-left"
                >
                  <span className="flex items-center gap-2">
                    <span className="text-base leading-none">{arrCountry.flag}</span>
                    <span>{arrCountry.country}</span>
                  </span>
                  <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                </button>
              </div>

              {/* SEARCH DROPDOWN FOR ARRIVAL */}
              {showArrDropdown && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-300 shadow-2xl z-50 max-h-72 flex flex-col p-2">
                  <div className="flex items-center gap-1.5 border border-slate-200 px-2 py-1.5 mb-2 bg-slate-50">
                    <Search className="w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={searchArr}
                      onChange={(e) => setSearchArr(e.target.value)}
                      placeholder="Search sovereign nation..."
                      className="w-full bg-transparent border-none text-xs focus:outline-none focus:ring-0 text-slate-800 font-sans"
                    />
                  </div>
                  <div className="overflow-y-auto space-y-1 flex-1 pr-1">
                    {filteredArrNations.map((nat) => (
                      <button
                        key={`arr-nat-${nat.country}`}
                        type="button"
                        onClick={() => {
                          setArrCountry(nat);
                          setShowArrDropdown(false);
                          setSearchArr("");
                        }}
                        className="w-full text-left px-2 py-1.5 text-xs hover:bg-slate-100 flex items-center justify-between font-mono"
                      >
                        <span className="flex items-center gap-2">
                          <span className="text-base">{nat.flag}</span>
                          <span className="font-bold text-[#0A2540]">{nat.country}</span>
                        </span>
                      </button>
                    ))}
                    {filteredArrNations.length === 0 && (
                      <p className="text-[10px] text-slate-400 text-center font-mono p-2">No matching nations found.</p>
                    )}
                  </div>
                </div>
              )}

              <div className="mt-1.5">
                <label className="block text-[8px] font-mono uppercase text-slate-400 tracking-wider">
                  Arrival Port Selection (Predefined)
                </label>
                <select
                  value={activeArrPort.code}
                  onChange={(e) => {
                    const found = arrPorts.find(p => p.code === e.target.value);
                    if (found) setSelectedArrPort(found);
                  }}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:bg-white focus:border-slate-400 cursor-pointer rounded-none"
                >
                  {arrPorts.map(p => (
                    <option key={p.code} value={p.code}>
                      {p.name} ({p.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-between text-[9px] font-mono text-slate-400 mt-1">
                <span>Lat: {activeArrPort.lat}</span>
                <span>Lng: {activeArrPort.lng}</span>
              </div>
            </div>

            {/* ONBOARD POSITION CALIBRATOR (MANUAL OVERRIDE) */}
            <div className="bg-slate-50 border border-slate-200 p-3.5 space-y-3.5 rounded-none">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-[#0A2540]" />
                  <span className="text-[10px] font-black uppercase text-[#0A2540] tracking-wider">
                    Onboard Position Calibration
                  </span>
                </div>
                <span className="text-[8px] font-mono text-amber-600 bg-amber-50 px-1.5 py-0.5 border border-amber-200 font-bold uppercase">
                  Manual Override
                </span>
              </div>

              <p className="text-[10px] text-slate-500 font-sans leading-relaxed">
                Calibrate system coordinates to match local ECDIS or device positioning receivers. Passage times and route coordinates will sync upon saving.
              </p>

              <div className="grid grid-cols-2 gap-3 pt-1">
                {/* DEPARTURE COORDINATES CALIBRATOR */}
                <div className="space-y-1.5">
                  <span className="block text-[8px] font-mono uppercase text-[#0A2540] font-bold tracking-wider">
                    Departure Port Calibrator
                  </span>
                  <div className="space-y-1">
                    <div className="relative">
                      <span className="absolute left-2 top-1.5 text-[8px] font-mono font-bold text-slate-400">LAT</span>
                      <input
                        type="text"
                        disabled={isMapActivated}
                        value={depLatInput}
                        onChange={(e) => setDepLatInput(e.target.value)}
                        placeholder="e.g. 01° 15.60' N"
                        className="w-full bg-white disabled:bg-slate-100 border border-slate-200 disabled:border-slate-200 pl-8 pr-2 py-1 text-xs font-mono font-bold text-slate-800 disabled:text-slate-400 focus:outline-none focus:border-slate-400"
                      />
                    </div>
                    <div className="relative">
                      <span className="absolute left-2 top-1.5 text-[8px] font-mono font-bold text-slate-400">LNG</span>
                      <input
                        type="text"
                        disabled={isMapActivated}
                        value={depLngInput}
                        onChange={(e) => setDepLngInput(e.target.value)}
                        placeholder="e.g. 103° 50.40' E"
                        className="w-full bg-white disabled:bg-slate-100 border border-slate-200 disabled:border-slate-200 pl-8 pr-2 py-1 text-xs font-mono font-bold text-slate-800 disabled:text-slate-400 focus:outline-none focus:border-slate-400"
                      />
                    </div>
                  </div>
                </div>

                {/* ARRIVAL COORDINATES CALIBRATOR */}
                <div className="space-y-1.5">
                  <span className="block text-[8px] font-mono uppercase text-[#0A2540] font-bold tracking-wider">
                    Arrival Port Calibrator
                  </span>
                  <div className="space-y-1">
                    <div className="relative">
                      <span className="absolute left-2 top-1.5 text-[8px] font-mono font-bold text-slate-400">LAT</span>
                      <input
                        type="text"
                        disabled={isMapActivated}
                        value={arrLatInput}
                        onChange={(e) => setArrLatInput(e.target.value)}
                        placeholder="e.g. 31° 13.20' N"
                        className="w-full bg-white disabled:bg-slate-100 border border-slate-200 disabled:border-slate-200 pl-8 pr-2 py-1 text-xs font-mono font-bold text-slate-800 disabled:text-slate-400 focus:outline-none focus:border-slate-400"
                      />
                    </div>
                    <div className="relative">
                      <span className="absolute left-2 top-1.5 text-[8px] font-mono font-bold text-slate-400">LNG</span>
                      <input
                        type="text"
                        disabled={isMapActivated}
                        value={arrLngInput}
                        onChange={(e) => setArrLngInput(e.target.value)}
                        placeholder="e.g. 121° 28.80' E"
                        className="w-full bg-white disabled:bg-slate-100 border border-slate-200 disabled:border-slate-200 pl-8 pr-2 py-1 text-xs font-mono font-bold text-slate-800 disabled:text-slate-400 focus:outline-none focus:border-slate-400"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {isMapActivated && (
                <div className="flex items-center gap-1.5 bg-[#00A86B]/5 border border-[#00A86B]/20 px-2.5 py-1 text-[9px] font-mono text-[#00A86B] font-bold">
                  <Lock className="w-3 h-3 text-[#00A86B] shrink-0" />
                  <span>Passage Activated: Coordinates locked to avoid transit drift.</span>
                </div>
              )}
            </div>

            {/* DATE SELECTORS (ETD & CALCULATED ETA) */}
            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-100">
              <div className="space-y-1">
                <label className="block text-[9px] font-mono uppercase text-slate-500 font-bold tracking-wider">
                  Departure Time (ETD)
                </label>
                <div className="relative">
                  <input
                    type="datetime-local"
                    value={etd}
                    onChange={(e) => setEtd(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-slate-400 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[9px] font-mono uppercase text-slate-500 font-bold tracking-wider">
                  Arrival Time (ETA)
                </label>
                <div className="bg-slate-100 border border-slate-200 px-2.5 py-2.5 text-xs text-[#0A2540] font-mono font-bold">
                  {eta}
                </div>
              </div>
            </div>

            {/* SAVE VOYAGE PLAN BUTTON */}
            <div className="pt-4 border-t border-slate-100">
              <button
                type="button"
                id="save-voyage-plan-button"
                onClick={handleSaveVoyagePlan}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0A2540] hover:bg-[#1d3557] text-white font-mono text-xs font-bold transition-all shadow-sm border border-[#0A2540] cursor-pointer"
              >
                <Save className="w-4 h-4 text-[#00A86B]" />
                <span>SAVE VOYAGE PLAN & ACTIVATE</span>
              </button>
            </div>
          </div>

          {/* Section B: Speed & Time Calculator Engine */}
          <div className="bg-white border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Gauge className="w-4.5 h-4.5 text-[#0A2540]" />
                <h3 className="text-xs font-black uppercase text-[#0A2540] tracking-wider">
                  Speed & Passage Calculator
                </h3>
              </div>
              <span className="text-[8px] font-mono text-[#00A86B] font-bold uppercase animate-pulse">Live Calculations</span>
            </div>

            {/* Distances, speeds input fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-[9px] font-mono uppercase text-slate-400 font-bold tracking-wider">
                  Voyage Distance (NM) [Read-Only]
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    readOnly
                    id="voyage-distance-input-readonly"
                    value={isNaN(distance) ? "0" : `${distance}`}
                    className="w-full bg-slate-100 border border-slate-200 px-3 py-2 text-xs font-mono font-bold text-slate-500 cursor-not-allowed select-none"
                  />
                  <span className="absolute right-3 text-[9px] font-mono font-bold text-slate-400">NM</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[9px] font-mono uppercase text-slate-500 font-bold tracking-wider">
                  Recommended Speed (kts)
                </label>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    min="1"
                    max="35"
                    step="0.1"
                    value={isNaN(speed) ? "" : speed}
                    onChange={(e) => setSpeed(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:bg-white focus:border-slate-400"
                  />
                  <span className="absolute right-2.5 text-[9px] font-mono font-bold text-slate-400">KTS</span>
                </div>
              </div>
            </div>

            {/* Calculations telemetry result card */}
            <div className="bg-slate-50 border border-slate-200 p-3.5 space-y-2">
              <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
                <span>Passage Parameter</span>
                <span>Computed Output</span>
              </div>
              
              <div className="border-t border-slate-200/60 my-1"></div>

              <div className="flex justify-between items-center">
                <span className="text-[10px] font-mono text-slate-600 font-medium">TOTAL TRANSIT DURATION:</span>
                <span className="text-xs font-mono font-extrabold text-[#0A2540]">{formattedDuration}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-[10px] font-mono text-slate-600 font-medium">FUEL FACTOR RATING:</span>
                <span className="text-[10px] font-mono font-bold text-slate-700">
                  {speed > 16 ? "⚡ HIGH CONSUMPTION (SLOW STEAMING VOID)" : 
                   speed >= 12 ? "♻️ OPTIMAL ECONOMIC CHARTER" : 
                   speed > 0 ? "📉 SUPER SLOW STEAMING ACTIVE" : "STOPPED"}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-[10px] font-mono text-slate-600 font-medium">ESTIMATED WATER CONSUMP:</span>
                <span className="text-[10px] font-mono font-bold text-slate-700">
                  {isNaN(durationHours) ? "0" : (durationHours * 0.45).toFixed(1)} Metric Tons (MT)
                </span>
              </div>
            </div>

            {/* Common Preset Routes quick selects */}
            <div className="space-y-1.5">
              <span className="block text-[8px] font-mono text-slate-400 uppercase tracking-wider">Quick-Select Charter Passages</span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => handleApplyPreset("Singapore to Shanghai", 2250, 15.0)}
                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 font-mono text-[9px] font-bold cursor-pointer transition-colors"
                >
                  SGP ➔ SHA (2,250 NM @ 15 kts)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset("Rotterdam to New York", 3320, 16.5)}
                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 font-mono text-[9px] font-bold cursor-pointer transition-colors"
                >
                  ROT ➔ NYC (3,320 NM @ 16.5 kts)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset("Tokyo to Los Angeles", 4840, 14.5)}
                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 font-mono text-[9px] font-bold cursor-pointer transition-colors"
                >
                  TYO ➔ LAX (4,840 NM @ 14.5 kts)
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Live Voyage Route (Interactive Map) (7 Columns) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 p-5 shadow-sm space-y-4 flex flex-col justify-between">
          
          {/* Header and Scale selector dropdown */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Map className="w-4.5 h-4.5 text-[#0A2540]" />
              <h3 className="text-xs font-black uppercase text-[#0A2540] tracking-wider">
                Live Voyage Route
              </h3>
            </div>

            {/* Map Scale Selector dropdown */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[9px] font-mono text-slate-400 font-black uppercase tracking-wider">SCALE MODE:</span>
              <select
                value={mapScale}
                onChange={(e) => setMapScale(e.target.value as MapScale)}
                className="bg-[#0A2540] text-white font-mono text-[10px] font-bold px-2 py-1 border border-slate-600 focus:outline-none cursor-pointer rounded-none"
              >
                <option value="general">🌍 General Scale (Ocean Passage)</option>
                <option value="coastal">🗺️ Coastal Scale (Traffic Schemes)</option>
                <option value="approach">⚓ Approach Scale (Estuary Channels)</option>
                <option value="harbor">🏗️ Harbor Scale (Berth Mooring)</option>
              </select>
            </div>
          </div>

          {/* Interactive Chart Visualizer Window */}
          <div className="relative aspect-[16/10] bg-slate-50 overflow-hidden border border-slate-200 flex items-center justify-center w-full">
            
            {/* SVG Chart Plotter Engine */}
            <svg className={`w-full h-full select-none ${!isMapActivated ? "filter grayscale blur-[1px] opacity-40" : ""}`} viewBox="0 0 800 500">
              {/* Radar Grid and Gridlines */}
              <defs>
                <pattern id="radarGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#000000" strokeWidth="0.5" strokeOpacity="0.05" />
                </pattern>
                <radialGradient id="radarSweep" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#00A86B" stopOpacity="0.05" />
                  <stop offset="100%" stopColor="#00A86B" stopOpacity="0" />
                </radialGradient>
              </defs>
              <rect width="100%" height="100%" fill="url(#radarGrid)" />

              {/* RENDER BASED ON ACTIVE SCALE TYPE */}

              {/* 1. GENERAL SCALE: Ocean Passage (Singapore to Shanghai overview) */}
              {mapScale === "general" && (
                <g>
                  {/* Dynamic Sea Background Tint */}
                  <rect width="100%" height="100%" fill="#bae6fd" opacity="0.3" />
                  
                  {/* Landmass 1: Malacca Peninsula & Indonesia (Bottom Left) */}
                  <path d="M 0 450 Q 80 430 110 380 T 140 320 L 0 300 Z" fill="#cbd5e1" stroke="#64748b" strokeWidth="1.5" />
                  <text x="35" y="400" fill="#334155" className="font-mono text-[9px] font-bold">MALAYSIA</text>
                  <text x="40" y="445" fill="#047857" className="font-mono text-[10px] font-black">SINGAPORE {depCountry.flag}</text>
 
                  {/* Landmass 2: Vietnam/Indochina Coastline (Left Center) */}
                  <path d="M 0 250 Q 90 200 130 150 T 80 80 L 0 50 Z" fill="#cbd5e1" stroke="#64748b" strokeWidth="1.5" />
                  <text x="30" y="170" fill="#334155" className="font-mono text-[9px] font-bold">VIETNAM</text>
 
                  {/* Landmass 3: China & Shanghai Coastline (Top Right) */}
                  <path d="M 450 0 Q 520 80 570 120 T 680 140 T 800 120 L 800 0 Z" fill="#cbd5e1" stroke="#64748b" strokeWidth="1.5" />
                  <text x="630" y="60" fill="#334155" className="font-mono text-[9px] font-bold">CHINA</text>
                  <text x="590" y="110" fill="#047857" className="font-mono text-[10px] font-black">SHANGHAI {arrCountry.flag}</text>
 
                  {/* Landmass 4: Philippines Islands (Bottom Right) */}
                  <path d="M 700 380 Q 750 350 780 400 L 800 480 L 680 480 Z" fill="#cbd5e1" stroke="#64748b" strokeWidth="1" />
                  <text x="710" y="440" fill="#475569" className="font-mono text-[9px] font-bold">PHILIPPINES</text>
 
                  {/* Great Circle Navigation Route Line */}
                  <path 
                    id="oceanRoute" 
                    d="M 120 370 Q 240 280 400 240 T 610 130" 
                    fill="none" 
                    stroke="#047857" 
                    strokeWidth="3" 
                    strokeDasharray="6,4" 
                    opacity="0.9" 
                  />
 
                  {/* Ocean Current vectors */}
                  <path d="M 280 340 L 320 310" fill="none" stroke="#0284c7" strokeWidth="1" markerEnd="url(#arrow)" opacity="0.5" />
                  <path d="M 290 350 L 330 320" fill="none" stroke="#0284c7" strokeWidth="1" markerEnd="url(#arrow)" opacity="0.5" />
                  <text x="310" y="355" fill="#0284c7" className="font-mono text-[8px] font-bold">S.C.S. CURRENT 1.4 KTS</text>
 
                  {/* Waypoint Markers */}
                  <circle cx="120" cy="370" r="4.5" fill="#047857" />
                  <text x="130" y="375" fill="#0f172a" className="font-mono text-[9px] font-black">DEP: {activeDepPort.code}</text>
 
                  <circle cx="310" cy="255" r="3.5" fill="#b45309" />
                  <text x="320" y="258" fill="#b45309" className="font-mono text-[8px] font-black">WP 1 (PARACEL)</text>
 
                  <circle cx="480" cy="195" r="3.5" fill="#b45309" />
                  <text x="490" y="198" fill="#b45309" className="font-mono text-[8px] font-black">WP 2 (TAIWAN ST.)</text>
 
                  <circle cx="610" cy="130" r="4.5" fill="#047857" />
                  <text x="590" y="150" fill="#0f172a" className="font-mono text-[9px] font-black">ARR: {activeArrPort.code}</text>
 
                  {/* Animated Ship Position Indicator */}
                  {(() => {
                    const t = simProgress / 100;
                    const x = (1 - t) * (1 - t) * 120 + 2 * (1 - t) * t * 290 + t * t * 610;
                    const y = (1 - t) * (1 - t) * 370 + 2 * (1 - t) * t * 220 + t * t * 130;
                    return (
                      <g transform={`translate(${x}, ${y})`}>
                        <circle r="16" fill="#047857" fillOpacity="0.15" className="animate-ping" />
                        <rect x="-8" y="-4" width="16" height="8" rx="1.5" fill="#047857" stroke="#ffffff" strokeWidth="1" transform="rotate(-22)" />
                        <polygon points="0,-7 6,-4 0,-1" fill="#ffffff" transform="rotate(-22)" />
                        <text x="12" y="4" fill="#0f172a" className="font-mono text-[9px] font-black">
                          {vesselName} ({speed} kts)
                        </text>
                      </g>
                    );
                  })()}
 
                  {/* Device GPS Position Anchor */}
                  {isMapActivated && (
                    <g transform="translate(180, 310)">
                      <circle r="12" fill="#0284c7" fillOpacity="0.15" className="animate-ping" />
                      <circle cx="0" cy="0" r="4" fill="#0284c7" stroke="#ffffff" strokeWidth="1" />
                      <line x1="-8" y1="0" x2="8" y2="0" stroke="#0284c7" strokeWidth="0.8" />
                      <line x1="0" y1="-8" x2="0" y2="8" stroke="#0284c7" strokeWidth="0.8" />
                      <text x="10" y="3" fill="#0284c7" className="font-mono text-[8px] font-black uppercase tracking-wider drop-shadow-sm">
                        Current Vessel Position (GPS Anchor: {gpsAnchor.lat}, {gpsAnchor.lng})
                      </text>
                    </g>
                  )}
 
                  {/* Dynamic Sea Depth contour references */}
                  <text x="420" y="320" fill="#1e293b" className="font-mono text-[24px] font-extrabold" opacity="0.1">PACIFIC OCEAN PASSAGE</text>
                  <text x="420" y="340" fill="#1e293b" className="font-mono text-[10px]" opacity="0.2">Average Depth: 3,400 meters</text>
                </g>
              )}

              {/* 2. COASTAL SCALE: Near shoreline and major Traffic Separation Schemes (TSS) */}
              {mapScale === "coastal" && (
                <g>
                  {/* Depth Color Gradients */}
                  <rect width="100%" height="100%" fill="#e0f2fe" />
                  
                  {/* Shallow water areas */}
                  <path d="M 0 0 L 250 0 L 210 180 Q 150 250 80 290 L 0 310 Z" fill="#bae6fd" />
                  <path d="M 0 0 L 150 0 Q 110 120 40 180 L 0 190 Z" fill="#7dd3fc" />
                  
                  {/* Shallow Warning lines */}
                  <path d="M 210 180 Q 150 250 80 290" fill="none" stroke="#be123c" strokeWidth="1.5" strokeDasharray="4,4" />
                  <text x="120" y="220" fill="#be123c" className="font-mono text-[8px] font-black" transform="rotate(30, 120, 220)">10m DEPTH CONTOUR (RESTRICTED)</text>
                  <text x="190" y="100" fill="#334155" className="font-mono text-[8px] font-black">30m DEPTH LIMIT</text>
                  <text x="350" y="320" fill="#475569" className="font-mono text-[8px] font-black">80m SAFE WATER ZONE</text>

                  {/* Shoreline landmass */}
                  <path d="M 0 0 L 120 0 L 90 80 Q 40 120 0 130 Z" fill="#94a3b8" stroke="#475569" strokeWidth="2" />
                  <text x="15" y="40" fill="#0f172a" className="font-mono text-[9px] font-black uppercase">COASTAL RANGE</text>

                  {/* Lighthouse and Warning Beam */}
                  <g transform="translate(85, 60)">
                    <polygon points="0,0 -8,25 8,25" fill="#ca8a04" stroke="#0f172a" strokeWidth="0.5" />
                    <path d="M 0 0 L 180 -15 A 60 60 0 0 1 190 20 Z" fill="#eab308" fillOpacity="0.25" />
                    <circle cx="0" cy="0" r="3" fill="#ef4444" className="animate-ping" />
                    <text x="10" y="5" fill="#b45309" className="font-mono text-[7px] font-black">HORSBURGH LT (FL.10s)</text>
                  </g>

                  {/* TSS (Traffic Separation Scheme) Lanes */}
                  {/* Westbound Lane */}
                  <rect x="250" y="240" width="550" height="40" fill="#f1f5f9" fillOpacity="0.8" />
                  <path d="M 250 260 L 800 260" fill="none" stroke="#7e22ce" strokeWidth="1.5" strokeDasharray="6,4" />
                  <text x="400" y="255" fill="#7e22ce" className="font-mono text-[9px] font-black tracking-wider">WESTBOUND TSS LANE ➔</text>
                  
                  {/* Separation Zone */}
                  <rect x="250" y="280" width="550" height="20" fill="#fecdd3" fillOpacity="0.5" />
                  <line x1="250" y1="290" x2="800" y2="290" stroke="#be123c" strokeWidth="2" strokeDasharray="10,6" />
                  <text x="430" y="293" fill="#be123c" className="font-mono text-[8px] font-black tracking-widest uppercase">TSS SEPARATION ZONE (NO MOORING)</text>

                  {/* Eastbound Lane */}
                  <rect x="250" y="300" width="550" height="40" fill="#f1f5f9" fillOpacity="0.8" />
                  <path d="M 250 320 L 800 320" fill="none" stroke="#7e22ce" strokeWidth="1.5" strokeDasharray="6,4" />
                  <text x="400" y="335" fill="#7e22ce" className="font-mono text-[9px] font-black tracking-wider">◀ EASTBOUND TSS LANE</text>

                  {/* Ship's planned line */}
                  <path d="M 750 320 L 300 320" fill="none" stroke="#047857" strokeWidth="2.5" markerEnd="url(#arrow)" />

                  {/* Ship's animation indicator */}
                  {(() => {
                    const progressFactor = simProgress / 100;
                    const shipX = 750 - progressFactor * 450;
                    return (
                      <g transform={`translate(${shipX}, 320)`}>
                        <rect x="-10" y="-5" width="20" height="10" rx="1" fill="#047857" stroke="#ffffff" strokeWidth="1" />
                        <polygon points="10,0 4,-4 4,4" fill="#ffffff" />
                        <text x="-15" y="-12" fill="#047857" className="font-mono text-[9px] font-black">
                          {vesselName} ({speed} kts)
                        </text>
                        {/* Heading indicator */}
                        <line x1="10" y1="0" x2="30" y2="0" stroke="#047857" strokeWidth="1.5" strokeDasharray="2,2" />
                      </g>
                    );
                  })()}

                  {/* Device GPS Position Anchor */}
                  {isMapActivated && (
                    <g transform="translate(320, 380)">
                      <circle r="12" fill="#0284c7" fillOpacity="0.15" className="animate-ping" />
                      <circle cx="0" cy="0" r="4" fill="#0284c7" stroke="#ffffff" strokeWidth="1" />
                      <line x1="-8" y1="0" x2="8" y2="0" stroke="#0284c7" strokeWidth="0.8" />
                      <line x1="0" y1="-8" x2="0" y2="8" stroke="#0284c7" strokeWidth="0.8" />
                      <text x="10" y="3" fill="#0284c7" className="font-mono text-[8px] font-black uppercase tracking-wider drop-shadow-sm">
                        Current Vessel Position (GPS Anchor: {gpsAnchor.lat}, {gpsAnchor.lng})
                      </text>
                    </g>
                  )}

                  {/* Target vessel traffic (Simulated other ships) */}
                  <g transform="translate(380, 260)">
                    <rect x="-8" y="-4" width="16" height="8" rx="1" fill="#b91c1c" />
                    <text x="-10" y="16" fill="#b91c1c" className="font-mono text-[8px] font-black">⚠️ COSCO SHIPPING (12 kts)</text>
                    <polygon points="-8,0 -2,-3 -2,3" fill="#ffffff" />
                  </g>
                  <g transform="translate(620, 260)">
                    <rect x="-8" y="-4" width="16" height="8" rx="1" fill="#b91c1c" />
                    <text x="-10" y="-10" fill="#b91c1c" className="font-mono text-[8px] font-black">⚠️ NYK PROSPER (18 kts)</text>
                    <polygon points="-8,0 -2,-3 -2,3" fill="#ffffff" />
                  </g>

                  {/* Depth gauge readings */}
                  <text x="350" y="450" fill="#334155" className="font-mono text-[9px] font-bold">RADAR ACTIVE SWEEP: 12 NM RANGE</text>
                  <circle cx="400" cy="400" r="100" fill="none" stroke="#047857" strokeWidth="1" strokeOpacity="0.15" />
                  <line x1="400" y1="400" x2="480" y2="340" stroke="#047857" strokeWidth="1.5" strokeOpacity="0.5" className="animate-pulse" />
                </g>
              )}

              {/* 3. APPROACH SCALE: Entrance channel & Pilot Boarding area */}
              {mapScale === "approach" && (
                <g>
                  {/* Sea bed representation */}
                  <rect width="100%" height="100%" fill="#e0f2fe" />
                  
                  {/* Channel Dredged Limits */}
                  <polygon points="100,500 250,0 350,0 200,500" fill="#bae6fd" />
                  <line x1="100" y1="500" x2="250" y2="0" stroke="#475569" strokeWidth="1.5" strokeDasharray="5,5" />
                  <line x1="200" y1="500" x2="350" y2="0" stroke="#475569" strokeWidth="1.5" strokeDasharray="5,5" />
                  <text x="140" y="120" fill="#0369a1" className="font-mono text-[9px] font-black" transform="rotate(-73, 140, 120)">DREDGED ENTRY CHANNEL (15.5M DEPTH)</text>

                  {/* Red/Green Lateral Buoys */}
                  <g transform="translate(195, 350)">
                    <polygon points="0,-8 -6,4 6,4" fill="#ef4444" />
                    <circle cx="0" cy="-8" r="2.5" fill="#ef4444" className="animate-ping" />
                    <text x="10" y="4" fill="#b91c1c" className="font-mono text-[8px] font-black">PORT Q1 (FL.R.2s)</text>
                  </g>
                  <g transform="translate(290, 320)">
                    <polygon points="0,-8 -6,4 6,4" fill="#22c55e" />
                    <circle cx="0" cy="-8" r="2.5" fill="#22c55e" className="animate-ping" />
                    <text x="10" y="4" fill="#15803d" className="font-mono text-[8px] font-black">STBD Q2 (FL.G.2s)</text>
                  </g>

                  <g transform="translate(135, 150)">
                    <polygon points="0,-8 -6,4 6,4" fill="#ef4444" />
                    <circle cx="0" cy="-8" r="2.5" fill="#ef4444" className="animate-ping" />
                    <text x="-75" y="4" fill="#b91c1c" className="font-mono text-[8px] font-black">PORT Q3 (FL.R.4s)</text>
                  </g>
                  <g transform="translate(230, 120)">
                    <polygon points="0,-8 -6,4 6,4" fill="#22c55e" />
                    <circle cx="0" cy="-8" r="2.5" fill="#22c55e" className="animate-ping" />
                    <text x="10" y="4" fill="#15803d" className="font-mono text-[8px] font-black">STBD Q4 (FL.G.4s)</text>
                  </g>

                  {/* Pilot Boarding Anchorage Station */}
                  <g transform="translate(500, 220)">
                    <circle cx="0" cy="0" r="30" fill="none" stroke="#b45309" strokeWidth="1.5" strokeDasharray="4,4" />
                    <circle cx="0" cy="0" r="3" fill="#b45309" />
                    {/* Tiny Anchor SVG */}
                    <path d="M -5 -5 L 5 -5 M 0 -5 L 0 8 M -6 4 A 6 6 0 0 0 6 4" fill="none" stroke="#b45309" strokeWidth="1.5" />
                    <text x="35" y="5" fill="#b45309" className="font-mono text-[9px] font-black uppercase">PILOT MEETING AREA (No.1)</text>
                    <text x="35" y="16" fill="#475569" className="font-mono text-[8px] font-bold">Channel VHF Ch: 12 / 16</text>
                  </g>

                  {/* Soundings (depth numbers in meters) */}
                  <text x="80" y="280" fill="#334155" className="font-mono text-[10px] font-black italic">11.8</text>
                  <text x="410" y="110" fill="#334155" className="font-mono text-[10px] font-black italic">13.2</text>
                  <text x="450" y="380" fill="#334155" className="font-mono text-[10px] font-black italic">14.5</text>
                  <text x="600" y="80" fill="#334155" className="font-mono text-[10px] font-black italic">16.1</text>
                  <text x="650" y="330" fill="#334155" className="font-mono text-[10px] font-black italic">15.8</text>

                  {/* Tidal Vectors */}
                  <path d="M 520 380 L 460 410" fill="none" stroke="#0284c7" strokeWidth="1.5" markerEnd="url(#arrow)" />
                  <text x="500" y="425" fill="#0284c7" className="font-mono text-[8px] font-bold">EBB TIDE: 1.8 KTS 220°</text>

                  {/* Path of ship */}
                  <path d="M 150 480 L 265 100" fill="none" stroke="#047857" strokeWidth="2" strokeDasharray="4,4" />

                  {/* Ship's navigation along approach */}
                  {(() => {
                    const factor = simProgress / 100;
                    const shipX = 150 + factor * 115;
                    const shipY = 480 - factor * 380;
                    return (
                      <g transform={`translate(${shipX}, ${shipY})`}>
                        <rect x="-8" y="-14" width="16" height="28" rx="2" fill="#047857" stroke="#ffffff" strokeWidth="1" transform="rotate(18)" />
                        <polygon points="0,-16 4,-12 -4,-12" fill="#ffffff" transform="rotate(18)" />
                        <text x="14" y="4" fill="#047857" className="font-mono text-[9px] font-black">
                          {vesselName}
                        </text>
                        <text x="14" y="14" fill="#334155" className="font-mono text-[7px] font-bold">
                          COG: 018° / SOG: 8.5kts
                        </text>
                      </g>
                    );
                  })()}

                  {/* Device GPS Position Anchor */}
                  {isMapActivated && (
                    <g transform="translate(400, 150)">
                      <circle r="12" fill="#0284c7" fillOpacity="0.15" className="animate-ping" />
                      <circle cx="0" cy="0" r="4" fill="#0284c7" stroke="#ffffff" strokeWidth="1" />
                      <line x1="-8" y1="0" x2="8" y2="0" stroke="#0284c7" strokeWidth="0.8" />
                      <line x1="0" y1="-8" x2="0" y2="8" stroke="#0284c7" strokeWidth="0.8" />
                      <text x="10" y="3" fill="#0284c7" className="font-mono text-[8px] font-black uppercase tracking-wider drop-shadow-md">
                        Current Vessel Position (GPS Anchor: {gpsAnchor.lat}, {gpsAnchor.lng})
                      </text>
                    </g>
                  )}
                </g>
              )}

              {/* 4. HARBOR SCALE: Mooring berth & dock terminal layout */}
              {mapScale === "harbor" && (
                <g>
                  {/* Harbor Basin Dark Water */}
                  <rect width="100%" height="100%" fill="#e0f2fe" />
                  
                  {/* Concrete Jetty / Quay Dock Layout (Right side) */}
                  <polygon points="400,0 800,0 800,500 400,500 400,420 450,400 450,100 400,80" fill="#64748b" stroke="#334155" strokeWidth="3" />
                  
                  {/* Berth Markings and Mooring Bollards */}
                  <line x1="450" y1="100" x2="450" y2="400" stroke="#ca8a04" strokeWidth="2.5" strokeDasharray="8,4" />
                  <text x="480" y="240" fill="#0f172a" className="font-mono text-[11px] font-black tracking-widest" transform="rotate(90, 480, 240)">CONTAINER TERMINAL BERTH NO. 4</text>

                  {/* Bollards represented by red dots on the quay */}
                  {[120, 160, 200, 240, 280, 320, 360, 380].map((by, bIdx) => (
                    <g key={`bol-${bIdx}`} transform={`translate(452, ${by})`}>
                      <circle cx="0" cy="0" r="3.5" fill="#ef4444" />
                      <text x="8" y="3" fill="#0f172a" className="font-mono text-[8px] font-black">B{bIdx + 1}</text>
                    </g>
                  ))}

                  {/* Container Cranes along the dock quay */}
                  {[100, 200, 300].map((cy, cIdx) => (
                    <g key={`crane-${cIdx}`} transform={`translate(520, ${cy})`}>
                      <rect x="-10" y="-15" width="20" height="30" fill="#334155" stroke="#eab308" strokeWidth="1" />
                      <line x1="-10" y1="0" x2="-60" y2="0" stroke="#eab308" strokeWidth="2" />
                      <circle cx="0" cy="0" r="3.5" fill="#eab308" />
                      <text x="14" y="4" fill="#ca8a04" className="font-mono text-[8px] font-black">QC-0{cIdx + 1}</text>
                    </g>
                  ))}

                  {/* Safe Basin Depth Limits */}
                  <text x="100" y="80" fill="#1e293b" className="font-mono text-[10px] font-black">HARBOR CHANNEL DEPTH: 16.5M CD</text>
                  <text x="100" y="100" fill="#334155" className="font-mono text-[9px] font-bold">Docking limit: 110,000 DWT vessels</text>

                  {/* Tugboat assisting stern */}
                  <g transform="translate(180, 360)">
                    <rect x="-15" y="-8" width="30" height="16" rx="4" fill="#b91c1c" stroke="#ffffff" strokeWidth="0.5" />
                    <path d="M 15 0 C 15 0 25 -10 25 10 Z" fill="#0284c7" fillOpacity="0.2" />
                    <text x="-25" y="-12" fill="#b91c1c" className="font-mono text-[8px] font-black">⚓ TUG RESOLUTE</text>
                    <text x="-25" y="18" fill="#334155" className="font-mono text-[7px] font-bold">Pushing stern (50% power)</text>
                  </g>

                  {/* Ship berthing/maneuvering dynamically */}
                  {(() => {
                    const factor = simProgress / 100;
                    const shipX = 160 + factor * 180;
                    const shipY = 280 - factor * 30;
                    return (
                      <g transform={`translate(${shipX}, ${shipY})`}>
                        {factor > 0.8 && (
                          <g>
                            <line x1="0" y1="-30" x2="90" y2="-100" stroke="#475569" strokeWidth="1" strokeDasharray="2,1" />
                            <line x1="0" y1="30" x2="90" y2="100" stroke="#475569" strokeWidth="1" strokeDasharray="2,1" />
                            <text x="-60" y="-35" fill="#047857" className="font-mono text-[8px] font-black uppercase">Mooring Lines Secured</text>
                          </g>
                        )}

                        <rect x="-16" y="-45" width="32" height="90" rx="4" fill="#047857" stroke="#ffffff" strokeWidth="1.5" transform="rotate(0)" />
                        <polygon points="0,-52 16,-40 -16,-40" fill="#ffffff" />
                        
                        <rect x="-10" y="-25" width="20" height="60" fill="#0c1d3a" opacity="0.3" />
                        
                        <text x="-45" y="4" fill="#047857" className="font-mono text-[9px] font-black bg-white/90 border border-slate-200 px-1 rounded-sm">
                          {vesselName}
                        </text>
                        <text x="-45" y="14" fill="#334155" className="font-mono text-[7px] font-bold">
                          DIST TO QUAY: {Math.max(0, Math.round(90 - factor * 90))}m
                        </text>
                      </g>
                    );
                  })()}

                  {/* Device GPS Position Anchor */}
                  {isMapActivated && (
                    <g transform="translate(250, 420)">
                      <circle r="12" fill="#0284c7" fillOpacity="0.15" className="animate-ping" />
                      <circle cx="0" cy="0" r="4" fill="#0284c7" stroke="#ffffff" strokeWidth="1" />
                      <line x1="-8" y1="0" x2="8" y2="0" stroke="#0284c7" strokeWidth="0.8" />
                      <line x1="0" y1="-8" x2="0" y2="8" stroke="#0284c7" strokeWidth="0.8" />
                      <text x="10" y="3" fill="#0284c7" className="font-mono text-[8px] font-black uppercase tracking-wider drop-shadow-md">
                        Current Vessel Position (GPS Anchor: {gpsAnchor.lat}, {gpsAnchor.lng})
                      </text>
                    </g>
                  )}

                  {/* Breakwater defenses */}
                  <polygon points="0,480 300,480 270,500 0,500" fill="#475569" />
                  <text x="10" y="495" fill="#cbd5e1" className="font-mono text-[8px] font-bold">OUTER BASIN BREAKWATER</text>
                </g>
              )}
            </svg>

            {/* Scale-Specific Informational Badges overlay */}
            <div className="absolute bottom-3 left-3 bg-slate-900/90 border border-slate-700 p-2.5 space-y-1 text-[9px] font-mono select-none">
              <div className="text-white font-extrabold flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-[#00A86B] rounded-full animate-ping"></span>
                <span>CHART TELEMETRY:</span>
              </div>
              <div className="text-slate-400">
                {mapScale === "general" && (
                  <div>
                    <p>Range: <span className="text-white">GENERAL OCEANIC</span></p>
                    <p>Zoom: <span className="text-white">1:5,500,000</span></p>
                    <p>Safe Depth: <span className="text-white">&gt; 500m</span></p>
                  </div>
                )}
                {mapScale === "coastal" && (
                  <div>
                    <p>Range: <span className="text-white">TRAFFIC SCHEMES (TSS)</span></p>
                    <p>Zoom: <span className="text-white">1:450,000</span></p>
                    <p>Contour Limit: <span className="text-[#f43f5e] font-bold">10m Danger Line</span></p>
                  </div>
                )}
                {mapScale === "approach" && (
                  <div>
                    <p>Range: <span className="text-white">ESTUARY / CHANNELS</span></p>
                    <p>Zoom: <span className="text-white">1:45,000</span></p>
                    <p>Active Tide: <span className="text-sky-400 font-bold">Ebb 1.8 kts</span></p>
                  </div>
                )}
                {mapScale === "harbor" && (
                  <div>
                    <p>Range: <span className="text-white">BERTH #4 TERMINAL</span></p>
                    <p>Zoom: <span className="text-white">1:1,500</span></p>
                    <p>Bollard Pull: <span className="text-white">80T Nominal</span></p>
                  </div>
                )}
              </div>
            </div>

            {/* Animation Progress Slider overlay */}
            <div className="absolute top-3 right-3 bg-slate-900/90 border border-slate-700 px-3 py-2 flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  if (isMapActivated) setIsPlaying(!isPlaying);
                }}
                disabled={!isMapActivated}
                className={`p-1 text-white rounded-sm ${isMapActivated ? "bg-[#00A86B] hover:bg-emerald-700 cursor-pointer" : "bg-slate-700 opacity-50 cursor-not-allowed"}`}
                title={isPlaying ? "Pause Simulation" : "Play Route Simulation"}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (isMapActivated) {
                    setSimProgress(0);
                    setIsPlaying(false);
                  }
                }}
                disabled={!isMapActivated}
                className={`p-1 text-white rounded-sm ${isMapActivated ? "bg-slate-700 hover:bg-slate-600 cursor-pointer" : "bg-slate-700 opacity-50 cursor-not-allowed"}`}
                title="Reset Position"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <div className="flex flex-col">
                <span className="text-[7px] font-mono text-slate-400 font-bold uppercase leading-none mb-1">Passage progress</span>
                <div className="flex items-center gap-1">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    disabled={!isMapActivated}
                    value={simProgress}
                    onChange={(e) => setSimProgress(parseInt(e.target.value))}
                    className="w-24 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#00A86B]"
                  />
                  <span className="text-[9px] font-mono text-white font-bold min-w-[25px] text-right">{simProgress}%</span>
                </div>
              </div>
            </div>

            {/* Map Activation Gate Overlay */}
            {!isMapActivated && (
              <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-[3px] z-30 flex flex-col items-center justify-center p-6 text-center select-none">
                <div className="w-12 h-12 rounded-full border border-slate-700 bg-slate-900 flex items-center justify-center mb-4 text-[#f43f5e] animate-pulse">
                  <Lock className="w-5 h-5" />
                </div>
                <h4 className="text-white font-mono text-xs font-black uppercase tracking-widest mb-2">
                  Live Route Map inactive until Voyage Plan is Saved.
                </h4>
                <p className="text-slate-400 text-[10px] max-w-sm leading-normal">
                  Configure your Departure Country, Arrival Country, recommended transit speeds, and click "SAVE VOYAGE PLAN & ACTIVATE" to unlock maritime charts, TSS routes, and live vessel simulations.
                </p>
              </div>
            )}
          </div>

          {/* Bottom Info details about voyage routing */}
          <div className="bg-slate-50 border border-slate-200 p-4 space-y-2">
            <h4 className="text-[10px] font-mono font-black text-[#0A2540] uppercase tracking-wider flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-[#00A86B]" />
              <span>Route Planning Guidance Notice</span>
            </h4>
            <p className="text-[11px] text-slate-500 leading-normal">
              You are viewing the simulated passage from <span className="font-bold text-[#0A2540]">{depCountry.country} ({activeDepPort.name})</span> to <span className="font-bold text-[#0A2540]">{arrCountry.country} ({activeArrPort.name})</span>. Switching scales will reveal specialized navigational elements: TSS lanes for ocean coastal limits, lateral buoyage for narrow approach fairways, and mooring line arrangements alongside the concrete quay terminal berths.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
