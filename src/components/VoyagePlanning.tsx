import React, { useState, useEffect, useMemo, FormEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Navigation, 
  Compass, 
  Anchor, 
  Clock, 
  ArrowRight, 
  Search, 
  Gauge, 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Edit3, 
  Trash2, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  Ship, 
  Layers, 
  Filter, 
  Sliders, 
  MapPin, 
  Box, 
  Fuel, 
  User, 
  X,
  TrendingUp,
  Globe2,
  CalendarDays
} from "lucide-react";
import { 
  VoyageRecord, 
  VoyageStatus, 
  CargoLoadingStatus, 
  PortDetails, 
  POPULAR_WORLD_PORTS, 
  getStoredVoyages, 
  saveStoredVoyages, 
  getVoyageSummaryStats 
} from "../types/voyagePlanning";
import { getStoredUserProfile } from "../types/userProfile";
import { exportVoyagePlanningBackup } from "../utils/excelBackup";

export default function VoyagePlanning() {
  const [voyages, setVoyages] = useState<VoyageRecord[]>(() => getStoredVoyages());
  const [activeFilterTab, setActiveFilterTab] = useState<"all" | "active" | "upcoming" | "completed">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [notification, setNotification] = useState<string | null>(null);

  // Calendar View States
  const [calendarDate, setCalendarDate] = useState<Date>(() => new Date(2026, 9, 1)); // October 2026 default
  const [selectedCalendarDateStr, setSelectedCalendarDateStr] = useState<string | null>(null);

  // Modal States: Create / Edit Voyage Form
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingVoyage, setEditingVoyage] = useState<VoyageRecord | null>(null);

  // Form Fields
  const [formVoyageNumber, setFormVoyageNumber] = useState("");
  const [formDepPortName, setFormDepPortName] = useState("");
  const [formDepCountry, setFormDepCountry] = useState("");
  const [formDepLocode, setFormDepLocode] = useState("");
  const [formArrPortName, setFormArrPortName] = useState("");
  const [formArrCountry, setFormArrCountry] = useState("");
  const [formArrLocode, setFormArrLocode] = useState("");
  const [formEtd, setFormEtd] = useState("");
  const [formAtd, setFormAtd] = useState("");
  const [formEta, setFormEta] = useState("");
  const [formAta, setFormAta] = useState("");
  const [formCargoType, setFormCargoType] = useState("");
  const [formCargoQuantity, setFormCargoQuantity] = useState<number>(50000);
  const [formCargoUnit, setFormCargoUnit] = useState<string>("MT");
  const [formLoadingStatus, setFormLoadingStatus] = useState<CargoLoadingStatus>("Loaded");
  const [formDistanceNm, setFormDistanceNm] = useState<number>(3500);
  const [formAvgSpeedKts, setFormAvgSpeedKts] = useState<number>(15.5);
  const [formStatus, setFormStatus] = useState<VoyageStatus>("Planned");
  const [formMasterName, setFormMasterName] = useState("Capt. Alexander Sterling");
  const [formChiefOfficerName, setFormChiefOfficerName] = useState("Mateo Rodriguez");
  const [formRemarks, setFormRemarks] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  // Detail Inspection Modal
  const [viewingVoyage, setViewingVoyage] = useState<VoyageRecord | null>(null);

  // Delete Confirmation Modal
  const [voyageToDelete, setVoyageToDelete] = useState<VoyageRecord | null>(null);

  const currentUser = useMemo(() => getStoredUserProfile(), []);
  const vesselName = useMemo(() => localStorage.getItem("sms_vesselName") || "PACIFIC SENTINEL", []);

  // Save to localStorage whenever voyages state changes
  useEffect(() => {
    saveStoredVoyages(voyages);
  }, [voyages]);

  const triggerNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification(prev => prev === msg ? null : prev);
    }, 4500);
  };

  // Compute Summary Statistics
  const summaryStats = useMemo(() => getVoyageSummaryStats(voyages), [voyages]);

  // Active in-transit voyage (if any)
  const currentActiveVoyage = useMemo(() => {
    return voyages.find(v => v.status === "In Transit") || null;
  }, [voyages]);

  // Filtered voyages
  const filteredVoyages = useMemo(() => {
    return voyages.filter(v => {
      // 1. Status Filter
      if (activeFilterTab === "active" && v.status !== "In Transit") return false;
      if (activeFilterTab === "upcoming" && v.status !== "Planned" && v.status !== "Delayed") return false;
      if (activeFilterTab === "completed" && v.status !== "Completed") return false;

      // 2. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNumber = v.voyageNumber.toLowerCase().includes(q);
        const matchDep = v.departurePort.name.toLowerCase().includes(q) || v.departurePort.locode.toLowerCase().includes(q);
        const matchArr = v.arrivalPort.name.toLowerCase().includes(q) || v.arrivalPort.locode.toLowerCase().includes(q);
        const matchCargo = v.cargoType.toLowerCase().includes(q);
        if (!matchNumber && !matchDep && !matchArr && !matchCargo) return false;
      }

      // 3. Calendar Date filter
      if (selectedCalendarDateStr) {
        const depDate = (v.atd || v.etd).split("T")[0];
        const arrDate = (v.ata || v.eta).split("T")[0];
        if (selectedCalendarDateStr < depDate || selectedCalendarDateStr > arrDate) {
          return false;
        }
      }

      return true;
    });
  }, [voyages, activeFilterTab, searchQuery, selectedCalendarDateStr]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingVoyage(null);
    const nextNum = `V.0${voyages.length + 10}-PASSAGE`;
    setFormVoyageNumber(nextNum);
    setFormDepPortName("Port of Singapore");
    setFormDepCountry("Singapore");
    setFormDepLocode("SGSIN");
    setFormArrPortName("Port of Rotterdam");
    setFormArrCountry("Netherlands");
    setFormArrLocode("NLRTM");
    setFormEtd("2026-11-05T08:00");
    setFormAtd("");
    setFormEta("2026-11-28T18:00");
    setFormAta("");
    setFormCargoType("Containerized General Goods & High-Tech Electronics");
    setFormCargoQuantity(65000);
    setFormCargoUnit("MT");
    setFormLoadingStatus("Loaded");
    setFormDistanceNm(8350);
    setFormAvgSpeedKts(15.2);
    setFormStatus("Planned");
    setFormMasterName("Capt. Alexander Sterling");
    setFormChiefOfficerName("Mateo Rodriguez");
    setFormRemarks("Standard passage plan via Malacca Strait, Indian Ocean, and English Channel.");
    setFormError(null);
    setIsFormModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (voyage: VoyageRecord) => {
    setEditingVoyage(voyage);
    setFormVoyageNumber(voyage.voyageNumber);
    setFormDepPortName(voyage.departurePort.name);
    setFormDepCountry(voyage.departurePort.country);
    setFormDepLocode(voyage.departurePort.locode);
    setFormArrPortName(voyage.arrivalPort.name);
    setFormArrCountry(voyage.arrivalPort.country);
    setFormArrLocode(voyage.arrivalPort.locode);
    setFormEtd(voyage.etd);
    setFormAtd(voyage.atd || "");
    setFormEta(voyage.eta);
    setFormAta(voyage.ata || "");
    setFormCargoType(voyage.cargoType);
    setFormCargoQuantity(voyage.cargoQuantity);
    setFormCargoUnit(voyage.cargoUnit || "MT");
    setFormLoadingStatus(voyage.loadingStatus);
    setFormDistanceNm(voyage.distanceNm);
    setFormAvgSpeedKts(voyage.avgSpeedKts);
    setFormStatus(voyage.status);
    setFormMasterName(voyage.masterName || "Capt. Alexander Sterling");
    setFormChiefOfficerName(voyage.chiefOfficerName || "Mateo Rodriguez");
    setFormRemarks(voyage.remarks || "");
    setFormError(null);
    setIsFormModalOpen(true);
  };

  // Save Voyage Form Submit
  const handleSaveVoyage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formVoyageNumber.trim()) {
      setFormError("Voyage Number / ID is required.");
      return;
    }
    if (!formDepPortName.trim() || !formArrPortName.trim()) {
      setFormError("Both Departure and Arrival Ports are required.");
      return;
    }
    if (!formEtd || !formEta) {
      setFormError("Estimated Departure (ETD) and Arrival (ETA) dates are required.");
      return;
    }

    const depPort: PortDetails = {
      name: formDepPortName.trim(),
      country: formDepCountry.trim(),
      locode: formDepLocode.trim().toUpperCase()
    };

    const arrPort: PortDetails = {
      name: formArrPortName.trim(),
      country: formArrCountry.trim(),
      locode: formArrLocode.trim().toUpperCase()
    };

    const now = new Date().toISOString();

    if (editingVoyage) {
      const updatedList = voyages.map(v => {
        if (v.id === editingVoyage.id) {
          return {
            ...v,
            voyageNumber: formVoyageNumber.trim().toUpperCase(),
            departurePort: depPort,
            arrivalPort: arrPort,
            etd: formEtd,
            atd: formAtd.trim() || undefined,
            eta: formEta,
            ata: formAta.trim() || undefined,
            cargoType: formCargoType.trim(),
            cargoQuantity: Number(formCargoQuantity) || 0,
            cargoUnit: formCargoUnit,
            loadingStatus: formLoadingStatus,
            distanceNm: Number(formDistanceNm) || 0,
            avgSpeedKts: Number(formAvgSpeedKts) || 15.0,
            status: formStatus,
            masterName: formMasterName.trim(),
            chiefOfficerName: formChiefOfficerName.trim(),
            remarks: formRemarks.trim(),
            updatedAt: now
          };
        }
        return v;
      });
      setVoyages(updatedList);
      triggerNotification(`✓ Voyage ${formVoyageNumber} successfully updated.`);
    } else {
      const newRecord: VoyageRecord = {
        id: `voy-${Date.now()}`,
        voyageNumber: formVoyageNumber.trim().toUpperCase(),
        departurePort: depPort,
        arrivalPort: arrPort,
        etd: formEtd,
        atd: formAtd.trim() || undefined,
        eta: formEta,
        ata: formAta.trim() || undefined,
        cargoType: formCargoType.trim(),
        cargoQuantity: Number(formCargoQuantity) || 0,
        cargoUnit: formCargoUnit,
        loadingStatus: formLoadingStatus,
        distanceNm: Number(formDistanceNm) || 0,
        avgSpeedKts: Number(formAvgSpeedKts) || 15.0,
        status: formStatus,
        masterName: formMasterName.trim(),
        chiefOfficerName: formChiefOfficerName.trim(),
        remarks: formRemarks.trim(),
        createdAt: now,
        updatedAt: now
      };
      setVoyages([newRecord, ...voyages]);
      triggerNotification(`✓ New voyage ${formVoyageNumber} logged successfully.`);
    }

    setIsFormModalOpen(false);
  };

  // Delete Voyage
  const confirmDeleteVoyage = () => {
    if (!voyageToDelete) return;
    const num = voyageToDelete.voyageNumber;
    setVoyages(prev => prev.filter(v => v.id !== voyageToDelete.id));
    setVoyageToDelete(null);
    triggerNotification(`✓ Voyage ${num} deleted from history.`);
  };

  // Calendar Day Generation
  const calendarDays = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
    // Convert so Monday is 0: (day + 6) % 7
    const adjustedFirstDay = (firstDayIndex + 6) % 7;

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days: Array<{
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      events: Array<{ voyage: VoyageRecord; type: "departure" | "arrival" | "transit" }>;
    }> = [];

    // Previous month padding
    for (let i = adjustedFirstDay - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const prevDate = new Date(year, month - 1, d);
      const y = prevDate.getFullYear();
      const m = String(prevDate.getMonth() + 1).padStart(2, "0");
      const day = String(d).padStart(2, "0");
      days.push({
        dateStr: `${y}-${m}-${day}`,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: false,
        events: []
      });
    }

    const todayStr = new Date().toISOString().split("T")[0];

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const y = year;
      const m = String(month + 1).padStart(2, "0");
      const d = String(i).padStart(2, "0");
      const dateStr = `${y}-${m}-${d}`;

      // Check voyage events matching this day
      const events: Array<{ voyage: VoyageRecord; type: "departure" | "arrival" | "transit" }> = [];
      voyages.forEach(v => {
        const depDate = (v.atd || v.etd).split("T")[0];
        const arrDate = (v.ata || v.eta).split("T")[0];

        if (dateStr === depDate) {
          events.push({ voyage: v, type: "departure" });
        } else if (dateStr === arrDate) {
          events.push({ voyage: v, type: "arrival" });
        } else if (dateStr > depDate && dateStr < arrDate) {
          events.push({ voyage: v, type: "transit" });
        }
      });

      days.push({
        dateStr,
        dayNumber: i,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        events
      });
    }

    // Next month padding to fill out 35 or 42 grid cells
    const remaining = 35 - days.length > 0 ? 35 - days.length : 42 - days.length > 0 ? 42 - days.length : 0;
    for (let i = 1; i <= remaining; i++) {
      const nextDate = new Date(year, month + 1, i);
      const y = nextDate.getFullYear();
      const m = String(nextDate.getMonth() + 1).padStart(2, "0");
      const d = String(i).padStart(2, "0");
      days.push({
        dateStr: `${y}-${m}-${d}`,
        dayNumber: i,
        isCurrentMonth: false,
        isToday: false,
        events: []
      });
    }

    return days;
  }, [calendarDate, voyages]);

  const currentMonthName = useMemo(() => {
    return calendarDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }, [calendarDate]);

  // Status Badge Helper
  const getStatusBadge = (status: VoyageStatus) => {
    switch (status) {
      case "In Transit":
        return {
          bg: "bg-emerald-500/15 text-emerald-400 border-emerald-500/40",
          dot: "bg-[#00A86B]",
          label: "IN TRANSIT"
        };
      case "Completed":
        return {
          bg: "bg-blue-500/15 text-cyan-300 border-blue-500/40",
          dot: "bg-[#0284C7]",
          label: "COMPLETED"
        };
      case "Delayed":
        return {
          bg: "bg-red-500/15 text-red-400 border-red-500/40",
          dot: "bg-red-500",
          label: "DELAYED"
        };
      default:
        return {
          bg: "bg-amber-500/15 text-amber-300 border-amber-500/40",
          dot: "bg-amber-400",
          label: "PLANNED"
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-20 right-6 z-50 bg-[#0A2540] text-white border-2 border-[#00A86B] p-3.5 shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-3 duration-300 font-mono text-xs">
          <CheckCircle2 className="w-5 h-5 text-[#00A86B] shrink-0" />
          <span>{notification}</span>
          <button 
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-white font-bold ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* TOP HEADER & MODULE ACTION BAR */}
      <div className="bg-white border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <Navigation className="w-5 h-5 text-[#00A86B]" />
              <h2 className="text-base font-black text-[#0A2540] uppercase tracking-wide">
                Port-to-Port Voyage Records &amp; Passage History
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Commercial voyage logbook, port schedules, cargo manifest accounting, and STCW passage tracking for <strong>{vesselName}</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                const fname = exportVoyagePlanningBackup();
                triggerNotification(`✓ Voyage Planning data successfully backed up to Excel (${fname})`);
              }}
              className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Backup all port voyages and history to Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
              Backup to Excel
            </button>

            <button
              onClick={handleOpenCreateModal}
              className="px-4 py-2 bg-[#0A2540] hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#00A86B]" />
              Log Port-to-Port Voyage
            </button>
          </div>
        </div>

        {/* 3. SUMMARY CARDS AT THE TOP */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1 font-mono">
          {/* Card 1: Total Voyages Completed */}
          <div className="p-4 bg-slate-50 border border-slate-200 flex flex-col justify-between relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-500 text-[10px] uppercase font-bold">
              <span>Total Voyages Completed</span>
              <CheckCircle2 className="w-4 h-4 text-[#00A86B]" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-[#0A2540]">
                {summaryStats.totalCompletedCount}
              </span>
              <span className="text-[10px] font-bold text-slate-400">
                / {summaryStats.totalVoyages} Logged
              </span>
            </div>
            <div className="mt-2 text-[10px] text-slate-500 flex items-center justify-between border-t border-slate-200/60 pt-2">
              <span>Commercial Discharge:</span>
              <span className="font-bold text-emerald-700">100% Verified</span>
            </div>
          </div>

          {/* Card 2: Total Distance Logged */}
          <div className="p-4 bg-slate-50 border border-slate-200 flex flex-col justify-between relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-500 text-[10px] uppercase font-bold">
              <span>Total Distance Logged</span>
              <Compass className="w-4 h-4 text-blue-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-blue-900">
                {summaryStats.totalDistanceLogged.toLocaleString()}
              </span>
              <span className="text-[10px] font-bold text-slate-400">NM</span>
            </div>
            <div className="mt-2 text-[10px] text-slate-500 flex items-center justify-between border-t border-slate-200/60 pt-2">
              <span>Circumnavigations:</span>
              <span className="font-bold text-blue-700">~{(summaryStats.totalDistanceLogged / 21600).toFixed(1)}× Earth</span>
            </div>
          </div>

          {/* Card 3: Most Frequent Ports Called */}
          <div className="p-4 bg-slate-50 border border-slate-200 flex flex-col justify-between col-span-1 sm:col-span-2">
            <div className="flex items-center justify-between text-slate-500 text-[10px] uppercase font-bold">
              <span>Most Frequent Ports Called</span>
              <Anchor className="w-4 h-4 text-slate-700" />
            </div>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
              {summaryStats.mostFrequentPorts.map((p, idx) => (
                <div key={idx} className="bg-white p-2 border border-slate-200 text-xs">
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                    <span>Rank #{idx + 1}</span>
                    <span className="text-emerald-700 font-extrabold">{p.count} calls</span>
                  </div>
                  <div className="font-extrabold text-[#0A2540] truncate mt-0.5" title={p.name}>
                    {p.name}
                  </div>
                  <div className="text-[9px] text-slate-500 mt-0.5">
                    UN/LOCODE: <strong className="text-slate-700">{p.locode}</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Active In-Transit Voyage Highlight Banner (if underway) */}
        {currentActiveVoyage && (
          <div className="bg-[#0A2540] text-white p-4 border border-[#00A86B] flex flex-col md:flex-row md:items-center justify-between gap-4 font-mono text-xs shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#00A86B] flex items-center justify-center text-white shrink-0">
                <Ship className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] px-1.5 py-0.5 bg-emerald-500/20 text-[#00A86B] border border-[#00A86B]/40 font-bold uppercase">
                    ACTIVE VOYAGE IN TRANSIT
                  </span>
                  <span className="font-extrabold text-white">{currentActiveVoyage.voyageNumber}</span>
                </div>
                <div className="text-sm font-bold text-slate-200 mt-1 flex items-center gap-2">
                  <span>{currentActiveVoyage.departurePort.name} ({currentActiveVoyage.departurePort.locode})</span>
                  <ArrowRight className="w-4 h-4 text-[#00A86B]" />
                  <span className="text-emerald-300">{currentActiveVoyage.arrivalPort.name} ({currentActiveVoyage.arrivalPort.locode})</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6 text-[11px] border-t md:border-t-0 md:border-l border-slate-700 pt-2 md:pt-0 md:pl-4">
              <div>
                <span className="text-slate-400 block text-[9px] uppercase">Passage Distance</span>
                <span className="font-bold text-white">{currentActiveVoyage.distanceNm.toLocaleString()} NM</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px] uppercase">Service Speed</span>
                <span className="font-bold text-emerald-400">{currentActiveVoyage.avgSpeedKts} kts</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px] uppercase">ETA Destination</span>
                <span className="font-bold text-cyan-300">{currentActiveVoyage.eta.replace("T", " ")}</span>
              </div>
              <button
                onClick={() => setViewingVoyage(currentActiveVoyage)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase text-[10px] cursor-pointer transition-colors"
              >
                Inspect Passage
              </button>
            </div>
          </div>
        )}
      </div>

      {/* VOYAGE LOGBOOK & HISTORY TABLE */}
      <div className="bg-white border border-slate-200 shadow-sm space-y-4 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 font-mono text-xs">
          {/* Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => { setActiveFilterTab("all"); setSelectedCalendarDateStr(null); }}
              className={`px-3 py-1.5 font-bold uppercase text-[11px] transition-colors cursor-pointer border ${
                activeFilterTab === "all" && !selectedCalendarDateStr
                  ? "bg-[#0A2540] text-white border-[#0A2540]"
                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
              }`}
            >
              All Voyages ({voyages.length})
            </button>
            <button
              onClick={() => { setActiveFilterTab("active"); setSelectedCalendarDateStr(null); }}
              className={`px-3 py-1.5 font-bold uppercase text-[11px] transition-colors cursor-pointer border ${
                activeFilterTab === "active"
                  ? "bg-emerald-700 text-white border-emerald-700"
                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
              }`}
            >
              Ongoing / Active ({summaryStats.inTransitCount})
            </button>
            <button
              onClick={() => { setActiveFilterTab("upcoming"); setSelectedCalendarDateStr(null); }}
              className={`px-3 py-1.5 font-bold uppercase text-[11px] transition-colors cursor-pointer border ${
                activeFilterTab === "upcoming"
                  ? "bg-amber-600 text-white border-amber-600"
                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
              }`}
            >
              Upcoming ({summaryStats.plannedCount + summaryStats.delayedCount})
            </button>
            <button
              onClick={() => { setActiveFilterTab("completed"); setSelectedCalendarDateStr(null); }}
              className={`px-3 py-1.5 font-bold uppercase text-[11px] transition-colors cursor-pointer border ${
                activeFilterTab === "completed"
                  ? "bg-blue-700 text-white border-blue-700"
                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
              }`}
            >
              Completed ({summaryStats.totalCompletedCount})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search voyage, port, locode, cargo..."
              className="w-full bg-slate-50 border border-slate-200 pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#0A2540]"
            />
          </div>
        </div>

        {/* Active Date Filter Notice */}
        {selectedCalendarDateStr && (
          <div className="bg-cyan-50 border border-cyan-200 p-2.5 flex items-center justify-between text-xs font-mono text-cyan-900">
            <span>Filtered by calendar date: <strong>{selectedCalendarDateStr}</strong></span>
            <button
              onClick={() => setSelectedCalendarDateStr(null)}
              className="text-cyan-700 hover:underline font-bold cursor-pointer"
            >
              Clear Date Filter
            </button>
          </div>
        )}

        {/* Structured Table of Port-to-Port Voyages */}
        <div className="overflow-x-auto border border-slate-200">
          <table className="w-full text-left font-mono text-xs border-collapse">
            <thead>
              <tr className="bg-[#0A2540] text-white text-[10px] uppercase font-bold tracking-wider">
                <th className="p-3 border-r border-slate-700">Voyage ID</th>
                <th className="p-3 border-r border-slate-700">Status</th>
                <th className="p-3 border-r border-slate-700">Departure Port (ETD / ATD)</th>
                <th className="p-3 border-r border-slate-700">Arrival Port (ETA / ATA)</th>
                <th className="p-3 border-r border-slate-700">Cargo &amp; Quantity</th>
                <th className="p-3 border-r border-slate-700">Distance / Speed</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {filteredVoyages.map((v) => {
                const badge = getStatusBadge(v.status);
                const steamingHrs = v.avgSpeedKts > 0 ? (v.distanceNm / v.avgSpeedKts).toFixed(0) : "—";

                return (
                  <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-extrabold text-[#0A2540] border-r border-slate-200">
                      <div className="flex items-center gap-1.5">
                        <Navigation className="w-3.5 h-3.5 text-[#00A86B]" />
                        <span>{v.voyageNumber}</span>
                      </div>
                    </td>

                    <td className="p-3 border-r border-slate-200">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold uppercase border ${badge.bg}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                        {badge.label}
                      </span>
                    </td>

                    <td className="p-3 border-r border-slate-200">
                      <div className="font-bold text-slate-900 flex items-center gap-1">
                        <span>{v.departurePort.flag || "⚓"}</span>
                        <span>{v.departurePort.name}</span>
                        <span className="text-[10px] text-slate-400">({v.departurePort.locode})</span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        ETD: {v.etd.replace("T", " ")}
                        {v.atd && <span className="text-emerald-700 font-semibold ml-1">· ATD: {v.atd.replace("T", " ")}</span>}
                      </div>
                    </td>

                    <td className="p-3 border-r border-slate-200">
                      <div className="font-bold text-slate-900 flex items-center gap-1">
                        <span>{v.arrivalPort.flag || "⚓"}</span>
                        <span>{v.arrivalPort.name}</span>
                        <span className="text-[10px] text-slate-400">({v.arrivalPort.locode})</span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        ETA: {v.eta.replace("T", " ")}
                        {v.ata && <span className="text-blue-700 font-semibold ml-1">· ATA: {v.ata.replace("T", " ")}</span>}
                      </div>
                    </td>

                    <td className="p-3 border-r border-slate-200">
                      <div className="font-semibold text-slate-800 line-clamp-1" title={v.cargoType}>
                        {v.cargoType}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-2">
                        <span>{v.cargoQuantity.toLocaleString()} {v.cargoUnit}</span>
                        <span className="px-1 py-0.2 bg-slate-100 border border-slate-200 text-[9px] uppercase font-bold text-slate-600">
                          {v.loadingStatus}
                        </span>
                      </div>
                    </td>

                    <td className="p-3 border-r border-slate-200">
                      <div className="font-bold text-slate-900">
                        {v.distanceNm.toLocaleString()} NM
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        @ {v.avgSpeedKts} kts (~{steamingHrs} hrs)
                      </div>
                    </td>

                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setViewingVoyage(v)}
                          className="p-1.5 text-slate-600 hover:text-[#0A2540] hover:bg-slate-100 cursor-pointer"
                          title="View Voyage Dossier"
                        >
                          <Navigation className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(v)}
                          className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-slate-100 cursor-pointer"
                          title="Edit Voyage Record"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setVoyageToDelete(v)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                          title="Delete Voyage"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredVoyages.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 font-mono text-xs">
                    No voyages found matching your query or filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. INTEGRATED VOYAGE CALENDAR VIEW */}
      <div className="bg-[#0F172A] border border-[#334155] p-5 shadow-lg space-y-4 font-mono text-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#334155]">
          <div>
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-black uppercase tracking-wider text-white">
                Integrated Voyage Schedule Calendar
              </h3>
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5">
              Visual departure, arrival, and deep-sea transit schedules matching ETD/ATD and ETA/ATA milestones.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={() => {
                const prev = new Date(calendarDate);
                prev.setMonth(prev.getMonth() - 1);
                setCalendarDate(prev);
              }}
              className="p-1.5 bg-[#1E293B] hover:bg-slate-700 border border-[#334155] text-white cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 bg-[#1E293B] border border-[#334155] font-bold text-white min-w-[130px] text-center">
              {currentMonthName}
            </span>
            <button
              onClick={() => {
                const next = new Date(calendarDate);
                next.setMonth(next.getMonth() + 1);
                setCalendarDate(next);
              }}
              className="p-1.5 bg-[#1E293B] hover:bg-slate-700 border border-[#334155] text-white cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCalendarDate(new Date())}
              className="px-2.5 py-1 bg-emerald-950 text-emerald-300 border border-emerald-500/60 font-bold uppercase text-[10px] hover:bg-emerald-900 cursor-pointer"
            >
              Today
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-[10px] text-slate-300">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-[#00A86B] rounded-none" />
            <span>Departure (ETD/ATD)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-[#0284C7] rounded-none" />
            <span>Arrival (ETA/ATA)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-amber-500/80 rounded-none" />
            <span>In-Transit Passage Day</span>
          </div>
          <div className="ml-auto text-[9px] text-slate-400">
            Click any calendar day to filter voyages
          </div>
        </div>

        {/* Calendar Grid */}
        <div>
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-bold uppercase text-slate-400 pb-2 border-b border-[#334155]">
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
            <div>Sun</div>
          </div>

          {/* Grid Cells */}
          <div className="grid grid-cols-7 gap-1.5 pt-1 text-xs">
            {calendarDays.map((day, idx) => {
              const isSelected = selectedCalendarDateStr === day.dateStr;
              const hasEvents = day.events.length > 0;

              return (
                <div
                  key={idx}
                  onClick={() => {
                    if (isSelected) {
                      setSelectedCalendarDateStr(null);
                    } else {
                      setSelectedCalendarDateStr(day.dateStr);
                    }
                  }}
                  className={`min-h-[85px] p-2 border transition-all cursor-pointer flex flex-col justify-between relative shadow-sm ${
                    isSelected
                      ? "bg-[#0B2545] border-cyan-400 ring-2 ring-cyan-400/60 z-10"
                      : day.isCurrentMonth
                      ? "bg-[#1E293B] border-[#334155] hover:bg-[#283548] text-slate-100"
                      : "bg-[#0B1220]/70 border-slate-900/60 text-slate-500"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[11px] font-bold ${
                      day.isToday
                        ? "w-5 h-5 bg-[#00A86B] text-white rounded-full flex items-center justify-center text-[10px]"
                        : day.isCurrentMonth ? "text-white" : "text-slate-500"
                    }`}>
                      {day.dayNumber}
                    </span>
                    {hasEvents && (
                      <span className="text-[9px] px-1 py-0.2 bg-[#0A2540] text-emerald-400 font-extrabold border border-emerald-500/40">
                        {day.events.length}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 mt-1 overflow-hidden">
                    {day.events.slice(0, 2).map((ev, eIdx) => {
                      const isDep = ev.type === "departure";
                      const isArr = ev.type === "arrival";

                      return (
                        <div
                          key={eIdx}
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewingVoyage(ev.voyage);
                          }}
                          className={`text-[9px] truncate px-1 py-0.5 border font-semibold cursor-pointer ${
                            isDep
                              ? "bg-emerald-950 text-emerald-300 border-emerald-500"
                              : isArr
                              ? "bg-blue-950 text-cyan-300 border-blue-500"
                              : "bg-slate-800 text-amber-300 border-amber-600/50"
                          }`}
                          title={`${ev.voyage.voyageNumber} · ${ev.type.toUpperCase()}`}
                        >
                          {isDep ? "🛫 " : isArr ? "⚓ " : "🚢 "}
                          {ev.voyage.voyageNumber}
                        </div>
                      );
                    })}
                    {day.events.length > 2 && (
                      <span className="text-[8px] text-slate-400 block font-bold">
                        +{day.events.length - 2} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. PORT-TO-PORT VOYAGE LOG FORM (CREATE / EDIT MODAL) */}
      <AnimatePresence>
        {isFormModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border-2 border-[#0A2540] shadow-2xl w-full max-w-2xl my-8 relative overflow-hidden font-mono text-xs"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-[#0A2540] text-white p-4 flex items-center justify-between border-b border-slate-700">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-[#00A86B] flex items-center justify-center text-white">
                    <Navigation className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-white">
                      {editingVoyage ? `Edit Voyage: ${editingVoyage.voyageNumber}` : "Log Port-to-Port Voyage"}
                    </h3>
                    <p className="text-[10px] text-emerald-400 font-mono">
                      SOLAS Chapter V Navigation &amp; Commercial Cargo Dossier
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsFormModalOpen(false)}
                  className="text-slate-400 hover:text-white p-1 cursor-pointer transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleSaveVoyage} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                {formError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Row 1: Voyage ID & Status */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                      Voyage Number / ID *
                    </label>
                    <input
                      type="text"
                      required
                      value={formVoyageNumber}
                      onChange={(e) => setFormVoyageNumber(e.target.value)}
                      placeholder="e.g. V.012-NORTH"
                      className="w-full bg-slate-50 border border-slate-300 p-2 font-bold text-slate-800 uppercase focus:outline-none focus:border-[#0A2540]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                      Voyage Status *
                    </label>
                    <select
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value as VoyageStatus)}
                      className="w-full bg-slate-50 border border-slate-300 p-2 font-bold text-slate-800 focus:outline-none focus:border-[#0A2540] cursor-pointer"
                    >
                      <option value="Planned">Planned</option>
                      <option value="In Transit">In Transit</option>
                      <option value="Completed">Completed</option>
                      <option value="Delayed">Delayed</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                      Quick Port Preset
                    </label>
                    <select
                      onChange={(e) => {
                        const port = POPULAR_WORLD_PORTS.find(p => p.locode === e.target.value);
                        if (port) {
                          setFormArrPortName(port.name);
                          setFormArrCountry(port.country);
                          setFormArrLocode(port.locode);
                        }
                      }}
                      className="w-full bg-slate-50 border border-slate-300 p-2 text-slate-700 focus:outline-none focus:border-[#0A2540] cursor-pointer"
                    >
                      <option value="">-- Quick Pick Dest. Port --</option>
                      {POPULAR_WORLD_PORTS.map(p => (
                        <option key={p.locode} value={p.locode}>{p.name} ({p.locode})</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Row 2: Departure Port Details */}
                <div className="p-3 bg-slate-50 border border-slate-200 space-y-2">
                  <span className="text-[10px] font-bold uppercase text-slate-600 flex items-center gap-1.5">
                    <Anchor className="w-3.5 h-3.5 text-[#00A86B]" />
                    Departure Port Specification
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[9px] uppercase text-slate-500 mb-0.5">Port Name *</label>
                      <input
                        type="text"
                        required
                        value={formDepPortName}
                        onChange={(e) => setFormDepPortName(e.target.value)}
                        placeholder="e.g. Port of Singapore"
                        className="w-full bg-white border border-slate-300 p-1.5 font-semibold text-slate-800 focus:outline-none focus:border-[#0A2540]"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] uppercase text-slate-500 mb-0.5">Country</label>
                      <input
                        type="text"
                        value={formDepCountry}
                        onChange={(e) => setFormDepCountry(e.target.value)}
                        placeholder="e.g. Singapore"
                        className="w-full bg-white border border-slate-300 p-1.5 text-slate-800 focus:outline-none focus:border-[#0A2540]"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] uppercase text-slate-500 mb-0.5">UN/LOCODE</label>
                      <input
                        type="text"
                        value={formDepLocode}
                        onChange={(e) => setFormDepLocode(e.target.value.toUpperCase())}
                        placeholder="e.g. SGSIN"
                        className="w-full bg-white border border-slate-300 p-1.5 font-bold text-slate-800 uppercase focus:outline-none focus:border-[#0A2540]"
                      />
                    </div>
                  </div>
                </div>

                {/* Row 3: Destination Port Details */}
                <div className="p-3 bg-slate-50 border border-slate-200 space-y-2">
                  <span className="text-[10px] font-bold uppercase text-slate-600 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-blue-600" />
                    Arrival / Destination Port Specification
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[9px] uppercase text-slate-500 mb-0.5">Port Name *</label>
                      <input
                        type="text"
                        required
                        value={formArrPortName}
                        onChange={(e) => setFormArrPortName(e.target.value)}
                        placeholder="e.g. Port of Tokyo"
                        className="w-full bg-white border border-slate-300 p-1.5 font-semibold text-slate-800 focus:outline-none focus:border-[#0A2540]"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] uppercase text-slate-500 mb-0.5">Country</label>
                      <input
                        type="text"
                        value={formArrCountry}
                        onChange={(e) => setFormArrCountry(e.target.value)}
                        placeholder="e.g. Japan"
                        className="w-full bg-white border border-slate-300 p-1.5 text-slate-800 focus:outline-none focus:border-[#0A2540]"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] uppercase text-slate-500 mb-0.5">UN/LOCODE</label>
                      <input
                        type="text"
                        value={formArrLocode}
                        onChange={(e) => setFormArrLocode(e.target.value.toUpperCase())}
                        placeholder="e.g. JPTYO"
                        className="w-full bg-white border border-slate-300 p-1.5 font-bold text-slate-800 uppercase focus:outline-none focus:border-[#0A2540]"
                      />
                    </div>
                  </div>
                </div>

                {/* Row 4: Dates & Chronometer (ETD, ATD, ETA, ATA) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                      ETD (Est. Departure) *
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={formEtd}
                      onChange={(e) => setFormEtd(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 p-1.5 text-slate-800 focus:outline-none focus:border-[#0A2540]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                      ATD (Actual Departure)
                    </label>
                    <input
                      type="datetime-local"
                      value={formAtd}
                      onChange={(e) => setFormAtd(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 p-1.5 text-slate-800 focus:outline-none focus:border-[#0A2540]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                      ETA (Est. Arrival) *
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={formEta}
                      onChange={(e) => setFormEta(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 p-1.5 text-slate-800 focus:outline-none focus:border-[#0A2540]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                      ATA (Actual Arrival)
                    </label>
                    <input
                      type="datetime-local"
                      value={formAta}
                      onChange={(e) => setFormAta(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 p-1.5 text-slate-800 focus:outline-none focus:border-[#0A2540]"
                    />
                  </div>
                </div>

                {/* Row 5: Cargo Details */}
                <div className="p-3 bg-slate-50 border border-slate-200 space-y-2">
                  <span className="text-[10px] font-bold uppercase text-slate-600 flex items-center gap-1.5">
                    <Box className="w-3.5 h-3.5 text-[#0A2540]" />
                    Cargo Details &amp; Loading Condition
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-[9px] uppercase text-slate-500 mb-0.5">Cargo Manifest Description</label>
                      <input
                        type="text"
                        value={formCargoType}
                        onChange={(e) => setFormCargoType(e.target.value)}
                        placeholder="e.g. Containerized Automotive & Electronics"
                        className="w-full bg-white border border-slate-300 p-1.5 font-semibold text-slate-800 focus:outline-none focus:border-[#0A2540]"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] uppercase text-slate-500 mb-0.5">Quantity &amp; Unit</label>
                      <div className="flex gap-1">
                        <input
                          type="number"
                          value={formCargoQuantity}
                          onChange={(e) => setFormCargoQuantity(Number(e.target.value))}
                          className="w-full bg-white border border-slate-300 p-1.5 text-slate-800 font-bold focus:outline-none"
                        />
                        <select
                          value={formCargoUnit}
                          onChange={(e) => setFormCargoUnit(e.target.value)}
                          className="bg-white border border-slate-300 text-xs px-1"
                        >
                          <option value="MT">MT</option>
                          <option value="TEU">TEU</option>
                          <option value="CBM">CBM</option>
                          <option value="BBL">BBL</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[9px] uppercase text-slate-500 mb-0.5">Loading Status</label>
                      <select
                        value={formLoadingStatus}
                        onChange={(e) => setFormLoadingStatus(e.target.value as CargoLoadingStatus)}
                        className="w-full bg-white border border-slate-300 p-1.5 text-slate-800 focus:outline-none cursor-pointer"
                      >
                        <option value="Loaded">Loaded</option>
                        <option value="In Ballast">In Ballast</option>
                        <option value="Partially Loaded">Partially Loaded</option>
                        <option value="Loading">Loading in Port</option>
                        <option value="Discharging">Discharging in Port</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Row 6: Distance & Speed */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                      Total Passage Distance (Nautical Miles) *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={formDistanceNm}
                      onChange={(e) => setFormDistanceNm(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-300 p-2 font-bold text-slate-800 focus:outline-none focus:border-[#0A2540]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                      Average Speed (Knots) *
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      min="1"
                      max="35"
                      value={formAvgSpeedKts}
                      onChange={(e) => setFormAvgSpeedKts(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-300 p-2 font-bold text-slate-800 focus:outline-none focus:border-[#0A2540]"
                    />
                    <span className="text-[9px] text-slate-400 mt-1 block">
                      Steaming Est: ~{formAvgSpeedKts > 0 ? (formDistanceNm / formAvgSpeedKts).toFixed(1) : 0} hrs (~{(formDistanceNm / (formAvgSpeedKts * 24)).toFixed(1)} days)
                    </span>
                  </div>
                </div>

                {/* Row 7: Remarks */}
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                    Operational Remarks &amp; Passage Directives
                  </label>
                  <textarea
                    rows={3}
                    value={formRemarks}
                    onChange={(e) => setFormRemarks(e.target.value)}
                    placeholder="Enter weather routing, pilotage notes, canal bookings, or special navigation directives..."
                    className="w-full bg-slate-50 border border-slate-300 p-2 text-slate-800 focus:outline-none focus:border-[#0A2540]"
                  />
                </div>

                {/* Modal Actions */}
                <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-[9px] text-slate-400">
                    Logged under SOLAS Chapter V Regulation 34
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsFormModalOpen(false)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold uppercase cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-[#0A2540] hover:bg-slate-800 text-white font-bold uppercase cursor-pointer shadow flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4 text-[#00A86B]" />
                      Save Voyage Record
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* VOYAGE DOSSIER INSPECT MODAL */}
      <AnimatePresence>
        {viewingVoyage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border-2 border-[#0A2540] shadow-2xl w-full max-w-xl p-6 relative font-mono text-xs space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <Navigation className="w-5 h-5 text-[#00A86B]" />
                  <div>
                    <h3 className="text-sm font-black text-[#0A2540] uppercase">
                      Voyage Dossier: {viewingVoyage.voyageNumber}
                    </h3>
                    <span className="text-[10px] text-slate-500">Official Shipboard Passage File</span>
                  </div>
                </div>
                <button onClick={() => setViewingVoyage(null)} className="text-slate-400 hover:text-slate-800 p-1 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200">
                <div>
                  <span className="text-[9px] uppercase text-slate-400 block font-bold">Departure Port</span>
                  <span className="font-extrabold text-[#0A2540] text-sm">
                    {viewingVoyage.departurePort.name} ({viewingVoyage.departurePort.locode})
                  </span>
                  <span className="text-[10px] text-slate-500 block">{viewingVoyage.departurePort.country}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase text-slate-400 block font-bold">Destination Port</span>
                  <span className="font-extrabold text-[#0A2540] text-sm">
                    {viewingVoyage.arrivalPort.name} ({viewingVoyage.arrivalPort.locode})
                  </span>
                  <span className="text-[10px] text-slate-500 block">{viewingVoyage.arrivalPort.country}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <div className="p-2 border border-slate-200 bg-white">
                  <span className="text-[8px] uppercase text-slate-400 block font-bold">Distance</span>
                  <span className="font-bold text-slate-900">{viewingVoyage.distanceNm.toLocaleString()} NM</span>
                </div>
                <div className="p-2 border border-slate-200 bg-white">
                  <span className="text-[8px] uppercase text-slate-400 block font-bold">Avg Speed</span>
                  <span className="font-bold text-emerald-700">{viewingVoyage.avgSpeedKts} kts</span>
                </div>
                <div className="p-2 border border-slate-200 bg-white">
                  <span className="text-[8px] uppercase text-slate-400 block font-bold">Cargo</span>
                  <span className="font-bold text-slate-900">{viewingVoyage.cargoQuantity.toLocaleString()} {viewingVoyage.cargoUnit}</span>
                </div>
                <div className="p-2 border border-slate-200 bg-white">
                  <span className="text-[8px] uppercase text-slate-400 block font-bold">Condition</span>
                  <span className="font-bold text-blue-700">{viewingVoyage.loadingStatus}</span>
                </div>
              </div>

              <div className="space-y-1.5 p-3 bg-slate-50 border border-slate-200 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">Estimated Departure (ETD):</span>
                  <span className="font-bold">{viewingVoyage.etd.replace("T", " ")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Actual Departure (ATD):</span>
                  <span className="font-bold text-emerald-700">{viewingVoyage.atd ? viewingVoyage.atd.replace("T", " ") : "Pending Departure"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Estimated Arrival (ETA):</span>
                  <span className="font-bold text-cyan-800">{viewingVoyage.eta.replace("T", " ")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Actual Arrival (ATA):</span>
                  <span className="font-bold text-blue-700">{viewingVoyage.ata ? viewingVoyage.ata.replace("T", " ") : "In Passage"}</span>
                </div>
              </div>

              {viewingVoyage.remarks && (
                <div className="p-3 bg-white border border-slate-200">
                  <span className="text-[9px] uppercase text-slate-400 block font-bold mb-1">Directives &amp; Remarks</span>
                  <p className="text-xs text-slate-700 leading-relaxed font-sans">{viewingVoyage.remarks}</p>
                </div>
              )}

              <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                <button
                  onClick={() => {
                    const toEdit = viewingVoyage;
                    setViewingVoyage(null);
                    handleOpenEditModal(toEdit);
                  }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold uppercase text-[10px] cursor-pointer"
                >
                  Edit Record
                </button>
                <button
                  onClick={() => setViewingVoyage(null)}
                  className="px-4 py-1.5 bg-[#0A2540] hover:bg-slate-800 text-white font-bold uppercase text-[10px] cursor-pointer"
                >
                  Close Dossier
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {voyageToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs font-mono text-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border-2 border-red-600 shadow-2xl w-full max-w-md p-6 relative space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 text-red-600 border-b border-slate-100 pb-3">
                <AlertCircle className="w-6 h-6" />
                <h3 className="font-extrabold uppercase text-sm text-[#0A2540]">
                  Confirm Voyage Deletion
                </h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Are you sure you want to permanently delete voyage record <strong>{voyageToDelete.voyageNumber}</strong> ({voyageToDelete.departurePort.name} → {voyageToDelete.arrivalPort.name})? This cannot be undone.
              </p>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => setVoyageToDelete(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold uppercase cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteVoyage}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold uppercase cursor-pointer shadow"
                >
                  Delete Voyage
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
