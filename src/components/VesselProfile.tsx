import React, { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Anchor, 
  Ship, 
  FileText, 
  Compass, 
  Activity, 
  ShieldCheck, 
  Scale, 
  CheckCircle,
  Upload,
  Image as ImageIcon,
  Trash2,
  RefreshCw,
  Camera,
  Maximize2,
  X,
  FileCheck,
  CheckCircle2
} from "lucide-react";
import { WORLDWIDE_FLAGS } from "../constants/maritimeData";

export const SHIP_TYPE_OPTIONS = [
  "Bulk Carrier",
  "Container Ship",
  "General Cargo",
  "LNG Ship",
  "LPG Ship",
  "Ro-Ro Ship"
] as const;

export type ShipType = typeof SHIP_TYPE_OPTIONS[number];

// High quality maritime vessel photo fallback
const DEFAULT_VESSEL_PHOTO = "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=1200&q=80";

interface VesselProfileProps {
  vesselName: string;
  setVesselName: (name: string) => void;
  imoNumber: string;
  setImoNumber: (imo: string) => void;
  callSign: string;
  setCallSign: (call: string) => void;
  flagState: string;
  setFlagState: (flag: string) => void;
  dwt: number;
  setDwt: (dwt: number) => void;
  freshWaterMax: number;
  setFreshWaterMax: (fw: number) => void;
  fuelCapacity: number;
  setFuelCapacity: (fuel: number) => void;
  
  // Extended state passed from App or managed internally if missing
  mmsiNumber?: string;
  setMmsiNumber?: (mmsi: string) => void;
  classificationSociety?: string;
  setClassificationSociety?: (soc: string) => void;
  
  loa?: number;
  setLoa?: (loa: number) => void;
  lbp?: number;
  setLbp?: (lbp: number) => void;
  beam?: number;
  setBeam?: (beam: number) => void;
  draft?: number;
  setDraft?: (draft: number) => void;
  freeboard?: number;
  setFreeboard?: (fb: number) => void;
  airDraft?: number;
  setAirDraft?: (ad: number) => void;
  
  gt?: number;
  setGt?: (gt: number) => void;
  nt?: number;
  setNt?: (nt: number) => void;
  lightship?: number;
  setLightship?: (ls: number) => void;
  
  mainEngine?: string;
  setMainEngine?: (me: string) => void;
  auxEngines?: string;
  setAuxEngines?: (aux: string) => void;
  serviceSpeed?: number;
  setServiceSpeed?: (speed: number) => void;
  fuelConsumption?: number;
  setFuelConsumption?: (fuel: number) => void;
  
  vesselConfigType?: string;
  setVesselConfigType?: (type: string) => void;
  lngSubType?: string;
  setLngSubType?: (type: string) => void;
}

