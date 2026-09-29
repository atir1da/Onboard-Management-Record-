import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Droplet, 
  ThermometerSnowflake, 
  Cookie, 
  Users, 
  Calendar, 
  AlertTriangle, 
  ShieldCheck, 
  Cpu, 
  Terminal, 
  RefreshCw,
  Coffee,
  Sliders,
  Compass,
  Trash2,
  Plus,
  Wrench,
  Pencil
} from "lucide-react";
import { ProvisionsInput, ProvisionsResponse } from "../types";

interface LiquidTankProps {
  title: string;
  icon: React.ReactNode;
  qty: number;
  capacity: number;
  dailyCons: number;
  unit: string;
  percent: number;
  days: number;
  margin: number;
  isCritical: boolean;
}

function LivingPercentageTank({
  title,
  icon,
  qty,
  capacity,
  dailyCons,
  unit,
  percent,
  days,
  margin,
  isCritical
}: LiquidTankProps) {
  // Determine color based on warning state
  const liquidColor = isCritical ? "#FF4500" : "#00A86B";
  const glowColor = isCritical ? "rgba(255, 69, 0, 0.4)" : "rgba(0, 168, 107, 0.4)";

  return (
    <div className="bg-white border border-slate-200 p-5 rounded-none shadow-md hover:shadow-lg transition-all flex flex-col justify-between h-full">
      <div>
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-slate-100 text-slate-700 rounded-sm">
              {icon}
            </div>
            <div>
              <h3 className="text-xs font-bold text-[#0A2540] tracking-wider uppercase font-sans">
                {title}
              </h3>
              <p className="text-[10px] text-slate-400 font-mono">
                Cons: {dailyCons} {unit}/day
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-lg font-bold font-mono text-[#0A2540]" style={{ color: liquidColor }}>
              {percent.toFixed(0)}%
            </span>
            <p className="text-[9px] text-slate-400 font-mono">
              {qty.toFixed(1)} / {capacity} {unit}
            </p>
          </div>
        </div>

        {/* Liquid Tank container */}
        <div className="relative w-full h-[120px] bg-slate-100 border border-slate-200 overflow-hidden my-3 rounded-md flex flex-col justify-end">
          {/* Animated Liquid level */}
          <div 
            className="absolute left-0 bottom-0 w-full transition-all duration-1000 ease-out-back" 
            style={{ 
              height: `${Math.min(100, Math.max(5, percent))}%`,
              backgroundColor: liquidColor,
              boxShadow: `inset 0 10px 20px rgba(255, 255, 255, 0.15), 0 0 15px ${glowColor}`
            }}
          >
            {/* Waves */}
            <div className="wave-effect" />
            <div className="wave-effect-second" />
          </div>

          {/* Depth/Volume lines on tank */}
          <div className="absolute inset-0 flex flex-col justify-between p-2 pointer-events-none text-[8px] font-mono text-[#0A2540]/30 select-none">
            <div className="border-b border-dashed border-[#0A2540]/10 pb-0.5 flex justify-between">
              <span>F [100%]</span>
              <span>- MAX</span>
            </div>
            <div className="border-b border-dashed border-[#0A2540]/10 pb-0.5 flex justify-between">
              <span>3/4 [75%]</span>
              <span>- HIGH</span>
            </div>
            <div className="border-b border-dashed border-[#0A2540]/10 pb-0.5 flex justify-between">
              <span>1/2 [50%]</span>
              <span>- HALF</span>
            </div>
            <div className="border-b border-dashed border-[#0A2540]/10 pb-0.5 flex justify-between">
              <span>1/4 [25%]</span>
              <span>- LOW</span>
            </div>
            <div className="flex justify-between text-red-500/70">
              <span>E [0%]</span>
              <span>- MIN</span>
            </div>
          </div>

          {/* Overlay readout */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-white/80 backdrop-blur-sm px-2 py-1 rounded border border-slate-200/50 text-center shadow-xs">
              <span className="text-[10px] font-bold font-mono text-[#0A2540] block leading-none">
                {days.toFixed(1)} DAYS
              </span>
              <span className="text-[8px] uppercase tracking-wider text-slate-500 font-sans block mt-0.5">
                Endurance
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-[10px] font-mono">
        <span className="text-slate-400">Voyage ETA Margin:</span>
        <span className={margin < 0 ? "text-[#FF4500] font-bold" : "text-[#00A86B] font-bold"}>
          {margin < 0 ? `DEFICIT: ${Math.abs(margin).toFixed(1)}d` : `+${margin.toFixed(1)}d SURPLUS`}
        </span>
      </div>
    </div>
  );
}

export default function ProvisionsAnalytics() {
  // Setup default state based on offline data
  const [inputs, setInputs] = useState<ProvisionsInput>(() => {
    let initialPob = 21;
    try {
      const saved = localStorage.getItem("sms_crewList");
      if (saved) {
        initialPob = JSON.parse(saved).length;
      }
    } catch (e) {}
    
    return {
      freshWaterQty: 40,
      freshWaterDailyCons: 4,
      freshWaterCapacity: 100,
      deepFreezeQty: 15,
      deepFreezeDailyCons: 1.5,
      deepFreezeCapacity: 50,
      dryProvisionsQty: 50,
      dryProvisionsDailyCons: 3,
      dryProvisionsCapacity: 150,
      pob: initialPob,
      etaDays: 12,
    };
  });

  // Sync POB to inputs on component mount/render
  useEffect(() => {
    try {
      const saved = localStorage.getItem("sms_crewList");
      if (saved) {
        const count = JSON.parse(saved).length;
        setInputs(prev => ({ ...prev, pob: count }));
      }
    } catch (e) {}
  }, []);

  const [loading, setLoading] = useState(false);
  const [showJson, setShowJson] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [auditResult, setAuditResult] = useState<ProvisionsResponse | null>({
    freshWater: {
      remainingPercent: 40.0,
      daysRemaining: 10.0,
      isCritical: true,
      criticalDate: "Out in 10.0 days (2.0 days BEFORE ETA)",
      safetyMarginDays: -2.0
    },
    deepFreeze: {
      remainingPercent: 30.0,
      daysRemaining: 10.0,
      isCritical: true,
      criticalDate: "Out in 10.0 days (2.0 days BEFORE ETA)",
      safetyMarginDays: -2.0
    },
    dryProvisions: {
      remainingPercent: 33.3,
      daysRemaining: 16.7,
      isCritical: false,
      criticalDate: "Safe (16.7 days remaining)",
      safetyMarginDays: 4.7
    },
    overallAssessment: "SMCP ASSESSMENT: WARNING! FRESH WATER AND DEEP FREEZE PROVISIONS ARE INSUFFICIENT FOR THE CURRENT TRANSIT duration. STRICT ECONOMY MEASURES TO BE DEPLOYED IMMEDIATELY.",
    smcpWarnings: [
      "WARNING! Fresh Water endurance is insufficient: 10 days remaining. Next port ETA is in 12 days.",
      "WARNING! Deep Freeze provisions endurance is insufficient: 10 days remaining. Next port ETA is in 12 days."
    ],
    smcpRecommendations: [
      "INSTRUCTION: Restrict daily fresh water consumption immediately. Fresh water for washing suspended.",
      "INSTRUCTION: Revise meal plans to preserve deep freeze stocks.",
      "INSTRUCTION: Prepare requisition of provisions for immediate delivery at next port of call."
    ]
  });

  // Local/real-time basic calculations
  const fwPercent = (inputs.freshWaterQty / inputs.freshWaterCapacity) * 100;
  const fwDays = inputs.freshWaterDailyCons > 0 ? inputs.freshWaterQty / inputs.freshWaterDailyCons : 0;
  const fwMargin = fwDays - inputs.etaDays;

  const dfPercent = (inputs.deepFreezeQty / inputs.deepFreezeCapacity) * 100;
  const dfDays = inputs.deepFreezeDailyCons > 0 ? inputs.deepFreezeQty / inputs.deepFreezeDailyCons : 0;
  const dfMargin = dfDays - inputs.etaDays;

  const dpPercent = (inputs.dryProvisionsQty / inputs.dryProvisionsCapacity) * 100;
  const dpDays = inputs.dryProvisionsDailyCons > 0 ? inputs.dryProvisionsQty / inputs.dryProvisionsDailyCons : 0;
  const dpMargin = dpDays - inputs.etaDays;

  const handleInputChange = (field: keyof ProvisionsInput, value: number) => {
    setInputs(prev => ({
      ...prev,
      [field]: Math.max(0, value),
    }));
  };

  const runAIAudit = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/provisions-analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inputs),
      });
      if (!response.ok) {
        throw new Error("Logistics audit failed. Accessing local fail-safe database.");
      }
      const data = await response.json();
      setAuditResult(data);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  // --- Catering Operations States & Helpers ---
  const [crewCount, setCrewCount] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("sms_crewList");
      if (saved) {
        return JSON.parse(saved).length;
      }
    } catch (e) {}
    return 28;
  });

  useEffect(() => {
    const handleCrewSync = () => {
      try {
        const saved = localStorage.getItem("sms_crewList");
        if (saved) {
          setCrewCount(JSON.parse(saved).length);
        }
      } catch (e) {
        console.error("Failed to sync crew count", e);
      }
    };
    window.addEventListener("sms_crewList_changed", handleCrewSync);
    window.addEventListener("storage", handleCrewSync);
    return () => {
      window.removeEventListener("sms_crewList_changed", handleCrewSync);
      window.removeEventListener("storage", handleCrewSync);
    };
  }, []);

  const [voyageLength, setVoyageLength] = useState<number>(30); // days
  const [cateringSubTab, setCateringSubTab] = useState<"provisions" | "equipment" | "marpol">("provisions");

  // Provision stock state (itemized with quantities in KG or Liters) with LocalStorage persistence
  const [provisions, setProvisions] = useState(() => {
    const saved = localStorage.getItem("sms_provisions_itemized");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error loading itemized provisions from localStorage", e);
      }
    }
    return {
      fresh: [
        { name: "Potatoes & Root Vegetables", qty: 450, dailyCons: 8, capacity: 600, unit: "kg" },
        { name: "Onions & Garlic", qty: 120, dailyCons: 2.2, capacity: 200, unit: "kg" },
        { name: "Fresh Fruits & Salads", qty: 95, dailyCons: 4.5, capacity: 150, unit: "kg" },
        { name: "Fresh Dairy (Milk, Cheese)", qty: 85, dailyCons: 3.8, capacity: 120, unit: "liters" }
      ],
      frozen: [
        { name: "Beef & Pork Cuts", qty: 380, dailyCons: 7.2, capacity: 500, unit: "kg" },
        { name: "Poultry (Chicken, Turkey)", qty: 290, dailyCons: 5.5, capacity: 400, unit: "kg" },
        { name: "Seafood (Fish, Prawns)", qty: 180, dailyCons: 3.5, capacity: 300, unit: "kg" },
        { name: "Frozen Vegetables & Starches", qty: 210, dailyCons: 4.0, capacity: 300, unit: "kg" }
      ],
      dry: [
        { name: "Rice (Long-Grain, Jasmine)", qty: 850, dailyCons: 12.0, capacity: 1200, unit: "kg" },
        { name: "Baking Flour (Daily Bread)", qty: 520, dailyCons: 8.5, capacity: 800, unit: "kg" },
        { name: "Pasta & Noodles", qty: 280, dailyCons: 4.2, capacity: 400, unit: "kg" },
        { name: "Canned Soups & Legumes", qty: 450, dailyCons: 6.0, capacity: 600, unit: "units" },
        { name: "Cooking Oils & Fats", qty: 180, dailyCons: 2.5, capacity: 250, unit: "liters" },
        { name: "Spices, Condiments & Sugar", qty: 160, dailyCons: 1.8, capacity: 200, unit: "kg" }
      ]
    };
  });

  useEffect(() => {
    localStorage.setItem("sms_provisions_itemized", JSON.stringify(provisions));
  }, [provisions]);

  // Marine Grade Galley Equipment state
  const [equipmentList, setEquipmentList] = useState<any[]>([
    {
      name: "Electric Range with Storm Rails",
      status: "Operational",
      nextService: "2026-08-15",
      stormRailsEngaged: true,
      notes: "Heating elements checked by ETO. Rolling bars fully lubricated."
    },
    {
      name: "Deep Fat Fryer with Auto Damper",
      status: "Operational",
      nextService: "2026-07-28",
      stormRailsEngaged: false,
      notes: "Wet-chemical fire suppressors armed. Safety high-temp limit switch active."
    },
    {
      name: "High-Temp Sanitizing Dishwasher",
      status: "Warning",
      nextService: "2026-07-16",
      stormRailsEngaged: true,
      notes: "Slight boiler calcium scaling. Heating element reaches 82°C sanitizing mark but takes longer."
    }
  ]);

  // MARPOL waste tracker state
  const [marpolLogs, setMarpolLogs] = useState<any[]>([
    {
      id: "LOG-01",
      date: "2026-07-09",
      weight: 12.5,
      comminuted: true,
      distanceToLand: 14,
      seaDischargeApproved: true,
      loggedBy: "Chief Cook"
    },
    {
      id: "LOG-02",
      date: "2026-07-10",
      weight: 18.0,
      comminuted: true,
      distanceToLand: 8,
      seaDischargeApproved: true,
      loggedBy: "Messman"
    },
    {
      id: "LOG-03",
      date: "2026-07-11",
      weight: 9.2,
      comminuted: false,
      distanceToLand: 2.5,
      seaDischargeApproved: false,
      loggedBy: "Chief Cook"
    }
  ]);

  // New MARPOL form fields
  const [newWasteWeight, setNewWasteWeight] = useState("");
  const [newWasteComminuted, setNewWasteComminuted] = useState(true);
  const [newWasteDistance, setNewWasteDistance] = useState("");

  // States for adding provisions
  const [isAddingProvision, setIsAddingProvision] = useState(false);
  const [newProvisionName, setNewProvisionName] = useState("");
  const [newProvisionCategory, setNewProvisionCategory] = useState<"fresh" | "frozen" | "dry">("fresh");
  const [newProvisionQty, setNewProvisionQty] = useState("");
  const [newProvisionDailyCons, setNewProvisionDailyCons] = useState("");
  const [newProvisionCapacity, setNewProvisionCapacity] = useState("");
  const [newProvisionUnit, setNewProvisionUnit] = useState("kg");

  // States for adding equipment
  const [isAddingEquipment, setIsAddingEquipment] = useState(false);
  const [newEquipName, setNewEquipName] = useState("");
  const [newEquipStatus, setNewEquipStatus] = useState("Operational");
  const [newEquipNextService, setNewEquipNextService] = useState("");
  const [newEquipNotes, setNewEquipNotes] = useState("");
  const [newEquipStormRails, setNewEquipStormRails] = useState(false);

  // States for deletion modals
  const [provisionToDelete, setProvisionToDelete] = useState<{ category: "fresh" | "frozen" | "dry"; idx: number; name: string } | null>(null);
  const [equipmentToDelete, setEquipmentToDelete] = useState<{ idx: number; name: string } | null>(null);

  // Auto-sync, Category limits & inline editing states
  const [autoSyncStores, setAutoSyncStores] = useState(true);
  const [categoryMaxLimits, setCategoryMaxLimits] = useState<{fresh: number; frozen: number; dry: number}>(() => {
    const saved = localStorage.getItem("sms_provisions_category_limits");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {
      fresh: 1070,
      frozen: 1500,
      dry: 3450
    };
  });

  useEffect(() => {
    localStorage.setItem("sms_provisions_category_limits", JSON.stringify(categoryMaxLimits));
  }, [categoryMaxLimits]);

  const [editingItem, setEditingItem] = useState<{
    category: "fresh" | "frozen" | "dry";
    idx: number;
    name: string;
    qty: number;
    dailyCons: number;
    capacity: number;
    unit: string;
  } | null>(null);

  // Helper to sum provisions by category
  const getCategorySum = (category: "fresh" | "frozen" | "dry") => {
    const list = provisions[category] || [];
    return list.reduce(
      (acc, item) => {
        acc.qty += item.qty;
        acc.dailyCons += item.dailyCons;
        acc.capacity += item.capacity;
        return acc;
      },
      { qty: 0, dailyCons: 0, capacity: 0 }
    );
  };

  const freshSum = getCategorySum("fresh");
  const frozenSum = getCategorySum("frozen");
  const drySum = getCategorySum("dry");

  // Auto-sync calculated values from itemized stores to the Logistics Control Panel
  useEffect(() => {
    if (autoSyncStores) {
      setInputs(prev => {
        const targetFrozenQty = parseFloat(frozenSum.qty.toFixed(1));
        const targetFrozenDaily = parseFloat(frozenSum.dailyCons.toFixed(1));
        const targetDryQty = parseFloat(drySum.qty.toFixed(1));
        const targetDryDaily = parseFloat(drySum.dailyCons.toFixed(1));

        if (
          prev.deepFreezeQty === targetFrozenQty &&
          prev.deepFreezeDailyCons === targetFrozenDaily &&
          prev.deepFreezeCapacity === categoryMaxLimits.frozen &&
          prev.dryProvisionsQty === targetDryQty &&
          prev.dryProvisionsDailyCons === targetDryDaily &&
          prev.dryProvisionsCapacity === categoryMaxLimits.dry
        ) {
          return prev;
        }
        return {
          ...prev,
          deepFreezeQty: targetFrozenQty,
          deepFreezeDailyCons: targetFrozenDaily,
          deepFreezeCapacity: categoryMaxLimits.frozen,
          dryProvisionsQty: targetDryQty,
          dryProvisionsDailyCons: targetDryDaily,
          dryProvisionsCapacity: categoryMaxLimits.dry,
        };
      });
    }
  }, [provisions, autoSyncStores, categoryMaxLimits, frozenSum.qty, frozenSum.dailyCons, drySum.qty, drySum.dailyCons]);

  // Sync crew size if changed
  useEffect(() => {
    try {
      const saved = localStorage.getItem("sms_crewList");
      if (saved) {
        setCrewCount(JSON.parse(saved).length);
      }
    } catch (e) {}
  }, []);

  // Add MARPOL log entry
  const addMarpolLog = (e: React.FormEvent) => {
    e.preventDefault();
    const weight = parseFloat(newWasteWeight);
    const dist = parseFloat(newWasteDistance);
    if (isNaN(weight) || isNaN(dist)) return;

    const approved = newWasteComminuted ? dist >= 3 : dist >= 12;

    const newLog = {
      id: `LOG-0${marpolLogs.length + 1}`,
      date: new Date().toISOString().split("T")[0],
      weight,
      comminuted: newWasteComminuted,
      distanceToLand: dist,
      seaDischargeApproved: approved,
      loggedBy: "Chief Cook"
    };

    setMarpolLogs([newLog, ...marpolLogs]);
    setNewWasteWeight("");
    setNewWasteDistance("");
  };

  // Toggle Galley Equipment Storm Rails
  const toggleStormRails = (idx: number) => {
    const updated = [...equipmentList];
    updated[idx].stormRailsEngaged = !updated[idx].stormRailsEngaged;
    setEquipmentList(updated);
  };

  // Provisioning Calculations
  const getStockAlert = (qty: number, dailyCons: number, name: string, capacity?: number) => {
    const scaleFactor = crewCount / 28;
    const dynamicDailyCons = dailyCons * scaleFactor;
    const daysRemaining = Math.floor(qty / dynamicDailyCons);
    const isCritical = daysRemaining < voyageLength;
    const itemCapacity = capacity || (dailyCons * 1.5 * 30);
    const percentCapacity = Math.min(100, Math.round((qty / itemCapacity) * 100));

    return {
      daysRemaining,
      isCritical,
      percentCapacity,
      dynamicDailyCons: dynamicDailyCons.toFixed(1)
    };
  };

  // Add custom provision
  const handleAddProvision = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProvisionName.trim() || !newProvisionQty || !newProvisionDailyCons) return;
    
    const qty = parseFloat(newProvisionQty);
    const dailyCons = parseFloat(newProvisionDailyCons);
    const capacityVal = parseFloat(newProvisionCapacity) || qty * 1.3;
    if (isNaN(qty) || isNaN(dailyCons)) return;

    const newItem = {
      name: newProvisionName.trim(),
      qty,
      dailyCons,
      capacity: capacityVal,
      unit: newProvisionUnit
    };

    setProvisions(prev => ({
      ...prev,
      [newProvisionCategory]: [...prev[newProvisionCategory], newItem]
    }));

    // Reset form
    setNewProvisionName("");
    setNewProvisionQty("");
    setNewProvisionDailyCons("");
    setNewProvisionCapacity("");
    setIsAddingProvision(false);
  };

  // Delete provision confirmation
  const handleConfirmDeleteProvision = () => {
    if (!provisionToDelete) return;
    const { category, idx } = provisionToDelete;
    setProvisions(prev => ({
      ...prev,
      [category]: prev[category].filter((_, i) => i !== idx)
    }));
    setProvisionToDelete(null);
  };

  // Add custom equipment
  const handleAddEquipment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEquipName.trim()) return;

    const newItem = {
      name: newEquipName.trim(),
      status: newEquipStatus,
      nextService: newEquipNextService || new Date().toISOString().split("T")[0],
      stormRailsEngaged: newEquipStormRails,
      notes: newEquipNotes.trim() || "No additional notes recorded."
    };

    setEquipmentList(prev => [...prev, newItem]);

    // Reset form
    setNewEquipName("");
    setNewEquipStatus("Operational");
    setNewEquipNextService("");
    setNewEquipNotes("");
    setNewEquipStormRails(false);
    setIsAddingEquipment(false);
  };

  // Delete equipment confirmation
  const handleConfirmDeleteEquipment = () => {
    if (!equipmentToDelete) return;
    const { idx } = equipmentToDelete;
    setEquipmentList(prev => prev.filter((_, i) => i !== idx));
    setEquipmentToDelete(null);
  };

  return (
    <div className="space-y-8 flex flex-col">
      <div id="provisions-analytics-module" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Input controls (Left side: 4 cols) */}
      <div className="lg:col-span-4 bg-white border border-slate-200 p-5 shadow-md flex flex-col justify-between rounded-none">
        <div>
          <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
            <Cpu className="text-[#0A2540] w-5 h-5" />
            <h2 className="text-sm font-bold tracking-widest text-[#0A2540] uppercase font-sans">
              Logistics Control Panel
            </h2>
          </div>

          <p className="text-xs text-slate-500 mb-3 leading-relaxed font-sans">
            Enter current offline shipboard inventory levels and consumption parameters. Adjust variables to simulate emergency scenarios.
          </p>

          {/* Dynamic Link Sync Controller */}
          <div className="bg-emerald-50/50 border border-emerald-200 p-3 mb-4 rounded-none flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2">
              <RefreshCw className={`w-3.5 h-3.5 text-[#00A86B] ${autoSyncStores ? "animate-spin" : ""}`} />
              <div>
                <h4 className="text-[10px] font-extrabold uppercase text-[#0A2540] tracking-wider leading-none">
                  Stores Auto-Sync
                </h4>
                <p className="text-[8px] font-mono text-slate-500 mt-1">
                  {autoSyncStores ? "Linked to Catering Stores" : "Manual Override Mode"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAutoSyncStores(!autoSyncStores)}
              className={`px-2.5 py-1 text-[9px] font-mono font-black uppercase rounded-none border cursor-pointer transition-all ${
                autoSyncStores 
                  ? "bg-[#00A86B] text-white border-[#00A86B] hover:bg-emerald-700" 
                  : "bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200"
              }`}
            >
              {autoSyncStores ? "CONNECTED 🔒" : "MANUAL 🔓"}
            </button>
          </div>

          <div className="space-y-5">
            {/* Voyage Details */}
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 border border-slate-200">
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-slate-500 font-mono mb-1 flex items-center gap-1">
                  <Users className="w-3 h-3 text-[#0A2540]" /> Crew Count (POB)
                </label>
                <input
                  type="number"
                  value={inputs.pob}
                  onChange={(e) => handleInputChange("pob", parseInt(e.target.value) || 0)}
                  className="w-full bg-white border border-slate-200 p-2 text-[#0A2540] font-mono text-sm focus:outline-none focus:border-[#0A2540]"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-slate-500 font-mono mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-[#0A2540]" /> Next Port ETA (Days)
                </label>
                <input
                  type="number"
                  value={inputs.etaDays}
                  onChange={(e) => handleInputChange("etaDays", parseInt(e.target.value) || 0)}
                  className="w-full bg-white border border-slate-200 p-2 text-[#0A2540] font-mono text-sm focus:outline-none focus:border-[#0A2540]"
                />
              </div>
            </div>

            {/* Fresh Water inputs */}
            <div className="space-y-2 p-3 bg-slate-50/50 border border-slate-200">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-[#0A2540] flex items-center gap-1.5 font-sans uppercase tracking-wider">
                  <Droplet className="w-4 h-4 text-sky-500" /> Fresh Water
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  Capacity: {inputs.freshWaterCapacity} MT
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] text-slate-400 block font-mono">Current stock (MT)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={inputs.freshWaterQty}
                    onChange={(e) => handleInputChange("freshWaterQty", parseFloat(e.target.value) || 0)}
                    className="w-full bg-white border border-slate-200 p-1.5 text-[#0A2540] font-mono text-xs focus:outline-none focus:border-[#0A2540]"
                  />
                </div>
                <div>
                  <label className="text-[9px] text-slate-400 block font-mono">Daily Cons (MT)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={inputs.freshWaterDailyCons}
                    onChange={(e) => handleInputChange("freshWaterDailyCons", parseFloat(e.target.value) || 0)}
                    className="w-full bg-white border border-slate-200 p-1.5 text-[#0A2540] font-mono text-xs focus:outline-none focus:border-[#0A2540]"
                  />
                </div>
              </div>
            </div>

            {/* Deep Freeze Provisions */}
            <div className="space-y-2 p-3 bg-slate-50/50 border border-slate-200">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-[#0A2540] flex items-center gap-1.5 font-sans uppercase tracking-wider">
                  <ThermometerSnowflake className="w-4 h-4 text-blue-400" /> Deep Freeze {autoSyncStores && <span className="text-[#00A86B] text-[9px] font-mono">🔒</span>}
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  Capacity: {inputs.deepFreezeCapacity} Kg
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] text-slate-400 block font-mono">Current stock (Kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={inputs.deepFreezeQty}
                    onChange={(e) => handleInputChange("deepFreezeQty", parseFloat(e.target.value) || 0)}
                    disabled={autoSyncStores}
                    className={`w-full border p-1.5 text-[#0A2540] font-mono text-xs focus:outline-none focus:border-[#0A2540] transition-colors ${
                      autoSyncStores ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed" : "bg-white border-slate-200"
                    }`}
                  />
                </div>
                <div>
                  <label className="text-[9px] text-slate-400 block font-mono">Daily Cons (Kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={inputs.deepFreezeDailyCons}
                    onChange={(e) => handleInputChange("deepFreezeDailyCons", parseFloat(e.target.value) || 0)}
                    disabled={autoSyncStores}
                    className={`w-full border p-1.5 text-[#0A2540] font-mono text-xs focus:outline-none focus:border-[#0A2540] transition-colors ${
                      autoSyncStores ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed" : "bg-white border-slate-200"
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Dry Provisions */}
            <div className="space-y-2 p-3 bg-slate-50/50 border border-slate-200">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-[#0A2540] flex items-center gap-1.5 font-sans uppercase tracking-wider">
                  <Cookie className="w-4 h-4 text-amber-600" /> Dry Provisions {autoSyncStores && <span className="text-[#00A86B] text-[9px] font-mono">🔒</span>}
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  Capacity: {inputs.dryProvisionsCapacity} Kg
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] text-slate-400 block font-mono">Current stock (Kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={inputs.dryProvisionsQty}
                    onChange={(e) => handleInputChange("dryProvisionsQty", parseFloat(e.target.value) || 0)}
                    disabled={autoSyncStores}
                    className={`w-full border p-1.5 text-[#0A2540] font-mono text-xs focus:outline-none focus:border-[#0A2540] transition-colors ${
                      autoSyncStores ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed" : "bg-white border-slate-200"
                    }`}
                  />
                </div>
                <div>
                  <label className="text-[9px] text-slate-400 block font-mono">Daily Cons (Kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={inputs.dryProvisionsDailyCons}
                    onChange={(e) => handleInputChange("dryProvisionsDailyCons", parseFloat(e.target.value) || 0)}
                    disabled={autoSyncStores}
                    className={`w-full border p-1.5 text-[#0A2540] font-mono text-xs focus:outline-none focus:border-[#0A2540] transition-colors ${
                      autoSyncStores ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed" : "bg-white border-slate-200"
                    }`}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={runAIAudit}
          disabled={loading}
          className="mt-6 w-full py-2.5 bg-[#0A2540] border border-[#0A2540] text-white hover:bg-[#1a3f64] text-xs font-bold uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-98 shadow-md rounded-none"
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-white" />
              Auditing Vessel Logistics...
            </>
          ) : (
            <>
              <Cpu className="w-4 h-4 text-white" />
              Perform ShipBoard-AI Audit
            </>
          )}
        </button>
      </div>

      {/* Analytics Display (Right side: 8 cols) */}
      <div className="lg:col-span-8 flex flex-col gap-5">
        {/* Living Percentage Tanks (The dynamic wave visualizers) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <LivingPercentageTank
            title="Fresh Water"
            icon={<Droplet className="w-4 h-4 text-sky-500" />}
            qty={inputs.freshWaterQty}
            capacity={inputs.freshWaterCapacity}
            dailyCons={inputs.freshWaterDailyCons}
            unit="MT"
            percent={fwPercent}
            days={fwDays}
            margin={fwMargin}
            isCritical={fwMargin < 0}
          />
          <LivingPercentageTank
            title="Deep Freeze"
            icon={<ThermometerSnowflake className="w-4 h-4 text-blue-400" />}
            qty={inputs.deepFreezeQty}
            capacity={inputs.deepFreezeCapacity}
            dailyCons={inputs.deepFreezeDailyCons}
            unit="Kg"
            percent={dfPercent}
            days={dfDays}
            margin={dfMargin}
            isCritical={dfMargin < 0}
          />
          <LivingPercentageTank
            title="Dry Provisions"
            icon={<Cookie className="w-4 h-4 text-amber-600" />}
            qty={inputs.dryProvisionsQty}
            capacity={inputs.dryProvisionsCapacity}
            dailyCons={inputs.dryProvisionsDailyCons}
            unit="Kg"
            percent={dpPercent}
            days={dpDays}
            margin={dpMargin}
            isCritical={dpMargin < 0}
          />
        </div>

        {/* AI Audit Output Screen */}
        <div className="bg-white border border-slate-200 p-5 shadow-md flex-1 flex flex-col justify-between min-h-[350px] rounded-none">
          <div>
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Terminal className="text-[#0A2540] w-4 h-4" />
                <h3 className="text-xs uppercase tracking-widest text-[#0A2540] font-sans font-bold">
                  ShipBoard-AI Recommendations
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-mono text-slate-400 cursor-pointer uppercase" htmlFor="json-toggle">
                  RAW JSON MODE
                </label>
                <button
                  id="json-toggle"
                  onClick={() => setShowJson(!showJson)}
                  className={`w-8 h-4 rounded-full p-0.5 transition-colors duration-200 focus:outline-none cursor-pointer ${showJson ? "bg-[#0A2540]" : "bg-slate-200"}`}
                >
                  <div className={`bg-white w-3 h-3 rounded-full shadow-md transform transition-transform duration-200 ${showJson ? "translate-x-4" : "translate-x-0"}`} />
                </button>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-16 text-center space-y-4"
                >
                  {/* Radar Scanning animation (Rotating Line sweep) */}
                  <div className="relative w-20 h-20 border-2 border-[#0A2540]/20 rounded-full flex items-center justify-center bg-slate-50 overflow-hidden">
                    {/* Concentric grid lines */}
                    <div className="absolute inset-2 border border-dashed border-[#0A2540]/10 rounded-full" />
                    <div className="absolute inset-6 border border-dashed border-[#0A2540]/10 rounded-full" />
                    {/* The sweeping radar line */}
                    <div className="absolute top-0 left-0 w-1/2 h-1/2 border-r border-[#00A86B] radar-line bg-gradient-to-tr from-transparent to-[#00A86B]/20" />
                    <div className="w-3 h-3 bg-[#00A86B] rounded-full shadow-[0_0_8px_rgba(0,168,107,0.8)] z-10" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-mono text-[#0A2540] uppercase tracking-widest animate-pulse">
                      Analyzing inventory data against SMCP rules...
                    </p>
                    <p className="text-[10px] font-mono text-slate-400">
                      Scanning stock endurance, computing STCW and SOLAS parameters
                    </p>
                  </div>
                </motion.div>
              ) : showJson ? (
                <motion.div
                  key="json"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="bg-slate-900 p-3 rounded-none border border-slate-800 max-h-[300px] overflow-y-auto font-mono text-[9px] text-emerald-400 leading-tight"
                >
                  <pre>{JSON.stringify(auditResult || { info: "Run audit to generate data" }, null, 2)}</pre>
                </motion.div>
              ) : auditResult ? (
                <motion.div
                  key="results"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4 text-sm"
                >
                  {/* Overall Assessment Banner */}
                  <div className={`p-4 border flex items-start gap-3 rounded-sm ${
                    auditResult.freshWater.isCritical || auditResult.deepFreeze.isCritical
                      ? "bg-red-50 border-red-200 text-[#FF4500]"
                      : "bg-[#00A86B]/5 border-[#00A86B]/20 text-[#00A86B]"
                  }`}>
                    {auditResult.freshWater.isCritical || auditResult.deepFreeze.isCritical ? (
                      <AlertTriangle className="w-5 h-5 text-[#FF4500] shrink-0 mt-0.5" />
                    ) : (
                      <ShieldCheck className="w-5 h-5 text-[#00A86B] shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider font-mono">
                        Vessel Assessment Status
                      </p>
                      <p className="text-xs mt-1 leading-relaxed font-sans font-medium text-slate-800">
                        {auditResult.overallAssessment}
                      </p>
                    </div>
                  </div>

                  {/* SMCP Compliance Warnings & recommendations */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Warnings (Red list) */}
                    <div className="bg-slate-50 p-3.5 border border-slate-200">
                      <h4 className="text-[10px] font-mono uppercase tracking-widest text-[#FF4500] mb-2 font-bold flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" /> SMCP LOGGED WARNINGS
                      </h4>
                      {auditResult.smcpWarnings.length === 0 ? (
                        <p className="text-xs text-slate-400 font-mono italic">No regulatory warnings logged.</p>
                      ) : (
                        <ul className="space-y-2">
                          {auditResult.smcpWarnings.map((warning, idx) => (
                            <li key={idx} className="text-xs text-red-700 leading-relaxed font-mono pl-3 border-l-2 border-[#FF4500] flex items-start gap-1">
                              <span>{warning}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {/* Recommendations (Green list) */}
                    <div className="bg-slate-50 p-3.5 border border-slate-200">
                      <h4 className="text-[10px] font-mono uppercase tracking-widest text-[#0A2540] mb-2 font-bold flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-[#00A86B]" /> COMMAND RECOMMENDATIONS
                      </h4>
                      {auditResult.smcpRecommendations.length === 0 ? (
                        <p className="text-xs text-slate-400 font-mono italic">No administrative recommendations.</p>
                      ) : (
                        <ul className="space-y-2">
                          {auditResult.smcpRecommendations.map((rec, idx) => (
                            <li key={idx} className="text-xs text-slate-700 leading-relaxed font-sans pl-3 border-l-2 border-[#00A86B]">
                              {rec}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </motion.div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400">
                  <Cpu className="w-10 h-10 mb-2 text-slate-300" />
                  <p className="text-xs font-mono text-[#0A2540]">NO LOGISTICS AUDIT DATA LOADED</p>
                  <p className="text-[10px] text-slate-500 max-w-xs mt-1">
                    Press the ShipBoard-AI Audit button to calculate regulatory compliance values.
                  </p>
                </div>
              )}
            </AnimatePresence>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-[10px] font-mono text-slate-400">
            <span>REGULATION: STCW Chapter VIII & SOLAS Chapter III compliant logs</span>
            <span>SYSTEM STATE: OFFLINE-READY CACHE</span>
          </div>
        </div>
      </div>
    </div>

      {/* Catering Operations Module */}
      <div className="bg-white border border-slate-200 shadow-md p-6 space-y-6">
        <div className="border-b border-slate-200 pb-4">
          <h3 className="text-base font-extrabold text-[#0A2540] uppercase tracking-wide flex items-center gap-2">
            <Coffee className="text-[#00A86B] w-5 h-5" />
            CATERING OPERATIONS
          </h3>

          {/* Sub-tabs */}
          <div className="flex flex-wrap gap-2 mt-4 border-b border-slate-100 pb-2.5">
            <button
              onClick={() => setCateringSubTab("provisions")}
              className={`px-3 py-1 text-xs font-bold uppercase cursor-pointer border ${
                cateringSubTab === "provisions"
                  ? "bg-[#00A86B] text-white border-[#00A86B]"
                  : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
              }`}
            >
              Provision Inventory & Stock Alerts
            </button>
            <button
              onClick={() => setCateringSubTab("equipment")}
              className={`px-3 py-1 text-xs font-bold uppercase cursor-pointer border ${
                cateringSubTab === "equipment"
                  ? "bg-[#00A86B] text-white border-[#00A86B]"
                  : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
              }`}
            >
              Galley Equipment Logs
            </button>
            <button
              onClick={() => setCateringSubTab("marpol")}
              className={`px-3 py-1 text-xs font-bold uppercase cursor-pointer border ${
                cateringSubTab === "marpol"
                  ? "bg-[#00A86B] text-white border-[#00A86B]"
                  : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
              }`}
            >
              MARPOL Garbage Tracker
            </button>
          </div>
        </div>

        {/* A. Sub-tab Provisions with Stock Alert */}
        {cateringSubTab === "provisions" && (
          <div className="space-y-6">
            {/* Voyage Configuration Sliders & Add Button */}
            <div className="bg-slate-50 border border-slate-200 p-4 grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                  <span className="flex items-center gap-1.5 uppercase">
                    <Sliders className="w-4 h-4 text-[#00A86B]" /> Crew size factor
                  </span>
                  <span className="font-mono text-[#00A86B]">{crewCount} Men</span>
                </div>
                <input
                  type="range"
                  min="27"
                  max="30"
                  value={crewCount}
                  onChange={(e) => setCrewCount(parseInt(e.target.value))}
                  className="w-full accent-[#00A86B] cursor-pointer"
                />
                <span className="text-[10px] text-slate-400 font-mono block">Standard vessel scale: 27 to 30 crew members.</span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                  <span className="flex items-center gap-1.5 uppercase">
                    <Compass className="w-4 h-4 text-[#00A86B]" /> Planned Voyage Duration
                  </span>
                  <span className="font-mono text-[#00A86B]">{voyageLength} Days</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="180"
                  value={voyageLength}
                  onChange={(e) => setVoyageLength(parseInt(e.target.value))}
                  className="w-full accent-[#00A86B] cursor-pointer"
                />
                <span className="text-[10px] text-slate-400 font-mono block">Ration planning capability up to 6 months (180 days).</span>
              </div>

              <div>
                <button
                  onClick={() => setIsAddingProvision(!isAddingProvision)}
                  className="w-full py-2 bg-[#00A86B] hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider cursor-pointer transition-all shadow-sm rounded-none flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  {isAddingProvision ? "Hide Add Form" : "Add Provision Item"}
                </button>
              </div>
            </div>

            {/* Add Provision Form Panel */}
            {isAddingProvision && (
              <form onSubmit={handleAddProvision} className="bg-slate-50 border border-slate-200 p-4 rounded-none grid grid-cols-1 sm:grid-cols-3 md:grid-cols-6 gap-4 items-end">
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-mono text-slate-500">Item Name</label>
                  <input
                    type="text"
                    required
                    value={newProvisionName}
                    onChange={(e) => setNewProvisionName(e.target.value)}
                    placeholder="e.g., Eggs (Fresh)"
                    className="w-full bg-white border border-slate-200 p-2 text-slate-800 font-sans text-xs focus:outline-none focus:border-[#00A86B] rounded-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-mono text-slate-500">Category</label>
                  <select
                    value={newProvisionCategory}
                    onChange={(e) => setNewProvisionCategory(e.target.value as any)}
                    className="w-full bg-white border border-slate-200 p-2 text-slate-800 font-sans text-xs focus:outline-none focus:border-[#00A86B] rounded-none"
                  >
                    <option value="fresh">Fresh Stores</option>
                    <option value="frozen">Frozen Stores</option>
                    <option value="dry">Dry Stores</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-mono text-slate-500">Qty (Stock)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={newProvisionQty}
                    onChange={(e) => setNewProvisionQty(e.target.value)}
                    placeholder="e.g., 200"
                    className="w-full bg-white border border-slate-200 p-2 text-slate-800 font-sans text-xs focus:outline-none focus:border-[#00A86B] rounded-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-mono text-slate-500">Max Stock (Capacity)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newProvisionCapacity}
                    onChange={(e) => setNewProvisionCapacity(e.target.value)}
                    placeholder="e.g., 250 (Optional)"
                    className="w-full bg-white border border-slate-200 p-2 text-slate-800 font-sans text-xs focus:outline-none focus:border-[#00A86B] rounded-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-mono text-slate-500">Daily Consumption</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={newProvisionDailyCons}
                    onChange={(e) => setNewProvisionDailyCons(e.target.value)}
                    placeholder="e.g., 4.5"
                    className="w-full bg-white border border-slate-200 p-2 text-slate-800 font-sans text-xs focus:outline-none focus:border-[#00A86B] rounded-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-mono text-slate-500">Unit</label>
                  <select
                    value={newProvisionUnit}
                    onChange={(e) => setNewProvisionUnit(e.target.value)}
                    className="w-full bg-white border border-slate-200 p-2 text-slate-800 font-sans text-xs focus:outline-none focus:border-[#00A86B] rounded-none"
                  >
                    <option value="kg">kg</option>
                    <option value="liters">liters</option>
                    <option value="units">units</option>
                  </select>
                </div>

                <div className="sm:col-span-3 md:col-span-6 flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingProvision(false)}
                    className="px-4 py-2 bg-slate-200 text-slate-600 text-xs font-bold uppercase tracking-wider hover:bg-slate-300 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#00A86B] text-white text-xs font-bold uppercase tracking-wider hover:bg-emerald-700 cursor-pointer"
                  >
                    Confirm Add Item
                  </button>
                </div>
              </form>
            )}

            {/* Catering Category Sum & Limit Setting Dashboard */}
            <div className="bg-white border border-slate-200 p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
                <Sliders className="text-[#0A2540] w-4 h-4" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#0A2540] font-sans">
                  Store Category Overviews & Configured Limits
                </h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Fresh Stores Summary Card */}
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-none space-y-3 relative">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-black text-slate-700 uppercase tracking-wide">1. Fresh Stores</span>
                    <span className="text-[9px] font-mono bg-sky-50 text-sky-600 border border-sky-100 px-1 rounded uppercase font-bold">Perishable</span>
                  </div>
                  
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between font-mono text-slate-500">
                      <span>Counted Stock:</span>
                      <span className="text-[#0A2540] font-bold">{freshSum.qty.toFixed(1)} kg/L</span>
                    </div>
                    <div className="flex justify-between font-mono text-slate-500">
                      <span>Counted Daily Cons:</span>
                      <span className="text-[#0A2540] font-bold">{freshSum.dailyCons.toFixed(1)} kg/L/day</span>
                    </div>
                    <div className="flex justify-between font-mono text-[#00A86B] font-bold bg-emerald-50/40 p-1 border border-dashed border-emerald-100">
                      <span>Counted Max Stock:</span>
                      <span>{freshSum.capacity.toFixed(1)} kg/L</span>
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-slate-200 space-y-1">
                    <label className="block text-[9px] font-mono uppercase text-slate-400">Authorized Max Stock (kg)</label>
                    <div className="flex gap-1.5">
                      <input
                        type="number"
                        value={categoryMaxLimits.fresh}
                        onChange={(e) => {
                          const val = Math.max(0, parseFloat(e.target.value) || 0);
                          setCategoryMaxLimits(prev => ({ ...prev, fresh: val }));
                        }}
                        className="w-full bg-white border border-slate-200 px-2 py-1 text-slate-800 font-mono text-xs focus:outline-none focus:border-[#00A86B]"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setCategoryMaxLimits(prev => ({ ...prev, fresh: parseFloat(freshSum.capacity.toFixed(1)) }));
                        }}
                        className="px-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-mono text-[9px] uppercase font-bold"
                        title="Use Counted Sum"
                      >
                        Use Sum
                      </button>
                    </div>
                  </div>
                </div>

                {/* Frozen Stores Summary Card */}
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-none space-y-3 relative">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-black text-slate-700 uppercase tracking-wide">2. Frozen Stores</span>
                    <span className="text-[9px] font-mono bg-blue-50 text-blue-600 border border-blue-100 px-1 rounded uppercase font-bold">Deep Freeze</span>
                  </div>
                  
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between font-mono text-slate-500">
                      <span>Counted Stock:</span>
                      <span className="text-[#0A2540] font-bold">{frozenSum.qty.toFixed(1)} kg</span>
                    </div>
                    <div className="flex justify-between font-mono text-slate-500">
                      <span>Counted Daily Cons:</span>
                      <span className="text-[#0A2540] font-bold">{frozenSum.dailyCons.toFixed(1)} kg/day</span>
                    </div>
                    <div className="flex justify-between font-mono text-[#00A86B] font-bold bg-emerald-50/40 p-1 border border-dashed border-emerald-100">
                      <span>Counted Max Stock:</span>
                      <span>{frozenSum.capacity.toFixed(1)} kg</span>
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-slate-200 space-y-1">
                    <label className="block text-[9px] font-mono uppercase text-slate-400">Authorized Max Stock (kg)</label>
                    <div className="flex gap-1.5">
                      <input
                        type="number"
                        value={categoryMaxLimits.frozen}
                        onChange={(e) => {
                          const val = Math.max(0, parseFloat(e.target.value) || 0);
                          setCategoryMaxLimits(prev => ({ ...prev, frozen: val }));
                        }}
                        className="w-full bg-white border border-slate-200 px-2 py-1 text-slate-800 font-mono text-xs focus:outline-none focus:border-[#00A86B]"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setCategoryMaxLimits(prev => ({ ...prev, frozen: parseFloat(frozenSum.capacity.toFixed(1)) }));
                        }}
                        className="px-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-mono text-[9px] uppercase font-bold"
                        title="Use Counted Sum"
                      >
                        Use Sum
                      </button>
                    </div>
                  </div>
                  {autoSyncStores && (
                    <div className="text-[8px] font-mono text-[#00A86B] flex items-center gap-1 mt-1 justify-end">
                      <span>Linked & Synced to Logistics 🔒</span>
                    </div>
                  )}
                </div>

                {/* Dry Stores Summary Card */}
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-none space-y-3 relative">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-black text-slate-700 uppercase tracking-wide">3. Dry Stores</span>
                    <span className="text-[9px] font-mono bg-amber-50 text-amber-600 border border-amber-100 px-1 rounded uppercase font-bold">Ambient Store</span>
                  </div>
                  
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between font-mono text-slate-500">
                      <span>Counted Stock:</span>
                      <span className="text-[#0A2540] font-bold">{drySum.qty.toFixed(1)} kg</span>
                    </div>
                    <div className="flex justify-between font-mono text-slate-500">
                      <span>Counted Daily Cons:</span>
                      <span className="text-[#0A2540] font-bold">{drySum.dailyCons.toFixed(1)} kg/day</span>
                    </div>
                    <div className="flex justify-between font-mono text-[#00A86B] font-bold bg-emerald-50/40 p-1 border border-dashed border-emerald-100">
                      <span>Counted Max Stock:</span>
                      <span>{drySum.capacity.toFixed(1)} kg</span>
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-slate-200 space-y-1">
                    <label className="block text-[9px] font-mono uppercase text-slate-400">Authorized Max Stock (kg)</label>
                    <div className="flex gap-1.5">
                      <input
                        type="number"
                        value={categoryMaxLimits.dry}
                        onChange={(e) => {
                          const val = Math.max(0, parseFloat(e.target.value) || 0);
                          setCategoryMaxLimits(prev => ({ ...prev, dry: val }));
                        }}
                        className="w-full bg-white border border-slate-200 px-2 py-1 text-slate-800 font-mono text-xs focus:outline-none focus:border-[#00A86B]"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setCategoryMaxLimits(prev => ({ ...prev, dry: parseFloat(drySum.capacity.toFixed(1)) }));
                        }}
                        className="px-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-mono text-[9px] uppercase font-bold"
                        title="Use Counted Sum"
                      >
                        Use Sum
                      </button>
                    </div>
                  </div>
                  {autoSyncStores && (
                    <div className="text-[8px] font-mono text-[#00A86B] flex items-center gap-1 mt-1 justify-end">
                      <span>Linked & Synced to Logistics 🔒</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Stock listings by stores category */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Fresh / Perishable */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-[#0A2540] uppercase tracking-wider border-b border-slate-100 pb-2 flex justify-between items-center">
                  <span>1. Fresh & Perishable</span>
                  <span className="text-[10px] font-mono text-slate-400">Stores</span>
                </h4>
                <div className="space-y-3">
                  {provisions.fresh.map((item, idx) => {
                    const alert = getStockAlert(item.qty, item.dailyCons, item.name, item.capacity);
                    if (editingItem && editingItem.category === "fresh" && editingItem.idx === idx) {
                      return (
                        <form 
                          key={`${item.name}-edit`}
                          onSubmit={(e) => {
                            e.preventDefault();
                            const updated = { ...provisions };
                            updated.fresh[idx] = {
                              name: editingItem.name,
                              qty: Number(editingItem.qty),
                              dailyCons: Number(editingItem.dailyCons),
                              capacity: Number(editingItem.capacity),
                              unit: editingItem.unit
                            };
                            setProvisions(updated);
                            setEditingItem(null);
                          }}
                          className="p-3 bg-slate-100 border border-[#00A86B] rounded-none text-xs space-y-2"
                        >
                          <div className="flex justify-between items-center border-b border-slate-200 pb-1">
                            <span className="font-bold text-[#0A2540] uppercase text-[9px]">Edit Provision Item</span>
                            <span className="font-mono text-[9px] text-slate-400">Fresh Stores</span>
                          </div>
                          <div>
                            <label className="block text-[8px] font-mono uppercase text-slate-500">Item Name</label>
                            <input
                              type="text"
                              value={editingItem.name}
                              onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                              className="w-full bg-white border border-slate-200 px-1.5 py-1 text-slate-800 text-xs focus:outline-none focus:border-[#00A86B]"
                              required
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-1.5">
                            <div>
                              <label className="block text-[8px] font-mono uppercase text-slate-500">Stock Qty</label>
                              <input
                                type="number"
                                step="0.1"
                                value={editingItem.qty}
                                onChange={(e) => setEditingItem({ ...editingItem, qty: parseFloat(e.target.value) || 0 })}
                                className="w-full bg-white border border-slate-200 px-1.5 py-1 text-slate-800 font-mono text-xs focus:outline-none focus:border-[#00A86B]"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-[8px] font-mono uppercase text-slate-500">Max Stock (Cap)</label>
                              <input
                                type="number"
                                step="0.1"
                                value={editingItem.capacity}
                                onChange={(e) => setEditingItem({ ...editingItem, capacity: parseFloat(e.target.value) || 0 })}
                                className="w-full bg-white border border-slate-200 px-1.5 py-1 text-slate-800 font-mono text-xs focus:outline-none focus:border-[#00A86B]"
                                required
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-1.5">
                            <div>
                              <label className="block text-[8px] font-mono uppercase text-slate-500">Daily Cons</label>
                              <input
                                type="number"
                                step="0.1"
                                value={editingItem.dailyCons}
                                onChange={(e) => setEditingItem({ ...editingItem, dailyCons: parseFloat(e.target.value) || 0 })}
                                className="w-full bg-white border border-slate-200 px-1.5 py-1 text-slate-800 font-mono text-xs focus:outline-none focus:border-[#00A86B]"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-[8px] font-mono uppercase text-slate-500">Unit</label>
                              <select
                                value={editingItem.unit}
                                onChange={(e) => setEditingItem({ ...editingItem, unit: e.target.value })}
                                className="w-full bg-white border border-slate-200 px-1 py-1 text-slate-800 text-xs focus:outline-none focus:border-[#00A86B]"
                              >
                                <option value="kg">kg</option>
                                <option value="liters">liters</option>
                                <option value="units">units</option>
                              </select>
                            </div>
                          </div>
                          <div className="flex justify-end gap-1.5 pt-1">
                            <button
                              type="button"
                              onClick={() => setEditingItem(null)}
                              className="px-2 py-1 bg-slate-200 text-slate-600 text-[10px] font-bold uppercase hover:bg-slate-300"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              className="px-2 py-1 bg-[#00A86B] text-white text-[10px] font-bold uppercase hover:bg-emerald-700"
                            >
                              Save
                            </button>
                          </div>
                        </form>
                      );
                    }
                    return (
                      <div key={item.name} className="p-3 bg-slate-50 border border-slate-200 rounded-none text-xs relative group/item">
                        <div className="flex justify-between items-start font-sans font-bold text-slate-700">
                          <span>{item.name}</span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[10px] text-slate-400">{item.qty} {item.unit}</span>
                            <button
                              type="button"
                              onClick={() => setEditingItem({
                                category: "fresh",
                                idx,
                                name: item.name,
                                qty: item.qty,
                                dailyCons: item.dailyCons,
                                capacity: item.capacity || item.qty * 1.3,
                                unit: item.unit
                              })}
                              className="text-slate-400 hover:text-[#00A86B] transition-colors cursor-pointer p-0.5"
                              title="Edit Item"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setProvisionToDelete({ category: "fresh", idx, name: item.name })}
                              className="text-slate-400 hover:text-red-600 transition-colors cursor-pointer p-0.5"
                              title="Delete Item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 mt-1">
                          <span>Daily cons: {alert.dynamicDailyCons} {item.unit}</span>
                          <span className={alert.isCritical ? "text-[#FF4500] font-bold" : "text-[#00A86B] font-bold"}>
                            Stock: {alert.daysRemaining} days remaining
                          </span>
                        </div>
                        <div className="text-[9px] font-mono text-slate-400 mt-0.5">
                          Capacity (Max): {item.capacity ? `${item.capacity.toFixed(1)} ${item.unit}` : "Not Set"}
                        </div>
                        {/* progress bar */}
                        <div className="w-full bg-slate-200 h-1.5 mt-2 overflow-hidden rounded-none">
                          <div 
                            className={`h-full transition-all duration-300 ${alert.isCritical ? "bg-[#FF4500]" : "bg-[#00A86B]"}`}
                            style={{ width: `${alert.percentCapacity}%` }}
                          />
                        </div>
                        {alert.isCritical && (
                          <div className="mt-2 text-[9px] font-mono font-bold text-[#FF4500] bg-red-50 border border-red-200 p-1.5 uppercase leading-snug">
                            ⚠️ Stock level critical for a {voyageLength}-day voyage! Refueling required.
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Frozen Stores */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-[#0A2540] uppercase tracking-wider border-b border-slate-100 pb-2 flex justify-between items-center">
                  <span>2. Frozen Stores</span>
                  <span className="text-[10px] font-mono text-slate-400">-18°C Deep Freeze</span>
                </h4>
                <div className="space-y-3">
                  {provisions.frozen.map((item, idx) => {
                    const alert = getStockAlert(item.qty, item.dailyCons, item.name, item.capacity);
                    if (editingItem && editingItem.category === "frozen" && editingItem.idx === idx) {
                      return (
                        <form 
                          key={`${item.name}-edit`}
                          onSubmit={(e) => {
                            e.preventDefault();
                            const updated = { ...provisions };
                            updated.frozen[idx] = {
                              name: editingItem.name,
                              qty: Number(editingItem.qty),
                              dailyCons: Number(editingItem.dailyCons),
                              capacity: Number(editingItem.capacity),
                              unit: editingItem.unit
                            };
                            setProvisions(updated);
                            setEditingItem(null);
                          }}
                          className="p-3 bg-slate-100 border border-[#00A86B] rounded-none text-xs space-y-2"
                        >
                          <div className="flex justify-between items-center border-b border-slate-200 pb-1">
                            <span className="font-bold text-[#0A2540] uppercase text-[9px]">Edit Provision Item</span>
                            <span className="font-mono text-[9px] text-slate-400">Frozen Stores</span>
                          </div>
                          <div>
                            <label className="block text-[8px] font-mono uppercase text-slate-500">Item Name</label>
                            <input
                              type="text"
                              value={editingItem.name}
                              onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                              className="w-full bg-white border border-slate-200 px-1.5 py-1 text-slate-800 text-xs focus:outline-none focus:border-[#00A86B]"
                              required
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-1.5">
                            <div>
                              <label className="block text-[8px] font-mono uppercase text-slate-500">Stock Qty</label>
                              <input
                                type="number"
                                step="0.1"
                                value={editingItem.qty}
                                onChange={(e) => setEditingItem({ ...editingItem, qty: parseFloat(e.target.value) || 0 })}
                                className="w-full bg-white border border-slate-200 px-1.5 py-1 text-slate-800 font-mono text-xs focus:outline-none focus:border-[#00A86B]"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-[8px] font-mono uppercase text-slate-500">Max Stock (Cap)</label>
                              <input
                                type="number"
                                step="0.1"
                                value={editingItem.capacity}
                                onChange={(e) => setEditingItem({ ...editingItem, capacity: parseFloat(e.target.value) || 0 })}
                                className="w-full bg-white border border-slate-200 px-1.5 py-1 text-slate-800 font-mono text-xs focus:outline-none focus:border-[#00A86B]"
                                required
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-1.5">
                            <div>
                              <label className="block text-[8px] font-mono uppercase text-slate-500">Daily Cons</label>
                              <input
                                type="number"
                                step="0.1"
                                value={editingItem.dailyCons}
                                onChange={(e) => setEditingItem({ ...editingItem, dailyCons: parseFloat(e.target.value) || 0 })}
                                className="w-full bg-white border border-slate-200 px-1.5 py-1 text-slate-800 font-mono text-xs focus:outline-none focus:border-[#00A86B]"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-[8px] font-mono uppercase text-slate-500">Unit</label>
                              <select
                                value={editingItem.unit}
                                onChange={(e) => setEditingItem({ ...editingItem, unit: e.target.value })}
                                className="w-full bg-white border border-slate-200 px-1 py-1 text-slate-800 text-xs focus:outline-none focus:border-[#00A86B]"
                              >
                                <option value="kg">kg</option>
                                <option value="liters">liters</option>
                                <option value="units">units</option>
                              </select>
                            </div>
                          </div>
                          <div className="flex justify-end gap-1.5 pt-1">
                            <button
                              type="button"
                              onClick={() => setEditingItem(null)}
                              className="px-2 py-1 bg-slate-200 text-slate-600 text-[10px] font-bold uppercase hover:bg-slate-300"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              className="px-2 py-1 bg-[#00A86B] text-white text-[10px] font-bold uppercase hover:bg-emerald-700"
                            >
                              Save
                            </button>
                          </div>
                        </form>
                      );
                    }
                    return (
                      <div key={item.name} className="p-3 bg-slate-50 border border-slate-200 rounded-none text-xs relative group/item">
                        <div className="flex justify-between items-start font-sans font-bold text-slate-700">
                          <span>{item.name}</span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[10px] text-slate-400">{item.qty} {item.unit}</span>
                            <button
                              type="button"
                              onClick={() => setEditingItem({
                                category: "frozen",
                                idx,
                                name: item.name,
                                qty: item.qty,
                                dailyCons: item.dailyCons,
                                capacity: item.capacity || item.qty * 1.3,
                                unit: item.unit
                              })}
                              className="text-slate-400 hover:text-[#00A86B] transition-colors cursor-pointer p-0.5"
                              title="Edit Item"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setProvisionToDelete({ category: "frozen", idx, name: item.name })}
                              className="text-slate-400 hover:text-red-600 transition-colors cursor-pointer p-0.5"
                              title="Delete Item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 mt-1">
                          <span>Daily cons: {alert.dynamicDailyCons} {item.unit}</span>
                          <span className={alert.isCritical ? "text-[#FF4500] font-bold" : "text-[#00A86B] font-bold"}>
                            Stock: {alert.daysRemaining} days remaining
                          </span>
                        </div>
                        <div className="text-[9px] font-mono text-slate-400 mt-0.5">
                          Capacity (Max): {item.capacity ? `${item.capacity.toFixed(1)} ${item.unit}` : "Not Set"}
                        </div>
                        {/* progress bar */}
                        <div className="w-full bg-slate-200 h-1.5 mt-2 overflow-hidden rounded-none">
                          <div 
                            className={`h-full transition-all duration-300 ${alert.isCritical ? "bg-[#FF4500]" : "bg-[#00A86B]"}`}
                            style={{ width: `${alert.percentCapacity}%` }}
                          />
                        </div>
                        {alert.isCritical && (
                          <div className="mt-2 text-[9px] font-mono font-bold text-[#FF4500] bg-red-50 border border-red-200 p-1.5 uppercase leading-snug">
                            ⚠️ Stock level critical for a {voyageLength}-day voyage! Refueling required.
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Dry Stores */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-[#0A2540] uppercase tracking-wider border-b border-slate-100 pb-2 flex justify-between items-center">
                  <span>3. Dry Stores Inventory</span>
                  <span className="text-[10px] font-mono text-slate-400">Ambient Store</span>
                </h4>
                <div className="space-y-3">
                  {provisions.dry.map((item, idx) => {
                    const alert = getStockAlert(item.qty, item.dailyCons, item.name, item.capacity);
                    if (editingItem && editingItem.category === "dry" && editingItem.idx === idx) {
                      return (
                        <form 
                          key={`${item.name}-edit`}
                          onSubmit={(e) => {
                            e.preventDefault();
                            const updated = { ...provisions };
                            updated.dry[idx] = {
                              name: editingItem.name,
                              qty: Number(editingItem.qty),
                              dailyCons: Number(editingItem.dailyCons),
                              capacity: Number(editingItem.capacity),
                              unit: editingItem.unit
                            };
                            setProvisions(updated);
                            setEditingItem(null);
                          }}
                          className="p-3 bg-slate-100 border border-[#00A86B] rounded-none text-xs space-y-2"
                        >
                          <div className="flex justify-between items-center border-b border-slate-200 pb-1">
                            <span className="font-bold text-[#0A2540] uppercase text-[9px]">Edit Provision Item</span>
                            <span className="font-mono text-[9px] text-slate-400">Dry Stores</span>
                          </div>
                          <div>
                            <label className="block text-[8px] font-mono uppercase text-slate-500">Item Name</label>
                            <input
                              type="text"
                              value={editingItem.name}
                              onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                              className="w-full bg-white border border-slate-200 px-1.5 py-1 text-slate-800 text-xs focus:outline-none focus:border-[#00A86B]"
                              required
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-1.5">
                            <div>
                              <label className="block text-[8px] font-mono uppercase text-slate-500">Stock Qty</label>
                              <input
                                type="number"
                                step="0.1"
                                value={editingItem.qty}
                                onChange={(e) => setEditingItem({ ...editingItem, qty: parseFloat(e.target.value) || 0 })}
                                className="w-full bg-white border border-slate-200 px-1.5 py-1 text-slate-800 font-mono text-xs focus:outline-none focus:border-[#00A86B]"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-[8px] font-mono uppercase text-slate-500">Max Stock (Cap)</label>
                              <input
                                type="number"
                                step="0.1"
                                value={editingItem.capacity}
                                onChange={(e) => setEditingItem({ ...editingItem, capacity: parseFloat(e.target.value) || 0 })}
                                className="w-full bg-white border border-slate-200 px-1.5 py-1 text-slate-800 font-mono text-xs focus:outline-none focus:border-[#00A86B]"
                                required
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-1.5">
                            <div>
                              <label className="block text-[8px] font-mono uppercase text-slate-500">Daily Cons</label>
                              <input
                                type="number"
                                step="0.1"
                                value={editingItem.dailyCons}
                                onChange={(e) => setEditingItem({ ...editingItem, dailyCons: parseFloat(e.target.value) || 0 })}
                                className="w-full bg-white border border-slate-200 px-1.5 py-1 text-slate-800 font-mono text-xs focus:outline-none focus:border-[#00A86B]"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-[8px] font-mono uppercase text-slate-500">Unit</label>
                              <select
                                value={editingItem.unit}
                                onChange={(e) => setEditingItem({ ...editingItem, unit: e.target.value })}
                                className="w-full bg-white border border-slate-200 px-1 py-1 text-slate-800 text-xs focus:outline-none focus:border-[#00A86B]"
                              >
                                <option value="kg">kg</option>
                                <option value="liters">liters</option>
                                <option value="units">units</option>
                              </select>
                            </div>
                          </div>
                          <div className="flex justify-end gap-1.5 pt-1">
                            <button
                              type="button"
                              onClick={() => setEditingItem(null)}
                              className="px-2 py-1 bg-slate-200 text-slate-600 text-[10px] font-bold uppercase hover:bg-slate-300"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              className="px-2 py-1 bg-[#00A86B] text-white text-[10px] font-bold uppercase hover:bg-emerald-700"
                            >
                              Save
                            </button>
                          </div>
                        </form>
                      );
                    }
                    return (
                      <div key={item.name} className="p-3 bg-slate-50 border border-slate-200 rounded-none text-xs relative group/item">
                        <div className="flex justify-between items-start font-sans font-bold text-slate-700">
                          <span>{item.name}</span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[10px] text-slate-400">{item.qty} {item.unit}</span>
                            <button
                              type="button"
                              onClick={() => setEditingItem({
                                category: "dry",
                                idx,
                                name: item.name,
                                qty: item.qty,
                                dailyCons: item.dailyCons,
                                capacity: item.capacity || item.qty * 1.3,
                                unit: item.unit
                              })}
                              className="text-slate-400 hover:text-[#00A86B] transition-colors cursor-pointer p-0.5"
                              title="Edit Item"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setProvisionToDelete({ category: "dry", idx, name: item.name })}
                              className="text-slate-400 hover:text-red-600 transition-colors cursor-pointer p-0.5"
                              title="Delete Item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 mt-1">
                          <span>Daily cons: {alert.dynamicDailyCons} {item.unit}</span>
                          <span className={alert.isCritical ? "text-[#FF4500] font-bold" : "text-[#00A86B] font-bold"}>
                            Stock: {alert.daysRemaining} days remaining
                          </span>
                        </div>
                        <div className="text-[9px] font-mono text-slate-400 mt-0.5">
                          Capacity (Max): {item.capacity ? `${item.capacity.toFixed(1)} ${item.unit}` : "Not Set"}
                        </div>
                        {/* progress bar */}
                        <div className="w-full bg-slate-200 h-1.5 mt-2 overflow-hidden rounded-none">
                          <div 
                            className={`h-full transition-all duration-300 ${alert.isCritical ? "bg-[#FF4500]" : "bg-[#00A86B]"}`}
                            style={{ width: `${alert.percentCapacity}%` }}
                          />
                        </div>
                        {alert.isCritical && (
                          <div className="mt-2 text-[9px] font-mono font-bold text-[#FF4500] bg-red-50 border border-red-200 p-1.5 uppercase leading-snug">
                            ⚠️ Stock level critical for a {voyageLength}-day voyage! Refueling required.
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* B. Sub-tab Galley Equipment Maintenance */}
        {cateringSubTab === "equipment" && (
          <div className="space-y-4">
            {/* Top Bar with Add Equipment button */}
            <div className="flex justify-end">
              <button
                onClick={() => setIsAddingEquipment(!isAddingEquipment)}
                className="py-2 px-4 bg-[#00A86B] hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider cursor-pointer transition-all shadow-sm rounded-none flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                {isAddingEquipment ? "Hide Add Form" : "Add Equipment Log"}
              </button>
            </div>

            {/* Add Equipment Form Panel */}
            {isAddingEquipment && (
              <form onSubmit={handleAddEquipment} className="bg-slate-50 border border-slate-200 p-4 rounded-none space-y-4">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-2">
                  Log New Galley Hardware / Machinery
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase font-mono text-slate-500">Hardware Name</label>
                    <input
                      type="text"
                      required
                      value={newEquipName}
                      onChange={(e) => setNewEquipName(e.target.value)}
                      placeholder="e.g., High-Capacity Dough Mixer"
                      className="w-full bg-white border border-slate-200 p-2 text-slate-800 font-sans text-xs focus:outline-none focus:border-[#00A86B] rounded-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase font-mono text-slate-500">Status</label>
                    <select
                      value={newEquipStatus}
                      onChange={(e) => setNewEquipStatus(e.target.value)}
                      className="w-full bg-white border border-slate-200 p-2 text-slate-800 font-sans text-xs focus:outline-none focus:border-[#00A86B] rounded-none"
                    >
                      <option value="Operational">Operational</option>
                      <option value="Warning">Warning</option>
                      <option value="Maintenance Due">Maintenance Due</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase font-mono text-slate-500">Next Service Date</label>
                    <input
                      type="date"
                      value={newEquipNextService}
                      onChange={(e) => setNewEquipNextService(e.target.value)}
                      className="w-full bg-white border border-slate-200 p-2 text-slate-800 font-sans text-xs focus:outline-none focus:border-[#00A86B] rounded-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                  <div className="md:col-span-3 space-y-1">
                    <label className="block text-[10px] uppercase font-mono text-slate-500">Technical Notes / Service details</label>
                    <input
                      type="text"
                      value={newEquipNotes}
                      onChange={(e) => setNewEquipNotes(e.target.value)}
                      placeholder="e.g., Bearings checked, seals verified water-tight"
                      className="w-full bg-white border border-slate-200 p-2 text-slate-800 font-sans text-xs focus:outline-none focus:border-[#00A86B] rounded-none"
                    />
                  </div>

                  <div className="flex items-center gap-2 bg-white border border-slate-200 p-2 h-[38px] md:mt-5">
                    <input
                      type="checkbox"
                      id="storm-rails-add"
                      checked={newEquipStormRails}
                      onChange={(e) => setNewEquipStormRails(e.target.checked)}
                      className="accent-[#00A86B] cursor-pointer"
                    />
                    <label htmlFor="storm-rails-add" className="text-xs text-slate-600 font-sans cursor-pointer select-none">
                      Storm Rails Engaged
                    </label>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingEquipment(false)}
                    className="px-4 py-2 bg-slate-200 text-slate-600 text-xs font-bold uppercase tracking-wider hover:bg-slate-300 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#00A86B] text-white text-xs font-bold uppercase tracking-wider hover:bg-emerald-700 cursor-pointer"
                  >
                    Confirm Add Equipment
                  </button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {equipmentList.map((eq, idx) => (
                <div key={eq.name} className="bg-slate-50 border border-slate-200 p-4 rounded-none flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide leading-tight">
                        {eq.name}
                      </h4>
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase ${
                          eq.status === "Operational"
                            ? "bg-emerald-50 text-[#00A86B] border-emerald-200"
                            : eq.status === "Warning"
                              ? "bg-amber-50 text-amber-500 border-amber-200"
                              : "bg-red-50 text-[#FF4500] border-red-200"
                        }`}>
                          {eq.status}
                        </span>
                        <button
                          type="button"
                          onClick={() => setEquipmentToDelete({ idx, name: eq.name })}
                          className="text-slate-400 hover:text-[#FF4500] transition-colors p-0.5 cursor-pointer"
                          title="Delete Equipment"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 font-sans leading-relaxed text-justify">
                      {eq.notes}
                    </p>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-200/60 space-y-3">
                    <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
                      <span>Next service date:</span>
                      <span className="text-slate-600 font-bold">{eq.nextService}</span>
                    </div>

                    {/* Toggle storm rails */}
                    <div className="flex justify-between items-center bg-white px-2.5 py-1.5 border border-slate-200 text-xs text-slate-700">
                      <span className="font-sans text-[11px] leading-none">Galley Storm Rails:</span>
                      <button
                        type="button"
                        onClick={() => toggleStormRails(idx)}
                        className={`px-2 py-0.5 text-[9px] font-mono font-bold rounded cursor-pointer border ${
                          eq.stormRailsEngaged
                            ? "bg-[#00A86B]/10 text-[#00A86B] border-[#00A86B]/30"
                            : "bg-slate-100 text-slate-500 border-slate-300"
                        }`}
                      >
                        {eq.stormRailsEngaged ? "ENGAGED" : "RELEASED"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 bg-blue-50 text-[#0A2540] border border-blue-200 text-xs leading-normal font-sans text-justify">
              <strong>Marine Grade Safety standard note:</strong> Ovens and ranges are equipped with heavy-duty storm rails to prevent sliding cookpots during rough seas. Deep fat fryers integrate automated wet chemical lines activated in the event of cooking oil fires.
            </div>
          </div>
        )}

        {/* C. Sub-tab MARPOL Garbage Tracker */}
        {cateringSubTab === "marpol" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Log entry Form (Left: 4 cols) */}
            <form onSubmit={addMarpolLog} className="lg:col-span-4 bg-slate-50 border border-slate-200 p-4 space-y-4 rounded-none h-fit">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-2">
                New Food Waste Log Entry
              </h4>

              <div className="space-y-1">
                <label className="block text-[10px] uppercase tracking-wider text-slate-500 font-mono">
                  Food waste weight (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={newWasteWeight}
                  onChange={(e) => setNewWasteWeight(e.target.value)}
                  placeholder="e.g., 14.5"
                  className="w-full bg-white border border-slate-200 p-2 text-slate-800 font-sans text-xs focus:outline-none focus:border-[#00A86B] rounded-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] uppercase tracking-wider text-slate-500 font-mono">
                  Comminution Status
                </label>
                <select
                  value={newWasteComminuted ? "true" : "false"}
                  onChange={(e) => setNewWasteComminuted(e.target.value === "true")}
                  className="w-full bg-white border border-slate-200 p-2 text-slate-800 font-sans text-xs focus:outline-none focus:border-[#00A86B] rounded-none"
                >
                  <option value="true">Comminuted (Ground to &lt; 25mm)</option>
                  <option value="false">Non-Comminuted (Raw)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] uppercase tracking-wider text-slate-500 font-mono">
                  Vessel Position (Distance to Land in NM)
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={newWasteDistance}
                  onChange={(e) => setNewWasteDistance(e.target.value)}
                  placeholder="e.g., 15"
                  className="w-full bg-white border border-slate-200 p-2 text-slate-800 font-sans text-xs focus:outline-none focus:border-[#00A86B] rounded-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-[#00A86B] hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider cursor-pointer active:scale-95 transition-all shadow-sm rounded-none"
              >
                Record MARPOL Log
              </button>
            </form>

            {/* Log entries lists (Right: 8 cols) */}
            <div className="lg:col-span-8 space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
                MARPOL Annex V Food Waste Disposal Logs
              </h4>
              <div className="bg-slate-50 border border-slate-200 overflow-x-auto rounded-none">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 font-mono text-[9px] uppercase border-b border-slate-200">
                      <th className="p-3">LOG ID</th>
                      <th className="p-3">DATE</th>
                      <th className="p-3 text-right">WEIGHT</th>
                      <th className="p-3 text-center">GRINDING (&lt;25mm)</th>
                      <th className="p-3 text-right">DIST TO LAND</th>
                      <th className="p-3 text-center">SEA DISCHARGE</th>
                      <th className="p-3">LOGGED BY</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/60">
                    {marpolLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-white transition-colors">
                        <td className="p-3 font-mono font-bold text-slate-700">{log.id}</td>
                        <td className="p-3 text-slate-500 font-mono">{log.date}</td>
                        <td className="p-3 text-right font-semibold text-[#0A2540]">{log.weight.toFixed(1)} kg</td>
                        <td className="p-3 text-center">
                          {log.comminuted ? (
                            <span className="text-[#00A86B] font-bold">YES</span>
                          ) : (
                            <span className="text-amber-500 font-bold">NO</span>
                          )}
                        </td>
                        <td className="p-3 text-right font-mono text-slate-600">{log.distanceToLand.toFixed(1)} NM</td>
                        <td className="p-3 text-center">
                          {log.seaDischargeApproved ? (
                            <span className="px-2 py-0.5 bg-emerald-50 text-[#00A86B] border border-emerald-200 font-mono text-[9px] font-bold uppercase rounded">
                              APPROVED
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-red-50 text-[#FF4500] border border-red-200 font-mono text-[9px] font-bold uppercase rounded">
                              PROHIBITED
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-slate-600 italic font-sans">{log.loggedBy}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-3.5 bg-amber-50 text-amber-800 border border-amber-200 text-xs leading-relaxed font-sans text-justify">
                <strong>MARPOL Annex V Regulatory Rule Reminder:</strong> Food waste discharge is strictly prohibited in sea areas unless comminuted (reduced to &lt;25mm size) and the ship is at least 3 NM from nearest land. If raw/non-comminuted, the ship must be at least 12 NM from nearest land.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Provision Item Deletion Modal */}
      {provisionToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-[#FF4500] p-6 max-w-sm w-full shadow-2xl rounded-none">
            <div className="flex items-center gap-3 text-[#FF4500] mb-4">
              <AlertTriangle className="w-6 h-6" />
              <h4 className="text-sm font-bold uppercase tracking-wider font-sans">
                Confirm Stock Deletion
              </h4>
            </div>
            <p className="text-xs text-slate-600 font-sans leading-relaxed text-justify mb-6">
              Are you sure you want to permanently delete <strong className="text-slate-800">{provisionToDelete.name}</strong> from the <span className="uppercase font-mono text-[10px] bg-slate-100 px-1 py-0.5 text-slate-600 border border-slate-200">{provisionToDelete.category}</span> stores tracking matrix? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setProvisionToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-wider cursor-pointer font-sans"
              >
                NO, CANCEL
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteProvision}
                className="px-4 py-2 bg-[#FF4500] hover:bg-red-700 text-white text-xs font-bold uppercase tracking-wider cursor-pointer font-sans"
              >
                YES, DELETE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Equipment Deletion Modal */}
      {equipmentToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-[#FF4500] p-6 max-w-sm w-full shadow-2xl rounded-none">
            <div className="flex items-center gap-3 text-[#FF4500] mb-4">
              <AlertTriangle className="w-6 h-6" />
              <h4 className="text-sm font-bold uppercase tracking-wider font-sans">
                Confirm Equipment Deletion
              </h4>
            </div>
            <p className="text-xs text-slate-600 font-sans leading-relaxed text-justify mb-6">
              Are you sure you want to permanently remove <strong className="text-slate-800">{equipmentToDelete.name}</strong> from the galley hardware logs? This action is irreversible.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setEquipmentToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-wider cursor-pointer font-sans"
              >
                NO, CANCEL
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteEquipment}
                className="px-4 py-2 bg-[#FF4500] hover:bg-red-700 text-white text-xs font-bold uppercase tracking-wider cursor-pointer font-sans"
              >
                YES, DELETE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
