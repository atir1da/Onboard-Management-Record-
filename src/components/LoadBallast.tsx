import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Ship, 
  Scale, 
  Flame, 
  Thermometer, 
  Info, 
  Play, 
  Pause, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  ShieldAlert, 
  Zap, 
  Layers, 
  Plus, 
  Trash2, 
  ArrowRight,
  Droplet,
  Compass,
  Volume2,
  Activity
} from "lucide-react";

interface LoadBallastProps {
  vesselConfigType: string;
  setVesselConfigType: (type: string) => void;
  dwt: number;
  lightship: number;
  freshWaterMax: number;
  fuelCapacity: number;
  vesselName: string;
  callSign: string;
}

// -------------------------------------------------------------------------
// COMPONENT IMPLEMENTATION
// -------------------------------------------------------------------------
export default function LoadBallast({
  vesselConfigType,
  setVesselConfigType,
  dwt,
  lightship,
  freshWaterMax,
  fuelCapacity,
  vesselName,
  callSign
}: LoadBallastProps) {
  const [subTab, setSubTab] = useState<"cargo" | "ballast">("cargo");
  const [logs, setLogs] = useState<Array<{ id: string; timestamp: string; type: string; event: string; status: "info" | "warning" | "success" }>>(() => {
    const cached = localStorage.getItem("sms_load_ballast_logs");
    if (cached) return JSON.parse(cached);
    return [
      { id: "1", timestamp: "2026-07-13 18:40:22 UTC", type: "System Init", event: "Load & Ballast telemetry module initialized.", status: "info" },
      { id: "2", timestamp: "2026-07-13 19:15:05 UTC", type: "Ballast Trim", event: "Double-Bottom Tank 2P aligned for neutral trim.", status: "success" }
    ];
  });

  const addLog = (type: string, event: string, status: "info" | "warning" | "success") => {
    const newLog = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString().replace("T", " ").substring(0, 19) + " UTC",
      type,
      event,
      status
    };
    const updated = [newLog, ...logs].slice(0, 50); // limit to last 50 logs
    setLogs(updated);
    localStorage.setItem("sms_load_ballast_logs", JSON.stringify(updated));
  };

  // -------------------------------------------------------------------------
  // CORE CARGO STATES
  // -------------------------------------------------------------------------
  
  // 1. Bulk Carrier Cargo Hold Levels (%)
  const [bulkHolds, setBulkHolds] = useState<number[]>([70, 75, 72, 68, 70]);
  const [initialDraft, setInitialDraft] = useState<number>(6.5);
  const [finalDraft, setFinalDraft] = useState<number>(14.2);
  const [tpc, setTpc] = useState<number>(62.5); // Tonnes per Centimeter Immersion

  // 2. Tanker States
  const [tankUllages, setTankUllages] = useState<number[]>([1.8, 1.9, 1.7, 2.1]); // ullage in meters (max tank height 15m)
  const [tankTemps, setTankTemps] = useState<number[]>([24.5, 26.0, 25.2, 23.8]); // temp in C
  const [tankDensities, setTankDensities] = useState<number[]>([845, 842, 846, 840]); // density @ 15°C (kg/m³)
  const [igsPressure, setIgsPressure] = useState<number>(120); // Inert Gas System pressure in mmWG
  const [vaporOxygen, setVaporOxygen] = useState<number>(3.2); // Vapor O2 levels %

  // 3. Container States (Bay-Row-Tier matrix simulation)
  const [containerMatrix, setContainerMatrix] = useState<Array<{ bay: string; row: string; tier: string; weight: number; reefer: boolean; active: boolean }>>([
    { bay: "01", row: "02", tier: "82", weight: 24.5, reefer: true, active: true },
    { bay: "01", row: "04", tier: "82", weight: 18.2, reefer: false, active: true },
    { bay: "03", row: "01", tier: "84", weight: 26.0, reefer: true, active: true },
    { bay: "03", row: "03", tier: "82", weight: 22.1, reefer: false, active: true },
    { bay: "05", row: "02", tier: "86", weight: 14.8, reefer: false, active: true },
  ]);
  const [newBay, setNewBay] = useState("01");
  const [newRow, setNewRow] = useState("02");
  const [newTier, setNewTier] = useState("82");
  const [newWeight, setNewWeight] = useState(20);
  const [newIsReefer, setNewIsReefer] = useState(false);

  // 4. General Cargo Tally Counter
  const [generalCargoItems, setGeneralCargoItems] = useState([
    { name: "Heavy Machinery Crates", quantity: 12, unitWeight: 45 },
    { name: "Structural Steel Coils", quantity: 36, unitWeight: 22 },
    { name: "Packaged Timber Bundles", quantity: 150, unitWeight: 2.5 },
    { name: "Cement Bags (Bulk Sacks)", quantity: 450, unitWeight: 1.2 }
  ]);
  const [dunnageConfirmed, setDunnageConfirmed] = useState(true);
  const [lashingConfirmed, setLashingConfirmed] = useState(true);

  // 5. LNG Carrier Custody Transfer
  const [lngLevels, setLngLevels] = useState<number[]>([98.2, 98.0, 97.5, 98.4]); // % fill
  const [lngTemps, setLngTemps] = useState<number[]>([-161.8, -162.0, -161.5, -162.1]); // °C
  const [bogRate, setBogRate] = useState<number>(0.12); // boil off gas rate %/day
  const [bogToFuel, setBogToFuel] = useState<boolean>(true); // route to boilers/dual-fuel propulsion

  // -------------------------------------------------------------------------
  // CORE BALLAST STATES
  // -------------------------------------------------------------------------
  // Tank fill levels (0 - 100 %)
  const [ballastTanks, setBallastTanks] = useState<{ [key: string]: number }>({
    forePeak: 45,
    aftPeak: 35,
    db1P: 20,
    db1S: 20,
    db2P: 50,
    db2S: 50,
    wing1P: 10,
    wing1S: 10,
    heelingP: 15,
    heelingS: 15
  });

  // Flow controllers / active statuses
  const [ballastPump1, setBallastPump1] = useState(false);
  const [ballastPump2, setBallastPump2] = useState(false);
  const [heelingPump, setHeelingPump] = useState(false);
  const [selectedBallastTank, setSelectedBallastTank] = useState<string>("db1P");
  
  // Valves state
  const [valvesOpen, setValvesOpen] = useState<{ [key: string]: boolean }>({
    forePeak: true,
    aftPeak: false,
    db1P: true,
    db1S: true,
    db2P: false,
    db2S: false,
    wing1P: false,
    wing1S: false,
    heelingP: false,
    heelingS: false
  });

  // Anti-Heeling state for Container Ship
  const [antiHeelingActive, setAntiHeelingActive] = useState(true);
  const [containerHeelAngle, setContainerHeelAngle] = useState(0.0); // positive is starboard, negative is port

  // -------------------------------------------------------------------------
  // DYNAMIC SIMULATIONS & CALCULATION ENGINES
  // -------------------------------------------------------------------------

  // A. Bulk Carriers Bending & Shear Math
  const bulkStressFactors = useMemo(() => {
    // Basic weight distribution stress. Ideal: Holds 1-5 loaded symmetrically.
    // Calculate difference between holds
    const totalCargo = bulkHolds.reduce((a, b) => a + b, 0);
    const meanCargo = totalCargo / 5;
    let deviationSum = 0;
    // Calculate sagging vs hogging
    // Hogging: Cargo loaded more on ends (Hold 1, 5) than mid (Hold 3)
    // Sagging: Cargo loaded more on mid (Hold 3) than ends (Hold 1, 5)
    const endsCargo = (bulkHolds[0] + bulkHolds[4]) / 2;
    const midCargo = bulkHolds[2];
    const stressValue = Math.min(100, Math.max(0, Math.abs(endsCargo - midCargo) * 3));
    const condition = endsCargo > midCargo + 15 
      ? "Hogging Stress Condition" 
      : midCargo > endsCargo + 15 
      ? "Sagging Stress Condition" 
      : "Within Safe Shear Limits";
    
    return {
      stressPercent: stressValue,
      condition,
      isHazard: stressValue > 65
    };
  }, [bulkHolds]);

  // Draft survey weight calculation
  const bulkDraftSurveyWeight = useMemo(() => {
    // Weight = (Final Draft - Initial Draft) * 100 * TPC
    const immersionCm = (finalDraft - initialDraft) * 100;
    const computedWeight = immersionCm * tpc;
    return Math.max(0, computedWeight);
  }, [initialDraft, finalDraft, tpc]);

  // B. Tanker ASTM Calculations
  // Crude petroleum constant at 15°C
  const tankerVolumesAndWeights = useMemo(() => {
    const totalHeight = 15.0; // 15 meters maximum tank depth
    const tankMaxVol = 4000; // 4000 cubic meters capacity per tank
    
    let totalGrossVol = 0;
    let totalNetVolAt15 = 0;
    let totalWeightMT = 0;

    const tankData = tankUllages.map((ullage, idx) => {
      const liquidLevel = Math.max(0, totalHeight - ullage);
      const levelPercent = (liquidLevel / totalHeight) * 100;
      const grossVolume = (liquidLevel / totalHeight) * tankMaxVol;
      
      // Volume correction factor (VCF) based on ASTM tables (simplified)
      // VCF = exp(-alpha * deltaT * (1 + 0.8 * alpha * deltaT))
      const temp = tankTemps[idx];
      const deltaT = temp - 15;
      const alpha = 0.00062; // crude oil thermal expansion coeff
      const vcf = Math.exp(-alpha * deltaT * (1 + 0.8 * alpha * deltaT));
      
      const netVolume = grossVolume * vcf;
      const density_15 = tankDensities[idx];
      const weightMT = (netVolume * density_15) / 1000;

      totalGrossVol += grossVolume;
      totalNetVolAt15 += netVolume;
      totalWeightMT += weightMT;

      return {
        id: idx + 1,
        liquidLevel,
        levelPercent,
        grossVolume,
        vcf,
        netVolume,
        weightMT
      };
    });

    return {
      tanks: tankData,
      totalGrossVol,
      totalNetVolAt15,
      totalWeightMT
    };
  }, [tankUllages, tankTemps, tankDensities]);

  // C. Container Ship Metacentric Height (GM) Math
  const containerShipGMLimit = useMemo(() => {
    // Calculate vertical center of gravity (KG) dynamically
    const baseKM = 17.5; // Transverse Metacentre Height (assumed KM)
    const baseKG_lightship = 9.8; // meters height of CG of lightship above keel
    
    let totalCargoWeight = 0;
    let totalCargoMoment = 0;

    containerMatrix.forEach(box => {
      if (box.active) {
        totalCargoWeight += box.weight;
        // Tier coordinate approximate vertical center: e.g., tier 82 = 12m, 84 = 14m, 86 = 16m
        const verticalCenter = 8 + (Number(box.tier) - 80) * 1.2;
        totalCargoMoment += box.weight * verticalCenter;
      }
    });

    const activeDisp = lightship + totalCargoWeight;
    const totalMoment = (lightship * baseKG_lightship) + totalCargoMoment;
    const computedKG = totalMoment / activeDisp;
    const computedGM = baseKM - computedKG;

    return {
      cargoWeight: totalCargoWeight,
      displacement: activeDisp,
      kg: computedKG,
      gm: computedGM,
      isHazard: computedGM < 1.5 || computedGM > 4.5 // GM too low = tender (capsizing risk), too high = stiff (extreme rolling stress)
    };
  }, [containerMatrix, lightship]);

  // Reefer counts
  const reeferStats = useMemo(() => {
    const list = containerMatrix.filter(b => b.active && b.reefer);
    return {
      count: list.length,
      tempRange: "2.0°C to -18.5°C",
      totalPowerKw: list.length * 8.5, // 8.5 kW per reefer avg
      healthOk: true
    };
  }, [containerMatrix]);

  // D. General Cargo Total Weight
  const generalCargoTotalWeight = useMemo(() => {
    return generalCargoItems.reduce((acc, item) => acc + (item.quantity * item.unitWeight), 0);
  }, [generalCargoItems]);

  // E. LNG CTS Volumes & Boil-off rates
  const lngCargoStats = useMemo(() => {
    const maxTankVol = 35000; // 35,000 CBM per sphere
    const densityLng = 0.468; // approx 468 kg/m³ for LNG at boiling point
    
    let totalVolumeCbm = 0;
    let totalWeightMT = 0;

    const tanks = lngLevels.map((lvl, idx) => {
      const vol = (lvl / 100) * maxTankVol;
      const weight = vol * densityLng;
      totalVolumeCbm += vol;
      totalWeightMT += weight;
      return {
        id: idx + 1,
        volume: vol,
        weight
      };
    });

    // Boil Off Gas (BOG) calculation: cargo loss in tons per hour
    const totalCargoWeight = totalWeightMT;
    const dailyLoss = totalCargoWeight * (bogRate / 100);
    const lossPerHourMT = dailyLoss / 24;

    return {
      tanks,
      totalVolumeCbm,
      totalWeightMT,
      lossPerHourMT,
      fuelEquivHp: lossPerHourMT * 1250 // HP equivalent for propulsion if routed
    };
  }, [lngLevels, bogRate]);

  // -------------------------------------------------------------------------
  // TIME TICK TICK (Real-time Simulation of Ballast Pumps & Anti-Heel)
  // -------------------------------------------------------------------------
  useEffect(() => {
    const interval = setInterval(() => {
      // 1. Simulating Ballast Pump Water Flow (increases/decreases levels)
      if (ballastPump1 || ballastPump2) {
        setBallastTanks(prev => {
          const key = selectedBallastTank;
          const currentVal = prev[key];
          const increment = (ballastPump1 ? 1 : 0) + (ballastPump2 ? 1 : 0);
          
          // Open valve verification
          if (valvesOpen[key]) {
            const nextVal = Math.min(100, Math.max(0, currentVal + increment * 0.8));
            return { ...prev, [key]: Number(nextVal.toFixed(1)) };
          }
          return prev;
        });
      }

      // 2. Container Ship Symmetrical Crane Load Anti-Heeling Auto System
      if (vesselConfigType === "Container Ship" && antiHeelingActive) {
        // Random slight perturbation of heel angle (due to cargo operations)
        const perturbation = (Math.random() - 0.5) * 0.15;
        setContainerHeelAngle(prev => {
          let currentHeel = prev + perturbation;
          
          // Shifting ballast water high-speed compensation
          // If heel is positive (starboard listing), shift water from STBD to PORT wing/heeling tank
          // heelS decreases, heelP increases, making heel drift back to 0°
          const correctionFactor = 0.4;
          if (Math.abs(currentHeel) > 0.05) {
            if (currentHeel > 0) {
              // Listing starboard -> Shift to port
              setBallastTanks(t => {
                const diff = Math.min(2, t.heelingS);
                const nextS = Math.max(0, t.heelingS - diff);
                const nextP = Math.min(100, t.heelingP + diff);
                return { ...t, heelingS: Number(nextS.toFixed(2)), heelingP: Number(nextP.toFixed(2)) };
              });
              currentHeel -= correctionFactor;
            } else {
              // Listing port -> Shift to starboard
              setBallastTanks(t => {
                const diff = Math.min(2, t.heelingP);
                const nextP = Math.max(0, t.heelingP - diff);
                const nextS = Math.min(100, t.heelingS + diff);
                return { ...t, heelingP: Number(nextP.toFixed(2)), heelingS: Number(nextS.toFixed(2)) };
              });
              currentHeel += correctionFactor;
            }
          }
          
          // Boundary clamp near zero
          if (Math.abs(currentHeel) < 0.1) currentHeel = 0.0;
          return Number(currentHeel.toFixed(2));
        });
      }

      // 3. Tanker Symmetrical Ballasting Compliance
      // Keep ballast tanks symmetrical (P and S) during SIMOPS. Alert if asymmetrical
      if (vesselConfigType === "Tanker") {
        const diffP_S = Math.abs(ballastTanks.db1P - ballastTanks.db1S) + Math.abs(ballastTanks.db2P - ballastTanks.db2S);
        if (diffP_S > 15) {
          // Asymmetry detected
          // Trigger slight correction drift automatically if automatic stabilization would be active
        }
      }

    }, 1000);

    return () => clearInterval(interval);
  }, [ballastPump1, ballastPump2, selectedBallastTank, valvesOpen, vesselConfigType, antiHeelingActive, ballastTanks]);

  // Save loading state triggers logs
  const handleSaveCargoState = () => {
    let detail = "";
    if (vesselConfigType === "Bulk Carrier Ship") {
      detail = `Bulk cargo calculated via Draft Survey: ${bulkDraftSurveyWeight.toLocaleString(undefined, {maximumFractionDigits:1})} MT loaded in holds 1-5.`;
    } else if (vesselConfigType === "Tanker") {
      detail = `Petroleum volume converted via ASTM: ${tankerVolumesAndWeights.totalWeightMT.toLocaleString(undefined, {maximumFractionDigits:1})} MT at 15°C with IGS pressure verified.`;
    } else if (vesselConfigType === "Container Ship") {
      detail = `Container distribution: ${containerMatrix.filter(c => c.active).length} cells active. Vertical stability GM: ${containerShipGMLimit.gm.toFixed(2)}m (KG: ${containerShipGMLimit.kg.toFixed(2)}m).`;
    } else if (vesselConfigType === "General Cargo Ship") {
      detail = `General Break-Bulk tally logged: ${generalCargoTotalWeight.toLocaleString()} tonnes loaded with dunnage/lashing confirmed.`;
    } else if (vesselConfigType === "LNG Carrier Ship") {
      detail = `Cryogenic Custody Transfer verified: ${lngCargoStats.totalVolumeCbm.toLocaleString(undefined, {maximumFractionDigits:1})} CBM liquid cargo. BOG rate ${bogRate}%/day routed.`;
    }

    addLog("Cargo Save", `[STABILITY APPROVED] ${detail}`, "success");
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Header Control console */}
      <div className="bg-white border border-slate-200 p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#0A2540] flex items-center justify-center text-white shadow-md">
            <Scale className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-sm font-black text-[#0A2540] uppercase tracking-wider">
              Load Distribution & Ballast Control Center
            </h2>
            <p className="text-[10px] text-slate-500 font-mono uppercase mt-0.5">
              Active Vessel Type: <span className="text-[#00A86B] font-bold">{vesselConfigType}</span> — S/V {vesselName} / {callSign}
            </p>
          </div>
        </div>

        {/* Sub tabs selector */}
        <div className="flex bg-slate-100 p-1 border border-slate-200">
          <button
            onClick={() => setSubTab("cargo")}
            className={`px-4 py-1.5 text-xs font-bold uppercase transition-all tracking-wider ${
              subTab === "cargo"
                ? "bg-[#0A2540] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Cargo Operations
          </button>
          <button
            onClick={() => setSubTab("ballast")}
            className={`px-4 py-1.5 text-xs font-bold uppercase transition-all tracking-wider ${
              subTab === "ballast"
                ? "bg-[#0A2540] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Ballast System
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------------------- */}
      {/* SUB-TAB 1: CARGO OPERATIONS */}
      {/* ------------------------------------------------------------------------- */}
      {subTab === "cargo" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT COLUMN: 2D Structural Silhouette Vector (5/12 cols) */}
          <div className="lg:col-span-5 bg-white text-slate-800 p-5 space-y-4 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">
                2D Hull Silhouette & Load Model
              </span>
              <span className="text-[9px] font-mono text-[#00A86B] bg-[#00A86B]/10 px-2 py-0.5 border border-[#00A86B]/20 uppercase font-bold">
                Active Render
              </span>
            </div>

            {/* Render specialized 2D graphic based on ship configuration type */}
            <div className="bg-white border border-slate-200 rounded-none h-[300px] flex flex-col justify-center items-center relative overflow-hidden px-4">
              
              {/* Grid overlay for tech look with subtle grey lines */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(10,37,64,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(10,37,64,0.04)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />

              {/* Vector diagram renders */}
              {vesselConfigType === "Bulk Carrier Ship" && (
                <div className="w-full flex flex-col items-center justify-center space-y-4">
                  <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider absolute top-3 font-bold">Dry Bulk Holds 1-5 Compartment Level</span>
                  
                  {/* Hull shape SVG */}
                  <svg viewBox="0 0 400 120" className="w-full drop-shadow-lg">
                    {/* Waterline */}
                    <line x1="10" y1="70" x2="390" y2="70" stroke="rgba(2, 132, 199, 0.5)" strokeWidth="1" strokeDasharray="3,3" />
                    
                    {/* Ship body shell - High Visibility Dark Navy */}
                    <path d="M15,40 L60,40 L350,40 L385,45 L380,75 L330,85 L60,85 L15,60 Z" fill="rgba(10, 37, 64, 0.03)" stroke="#0A2540" strokeWidth="2.5" />
                    
                    {/* Superstructure stern */}
                    <rect x="25" y="15" width="30" height="25" fill="#cbd5e1" stroke="#0A2540" strokeWidth="1.5" />
                    <rect x="35" y="2" width="10" height="13" fill="#f1f5f9" stroke="#FF4500" strokeWidth="1.5" />
                    
                    {/* Cargo Holds separators & loading color fills */}
                    {bulkHolds.map((level, i) => {
                      const startX = 70 + i * 55;
                      const holdWidth = 48;
                      const fillHeight = (level / 100) * 35;
                      const yPos = 80 - fillHeight;
                      const isOverfilled = level > 85;
                      
                      return (
                        <g key={i}>
                          {/* Bulkheads (walls) */}
                          <line x1={startX} y1="40" x2={startX} y2="84" stroke="#0A2540" strokeWidth="1.5" />
                          
                          {/* Cargo fill with dynamic color-coding */}
                          <rect 
                            x={startX + 3} 
                            y={yPos} 
                            width={holdWidth} 
                            height={fillHeight} 
                            fill={isOverfilled ? "url(#bulkCargoGradOverloaded)" : "url(#bulkCargoGradSafe)"} 
                            opacity="0.85" 
                            className="transition-all duration-500"
                          />
                          
                          {/* Hold label */}
                          <text x={startX + holdWidth/2} y="34" className="text-[8.5px] font-mono text-slate-800 text-center font-extrabold" textAnchor="middle">H{i+1}</text>
                          <text x={startX + holdWidth/2} y="62" className="text-[10px] font-mono text-white text-center font-black drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" textAnchor="middle">{level}%</text>
                        </g>
                      );
                    })}
                    {/* Final bulkhead */}
                    <line x1="345" y1="40" x2="345" y2="84" stroke="#0A2540" strokeWidth="1.5" />

                    {/* Gradient definitions - Mint green safe and striking Safety orange/red stress */}
                    <defs>
                      <linearGradient id="bulkCargoGradSafe" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#00A86B" />
                        <stop offset="100%" stopColor="#005C3A" />
                      </linearGradient>
                      <linearGradient id="bulkCargoGradOverloaded" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#FF4500" />
                        <stop offset="100%" stopColor="#9A0000" />
                      </linearGradient>
                    </defs>
                  </svg>
                  
                  {/* Bending Moment / Stress indicator */}
                  <div className="w-full bg-slate-50 p-2 border border-slate-200">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[8px] font-mono text-slate-500 font-bold">HULL BENDING STRESS (HOG / SAG COMPILER)</span>
                      <span className={`text-[8px] font-mono font-bold ${bulkStressFactors.isHazard ? "text-red-600 animate-pulse" : "text-emerald-600"}`}>
                        {bulkStressFactors.stressPercent.toFixed(0)}% STRESS
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 border border-slate-300 relative">
                      <div 
                        className={`h-full transition-all duration-500 ${bulkStressFactors.isHazard ? "bg-red-500" : "bg-emerald-500"}`} 
                        style={{ width: `${bulkStressFactors.stressPercent}%` }}
                      />
                    </div>
                    <span className="text-[9px] font-bold font-mono text-slate-700 block mt-1 uppercase text-center">
                      {bulkStressFactors.condition}
                    </span>
                  </div>
                </div>
              )}

              {vesselConfigType === "Tanker" && (
                <div className="w-full flex flex-col items-center justify-center space-y-4">
                  <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider absolute top-3 font-bold">Segregated Liquid Tanks & Ullage Profiles</span>
                  
                  <svg viewBox="0 0 400 120" className="w-full drop-shadow-lg">
                    {/* Waterline */}
                    <line x1="10" y1="75" x2="390" y2="75" stroke="rgba(2, 132, 199, 0.5)" strokeWidth="1" strokeDasharray="3,3" />
                    
                    {/* Ship body shell - High Visibility Dark Navy */}
                    <path d="M15,45 L60,45 L350,45 L385,50 L380,80 L330,90 L60,90 L15,65 Z" fill="rgba(10, 37, 64, 0.03)" stroke="#0A2540" strokeWidth="2.5" />
                    
                    {/* Accommodation block */}
                    <rect x="25" y="20" width="30" height="25" fill="#cbd5e1" stroke="#0A2540" strokeWidth="1.5" />
                    <rect x="35" y="7" width="10" height="13" fill="#f1f5f9" stroke="#FF4500" strokeWidth="1.5" />
                    
                    {/* Cargo tanks */}
                    {tankerVolumesAndWeights.tanks.map((tank, i) => {
                      const startX = 75 + i * 65;
                      const tankWidth = 58;
                      const levelH = (tank.levelPercent / 100) * 38;
                      const yPos = 88 - levelH;
                      const isOverfilled = tank.levelPercent > 85;
                      
                      return (
                        <g key={tank.id}>
                          {/* Tank bulkheads */}
                          <line x1={startX} y1="45" x2={startX} y2="89" stroke="#0A2540" strokeWidth="1.5" />
                          
                          {/* Liquid Oil fill with color coding */}
                          <rect 
                            x={startX + 3} 
                            y={yPos} 
                            width={tankWidth} 
                            height={levelH} 
                            fill={isOverfilled ? "url(#tankerOilGradOverloaded)" : "url(#tankerOilGradSafe)"} 
                            opacity="0.85" 
                            className="transition-all duration-500"
                          />

                          {/* Level markers */}
                          <line x1={startX + 3} y1={yPos} x2={startX + 3 + tankWidth} y2={yPos} stroke={isOverfilled ? "#FF4500" : "#0284c7"} strokeWidth="1.5" className="transition-all duration-500" />
                          
                          {/* Tank labels */}
                          <text x={startX + tankWidth/2} y="38" className="text-[8.5px] font-mono text-slate-800 text-center font-extrabold" textAnchor="middle">TANK {tank.id}</text>
                          <text x={startX + tankWidth/2} y="68" className="text-[10px] font-mono text-white text-center font-black drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" textAnchor="middle">{(15 - tankUllages[i]).toFixed(1)}m</text>
                        </g>
                      );
                    })}
                    {/* Final bulkhead */}
                    <line x1="335" y1="45" x2="335" y2="89" stroke="#0A2540" strokeWidth="1.5" />

                    <defs>
                      <linearGradient id="tankerOilGradSafe" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#00A86B" />
                        <stop offset="100%" stopColor="#005C3A" />
                      </linearGradient>
                      <linearGradient id="tankerOilGradOverloaded" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#FF4500" />
                        <stop offset="100%" stopColor="#9A0000" />
                      </linearGradient>
                    </defs>
                  </svg>
                  
                  {/* Inert Gas safety readouts */}
                  <div className="w-full bg-slate-50 p-2.5 border border-slate-200 grid grid-cols-2 gap-2 text-center">
                    <div className="bg-slate-100 p-1 border border-slate-200">
                      <span className="block text-[7px] text-slate-500 font-mono">IGS INERT PRESSURE</span>
                      <span className="text-xs font-mono font-bold text-emerald-600">{igsPressure} mmWG</span>
                    </div>
                    <div className="bg-slate-100 p-1 border border-slate-200">
                      <span className="block text-[7px] text-slate-500 font-mono">VAPOR OXYGEN (SAFE &lt;5%)</span>
                      <span className={`text-xs font-mono font-bold ${vaporOxygen > 5.0 ? "text-red-600 animate-pulse" : "text-emerald-600"}`}>
                        {vaporOxygen}% O₂
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {vesselConfigType === "Container Ship" && (
                <div className="w-full flex flex-col items-center justify-center space-y-4">
                  <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider absolute top-3 font-bold">Cellular Cross-Section guides & Bay stacks</span>
                  
                  {/* Cellular bay schematic */}
                  <div className="grid grid-cols-4 gap-2 w-full max-w-[280px]">
                    {Array.from({ length: 12 }).map((_, idx) => {
                      const col = (idx % 4) + 1;
                      const row = Math.floor(idx / 4) + 1;
                      // Match check in container matrix
                      const bayMatch = "0" + row;
                      const rowMatch = "0" + col;
                      const activeBox = containerMatrix.find(c => c.active && c.bay === bayMatch && c.row === rowMatch);

                      return (
                        <div 
                          key={idx}
                          onClick={() => {
                            // Toggle active container
                            if (activeBox) {
                              setContainerMatrix(prev => prev.map(c => (c.bay === bayMatch && c.row === rowMatch) ? { ...c, active: false } : c));
                              addLog("Cargo Unload", `Container at Bay ${bayMatch}-Row ${rowMatch} unloaded.`, "info");
                            } else {
                              const newBox = { bay: bayMatch, row: rowMatch, tier: "82", weight: 22.0, reefer: Math.random() > 0.6, active: true };
                              setContainerMatrix(prev => {
                                const exists = prev.some(c => c.bay === bayMatch && c.row === rowMatch);
                                if (exists) {
                                  return prev.map(c => (c.bay === bayMatch && c.row === rowMatch) ? { ...c, active: true } : c);
                                }
                                return [...prev, newBox];
                              });
                              addLog("Cargo Load", `Container placed at Bay ${bayMatch}-Row ${rowMatch}.`, "success");
                            }
                          }}
                          className={`h-11 border transition-all flex flex-col justify-between p-1 cursor-pointer text-center select-none ${
                            activeBox 
                              ? activeBox.weight > 24
                                ? "bg-red-500/15 border-red-500 text-red-700 font-extrabold" 
                                : "bg-emerald-500/15 border-emerald-500 text-emerald-700 font-extrabold"
                              : "bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-400 hover:bg-slate-100"
                          }`}
                        >
                          <div className="flex justify-between items-center text-[7.5px] font-mono font-bold text-slate-500">
                            <span>B{bayMatch}</span>
                            <span>R{rowMatch}</span>
                          </div>
                          {activeBox ? (
                            <span className="text-[10px] font-black font-mono tracking-tight leading-none text-slate-800">
                              {activeBox.weight}T
                              {activeBox.reefer && <Zap className="w-2 h-2 text-cyan-600 inline ml-0.5" />}
                            </span>
                          ) : (
                            <span className="text-[7.5px] font-mono uppercase opacity-50 font-bold">EMPTY</span>
                          )}
                          <div className="h-0.5 w-full bg-slate-200 rounded-xs" />
                        </div>
                      );
                    })}
                  </div>

                  {/* Lashing layout and stability check */}
                  <div className="w-full bg-slate-50 p-2 border border-slate-200 grid grid-cols-2 gap-2">
                    <div>
                      <span className="block text-[7px] text-slate-500 font-mono">STABILITY HEIGHT (GM)</span>
                      <span className={`text-xs font-mono font-bold ${containerShipGMLimit.isHazard ? "text-red-600 animate-pulse" : "text-emerald-600"}`}>
                        {containerShipGMLimit.gm.toFixed(2)} m
                      </span>
                    </div>
                    <div>
                      <span className="block text-[7px] text-slate-500 font-mono">ACTIVE REEFER POWER</span>
                      <span className="text-xs font-mono font-bold text-cyan-600">
                        {reeferStats.count} Reefers ({reeferStats.totalPowerKw} kW)
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {vesselConfigType === "General Cargo Ship" && (
                <div className="w-full flex flex-col items-center justify-center space-y-4">
                  <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider absolute top-3 font-bold">Break-Bulk Stows & Deck Mounted Cranes</span>
                  
                  <svg viewBox="0 0 400 120" className="w-full drop-shadow-lg">
                    {/* Waterline */}
                    <line x1="10" y1="75" x2="390" y2="75" stroke="rgba(2, 132, 199, 0.5)" strokeWidth="1" strokeDasharray="3,3" />
                    
                    {/* Ship body shell - High Visibility Dark Navy */}
                    <path d="M15,45 L60,45 L350,45 L385,50 L380,80 L330,90 L60,90 L15,65 Z" fill="rgba(10, 37, 64, 0.03)" stroke="#0A2540" strokeWidth="2.5" />
                    
                    {/* Accommodation block */}
                    <rect x="25" y="20" width="30" height="25" fill="#cbd5e1" stroke="#0A2540" strokeWidth="1.5" />
                    <rect x="35" y="7" width="10" height="13" fill="#f1f5f9" stroke="#FF4500" strokeWidth="1.5" />
                    
                    {/* Cranes drawing */}
                    <g stroke="#0A2540" strokeWidth="1.5" fill="none">
                      {/* Crane 1 */}
                      <line x1="150" y1="45" x2="150" y2="25" />
                      <line x1="150" y1="25" x2="120" y2="15" />
                      <line x1="120" y1="15" x2="120" y2="40" stroke="rgba(10, 37, 64, 0.3)" strokeWidth="0.5" />
                      
                      {/* Crane 2 */}
                      <line x1="280" y1="45" x2="280" y2="25" />
                      <line x1="280" y1="25" x2="250" y2="15" />
                      <line x1="250" y1="15" x2="250" y2="40" stroke="rgba(10, 37, 64, 0.3)" strokeWidth="0.5" />
                    </g>
                    
                    {/* General Cargo Loads visual items styled in high-visibility Seafoam Mint Green */}
                    {/* Steel coil circles */}
                    <circle cx="95" cy="80" r="7" fill="none" stroke="#00A86B" strokeWidth="1.8" />
                    <circle cx="102" cy="80" r="7" fill="none" stroke="#00A86B" strokeWidth="1.8" />
                    <circle cx="109" cy="80" r="7" fill="none" stroke="#00A86B" strokeWidth="1.8" />
                    
                    {/* Crates */}
                    <rect x="180" y="62" width="22" height="22" fill="rgba(0, 168, 107, 0.1)" stroke="#00A86B" strokeWidth="1.5" />
                    <line x1="180" y1="62" x2="202" y2="84" stroke="rgba(0, 168, 107, 0.4)" strokeWidth="1.2" />
                    <line x1="202" y1="62" x2="180" y2="84" stroke="rgba(0, 168, 107, 0.4)" strokeWidth="1.2" />
 
                    <rect x="205" y="67" width="18" height="17" fill="rgba(0, 168, 107, 0.1)" stroke="#00A86B" strokeWidth="1.5" />
                    <line x1="205" y1="67" x2="223" y2="84" stroke="rgba(0, 168, 107, 0.4)" strokeWidth="1.2" />
                    <line x1="223" y1="67" x2="205" y2="84" stroke="rgba(0, 168, 107, 0.4)" strokeWidth="1.2" />
                    
                    {/* Timber stacks */}
                    <rect x="300" y="70" width="35" height="15" fill="rgba(0, 168, 107, 0.15)" stroke="#00A86B" strokeWidth="1.5" />
                    <line x1="300" y1="75" x2="335" y2="75" stroke="rgba(0, 168, 107, 0.5)" />
                    <line x1="300" y1="80" x2="335" y2="80" stroke="rgba(0, 168, 107, 0.5)" />
                  </svg>

                  {/* Dunnage checklist */}
                  <div className="w-full bg-slate-50 p-2 border border-slate-200 flex justify-between text-[10px] font-mono">
                    <span className="text-slate-500 font-bold">DUNNAGE CHECKLIST:</span>
                    <span className="text-emerald-600 font-bold">100% SECURED</span>
                  </div>
                </div>
              )}

              {vesselConfigType === "LNG Carrier Ship" && (
                <div className="w-full flex flex-col items-center justify-center space-y-4">
                  <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider absolute top-3 font-bold">Insulated Spherical Cryogenic Moss containment</span>
                  
                  <svg viewBox="0 0 400 120" className="w-full drop-shadow-lg">
                    {/* Waterline */}
                    <line x1="10" y1="78" x2="390" y2="78" stroke="rgba(2, 132, 199, 0.5)" strokeWidth="1" strokeDasharray="3,3" />
                    
                    {/* Ship body shell - High Visibility Dark Navy */}
                    <path d="M15,48 L60,48 L350,48 L385,53 L380,83 L330,93 L60,93 L15,68 Z" fill="rgba(10, 37, 64, 0.03)" stroke="#0A2540" strokeWidth="2.5" />
                    
                    {/* Accommodation block */}
                    <rect x="25" y="20" width="30" height="25" fill="#cbd5e1" stroke="#0A2540" strokeWidth="1.5" />
                    <rect x="35" y="7" width="10" height="13" fill="#f1f5f9" stroke="#FF4500" strokeWidth="1.5" />
                    
                    {/* Moss Spheres */}
                    {[85, 150, 215, 280].map((cxValue, i) => {
                      const radius = 23;
                      const level = lngLevels[i];
                      const levelHeight = (level / 100) * radius * 2;
                      const yBase = 72; // bottom of sphere inside hull
                      const isOverloaded = level > 85;
                      
                      return (
                        <g key={i}>
                          {/* Sphere casing outline */}
                          <circle cx={cxValue} cy={yBase - radius} r={radius} fill="none" stroke="#0A2540" strokeWidth="1.5" />
                          <circle cx={cxValue} cy={yBase - radius} r={radius - 2} fill="none" stroke="rgba(10, 37, 64, 0.2)" strokeWidth="1" strokeDasharray="2,2" />
                          
                          {/* Cryogenic cargo level - color coded green/red */}
                          <path 
                            d={`M${cxValue - radius * 0.95},${yBase - radius} A${radius},${radius} 0 0,0 ${cxValue + radius * 0.95},${yBase - radius} Z`} 
                            fill={isOverloaded ? "url(#lngCargoGradOverloaded)" : "url(#lngCargoGradSafe)"} 
                            opacity="0.85"
                          />
                          
                          {/* Spherical Dome cover */}
                          <path d={`M${cxValue - radius * 1.05},${yBase - radius} A${radius * 1.05},${radius * 1.05} 0 0,1 ${cxValue + radius * 1.05},${yBase - radius}`} fill="none" stroke="#0A2540" strokeWidth="1.5" />
                          
                          {/* Labels */}
                          <text x={cxValue} y={yBase - radius} className="text-[10px] font-mono text-white font-black drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" textAnchor="middle">{level}%</text>
                        </g>
                      );
                    })}

                    <defs>
                      <linearGradient id="lngCargoGradSafe" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#00A86B" />
                        <stop offset="100%" stopColor="#005C3A" />
                      </linearGradient>
                      <linearGradient id="lngCargoGradOverloaded" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#FF4500" />
                        <stop offset="100%" stopColor="#9A0000" />
                      </linearGradient>
                    </defs>
                  </svg>

                  {/* Gas Boilers status */}
                  <div className="w-full bg-slate-50 p-2 border border-slate-200 grid grid-cols-2 gap-2 text-[10px] font-mono">
                    <div>
                      <span className="block text-[7px] text-slate-500">BOIL-OFF RATE (BOG)</span>
                      <span className="text-cyan-600 font-bold">{bogRate}% / day</span>
                    </div>
                    <div>
                      <span className="block text-[7px] text-slate-500">BOG FUEL CO-GEN</span>
                      <span className="text-emerald-600 font-bold">{bogToFuel ? "ROUTED: 1,500 HP" : "FLARED (SAFETY VENT)"}</span>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* General vessel parameters details in 2D render box */}
            <div className="bg-slate-900/60 p-3 border border-slate-800 text-[11px] font-mono space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">STERN OVERHANG LOA:</span>
                <span className="text-slate-200">299.9 METERS</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">DESIGN BASE LINE DRAFT:</span>
                <span className="text-slate-200">15.5 METERS</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">CALCULATED HULL VOLUME:</span>
                <span className="text-emerald-400 font-bold">142,500 CBM</span>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: INTERACTIVE CALCULATOR & DISTRIBUTION CHART (7/12 cols) */}
          <div className="lg:col-span-7 bg-white border border-slate-200 p-5 space-y-5 rounded-none shadow-xs">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Scale className="w-4.5 h-4.5 text-[#0A2540]" />
                <h3 className="text-xs font-black uppercase text-[#0A2540] tracking-wider">
                  Cargo Loading Calculator & Distribution Chart
                </h3>
              </div>
              <button
                onClick={handleSaveCargoState}
                className="bg-[#0A2540] hover:bg-slate-800 text-white text-[10px] font-mono font-bold uppercase tracking-wider px-3 py-1.5 cursor-pointer shadow border transition-colors"
              >
                Save Cargo State
              </button>
            </div>

            {/* RENDER ACTIVE SHIP TYPE CARGO PANEL INPUTS */}
            
            {/* 1. BULK CARRIER INPUT CONSOLE */}
            {vesselConfigType === "Bulk Carrier Ship" && (
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 p-3 flex gap-2">
                  <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span className="text-[10px] font-sans text-amber-800 leading-relaxed">
                    <strong>Draft Survey Calculation Engine:</strong> Cargo weight loaded is computed from Hydrostatic tables as the difference of final and initial displacements, corrected for water density (TPC: {tpc} tonnes/cm immersion).
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[9px] font-mono uppercase text-slate-500 font-bold">Initial Draft Survey (m)</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      value={initialDraft} 
                      onChange={(e) => setInitialDraft(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-xs font-mono font-bold text-slate-800"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[9px] font-mono uppercase text-slate-500 font-bold">Final Draft Survey (m)</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      value={finalDraft} 
                      onChange={(e) => setFinalDraft(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-xs font-mono font-bold text-slate-800"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[9px] font-mono uppercase text-slate-500 font-bold">Immersion Factor (TPC)</label>
                    <input 
                      type="number" 
                      step="0.1" 
                      value={tpc} 
                      onChange={(e) => setTpc(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-xs font-mono font-bold text-slate-800"
                    />
                  </div>
                </div>

                {/* Hold Level Sliders */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black uppercase text-slate-700 tracking-wider">Configure Cargo Hold Fill Levels</h4>
                  <div className="space-y-2 border border-slate-100 p-3 bg-slate-50">
                    {bulkHolds.map((val, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <span className="text-[10px] font-mono text-slate-500 w-16 font-bold">Hold {idx+1}:</span>
                        <input 
                          type="range" 
                          min="0" 
                          max="100" 
                          value={val}
                          onChange={(e) => {
                            const valNum = parseInt(e.target.value);
                            setBulkHolds(prev => {
                              const next = [...prev];
                              next[idx] = valNum;
                              return next;
                            });
                          }}
                          className="flex-1 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                        />
                        <span className="text-[11px] font-mono text-[#0A2540] font-bold w-12 text-right">{val}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Computed Weights display */}
                <div className="bg-[#0A2540] text-white p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <span className="block text-[8px] font-mono text-slate-400">SURVEY CARGO WEIGHT COMPLETED</span>
                    <span className="text-xl font-black text-emerald-400 font-mono">
                      {bulkDraftSurveyWeight.toLocaleString(undefined, {maximumFractionDigits:1})} MT
                    </span>
                  </div>
                  <div>
                    <span className="block text-[8px] font-mono text-slate-400">LOAD CAPACITY DEFICIT</span>
                    <span className="text-xl font-black text-amber-400 font-mono">
                      {Math.max(0, dwt - bulkDraftSurveyWeight).toLocaleString(undefined, {maximumFractionDigits:1})} MT
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 2. TANKER INPUT CONSOLE */}
            {vesselConfigType === "Tanker" && (
              <div className="space-y-4">
                <div className="bg-sky-50 border border-sky-200 p-3 flex gap-2">
                  <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                  <span className="text-[10px] font-sans text-sky-800 leading-relaxed">
                    <strong>ASTM Table 54A Conversion Math:</strong> Volume is computed from Ullage measurements (Max height 15m), and corrected to Standard Temperature (15°C) using the thermal expansion coefficient of crude.
                  </span>
                </div>

                {/* Tanks matrix inputs */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-100 border-b border-slate-200">
                      <tr>
                        <th className="p-2 text-[9px] font-bold text-slate-500 uppercase">Tank ID</th>
                        <th className="p-2 text-[9px] font-bold text-slate-500 uppercase">Ullage (m)</th>
                        <th className="p-2 text-[9px] font-bold text-slate-500 uppercase">Temp (°C)</th>
                        <th className="p-2 text-[9px] font-bold text-slate-500 uppercase">Density @ 15°C</th>
                        <th className="p-2 text-[9px] font-bold text-slate-500 uppercase text-right">Computed Cargo (MT)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {tankerVolumesAndWeights.tanks.map((tank, idx) => (
                        <tr key={tank.id}>
                          <td className="p-2 font-bold text-slate-700">Cargo Tank {tank.id}</td>
                          <td className="p-2">
                            <input 
                              type="number" 
                              step="0.1" 
                              min="0" 
                              max="15" 
                              value={tankUllages[idx]}
                              onChange={(e) => {
                                const valNum = parseFloat(e.target.value) || 0;
                                setTankUllages(prev => {
                                  const next = [...prev];
                                  next[idx] = valNum;
                                  return next;
                                });
                              }}
                              className="w-16 bg-slate-50 border border-slate-200 px-1 py-0.5 text-xs text-center"
                            />
                          </td>
                          <td className="p-2">
                            <input 
                              type="number" 
                              step="0.1" 
                              value={tankTemps[idx]}
                              onChange={(e) => {
                                const valNum = parseFloat(e.target.value) || 0;
                                setTankTemps(prev => {
                                  const next = [...prev];
                                  next[idx] = valNum;
                                  return next;
                                });
                              }}
                              className="w-16 bg-slate-50 border border-slate-200 px-1 py-0.5 text-xs text-center"
                            />
                          </td>
                          <td className="p-2">
                            <input 
                              type="number" 
                              step="1" 
                              value={tankDensities[idx]}
                              onChange={(e) => {
                                const valNum = parseInt(e.target.value) || 0;
                                setTankDensities(prev => {
                                  const next = [...prev];
                                  next[idx] = valNum;
                                  return next;
                                });
                              }}
                              className="w-20 bg-slate-50 border border-slate-200 px-1 py-0.5 text-xs text-center"
                            />
                          </td>
                          <td className="p-2 text-right font-bold text-slate-800">
                            {tank.weightMT.toLocaleString(undefined, {maximumFractionDigits:1})} MT
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Telemetry controls */}
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 border border-slate-200">
                  <div className="space-y-1">
                    <label className="block text-[8px] font-mono text-slate-500 uppercase font-bold">IGS Oxygen Level Verification (%)</label>
                    <input 
                      type="number" 
                      step="0.1" 
                      value={vaporOxygen} 
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setVaporOxygen(val);
                        if (val > 5.0) {
                          addLog("Alert System", "IGS oxygen level EXCEEDS MARPOL safety limit (>5.0% O₂).", "warning");
                        }
                      }}
                      className="w-full bg-white border border-slate-200 px-2 py-1 text-xs font-mono font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[8px] font-mono text-slate-500 uppercase font-bold">IGS Line Pressure (mmWG)</label>
                    <input 
                      type="number" 
                      step="1" 
                      value={igsPressure} 
                      onChange={(e) => setIgsPressure(parseInt(e.target.value) || 0)}
                      className="w-full bg-white border border-slate-200 px-2 py-1 text-xs font-mono font-bold"
                    />
                  </div>
                </div>

                {/* Summary */}
                <div className="bg-[#0A2540] text-white p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <span className="block text-[8px] font-mono text-slate-400">TOTAL NET PETROLEUM WEIGHT</span>
                    <span className="text-xl font-black text-emerald-400 font-mono">
                      {tankerVolumesAndWeights.totalWeightMT.toLocaleString(undefined, {maximumFractionDigits:1})} MT
                    </span>
                  </div>
                  <div>
                    <span className="block text-[8px] font-mono text-slate-400">TOTAL LIQUID VOLUME @ 15°C</span>
                    <span className="text-xl font-black text-sky-400 font-mono">
                      {tankerVolumesAndWeights.totalNetVolAt15.toLocaleString(undefined, {maximumFractionDigits:1})} CBM
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 3. CONTAINER SHIP INPUT CONSOLE */}
            {vesselConfigType === "Container Ship" && (
              <div className="space-y-4">
                <div className="bg-emerald-50 border border-emerald-200 p-3 flex gap-2">
                  <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="text-[10px] font-sans text-emerald-800 leading-relaxed">
                    <strong>Cellular Stack Stability:</strong> Real-time transverse stability calculation of GM (Metacentric Height). Maintain GM between 1.5m and 4.5m to prevent stiff rolling stresses or capsizing risks.
                  </span>
                </div>

                {/* Grid matrix container loading */}
                <div className="bg-slate-50 p-4 border border-slate-200 space-y-3">
                  <h4 className="text-[10px] font-black uppercase text-slate-700 tracking-wider">Book New Cargo Container (ISO Container Matrix)</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <div className="space-y-1">
                      <label className="block text-[8px] font-mono uppercase text-slate-500 font-bold">Bay (Long.)</label>
                      <select value={newBay} onChange={(e) => setNewBay(e.target.value)} className="w-full bg-white border border-slate-200 p-1 text-xs">
                        <option value="01">Bay 01 (Forward)</option>
                        <option value="02">Bay 02</option>
                        <option value="03">Bay 03 (Midship)</option>
                        <option value="04">Bay 04</option>
                        <option value="05">Bay 05 (Aft)</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[8px] font-mono uppercase text-slate-500 font-bold">Row (Transv.)</label>
                      <select value={newRow} onChange={(e) => setNewRow(e.target.value)} className="w-full bg-white border border-slate-200 p-1 text-xs">
                        <option value="01">Row 01 (Port)</option>
                        <option value="02">Row 02 (CL-P)</option>
                        <option value="03">Row 03 (CL-S)</option>
                        <option value="04">Row 04 (STBD)</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[8px] font-mono uppercase text-slate-500 font-bold">Tier (Vert.)</label>
                      <select value={newTier} onChange={(e) => setNewTier(e.target.value)} className="w-full bg-white border border-slate-200 p-1 text-xs">
                        <option value="82">Tier 82 (Deck)</option>
                        <option value="84">Tier 84 (Mid)</option>
                        <option value="86">Tier 86 (High)</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[8px] font-mono uppercase text-slate-500 font-bold">Weight (T)</label>
                      <input 
                        type="number" 
                        value={newWeight} 
                        onChange={(e) => setNewWeight(parseInt(e.target.value) || 0)} 
                        className="w-full bg-white border border-slate-200 p-1 text-xs" 
                      />
                    </div>
                    <div className="space-y-1 flex flex-col justify-end">
                      <button
                        onClick={() => {
                          const exist = containerMatrix.find(c => c.active && c.bay === newBay && c.row === newRow && c.tier === newTier);
                          if (exist) {
                            addLog("Load Alert", `Slot Bay ${newBay}-Row ${newRow}-Tier ${newTier} is already occupied.`, "warning");
                            return;
                          }
                          const newBox = { bay: newBay, row: newRow, tier: newTier, weight: newWeight, reefer: newIsReefer, active: true };
                          setContainerMatrix([...containerMatrix, newBox]);
                          addLog("Cargo Load", `ISO Box booked at Bay ${newBay}-Row ${newRow}-Tier ${newTier} (${newWeight} MT).`, "success");
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] uppercase font-bold py-1.5 px-2 font-mono"
                      >
                        Add Container
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <input 
                      type="checkbox" 
                      id="isReeferChk" 
                      checked={newIsReefer} 
                      onChange={(e) => setNewIsReefer(e.target.checked)} 
                      className="cursor-pointer"
                    />
                    <label htmlFor="isReeferChk" className="text-[10px] font-mono text-slate-600 cursor-pointer">
                      This is a Refrigerated (Reefer) Cargo Box (Requires active cooling connection)
                    </label>
                  </div>
                </div>

                {/* Active Container Listing with delete option */}
                <div className="border border-slate-200 max-h-[140px] overflow-y-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-100 sticky top-0 border-b border-slate-200">
                      <tr>
                        <th className="p-2 text-[9px] font-bold text-slate-500">ISO Coordinate</th>
                        <th className="p-2 text-[9px] font-bold text-slate-500">Type</th>
                        <th className="p-2 text-[9px] font-bold text-slate-500">Weight</th>
                        <th className="p-2 text-[9px] font-bold text-slate-500 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {containerMatrix.filter(c => c.active).map((box, i) => (
                        <tr key={i}>
                          <td className="p-2 font-bold text-[#0A2540]">BAY {box.bay} — ROW {box.row} — TIER {box.tier}</td>
                          <td className="p-2">
                            {box.reefer ? (
                              <span className="text-cyan-600 font-bold flex items-center gap-1 text-[9px]"><Zap className="w-3 h-3 text-cyan-400" /> REEFER ACTIVE</span>
                            ) : (
                              <span className="text-slate-400 text-[9px]">DRY VAN</span>
                            )}
                          </td>
                          <td className="p-2 font-bold">{box.weight} tonnes</td>
                          <td className="p-2 text-right">
                            <button 
                              onClick={() => {
                                setContainerMatrix(prev => prev.map((c, index) => index === i ? { ...c, active: false } : c));
                                addLog("Cargo Unload", `ISO Box at Bay ${box.bay} discharged.`, "info");
                              }}
                              className="text-red-500 hover:text-red-700 p-0.5 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Stability readouts */}
                <div className="bg-[#0A2540] text-white p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <span className="block text-[8px] font-mono text-slate-400 font-bold">TOTAL MANIFEST CARGO</span>
                    <span className="text-xl font-black text-emerald-400 font-mono">
                      {containerShipGMLimit.cargoWeight.toLocaleString()} MT
                    </span>
                  </div>
                  <div>
                    <span className="block text-[8px] font-mono text-slate-400 font-bold">STABILITY VERTICAL CENTER (KG)</span>
                    <span className="text-xl font-black text-sky-400 font-mono">
                      {containerShipGMLimit.kg.toFixed(2)} m
                    </span>
                  </div>
                  <div>
                    <span className="block text-[8px] font-mono text-slate-400 font-bold">METACENTRIC HEIGHT (GM)</span>
                    <span className={`text-xl font-black font-mono ${containerShipGMLimit.isHazard ? "text-red-400 animate-pulse" : "text-emerald-400"}`}>
                      {containerShipGMLimit.gm.toFixed(2)} m
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 4. GENERAL CARGO INPUT CONSOLE */}
            {vesselConfigType === "General Cargo Ship" && (
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 p-3 flex gap-2">
                  <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span className="text-[10px] font-sans text-amber-800 leading-relaxed">
                    <strong>Multi-Purpose Crane Tally & Dunnage:</strong> Break-bulk loading requires careful tally counts of cargo pieces, placement of dunnage wood blocks to distribute loads, and wire/chain lashing for heavy lifts.
                  </span>
                </div>

                <div className="space-y-3">
                  <h4 className="text-[10px] font-black uppercase text-slate-700 tracking-wider">Tally Grid & Loading Counters</h4>
                  <div className="border border-slate-200 rounded-none overflow-hidden">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-slate-100 border-b border-slate-200">
                        <tr>
                          <th className="p-2.5 text-[9px] font-bold text-slate-500 uppercase">Item Category</th>
                          <th className="p-2.5 text-[9px] font-bold text-slate-500 uppercase">Unit Weight (T)</th>
                          <th className="p-2.5 text-[9px] font-bold text-slate-500 uppercase text-center">Piece Count</th>
                          <th className="p-2.5 text-[9px] font-bold text-slate-500 uppercase text-right">Subtotal Weight</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {generalCargoItems.map((item, idx) => (
                          <tr key={idx}>
                            <td className="p-2.5 font-sans font-semibold text-slate-700">{item.name}</td>
                            <td className="p-2.5 font-bold text-slate-600">{item.unitWeight} MT</td>
                            <td className="p-2.5 text-center">
                              <div className="inline-flex items-center gap-1 bg-slate-100 border border-slate-200 px-1 py-0.5">
                                <button 
                                  onClick={() => {
                                    setGeneralCargoItems(prev => prev.map((p, i) => i === idx ? { ...p, quantity: Math.max(0, p.quantity - 1) } : p));
                                  }}
                                  className="w-5 h-5 bg-white border border-slate-200 rounded-none text-xs font-black cursor-pointer hover:bg-slate-50"
                                >
                                  -
                                </button>
                                <span className="w-8 text-center font-bold font-mono">{item.quantity}</span>
                                <button 
                                  onClick={() => {
                                    setGeneralCargoItems(prev => prev.map((p, i) => i === idx ? { ...p, quantity: p.quantity + 1 } : p));
                                  }}
                                  className="w-5 h-5 bg-white border border-slate-200 rounded-none text-xs font-black cursor-pointer hover:bg-slate-50"
                                >
                                  +
                                </button>
                              </div>
                            </td>
                            <td className="p-2.5 text-right font-black text-slate-800 font-mono">
                              {(item.quantity * item.unitWeight).toLocaleString()} MT
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Dunnage and Securing confirmations */}
                <div className="bg-slate-50 p-3.5 border border-slate-200 space-y-3">
                  <h4 className="text-[10px] font-black uppercase text-slate-700 tracking-wider">Securing & Cargo Stability Verification</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div 
                      onClick={() => setDunnageConfirmed(!dunnageConfirmed)}
                      className={`p-2.5 border flex items-center justify-between cursor-pointer transition-all ${
                        dunnageConfirmed 
                          ? "bg-emerald-50 border-emerald-400 text-emerald-800" 
                          : "bg-red-50 border-red-300 text-red-800"
                      }`}
                    >
                      <span className="text-[10px] font-mono font-bold">DUNNAGE BLOCKS PLACED:</span>
                      <span className="text-[10px] font-black uppercase">{dunnageConfirmed ? "YES / CONFIRMED" : "NO / PENDING"}</span>
                    </div>

                    <div 
                      onClick={() => setLashingConfirmed(!lashingConfirmed)}
                      className={`p-2.5 border flex items-center justify-between cursor-pointer transition-all ${
                        lashingConfirmed 
                          ? "bg-emerald-50 border-emerald-400 text-emerald-800" 
                          : "bg-red-50 border-red-300 text-red-800"
                      }`}
                    >
                      <span className="text-[10px] font-mono font-bold">CHAIN & WIRE LASHING SECURED:</span>
                      <span className="text-[10px] font-black uppercase">{lashingConfirmed ? "YES / SECURE" : "NO / PENDING"}</span>
                    </div>
                  </div>
                </div>

                {/* Weight summary */}
                <div className="bg-[#0A2540] text-white p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <span className="block text-[8px] font-mono text-slate-400 font-bold">TOTAL REGISTERED BREAK-BULK WEIGHT</span>
                    <span className="text-xl font-black text-emerald-400 font-mono">
                      {generalCargoTotalWeight.toLocaleString()} MT
                    </span>
                  </div>
                  <div>
                    <span className="block text-[8px] font-mono text-slate-400 font-bold">SECURE LOG COMPLIANCE</span>
                    <span className={`text-xl font-black font-mono ${(!dunnageConfirmed || !lashingConfirmed) ? "text-amber-400 animate-pulse" : "text-emerald-400"}`}>
                      {(!dunnageConfirmed || !lashingConfirmed) ? "UNSECURED HAZARD" : "VERIFIED COMPLIANT"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 5. LNG CARRIER INPUT CONSOLE */}
            {vesselConfigType === "LNG Carrier Ship" && (
              <div className="space-y-4">
                <div className="bg-cyan-50 border border-cyan-200 p-3 flex gap-2">
                  <Info className="w-4 h-4 text-cyan-600 shrink-0 mt-0.5" />
                  <span className="text-[10px] font-sans text-cyan-800 leading-relaxed">
                    <strong>CTS Cryogenic Custody Transfer System:</strong> Boil-off gas (BOG) is generated at approx. {bogRate}% per day due to heat entry into tanks. This is compressor-routed directly to boilers or dual-fuel main engine for propulsion efficiency.
                  </span>
                </div>

                {/* CTS Tanks gauges list */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {lngLevels.map((lvl, idx) => (
                    <div key={idx} className="bg-slate-50 border border-slate-200 p-3 space-y-2 text-center">
                      <span className="block text-[9px] font-mono font-bold text-slate-500 uppercase">LNG Sphere {idx+1}</span>
                      <div className="space-y-1">
                        <label className="block text-[8px] text-slate-400 font-mono">Fill Level %</label>
                        <input 
                          type="number" 
                          step="0.1" 
                          value={lvl}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setLngLevels(prev => {
                              const next = [...prev];
                              next[idx] = Math.min(100, Math.max(0, val));
                              return next;
                            });
                          }}
                          className="w-full bg-white border border-slate-200 p-1 text-xs text-center font-bold text-slate-800"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[8px] text-slate-400 font-mono">Temp (°C)</label>
                        <input 
                          type="number" 
                          step="0.1" 
                          value={lngTemps[idx]}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setLngTemps(prev => {
                              const next = [...prev];
                              next[idx] = val;
                              return next;
                            });
                          }}
                          className="w-full bg-white border border-slate-200 p-1 text-xs text-center font-bold text-slate-800 font-mono"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* BOG Settings */}
                <div className="bg-slate-50 p-3.5 border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="space-y-1">
                    <label className="block text-[9px] font-mono text-slate-500 uppercase font-bold">Compresor Boil-Off Gas (BOG) Rate (%/day)</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      value={bogRate} 
                      onChange={(e) => setBogRate(parseFloat(e.target.value) || 0)}
                      className="w-24 bg-white border border-slate-200 p-1 text-xs font-mono font-bold"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id="bogFuelChk" 
                      checked={bogToFuel} 
                      onChange={(e) => setBogToFuel(e.target.checked)} 
                      className="cursor-pointer"
                    />
                    <label htmlFor="bogFuelChk" className="text-[10px] font-mono text-slate-600 font-bold cursor-pointer">
                      Route BOG to Boiler/Main Engine fuel systems
                    </label>
                  </div>
                </div>

                {/* LNG summary */}
                <div className="bg-[#0A2540] text-white p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <span className="block text-[8px] font-mono text-slate-400 font-bold">TOTAL CUSTODY VOLUME</span>
                    <span className="text-xl font-black text-cyan-400 font-mono">
                      {lngCargoStats.totalVolumeCbm.toLocaleString(undefined, {maximumFractionDigits:1})} CBM
                    </span>
                  </div>
                  <div>
                    <span className="block text-[8px] font-mono text-slate-400 font-bold">TOTAL CARGO WEIGHT</span>
                    <span className="text-xl font-black text-emerald-400 font-mono">
                      {lngCargoStats.totalWeightMT.toLocaleString(undefined, {maximumFractionDigits:1})} MT
                    </span>
                  </div>
                  <div>
                    <span className="block text-[8px] font-mono text-slate-400 font-bold">FUEL CO-GENERATION</span>
                    <span className="text-xl font-black text-sky-400 font-mono">
                      {lngCargoStats.lossPerHourMT.toFixed(2)} MT/hr
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* HISTORICAL RUNTIME CARGO STATE LOGS */}
            <div className="space-y-2 pt-1">
              <h4 className="text-[10px] font-black uppercase text-[#0A2540] tracking-wider">Cargo & Ballast Log Deck Entries</h4>
              <div className="border border-slate-200 h-[100px] overflow-y-auto bg-slate-50 text-[10.5px] font-mono divide-y divide-slate-200">
                {logs.map((log) => (
                  <div key={log.id} className="p-2 flex items-start gap-2 justify-between">
                    <div className="space-y-0.5">
                      <span className="text-slate-400">[{log.timestamp}]</span>{" "}
                      <span className="text-slate-500 font-bold uppercase">{log.type}:</span>{" "}
                      <span className="text-slate-700 font-medium">{log.event}</span>
                    </div>
                    <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 shrink-0 ${
                      log.status === "success" ? "text-emerald-600 bg-emerald-100/60" : 
                      log.status === "warning" ? "text-amber-600 bg-amber-100/60" : 
                      "text-slate-500 bg-slate-200/60"
                    }`}>
                      {log.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------------- */}
      {/* SUB-TAB 2: BALLAST SYSTEM PANEL */}
      {/* ------------------------------------------------------------------------- */}
      {subTab === "ballast" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT COLUMN: Ballast Tanks Structural Diagram & Valve Grid (6/12 cols) */}
          <div className="lg:col-span-6 bg-slate-950 text-white p-5 space-y-4 border border-[#0A2540]">
            <div className="flex items-center justify-between border-b border-[#0A2540] pb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-300">
                Ballast Tank Array & Active Piping System
              </span>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#00F0FF] animate-pulse" />
                <span className="text-[8px] font-mono text-[#00F0FF] uppercase font-bold">Flow active</span>
              </div>
            </div>

            {/* BALLAST TANKS DRAWING WITH FILL HEIGHTS */}
            <div className="border border-[#0A2540] bg-[#051626] rounded-none h-[300px] p-4 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute inset-0 bg-[linear-gradient(rgba(0,240,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(0,240,255,0.04)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />

              <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider block text-center">Structural Layout (Water Ballast levels)</span>
              
              {/* Ballast schematic list */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 my-auto">
                {/* 1. Fore Peak Tank */}
                <div 
                  onClick={() => setSelectedBallastTank("forePeak")}
                  className={`border p-2 cursor-pointer transition-all ${
                    selectedBallastTank === "forePeak" ? "border-[#00F0FF] bg-[#051626]" : "border-[#0A2540] hover:border-[#00F0FF]/60 bg-[#051626]/40"
                  }`}
                >
                  <div className="flex justify-between items-center text-[7.5px] font-mono text-slate-400 mb-1">
                    <span className="font-bold">FP TANK</span>
                    <span className="font-extrabold text-[#00F0FF] drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">{ballastTanks.forePeak}%</span>
                  </div>
                  <div className="w-full bg-[#051626] h-10 border border-[#0A2540] relative overflow-hidden">
                    <div 
                      className={`${ballastTanks.forePeak > 85 ? "bg-[#FF4500]/85" : "bg-[#00A86B]/85"} absolute bottom-0 w-full transition-all duration-500`}
                      style={{ height: `${ballastTanks.forePeak}%` }}
                    />
                  </div>
                </div>

                {/* 2. Aft Peak Tank */}
                <div 
                  onClick={() => setSelectedBallastTank("aftPeak")}
                  className={`border p-2 cursor-pointer transition-all ${
                    selectedBallastTank === "aftPeak" ? "border-[#00F0FF] bg-[#051626]" : "border-[#0A2540] hover:border-[#00F0FF]/60 bg-[#051626]/40"
                  }`}
                >
                  <div className="flex justify-between items-center text-[7.5px] font-mono text-slate-400 mb-1">
                    <span className="font-bold">AP TANK</span>
                    <span className="font-extrabold text-[#00F0FF] drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">{ballastTanks.aftPeak}%</span>
                  </div>
                  <div className="w-full bg-[#051626] h-10 border border-[#0A2540] relative overflow-hidden">
                    <div 
                      className={`${ballastTanks.aftPeak > 85 ? "bg-[#FF4500]/85" : "bg-[#00A86B]/85"} absolute bottom-0 w-full transition-all duration-500`}
                      style={{ height: `${ballastTanks.aftPeak}%` }}
                    />
                  </div>
                </div>

                {/* 3. Double-Bottom 1 Port */}
                <div 
                  onClick={() => setSelectedBallastTank("db1P")}
                  className={`border p-2 cursor-pointer transition-all ${
                    selectedBallastTank === "db1P" ? "border-[#00F0FF] bg-[#051626]" : "border-[#0A2540] hover:border-[#00F0FF]/60 bg-[#051626]/40"
                  }`}
                >
                  <div className="flex justify-between items-center text-[7.5px] font-mono text-slate-400 mb-1">
                    <span className="font-bold">DB 1 PORT</span>
                    <span className="font-extrabold text-[#00F0FF] drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">{ballastTanks.db1P}%</span>
                  </div>
                  <div className="w-full bg-[#051626] h-10 border border-[#0A2540] relative overflow-hidden">
                    <div 
                      className={`${ballastTanks.db1P > 85 ? "bg-[#FF4500]/85" : "bg-[#00A86B]/85"} absolute bottom-0 w-full transition-all duration-500`}
                      style={{ height: `${ballastTanks.db1P}%` }}
                    />
                  </div>
                </div>

                {/* 4. Double-Bottom 1 Starboard */}
                <div 
                  onClick={() => setSelectedBallastTank("db1S")}
                  className={`border p-2 cursor-pointer transition-all ${
                    selectedBallastTank === "db1S" ? "border-[#00F0FF] bg-[#051626]" : "border-[#0A2540] hover:border-[#00F0FF]/60 bg-[#051626]/40"
                  }`}
                >
                  <div className="flex justify-between items-center text-[7.5px] font-mono text-slate-400 mb-1">
                    <span className="font-bold">DB 1 STBD</span>
                    <span className="font-extrabold text-[#00F0FF] drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">{ballastTanks.db1S}%</span>
                  </div>
                  <div className="w-full bg-[#051626] h-10 border border-[#0A2540] relative overflow-hidden">
                    <div 
                      className={`${ballastTanks.db1S > 85 ? "bg-[#FF4500]/85" : "bg-[#00A86B]/85"} absolute bottom-0 w-full transition-all duration-500`}
                      style={{ height: `${ballastTanks.db1S}%` }}
                    />
                  </div>
                </div>

                {/* 5. Double-Bottom 2 Port */}
                <div 
                  onClick={() => setSelectedBallastTank("db2P")}
                  className={`border p-2 cursor-pointer transition-all ${
                    selectedBallastTank === "db2P" ? "border-[#00F0FF] bg-[#051626]" : "border-[#0A2540] hover:border-[#00F0FF]/60 bg-[#051626]/40"
                  }`}
                >
                  <div className="flex justify-between items-center text-[7.5px] font-mono text-slate-400 mb-1">
                    <span className="font-bold">DB 2 PORT</span>
                    <span className="font-extrabold text-[#00F0FF] drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">{ballastTanks.db2P}%</span>
                  </div>
                  <div className="w-full bg-[#051626] h-10 border border-[#0A2540] relative overflow-hidden">
                    <div 
                      className={`${ballastTanks.db2P > 85 ? "bg-[#FF4500]/85" : "bg-[#00A86B]/85"} absolute bottom-0 w-full transition-all duration-500`}
                      style={{ height: `${ballastTanks.db2P}%` }}
                    />
                  </div>
                </div>

                {/* 6. Double-Bottom 2 Starboard */}
                <div 
                  onClick={() => setSelectedBallastTank("db2S")}
                  className={`border p-2 cursor-pointer transition-all ${
                    selectedBallastTank === "db2S" ? "border-[#00F0FF] bg-[#051626]" : "border-[#0A2540] hover:border-[#00F0FF]/60 bg-[#051626]/40"
                  }`}
                >
                  <div className="flex justify-between items-center text-[7.5px] font-mono text-slate-400 mb-1">
                    <span className="font-bold">DB 2 STBD</span>
                    <span className="font-extrabold text-[#00F0FF] drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">{ballastTanks.db2S}%</span>
                  </div>
                  <div className="w-full bg-[#051626] h-10 border border-[#0A2540] relative overflow-hidden">
                    <div 
                      className={`${ballastTanks.db2S > 85 ? "bg-[#FF4500]/85" : "bg-[#00A86B]/85"} absolute bottom-0 w-full transition-all duration-500`}
                      style={{ height: `${ballastTanks.db2S}%` }}
                    />
                  </div>
                </div>

                {/* 7. Heeling Tank Port */}
                <div 
                  onClick={() => setSelectedBallastTank("heelingP")}
                  className={`border p-2 cursor-pointer transition-all ${
                    selectedBallastTank === "heelingP" ? "border-[#00F0FF] bg-[#051626]" : "border-[#0A2540] hover:border-[#00F0FF]/60 bg-[#051626]/40"
                  }`}
                >
                  <div className="flex justify-between items-center text-[7.5px] font-mono text-slate-400 mb-1">
                    <span className="font-bold">HEEL PORT</span>
                    <span className="font-extrabold text-[#00F0FF] drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">{ballastTanks.heelingP}%</span>
                  </div>
                  <div className="w-full bg-[#051626] h-10 border border-[#0A2540] relative overflow-hidden">
                    <div 
                      className={`${ballastTanks.heelingP > 85 ? "bg-[#FF4500]/85" : "bg-[#00A86B]/85"} absolute bottom-0 w-full transition-all duration-500`}
                      style={{ height: `${ballastTanks.heelingP}%` }}
                    />
                  </div>
                </div>

                {/* 8. Heeling Tank Starboard */}
                <div 
                  onClick={() => setSelectedBallastTank("heelingS")}
                  className={`border p-2 cursor-pointer transition-all ${
                    selectedBallastTank === "heelingS" ? "border-[#00F0FF] bg-[#051626]" : "border-[#0A2540] hover:border-[#00F0FF]/60 bg-[#051626]/40"
                  }`}
                >
                  <div className="flex justify-between items-center text-[7.5px] font-mono text-slate-400 mb-1">
                    <span className="font-bold">HEEL STBD</span>
                    <span className="font-extrabold text-[#00F0FF] drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">{ballastTanks.heelingS}%</span>
                  </div>
                  <div className="w-full bg-[#051626] h-10 border border-[#0A2540] relative overflow-hidden">
                    <div 
                      className={`${ballastTanks.heelingS > 85 ? "bg-[#FF4500]/85" : "bg-[#00A86B]/85"} absolute bottom-0 w-full transition-all duration-500`}
                      style={{ height: `${ballastTanks.heelingS}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Piping Flow schematic path animation */}
              <div className="bg-[#051626] p-2 border border-[#0A2540] flex justify-between items-center text-[9px] font-mono">
                <div className="flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-[#00F0FF]" />
                  <span>PIPING SYSTEM VALVE LOGS:</span>
                </div>
                <span className="text-slate-300 uppercase">
                  Selected: <span className="text-[#00F0FF] font-bold">{selectedBallastTank}</span> Valve is {valvesOpen[selectedBallastTank] ? "OPEN" : "CLOSED"}
                </span>
              </div>
            </div>

            {/* Quick action valve toggle and pumps override */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
              <button
                onClick={() => {
                  const currentVal = valvesOpen[selectedBallastTank];
                  setValvesOpen(prev => ({ ...prev, [selectedBallastTank]: !currentVal }));
                  addLog("Valve Toggle", `Ballast Valve for tank [${selectedBallastTank}] toggled to ${!currentVal ? "OPEN" : "CLOSED"}.`, "info");
                }}
                className={`py-2 border font-bold uppercase transition-all rounded-none ${
                  valvesOpen[selectedBallastTank]
                    ? "bg-emerald-600/80 border-emerald-500 text-white"
                    : "bg-red-950/60 border-[#0A2540] text-red-300 hover:border-[#FF4500]/60"
                }`}
              >
                Valve: {valvesOpen[selectedBallastTank] ? "Open" : "Closed"}
              </button>

              <button
                onClick={() => {
                  setBallastPump1(!ballastPump1);
                  addLog("Pump Toggle", `Main Ballast Pump 1 toggled to ${!ballastPump1 ? "RUNNING" : "STOPPED"}.`, "info");
                }}
                className={`py-2 border font-bold uppercase transition-all rounded-none ${
                  ballastPump1
                    ? "bg-cyan-600/80 border-cyan-500 text-white animate-pulse"
                    : "bg-slate-900 border-[#0A2540] text-slate-400 hover:border-[#00F0FF]/60"
                }`}
              >
                Pump 1: {ballastPump1 ? "Running" : "Stopped"}
              </button>

              <button
                onClick={() => {
                  setBallastPump2(!ballastPump2);
                  addLog("Pump Toggle", `Main Ballast Pump 2 toggled to ${!ballastPump2 ? "RUNNING" : "STOPPED"}.`, "info");
                }}
                className={`py-2 border font-bold uppercase transition-all rounded-none ${
                  ballastPump2
                    ? "bg-cyan-600/80 border-cyan-500 text-white animate-pulse"
                    : "bg-slate-900 border-[#0A2540] text-slate-400 hover:border-[#00F0FF]/60"
                }`}
              >
                Pump 2: {ballastPump2 ? "Running" : "Stopped"}
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN: Vessel Type Specialized Ballast Consoles (6/12 cols) */}
          <div className="lg:col-span-6 bg-white border border-slate-200 p-5 space-y-5 rounded-none shadow-xs">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Compass className="w-4.5 h-4.5 text-[#0A2540]" />
                <h3 className="text-xs font-black uppercase text-[#0A2540] tracking-wider">
                  Specialized Ballast Console & SIMOPS Controls
                </h3>
              </div>
              <span className="text-[10px] font-mono text-slate-500 uppercase">TELEMETRY MONITOR</span>
            </div>

            {/* A. BULK CARRIERS SPECIALIZED BALLAST CONSOLE */}
            {vesselConfigType === "Bulk Carrier Ship" && (
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 p-3 flex gap-2">
                  <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-[10px] font-sans text-amber-800 leading-relaxed">
                    <strong>De-Ballasting Pump Rate Synchronizer:</strong> Dry bulk loading speed is highly critical (6,000 MT/hr). If de-ballasting pumps cannot discharge water fast enough to offset incoming dry cargo weight, the loader MUST be paused to prevent excessive structural stress.
                  </div>
                </div>

                {/* Loading speed vs discharge simulator */}
                <div className="bg-slate-50 p-4 border border-slate-200 space-y-3">
                  <h4 className="text-[10px] font-black uppercase text-slate-700 tracking-wider">Dry Cargo loader vs Ballast Discharge</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-3 border border-slate-200 text-center">
                      <span className="block text-[8px] text-slate-500 font-mono">DRY CARGO POUR RATE</span>
                      <span className="text-sm font-mono font-bold text-slate-800">5,800 MT / hour</span>
                    </div>
                    <div className="bg-white p-3 border border-slate-200 text-center">
                      <span className="block text-[8px] text-slate-500 font-mono">PUMP DE-BALLASTING SPEED</span>
                      <span className="text-sm font-mono font-bold text-cyan-600">4,200 MT / hour</span>
                    </div>
                  </div>

                  {/* Discharge Pace Alarm Warning */}
                  <div className="bg-red-50 border border-red-200 p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-500 animate-bounce" />
                      <span className="text-[9.5px] font-mono text-red-800 font-bold uppercase">
                        LOAD DE-BALANCING ALARM: DE-BALLASTING IS LAGGING CARGO POUR RATE!
                      </span>
                    </div>
                    <button 
                      onClick={() => {
                        addLog("SIMOPS Pause", "Emergency pause command dispatched to dry cargo loader terminal.", "warning");
                      }}
                      className="bg-red-700 hover:bg-red-800 text-white text-[9px] font-mono font-bold uppercase py-1 px-2.5"
                    >
                      Pause Loader
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* B. TANKERS SPECIALIZED BALLAST CONSOLE (Segregated SBT MARPOL) */}
            {vesselConfigType === "Tanker" && (
              <div className="space-y-4">
                <div className="bg-emerald-50 border border-emerald-200 p-3 flex gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="text-[10px] font-sans text-emerald-800 leading-relaxed">
                    <strong>MARPOL Annex I Segregated Ballast compliance:</strong> All water ballast pipes and pumps are strictly locked out from connecting to petroleum lines. Symmetrical ballast water levels (Port and Starboard tanks matching) must be enforced during SIMOPS.
                  </div>
                </div>

                <div className="bg-slate-50 p-4 border border-slate-200 space-y-3 text-xs font-mono">
                  <h4 className="text-[10px] font-black uppercase text-slate-700 tracking-wider">SBT Segregated Ballast Alignment (MARPOL Annex I)</h4>
                  
                  <div className="flex justify-between items-center bg-emerald-100/50 p-2 border border-emerald-200 text-[10px]">
                    <span className="font-bold text-emerald-800">SEGREGATION INTERLOCK COUPLING:</span>
                    <span className="font-black text-emerald-700 uppercase">SECURELY LOCKED / Segregated</span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-bold">DB 1 PORT LEVEL:</span>
                      <span className="text-slate-800 font-bold">{ballastTanks.db1P}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-bold">DB 1 STBD LEVEL:</span>
                      <span className="text-slate-800 font-bold">{ballastTanks.db1S}%</span>
                    </div>
                    {Math.abs(ballastTanks.db1P - ballastTanks.db1S) > 10 ? (
                      <div className="bg-red-50 border border-red-200 p-2 text-[9px] text-red-800 font-bold">
                        ⚠️ WARNING: PORT-STARBOARD BALLAST ASYMMETRY EXCEEDS 10%. STRESS RE-ALIGNMENT REQUIRED.
                      </div>
                    ) : (
                      <div className="bg-emerald-50 border border-emerald-200 p-2 text-[9px] text-emerald-800 font-bold flex items-center gap-1">
                        <CheckCircle className="w-3 h-3 text-emerald-500" /> Port-Starboard Symmetrical Alignment OK.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* C. CONTAINER SHIPS SPECIALIZED BALLAST CONSOLE (Anti-Heeling) */}
            {vesselConfigType === "Container Ship" && (
              <div className="space-y-4">
                <div className="bg-cyan-50 border border-cyan-200 p-3 flex gap-2">
                  <Info className="w-4 h-4 text-cyan-600 shrink-0 mt-0.5" />
                  <div className="text-[10px] font-sans text-cyan-800 leading-relaxed">
                    <strong>Auto Anti-Heeling Controller:</strong> Triggers automated high-speed water shifting between port and starboard heeling tanks. Keeps ship list strictly at 0.0° during harbor gantry cranes container loading.
                  </div>
                </div>

                <div className="bg-slate-50 p-4 border border-slate-200 space-y-3 font-mono text-xs">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-black uppercase text-slate-700 tracking-wider">Heel Angle Monitor & Control</h4>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-slate-500">AUTO-STABILIZE:</span>
                      <button 
                        onClick={() => {
                          setAntiHeelingActive(!antiHeelingActive);
                          addLog("Anti-Heeling", `Anti-Heeling auto-controller toggled to ${!antiHeelingActive ? "ACTIVE" : "INACTIVE"}.`, "info");
                        }}
                        className={`text-[9.5px] uppercase font-bold px-2 py-0.5 border ${
                          antiHeelingActive ? "bg-emerald-600 text-white border-emerald-500" : "bg-slate-200 text-slate-600 border-slate-300"
                        }`}
                      >
                        {antiHeelingActive ? "On" : "Off"}
                      </button>
                    </div>
                  </div>

                  {/* Heel Dial Representation */}
                  <div className="bg-white border border-slate-200 p-4 flex flex-col items-center justify-center relative overflow-hidden">
                    <span className="text-[8px] text-slate-400 uppercase">Vessel Transverse Heel List</span>
                    
                    {/* Angle indicator */}
                    <div className="text-2xl font-black font-mono text-slate-800 my-2">
                      {containerHeelAngle > 0 ? `+${containerHeelAngle}° STBD` : `${containerHeelAngle}° PORT`}
                    </div>

                    <div className="w-full max-w-[200px] bg-slate-100 h-6 border border-slate-200 relative flex items-center justify-center">
                      <div className="h-full w-0.5 bg-slate-300 absolute left-1/2" />
                      <div 
                        className={`w-4 h-4 rounded-full border transition-all duration-300 ${
                          Math.abs(containerHeelAngle) > 1.0 
                            ? "bg-red-500 border-red-600 animate-ping" 
                            : "bg-cyan-500 border-cyan-600"
                        }`}
                        style={{ transform: `translateX(${containerHeelAngle * 15}px)` }}
                      />
                    </div>
                    
                    {/* Shifting speed info */}
                    <div className="flex justify-between w-full mt-2 text-[9px] text-slate-500">
                      <span>STBD HEELING TANK: {ballastTanks.heelingS}%</span>
                      <span>PORT HEELING TANK: {ballastTanks.heelingP}%</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* D. GENERAL CARGO SPECIALIZED BALLAST CONSOLE */}
            {vesselConfigType === "General Cargo Ship" && (
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 p-3 flex gap-2">
                  <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-[10px] font-sans text-amber-800 leading-relaxed">
                    <strong>Heavy Lift Compensation Panel:</strong> Manual valve controls of double-bottom (DB) ballast tanks allow the Chief Mate to compensate for heavy-lift off-center crane cargo loads (e.g. steel coils, machinery).
                  </div>
                </div>

                <div className="bg-slate-50 p-4 border border-slate-200 space-y-3 font-mono text-xs">
                  <h4 className="text-[10px] font-black uppercase text-slate-700 tracking-wider">Trim & Lift ballast water alignments</h4>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center bg-white p-2 border border-slate-200 text-[10px]">
                      <span className="text-slate-500">FORWARD DOUBLE-BOTTOM DB 1 COMPENSATOR:</span>
                      <div className="flex gap-1.5">
                        <button 
                          onClick={() => {
                            setBallastTanks(t => ({ ...t, db1P: Math.max(0, t.db1P - 5), db1S: Math.max(0, t.db1S - 5) }));
                            addLog("Heel Adjust", "De-ballasted DB 1 forward tanks by 5% to adjust trim.", "info");
                          }}
                          className="bg-slate-200 border border-slate-300 px-1 py-0.5 text-[9px]"
                        >
                          Discharge 5%
                        </button>
                        <button 
                          onClick={() => {
                            setBallastTanks(t => ({ ...t, db1P: Math.min(100, t.db1P + 5), db1S: Math.min(100, t.db1S + 5) }));
                            addLog("Heel Adjust", "Ballasted DB 1 forward tanks by 5% to adjust trim.", "success");
                          }}
                          className="bg-slate-200 border border-slate-300 px-1 py-0.5 text-[9px]"
                        >
                          Fill 5%
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-between items-center bg-white p-2 border border-slate-200 text-[10px]">
                      <span className="text-slate-500">AFT DOUBLE-BOTTOM DB 2 COMPENSATOR:</span>
                      <div className="flex gap-1.5">
                        <button 
                          onClick={() => {
                            setBallastTanks(t => ({ ...t, db2P: Math.max(0, t.db2P - 5), db2S: Math.max(0, t.db2S - 5) }));
                            addLog("Heel Adjust", "De-ballasted DB 2 aft tanks by 5% to adjust trim.", "info");
                          }}
                          className="bg-slate-200 border border-slate-300 px-1 py-0.5 text-[9px]"
                        >
                          Discharge 5%
                        </button>
                        <button 
                          onClick={() => {
                            setBallastTanks(t => ({ ...t, db2P: Math.min(100, t.db2P + 5), db2S: Math.min(100, t.db2S + 5) }));
                            addLog("Heel Adjust", "Ballasted DB 2 aft tanks by 5% to adjust trim.", "success");
                          }}
                          className="bg-slate-200 border border-slate-300 px-1 py-0.5 text-[9px]"
                        >
                          Fill 5%
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* E. LNG CARRIER SPECIALIZED BALLAST CONSOLE */}
            {vesselConfigType === "LNG Carrier Ship" && (
              <div className="space-y-4">
                <div className="bg-sky-50 border border-sky-200 p-3 flex gap-2">
                  <Thermometer className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
                  <div className="text-[10px] font-sans text-sky-800 leading-relaxed">
                    <strong>Cofferdam & Insulated Bulkhead Freezing Protection:</strong> Cryogenic LNG is stored at -162°C. Automated heating systems monitor ballast water adjacent to cargo tank bulkheads to keep it above freezing (Threshold safe level: &gt;5°C).
                  </div>
                </div>

                <div className="bg-slate-50 p-4 border border-slate-200 space-y-3 font-mono text-xs">
                  <h4 className="text-[10px] font-black uppercase text-slate-700 tracking-wider">Cofferdam Heating & Bulkhead Temperature Sensors</h4>
                  
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="bg-white p-2 border border-slate-200">
                      <span className="block text-[8px] text-slate-400">SENSOR A (DB 1 INNER COFFERDAM)</span>
                      <span className="text-xs font-bold text-slate-800">8.2 °C</span>
                      <span className="block text-[8px] font-black text-emerald-600 uppercase mt-1">SAFE ABOVE FREEZING</span>
                    </div>

                    <div className="bg-white p-2 border border-slate-200">
                      <span className="block text-[8px] text-slate-400">SENSOR B (DB 2 AFT COFFERDAM)</span>
                      <span className="text-xs font-bold text-slate-800">7.5 °C</span>
                      <span className="block text-[8px] font-black text-emerald-600 uppercase mt-1">SAFE ABOVE FREEZING</span>
                    </div>
                  </div>

                  <div className="bg-sky-100 border border-sky-200 p-2 text-[9.5px] text-sky-800 font-bold flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                    COFFERDAM GLYCOL-WATER HEATING CIRCULATION LOOP ACTIVE. NO FREEZING DETECTED.
                  </div>
                </div>
              </div>
            )}

            {/* General ballast stats & summary info */}
            <div className="bg-[#0A2540] text-white p-4 space-y-2">
              <span className="block text-[8px] font-mono text-slate-400 uppercase tracking-wider font-bold">Total Ballast Load Telemetry</span>
              <div className="grid grid-cols-3 gap-2 text-center font-mono">
                <div>
                  <span className="block text-[7px] text-slate-400">TOTAL WATER WEIGHT</span>
                  <span className="text-sm font-black text-emerald-400">
                    {(Object.keys(ballastTanks).reduce((acc, key) => acc + ballastTanks[key], 0) * 125).toLocaleString()} MT
                  </span>
                </div>
                <div>
                  <span className="block text-[7px] text-slate-400">ACTIVE PUMPS DISCHARGE</span>
                  <span className="text-sm font-black text-sky-400">
                    {(ballastPump1 ? 2500 : 0) + (ballastPump2 ? 2500 : 0)} CBM/hr
                  </span>
                </div>
                <div>
                  <span className="block text-[7px] text-slate-400">HULL TRIM / HEEL</span>
                  <span className="text-sm font-black text-amber-400">
                    {vesselConfigType === "Container Ship" ? `${containerHeelAngle}°` : "0.05° Neutral"}
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
