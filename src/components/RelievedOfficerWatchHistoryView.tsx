import React, { useState, useEffect, useMemo } from "react";
import { 
  History, 
  Search, 
  Filter, 
  ArrowRight, 
  CheckCircle2, 
  ShieldCheck, 
  Compass, 
  Clock, 
  User, 
  FileText, 
  Eye, 
  RotateCcw,
  Calendar,
  Waves,
  Gauge,
  Printer
} from "lucide-react";
export interface RelievedTelemetrySnapshot {
  seaCurrentKts?: number;
  seaCurrentDir?: string;
  seaCurrent?: string;
  waterDepthMeters?: number;
  waterDepth?: string;
  draftForwardMeters?: number;
  draftForward?: string;
  draftAftMeters?: number;
  draftAft?: string;
  vesselSpeedKts?: number;
  vesselSpeed?: string;
  vesselCourseDeg?: number;
  shipCourse?: string;
  latitude?: string;
  longitude?: string;
  position?: string;
  windSpeedKts?: number;
  windDirectionDeg?: number;
  windCardinal?: string;
  wind?: string;
  barometer?: string;
  timestamp?: string;
  loggedAt?: string;
}

export interface RelievedWatchRecord {
  id: string;
  originalWatchId: string;
  date: string;
  startTime: string;
  endTime: string;
  watchPeriodName: string;
  relievedOfficer: string; // The officer who was relieved
  incomingOfficer: string; // The incoming officer taking over
  handoverTimestamp: string;
  handoverRemarks: string;
  loggedHours: number;
  activities: string;
  preWatchTelemetry?: RelievedTelemetrySnapshot | any;
  postWatchTelemetry?: RelievedTelemetrySnapshot | any;
}

