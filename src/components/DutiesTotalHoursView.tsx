import React, { useState, useEffect, useMemo } from "react";
import { 
  Clock, 
  UserCheck, 
  Calendar as CalendarIcon, 
  Award, 
  FileText, 
  ChevronLeft, 
  ChevronRight, 
  Filter, 
  CheckCircle2, 
  Printer, 
  ShieldCheck,
  Ship,
  TrendingUp,
  SlidersHorizontal,
  CalendarDays,
  Hourglass
} from "lucide-react";
import { WatchEntry } from "./BridgeWatchkeeping";
import { isMasterRank, getOfficerRole } from "../utils/bridgeCrewSync";
import { 
  getStoredUserProfile, 
  calculateSignOffDate, 
  getRemainingContractDays 
} from "../types/userProfile";

interface DutiesTotalHoursViewProps {
  watchEntries: WatchEntry[];
  personalIdentity: string;
  onFilterByOfficer?: (officerName: string) => void;
}

// Helper to determine the actual Officer on Watch (OOW) from team.oow
// Strictly ignores chiefOfficerName and chiefOfficerAssignment so C/O is never credited for assigning watches
// SGM/STCW Compliance: Master is excluded as Master does not stand routine watches.
export function getOfficerKeyFromOow(rawOow?: string): "chief" | "second" | "third" | "other" {
  if (!rawOow || typeof rawOow !== "string") return "other";
  const l = rawOow.toLowerCase().trim();

  // Master (Captain) has overall vessel command 24/7 and is NEVER an OOW
  if (isMasterRank(rawOow)) return "other";

  const role = getOfficerRole(rawOow);
  if (role === "chief_officer") return "chief";
  if (role === "second_officer") return "second";
  if (role === "third_officer") return "third";

  // Chief Officer (Chief Mate) fallback checks
  const isChief = (l.includes("chief") || l.includes("c/o") || l.includes("first mate") || l.includes("rodriguez")) &&
                  !l.includes("2nd") && !l.includes("second") && !l.includes("3rd") && !l.includes("third");
  if (isChief) return "chief";

  // 2nd Officer (Second Mate) fallback checks
  const isSecond = (l.includes("2nd") || l.includes("second") || l.includes("2/o") || l.includes("tanaka")) &&
                   !l.includes("chief") && !l.includes("3rd") && !l.includes("third");
  if (isSecond) return "second";

  // 3rd Officer (Third Mate) fallback checks
  const isThird = (l.includes("3rd") || l.includes("third") || l.includes("3/o") || l.includes("ivanov")) &&
                  !l.includes("chief") && !l.includes("2nd") && !l.includes("second");
  if (isThird) return "third";

  return "other";
}

