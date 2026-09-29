import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Flame, 
  Anchor, 
  ListOrdered, 
  FileCheck, 
  RefreshCw, 
  PenTool, 
  CheckCircle,
  HelpCircle,
  AlertTriangle,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  Shield,
  ShieldAlert,
  Sliders,
  Droplet,
  Activity,
  Edit2,
  Trash2,
  Plus,
  User
} from "lucide-react";
import { getStoredUserProfile, UserProfile } from "../types/userProfile";

interface DrillType {
  id: string;
  name: string;
  responsibility: string;
  periodMonths: number;
  lastConducted: string;
  nextDue: string;
  description: string;
  icon: string;
  time?: string;
  status?: "Done" | "Pending" | "Not Done";
}

const DEFAULT_DRILLS: DrillType[] = [
  {
    id: "abandon-ship",
    name: "Abandon Ship Drill",
    responsibility: "Master & Chief Officer",
    periodMonths: 1,
    lastConducted: "2026-06-15",
    nextDue: "2026-07-15",
    description: "SOLAS standard drill simulating emergency muster, donning lifejackets, thermal protective aids, and preparing/swinging out lifeboats.",
    icon: "Anchor",
    time: "10:00",
    status: "Pending"
  },
  {
    id: "fire-drill",
    name: "Fire Drill",
    responsibility: "Chief Officer & 3rd Officer",
    periodMonths: 1,
    lastConducted: "2026-06-12",
    nextDue: "2026-07-12",
    description: "Simulating muster of firefighting squads, hose deployment, breathing apparatus checks, boundary cooling, and ventilation isolation.",
    icon: "Flame",
    time: "14:00",
    status: "Done"
  },
  {
    id: "enclosed-space",
    name: "Enclosed Space Entry & Rescue",
    responsibility: "Chief Officer & Chief Engineer",
    periodMonths: 2,
    lastConducted: "2026-05-20",
    nextDue: "2026-07-20",
    description: "Atmospheric multi-gas pre-testing, entry authorization, ventilation setup, and simulated rescue of an unconscious person using tripod and harness.",
    icon: "ShieldAlert",
    time: "09:00",
    status: "Done"
  },
  {
    id: "emergency-steering",
    name: "Emergency Steering Drill",
    responsibility: "2nd Engineer & 2nd Officer",
    periodMonths: 3,
    lastConducted: "2026-04-18",
    nextDue: "2026-07-18",
    description: "Simulating failure of bridge remote control. Swift switchover to manual local hydraulic controls at the Steering Gear Flat using phone links.",
    icon: "Sliders",
    time: "11:00",
    status: "Done"
  },
  {
    id: "sopep",
    name: "SOPEP / Oil Spill Drill",
    responsibility: "Chief Officer & 2nd Engineer",
    periodMonths: 3,
    lastConducted: "2026-04-05",
    nextDue: "2026-07-05",
    description: "Simulating bunker deck spill. Sounding oil spill alarms, tripping fuel supplies, plugging scuppers, and deploying absorbent booms/pads.",
    icon: "Droplet",
    time: "15:00",
    status: "Done"
  },
  {
    id: "isps-security",
    name: "ISPS Security Drill",
    responsibility: "Ship Security Officer (SSO)",
    periodMonths: 3,
    lastConducted: "2026-05-02",
    nextDue: "2026-08-02",
    description: "Simulating threat scenarios, unauthorized gangway boarding attempt, citadel lockouts, and compliance checks with Ship Security Levels.",
    icon: "Shield",
    time: "16:00",
    status: "Pending"
  }
];

const drillIcons: Record<string, any> = {
  Anchor: Anchor,
  Flame: Flame,
  ShieldAlert: ShieldAlert,
  Sliders: Sliders,
  Droplet: Droplet,
  Shield: Shield
};