export const INITIAL_RELIEVED_HISTORY: RelievedWatchRecord[] = [
  {
    id: "rel-2026-09-26-0000",
    originalWatchId: "w-2026-09-26-0000",
    date: "2026-09-26",
    startTime: "00:00",
    endTime: "04:00",
    watchPeriodName: "00:00–04:00 Middle Watch (Grave Watch)",
    relievedOfficer: "3rd Officer (Third Mate) - Dmitry Ivanov",
    incomingOfficer: "Chief Officer - Mateo Rodriguez",
    handoverTimestamp: "2026-09-26 03:55 UTC",
    handoverRemarks: "Handover completed satisfactorily. Vessel on autopilot gyro 245°, clear horizon, CPA > 2.5 NM on all radar targets. Depth 1,420m.",
    loggedHours: 4,
    activities: "Night radar look-out maintained. Barometer stable at 1014 hPa. Target tracking verified via ARPA 1.",
    preWatchTelemetry: {
      seaCurrentKts: 1.2,
      seaCurrentDir: "260° WSW",
      waterDepthMeters: 1450,
      draftForwardMeters: 14.8,
      draftAftMeters: 15.2,
      vesselSpeedKts: 15.8,
      vesselCourseDeg: 245,
      latitude: "34° 02.40' N",
      longitude: "118° 29.70' W",
      windSpeedKts: 18,
      windDirectionDeg: 310,
      windCardinal: "NW",
      timestamp: "2026-09-26 00:05 UTC"
    },
    postWatchTelemetry: {
      seaCurrentKts: 1.3,
      seaCurrentDir: "262° WSW",
      waterDepthMeters: 1420,
      draftForwardMeters: 14.8,
      draftAftMeters: 15.2,
      vesselSpeedKts: 15.6,
      vesselCourseDeg: 245,
      latitude: "34° 08.20' N",
      longitude: "118° 39.40' W",
      windSpeedKts: 20,
      windDirectionDeg: 315,
      windCardinal: "NW",
      timestamp: "2026-09-26 03:52 UTC"
    }
  },
  {
    id: "rel-2026-09-26-0400",
    originalWatchId: "w-2026-09-26-0400",
    date: "2026-09-26",
    startTime: "04:00",
    endTime: "08:00",
    watchPeriodName: "04:00–08:00 Morning Watch",
    relievedOfficer: "Chief Officer - Mateo Rodriguez",
    incomingOfficer: "3rd Officer (Third Mate) - Dmitry Ivanov",
    handoverTimestamp: "2026-09-26 07:50 UTC",
    handoverRemarks: "Morning celestial twilight observations logged. Steering mode tested manual before morning traffic corridor entry. Master notified.",
    loggedHours: 4,
    activities: "Sunrise morning watch stood. Radio GMDSS safety routine check conducted. Bilge alarm test acknowledged.",
    preWatchTelemetry: {
      seaCurrentKts: 1.3,
      seaCurrentDir: "262° WSW",
      waterDepthMeters: 1420,
      draftForwardMeters: 14.8,
      draftAftMeters: 15.2,
      vesselSpeedKts: 15.6,
      vesselCourseDeg: 245,
      latitude: "34° 08.20' N",
      longitude: "118° 39.40' W",
      windSpeedKts: 20,
      windDirectionDeg: 315,
      windCardinal: "NW",
      timestamp: "2026-09-26 04:02 UTC"
    },
    postWatchTelemetry: {
      seaCurrentKts: 1.1,
      seaCurrentDir: "258° WSW",
      waterDepthMeters: 1380,
      draftForwardMeters: 14.8,
      draftAftMeters: 15.2,
      vesselSpeedKts: 16.0,
      vesselCourseDeg: 245,
      latitude: "34° 15.90' N",
      longitude: "118° 52.10' W",
      windSpeedKts: 16,
      windDirectionDeg: 300,
      windCardinal: "WNW",
      timestamp: "2026-09-26 07:48 UTC"
    }
  },
  {
    id: "rel-2026-09-26-1200",
    originalWatchId: "w-2026-09-26-1200",
    date: "2026-09-26",
    startTime: "12:00",
    endTime: "16:00",
    watchPeriodName: "12:00–16:00 Afternoon Watch",
    relievedOfficer: "2nd Officer (Second Mate) - Yuki Tanaka",
    incomingOfficer: "Chief Officer - Mateo Rodriguez",
    handoverTimestamp: "2026-09-26 15:52 UTC",
    handoverRemarks: "Passage plan waypoint WP-04 altered course to 248°. Clear visibility > 10 NM. Chart corrections up to date. Handed over in full compliance.",
    loggedHours: 4,
    activities: "Noon position report transmitted to company superintendent. ECDIS primary/secondary cross-check completed.",
    preWatchTelemetry: {
      seaCurrentKts: 0.9,
      seaCurrentDir: "250° WSW",
      waterDepthMeters: 1310,
      draftForwardMeters: 14.8,
      draftAftMeters: 15.2,
      vesselSpeedKts: 16.1,
      vesselCourseDeg: 245,
      latitude: "34° 22.10' N",
      longitude: "119° 06.30' W",
      windSpeedKts: 14,
      windDirectionDeg: 290,
      windCardinal: "WNW",
      timestamp: "2026-09-26 12:05 UTC"
    },
    postWatchTelemetry: {
      seaCurrentKts: 1.0,
      seaCurrentDir: "252° WSW",
      waterDepthMeters: 1280,
      draftForwardMeters: 14.8,
      draftAftMeters: 15.2,
      vesselSpeedKts: 16.0,
      vesselCourseDeg: 248,
      latitude: "34° 31.40' N",
      longitude: "119° 22.00' W",
      windSpeedKts: 15,
      windDirectionDeg: 295,
      windCardinal: "WNW",
      timestamp: "2026-09-26 15:50 UTC"
    }
  }
];

export function getStoredRelievedHistory(): RelievedWatchRecord[] {
  try {
    const saved = localStorage.getItem("sms_relieved_watch_history");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error("Error reading sms_relieved_watch_history", e);
  }
  return INITIAL_RELIEVED_HISTORY;
}

export function saveRelievedHistory(records: RelievedWatchRecord[]): void {
  try {
    localStorage.setItem("sms_relieved_watch_history", JSON.stringify(records));
  } catch (e) {
    console.error("Error saving sms_relieved_watch_history", e);
  }
}

interface RelievedOfficerWatchHistoryViewProps {
  onBackToCalendar?: () => void;
}