export default function DutiesTotalHoursView({
  watchEntries,
  personalIdentity
}: DutiesTotalHoursViewProps) {
  const [userProfile, setUserProfile] = useState(() => getStoredUserProfile());

  useEffect(() => {
    const handleProfileChange = () => {
      setUserProfile(getStoredUserProfile());
    };
    window.addEventListener("sms_user_profile_changed", handleProfileChange);
    window.addEventListener("storage", handleProfileChange);
    return () => {
      window.removeEventListener("sms_user_profile_changed", handleProfileChange);
      window.removeEventListener("storage", handleProfileChange);
    };
  }, []);

  // Dynamic Deck Crew sync from DEPARTMENTS & CREW
  const [deckCrewList, setDeckCrewList] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem("sms_crewList");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  useEffect(() => {
    const handleCrewChange = () => {
      try {
        const saved = localStorage.getItem("sms_crewList");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) setDeckCrewList(parsed);
        }
      } catch (e) {
        console.error(e);
      }
    };
    window.addEventListener("sms_crewList_changed", handleCrewChange);
    window.addEventListener("storage", handleCrewChange);
    return () => {
      window.removeEventListener("sms_crewList_changed", handleCrewChange);
      window.removeEventListener("storage", handleCrewChange);
    };
  }, []);

  const activeDeckOfficers = useMemo(() => {
    const deckCrew = deckCrewList.filter(m => m && (m.department === "Deck" || m.department === "deck"));
    const chief = deckCrew.find(m => {
      const r = (m.rank || "").toLowerCase();
      return (r.includes("chief") || r.includes("c/o") || r.includes("1st")) && !r.includes("master") && !r.includes("captain");
    });
    const second = deckCrew.find(m => {
      const r = (m.rank || "").toLowerCase();
      return (r.includes("second") || r.includes("2nd") || r.includes("2/o")) && !r.includes("master") && !r.includes("captain");
    });
    const third = deckCrew.find(m => {
      const r = (m.rank || "").toLowerCase();
      return (r.includes("third") || r.includes("3rd") || r.includes("3/o")) && !r.includes("master") && !r.includes("captain");
    });

    return {
      chiefName: chief?.name?.trim() || "Mateo Rodriguez",
      secondName: second?.name?.trim() || "Yuki Tanaka",
      thirdName: third?.name?.trim() || "Dmitry Ivanov"
    };
  }, [deckCrewList]);

  // Candidate selector for Sign-off Sea Service Total (defaults to current personalIdentity or "second")
  const [selectedCandidate, setSelectedCandidate] = useState<string>("candidate");
  // Selected Month for Monthly Duty Breakdown (default Sept 2026)
  const [selectedMonth, setSelectedMonth] = useState<string>("2026-09");
  const [selectedOfficerFilter, setSelectedOfficerFilter] = useState<string>("all");
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);

  // Month navigation helper
  const navigateMonth = (direction: -1 | 1) => {
    const [y, m] = selectedMonth.split("-").map(Number);
    const date = new Date(y, m - 1 + direction, 1);
    const nextY = date.getFullYear();
    const nextM = String(date.getMonth() + 1).padStart(2, "0");
    setSelectedMonth(`${nextY}-${nextM}`);
  };

  const monthLabel = useMemo(() => {
    const [y, m] = selectedMonth.split("-").map(Number);
    const date = new Date(y, m - 1, 1);
    return date.toLocaleString("en-US", { month: "long", year: "numeric" });
  }, [selectedMonth]);

  // Determine candidate officer matching logic for Sign-off card (Excludes Master completely)
  const candidateWatches = useMemo(() => {
    if (selectedCandidate === "all") {
      // Return watches served by licensed watchstanding deck officers (excludes Master)
      return watchEntries.filter(w => getOfficerKeyFromOow(w.team?.oow) !== "other");
    }
    if (selectedCandidate === "chief") {
      return watchEntries.filter(w => getOfficerKeyFromOow(w.team?.oow) === "chief");
    }
    if (selectedCandidate === "second") {
      return watchEntries.filter(w => getOfficerKeyFromOow(w.team?.oow) === "second");
    }
    if (selectedCandidate === "third") {
      return watchEntries.filter(w => getOfficerKeyFromOow(w.team?.oow) === "third");
    }
    // "candidate" (default) -> match personalIdentity strictly in team.oow
    return watchEntries.filter(w => {
      const oow = (w.team?.oow || "").toLowerCase();
      const p = personalIdentity.toLowerCase();
      return oow.includes(p) || p.includes(oow) || getOfficerKeyFromOow(w.team?.oow) === getOfficerKeyFromOow(personalIdentity);
    });
  }, [watchEntries, selectedCandidate, personalIdentity]);

  // 1. Sign-off Sea Service Total (Cumulative from very first duty log up to current/last duty before sign-off)
  const seaServiceTotal = useMemo(() => {
    if (candidateWatches.length === 0) {
      return {
        totalHours: 0,
        completedHours: 0,
        scheduledHours: 0,
        totalWatches: 0,
        completedWatches: 0,
        earliestDate: "—",
        latestDate: "—",
        seaDaysEquivalent: "0.0",
        fourHourWatchesEquivalent: 0
      };
    }

    const sorted = [...candidateWatches].sort((a, b) => a.date.localeCompare(b.date));
    const earliestDate = sorted[0].date;
    const latestDate = sorted[sorted.length - 1].date;

    const totalHours = candidateWatches.reduce((acc, curr) => acc + (curr.loggedHours || 4), 0);
    const completedList = candidateWatches.filter(w => w.status === "completed" || w.status === "handed_over");
    const completedHours = completedList.reduce((acc, curr) => acc + (curr.loggedHours || 4), 0);
    const scheduledList = candidateWatches.filter(w => w.status === "scheduled" || w.status === "active");
    const scheduledHours = scheduledList.reduce((acc, curr) => acc + (curr.loggedHours || 4), 0);

    // In maritime convention: 2 x 4h watches per day = 8h sea watch service = 1 Sea Day
    const seaDaysEquivalent = (totalHours / 8).toFixed(1);
    const fourHourWatchesEquivalent = Math.round(totalHours / 4);

    return {
      totalHours,
      completedHours,
      scheduledHours,
      totalWatches: candidateWatches.length,
      completedWatches: completedList.length,
      earliestDate,
      latestDate,
      seaDaysEquivalent,
      fourHourWatchesEquivalent
    };
  }, [candidateWatches]);

  // 2. Monthly Duty Total for selected month (based on filtered candidate watches)
  const monthlyDutyTotal = useMemo(() => {
    const monthWatches = candidateWatches.filter(w => w.date.startsWith(selectedMonth));
    const totalHours = monthWatches.reduce((acc, curr) => acc + (curr.loggedHours || 4), 0);
    const completedWatches = monthWatches.filter(w => w.status === "completed" || w.status === "handed_over");
    const completedHours = completedWatches.reduce((acc, curr) => acc + (curr.loggedHours || 4), 0);
    const scheduledWatches = monthWatches.filter(w => w.status === "scheduled");
    const scheduledHours = scheduledWatches.reduce((acc, curr) => acc + (curr.loggedHours || 4), 0);

    return {
      watchesCount: monthWatches.length,
      totalHours,
      completedHours,
      scheduledHours,
      completedCount: completedWatches.length,
      scheduledCount: scheduledWatches.length
    };
  }, [candidateWatches, selectedMonth]);

  // 3. Breakdown by Officer on Watch (Chief Officer, 2nd Officer, 3rd Officer)
  // SGM/STCW Compliance: Master is completely excluded as Master holds overall vessel command 24/7 and does not have a watch schedule.
  // Strictly calculated based on the actual OOW assigned to the shift; directives assigned by C/O do not transfer hours
  const officerBreakdown = useMemo(() => {
    const targets = [
      {
        id: "chief",
        title: "Chief Officer (Chief Mate)",
        name: activeDeckOfficers.chiefName,
        roleDesc: "04:00–08:00 & 16:00–20:00 Watches",
        key: "chief" as const
      },
      {
        id: "second",
        title: "2nd Officer (Second Mate)",
        name: activeDeckOfficers.secondName,
        roleDesc: "00:00–04:00 & 12:00–16:00 Watches",
        key: "second" as const
      },
      {
        id: "third",
        title: "3rd Officer (Third Mate)",
        name: activeDeckOfficers.thirdName,
        roleDesc: "08:00–12:00 & 20:00–00:00 Watches",
        key: "third" as const
      }
    ];

    const allHours = watchEntries.reduce((acc, curr) => acc + (curr.loggedHours || 4), 0);
    const grandTotalHours = Math.max(1, allHours);

    return targets.map(target => {
      // Strictly match where this officer served as the actual OOW
      const matchingWatches = watchEntries.filter(w => getOfficerKeyFromOow(w.team?.oow) === target.key);
      const totalHours = matchingWatches.reduce((acc, curr) => acc + (curr.loggedHours || 4), 0);
      const completed = matchingWatches.filter(w => w.status === "completed" || w.status === "handed_over");
      const scheduled = matchingWatches.filter(w => w.status === "scheduled" || w.status === "active");
      const percentOfTotal = Math.round((totalHours / grandTotalHours) * 100);

      return {
        ...target,
        watches: matchingWatches,
        totalHours,
        totalWatches: matchingWatches.length,
        completedHours: completed.reduce((acc, curr) => acc + (curr.loggedHours || 4), 0),
        scheduledHours: scheduled.reduce((acc, curr) => acc + (curr.loggedHours || 4), 0),
        percentOfTotal
      };
    });
  }, [watchEntries, activeDeckOfficers]);

  // Filtered log table based on officer filter - strictly checks getOfficerKeyFromOow(w.team?.oow)
  const tableWatches = useMemo(() => {
    let list = [...watchEntries];
    if (selectedOfficerFilter === "chief") {
      list = list.filter(w => getOfficerKeyFromOow(w.team?.oow) === "chief");
    } else if (selectedOfficerFilter === "second") {
      list = list.filter(w => getOfficerKeyFromOow(w.team?.oow) === "second");
    } else if (selectedOfficerFilter === "third") {
      list = list.filter(w => getOfficerKeyFromOow(w.team?.oow) === "third");
    }

    return list.sort((a, b) => b.date.localeCompare(a.date) || b.startTime.localeCompare(a.startTime));
  }, [watchEntries, selectedOfficerFilter]);

  // Contract Duration & Sea Duty Projections
  const contractDurationMonths = userProfile.contractDurationMonths || 12;
  const contractSignOn = userProfile.signOnDate || "2026-01-05";
  const contractSignOff = userProfile.signOffDate || calculateSignOffDate(contractSignOn, contractDurationMonths);
  const remainingContractDays = getRemainingContractDays(contractSignOff, undefined, contractSignOn);

  // STCW Watchkeeping formula: Standard OOW stands 2 x 4h watches per day = 8 watch hours per sea day
  const estimatedRemainingWatchHours = remainingContractDays * 8;
  const totalProjectedWatchHours = seaServiceTotal.totalHours + estimatedRemainingWatchHours;
  const totalProjectedSeaDays = (totalProjectedWatchHours / 8).toFixed(1);

  return (
    <div className="space-y-6">
      {/* 1. TOP CARDS: SIGN-OFF SEA SERVICE TOTAL, CONTRACT PROJECTION & MONTHLY DUTY TOTAL */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        
        {/* Card 1: Sign-off Sea Service Total */}
        <div className="bg-white border-2 border-[#0A2540] p-4 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50/50 rounded-bl-full pointer-events-none -mr-6 -mt-6" />
          <div>
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-[#00A86B]" />
                <h3 className="text-xs font-black text-[#0A2540] uppercase tracking-wider">
                  Sign-off Sea Service Total
                </h3>
              </div>
              <span className="text-[9px] font-mono font-bold bg-[#0A2540] text-white px-2 py-0.5 uppercase">
                STCW OOW
              </span>
            </div>

            {/* Candidate selector */}
            <div className="mt-2.5 flex items-center justify-between text-xs">
              <span className="text-[9px] font-mono text-slate-500 uppercase font-bold">Record For:</span>
              <select
                value={selectedCandidate}
                onChange={(e) => setSelectedCandidate(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-[11px] font-mono font-bold text-[#0A2540] px-1.5 py-0.5 focus:outline-none cursor-pointer max-w-[170px] truncate"
              >
                <option value="candidate">My Active Profile ({personalIdentity.split(" - ")[0]})</option>
                <option value="second">2nd Officer ({activeDeckOfficers.secondName})</option>
                <option value="third">3rd Officer ({activeDeckOfficers.thirdName})</option>
                <option value="chief">Chief Officer ({activeDeckOfficers.chiefName})</option>
                <option value="all">All Watchstanding Deck Officers Combined</option>
              </select>
            </div>

            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-black text-[#0A2540] tabular-nums font-mono">
                {seaServiceTotal.totalHours}
              </span>
              <span className="text-[10px] font-bold text-slate-500 uppercase font-mono">Verified OOW Hours</span>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-2.5 pt-2.5 border-t border-slate-100 text-xs font-mono">
              <div>
                <span className="text-[9px] text-slate-400 block uppercase">Equiv. Sea Days</span>
                <span className="font-bold text-slate-800 text-xs">{seaServiceTotal.seaDaysEquivalent} days</span>
                <span className="text-[8px] text-slate-400 block font-sans">(8h watch/day)</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-400 block uppercase">Duties Completed</span>
                <span className="font-bold text-[#00A86B] text-xs">
                  {seaServiceTotal.completedWatches} / {seaServiceTotal.totalWatches}
                </span>
                <span className="text-[8px] text-slate-400 block font-sans">({seaServiceTotal.completedHours}h logged)</span>
              </div>
            </div>
          </div>

          <div className="mt-3 bg-slate-50 border border-slate-200 p-1.5 text-[9px] font-mono text-slate-600 flex items-center justify-between">
            <span>Log Span:</span>
            <span className="font-bold text-[#0A2540] truncate ml-1">{seaServiceTotal.earliestDate} → {seaServiceTotal.latestDate}</span>
          </div>
        </div>

        {/* Card 2: Contract Days Remaining & Estimated Total Watch Hours Before Sign-Off */}
        <div className="bg-white border-2 border-emerald-600 p-4 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50/60 rounded-bl-full pointer-events-none -mr-6 -mt-6" />
          <div>
            <div className="flex items-center justify-between pb-2.5 border-b border-emerald-100">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-[#00A86B]" />
                <h3 className="text-xs font-black text-[#0A2540] uppercase tracking-wider">
                  Contract Sea Duty Sync
                </h3>
              </div>
              <span className="text-[9px] font-mono font-bold bg-emerald-600 text-white px-2 py-0.5 uppercase tracking-wide">
                Sign-Off Est.
              </span>
            </div>

            <div className="mt-2.5 flex items-baseline justify-between">
              <div>
                <span className="text-2xl font-black text-emerald-700 tabular-nums font-mono">
                  {remainingContractDays}
                </span>
                <span className="text-[10px] font-bold text-slate-500 uppercase font-mono ml-1.5">
                  Remaining Days
                </span>
              </div>
              <span className="text-[9px] font-mono px-1.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold uppercase">
                {contractDurationMonths} Mos Contract
              </span>
            </div>

            <div className="mt-2.5 bg-emerald-50/70 border border-emerald-200 p-2 text-xs font-mono space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-600 font-medium">Est. Hours to Sign-Off:</span>
                <span className="font-black text-emerald-800">
                  ~{estimatedRemainingWatchHours} hrs
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-500">
                <span>Watch Basis:</span>
                <span className="font-semibold text-slate-700">2 × 4h watches / day</span>
              </div>
              <div className="flex items-center justify-between text-[10px] border-t border-emerald-200/60 pt-1 text-slate-600">
                <span>Total Projected at Sign-Off:</span>
                <span className="font-black text-[#0A2540]">
                  ~{totalProjectedWatchHours} hrs ({totalProjectedSeaDays} days)
                </span>
              </div>
            </div>
          </div>

          <div className="mt-3 bg-slate-50 border border-slate-200 p-1.5 text-[9px] font-mono text-slate-600 flex items-center justify-between">
            <span className="text-slate-500">Window:</span>
            <span className="font-bold text-[#0A2540]">{contractSignOn} → {contractSignOff}</span>
          </div>
        </div>

        {/* Card 3: Monthly Duty Total */}
        <div className="bg-white border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-1.5">
                <CalendarIcon className="w-4 h-4 text-[#00A86B]" />
                <h3 className="text-xs font-black text-[#0A2540] uppercase tracking-wider">
                  Monthly Duty Total
                </h3>
              </div>

              {/* Month Switcher */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => navigateMonth(-1)}
                  className="p-1 border border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Previous Month"
                >
                  <ChevronLeft className="w-3 h-3 text-slate-600" />
                </button>
                <span className="text-[10px] font-mono font-bold text-slate-800 px-0.5 truncate max-w-[80px]">
                  {monthLabel.split(" ")[0].slice(0, 3)} {monthLabel.split(" ")[1]}
                </span>
                <button
                  onClick={() => navigateMonth(1)}
                  className="p-1 border border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Next Month"
                >
                  <ChevronRight className="w-3 h-3 text-slate-600" />
                </button>
              </div>
            </div>

            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-black text-[#00A86B] tabular-nums font-mono">
                {monthlyDutyTotal.totalHours}
              </span>
              <span className="text-[10px] font-bold text-slate-500 uppercase font-mono">Hours in {monthLabel}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-2.5 pt-2.5 border-t border-slate-100 text-xs font-mono">
              <div>
                <span className="text-[9px] text-slate-400 block uppercase">Completed</span>
                <span className="font-bold text-[#00A86B] text-xs">{monthlyDutyTotal.completedHours} hrs</span>
                <span className="text-[8px] text-slate-400 block font-sans">({monthlyDutyTotal.completedCount} duties)</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-400 block uppercase">Scheduled</span>
                <span className="font-bold text-slate-700 text-xs">{monthlyDutyTotal.scheduledHours} hrs</span>
                <span className="text-[8px] text-slate-400 block font-sans">({monthlyDutyTotal.scheduledCount} upcoming)</span>
              </div>
            </div>
          </div>

          <div className="mt-3 bg-emerald-50 border border-emerald-200 p-1.5 text-[9px] font-mono text-emerald-800 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-[#00A86B]" />
              <span>STCW Rest Margin:</span>
            </span>
            <span className="font-bold">Compliant (≥10h)</span>
          </div>
        </div>

        {/* Card 4: Discharge & Endorsement Status */}
        <div className="bg-white border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#0A2540]" />
                <h3 className="text-xs font-black text-[#0A2540] uppercase tracking-wider">
                  Sea Service Verification
                </h3>
              </div>
              <span className="text-[9px] font-mono text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 border border-emerald-200">
                Certified
              </span>
            </div>

            <div className="mt-2.5 p-2 bg-slate-50 border border-slate-200 space-y-1 text-[10px] font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500">Candidate:</span>
                <span className="font-bold text-[#0A2540] truncate max-w-[120px]">{personalIdentity.split(" - ")[1] || personalIdentity}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Rank:</span>
                <span className="font-semibold text-slate-800">{personalIdentity.split(" - ")[0]}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Regulation:</span>
                <span className="font-bold text-[#00A86B]">STCW I/11 & VIII/2</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowPrintModal(true)}
            className="w-full mt-3 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-[#0A2540] border border-slate-300 text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            Print STCW Certificate
          </button>
        </div>
      </div>

      {/* 2. BREAKDOWN BY OFFICER ON WATCH (STRICTLY SHIFT STOOD) */}
      <div className="bg-white border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-extrabold text-[#0A2540] uppercase tracking-wide flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-[#00A86B]" />
              Officer on Watch (OOW) Duty Hours Breakdown
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Watchkeeping hours are calculated <strong>strictly from the designated Officer on Watch (OOW)</strong> who stood the shift. Orders or directives issued by the Chief Officer or Master do <strong>not</strong> transfer or accumulate duty hours.
            </p>
          </div>
          <span className="text-[10px] font-mono text-slate-400 bg-slate-50 border border-slate-200 px-2 py-1">
            Independent OOW Accounting · STCW Reg. VIII/2
          </span>
        </div>

        {/* 3 Officer Cards Grid (Chief Officer, 2nd Officer, 3rd Officer) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {officerBreakdown.map(off => (
            <div
              key={off.id}
              onClick={() => setSelectedOfficerFilter(selectedOfficerFilter === off.id ? "all" : off.id)}
              className={`p-4 border transition-all cursor-pointer flex flex-col justify-between ${
                selectedOfficerFilter === off.id
                  ? "border-[#0A2540] bg-blue-50/40 ring-1 ring-[#0A2540]"
                  : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-1">
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block">
                      {off.title}
                    </span>
                    <h4 className="text-xs font-extrabold text-[#0A2540] mt-0.5">{off.name}</h4>
                    <span className="text-[9px] font-mono text-slate-500 block mt-0.5">{off.roleDesc}</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5">
                    {off.totalWatches} {off.totalWatches === 1 ? "duty" : "duties"}
                  </span>
                </div>

                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl font-black text-[#0A2540] font-mono">{off.totalHours}</span>
                  <span className="text-xs font-mono text-slate-500 font-bold uppercase">hours as OOW</span>
                </div>

                {/* Progress bar */}
                <div className="mt-2 w-full bg-slate-100 h-1.5 overflow-hidden">
                  <div
                    className="bg-[#00A86B] h-full transition-all duration-500"
                    style={{ width: `${Math.min(100, off.percentOfTotal)}%` }}
                  />
                </div>
                <div className="mt-1 flex justify-between text-[9px] font-mono text-slate-400">
                  <span>{off.percentOfTotal}% of total watch hours</span>
                  <span>{off.completedHours}h completed</span>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-mono text-slate-500">
                <span className="text-[#00A86B] font-bold">Shift Stood Only</span>
                <span className="text-[#0A2540] font-bold">{selectedOfficerFilter === off.id ? "Viewing Logs ↓" : "Filter Logs →"}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. DETAILED LOGBOOK SHEET */}
      <div className="bg-white border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#00A86B]" />
              <h3 className="text-xs font-black text-[#0A2540] uppercase tracking-wider">
                Chronological Watchkeeping Duty Records
              </h3>
              <span className="text-[10px] font-mono text-slate-400">
                ({tableWatches.length} {tableWatches.length === 1 ? "record" : "records"})
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-sans mt-0.5">
              Hours are exclusively credited to the Officer on Watch who served the shift, not to the officer who issued the directive.
            </p>
          </div>

          {/* Quick Officer Filter Buttons */}
          <div className="flex flex-wrap gap-1 text-[11px] font-mono">
            <button
              onClick={() => setSelectedOfficerFilter("all")}
              className={`px-2 py-0.5 border ${
                selectedOfficerFilter === "all" ? "bg-[#0A2540] text-white border-[#0A2540]" : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
              }`}
            >
              All Officers
            </button>
            <button
              onClick={() => setSelectedOfficerFilter("chief")}
              className={`px-2 py-0.5 border ${
                selectedOfficerFilter === "chief" ? "bg-[#0A2540] text-white border-[#0A2540]" : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
              }`}
            >
              Chief Officer (OOW)
            </button>
            <button
              onClick={() => setSelectedOfficerFilter("second")}
              className={`px-2 py-0.5 border ${
                selectedOfficerFilter === "second" ? "bg-[#0A2540] text-white border-[#0A2540]" : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
              }`}
            >
              2nd Officer (OOW)
            </button>
            <button
              onClick={() => setSelectedOfficerFilter("third")}
              className={`px-2 py-0.5 border ${
                selectedOfficerFilter === "third" ? "bg-[#0A2540] text-white border-[#0A2540]" : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
              }`}
            >
              3rd Officer (OOW)
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 font-mono text-[10px] text-slate-400 uppercase bg-slate-50/70">
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Watch Period</th>
                <th className="py-2.5 px-3">Officer on Watch (Served Shift)</th>
                <th className="py-2.5 px-3">Helmsman & Lookout</th>
                <th className="py-2.5 px-3">Directives / Assigned By</th>
                <th className="py-2.5 px-3 text-right">Duty Hours Credited</th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tableWatches.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 font-mono text-xs">
                    No watch duty entries found for selected officer filter.
                  </td>
                </tr>
              ) : (
                tableWatches.map(watch => (
                  <tr key={watch.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-slate-700 whitespace-nowrap">{watch.date}</td>
                    <td className="py-2.5 px-3 font-medium text-[#0A2540] whitespace-nowrap">
                      {watch.watchPeriodName}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="font-bold text-[#0A2540] block">{watch.team.oow}</span>
                      <span className="text-[9px] font-mono text-[#00A86B] font-bold">✓ Shift Served by OOW</span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 text-[11px] whitespace-nowrap">
                      <span>H: {watch.team.helmsman}</span>
                      <span className="text-slate-300 mx-1">|</span>
                      <span>L: {watch.team.lookout}</span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 text-[11px] max-w-xs" title={`${watch.chiefOfficerAssignment} (Assigned by: ${watch.chiefOfficerName || "Chief Officer"})`}>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono font-bold text-slate-700 truncate">
                          By: {watch.chiefOfficerName || "Chief Officer"}
                        </span>
                        <span className="text-[9px] font-mono bg-slate-100 text-slate-500 px-1 py-0.2 border border-slate-200 whitespace-nowrap">
                          Directive Only (0h to C/O)
                        </span>
                      </div>
                      <span className="truncate block text-slate-600 italic text-[10px] mt-0.5">
                        {watch.chiefOfficerAssignment || "—"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                      <span className="font-bold text-[#0A2540] block text-xs">+{watch.loggedHours}h</span>
                      <span className="text-[9px] text-slate-400 block truncate max-w-[130px]">
                        to {watch.team.oow.split(" - ")[0]}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`text-[9px] font-mono px-1.5 py-0.5 uppercase font-bold border ${
                        watch.status === "completed"
                          ? "bg-slate-100 text-slate-600 border-slate-200"
                          : watch.status === "active"
                            ? "bg-emerald-50 text-[#00A86B] border-emerald-200"
                            : "bg-blue-50 text-blue-700 border-blue-200"
                      }`}>
                        {watch.status.replace("_", " ")}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Print / Export Modal */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white border border-slate-300 p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Ship className="w-5 h-5 text-[#0A2540]" />
                <h4 className="text-sm font-extrabold text-[#0A2540] uppercase">
                  Official Sea Service Watchkeeping Extract
                </h4>
              </div>
              <button
                onClick={() => setShowPrintModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="my-4 p-4 border border-slate-200 bg-slate-50 space-y-3 text-xs font-mono">
              <div className="text-center pb-2 border-b border-slate-200">
                <h5 className="font-bold text-sm text-[#0A2540]">BRIDGE WATCHKEEPING CERTIFICATE OF SERVICE</h5>
                <p className="text-[10px] text-slate-500">In accordance with STCW 1978 as amended (Reg. VIII/1 & VIII/2)</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>Candidate: <strong>{personalIdentity}</strong></div>
                <div>Discharge Port: <strong>Singapore / In Passage</strong></div>
                <div>Log Span: <strong>{seaServiceTotal.earliestDate} to {seaServiceTotal.latestDate}</strong></div>
                <div>Total Watchkeeping Hours: <strong>{seaServiceTotal.totalHours} hrs</strong></div>
                <div>Equivalent Sea Watch Days: <strong>{seaServiceTotal.seaDaysEquivalent} days</strong></div>
                <div>Total Watch Duties: <strong>{seaServiceTotal.totalWatches} periods</strong></div>
              </div>

              <div className="pt-3 border-t border-slate-200 text-[10px] text-slate-500">
                I hereby certify that the above navigational bridge watchkeeping duties were performed under the direction of licensed Deck Officers and in full compliance with mandatory rest hour standards.
              </div>

              <div className="pt-4 flex justify-between items-end">
                <div className="border-t border-slate-400 pt-1 text-[10px] text-center w-40">
                  Officer on Watch / Candidate
                </div>
                <div className="border-t border-slate-400 pt-1 text-[10px] text-center w-40">
                  Master / Chief Officer
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowPrintModal(false)}
                className="px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-mono uppercase font-bold"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-1.5 bg-[#0A2540] text-white text-xs font-mono uppercase font-bold flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                Print Certificate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