export default function SafetyDrills() {
  const [drills, setDrills] = useState<DrillType[]>(() => {
    const saved = localStorage.getItem("sms_safety_drills");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Ensure parsed objects get status and time defaults
        return parsed.map((d: any, idx: number) => ({
          ...d,
          time: d.time || DEFAULT_DRILLS[idx]?.time || "10:00",
          status: d.status || (DEFAULT_DRILLS[idx]?.status ?? "Pending")
        }));
      } catch (e) {
        console.error("Failed to parse safety drills, serving defaults.", e);
      }
    }
    return DEFAULT_DRILLS;
  });

  // Staged state for temporary editing, adding, and deleting
  const [stagedDrills, setStagedDrills] = useState<DrillType[]>([]);

  // Sync stagedDrills when committed drills change
  useEffect(() => {
    setStagedDrills(drills);
  }, [drills]);

  // Notification Toast state
  const [notification, setNotification] = useState<string | null>(null);

  // Active User Profile Binding
  const [currentUser, setCurrentUser] = useState<UserProfile>(() => getStoredUserProfile());

  useEffect(() => {
    const handleProfileChange = () => {
      setCurrentUser(getStoredUserProfile());
    };
    window.addEventListener("sms_user_profile_changed", handleProfileChange);
    return () => window.removeEventListener("sms_user_profile_changed", handleProfileChange);
  }, []);

  const isUserResponsible = (responsibility: string) => {
    if (!currentUser?.rank) return false;
    const userRank = currentUser.rank.toLowerCase();
    const resp = (responsibility || "").toLowerCase();
    if (resp.includes("all")) return true;
    if (userRank.includes("second") && (resp.includes("2nd") || resp.includes("second"))) return true;
    if (userRank.includes("third") && (resp.includes("3rd") || resp.includes("third"))) return true;
    if (userRank.includes("chief officer") && resp.includes("chief officer")) return true;
    if (userRank.includes("master") && (resp.includes("master") || resp.includes("captain"))) return true;
    if (userRank.includes("chief engineer") && resp.includes("chief engineer")) return true;
    if (userRank.includes("second engineer") && (resp.includes("2nd engineer") || resp.includes("second engineer"))) return true;
    if (userRank.includes("cadet") && resp.includes("cadet")) return true;
    return resp.includes(userRank);
  };

  // Active Calendar Month & Year (Today is July 13, 2026)
  const [calMonth, setCalMonth] = useState(6); // July (0-indexed: 6)
  const [calYear, setCalYear] = useState(2026);
  const [selectedDay, setSelectedDay] = useState<number | null>(13); // Today highlighted initially

  // Log completion Modal state
  const [loggingDrillId, setLoggingDrillId] = useState<string | null>(null);
  const [logForm, setLogForm] = useState({
    date: "2026-07-13",
    pob: 22,
    remarks: "Satisfactory compliance, emergency squads coordinated muster and execution procedures flawlessly."
  });

  // Edit Parameter Overlay state
  const [editingDrill, setEditingDrill] = useState<DrillType | null>(null);

  // Deletion state
  const [deletingDrillId, setDeletingDrillId] = useState<string | null>(null);

  // Add Custom Drill state
  const [isAddingDrill, setIsAddingDrill] = useState(false);
  const [newDrill, setNewDrill] = useState<DrillType>({
    id: "",
    name: "",
    responsibility: "Officer in Charge",
    periodMonths: 1,
    lastConducted: "2026-07-13",
    nextDue: "2026-08-13",
    description: "Emergency response protocols in accordance with safety management procedures.",
    icon: "Shield",
    time: "10:00",
    status: "Pending"
  });

  const triggerNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  useEffect(() => {
    localStorage.setItem("sms_safety_drills", JSON.stringify(drills));
  }, [drills]);

  const calculateNextDue = (lastConducted: string, periodMonths: number): string => {
    const date = new Date(lastConducted);
    if (isNaN(date.getTime())) return "";
    date.setMonth(date.getMonth() + periodMonths);
    return date.toISOString().split("T")[0];
  };

  // Helper to dynamically update custom drill fields and recalculate next due
  const updateNewDrillField = (field: keyof DrillType, value: any) => {
    setNewDrill(prev => {
      const updated = { ...prev, [field]: value };
      if (field === "lastConducted" || field === "periodMonths") {
        updated.nextDue = calculateNextDue(updated.lastConducted, updated.periodMonths);
      }
      return updated;
    });
  };

  // Helper to dynamically update editing drill fields and recalculate next due
  const updateEditingDrillField = (field: keyof DrillType, value: any) => {
    setEditingDrill(prev => {
      if (!prev) return null;
      const updated = { ...prev, [field]: value };
      if (field === "lastConducted" || field === "periodMonths") {
        updated.nextDue = calculateNextDue(updated.lastConducted, updated.periodMonths);
      }
      return updated;
    });
  };

  const getDaysDiff = (dateStr1: string, dateStr2: string) => {
    const d1 = new Date(dateStr1);
    const d2 = new Date(dateStr2);
    const diffTime = d2.getTime() - d1.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getDrillStatus = (drill: DrillType) => {
    const today = "2026-07-13";
    const diff = getDaysDiff(today, drill.nextDue);

    if (drill.status === "Done") {
      return { 
        label: "DONE", 
        color: "bg-emerald-100 text-emerald-700 border border-emerald-300", 
        badge: "bg-[#00A86B]", 
        diffText: "Interval Met" 
      };
    } else if (drill.status === "Not Done") {
      return { 
        label: "NOT DONE", 
        color: "bg-red-100 text-red-700 border border-red-300", 
        badge: "bg-red-500", 
        diffText: "Action Required" 
      };
    }

    // Default "Pending" status determined dynamically by due date fallback
    if (diff < 0) {
      return { 
        label: "OVERDUE", 
        color: "bg-red-100 text-red-700 border border-red-300", 
        badge: "bg-red-500", 
        diffText: `${Math.abs(diff)} days overdue` 
      };
    } else if (diff <= 7) {
      return { 
        label: "DUE SOON", 
        color: "bg-amber-100 text-amber-700 border border-amber-300", 
        badge: "bg-amber-500", 
        diffText: `Due in ${diff} days` 
      };
    } else {
      return { 
        label: "PENDING", 
        color: "bg-blue-100 text-blue-700 border border-blue-300", 
        badge: "bg-blue-500", 
        diffText: `${diff} days left` 
      };
    }
  };

  // Open Log completion form
  const openLogModal = (drill: DrillType) => {
    setLoggingDrillId(drill.id);
    setLogForm({
      date: "2026-07-13",
      pob: 22,
      remarks: `Conducted full ${drill.name} in accordance with SOLAS SMS regulations. Team performance is evaluated as satisfactory.`
    });
  };

  // Submit completion logs to staging state
  const submitCompletionLog = () => {
    if (!loggingDrillId) return;

    setStagedDrills(prev => prev.map(d => {
      if (d.id === loggingDrillId) {
        const calculatedNext = calculateNextDue(logForm.date, d.periodMonths);
        return {
          ...d,
          lastConducted: logForm.date,
          nextDue: calculatedNext,
          status: "Done"
        };
      }
      return d;
    }));

    const drillName = stagedDrills.find(d => d.id === loggingDrillId)?.name;
    triggerNotification(`Staged: Logged completion for ${drillName}. Click APPLY below to commit.`);
    setLoggingDrillId(null);
  };

  // Open parameter editor
  const openEditModal = (drill: DrillType) => {
    setEditingDrill({ 
      ...drill,
      status: drill.status || "Pending",
      time: drill.time || "10:00"
    });
  };

  // Save parameters & apply to staging state
  const handleSaveEdit = () => {
    if (!editingDrill) return;

    setStagedDrills(prev => prev.map(d => {
      if (d.id === editingDrill.id) {
        return {
          ...d,
          name: editingDrill.name,
          responsibility: editingDrill.responsibility,
          description: editingDrill.description,
          icon: editingDrill.icon,
          lastConducted: editingDrill.lastConducted,
          time: editingDrill.time,
          periodMonths: editingDrill.periodMonths,
          nextDue: editingDrill.nextDue,
          status: editingDrill.status
        };
      }
      return d;
    }));

    triggerNotification(`Staged parameter updates for ${editingDrill.name}. Click APPLY below to commit.`);
    setEditingDrill(null);
  };

  // Delete Prompt handlers
  const openDeleteConfirm = (id: string) => {
    setDeletingDrillId(id);
  };

  const executeDelete = () => {
    if (!deletingDrillId) return;
    const drillName = stagedDrills.find(d => d.id === deletingDrillId)?.name;
    setStagedDrills(prev => prev.filter(d => d.id !== deletingDrillId));
    triggerNotification(`Staged removal of ${drillName}. Click APPLY below to commit.`);
    setDeletingDrillId(null);
  };

  // Add Custom Drill submit
  const handleAddDrillSubmit = () => {
    if (!newDrill.name.trim()) {
      triggerNotification("Error: Drill Title / Name cannot be empty.");
      return;
    }
    const id = "drill-" + Date.now();
    const createdDrill: DrillType = {
      ...newDrill,
      id
    };

    setStagedDrills(prev => [...prev, createdDrill]);
    triggerNotification(`Staged new custom drill: ${createdDrill.name} (Officer in Charge: ${createdDrill.responsibility}). Click APPLY below to commit.`);
    setIsAddingDrill(false);
    // Reset form
    setNewDrill({
      id: "",
      name: "",
      responsibility: "Officer in Charge",
      periodMonths: 1,
      lastConducted: "2026-07-13",
      nextDue: "2026-08-13",
      description: "Emergency response protocols in accordance with safety management procedures.",
      icon: "Shield",
      time: "10:00",
      status: "Pending"
    });
  };

  // Calendar logic helpers
  const monthNames = [
    "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
    "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"
  ];

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const handlePrevMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear(prev => prev - 1);
    } else {
      setCalMonth(prev => prev - 1);
    }
    setSelectedDay(null);
  };

  const handleNextMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear(prev => prev + 1);
    } else {
      setCalMonth(prev => prev + 1);
    }
    setSelectedDay(null);
  };

  const getDrillsOnDate = (year: number, month: number, day: number) => {
    const formattedDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    
    const onDate = drills.filter(d => d.nextDue === formattedDate);
    const completed = drills.filter(d => d.lastConducted === formattedDate || (d.nextDue === formattedDate && d.status === "Done"));
    const pending = onDate.filter(d => d.status === "Pending" || !d.status);
    const notDone = onDate.filter(d => d.status === "Not Done");
    const due = onDate.filter(d => d.status === "Not Done" || (!d.status && getDaysDiff("2026-07-13", d.nextDue) < 0));

    return { due, completed, pending, notDone };
  };

  // Build calendar matrix
  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const firstDayIndex = getFirstDayOfMonth(calYear, calMonth);
  const calendarCells: (number | null)[] = [];
  
  for (let i = 0; i < firstDayIndex; i++) {
    calendarCells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    calendarCells.push(d);
  }

  // Find drills scheduled or completed for selected day in active calendar view
  const activeSelectedDayDetails = selectedDay 
    ? getDrillsOnDate(calYear, calMonth, selectedDay)
    : { due: [], completed: [], pending: [], notDone: [] };

  // Sort upcoming deadlines
  const sortedDeadlines = [...drills].sort((a, b) => {
    return new Date(a.nextDue).getTime() - new Date(b.nextDue).getTime();
  });

  return (
    <div id="drills-and-training-module" className="space-y-8">
      
      {/* Dynamic Toast Message Banner */}
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

      {/* Title SOLAS Banner */}
      <div className="bg-white border border-slate-200 p-5 rounded-none flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <h2 className="text-[#0A2540] font-black text-xs uppercase tracking-wider">
              Onboard Mandatory Drills & Training Center
            </h2>
            <span className="text-[9px] font-mono bg-blue-100 text-blue-800 px-2 py-0.5 border border-blue-200 rounded-none font-bold uppercase">
              SOLAS / ISPS SECURE
            </span>
          </div>
          <p className="text-xs text-slate-500 max-w-3xl">
            In compliance with **SOLAS Chapter III Regulation 19** and **ISPS security protocols**. Customize core timing intervals, adjust compliance states, and schedule target deadlines with responsive visual calendar mappings.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono font-bold shrink-0">
          <Clock className="w-4 h-4 text-[#00A86B]" />
          <span>CURRENT DATE: <span className="text-[#00A86B]">2026-07-13</span></span>
        </div>
      </div>

      {/* PART 1: Category Cards Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <ListOrdered className="w-4 h-4 text-[#0A2540]" />
            <h3 className="text-xs font-black uppercase text-[#0A2540] tracking-wider">
              Mandatory STCW Drill Categories
            </h3>
          </div>
          <button
            onClick={() => setIsAddingDrill(true)}
            className="px-3 py-1.5 bg-[#0A2540] hover:bg-slate-800 text-white font-mono text-[10px] font-black uppercase tracking-wider rounded-none cursor-pointer flex items-center gap-1.5 border border-[#0A2540] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add Drill
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stagedDrills.map((drill) => {
            const IconComp = drillIcons[drill.icon] || HelpCircle;
            const status = getDrillStatus(drill);

            return (
              <div 
                key={drill.id} 
                className={`bg-white border p-5 flex flex-col justify-between transition-all duration-200 shadow-sm hover:shadow-md relative ${
                  drill.status === "Not Done" || status.label === "OVERDUE" ? "border-red-300 ring-1 ring-red-100" : "border-slate-200"
                }`}
              >
                {/* Overdue alert ribbon */}
                {(drill.status === "Not Done" || status.label === "OVERDUE") && (
                  <div className="absolute top-0 right-0 bg-red-600 text-white font-mono text-[8px] font-bold px-2 py-0.5 uppercase tracking-wider animate-pulse z-10">
                    Action Required
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-none flex items-center justify-center border ${
                        drill.status === "Not Done" || status.label === "OVERDUE" ? "bg-red-50 text-red-600 border-red-200" : "bg-slate-50 text-[#0A2540] border-slate-200"
                      }`}>
                        <IconComp className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-[#0A2540] truncate">{drill.name}</h4>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-50/90 border border-blue-200/90 text-[#0A2540] text-[9px] font-mono font-bold uppercase rounded-xs">
                            <User className="w-2.5 h-2.5 text-blue-700" />
                            <span className="text-slate-500 font-semibold">Officer in Charge:</span>
                            <span className="font-extrabold text-[#0A2540]">{drill.responsibility || "Officer in Charge"}</span>
                          </span>
                          {isUserResponsible(drill.responsibility) && (
                            <span className="px-1.5 py-0.5 bg-[#00A86B] text-white font-mono font-black text-[8px] uppercase tracking-wider rounded-xs flex items-center gap-0.5 shadow-xs">
                              <CheckCircle2 className="w-2.5 h-2.5" /> [ME / USER]
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {/* Delete Icon Button */}
                    <button
                      onClick={() => openDeleteConfirm(drill.id)}
                      className="p-1.5 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-600 border border-slate-200 hover:border-red-200 transition-colors cursor-pointer rounded-none"
                      title="Permanently delete from ship's matrix"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-500 leading-normal mb-4 font-sans h-12 overflow-hidden text-ellipsis line-clamp-3">
                    {drill.description}
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-[10px] font-mono bg-slate-50 p-2.5 border border-slate-100 mb-4">
                    <div>
                      <span className="text-slate-400 block text-[8px] uppercase">INTERVAL</span>
                      <span className="text-slate-700 font-bold uppercase">
                        {drill.periodMonths === 1 ? "Monthly" : 
                         drill.periodMonths === 2 ? "Every 2 Months" : 
                         drill.periodMonths === 3 ? "Quarterly" : 
                         drill.periodMonths === 6 ? "Every 6 Months" : `Every ${drill.periodMonths} Months`}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[8px] uppercase">STATUS badge</span>
                      <span className={`px-1.5 py-0.5 rounded-sm text-[9px] font-bold ${status.color}`}>
                        {status.label}
                      </span>
                    </div>
                    <div className="mt-1.5">
                      <span className="text-slate-400 block text-[8px] uppercase">LAST LOGGED</span>
                      <span className="text-slate-700 font-bold">{drill.lastConducted}</span>
                    </div>
                    <div className="mt-1.5">
                      <span className="text-slate-400 block text-[8px] uppercase">TARGET DUE DATE</span>
                      <span className={`font-bold ${drill.status === "Not Done" || status.label === "OVERDUE" ? "text-red-600" : "text-[#0A2540]"}`}>
                        {drill.nextDue}
                      </span>
                    </div>
                    <div className="mt-1.5 col-span-2 border-t border-slate-200/60 pt-1.5 flex justify-between items-center">
                      <span className="text-slate-400 text-[8px] uppercase">EXECUTION TIME</span>
                      <span className="text-slate-700 font-bold font-mono text-[10px]">{drill.time || "10:00"} LT</span>
                    </div>
                    <div className="mt-1.5 col-span-2 border-t border-slate-200/60 pt-1.5 flex justify-between items-center">
                      <span className="text-slate-400 text-[8px] uppercase font-bold">OFFICER IN CHARGE</span>
                      <span className="text-[#0A2540] font-bold font-mono text-[10px] flex items-center gap-1">
                        <User className="w-3 h-3 text-[#00A86B]" />
                        {drill.responsibility || "Officer in Charge"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100 mt-2">
                  <span className="text-[9px] font-mono text-slate-400 font-medium">
                    {status.diffText}
                  </span>
                  
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => openEditModal(drill)}
                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 text-[10px] font-bold uppercase tracking-wider rounded-none cursor-pointer flex items-center gap-1 hover:text-[#0A2540] transition-colors"
                      title="Edit Timing Parameters and Compliance Status"
                    >
                      <Edit2 className="w-3 h-3 text-[#0A2540]" /> EDIT
                    </button>
                    <button
                      onClick={() => openLogModal(drill)}
                      className="px-2 py-1 bg-[#00A86B] hover:bg-emerald-700 border border-[#00A86B] text-white text-[10px] font-bold uppercase tracking-wider rounded-none cursor-pointer flex items-center gap-1 transition-colors"
                    >
                      <CheckCircle2 className="w-3 h-3" /> LOG DONE
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* PART 2: Interactive Calendar & Countdown Centre */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Interactive Calendar (7 Columns) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 mb-4">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-[#0A2540]" />
              <h3 className="text-xs font-black uppercase text-[#0A2540] tracking-wider">
                Drill Timeline Calendar
              </h3>
            </div>
            
            {/* Navigational controls */}
            <div className="flex items-center gap-2">
              <button 
                onClick={handlePrevMonth}
                className="p-1 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-none cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono font-black text-[#0A2540] min-w-24 text-center tracking-widest bg-slate-50 px-2.5 py-1 border border-slate-100">
                {monthNames[calMonth]} {calYear}
              </span>
              <button 
                onClick={handleNextMonth}
                className="p-1 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-none cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-mono font-black text-slate-400 mb-2">
            <span>SUN</span>
            <span>MON</span>
            <span>TUE</span>
            <span>WED</span>
            <span>THU</span>
            <span>FRI</span>
            <span>SAT</span>
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {calendarCells.map((day, idx) => {
              if (day === null) {
                return <div key={`empty-${idx}`} className="bg-slate-50/40 border border-slate-100/40 h-14" />;
              }

              const { due, completed, pending, notDone } = getDrillsOnDate(calYear, calMonth, day);
              const isToday = calYear === 2026 && calMonth === 6 && day === 13;
              const isSelected = selectedDay === day;

              let cellBg = "bg-white border-slate-200 hover:border-slate-400 hover:bg-slate-50/50";
              if (isToday) {
                cellBg = "bg-emerald-50/30 border-2 border-[#00A86B] ring-1 ring-[#00A86B]/30";
              } else if (isSelected) {
                cellBg = "bg-blue-50/30 border-2 border-[#0A2540]";
              }

              return (
                <div
                  key={`day-${day}`}
                  onClick={() => setSelectedDay(day)}
                  className={`border h-14 p-1.5 flex flex-col justify-between cursor-pointer transition-all rounded-none relative select-none ${cellBg}`}
                >
                  <div className="flex justify-between items-start">
                    <span className={`text-[10px] font-mono font-bold ${
                      isToday ? "text-[#00A86B] font-black" : "text-[#0A2540]"
                    }`}>
                      {day}
                    </span>
                    
                    {isToday && (
                      <span className="text-[7px] font-mono font-black text-white bg-[#00A86B] px-1 rounded-none scale-90">
                        TODAY
                      </span>
                    )}
                  </div>

                  {/* Status indicators */}
                  <div className="flex flex-wrap gap-1 mt-1 justify-start">
                    {completed.map((c, cIdx) => (
                      <span 
                        key={`comp-${cIdx}`} 
                        className="w-2 h-2 rounded-full bg-[#00A86B] border border-white"
                        title={`COMPLETED: ${c.name}`}
                      />
                    ))}
                    {pending.map((p, pIdx) => (
                      <span 
                        key={`pend-${pIdx}`} 
                        className="w-2 h-2 rounded-full bg-amber-500 border border-white"
                        title={`PENDING: ${p.name}`}
                      />
                    ))}
                    {notDone.map((n, nIdx) => (
                      <span 
                        key={`not-${nIdx}`} 
                        className="w-2 h-2 rounded-full bg-red-500 border border-white animate-pulse"
                        title={`NOT DONE: ${n.name}`}
                      />
                    ))}
                    {due.map((d, dIdx) => (
                      <span 
                        key={`due-${dIdx}`} 
                        className="w-2 h-2 rounded-full bg-red-600 border border-white animate-pulse"
                        title={`DUE/OVERDUE: ${d.name}`}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected day details overlay panel */}
          <div className="mt-4 p-3.5 bg-slate-50 border border-slate-200">
            <h4 className="text-[10px] font-mono font-black text-[#0A2540] uppercase tracking-wider border-b border-slate-200 pb-1.5 mb-2 flex items-center justify-between">
              <span>SCHEDULED EVENTS: {selectedDay ? `${selectedDay} ${monthNames[calMonth]} ${calYear}` : "Select a day"}</span>
              <span className="text-[9px] text-slate-400 font-normal">TIMELINE DATA ENGINE</span>
            </h4>
            
            {selectedDay ? (
              <div className="space-y-2">
                {activeSelectedDayDetails.due.length === 0 && 
                 activeSelectedDayDetails.completed.length === 0 && 
                 activeSelectedDayDetails.pending.length === 0 && 
                 activeSelectedDayDetails.notDone.length === 0 ? (
                  <p className="text-[11px] text-slate-400 font-mono italic">No drills are due or logged completed on this date.</p>
                ) : (
                  <div className="space-y-2">
                    {activeSelectedDayDetails.due.map((d, idx) => (
                      <div key={`due-det-${idx}`} className="flex items-center justify-between bg-red-50 border border-red-200 p-2 text-xs">
                        <div className="flex items-center gap-1.5 font-bold text-red-700">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                          <span>{d.name} (Scheduled: {d.time || "10:00"}) - OVERDUE / REQUIRE ACTION</span>
                        </div>
                        <span className="text-[9px] font-mono font-black text-red-600 uppercase">OFFICER IN CHARGE: {d.responsibility}</span>
                      </div>
                    ))}
                    {activeSelectedDayDetails.notDone.map((d, idx) => (
                      <div key={`not-det-${idx}`} className="flex items-center justify-between bg-red-50 border border-red-100 p-2 text-xs">
                        <div className="flex items-center gap-1.5 font-bold text-red-700">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                          <span>{d.name} (Scheduled: {d.time || "10:00"}) - NOT DONE</span>
                        </div>
                        <span className="text-[9px] font-mono font-black text-red-500 uppercase">OFFICER IN CHARGE: {d.responsibility}</span>
                      </div>
                    ))}
                    {activeSelectedDayDetails.pending.map((d, idx) => (
                      <div key={`pend-det-${idx}`} className="flex items-center justify-between bg-amber-50 border border-amber-200 p-2 text-xs">
                        <div className="flex items-center gap-1.5 font-bold text-amber-800">
                          <Clock className="w-3.5 h-3.5 text-amber-500" />
                          <span>{d.name} (Scheduled: {d.time || "10:00"}) - PENDING CONTROL</span>
                        </div>
                        <span className="text-[9px] font-mono font-black text-amber-900 uppercase">OIC: {d.responsibility}</span>
                      </div>
                    ))}
                    {activeSelectedDayDetails.completed.map((c, idx) => (
                      <div key={`comp-det-${idx}`} className="flex items-center justify-between bg-emerald-50 border border-emerald-200 p-2 text-xs">
                        <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{c.name} (Scheduled: {c.time || "10:00"}) - CONDUCTED SUCCESSFULLY</span>
                        </div>
                        <span className="text-[9px] font-mono font-black text-emerald-900 uppercase">OIC: {c.responsibility}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 italic">Click on any calendar day block to see events scheduled for that day.</p>
            )}
          </div>
        </div>

        {/* Chronological Deadlines Counter List (5 Columns) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
              <Clock className="w-5 h-5 text-[#0A2540]" />
              <h3 className="text-xs font-black uppercase text-[#0A2540] tracking-wider">
                Regulatory Due Windows
              </h3>
            </div>

            <p className="text-[11px] text-slate-500 mb-4 leading-relaxed font-sans">
              Dynamic calendar countdown prioritizing target dates. Real-time status systems alert Master of compliance intervals.
            </p>

            <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
              {sortedDeadlines.map((drill) => {
                const status = getDrillStatus(drill);
                return (
                  <div key={drill.id} className="border border-slate-200 bg-slate-50/50 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${status.badge}`} />
                        <h4 className="text-xs font-bold text-[#0A2540]">{drill.name}</h4>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono flex flex-wrap items-center gap-2">
                        <span>Target: <span className="text-slate-700 font-bold">{drill.nextDue}</span></span>
                        <span>•</span>
                        <span>Time: <span className="text-slate-700 font-bold">{drill.time || "10:00"}</span></span>
                        <span>•</span>
                        <span>OIC: <span className="text-slate-900 font-bold">{drill.responsibility}</span></span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <span className={`px-2 py-0.5 font-mono text-[9px] font-black uppercase border rounded-sm ${status.color}`}>
                        {status.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 pt-3.5 border-t border-slate-100 flex items-center justify-between text-[9px] font-mono text-slate-400 font-bold">
            <span>COMPLIANCE INDEX: SOLAS 2026</span>
            <span className="text-[#00A86B]">SYSTEM ONLINE</span>
          </div>
        </div>
      </div>

      {/* Master APPLY Staging Controller Panel */}
      <div className="bg-white border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${stagedDrills.length !== drills.length || JSON.stringify(stagedDrills) !== JSON.stringify(drills) ? "bg-amber-500 animate-pulse" : "bg-emerald-500"}`} />
          <div>
            <h4 className="text-xs font-bold text-[#0A2540] uppercase tracking-wide">
              {stagedDrills.length !== drills.length || JSON.stringify(stagedDrills) !== JSON.stringify(drills) ? "Pending Unapplied Staging Changes" : ""}
            </h4>
            <p className="text-[10px] text-slate-500 font-mono">
              {stagedDrills.length !== drills.length || JSON.stringify(stagedDrills) !== JSON.stringify(drills)
                ? "Modifications, new drills, or deletions are staged. Click APPLY to commit them to the timeline & calendar." 
                : ""}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          {(stagedDrills.length !== drills.length || JSON.stringify(stagedDrills) !== JSON.stringify(drills)) && (
            <button
              onClick={() => {
                setStagedDrills(drills);
                triggerNotification("Discarded all staged changes. Reverted back to the last applied state.");
              }}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-300 text-xs font-mono font-bold uppercase tracking-wider rounded-none cursor-pointer transition-all"
            >
              Reset Changes
            </button>
          )}
          <button
            onClick={() => {
              setDrills(stagedDrills);
              triggerNotification("Master Apply: All changes successfully committed. Recalculated timeline & updated calendar!");
            }}
            disabled={stagedDrills.length === drills.length && JSON.stringify(stagedDrills) === JSON.stringify(drills)}
            className={`px-6 py-2.5 font-mono text-xs font-black uppercase tracking-widest rounded-none border transition-all cursor-pointer shadow-sm ${
              stagedDrills.length !== drills.length || JSON.stringify(stagedDrills) !== JSON.stringify(drills)
                ? "bg-[#0A2540] hover:bg-slate-800 text-white border-[#0A2540] hover:shadow-md animate-shimmer" 
                : "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
            }`}
          >
            APPLY CHANGES
          </button>
        </div>
      </div>

      {/* Drill Parameter Editor Overlay Dialog */}
      <AnimatePresence>
        {editingDrill && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-300 p-6 w-full max-w-md my-8 relative rounded-none shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3.5 mb-4">
                <PenTool className="w-5 h-5 text-[#0A2540]" />
                <div>
                  <h4 className="text-xs font-black text-[#0A2540] uppercase tracking-wider">
                    Drill Parameter Editor
                  </h4>
                  <p className="text-[9px] text-slate-400 font-mono uppercase font-bold">Modify all STCW / SOLAS parameters (Staged)</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Drill Name */}
                <div className="space-y-1">
                  <label className="block text-[9px] font-mono uppercase text-slate-500 font-bold tracking-wider">
                    Drill Title / Name
                  </label>
                  <input
                    type="text"
                    value={editingDrill.name || ""}
                    onChange={(e) => updateEditingDrillField("name", e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-slate-400 font-bold"
                  />
                </div>

                {/* Officer in Charge */}
                <div className="space-y-1">
                  <label className="block text-[9px] font-mono uppercase text-slate-500 font-bold tracking-wider flex items-center justify-between">
                    <span>Officer in Charge</span>
                    <span className="text-slate-400 font-normal">Designated Lead</span>
                  </label>
                  <input
                    type="text"
                    value={editingDrill.responsibility || ""}
                    onChange={(e) => updateEditingDrillField("responsibility", e.target.value)}
                    placeholder="e.g. Chief Officer, 2nd Officer, 3rd Officer"
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-slate-400 font-medium"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <label className="block text-[9px] font-mono uppercase text-slate-500 font-bold tracking-wider">
                    Description / Protocols
                  </label>
                  <textarea
                    rows={2}
                    value={editingDrill.description || ""}
                    onChange={(e) => updateEditingDrillField("description", e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-slate-400 font-sans resize-none"
                  />
                </div>

                {/* Icon Selection */}
                <div className="space-y-1">
                  <label className="block text-[9px] font-mono uppercase text-slate-500 font-bold tracking-wider">
                    Display Icon Category
                  </label>
                  <select
                    value={editingDrill.icon || "Shield"}
                    onChange={(e) => updateEditingDrillField("icon", e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-slate-400"
                  >
                    <option value="Anchor">Anchor (Operations)</option>
                    <option value="Flame">Flame (Firefighting)</option>
                    <option value="ShieldAlert">ShieldAlert (Emergency / Enclosed)</option>
                    <option value="Sliders">Sliders (Technical / Steering)</option>
                    <option value="Droplet">Droplet (SOPEP / Pollution)</option>
                    <option value="Shield">Shield (Security / General)</option>
                  </select>
                </div>

                {/* Execution Time */}
                <div className="space-y-1">
                  <label className="block text-[9px] font-mono uppercase text-slate-500 font-bold tracking-wider">
                    Execution Time Slot
                  </label>
                  <input
                    type="text"
                    value={editingDrill.time || ""}
                    onChange={(e) => updateEditingDrillField("time", e.target.value)}
                    placeholder="e.g. 10:00, 14:30"
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:bg-white focus:border-slate-400"
                  />
                </div>

                {/* Recurrence Frequency */}
                <div className="space-y-1">
                  <label className="block text-[9px] font-mono uppercase text-slate-500 font-bold tracking-wider">
                    Recurrence Interval (Months)
                  </label>
                  <select
                    value={editingDrill.periodMonths}
                    onChange={(e) => updateEditingDrillField("periodMonths", parseInt(e.target.value) || 1)}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-slate-400"
                  >
                    <option value={1}>Monthly (1 Month)</option>
                    <option value={2}>Every 2 Months (2 Months)</option>
                    <option value={3}>Quarterly (3 Months)</option>
                    <option value={6}>Every 6 Months (6 Months)</option>
                    <option value={12}>Annually (12 Months)</option>
                  </select>
                </div>

                {/* Last Conducted Date */}
                <div className="space-y-1">
                  <label className="block text-[9px] font-mono uppercase text-slate-500 font-bold tracking-wider">
                    Last Conducted Date
                  </label>
                  <input
                    type="date"
                    value={editingDrill.lastConducted}
                    onChange={(e) => updateEditingDrillField("lastConducted", e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:bg-white focus:border-slate-400"
                  />
                </div>

                {/* Target due date */}
                <div className="space-y-1">
                  <label className="block text-[9px] font-mono uppercase text-slate-500 font-bold tracking-wider">
                    Target Execution Date (Target Date)
                  </label>
                  <input
                    type="date"
                    value={editingDrill.nextDue}
                    onChange={(e) => updateEditingDrillField("nextDue", e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:bg-white focus:border-slate-400"
                  />
                  <span className="text-[8px] font-mono text-slate-400 italic block">Auto-calculates on interval or conducted date changes</span>
                </div>

                {/* Compliance Status */}
                <div className="space-y-1">
                  <label className="block text-[9px] font-mono uppercase text-slate-500 font-bold tracking-wider">
                    Compliance Status
                  </label>
                  <select
                    value={editingDrill.status || "Pending"}
                    onChange={(e) => updateEditingDrillField("status", e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-slate-400 font-bold"
                  >
                    <option value="Done">Done</option>
                    <option value="Pending">Pending</option>
                    <option value="Not Done">Not Done</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingDrill(null)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-600 text-xs font-mono uppercase font-bold cursor-pointer rounded-none"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="px-3 py-2 bg-[#0A2540] hover:bg-slate-800 text-white text-xs font-mono uppercase font-bold cursor-pointer rounded-none border border-[#0A2540]"
                >
                  SAVE
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Custom Drill Overlay Dialog */}
      <AnimatePresence>
        {isAddingDrill && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-300 p-6 w-full max-w-md my-8 relative rounded-none shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3.5 mb-4">
                <Plus className="w-5 h-5 text-[#0A2540]" />
                <div>
                  <h4 className="text-xs font-black text-[#0A2540] uppercase tracking-wider">
                    Create Custom Drill Profile
                  </h4>
                  <p className="text-[9px] text-slate-400 font-mono uppercase font-bold">Add new category to ship safety matrix (Staged)</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Drill Name */}
                <div className="space-y-1">
                  <label className="block text-[9px] font-mono uppercase text-slate-500 font-bold tracking-wider">
                    Drill Title / Name
                  </label>
                  <input
                    type="text"
                    value={newDrill.name}
                    onChange={(e) => updateNewDrillField("name", e.target.value)}
                    placeholder="e.g. Helicopter Rescue Operations"
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-slate-400 font-bold"
                  />
                </div>

                {/* Officer in Charge */}
                <div className="space-y-1">
                  <label className="block text-[9px] font-mono uppercase text-slate-500 font-bold tracking-wider flex items-center justify-between">
                    <span>Officer in Charge</span>
                    <span className="text-slate-400 font-normal">Designated Lead</span>
                  </label>
                  <input
                    type="text"
                    value={newDrill.responsibility}
                    onChange={(e) => updateNewDrillField("responsibility", e.target.value)}
                    placeholder="e.g. Chief Officer, 2nd Officer, 3rd Officer"
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-slate-400 font-medium"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <label className="block text-[9px] font-mono uppercase text-slate-500 font-bold tracking-wider">
                    Description / Emergency Protocol Text
                  </label>
                  <textarea
                    rows={2}
                    value={newDrill.description}
                    onChange={(e) => updateNewDrillField("description", e.target.value)}
                    placeholder="Provide details on simulation objectives, muster points and crew response..."
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-slate-400 font-sans resize-none"
                  />
                </div>

                {/* Icon Selection */}
                <div className="space-y-1">
                  <label className="block text-[9px] font-mono uppercase text-slate-500 font-bold tracking-wider">
                    Display Icon Category
                  </label>
                  <select
                    value={newDrill.icon}
                    onChange={(e) => updateNewDrillField("icon", e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-slate-400"
                  >
                    <option value="Anchor">Anchor (Operations)</option>
                    <option value="Flame">Flame (Firefighting)</option>
                    <option value="ShieldAlert">ShieldAlert (Emergency / Enclosed)</option>
                    <option value="Sliders">Sliders (Technical / Steering)</option>
                    <option value="Droplet">Droplet (SOPEP / Pollution)</option>
                    <option value="Shield">Shield (Security / General)</option>
                  </select>
                </div>

                {/* Execution Time */}
                <div className="space-y-1">
                  <label className="block text-[9px] font-mono uppercase text-slate-500 font-bold tracking-wider">
                    Execution Time Slot
                  </label>
                  <input
                    type="text"
                    value={newDrill.time}
                    onChange={(e) => updateNewDrillField("time", e.target.value)}
                    placeholder="e.g. 10:00, 15:30"
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:bg-white focus:border-slate-400"
                  />
                </div>

                {/* Recurrence Frequency */}
                <div className="space-y-1">
                  <label className="block text-[9px] font-mono uppercase text-slate-500 font-bold tracking-wider">
                    Recurrence Interval (Months)
                  </label>
                  <select
                    value={newDrill.periodMonths}
                    onChange={(e) => updateNewDrillField("periodMonths", parseInt(e.target.value) || 1)}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-slate-400"
                  >
                    <option value={1}>Monthly (1 Month)</option>
                    <option value={2}>Every 2 Months (2 Months)</option>
                    <option value={3}>Quarterly (3 Months)</option>
                    <option value={6}>Every 6 Months (6 Months)</option>
                    <option value={12}>Annually (12 Months)</option>
                  </select>
                </div>

                {/* Last Conducted Date */}
                <div className="space-y-1">
                  <label className="block text-[9px] font-mono uppercase text-slate-500 font-bold tracking-wider">
                    Last Conducted Date
                  </label>
                  <input
                    type="date"
                    value={newDrill.lastConducted}
                    onChange={(e) => updateNewDrillField("lastConducted", e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:bg-white focus:border-slate-400"
                  />
                </div>

                {/* Target due date */}
                <div className="space-y-1">
                  <label className="block text-[9px] font-mono uppercase text-slate-500 font-bold tracking-wider">
                    Target Execution Date (Target Date)
                  </label>
                  <input
                    type="date"
                    value={newDrill.nextDue}
                    onChange={(e) => updateNewDrillField("nextDue", e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:bg-white focus:border-slate-400"
                  />
                  <span className="text-[8px] font-mono text-slate-400 italic block">Calculates automatically, but can be customized manually</span>
                </div>

                {/* Compliance Status */}
                <div className="space-y-1">
                  <label className="block text-[9px] font-mono uppercase text-slate-500 font-bold tracking-wider">
                    Compliance Status
                  </label>
                  <select
                    value={newDrill.status}
                    onChange={(e) => updateNewDrillField("status", e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-slate-400 font-bold"
                  >
                    <option value="Done">Done</option>
                    <option value="Pending">Pending</option>
                    <option value="Not Done">Not Done</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddingDrill(false)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-600 text-xs font-mono uppercase font-bold cursor-pointer rounded-none"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddDrillSubmit}
                  className="px-3 py-2 bg-[#0A2540] hover:bg-slate-800 text-white text-xs font-mono uppercase font-bold cursor-pointer rounded-none border border-[#0A2540]"
                >
                  Add Drill
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deletingDrillId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-300 p-6 w-full max-w-sm relative rounded-none shadow-2xl"
            >
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3.5 mb-4">
                <AlertTriangle className="w-5 h-5 text-red-600 animate-bounce shrink-0" />
                <h4 className="text-xs font-black text-[#0A2540] uppercase tracking-wider">
                  Delete Drill
                </h4>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed mb-6 font-sans">
                Are you sure want to delete this drill from the list?
              </p>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 font-mono text-xs font-bold uppercase">
                <button
                  type="button"
                  onClick={() => setDeletingDrillId(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-600 cursor-pointer rounded-none"
                >
                  NO
                </button>
                <button
                  type="button"
                  onClick={executeDelete}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white border border-red-600 cursor-pointer rounded-none"
                >
                  YES
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Log Completion Modal Backdrop */}
      <AnimatePresence>
        {loggingDrillId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-300 p-6 w-full max-w-md relative rounded-none shadow-2xl"
            >
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3.5 mb-4">
                <FileCheck className="w-5 h-5 text-[#00A86B]" />
                <div>
                  <h4 className="text-xs font-black text-[#0A2540] uppercase tracking-wider">
                    Log Drill Completion
                  </h4>
                  <p className="text-[9px] text-slate-400 font-mono uppercase font-bold">Update mandatory SOLAS intervals (Staged)</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-[9px] font-mono uppercase text-slate-500 font-bold tracking-wider">
                    Conducted Completion Date
                  </label>
                  <input
                    type="date"
                    value={logForm.date}
                    onChange={(e) => setLogForm(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:bg-white focus:border-slate-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[9px] font-mono uppercase text-slate-500 font-bold tracking-wider">
                    Personnel Participated (POB)
                  </label>
                  <input
                    type="number"
                    value={logForm.pob}
                    onChange={(e) => setLogForm(prev => ({ ...prev, pob: parseInt(e.target.value) || 0 }))}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:bg-white focus:border-slate-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[9px] font-mono uppercase text-slate-500 font-bold tracking-wider">
                    Evaluator Comments / Remarks
                  </label>
                  <textarea
                    rows={4}
                    value={logForm.remarks}
                    onChange={(e) => setLogForm(prev => ({ ...prev, remarks: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 p-3 text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-slate-400 resize-none font-sans"
                    placeholder="Enter evaluator performance notes..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setLoggingDrillId(null)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-600 text-xs font-mono uppercase font-bold cursor-pointer rounded-none"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitCompletionLog}
                  className="px-3 py-2 bg-[#00A86B] hover:bg-emerald-600 text-white text-xs font-mono uppercase font-bold cursor-pointer rounded-none border border-[#00A86B]"
                >
                  Submit Log
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