export default function RelievedOfficerWatchHistoryView({ onBackToCalendar }: RelievedOfficerWatchHistoryViewProps) {
  const [historyList, setHistoryList] = useState<RelievedWatchRecord[]>(() => getStoredRelievedHistory());
  const [searchQuery, setSearchQuery] = useState("");
  const [officerFilter, setOfficerFilter] = useState("all");
  const [selectedRecord, setSelectedRecord] = useState<RelievedWatchRecord | null>(null);

  // Synchronize history if crew changes occur and archive completed watches
  useEffect(() => {
    const handleHistoryUpdate = () => {
      setHistoryList(getStoredRelievedHistory());
    };
    window.addEventListener("sms_relieved_history_updated", handleHistoryUpdate);
    window.addEventListener("storage", handleHistoryUpdate);
    return () => {
      window.removeEventListener("sms_relieved_history_updated", handleHistoryUpdate);
      window.removeEventListener("storage", handleHistoryUpdate);
    };
  }, []);

  // Distinct officers in history
  const distinctOfficers = useMemo(() => {
    const set = new Set<string>();
    historyList.forEach(r => {
      if (r.relievedOfficer) set.add(r.relievedOfficer);
      if (r.incomingOfficer) set.add(r.incomingOfficer);
    });
    return Array.from(set);
  }, [historyList]);

  // Filtered records
  const filteredRecords = useMemo(() => {
    return historyList.filter(record => {
      const matchesSearch = 
        !searchQuery.trim() ||
        record.relievedOfficer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.incomingOfficer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.watchPeriodName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.handoverRemarks.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.date.includes(searchQuery);

      const matchesOfficer = 
        officerFilter === "all" ||
        record.relievedOfficer.toLowerCase().includes(officerFilter.toLowerCase()) ||
        record.incomingOfficer.toLowerCase().includes(officerFilter.toLowerCase());

      return matchesSearch && matchesOfficer;
    }).sort((a, b) => b.handoverTimestamp.localeCompare(a.handoverTimestamp));
  }, [historyList, searchQuery, officerFilter]);

  const totalRelievedHours = useMemo(() => {
    return historyList.reduce((acc, r) => acc + (r.loggedHours || 4), 0);
  }, [historyList]);

  return (
    <div className="space-y-5">
      {/* Header HUD Banner */}
      <div className="bg-white border border-slate-200 p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#0A2540] flex items-center justify-center text-white shadow">
            <History className="w-5 h-5 text-[#00A86B]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-[#0A2540]">
                Relieved Officer Watch History & Handover Log
              </h2>
              <span className="text-[9px] px-1.5 py-0.2 bg-blue-50 text-blue-700 border border-blue-200 font-mono font-bold uppercase">
                STCW A-VIII/2 Compliant
              </span>
            </div>
            <p className="text-xs text-slate-500 font-sans mt-0.5">
              Preserved bridge duty records prior to watch relief. Historical hours and telemetry remain fully intact.
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="flex items-center gap-3">
          <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 text-right font-mono text-xs">
            <span className="text-[9px] uppercase text-slate-400 block font-bold">Preserved Handovers</span>
            <span className="text-sm font-black text-[#0A2540]">{historyList.length} Watches</span>
          </div>
          <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 text-right font-mono text-xs">
            <span className="text-[9px] uppercase text-slate-400 block font-bold">Total Stood Hours</span>
            <span className="text-sm font-black text-[#00A86B]">{totalRelievedHours} Hours</span>
          </div>
          {onBackToCalendar && (
            <button
              onClick={onBackToCalendar}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-mono font-bold uppercase border border-slate-300 cursor-pointer"
            >
              Back to Calendar
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder="Search officer, date, remarks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 pl-8 pr-3 py-1.5 text-xs text-slate-800 rounded-none focus:outline-none focus:bg-white focus:border-[#0A2540]"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-[10px] uppercase text-slate-400 font-bold shrink-0">Filter Officer:</span>
          <select
            value={officerFilter}
            onChange={(e) => setOfficerFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 font-bold focus:outline-none focus:bg-white"
          >
            <option value="all">All Officers ({historyList.length})</option>
            {distinctOfficers.map(off => (
              <option key={off} value={off}>{off}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table & Cards of Preserved Handover Watches */}
      <div className="space-y-3">
        {filteredRecords.length === 0 ? (
          <div className="bg-white border border-slate-200 p-8 text-center text-slate-400 font-mono text-xs">
            No relieved officer watch records match your search filter.
          </div>
        ) : (
          filteredRecords.map((record) => (
            <div 
              key={record.id}
              className="bg-white border border-slate-200 p-4 shadow-sm hover:border-slate-300 transition-colors"
            >
              {/* Top Row: Watch Period & Timestamp */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-[#0A2540] text-white font-mono text-[10px] font-bold">
                    {record.date} • {record.startTime}–{record.endTime}
                  </span>
                  <span className="text-xs font-bold text-slate-800 uppercase">
                    {record.watchPeriodName}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-emerald-50 text-[#00A86B] border border-emerald-200 font-bold">
                    {record.loggedHours} hrs logged
                  </span>
                </div>

                <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Handover Relieved At: <strong className="text-slate-700">{record.handoverTimestamp}</strong></span>
                </div>
              </div>

              {/* Middle Row: Relieved Officer -> Incoming Officer Transition */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 py-3 items-center">
                {/* Relieved Officer */}
                <div className="md:col-span-5 bg-amber-50/60 border border-amber-200 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-mono uppercase font-bold text-amber-800">
                      Relieved Officer (Off Duty)
                    </span>
                    <span className="text-[8px] px-1.5 bg-amber-200/60 text-amber-900 font-mono font-bold uppercase">
                      Duty Preserved
                    </span>
                  </div>
                  <div className="mt-1 font-bold text-xs text-slate-900 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-amber-700" />
                    <span>{record.relievedOfficer}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-1">
                    Certified hours credited strictly to this officer.
                  </div>
                </div>

                {/* Handover Icon Indicator */}
                <div className="md:col-span-2 flex flex-col items-center justify-center text-center">
                  <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-600">
                    <ArrowRight className="w-4 h-4 text-[#00A86B]" />
                  </div>
                  <span className="text-[8px] font-mono font-bold uppercase text-slate-400 mt-1">
                    Relieved By
                  </span>
                </div>

                {/* Incoming Officer */}
                <div className="md:col-span-5 bg-emerald-50/60 border border-emerald-200 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-mono uppercase font-bold text-emerald-800">
                      Incoming Officer (Taking Over Bridge)
                    </span>
                    <span className="text-[8px] px-1.5 bg-emerald-200/60 text-emerald-900 font-mono font-bold uppercase">
                      New OOW
                    </span>
                  </div>
                  <div className="mt-1 font-bold text-xs text-slate-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#00A86B]" />
                    <span>{record.incomingOfficer}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-1">
                    Assumed navigation command and look-out responsibilities.
                  </div>
                </div>
              </div>

              {/* Bottom Row: Handover Remarks & Telemetry Summary */}
              <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="text-slate-600 font-sans text-xs flex-1">
                  <strong className="text-slate-800 font-mono text-[10px] uppercase">Handover Remarks: </strong>
                  <span>{record.handoverRemarks}</span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {record.postWatchTelemetry && (
                    <button
                      onClick={() => setSelectedRecord(record)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 text-[10px] font-mono font-bold uppercase cursor-pointer flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5 text-[#00A86B]" />
                      <span>View Handover Telemetry</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal to View Preserved Handover Details & Telemetry */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs">
          <div className="bg-white border border-slate-300 shadow-2xl w-full max-w-2xl relative p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#00A86B]" />
                <h3 className="text-xs font-black uppercase tracking-wider text-[#0A2540]">
                  Official Watch Handover & Telemetry Certificate
                </h3>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="text-slate-400 hover:text-slate-700 font-mono text-xs font-bold"
              >
                ✕ Close
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs font-mono bg-slate-50 p-3 border border-slate-200">
              <div>
                <span className="text-[9px] uppercase text-slate-400 block font-bold">Relieved Officer</span>
                <span className="font-bold text-[#0A2540]">{selectedRecord.relievedOfficer}</span>
              </div>
              <div>
                <span className="text-[9px] uppercase text-slate-400 block font-bold">Relieving Incoming Officer</span>
                <span className="font-bold text-[#00A86B]">{selectedRecord.incomingOfficer}</span>
              </div>
              <div>
                <span className="text-[9px] uppercase text-slate-400 block font-bold">Watch Period</span>
                <span>{selectedRecord.date} • {selectedRecord.watchPeriodName}</span>
              </div>
              <div>
                <span className="text-[9px] uppercase text-slate-400 block font-bold">Official Handover Timestamp</span>
                <span>{selectedRecord.handoverTimestamp}</span>
              </div>
            </div>

            {/* Handover Directives */}
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase text-slate-500 font-bold">Handover Remarks & Navigational Orders:</span>
              <p className="text-xs text-slate-700 bg-slate-50 p-3 border border-slate-200 leading-relaxed font-sans">
                {selectedRecord.handoverRemarks}
              </p>
            </div>

            {/* Telemetry Comparison Table */}
            {selectedRecord.postWatchTelemetry && (
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono uppercase text-slate-500 font-bold">
                  Telemetry Readings at Handover:
                </span>
                <div className="border border-slate-200 overflow-hidden text-[11px] font-mono">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 text-[9px] text-slate-500 uppercase">
                      <tr>
                        <th className="p-2">Parameter</th>
                        <th className="p-2">Start Watch (Pre)</th>
                        <th className="p-2">Handover (Post)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      <tr>
                        <td className="p-2 font-bold">Course / Heading</td>
                        <td className="p-2">
                          {selectedRecord.preWatchTelemetry?.shipCourse ||
                            (selectedRecord.preWatchTelemetry?.vesselCourseDeg != null
                              ? `${selectedRecord.preWatchTelemetry.vesselCourseDeg}°`
                              : "—")}
                        </td>
                        <td className="p-2 font-bold text-slate-900">
                          {selectedRecord.postWatchTelemetry?.shipCourse ||
                            (selectedRecord.postWatchTelemetry?.vesselCourseDeg != null
                              ? `${selectedRecord.postWatchTelemetry.vesselCourseDeg}°`
                              : "—")}
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2 font-bold">Speed (SOG/STW)</td>
                        <td className="p-2">
                          {selectedRecord.preWatchTelemetry?.vesselSpeed ||
                            (selectedRecord.preWatchTelemetry?.vesselSpeedKts != null
                              ? `${selectedRecord.preWatchTelemetry.vesselSpeedKts} kts`
                              : "—")}
                        </td>
                        <td className="p-2 font-bold text-slate-900">
                          {selectedRecord.postWatchTelemetry?.vesselSpeed ||
                            (selectedRecord.postWatchTelemetry?.vesselSpeedKts != null
                              ? `${selectedRecord.postWatchTelemetry.vesselSpeedKts} kts`
                              : "—")}
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2 font-bold">Position (Lat / Long)</td>
                        <td className="p-2">
                          {selectedRecord.preWatchTelemetry?.position ||
                            (selectedRecord.preWatchTelemetry?.latitude != null
                              ? `${selectedRecord.preWatchTelemetry.latitude} / ${selectedRecord.preWatchTelemetry.longitude}`
                              : "—")}
                        </td>
                        <td className="p-2 font-bold text-slate-900">
                          {selectedRecord.postWatchTelemetry?.position ||
                            (selectedRecord.postWatchTelemetry?.latitude != null
                              ? `${selectedRecord.postWatchTelemetry.latitude} / ${selectedRecord.postWatchTelemetry.longitude}`
                              : "—")}
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2 font-bold">Water Depth (Echo Sounder)</td>
                        <td className="p-2">
                          {selectedRecord.preWatchTelemetry?.waterDepth ||
                            (selectedRecord.preWatchTelemetry?.waterDepthMeters != null
                              ? `${selectedRecord.preWatchTelemetry.waterDepthMeters} m`
                              : "—")}
                        </td>
                        <td className="p-2 font-bold text-slate-900">
                          {selectedRecord.postWatchTelemetry?.waterDepth ||
                            (selectedRecord.postWatchTelemetry?.waterDepthMeters != null
                              ? `${selectedRecord.postWatchTelemetry.waterDepthMeters} m`
                              : "—")}
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2 font-bold">Ship Draft (Fwd / Aft)</td>
                        <td className="p-2">
                          {selectedRecord.preWatchTelemetry?.draftForward
                            ? `${selectedRecord.preWatchTelemetry.draftForward} / ${selectedRecord.preWatchTelemetry.draftAft}`
                            : selectedRecord.preWatchTelemetry?.draftForwardMeters != null
                            ? `${selectedRecord.preWatchTelemetry.draftForwardMeters}m / ${selectedRecord.preWatchTelemetry.draftAftMeters}m`
                            : "—"}
                        </td>
                        <td className="p-2 font-bold text-slate-900">
                          {selectedRecord.postWatchTelemetry?.draftForward
                            ? `${selectedRecord.postWatchTelemetry.draftForward} / ${selectedRecord.postWatchTelemetry.draftAft}`
                            : selectedRecord.postWatchTelemetry?.draftForwardMeters != null
                            ? `${selectedRecord.postWatchTelemetry.draftForwardMeters}m / ${selectedRecord.postWatchTelemetry.draftAftMeters}m`
                            : "—"}
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2 font-bold">Wind & Sea Current</td>
                        <td className="p-2">
                          {selectedRecord.preWatchTelemetry?.wind ||
                            (selectedRecord.preWatchTelemetry?.windSpeedKts != null
                              ? `${selectedRecord.preWatchTelemetry.windSpeedKts} kts ${selectedRecord.preWatchTelemetry.windCardinal || ""}`
                              : "—")}
                        </td>
                        <td className="p-2 font-bold text-slate-900">
                          {selectedRecord.postWatchTelemetry?.wind ||
                            (selectedRecord.postWatchTelemetry?.windSpeedKts != null
                              ? `${selectedRecord.postWatchTelemetry.windSpeedKts} kts ${selectedRecord.postWatchTelemetry.windCardinal || ""}`
                              : "—")}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-2 bg-[#0A2540] text-white text-xs font-mono font-bold uppercase cursor-pointer"
              >
                Close Certificate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