export default function VesselProfile(props: VesselProfileProps) {
  // Use props if available, or fall back to local state (synchronized to localStorage)
  const [localMmsi, setLocalMmsi] = useState(() => localStorage.getItem("sms_mmsiNumber") || "563084100");
  const [localClass, setLocalClass] = useState(() => localStorage.getItem("sms_classSociety") || "ABS");
  
  const [localLoa, setLocalLoa] = useState(() => Number(localStorage.getItem("sms_loa")) || 299.9);
  const [localLbp, setLocalLbp] = useState(() => Number(localStorage.getItem("sms_lbp")) || 285.0);
  const [localBeam, setLocalBeam] = useState(() => Number(localStorage.getItem("sms_beam")) || 48.2);
  const [localDraft, setLocalDraft] = useState(() => Number(localStorage.getItem("sms_draft")) || 15.5);
  const [localFreeboard, setLocalFreeboard] = useState(() => Number(localStorage.getItem("sms_freeboard")) || 6.2);
  const [localAirDraft, setLocalAirDraft] = useState(() => Number(localStorage.getItem("sms_airDraft")) || 49.5);
  
  const [localGt, setLocalGt] = useState(() => Number(localStorage.getItem("sms_gt")) || 93500);
  const [localNt, setLocalNt] = useState(() => Number(localStorage.getItem("sms_nt")) || 57200);
  const [localLightship, setLocalLightship] = useState(() => Number(localStorage.getItem("sms_lightship")) || 23500);
  
  const [localMainEngine, setLocalMainEngine] = useState(() => localStorage.getItem("sms_mainEngine") || "MAN B&W 6G80ME-C9.5 (22,400 kW @ 72 RPM)");
  const [localAuxEngines, setLocalAuxEngines] = useState(() => localStorage.getItem("sms_auxEngines") || "3x Wärtsilä 6L20 (1,200 kWe each)");
  const [localServiceSpeed, setLocalServiceSpeed] = useState(() => Number(localStorage.getItem("sms_serviceSpeed")) || 15.8);
  const [localFuelConsumption, setLocalFuelConsumption] = useState(() => Number(localStorage.getItem("sms_fuelConsumption")) || 45.5);

  // Ship Type State: strictly options [Bulk Carrier, Container Ship, General Cargo, LNG Ship, LPG Ship, Ro-Ro Ship]
  const [shipType, setShipType] = useState<ShipType>(() => {
    const saved = localStorage.getItem("sms_shipType");
    if (saved && SHIP_TYPE_OPTIONS.includes(saved as ShipType)) {
      return saved as ShipType;
    }
    // Infer from existing vesselConfigType if available
    const config = props.vesselConfigType || localStorage.getItem("sms_vesselConfigType") || "";
    if (config.includes("Bulk")) return "Bulk Carrier";
    if (config.includes("LNG")) return "LNG Ship";
    if (config.includes("Cargo")) return "General Cargo";
    if (config.includes("Tanker") || config.includes("LPG")) return "LPG Ship";
    if (config.includes("Ro-Ro") || config.includes("Roro")) return "Ro-Ro Ship";
    return "Container Ship";
  });

  // Handle ship type change and keep vesselConfigType in sync for LoadBallast
  const handleShipTypeChange = (newType: ShipType) => {
    setShipType(newType);
    localStorage.setItem("sms_shipType", newType);
    
    // Map to config type for Load & Ballast module
    let mappedConfig = "Container Ship";
    if (newType === "Bulk Carrier") mappedConfig = "Bulk Carrier Ship";
    else if (newType === "General Cargo") mappedConfig = "General Cargo Ship";
    else if (newType === "LNG Ship") mappedConfig = "LNG Carrier Ship";
    else if (newType === "LPG Ship") mappedConfig = "Tanker";
    else if (newType === "Ro-Ro Ship") mappedConfig = "General Cargo Ship";

    if (props.setVesselConfigType) {
      props.setVesselConfigType(mappedConfig);
    }
    localStorage.setItem("sms_vesselConfigType", mappedConfig);
  };

  // Vessel Photo Upload State with localStorage persistence
  const [vesselPhoto, setVesselPhoto] = useState<string>(() => {
    return localStorage.getItem("sms_vesselPhoto") || DEFAULT_VESSEL_PHOTO;
  });
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setPhotoError("Please select a valid image file (JPEG, PNG, WebP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setPhotoError("Image size exceeds 5MB limit. Please upload an optimized file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        setVesselPhoto(base64);
        try {
          localStorage.setItem("sms_vesselPhoto", base64);
        } catch (err) {
          console.warn("Could not save to localStorage (quota exceeded)", err);
        }
        setPhotoError(null);
      }
    };
    reader.onerror = () => {
      setPhotoError("Failed to read image file.");
    };
    reader.readAsDataURL(file);
  };

  const handleResetPhoto = () => {
    setVesselPhoto(DEFAULT_VESSEL_PHOTO);
    localStorage.setItem("sms_vesselPhoto", DEFAULT_VESSEL_PHOTO);
    setPhotoError(null);
  };

  // Formal Save Confirmation Modal State
  const [showCommitModal, setShowCommitModal] = useState<boolean>(false);

  // Effective state binders
  const mmsi = props.mmsiNumber ?? localMmsi;
  const setMmsi = (val: string) => {
    const numericOnly = val.replace(/\D/g, "").substring(0, 9);
    props.setMmsiNumber ? props.setMmsiNumber(numericOnly) : setLocalMmsi(numericOnly);
    localStorage.setItem("sms_mmsiNumber", numericOnly);
  };

  const classSociety = props.classificationSociety ?? localClass;
  const setClassSociety = (val: string) => {
    props.setClassificationSociety ? props.setClassificationSociety(val) : setLocalClass(val);
    localStorage.setItem("sms_classSociety", val);
  };

  const loa = props.loa ?? localLoa;
  const setLoa = (val: number) => {
    props.setLoa ? props.setLoa(val) : setLocalLoa(val);
    localStorage.setItem("sms_loa", val.toString());
  };

  const lbp = props.lbp ?? localLbp;
  const setLbp = (val: number) => {
    props.setLbp ? props.setLbp(val) : setLocalLbp(val);
    localStorage.setItem("sms_lbp", val.toString());
  };

  const beam = props.beam ?? localBeam;
  const setBeam = (val: number) => {
    props.setBeam ? props.setBeam(val) : setLocalBeam(val);
    localStorage.setItem("sms_beam", val.toString());
  };

  const draft = props.draft ?? localDraft;
  const setDraft = (val: number) => {
    props.setDraft ? props.setDraft(val) : setLocalDraft(val);
    localStorage.setItem("sms_draft", val.toString());
  };

  const freeboard = props.freeboard ?? localFreeboard;
  const setFreeboard = (val: number) => {
    props.setFreeboard ? props.setFreeboard(val) : setLocalFreeboard(val);
    localStorage.setItem("sms_freeboard", val.toString());
  };

  const airDraft = props.airDraft ?? localAirDraft;
  const setAirDraft = (val: number) => {
    props.setAirDraft ? props.setAirDraft(val) : setLocalAirDraft(val);
    localStorage.setItem("sms_airDraft", val.toString());
  };

  const gt = props.gt ?? localGt;
  const setGt = (val: number) => {
    props.setGt ? props.setGt(val) : setLocalGt(val);
    localStorage.setItem("sms_gt", val.toString());
  };

  const nt = props.nt ?? localNt;
  const setNt = (val: number) => {
    props.setNt ? props.setNt(val) : setLocalNt(val);
    localStorage.setItem("sms_nt", val.toString());
  };

  const lightship = props.lightship ?? localLightship;
  const setLightship = (val: number) => {
    props.setLightship ? props.setLightship(val) : setLocalLightship(val);
    localStorage.setItem("sms_lightship", val.toString());
  };

  const mainEngine = props.mainEngine ?? localMainEngine;
  const setMainEngine = (val: string) => {
    props.setMainEngine ? props.setMainEngine(val) : setLocalMainEngine(val);
    localStorage.setItem("sms_mainEngine", val);
  };

  const auxEngines = props.auxEngines ?? localAuxEngines;
  const setAuxEngines = (val: string) => {
    props.setAuxEngines ? props.setAuxEngines(val) : setLocalAuxEngines(val);
    localStorage.setItem("sms_auxEngines", val);
  };

  const serviceSpeed = props.serviceSpeed ?? localServiceSpeed;
  const setServiceSpeed = (val: number) => {
    props.setServiceSpeed ? props.setServiceSpeed(val) : setLocalServiceSpeed(val);
    localStorage.setItem("sms_serviceSpeed", val.toString());
  };

  const fuelConsumption = props.fuelConsumption ?? localFuelConsumption;
  const setFuelConsumption = (val: number) => {
    props.setFuelConsumption ? props.setFuelConsumption(val) : setLocalFuelConsumption(val);
    localStorage.setItem("sms_fuelConsumption", val.toString());
  };

  // Displacement weight = DWT + Lightship
  const displacement = useMemo(() => {
    return props.dwt + lightship;
  }, [props.dwt, lightship]);

  const handleCommitChanges = () => {
    // Persist all current states to localStorage
    localStorage.setItem("sms_vesselName", props.vesselName);
    localStorage.setItem("sms_imoNumber", props.imoNumber);
    localStorage.setItem("sms_callSign", props.callSign);
    localStorage.setItem("sms_flagState", props.flagState);
    localStorage.setItem("sms_dwt", props.dwt.toString());
    localStorage.setItem("sms_freshWaterMax", props.freshWaterMax.toString());
    localStorage.setItem("sms_fuelCapacity", props.fuelCapacity.toString());
    localStorage.setItem("sms_shipType", shipType);
    localStorage.setItem("sms_mmsiNumber", mmsi);
    localStorage.setItem("sms_classSociety", classSociety);
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

    // Dispatch global event for other components
    window.dispatchEvent(new CustomEvent("sms_vessel_profile_updated"));

    // Display formal popup modal confirming update
    setShowCommitModal(true);
  };

  return (
    <div className="space-y-6">
      
      {/* Header Module HUD */}
      <div className="bg-white border border-slate-200 p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#0A2540] flex items-center justify-center text-white shadow-md">
            <Ship className="w-5 h-5 text-[#00A86B]" />
          </div>
          <div>
            <h2 className="text-sm font-black text-[#0A2540] uppercase tracking-wider">
              Vessel Profile & Certification Directory
            </h2>
            <p className="text-[10px] text-slate-500 font-mono uppercase mt-0.5">
              Official ship identity, technical parameters, and photographic documentation
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Stats Summary */}
          <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 text-right font-mono">
            <span className="block text-[8px] text-slate-400 uppercase leading-none font-bold">SHIP TYPE</span>
            <span className="text-[11px] text-slate-800 font-extrabold mt-1 block leading-none">
              {shipType}
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 text-right font-mono">
            <span className="block text-[8px] text-slate-400 uppercase leading-none font-bold">ACTIVE REGISTRY</span>
            <span className="text-[11px] text-slate-700 font-bold mt-1 block leading-none">
              {props.vesselName} [{props.callSign}]
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 text-right font-mono">
            <span className="block text-[8px] text-slate-400 uppercase leading-none font-bold">TOTAL DISPLACEMENT</span>
            <span className="text-[11px] text-emerald-600 font-black mt-1 block leading-none">
              {displacement.toLocaleString()} MT
            </span>
          </div>
        </div>
      </div>

      {/* Main Structural Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Columns - Detailed Specifications Form (7/12) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* SECTION 1: GENERAL IDENTITY & DOCUMENTATION */}
          <div className="bg-white border border-slate-200 p-5 space-y-4 rounded-none shadow-sm relative">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <FileText className="w-4 h-4 text-[#0A2540]" />
              <h3 className="text-xs font-black uppercase text-[#0A2540] tracking-wider">
                Section 1: General Identity & Documentation
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Ship Type Selector */}
              <div className="space-y-1 sm:col-span-2">
                <label className="block text-[9px] font-mono uppercase text-[#0A2540] font-black tracking-wider flex items-center justify-between">
                  <span>Ship Type (Maritime Classification)</span>
                  <span className="text-[#00A86B] font-mono text-[9px]">SOLAS Standard Category</span>
                </label>
                <select
                  value={shipType}
                  onChange={(e) => handleShipTypeChange(e.target.value as ShipType)}
                  className="w-full bg-slate-50 border-2 border-slate-300 px-3 py-2 text-xs font-black text-slate-900 focus:outline-none focus:bg-white focus:border-[#0A2540] rounded-none transition-colors"
                >
                  {SHIP_TYPE_OPTIONS.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[9px] font-mono uppercase text-slate-500 font-bold tracking-wider">
                  Vessel Name
                </label>
                <input
                  type="text"
                  value={props.vesselName}
                  onChange={(e) => {
                    const cleanName = e.target.value.toUpperCase();
                    props.setVesselName(cleanName);
                    localStorage.setItem("sms_vesselName", cleanName);
                  }}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:bg-white focus:border-slate-400 rounded-none transition-colors"
                  placeholder="e.g. PACIFIC SENTINEL"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[9px] font-mono uppercase text-slate-500 font-bold tracking-wider">
                  Radio Call Sign
                </label>
                <input
                  type="text"
                  value={props.callSign}
                  onChange={(e) => {
                    const cleanCall = e.target.value.toUpperCase();
                    props.setCallSign(cleanCall);
                    localStorage.setItem("sms_callSign", cleanCall);
                  }}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:bg-white focus:border-slate-400 rounded-none transition-colors"
                  placeholder="e.g. 9V8841"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[9px] font-mono uppercase text-slate-500 font-bold tracking-wider">
                  IMO Number (7 Digits)
                </label>
                <input
                  type="text"
                  maxLength={7}
                  value={props.imoNumber}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    props.setImoNumber(val);
                    localStorage.setItem("sms_imoNumber", val);
                  }}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:bg-white focus:border-slate-400 rounded-none transition-colors"
                  placeholder="e.g. 9845722"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[9px] font-mono uppercase text-slate-500 font-bold tracking-wider">
                  MMSI Number (9 Digits)
                </label>
                <input
                  type="text"
                  maxLength={9}
                  value={mmsi}
                  onChange={(e) => setMmsi(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:bg-white focus:border-slate-400 rounded-none transition-colors"
                  placeholder="e.g. 563084100"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[9px] font-mono uppercase text-slate-500 font-bold tracking-wider">
                  Flag / Port of Registry
                </label>
                <select
                  value={props.flagState}
                  onChange={(e) => {
                    props.setFlagState(e.target.value);
                    localStorage.setItem("sms_flagState", e.target.value);
                  }}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-slate-400 rounded-none transition-colors"
                >
                  {WORLDWIDE_FLAGS.map((flag) => (
                    <option key={flag} value={flag}>
                      {flag}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[9px] font-mono uppercase text-slate-500 font-bold tracking-wider">
                  Classification Society
                </label>
                <select
                  value={classSociety}
                  onChange={(e) => setClassSociety(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-slate-400 rounded-none transition-colors"
                >
                  <option value="ABS">ABS (American Bureau of Shipping)</option>
                  <option value="DNV">DNV (Det Norske Veritas)</option>
                  <option value="Lloyd's Register">Lloyd's Register (LR)</option>
                  <option value="BV">Bureau Veritas (BV)</option>
                  <option value="RINA">RINA S.p.A.</option>
                  <option value="ClassNK">ClassNK (Nippon Kaiji Kyokai)</option>
                </select>
              </div>
            </div>
          </div>

          {/* SECTION 2: PRINCIPAL PHYSICAL DIMENSIONS */}
          <div className="bg-white border border-slate-200 p-5 space-y-4 rounded-none shadow-sm relative">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <Compass className="w-4 h-4 text-[#0A2540]" />
              <h3 className="text-xs font-black uppercase text-[#0A2540] tracking-wider">
                Section 2: Principal Physical Dimensions
              </h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="block text-[9px] font-mono uppercase text-slate-500 font-bold tracking-wider">
                  Length Overall (LOA)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    value={loa}
                    onChange={(e) => setLoa(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 pl-3 pr-8 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:bg-white focus:border-slate-400 rounded-none transition-colors"
                  />
                  <span className="absolute right-2.5 top-2.5 text-[8px] font-mono font-bold text-slate-400">meters</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[9px] font-mono uppercase text-slate-500 font-bold tracking-wider">
                  LBP (Perpendiculars)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    value={lbp}
                    onChange={(e) => setLbp(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 pl-3 pr-8 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:bg-white focus:border-slate-400 rounded-none transition-colors"
                  />
                  <span className="absolute right-2.5 top-2.5 text-[8px] font-mono font-bold text-slate-400">meters</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[9px] font-mono uppercase text-slate-500 font-bold tracking-wider">
                  Beam (Breadth)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    value={beam}
                    onChange={(e) => setBeam(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 pl-3 pr-8 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:bg-white focus:border-slate-400 rounded-none transition-colors"
                  />
                  <span className="absolute right-2.5 top-2.5 text-[8px] font-mono font-bold text-slate-400">meters</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[9px] font-mono uppercase text-slate-500 font-bold tracking-wider">
                  Design Draft
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={draft}
                    onChange={(e) => setDraft(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 pl-3 pr-8 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:bg-white focus:border-slate-400 rounded-none transition-colors"
                  />
                  <span className="absolute right-2.5 top-2.5 text-[8px] font-mono font-bold text-slate-400">meters</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[9px] font-mono uppercase text-slate-500 font-bold tracking-wider">
                  Minimum Freeboard
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={freeboard}
                    onChange={(e) => setFreeboard(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 pl-3 pr-8 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:bg-white focus:border-slate-400 rounded-none transition-colors"
                  />
                  <span className="absolute right-2.5 top-2.5 text-[8px] font-mono font-bold text-slate-400">meters</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[9px] font-mono uppercase text-slate-500 font-bold tracking-wider">
                  Max Air Draft
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    value={airDraft}
                    onChange={(e) => setAirDraft(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 pl-3 pr-8 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:bg-white focus:border-slate-400 rounded-none transition-colors"
                  />
                  <span className="absolute right-2.5 top-2.5 text-[8px] font-mono font-bold text-slate-400">meters</span>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: TONNAGE, WEIGHTS, & CAPACITIES */}
          <div className="bg-white border border-slate-200 p-5 space-y-4 rounded-none shadow-sm relative">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <Scale className="w-4 h-4 text-[#0A2540]" />
              <h3 className="text-xs font-black uppercase text-[#0A2540] tracking-wider">
                Section 3: Tonnage, Weights, & Capacities
              </h3>
            </div>

            <p className="text-[10px] text-slate-400 font-sans leading-relaxed">
              *Tonnage ratings represent volume assessments, while weights are in metric tonnes. 
              <strong> Displacement Weight</strong> is a mathematical composite of Deadweight (DWT) and Lightship Weight.
            </p>

            <div className="border border-slate-200 overflow-hidden">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-100 border-b border-slate-200">
                  <tr>
                    <th className="p-2.5 text-[9px] font-bold text-slate-500 uppercase tracking-wider">Specification Parameters</th>
                    <th className="p-2.5 text-[9px] font-bold text-slate-500 uppercase tracking-wider w-1/3">Numerical Value</th>
                    <th className="p-2.5 text-[9px] font-bold text-slate-500 uppercase tracking-wider w-1/3">Standard Units / Context</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  <tr>
                    <td className="p-2.5 font-sans font-semibold text-slate-700">Gross Tonnage (GT)</td>
                    <td className="p-2.5">
                      <input
                        type="number"
                        min="0"
                        value={gt}
                        onChange={(e) => setGt(parseInt(e.target.value) || 0)}
                        className="w-full bg-slate-50 border border-slate-200 px-2 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:bg-white focus:border-slate-300 rounded-none"
                      />
                    </td>
                    <td className="p-2.5 text-[10px] text-slate-400">Volume index (1 GT = 100 ft³)</td>
                  </tr>
                  
                  <tr>
                    <td className="p-2.5 font-sans font-semibold text-slate-700">Net Tonnage (NT)</td>
                    <td className="p-2.5">
                      <input
                        type="number"
                        min="0"
                        value={nt}
                        onChange={(e) => setNt(parseInt(e.target.value) || 0)}
                        className="w-full bg-slate-50 border border-slate-200 px-2 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:bg-white focus:border-slate-300 rounded-none"
                      />
                    </td>
                    <td className="p-2.5 text-[10px] text-slate-400">Earning space indicator</td>
                  </tr>

                  <tr>
                    <td className="p-2.5 font-sans font-semibold text-slate-700">Deadweight (DWT)</td>
                    <td className="p-2.5">
                      <input
                        type="number"
                        min="0"
                        value={props.dwt}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          props.setDwt(val);
                          localStorage.setItem("sms_dwt", val.toString());
                        }}
                        className="w-full bg-slate-50 border border-slate-200 px-2 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:bg-white focus:border-slate-300 rounded-none"
                      />
                    </td>
                    <td className="p-2.5 text-[10px] text-slate-400">Metric tons (Cargo, fuel, crew)</td>
                  </tr>

                  <tr>
                    <td className="p-2.5 font-sans font-semibold text-slate-700">Lightship Weight</td>
                    <td className="p-2.5">
                      <input
                        type="number"
                        min="0"
                        value={lightship}
                        onChange={(e) => setLightship(parseInt(e.target.value) || 0)}
                        className="w-full bg-slate-50 border border-slate-200 px-2 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:bg-white focus:border-slate-300 rounded-none"
                      />
                    </td>
                    <td className="p-2.5 text-[10px] text-slate-400">Empty steel/machinery weight</td>
                  </tr>

                  <tr className="bg-emerald-50/40">
                    <td className="p-2.5 font-sans font-black text-emerald-900 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#00A86B]" />
                      Total Displacement
                    </td>
                    <td className="p-2.5 text-xs font-black text-emerald-700 font-mono">
                      {displacement.toLocaleString()}
                    </td>
                    <td className="p-2.5 text-[10px] font-bold text-[#00A86B] uppercase font-mono">
                      MT [Calculated: DWT + Light]
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION 4: PROPULSION & SPEED PROFILE */}
          <div className="bg-white border border-slate-200 p-5 space-y-4 rounded-none shadow-sm relative">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <Activity className="w-4 h-4 text-[#0A2540]" />
              <h3 className="text-xs font-black uppercase text-[#0A2540] tracking-wider">
                Section 4: Propulsion Machinery & Speed Profile
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-[9px] font-mono uppercase text-slate-500 font-bold tracking-wider">
                  Main Engine Designation
                </label>
                <input
                  type="text"
                  value={mainEngine}
                  onChange={(e) => setMainEngine(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:bg-white focus:border-slate-400 rounded-none transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[9px] font-mono uppercase text-slate-500 font-bold tracking-wider">
                  Auxiliary Diesel Generators
                </label>
                <input
                  type="text"
                  value={auxEngines}
                  onChange={(e) => setAuxEngines(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:bg-white focus:border-slate-400 rounded-none transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[9px] font-mono uppercase text-slate-500 font-bold tracking-wider">
                  Design Service Speed
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    value={serviceSpeed}
                    onChange={(e) => setServiceSpeed(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 pl-3 pr-12 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:bg-white focus:border-slate-400 rounded-none transition-colors"
                  />
                  <span className="absolute right-2.5 top-2.5 text-[8px] font-mono font-bold text-slate-400">knots (kt)</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[9px] font-mono uppercase text-slate-500 font-bold tracking-wider">
                  HFO / MGO Consumption
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={fuelConsumption}
                    onChange={(e) => setFuelConsumption(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 pl-3 pr-12 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:bg-white focus:border-slate-400 rounded-none transition-colors"
                  />
                  <span className="absolute right-2.5 top-2.5 text-[8px] font-mono font-bold text-slate-400">MT / day</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Commit Changes Action Bar */}
          <div className="flex justify-end pt-2">
            <button
              onClick={handleCommitChanges}
              className="bg-[#00A86B] hover:bg-emerald-600 text-white text-xs font-mono font-bold uppercase tracking-wider px-6 py-2.5 cursor-pointer shadow border border-emerald-500 transition-colors flex items-center gap-2"
            >
              <FileCheck className="w-4 h-4" />
              <span>Commit Changes</span>
            </button>
          </div>
        </div>

        {/* Right Column - Official Vessel Photograph & Technical Document Viewer (5/12) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* IMAGE UPLOAD & OFFICIAL VESSEL PHOTOGRAPH COMPONENT */}
          <div className="bg-white border border-slate-200 p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-[#00A86B]" />
                <h3 className="text-xs font-black uppercase text-[#0A2540] tracking-wider">
                  Official Vessel Photograph
                </h3>
              </div>
              <span className="text-[9px] px-1.5 py-0.2 bg-slate-100 text-slate-600 font-mono font-bold uppercase border border-slate-200">
                PMS Archive
              </span>
            </div>

            {/* Vessel Photo Preview Container */}
            <div className="relative w-full aspect-16/10 bg-slate-900 border border-slate-200 overflow-hidden group">
              <img
                src={vesselPhoto}
                alt={`${props.vesselName} Official Vessel Photo`}
                className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                onError={() => {
                  setVesselPhoto(DEFAULT_VESSEL_PHOTO);
                }}
              />

              {/* Top Floating Badge with Ship Type & IMO */}
              <div className="absolute top-2.5 left-2.5 pointer-events-none select-none flex flex-col gap-1 font-mono">
                <span className="text-[9px] bg-[#0A2540]/90 text-white font-black uppercase px-2 py-0.5 border border-slate-600 shadow backdrop-blur-xs">
                  {shipType}
                </span>
                <span className="text-[8px] bg-emerald-950/80 text-[#00A86B] font-bold px-1.5 py-0.2 border border-emerald-800">
                  IMO {props.imoNumber}
                </span>
              </div>

              {/* Bottom Floating Metadata Banner */}
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950/90 via-slate-900/60 to-transparent p-3 pt-6 text-white font-mono flex items-end justify-between">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-white drop-shadow">
                    {props.vesselName}
                  </h4>
                  <div className="text-[9px] text-slate-300 flex items-center gap-2 mt-0.5">
                    <span>CALL SIGN: {props.callSign}</span>
                    <span>•</span>
                    <span>{props.flagState}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[8px] text-slate-400 block uppercase">LOA / BEAM</span>
                  <span className="text-[10px] font-bold text-emerald-400">{loa}m × {beam}m</span>
                </div>
              </div>
            </div>

            {photoError && (
              <div className="text-[10px] font-mono text-red-600 bg-red-50 p-2 border border-red-200">
                {photoError}
              </div>
            )}

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png, image/jpeg, image/webp"
              onChange={handleFileUpload}
              className="hidden"
            />

            {/* Action Buttons: Upload & Reset Photo */}
            <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-xs">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-2 bg-[#0A2540] hover:bg-slate-800 text-white font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <Upload className="w-3.5 h-3.5 text-[#00A86B]" />
                <span>Upload Photo</span>
              </button>

              <button
                type="button"
                onClick={handleResetPhoto}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer border border-slate-300 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                <span>Default Photo</span>
              </button>
            </div>

            <p className="text-[9px] text-slate-400 font-mono leading-relaxed">
              *Upload official high-resolution vessel photograph (JPEG, PNG, WebP up to 5MB). The uploaded photograph is automatically embedded into the vessel PMS registry and shared across bridge checklists.
            </p>
          </div>

          {/* VESSEL REGISTRATION & STATUTORY SUMMARY CARD */}
          <div className="bg-slate-50 border border-slate-200 p-5 space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="font-extrabold uppercase text-slate-800 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#00A86B]" />
                Statutory Registry Summary
              </span>
              <span className="text-[9px] text-slate-500">SOLAS-MARPOL CERTIFIED</span>
            </div>

            <div className="space-y-2 text-[11px]">
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Official Ship Type:</span>
                <span className="font-bold text-slate-900">{shipType}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Design Deadweight (DWT):</span>
                <span className="font-bold text-slate-900">{props.dwt.toLocaleString()} MT</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Gross Tonnage (GT):</span>
                <span className="font-bold text-slate-900">{gt.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Design Draft / Freeboard:</span>
                <span className="font-bold text-slate-900">{draft}m / {freeboard}m</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Classification Society:</span>
                <span className="font-bold text-[#0A2540]">{classSociety}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Operational Speed / Cons.:</span>
                <span className="font-bold text-emerald-700">{serviceSpeed} kts @ {fuelConsumption} MT/d</span>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* FORMAL COMMIT CHANGES CONFIRMATION POPUP MODAL */}
      <AnimatePresence>
        {showCommitModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-300 shadow-2xl p-6 w-full max-w-lg relative rounded-none space-y-5"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                <div className="w-10 h-10 bg-[#00A86B] flex items-center justify-center text-white shadow">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-[#0A2540] uppercase tracking-wider">
                    Vessel Profile Update Confirmation
                  </h3>
                  <p className="text-[10px] text-slate-400 font-mono uppercase mt-0.5">
                    Shipboard PMS Registry & Stability Sync
                  </p>
                </div>
              </div>

              {/* Formal Confirmation Banner */}
              <div className="bg-emerald-50 border border-emerald-300 p-4 space-y-2">
                <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs uppercase tracking-wide">
                  <ShieldCheck className="w-4 h-4 text-[#00A86B] shrink-0" />
                  <span>Update Verified & Approved</span>
                </div>
                <p className="text-xs font-semibold text-emerald-950 font-sans leading-relaxed">
                  Vessel profile configuration successfully updated and synced across the PMS system.
                </p>
              </div>

              {/* Updated Details Summary Table */}
              <div className="bg-slate-50 border border-slate-200 p-3.5 space-y-2 font-mono text-[11px]">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[9px] uppercase text-slate-400 block font-bold">Vessel Name</span>
                    <span className="font-bold text-[#0A2540]">{props.vesselName}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase text-slate-400 block font-bold">Ship Type</span>
                    <span className="font-bold text-[#00A86B]">{shipType}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase text-slate-400 block font-bold">IMO Number</span>
                    <span className="font-bold text-slate-800">{props.imoNumber}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase text-slate-400 block font-bold">Call Sign</span>
                    <span className="font-bold text-slate-800">{props.callSign}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase text-slate-400 block font-bold">Flag State</span>
                    <span className="font-bold text-slate-800">{props.flagState}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase text-slate-400 block font-bold">Total Displacement</span>
                    <span className="font-bold text-emerald-700">{displacement.toLocaleString()} MT</span>
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCommitModal(false)}
                  className="px-5 py-2 bg-[#0A2540] hover:bg-slate-800 text-white text-xs font-mono font-bold uppercase tracking-wider cursor-pointer shadow transition-colors"
                >
                  Acknowledge & Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
