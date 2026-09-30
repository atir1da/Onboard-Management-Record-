import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Droplet, 
  Clock, 
  Flame, 
  Compass, 
  Cpu, 
  Ship, 
  CheckCircle2, 
  Calendar,
  AlertOctagon,
  Anchor,
  Radio,
  Wifi,
  Sparkles,
  Layers,
  Map,
  Scale,
  Cloud,
  Database,
  LogIn,
  LogOut
} from "lucide-react";

import ProvisionsAnalytics from "./components/ProvisionsAnalytics";
import BridgeWatchkeeping from "./components/BridgeWatchkeeping";
import SafetyDrills from "./components/SafetyDrills";
import DepartmentDirectory from "./components/DepartmentDirectory";
import VoyagePlanning from "./components/VoyagePlanning";
import VesselProfile from "./components/VesselProfile";
import LoadBallast from "./components/LoadBallast";
import UserProfileModal from "./components/UserProfileModal";
import { UserProfile, getStoredUserProfile } from "./types/userProfile";
import { WORLDWIDE_FLAGS } from "./constants/maritimeData";
import { useFirebase } from "./context/FirebaseContext";

type ActiveTab = "vessel" | "load_ballast" | "departments" | "provisions" | "bridge" | "drills" | "planning";

export default function App() {
  const { currentUser, isAuthReady, isConnected, login, logout } = useFirebase();
  const [activeTab, setActiveTab] = useState<ActiveTab>("bridge");
  const [timeUTC, setTimeUTC] = useState("");
  const [timeGMT, setTimeGMT] = useState("");
  const [timeLT, setTimeLT] = useState("");
  const [dateLT, setDateLT] = useState("");

  // Real-Time GPS Tracking & Micro-Drift States
  const [gpsPosition, setGpsPosition] = useState<{ lat: string; lng: string }>(() => {
    const cachedLat = localStorage.getItem("sms_gps_lat") || "34° 02.40' N";
    const cachedLng = localStorage.getItem("sms_gps_lng") || "118° 29.70' W";
    return { lat: cachedLat, lng: cachedLng };
  });
  const [gpsError, setGpsError] = useState<string | null>(null);
  
  // Vessel Profile States with Local Storage caching
  const [vesselName, setVesselName] = useState(() => localStorage.getItem("sms_vesselName") || "PACIFIC SENTINEL");
  const [imoNumber, setImoNumber] = useState(() => localStorage.getItem("sms_imoNumber") || "9845722");
  const [callSign, setCallSign] = useState(() => localStorage.getItem("sms_callSign") || "9V8841");
  const [flagState, setFlagState] = useState(() => localStorage.getItem("sms_flagState") || "Singapore 🇸🇬");
  const [dwt, setDwt] = useState(() => Number(localStorage.getItem("sms_dwt")) || 115000);
  const [freshWaterMax, setFreshWaterMax] = useState(() => Number(localStorage.getItem("sms_freshWaterMax")) || 450);
  const [fuelCapacity, setFuelCapacity] = useState(() => Number(localStorage.getItem("sms_fuelCapacity")) || 1800);

  // Extended Vessel Profile States
  const [mmsiNumber, setMmsiNumber] = useState(() => localStorage.getItem("sms_mmsiNumber") || "563084100");
  const [classificationSociety, setClassificationSociety] = useState(() => localStorage.getItem("sms_classSociety") || "ABS");
  
  const [loa, setLoa] = useState(() => Number(localStorage.getItem("sms_loa")) || 299.9);
  const [lbp, setLbp] = useState(() => Number(localStorage.getItem("sms_lbp")) || 285.0);
  const [beam, setBeam] = useState(() => Number(localStorage.getItem("sms_beam")) || 48.2);
  const [draft, setDraft] = useState(() => Number(localStorage.getItem("sms_draft")) || 15.5);
  const [freeboard, setFreeboard] = useState(() => Number(localStorage.getItem("sms_freeboard")) || 6.2);
  const [airDraft, setAirDraft] = useState(() => Number(localStorage.getItem("sms_airDraft")) || 49.5);
  
  const [gt, setGt] = useState(() => Number(localStorage.getItem("sms_gt")) || 93500);
  const [nt, setNt] = useState(() => Number(localStorage.getItem("sms_nt")) || 57200);
  const [lightship, setLightship] = useState(() => Number(localStorage.getItem("sms_lightship")) || 23500);
  
  const [mainEngine, setMainEngine] = useState(() => localStorage.getItem("sms_mainEngine") || "MAN B&W 6G80ME-C9.5 (22,400 kW @ 72 RPM)");
  const [auxEngines, setAuxEngines] = useState(() => localStorage.getItem("sms_auxEngines") || "3x Wärtsilä 6L20 (1,200 kWe each)");
  const [serviceSpeed, setServiceSpeed] = useState(() => Number(localStorage.getItem("sms_serviceSpeed")) || 15.8);
  const [fuelConsumption, setFuelConsumption] = useState(() => Number(localStorage.getItem("sms_fuelConsumption")) || 45.5);
  
  const [vesselConfigType, setVesselConfigType] = useState(() => localStorage.getItem("sms_vesselConfigType") || "Container Ship");
  const [lngSubType, setLngSubType] = useState(() => localStorage.getItem("sms_lngSubType") || "Membrane Type");

  // User Profile States & Modal
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile>(() => getStoredUserProfile());
  const [showUserProfileModal, setShowUserProfileModal] = useState<boolean>(false);

  useEffect(() => {
    const handleProfileChange = () => {
      setCurrentUserProfile(getStoredUserProfile());
    };
    window.addEventListener("sms_user_profile_changed", handleProfileChange);
    return () => window.removeEventListener("sms_user_profile_changed", handleProfileChange);
  }, []);

  // Modal temporary values & error state
  const [showVesselModal, setShowVesselModal] = useState(false);
  const [tempVesselName, setTempVesselName] = useState("");
  const [tempImoNumber, setTempImoNumber] = useState("");
  const [tempCallSign, setTempCallSign] = useState("");
  const [tempFlagState, setTempFlagState] = useState("");
  const [tempDwt, setTempDwt] = useState<string | number>("");
  const [tempFreshWaterMax, setTempFreshWaterMax] = useState<string | number>("");
  const [tempFuelCapacity, setTempFuelCapacity] = useState<string | number>("");
  const [modalError, setModalError] = useState("");

  const handleOpenVesselModal = () => {
    setTempVesselName(vesselName);
    setTempImoNumber(imoNumber);
    setTempCallSign(callSign);
    setTempFlagState(flagState);
    setTempDwt(dwt);
    setTempFreshWaterMax(freshWaterMax);
    setTempFuelCapacity(fuelCapacity);
    setModalError("");
    setShowVesselModal(true);
  };

  // Persist to local storage cache when changed
  useEffect(() => {
    localStorage.setItem("sms_vesselName", vesselName);
    localStorage.setItem("sms_imoNumber", imoNumber);
    localStorage.setItem("sms_callSign", callSign);
    localStorage.setItem("sms_flagState", flagState);
    localStorage.setItem("sms_dwt", dwt.toString());
    localStorage.setItem("sms_freshWaterMax", freshWaterMax.toString());
    localStorage.setItem("sms_fuelCapacity", fuelCapacity.toString());
    localStorage.setItem("sms_mmsiNumber", mmsiNumber);
    localStorage.setItem("sms_classSociety", classificationSociety);
    localStorage.setItem("sms_loa", loa.toString());
    localStorage.setItem("sms_lbp", lbp.toString());
    localStorage.setItem("sms_beam", beam.toString());
    localStorage.setItem("sms_draft", draft.toString());
    localStorage.setItem("sms_freeboard", freeboard.toString());
    localStorage.setItem("sms_airDraft", airDraft.toString());
    localStorage.setItem("sms_gt", gt.toString());
    localStorage.setItem("sms_nt", nt.toString());
    localStorage.setItem("sms_lightship", lightship.toString());
    localStorage.setItem("sms_mainEngine", mainEngine);
    localStorage.setItem("sms_auxEngines", auxEngines);
    localStorage.setItem("sms_serviceSpeed", serviceSpeed.toString());
    localStorage.setItem("sms_fuelConsumption", fuelConsumption.toString());
    localStorage.setItem("sms_vesselConfigType", vesselConfigType);
    localStorage.setItem("sms_lngSubType", lngSubType);
  }, [
    vesselName, imoNumber, callSign, flagState, dwt, freshWaterMax, fuelCapacity,
    mmsiNumber, classificationSociety, loa, lbp, beam, draft, freeboard, airDraft,
    gt, nt, lightship, mainEngine, auxEngines, serviceSpeed, fuelConsumption,
    vesselConfigType, lngSubType
  ]);

  const getFlagPrefix = (flag: string) => {
    if (!flag) return "REG";
    const cleanWord = flag.split(" ")[0].replace(/[^a-zA-Z]/g, "").toUpperCase();
    return cleanWord.substring(0, 3) || "REG";
  };

  // Setup GPS Geolocation API Watcher with high-accuracy
  useEffect(() => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setGpsError("NOT_SUPPORTED");
      return;
    }

    const formatLatitude = (lat: number): string => {
      const direction = lat >= 0 ? "N" : "S";
      const absLat = Math.abs(lat);
      const degrees = Math.floor(absLat);
      const minutes = ((absLat - degrees) * 60).toFixed(2);
      return `${String(degrees).padStart(2, "0")}° ${String(minutes).padStart(5, "0")}' ${direction}`;
    };

    const formatLongitude = (lng: number): string => {
      const direction = lng >= 0 ? "E" : "W";
      const absLng = Math.abs(lng);
      const degrees = Math.floor(absLng);
      const minutes = ((absLng - degrees) * 60).toFixed(2);
      return `${String(degrees).padStart(3, "0")}° ${String(minutes).padStart(5, "0")}' ${direction}`;
    };

    const successHandler = (position: GeolocationPosition) => {
      const latStr = formatLatitude(position.coords.latitude);
      const lngStr = formatLongitude(position.coords.longitude);
      setGpsPosition({ lat: latStr, lng: lngStr });
      localStorage.setItem("sms_gps_lat", latStr);
      localStorage.setItem("sms_gps_lng", lngStr);
      setGpsError(null);
    };

    const errorHandler = (err: GeolocationPositionError) => {
      console.warn("GPS Geolocation Error (expected in sandbox):", err.message);
      setGpsError(err.message || "PERMISSION_DENIED");
    };

    const watchId = navigator.geolocation.watchPosition(successHandler, errorHandler, {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 10000
    });

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  // Ships micro-drift simulation when Geolocation fails/is blocked (common inside sandbox frames)
  useEffect(() => {
    if (!gpsError) return;

    const interval = setInterval(() => {
      setGpsPosition(prev => {
        try {
          const latMatch = prev.lat.match(/(\d+)°\s+([\d.]+)'\s+([NS])/);
          const lngMatch = prev.lng.match(/(\d+)°\s+([\d.]+)'\s+([EW])/);
          if (latMatch && lngMatch) {
            let latDeg = parseInt(latMatch[1]);
            let latMin = parseFloat(latMatch[2]);
            const latDir = latMatch[3];

            let lngDeg = parseInt(lngMatch[1]);
            let lngMin = parseFloat(lngMatch[2]);
            const lngDir = lngMatch[3];

            // Drift slowly: add 0.01-0.03 minutes representing active passage
            latMin += (Math.random() * 0.02);
            if (latMin >= 60) {
              latMin -= 60;
              latDeg += 1;
            }

            lngMin += (Math.random() * 0.02);
            if (lngMin >= 60) {
              lngMin -= 60;
              lngDeg += 1;
            }

            const newLat = `${String(latDeg).padStart(2, "0")}° ${latMin.toFixed(2).padStart(5, "0")}' ${latDir}`;
            const newLng = `${String(lngDeg).padStart(3, "0")}° ${lngMin.toFixed(2).padStart(5, "0")}' ${lngDir}`;

            localStorage.setItem("sms_gps_lat", newLat);
            localStorage.setItem("sms_gps_lng", newLng);

            return { lat: newLat, lng: newLng };
          }
        } catch (e) {
          console.error("GPS drift parsing error", e);
        }
        return prev;
      });
    }, 4000);

    return () => clearInterval(interval);
  }, [gpsError]);

  // Update dynamic vessel time of watch (IMO-Compliant Real-Time Chronometer)
  useEffect(() => {
    const updateChronometer = () => {
      const now = new Date();
      
      // UTC: Coordinated Universal Time
      const utcHours = String(now.getUTCHours()).padStart(2, "0");
      const utcMinutes = String(now.getUTCMinutes()).padStart(2, "0");
      const utcSeconds = String(now.getUTCSeconds()).padStart(2, "0");
      setTimeUTC(`${utcHours}:${utcMinutes}:${utcSeconds}`);
      
      // GMT: Greenwich Mean Time (technically same offset as UTC)
      setTimeGMT(`${utcHours}:${utcMinutes}:${utcSeconds}`);
      
      // Local Time (LT)
      const ltHours = String(now.getHours()).padStart(2, "0");
      const ltMinutes = String(now.getMinutes()).padStart(2, "0");
      const ltSeconds = String(now.getSeconds()).padStart(2, "0");
      setTimeLT(`${ltHours}:${ltMinutes}:${ltSeconds}`);
      
      // Local Date
      const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
      const ltDay = String(now.getDate()).padStart(2, "0");
      const ltMonth = months[now.getMonth()];
      const ltYear = now.getFullYear();
      setDateLT(`${ltDay} ${ltMonth} ${ltYear}`);
    };

    updateChronometer();
    const interval = setInterval(updateChronometer, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-slate-200 relative">
      
      {/* 1. VESSEL MASTER NAVIGATION DECK (Header HUD) */}
      <header className="bg-[#0A2540] text-white px-6 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shrink-0 relative z-10 shadow-md border-b border-slate-700">
        {/* Logo Brand & User Profile Access */}
        <div className="flex items-center gap-4">
          <div 
            onClick={() => setShowUserProfileModal(true)}
            className="w-10 h-10 bg-[#00A86B] rounded-sm flex items-center justify-center shadow-lg cursor-pointer hover:bg-emerald-600 transition-colors group relative"
            title="Click App Logo to open User Profile & Sea Duty Setup [ME / USER]"
          >
            <Anchor className="text-white w-6 h-6 group-hover:scale-105 transition-transform" />
            <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-[#0A2540] text-[#00A86B] border border-[#00A86B] rounded-full flex items-center justify-center text-[7px] font-black">
              ME
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-white font-extrabold text-sm md:text-base tracking-wider uppercase leading-none">
                Shipboard Management System
              </h1>
              <span className="text-[9px] px-2 py-0.5 rounded bg-white/10 border border-white/20 text-[#00A86B] font-mono font-bold uppercase shrink-0">
                v4.2 PMS
              </span>
            </div>
            <p className="text-[10px] text-slate-300 font-mono mt-1 uppercase tracking-wider">
              Vessel: {vesselName} [IMO {imoNumber}]
            </p>
          </div>

          {/* User Profile Sea Duty Status Chip */}
          <button 
            type="button"
            onClick={() => setShowUserProfileModal(true)}
            className="hidden lg:flex items-center gap-2 bg-slate-900/60 hover:bg-slate-900 border border-emerald-500/50 px-2.5 py-1 cursor-pointer transition-colors text-left"
            title="Click to edit User Profile & Sea Duty Setup"
          >
            <span className="text-[8px] px-1 py-0.2 bg-[#00A86B] text-white font-mono font-black uppercase">
              [ME / USER]
            </span>
            <div className="font-mono leading-tight">
              <span className="text-white text-[10px] font-bold block">{currentUserProfile.rank}</span>
              <span className="text-slate-300 text-[9px] block">{currentUserProfile.fullName}</span>
            </div>
          </button>

          {/* Firebase Cloud Sync & Google Auth */}
          <div className="hidden md:flex items-center gap-2">
            {currentUser ? (
              <div className="flex items-center gap-2 bg-slate-900/70 border border-slate-700 px-2 py-1 text-xs">
                {currentUser.photoURL ? (
                  <img src={currentUser.photoURL} alt="" className="w-5 h-5 rounded-full" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-[#00A86B] flex items-center justify-center text-[10px] font-bold text-white">
                    {currentUser.displayName?.[0] || "U"}
                  </div>
                )}
                <div className="font-mono text-left leading-tight hidden xl:block">
                  <span className="text-white text-[10px] font-bold block truncate max-w-[120px]">
                    {currentUser.displayName || currentUser.email}
                  </span>
                  <span className="text-[#00A86B] text-[8px] font-bold flex items-center gap-1">
                    <Cloud className="w-2.5 h-2.5" /> Firestore Connected
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => logout()}
                  className="p-1 hover:text-red-400 text-slate-400 transition-colors cursor-pointer"
                  title="Sign Out of Firebase"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => login()}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-slate-100 text-[#0A2540] text-[10px] font-mono font-bold uppercase transition-colors cursor-pointer border border-slate-300 shadow-xs"
                title="Sign in with Google to enable real-time Firebase Firestore cloud persistence"
              >
                <svg className="w-3 h-3" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>Google Sign-In</span>
              </button>
            )}
          </div>
        </div>

        {/* Telemetry and Chronometers Group */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 self-stretch md:self-auto justify-end">
          {/* Real-Time GPS Navigation Module */}
          <div id="live-gps-telemetry-module" className="flex items-center gap-3 bg-slate-900/40 px-4 py-2 border border-slate-700/60 shadow-inner rounded-sm select-none">
            <div className="relative w-8 h-8 flex items-center justify-center bg-slate-800/80 rounded-sm border border-slate-700 shrink-0">
              <span className="absolute w-2.5 h-2.5 bg-[#00A86B]/40 rounded-full animate-ping" />
              <span className="relative w-1.5 h-1.5 bg-[#00A86B] rounded-full" />
              <Compass className="w-5 h-5 text-[#00A86B] absolute opacity-40 animate-pulse" />
            </div>
            <div className="text-left font-mono">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] uppercase text-slate-400 font-bold tracking-wider leading-none">LIVE GPS FIX:</span>
                <span className="text-[8px] px-1 bg-emerald-950 text-[#00A86B] border border-emerald-800 rounded-xs font-bold uppercase shrink-0 tracking-widest leading-none animate-pulse">
                  {gpsError ? "SIMULATED" : "ACTIVE GPS"}
                </span>
              </div>
              <div className="text-xs font-black tracking-wide text-white mt-1 select-all leading-none">
                {gpsPosition.lat} / {gpsPosition.lng}
              </div>
            </div>
          </div>

          {/* IMO-Compliant Real-Time Chronometer */}
          <div id="imo-chronometer-module" className="bg-white border border-slate-300 text-[#0A2540] px-4 py-2 flex items-center gap-4 shrink-0 rounded-none shadow-sm select-none">
            <div className="flex flex-col text-[8px] font-mono font-bold leading-tight uppercase tracking-wider text-slate-500 border-r border-slate-300 pr-3 hidden sm:flex">
              <span>IMO CHRONO</span>
              <span>Watch III</span>
            </div>
            <div className="flex items-center gap-3 md:gap-4">
              {/* UTC Panel */}
              <div className="text-center">
                <span className="text-[8px] font-mono block text-slate-400 font-bold uppercase tracking-wider leading-none">UTC</span>
                <span className="font-mono text-xs md:text-sm font-black tracking-wide tabular-nums block mt-1 text-[#0A2540]">
                  {timeUTC || "00:00:00"}
                </span>
              </div>
              
              <div className="w-px h-6 bg-slate-200"></div>

              {/* GMT Panel */}
              <div className="text-center">
                <span className="text-[8px] font-mono block text-slate-400 font-bold uppercase tracking-wider leading-none">GMT</span>
                <span className="font-mono text-xs md:text-sm font-black tracking-wide tabular-nums block mt-1 text-[#0A2540]">
                  {timeGMT || "00:00:00"}
                </span>
              </div>

              <div className="w-px h-6 bg-slate-200"></div>

              {/* Local Time (LT) Panel */}
              <div className="text-center">
                <span className="text-[8px] font-mono block text-[#00A86B] font-bold uppercase tracking-wider leading-none">LT (Local)</span>
                <span className="font-mono text-xs md:text-sm font-black tracking-wide tabular-nums text-[#00A86B] block mt-1">
                  {timeLT || "00:00:00"}
                </span>
              </div>
            </div>
            
            <div className="w-px h-6 bg-slate-200 hidden sm:block"></div>

            <div className="hidden sm:flex flex-col justify-center text-right text-[9px] font-mono font-bold leading-tight text-slate-500">
              <span>{dateLT || "01 JAN 2026"}</span>
            </div>
          </div>
        </div>
      </header>

      {/* 2. SUB-DECK MODULE SELECTOR NAVIGATION (Tabs) */}
      <nav className="bg-white border-b border-slate-200 py-3 px-6 shrink-0 shadow-sm z-10">
        <div className="max-w-7xl mx-auto flex flex-wrap gap-2 md:gap-3">
          
          <button
            onClick={() => setActiveTab("vessel")}
            className={`px-4 py-2 text-xs font-bold tracking-wider uppercase flex items-center gap-2 cursor-pointer transition-all border ${
              activeTab === "vessel"
                ? "bg-[#0A2540] text-white border-[#0A2540] shadow-sm"
                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <Ship className="w-3.5 h-3.5 shrink-0" />
            VESSEL PROFILE
          </button>

          <button
            onClick={() => setActiveTab("load_ballast")}
            className={`px-4 py-2 text-xs font-bold tracking-wider uppercase flex items-center gap-2 cursor-pointer transition-all border ${
              activeTab === "load_ballast"
                ? "bg-[#0A2540] text-white border-[#0A2540] shadow-sm"
                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <Scale className="w-3.5 h-3.5 shrink-0" />
            LOAD & BALLAST
          </button>

          <button
            onClick={() => setActiveTab("departments")}
            className={`px-4 py-2 text-xs font-bold tracking-wider uppercase flex items-center gap-2 cursor-pointer transition-all border ${
              activeTab === "departments"
                ? "bg-[#0A2540] text-white border-[#0A2540] shadow-sm"
                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <Layers className="w-3.5 h-3.5 shrink-0" />
            Departments & Crew
          </button>

          <button
            onClick={() => setActiveTab("provisions")}
            className={`px-4 py-2 text-xs font-bold tracking-wider uppercase flex items-center gap-2 cursor-pointer transition-all border ${
              activeTab === "provisions"
                ? "bg-[#0A2540] text-white border-[#0A2540] shadow-sm"
                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <Droplet className="w-3.5 h-3.5 shrink-0" />
            Provisions & Logistics
          </button>

          <button
            onClick={() => setActiveTab("bridge")}
            className={`px-4 py-2 text-xs font-bold tracking-wider uppercase flex items-center gap-2 cursor-pointer transition-all border ${
              activeTab === "bridge"
                ? "bg-[#0A2540] text-white border-[#0A2540] shadow-sm"
                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <Compass className="w-3.5 h-3.5 shrink-0" />
            BRIDGE WATCHKEEPING & CALENDAR
          </button>

          <button
            onClick={() => setActiveTab("drills")}
            className={`px-4 py-2 text-xs font-bold tracking-wider uppercase flex items-center gap-2 cursor-pointer transition-all border ${
              activeTab === "drills"
                ? "bg-[#0A2540] text-white border-[#0A2540] shadow-sm"
                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <Flame className="w-3.5 h-3.5 shrink-0" />
            DRILLS & TRAINING
          </button>

          <button
            onClick={() => setActiveTab("planning")}
            className={`px-4 py-2 text-xs font-bold tracking-wider uppercase flex items-center gap-2 cursor-pointer transition-all border ${
              activeTab === "planning"
                ? "bg-[#0A2540] text-white border-[#0A2540] shadow-sm"
                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <Map className="w-3.5 h-3.5 shrink-0" />
            VOYAGE PLANNING
          </button>
        </div>
      </nav>

      {/* Dynamic Vessel Telemetry Registry Banner */}
      <div className="bg-white border-b border-slate-200 py-3 px-6 shadow-sm shrink-0 z-10 text-[11px] font-mono">
        <div className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <div className="border-r border-slate-200/60 pr-2">
            <span className="text-slate-400 block text-[8px] uppercase tracking-wider">Vessel Name</span>
            <span className="text-[#0A2540] font-extrabold uppercase truncate block" title={vesselName}>{vesselName}</span>
          </div>
          <div className="border-r border-slate-200/60 pr-2">
            <span className="text-slate-400 block text-[8px] uppercase tracking-wider">IMO Number</span>
            <span className="text-slate-700 font-bold block">{imoNumber}</span>
          </div>
          <div className="border-r border-slate-200/60 pr-2">
            <span className="text-slate-400 block text-[8px] uppercase tracking-wider">Call Sign</span>
            <span className="text-slate-700 font-bold block uppercase">{callSign || "—"}</span>
          </div>
          <div className="border-r border-slate-200/60 pr-2">
            <span className="text-slate-400 block text-[8px] uppercase tracking-wider">Flag State</span>
            <span className="text-slate-700 font-bold block flex items-center gap-1">{flagState}</span>
          </div>
          <div className="border-r border-slate-200/60 pr-2">
            <span className="text-slate-400 block text-[8px] uppercase tracking-wider">Deadweight (DWT)</span>
            <span className="text-slate-700 font-bold block">{Number(dwt).toLocaleString()} MT</span>
          </div>
          <div className="border-r border-slate-200/60 pr-2">
            <span className="text-slate-400 block text-[8px] uppercase tracking-wider">FW Max Capacity</span>
            <span className="text-slate-700 font-bold block">{Number(freshWaterMax).toLocaleString()} MT</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[8px] uppercase tracking-wider">Fuel Cap (HFO/MGO)</span>
            <span className="text-slate-700 font-bold block">{Number(fuelCapacity).toLocaleString()} CBM</span>
          </div>
        </div>
      </div>

      {/* 3. CORE ACTIVE MODULE DISPLAY PANEL */}
      <main className="flex-1 p-4 md:p-6 overflow-y-auto max-w-7xl w-full mx-auto z-10">
        <div className="h-full">
          {activeTab === "vessel" && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <VesselProfile 
                vesselName={vesselName}
                setVesselName={setVesselName}
                imoNumber={imoNumber}
                setImoNumber={setImoNumber}
                callSign={callSign}
                setCallSign={setCallSign}
                flagState={flagState}
                setFlagState={setFlagState}
                dwt={dwt}
                setDwt={setDwt}
                freshWaterMax={freshWaterMax}
                setFreshWaterMax={setFreshWaterMax}
                fuelCapacity={fuelCapacity}
                setFuelCapacity={setFuelCapacity}
                mmsiNumber={mmsiNumber}
                setMmsiNumber={setMmsiNumber}
                classificationSociety={classificationSociety}
                setClassificationSociety={setClassificationSociety}
                loa={loa}
                setLoa={setLoa}
                lbp={lbp}
                setLbp={setLbp}
                beam={beam}
                setBeam={setBeam}
                draft={draft}
                setDraft={setDraft}
                freeboard={freeboard}
                setFreeboard={setFreeboard}
                airDraft={airDraft}
                setAirDraft={setAirDraft}
                gt={gt}
                setGt={setGt}
                nt={nt}
                setNt={setNt}
                lightship={lightship}
                setLightship={setLightship}
                mainEngine={mainEngine}
                setMainEngine={setMainEngine}
                auxEngines={auxEngines}
                setAuxEngines={setAuxEngines}
                serviceSpeed={serviceSpeed}
                setServiceSpeed={setServiceSpeed}
                fuelConsumption={fuelConsumption}
                setFuelConsumption={setFuelConsumption}
                vesselConfigType={vesselConfigType}
                setVesselConfigType={setVesselConfigType}
                lngSubType={lngSubType}
                setLngSubType={setLngSubType}
              />
            </motion.div>
          )}

          {activeTab === "load_ballast" && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <LoadBallast 
                vesselConfigType={vesselConfigType}
                setVesselConfigType={setVesselConfigType}
                dwt={dwt}
                lightship={lightship}
                freshWaterMax={freshWaterMax}
                fuelCapacity={fuelCapacity}
                vesselName={vesselName}
                callSign={callSign}
              />
            </motion.div>
          )}

          {activeTab === "departments" && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <DepartmentDirectory />
            </motion.div>
          )}

          {activeTab === "provisions" && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <ProvisionsAnalytics />
            </motion.div>
          )}

          {activeTab === "bridge" && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <BridgeWatchkeeping />
            </motion.div>
          )}

          {activeTab === "drills" && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <SafetyDrills />
            </motion.div>
          )}

          {activeTab === "planning" && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <VoyagePlanning />
            </motion.div>
          )}
        </div>
      </main>

      {/* 4. MASTER DEEP WATER STATUS BAR (Footer) */}
      <footer className="bg-white border-t border-slate-200 py-3.5 px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0 z-10 text-[10px] font-mono text-slate-500">
        <div className="flex flex-wrap gap-x-6 gap-y-2 items-center">
          <div className="flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-[#00A86B] mr-2 animate-pulse"></span> AIS ACTIVE TRANSMITTING</div>
          <div className="flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-[#0A2540] mr-2"></span> SOLAS-MARPOL CERTIFIED</div>
          <div className="flex items-center">
            <span className={`w-2.5 h-2.5 rounded-full mr-2 ${gpsError ? "bg-amber-400 animate-pulse" : "bg-[#00A86B]"}`}></span> 
            GPS RECEIVER STATUS: {gpsError ? "SIMULATED DRIFT" : "LOCK 3D"}
          </div>
        </div>
        <div className="flex items-center space-x-4 self-start sm:self-auto">
          <span className="uppercase font-bold text-slate-400">SMCP STANDARDS STRICT</span>
          <div className="px-3 py-1 bg-slate-100 border border-slate-200 text-[#0A2540] rounded text-[10px] font-bold">
            Officer on Watch Validated
          </div>
        </div>
      </footer>

      {/* Vessel Profile Edit Modal */}
      <AnimatePresence>
        {showVesselModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-300 shadow-2xl p-6 w-full max-w-md relative rounded-none"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3 mb-4">
                <div className="w-8 h-8 bg-[#00A86B] rounded-sm flex items-center justify-center shadow">
                  <Anchor className="text-white w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-xs font-extrabold text-[#0A2540] uppercase tracking-wider">
                    Edit Vessel Profile
                  </h3>
                  <p className="text-[9px] text-slate-400 font-mono uppercase">Vessel Registry Settings</p>
                </div>
              </div>

              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                {modalError && (
                  <div className="bg-red-50 border border-red-200 text-red-600 text-[10px] font-mono px-3 py-2 rounded-none">
                    {modalError}
                  </div>
                )}

                <div className="space-y-1">
                  <label className="block text-[9px] font-mono uppercase text-slate-500 tracking-wider">
                    Vessel Name
                  </label>
                  <input
                    type="text"
                    value={tempVesselName}
                    onChange={(e) => setTempVesselName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-800 font-sans focus:outline-none focus:bg-white focus:border-slate-400 rounded-none"
                    placeholder="e.g. PACIFIC SENTINEL"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[9px] font-mono uppercase text-slate-500 tracking-wider">
                    IMO Number (7 Digits)
                  </label>
                  <input
                    type="text"
                    maxLength={7}
                    value={tempImoNumber}
                    onChange={(e) => setTempImoNumber(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-800 font-sans focus:outline-none focus:bg-white focus:border-slate-400 rounded-none"
                    placeholder="e.g. 9845722"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[9px] font-mono uppercase text-slate-500 tracking-wider">
                    Call Sign
                  </label>
                  <input
                    type="text"
                    value={tempCallSign}
                    onChange={(e) => setTempCallSign(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-800 font-sans focus:outline-none focus:bg-white focus:border-slate-400 rounded-none"
                    placeholder="e.g. 9V8841"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[9px] font-mono uppercase text-slate-500 tracking-wider">
                    Flag State / Registry
                  </label>
                  <select
                    value={tempFlagState}
                    onChange={(e) => setTempFlagState(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-800 font-sans focus:outline-none focus:bg-white focus:border-slate-400 rounded-none max-h-40 overflow-y-auto"
                  >
                    {WORLDWIDE_FLAGS.map((flag) => (
                      <option key={flag} value={flag}>
                        {flag}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[9px] font-mono uppercase text-slate-500 tracking-wider">
                    Deadweight Tonnage - DWT (Metric Tons)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={tempDwt}
                    onChange={(e) => setTempDwt(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-800 font-sans focus:outline-none focus:bg-white focus:border-slate-400 rounded-none"
                    placeholder="e.g. 115000"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[9px] font-mono uppercase text-slate-500 tracking-wider">
                    Fresh Water Max Capacity (Metric Tons)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={tempFreshWaterMax}
                    onChange={(e) => setTempFreshWaterMax(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-800 font-sans focus:outline-none focus:bg-white focus:border-slate-400 rounded-none"
                    placeholder="e.g. 450"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[9px] font-mono uppercase text-slate-500 tracking-wider">
                    Fuel Capacity - HFO/MGO (Cubic Meters)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={tempFuelCapacity}
                    onChange={(e) => setTempFuelCapacity(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-800 font-sans focus:outline-none focus:bg-white focus:border-slate-400 rounded-none"
                    placeholder="e.g. 1800"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowVesselModal(false);
                  }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-600 text-xs font-mono uppercase font-bold cursor-pointer rounded-none"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!tempVesselName.trim()) {
                      setModalError("Vessel Name is required.");
                      return;
                    }
                    if (tempImoNumber.trim().length !== 7) {
                      setModalError("IMO Number must be exactly 7 digits.");
                      return;
                    }
                    if (!tempCallSign.trim()) {
                      setModalError("Call Sign is required.");
                      return;
                    }
                    if (tempDwt === "" || isNaN(Number(tempDwt)) || Number(tempDwt) <= 0) {
                      setModalError("DWT must be a valid positive number.");
                      return;
                    }
                    if (tempFreshWaterMax === "" || isNaN(Number(tempFreshWaterMax)) || Number(tempFreshWaterMax) <= 0) {
                      setModalError("Fresh Water Max Capacity must be a valid positive number.");
                      return;
                    }
                    if (tempFuelCapacity === "" || isNaN(Number(tempFuelCapacity)) || Number(tempFuelCapacity) <= 0) {
                      setModalError("Fuel Capacity must be a valid positive number.");
                      return;
                    }

                    setVesselName(tempVesselName.trim().toUpperCase());
                    setImoNumber(tempImoNumber.trim());
                    setCallSign(tempCallSign.trim().toUpperCase());
                    setFlagState(tempFlagState);
                    setDwt(Number(tempDwt));
                    setFreshWaterMax(Number(tempFreshWaterMax));
                    setFuelCapacity(Number(tempFuelCapacity));
                    setModalError("");
                    setShowVesselModal(false);
                  }}
                  className="px-3 py-1.5 bg-[#00A86B] hover:bg-emerald-600 text-white text-xs font-mono uppercase font-bold cursor-pointer rounded-none"
                >
                  Save Profile
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* User Profile & Sea Duty Setup Modal */}
      <UserProfileModal 
        isOpen={showUserProfileModal}
        onClose={() => setShowUserProfileModal(false)}
        onProfileUpdated={(updated) => setCurrentUserProfile(updated)}
      />
    </div>
  );
}

