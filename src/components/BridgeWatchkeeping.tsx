import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Users, 
  User, 
  ShieldCheck, 
  Plus, 
  Edit3, 
  Trash2, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  Compass, 
  Sliders, 
  Eye, 
  Printer, 
  Check, 
  X, 
  Ship, 
  Sparkles,
  ArrowRight,
  Filter,
  Activity,
  RotateCcw,
  BarChart3,
  CalendarDays,
  Gauge,
  Waves,
  ChevronDown,
  ChevronUp,
  History,
  ArrowRightLeft
} from "lucide-react";
import DutiesTotalHoursView from "./DutiesTotalHoursView";
import RelievedOfficerWatchHistoryView, {
  RelievedWatchRecord,
  getStoredRelievedHistory,
  saveRelievedHistory
} from "./RelievedOfficerWatchHistoryView";
import { getStoredUserProfile, UserProfile } from "../types/userProfile";
import { 
  WatchTelemetryLog, 
  TelemetryFormModal, 
  TelemetryComparisonView 
} from "./WatchTelemetryModal";
import { 
  getOfficerRole, 
  isMasterRank, 
  syncDeckOfficersToBridgeWatches 
} from "../utils/bridgeCrewSync";
import { auth } from "../firebase";
import { syncWatchToFirestore, subscribeToFirestoreWatches } from "../utils/firestoreSync";

export type { WatchTelemetryLog };

// Helper to compute array of dates between two YYYY-MM-DD dates inclusive
export function getDatesInRange(startDateStr: string, endDateStr: string): string[] {
  const dates: string[] = [];
  const [sY, sM, sD] = startDateStr.split("-").map(Number);
  const [eY, eM, eD] = endDateStr.split("-").map(Number);
  const cur = new Date(sY, sM - 1, sD);
  const end = new Date(eY, eM - 1, eD);

  let count = 0;
  while (cur <= end && count < 180) {
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, "0");
    const d = String(cur.getDate()).padStart(2, "0");
    dates.push(`${y}-${m}-${d}`);
    cur.setDate(cur.getDate() + 1);
    count++;
  }
  return dates;
}

// Standard Maritime Watch Definitions
export interface MaritimeWatchPreset {
  name: string;
  code: string;
  startTime: string;
  endTime: string;
  description: string;
  hours: number;
}

export const MARITIME_WATCHES: MaritimeWatchPreset[] = [
  { name: "Middle Watch (Grave Watch)", code: "0000-0400", startTime: "00:00", endTime: "04:00", description: "Night watch through midnight. Critical radar & look-out vigilance.", hours: 4 },
  { name: "Morning Watch", code: "0400-0800", startTime: "04:00", endTime: "08:00", description: "Dawn watch, morning celestial sights, sunrise light transition.", hours: 4 },
  { name: "Forenoon Watch", code: "0800-1200", startTime: "08:00", endTime: "12:00", description: "Standard morning bridge duties, noon position calculation preparation.", hours: 4 },
  { name: "Afternoon Watch", code: "1200-1600", startTime: "12:00", endTime: "16:00", description: "Daytime passage navigation, traffic monitoring, chart corrections.", hours: 4 },
  { name: "First Dog Watch", code: "1600-1800", startTime: "16:00", endTime: "18:00", description: "First half of the dog watch to permit evening meal rotation.", hours: 2 },
  { name: "Last Dog Watch", code: "1800-2000", startTime: "18:00", endTime: "20:00", description: "Second half of the dog watch, dusk celestial fix & night prep.", hours: 2 },
  { name: "Dog Watches (Combined)", code: "1600-2000", startTime: "16:00", endTime: "20:00", description: "Full evening dog watch period.", hours: 4 },
  { name: "First Watch", code: "2000-0000", startTime: "20:00", endTime: "00:00", description: "Evening night watch, night orders review, darkened ship procedures.", hours: 4 }
];

export interface WatchTeam {
  oow: string; // Designated Officer on Watch
  helmsman: string; // Designated Helmsman (Rating)
  lookout: string; // Designated Lookout (Assistant/Rating)
}

export type WatchStatus = "scheduled" | "active" | "completed" | "handed_over";

export interface WatchEntry {
  id: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  watchPeriodName: string; // e.g. "08:00–12:00 Forenoon Watch"
  team: WatchTeam;
  chiefOfficerAssignment: string; // Chief Officer Directives / Orders
  chiefOfficerName: string;
  activities: string; // Operational remarks & activity log
  weatherConditions?: string; // Sea state, wind, visibility, barometer
  status: WatchStatus;
  loggedHours: number;
  isPersonalWatch?: boolean;
  preWatchTelemetry?: WatchTelemetryLog;
  postWatchTelemetry?: WatchTelemetryLog;
}

export interface DeckCrewRosterItem {
  rank: string;
  name: string;
  label: string;
  department: string;
}

// Function to fetch active Deck Department crew roster from localStorage or fallback
export function getActiveDeckRoster(): { officers: DeckCrewRosterItem[]; ratings: DeckCrewRosterItem[] } {
  let deckCrew: any[] = [];
  try {
    const saved = localStorage.getItem("sms_crewList");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        deckCrew = parsed.filter(m => m && (m.department === "Deck" || m.department === "deck"));
      }
    }
  } catch (e) {
    console.error("Error reading sms_crewList:", e);
  }

  // If no saved crew list exists, fallback to Deck department defaults matching the DEPARTMENTS & CREW module
  if (deckCrew.length === 0) {
    deckCrew = [
      { rank: "Master", name: "Capt. Alexander Sterling" },
      { rank: "Chief Officer", name: "Mateo Rodriguez" },
      { rank: "Second Officer", name: "Yuki Tanaka" },
      { rank: "Third Officer", name: "Dmitry Ivanov" },
      { rank: "Deck Cadet", name: "James Collins" },
      { rank: "Bosun", name: "Arnel Pineda" },
      { rank: "Able Seaman (AB)", name: "Esteban Santos" },
      { rank: "Ordinary Seaman (OS)", name: "Muhammad Ali" }
    ];
  }

  const officers: DeckCrewRosterItem[] = [];
  const ratings: DeckCrewRosterItem[] = [];

  // Keywords that qualify for licensed Deck Officers who stand routine watchkeeping shifts
  // Master is excluded because Master has overall vessel command and no watchkeeping schedule
  const officerKeywords = [
    "chief officer", "chief mate", "first mate", 
    "second officer", "2nd officer", "second mate", "2nd mate",
    "third officer", "3rd officer", "third mate", "3rd mate",
    "deck cadet", "navigation officer", "safety officer"
  ];

  // Strictly excluded ranks from Helmsman and Lookout (Officer ranks)
  const strictlyExcludedFromRatings = [
    "chief officer", "chief mate", "first mate",
    "second officer", "2nd officer", "second mate", "2nd mate",
    "third officer", "3rd officer", "third mate", "3rd mate",
    "master", "captain", "deck cadet"
  ];

  deckCrew.forEach(member => {
    const rawRank = (member.rank || "").trim();
    const rawName = (member.name || "").trim() || "Unassigned";
    const lowerRank = rawRank.toLowerCase();

    // Exclude Master / Captain from Bridge Watchkeeping list (Master has no routine schedule)
    if (isMasterRank(rawRank)) {
      return;
    }

    const isOfficer = officerKeywords.some(kw => lowerRank.includes(kw)) ||
                      lowerRank.includes("officer") || lowerRank.includes("mate");

    const isStrictlyExcludedRating = strictlyExcludedFromRatings.some(kw => lowerRank.includes(kw)) ||
                                     lowerRank.includes("officer") || lowerRank.includes("mate") || lowerRank.includes("master");

    const label = `${rawRank} - ${rawName}`;

    // 1. Officer on Watch (OOW): Populate with licensed Deck Officers only (Excludes Master)
    if (isOfficer) {
      officers.push({
        rank: rawRank,
        name: rawName,
        label,
        department: "Deck"
      });
    }

    // 2. Helmsman & Lookout: Filter dynamically to display ONLY non-officer Deck Ratings (Bosun, AB, OS, etc.)
    // Strictly EXCLUDES Chief Officer, 2nd Officer, and 3rd Officer (and Master)
    if (!isStrictlyExcludedRating) {
      ratings.push({
        rank: rawRank,
        name: rawName,
        label,
        department: "Deck"
      });
    }
  });

  // Guarantee standard ratings if empty
  if (ratings.length === 0) {
    ratings.push(
      { rank: "Bosun", name: "Arnel Pineda", label: "Bosun - Arnel Pineda", department: "Deck" },
      { rank: "Able Seaman (AB)", name: "Esteban Santos", label: "Able Seaman (AB) - Esteban Santos", department: "Deck" },
      { rank: "Ordinary Seaman (OS)", name: "Muhammad Ali", label: "Ordinary Seaman (OS) - Muhammad Ali", department: "Deck" }
    );
  }

  return { officers, ratings };
}

const DEFAULT_DECK_OFFICERS = [
  "2nd Officer (Second Mate) - Yuki Tanaka",
  "3rd Officer (Third Mate) - Dmitry Ivanov",
  "Chief Officer (Chief Mate) - Mateo Rodriguez",
  "Deck Cadet - James Collins"
];

const DEFAULT_HELMSMEN = [
  "AB-1 Esteban Santos",
  "AB-2 Arnel Pineda (Bosun)",
  "AB-3 Carlos Mendez",
  "OS Muhammad Ali"
];

const DEFAULT_LOOKOUTS = [
  "OS Muhammad Ali",
  "Deck Cadet James Collins",
  "AB-3 Carlos Mendez",
  "None (Single-Watch Day Condition)"
];

const CHIEF_OFFICER_TEMPLATES = [
  {
    title: "Open Ocean Passage Orders",
    text: "Maintain minimum CPA of 2.0nm for all commercial traffic. Conduct GPS cross-checks every 30 minutes. Log barometric pressure hourly. Report any visibility deterioration below 3nm immediately to Master."
  },
  {
    title: "Traffic Separation Scheme (TSS)",
    text: "Strict compliance with COLREGs Rule 10 (TSS). Keep continuous dual-radar watch (3cm X-Band & 10cm S-Band). Verify auto-pilot heading with magnetic compass deviation card every change of course. Standby manual steering if traffic density > 4 targets within 3nm."
  },
  {
    title: "Heavy Weather & Restricted Visibility",
    text: "Post dedicated forward lookout. Sound fog signal at statutory intervals if visibility < 2nm. Ensure deck deadlights secured. Check echo sounder in shallow waters. Maintain continuous VHF Ch 16 & AIS monitor."
  },
  {
    title: "Approaching Pilot Station / Port",
    text: "Notify engine room 1 hour prior to pilot boarding. Prepare port/starboard pilot ladder as requested by VTS. Test bridge telegraph, steering gear ahead/astern, and whistle. Check anchor windlass power."
  }
];

// Initial Realistic Seed Data centered around late Sept 2026
const INITIAL_WATCH_ENTRIES: WatchEntry[] = [
  {
    id: "w-2026-09-26-0000",
    date: "2026-09-26",
    startTime: "00:00",
    endTime: "04:00",
    watchPeriodName: "00:00–04:00 Middle Watch (Grave Watch)",
    team: {
      oow: "3rd Officer (Third Mate) - Dmitry Ivanov",
      helmsman: "AB-3 Carlos Mendez",
      lookout: "OS Muhammad Ali"
    },
    chiefOfficerAssignment: "Assigned by C/O Mateo Rodriguez: Maintain strict radar watch through Singapore Strait eastern approaches. Keep minimum CPA 2.0nm.",
    chiefOfficerName: "Mateo Rodriguez (Chief Officer)",
    activities: "Navigated through deep water route. Monitored 14 radar targets. All nav lights checked burning brightly.",
    weatherConditions: "Wind NE F3, Sea slight, Baro 1013 hPa, Vis 10nm",
    status: "completed",
    loggedHours: 4,
    isPersonalWatch: false,
    preWatchTelemetry: {
      seaCurrent: "0.8 kts / 075° ENE",
      waterDepth: "52.0 m (Echo Sounder)",
      draftForward: "14.85 m",
      draftAft: "15.45 m",
      vesselSpeed: "SOG 14.8 kts / STW 14.5 kts",
      shipCourse: "068° Gyro / 069° Mag",
      position: "01° 11.20' N, 103° 48.30' E",
      wind: "12 kts (Bft 4) / 050° NE",
      barometer: "1013.2 hPa",
      loggedAt: "2026-09-26 00:00 UTC",
      remarks: "Assumed middle watch. Radar tuned, Gyros synchronized.",
      loggedBy: "3rd Officer (Third Mate) - Dmitry Ivanov"
    },
    postWatchTelemetry: {
      seaCurrent: "1.1 kts / 080° ENE",
      waterDepth: "46.5 m (Echo Sounder)",
      draftForward: "14.85 m",
      draftAft: "15.42 m",
      vesselSpeed: "SOG 15.2 kts / STW 14.7 kts",
      shipCourse: "072° Gyro / 073° Mag",
      position: "01° 15.80' N, 103° 59.40' E",
      wind: "14 kts (Bft 4) / 045° NE",
      barometer: "1012.8 hPa",
      loggedAt: "2026-09-26 04:00 UTC",
      remarks: "Relieved by Chief Officer Mateo Rodriguez. All traffic clear.",
      loggedBy: "3rd Officer (Third Mate) - Dmitry Ivanov"
    }
  },
  {
    id: "w-2026-09-26-0400",
    date: "2026-09-26",
    startTime: "04:00",
    endTime: "08:00",
    watchPeriodName: "04:00–08:00 Morning Watch",
    team: {
      oow: "Chief Officer (Chief Mate) - Mateo Rodriguez",
      helmsman: "AB-2 Arnel Pineda (Bosun)",
      lookout: "Deck Cadet James Collins"
    },
    chiefOfficerAssignment: "Assigned by C/O Mateo Rodriguez: Morning celestial observations at nautical twilight. Supervise deck washdown preparation.",
    chiefOfficerName: "Mateo Rodriguez (Chief Officer)",
    activities: "Took morning star sights (Vega, Arcturus, Polaris) for gyro error check. Compass error 0.8° Low. Relieved by 2nd Officer.",
    weatherConditions: "Wind ENE F3, Sea slight, Baro 1013 hPa, Dawn twilight",
    status: "completed",
    loggedHours: 4,
    isPersonalWatch: false,
    preWatchTelemetry: {
      seaCurrent: "1.1 kts / 080° ENE",
      waterDepth: "46.5 m (Echo Sounder)",
      draftForward: "14.85 m",
      draftAft: "15.42 m",
      vesselSpeed: "SOG 15.2 kts / STW 14.7 kts",
      shipCourse: "072° Gyro / 073° Mag",
      position: "01° 15.80' N, 103° 59.40' E",
      wind: "14 kts (Bft 4) / 045° NE",
      barometer: "1012.8 hPa",
      loggedAt: "2026-09-26 04:00 UTC",
      remarks: "Morning watch taken over. Day signals prepared.",
      loggedBy: "Chief Officer (Chief Mate) - Mateo Rodriguez"
    },
    postWatchTelemetry: {
      seaCurrent: "1.3 kts / 085° ENE",
      waterDepth: "44.0 m (Echo Sounder)",
      draftForward: "14.82 m",
      draftAft: "15.40 m",
      vesselSpeed: "SOG 15.5 kts / STW 15.1 kts",
      shipCourse: "072° Gyro / 073° Mag",
      position: "01° 21.40' N, 104° 12.10' E",
      wind: "16 kts (Bft 4) / 040° NE",
      barometer: "1013.6 hPa",
      loggedAt: "2026-09-26 08:00 UTC",
      remarks: "Handed over to 2nd Officer. All deck machinery operational.",
      loggedBy: "Chief Officer (Chief Mate) - Mateo Rodriguez"
    }
  },
  {
    id: "w-2026-09-26-2000",
    date: "2026-09-26",
    startTime: "20:00",
    endTime: "00:00",
    watchPeriodName: "20:00–00:00 First Watch",
    team: {
      oow: "2nd Officer (Second Mate) - Yuki Tanaka",
      helmsman: "AB-1 Esteban Santos",
      lookout: "Deck Cadet James Collins"
    },
    chiefOfficerAssignment: "Assigned by C/O Mateo Rodriguez: Darken ship completely. Monitor traffic entering Malacca Strait. Keep CPA >= 2.0nm. Execute Master's Night Orders for 23:00 waypoint Bravo.",
    chiefOfficerName: "Mateo Rodriguez (Chief Officer)",
    activities: "Maintained visual and ARPA watch. Plotted GPS fixes on ECDIS every 15 min. Matched Gyro with Magnetic Compass (Dev +1.2°). Clean handover at 00:00 to relieving officer.",
    weatherConditions: "Wind NE F3, Sea state slight, Baro 1013 hPa, Visibility > 10nm",
    status: "completed",
    loggedHours: 4,
    isPersonalWatch: true,
    preWatchTelemetry: {
      seaCurrent: "1.0 kts / 082° ENE",
      waterDepth: "48.0 m (Echo Sounder)",
      draftForward: "14.80 m",
      draftAft: "15.40 m",
      vesselSpeed: "SOG 15.3 kts / STW 15.0 kts",
      shipCourse: "072° Gyro / 073° Mag",
      position: "01° 14.50' N, 103° 55.20' E",
      wind: "15 kts (Bft 4) / 045° NE",
      barometer: "1013.5 hPa",
      loggedAt: "2026-09-26 20:00 UTC",
      remarks: "Night orders read and signed. Look-out posted on bridge wings.",
      loggedBy: "2nd Officer (Second Mate) - Yuki Tanaka"
    },
    postWatchTelemetry: {
      seaCurrent: "1.4 kts / 088° E",
      waterDepth: "42.0 m (Echo Sounder)",
      draftForward: "14.78 m",
      draftAft: "15.38 m",
      vesselSpeed: "SOG 15.6 kts / STW 15.1 kts",
      shipCourse: "072° Gyro / 073° Mag",
      position: "01° 20.30' N, 104° 08.40' E",
      wind: "18 kts (Bft 5) / 050° NE",
      barometer: "1012.9 hPa",
      loggedAt: "2026-09-27 00:00 UTC",
      remarks: "Relieved by 3rd Officer. Parallel indexing verified on Horsburgh light.",
      loggedBy: "2nd Officer (Second Mate) - Yuki Tanaka"
    }
  },
  {
    id: "w-2026-09-27-0800",
    date: "2026-09-27",
    startTime: "08:00",
    endTime: "12:00",
    watchPeriodName: "08:00–12:00 Forenoon Watch",
    team: {
      oow: "2nd Officer (Second Mate) - Yuki Tanaka",
      helmsman: "AB-2 Arnel Pineda (Bosun)",
      lookout: "OS Muhammad Ali"
    },
    chiefOfficerAssignment: "Assigned by C/O Mateo Rodriguez: Supervise deck rust maintenance while maintaining full navigational look-out. Complete noon slip calculation. Monitor fuel oil transfer watch.",
    chiefOfficerName: "Mateo Rodriguez (Chief Officer)",
    activities: "Noon report compiled: Run distance 184 nm, Avg speed 15.3 kts. Handed over watch to relieving officer with gyro repeaters aligned.",
    weatherConditions: "Wind ENE F4, Sea state moderate, Baro 1014 hPa, Clear skies",
    status: "completed",
    loggedHours: 4,
    isPersonalWatch: true,
    preWatchTelemetry: {
      seaCurrent: "1.2 kts / 085° ENE",
      waterDepth: "45.0 m (Echo Sounder)",
      draftForward: "14.80 m",
      draftAft: "15.40 m",
      vesselSpeed: "SOG 15.4 kts / STW 15.0 kts",
      shipCourse: "072° Gyro / 073° Mag",
      position: "01° 18.20' N, 104° 02.10' E",
      wind: "17 kts (Bft 4) / 045° NE",
      barometer: "1014.2 hPa",
      loggedAt: "2026-09-27 08:00 UTC",
      remarks: "Assumed forenoon watch. Fire patrols logged.",
      loggedBy: "2nd Officer (Second Mate) - Yuki Tanaka"
    },
    postWatchTelemetry: {
      seaCurrent: "1.5 kts / 090° E",
      waterDepth: "38.5 m (Echo Sounder)",
      draftForward: "14.76 m",
      draftAft: "15.35 m",
      vesselSpeed: "SOG 15.8 kts / STW 15.2 kts",
      shipCourse: "075° Gyro / 076° Mag",
      position: "01° 24.80' N, 104° 16.50' E",
      wind: "19 kts (Bft 5) / 055° NE",
      barometer: "1013.8 hPa",
      loggedAt: "2026-09-27 12:00 UTC",
      remarks: "Noon position transmitted to charterers. Relieved by 3rd Officer.",
      loggedBy: "2nd Officer (Second Mate) - Yuki Tanaka"
    }
  },
  {
    id: "w-2026-09-27-1200",
    date: "2026-09-27",
    startTime: "12:00",
    endTime: "16:00",
    watchPeriodName: "12:00–16:00 Afternoon Watch",
    team: {
      oow: "2nd Officer (Second Mate) - Yuki Tanaka",
      helmsman: "AB-2 Arnel Pineda (Bosun)",
      lookout: "OS Muhammad Ali"
    },
    chiefOfficerAssignment: "Assigned by C/O Mateo Rodriguez: Afternoon navigational passage watch through Singapore Strait eastern precautionary area. Maintain 3cm/10cm dual radar parallel indexing.",
    chiefOfficerName: "Mateo Rodriguez (Chief Officer)",
    activities: "Maintained dual radar parallel indexing. Echo sounder recorded minimum UKC 7.2 meters. Handed over watch smoothly.",
    weatherConditions: "Wind ENE F4, Sea state moderate, Baro 1013 hPa, Clear visibility",
    status: "completed",
    loggedHours: 4,
    isPersonalWatch: true,
    preWatchTelemetry: {
      seaCurrent: "1.5 kts / 090° E",
      waterDepth: "38.5 m (Echo Sounder)",
      draftForward: "14.76 m",
      draftAft: "15.35 m",
      vesselSpeed: "SOG 15.8 kts / STW 15.2 kts",
      shipCourse: "075° Gyro / 076° Mag",
      position: "01° 24.80' N, 104° 16.50' E",
      wind: "19 kts (Bft 5) / 055° NE",
      barometer: "1013.8 hPa",
      loggedAt: "2026-09-27 12:00 UTC",
      remarks: "Assumed afternoon watch navigation duties.",
      loggedBy: "2nd Officer (Second Mate) - Yuki Tanaka"
    },
    postWatchTelemetry: {
      seaCurrent: "1.6 kts / 092° E",
      waterDepth: "35.0 m (Echo Sounder)",
      draftForward: "14.75 m",
      draftAft: "15.35 m",
      vesselSpeed: "SOG 15.6 kts / STW 15.1 kts",
      shipCourse: "072° Gyro / 073° Mag",
      position: "01° 26.10' N, 104° 18.90' E",
      wind: "18 kts (Bft 5) / 050° NE",
      barometer: "1012.7 hPa",
      loggedAt: "2026-09-27 16:00 UTC",
      remarks: "Clear of narrow channel. Relieved by duty bridge team.",
      loggedBy: "2nd Officer (Second Mate) - Yuki Tanaka"
    }
  },
  {
    id: "w-2026-09-27-2000",
    date: "2026-09-27",
    startTime: "20:00",
    endTime: "00:00",
    watchPeriodName: "20:00–00:00 First Watch",
    team: {
      oow: "3rd Officer (Third Mate) - Dmitry Ivanov",
      helmsman: "AB-1 Esteban Santos",
      lookout: "Deck Cadet James Collins"
    },
    chiefOfficerAssignment: "Assigned by C/O Mateo Rodriguez: Follow planned route track 072° True. Standby for TSS entry at 22:30. Take star azimuth fix at evening twilight.",
    chiefOfficerName: "Mateo Rodriguez (Chief Officer)",
    activities: "Active navigation watch in progress. Star sights recorded. Parallel indexing active on waypoint DELTA.",
    weatherConditions: "Wind E F4, Sea state moderate, Baro 1012 hPa, Good visibility",
    status: "active",
    loggedHours: 4,
    isPersonalWatch: false,
    preWatchTelemetry: {
      seaCurrent: "1.3 kts / 085° ENE",
      waterDepth: "42.0 m (Echo Sounder)",
      draftForward: "14.75 m",
      draftAft: "15.35 m",
      vesselSpeed: "SOG 15.5 kts / STW 15.0 kts",
      shipCourse: "072° Gyro / 073° Mag",
      position: "01° 26.40' N, 104° 19.80' E",
      wind: "18 kts (Bft 5) / 050° NE",
      barometer: "1012.4 hPa",
      loggedAt: "2026-09-27 20:00 UTC",
      remarks: "Initial pre-watch verified. Radar anti-clutter adjusted for sea chop.",
      loggedBy: "3rd Officer (Third Mate) - Dmitry Ivanov"
    }
  },
  {
    id: "w-2026-09-28-0800",
    date: "2026-09-28",
    startTime: "08:00",
    endTime: "12:00",
    watchPeriodName: "08:00–12:00 Forenoon Watch",
    team: {
      oow: "3rd Officer (Third Mate) - Dmitry Ivanov",
      helmsman: "AB-3 Carlos Mendez",
      lookout: "OS Muhammad Ali"
    },
    chiefOfficerAssignment: "Assigned by C/O Mateo Rodriguez: Inspect bridge wing gyro repeaters and fire detection cabinet. Ensure VHF watch on Channel 16 and VTS Sector 2.",
    chiefOfficerName: "Mateo Rodriguez (Chief Officer)",
    activities: "Pre-scheduled watch assignment.",
    weatherConditions: "Forecast: Fair weather, sea 1-2m",
    status: "scheduled",
    loggedHours: 4,
    isPersonalWatch: false
  },
  {
    id: "w-2026-09-28-2000",
    date: "2026-09-28",
    startTime: "20:00",
    endTime: "00:00",
    watchPeriodName: "20:00–00:00 First Watch",
    team: {
      oow: "3rd Officer (Third Mate) - Dmitry Ivanov",
      helmsman: "AB-1 Esteban Santos",
      lookout: "Deck Cadet James Collins"
    },
    chiefOfficerAssignment: "Assigned by C/O Mateo Rodriguez: Course alteration at 21:40 to 095° T. Call Master 30 minutes prior to passing Horsburgh Lighthouse.",
    chiefOfficerName: "Mateo Rodriguez (Chief Officer)",
    activities: "Scheduled night watch.",
    weatherConditions: "Forecast: NE 15-20 kts",
    status: "scheduled",
    loggedHours: 4,
    isPersonalWatch: false
  },
  {
    id: "w-2026-09-29-0800",
    date: "2026-09-29",
    startTime: "08:00",
    endTime: "12:00",
    watchPeriodName: "08:00–12:00 Forenoon Watch",
    team: {
      oow: "2nd Officer (Second Mate) - Yuki Tanaka",
      helmsman: "AB-2 Arnel Pineda (Bosun)",
      lookout: "Deck Cadet James Collins"
    },
    chiefOfficerAssignment: "Assigned by C/O Mateo Rodriguez: Test emergency steering telegraph with engine room at 10:00. Verify weekly chart updates on ECDIS.",
    chiefOfficerName: "Mateo Rodriguez (Chief Officer)",
    activities: "Scheduled forenoon watch.",
    weatherConditions: "Expected calm seas",
    status: "scheduled",
    loggedHours: 4,
    isPersonalWatch: true
  }
];

export default function BridgeWatchkeeping() {
  // Current Logged-in User Profile [ME / USER]
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile>(() => getStoredUserProfile());

  // Personal Watchkeeper Identity (Master excluded from routine watchkeeping)
  const [personalIdentity, setPersonalIdentity] = useState<string>(() => {
    const saved = localStorage.getItem("sms_personal_watchkeeper");
    if (saved && !isMasterRank(saved)) {
      return saved;
    }
    return "2nd Officer (Second Mate) - Yuki Tanaka";
  });

  // Toggle for dynamic syncing from Deck Department Crew List (defaults to true)
  const [syncCrewFromDeck, setSyncCrewFromDeck] = useState<boolean>(() => {
    const saved = localStorage.getItem("sms_sync_deck_crew");
    return saved !== null ? saved === "true" : true;
  });

  // Active Deck Department Crew Roster (Officers & Ratings - Master excluded)
  const [deckRoster, setDeckRoster] = useState(() => getActiveDeckRoster());

  // Relieved Officer Watch History Records
  const [relievedRecords, setRelievedRecords] = useState<RelievedWatchRecord[]>(() => getStoredRelievedHistory());
  const [relievingWatch, setRelievingWatch] = useState<WatchEntry | null>(null);
  const [incomingOfficerForRelief, setIncomingOfficerForRelief] = useState<string>("");
  const [reliefRemarks, setReliefRemarks] = useState<string>("");

  // Listen to crew updates from DEPARTMENTS & CREW module, user profile, or localStorage changes
  useEffect(() => {
    // Ensure initial sync of deck officers (C/O, 2/O, 3rd/O) and remove Master
    syncDeckOfficersToBridgeWatches();

    const handleRosterUpdate = () => {
      syncDeckOfficersToBridgeWatches();
      setDeckRoster(getActiveDeckRoster());
      try {
        const saved = localStorage.getItem("sms_bridge_personal_watches");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setWatchEntries(parsed);
          }
        }
      } catch (err) {
        console.error("Error reading saved watches externally", err);
      }
    };

    const handleUserProfileUpdate = (e: any) => {
      const p = e?.detail || getStoredUserProfile();
      setCurrentUserProfile(p);
      if (p.department === "Deck" && (
        p.rank.toLowerCase().includes("officer") ||
        p.rank.toLowerCase().includes("cadet")
      ) && !isMasterRank(p.rank)) {
        setPersonalIdentity(`${p.rank} - ${p.fullName}`);
      }
    };

    const handleWatchesExternalUpdate = () => {
      try {
        const saved = localStorage.getItem("sms_bridge_personal_watches");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setWatchEntries(parsed);
          }
        }
      } catch (err) {
        console.error("Error reading saved watches externally", err);
      }
    };

    const handleRelievedHistoryUpdate = () => {
      setRelievedRecords(getStoredRelievedHistory());
    };

    const unsubscribeAuth = auth.onAuthStateChanged(user => {
      if (user) {
        const saved = localStorage.getItem("sms_bridge_personal_watches");
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) {
              parsed.forEach(w => syncWatchToFirestore(w).catch(() => {}));
            }
          } catch (e) {}
        }
      }
    });

    window.addEventListener("sms_crewList_changed", handleRosterUpdate);
    window.addEventListener("sms_user_profile_changed", handleUserProfileUpdate);
    window.addEventListener("sms_bridge_watches_updated", handleWatchesExternalUpdate);
    window.addEventListener("sms_relieved_history_updated", handleRelievedHistoryUpdate);
    window.addEventListener("storage", handleRosterUpdate);

    return () => {
      unsubscribeAuth();
      window.removeEventListener("sms_crewList_changed", handleRosterUpdate);
      window.removeEventListener("sms_user_profile_changed", handleUserProfileUpdate);
      window.removeEventListener("sms_bridge_watches_updated", handleWatchesExternalUpdate);
      window.removeEventListener("sms_relieved_history_updated", handleRelievedHistoryUpdate);
      window.removeEventListener("storage", handleRosterUpdate);
    };
  }, []);

  // Watch Entries State with LocalStorage Persistence
  const [watchEntries, setWatchEntries] = useState<WatchEntry[]>(() => {
    try {
      const saved = localStorage.getItem("sms_bridge_personal_watches");
      if (!saved) {
        localStorage.setItem("sms_bridge_personal_watches", JSON.stringify(INITIAL_WATCH_ENTRIES));
      }
      syncDeckOfficersToBridgeWatches();
      const updated = localStorage.getItem("sms_bridge_personal_watches");
      if (updated) {
        const parsed = JSON.parse(updated);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error("Initial deck officer bridge sync failed:", e);
    }
    return INITIAL_WATCH_ENTRIES;
  });

  // Calendar View State: Current displayed month/year
  // Anchored to September 2026 per current simulation clock
  const [currentDate, setCurrentDate] = useState<Date>(() => {
    return new Date(2026, 8, 27); // Sept 27, 2026
  });

  // Selected date on calendar (defaults to today in simulated 2026 context)
  const [selectedDateStr, setSelectedDateStr] = useState<string>("2026-09-27");

  // Sub-Navigation Tab: "calendar_duty" | "duties_total_hours" | "relieved_history"
  const [activeSubTab, setActiveSubTab] = useState<"calendar_duty" | "duties_total_hours" | "relieved_history">("calendar_duty");

  // Filtering and Search states
  const [filterType, setFilterType] = useState<"all" | "selected_date" | "upcoming" | "active" | "completed" | "personal">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [viewMode, setViewMode] = useState<"calendar_split" | "table" | "handover_sheet">("calendar_split");

  // Modal States: Add & Edit
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showBatchDeleteModal, setShowBatchDeleteModal] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Telemetry Modal States: Pre-Watch Start, Post-Watch Handover, In-Watch Update & Side-by-Side Comparison
  const [telemetryModalState, setTelemetryModalState] = useState<{
    isOpen: boolean;
    mode: "pre_watch" | "post_watch" | "update";
    watchId: string;
  }>({
    isOpen: false,
    mode: "pre_watch",
    watchId: ""
  });
  const [viewingTelemetryWatch, setViewingTelemetryWatch] = useState<WatchEntry | null>(null);
  const [expandedTelemetryCardIds, setExpandedTelemetryCardIds] = useState<Set<string>>(new Set());

  const toggleTelemetryExpansion = (watchId: string) => {
    setExpandedTelemetryCardIds(prev => {
      const next = new Set(prev);
      if (next.has(watchId)) {
        next.delete(watchId);
      } else {
        next.add(watchId);
      }
      return next;
    });
  };

  // Multi-day recurring scheduling states for Add Modal
  const [scheduleMode, setScheduleMode] = useState<"single" | "range">("single");
  const [rangeEndDate, setRangeEndDate] = useState<string>("2026-10-05");

  // Form State for Adding / Editing Watch
  const [formData, setFormData] = useState<{
    id?: string;
    date: string;
    selectedPreset: string;
    startTime: string;
    endTime: string;
    watchPeriodName: string;
    oow: string;
    helmsman: string;
    lookout: string;
    chiefOfficerAssignment: string;
    chiefOfficerName: string;
    activities: string;
    weatherConditions: string;
    status: WatchStatus;
  }>({
    date: "2026-09-27",
    selectedPreset: "08:00–12:00 Forenoon Watch",
    startTime: "08:00",
    endTime: "12:00",
    watchPeriodName: "08:00–12:00 Forenoon Watch",
    oow: "2nd Officer (Second Mate) - Yuki Tanaka",
    helmsman: "AB-1 Esteban Santos",
    lookout: "Deck Cadet James Collins",
    chiefOfficerAssignment: "Assigned by C/O Mateo Rodriguez: Monitor safe CPA >= 2.0nm. Execute regular radar plotting.",
    chiefOfficerName: "Mateo Rodriguez (Chief Officer)",
    activities: "Routine navigational bridge watch. Logged compass error and GPS positions.",
    weatherConditions: "Wind NE F4, Sea state moderate, Baro 1014 hPa, Vis 10nm",
    status: "scheduled"
  });

  // Save to localStorage and sync to Firestore whenever watch entries change
  useEffect(() => {
    localStorage.setItem("sms_bridge_personal_watches", JSON.stringify(watchEntries));
    if (auth.currentUser) {
      watchEntries.forEach(w => {
        syncWatchToFirestore(w).catch(() => {});
      });
    }
  }, [watchEntries]);

  // Save personal identity
  useEffect(() => {
    localStorage.setItem("sms_personal_watchkeeper", personalIdentity);
  }, [personalIdentity]);

  const triggerNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification(null);
    }, 3500);
  };

  // Helper for Calendar Days Calculation
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days: Array<{
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      watches: WatchEntry[];
    }> = [];

    // Previous month padding days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevYear = month === 0 ? year - 1 : year;
      const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
      const dayWatches = watchEntries.filter(w => w.date === dateStr);
      days.push({
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: dateStr === "2026-09-27",
        watches: dayWatches
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
      const dayWatches = watchEntries.filter(w => w.date === dateStr);
      days.push({
        dateStr,
        dayNumber: i,
        isCurrentMonth: true,
        isToday: dateStr === "2026-09-27",
        watches: dayWatches
      });
    }

    // Next month padding days to complete grid (up to multiple of 7)
    const remainingDays = 42 - days.length; // 6 rows * 7 days
    if (remainingDays < 7 && remainingDays > 0) {
      for (let i = 1; i <= remainingDays; i++) {
        const nextMonth = month === 11 ? 0 : month + 1;
        const nextYear = month === 11 ? year + 1 : year;
        const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
        const dayWatches = watchEntries.filter(w => w.date === dateStr);
        days.push({
          dateStr,
          dayNumber: i,
          isCurrentMonth: false,
          isToday: dateStr === "2026-09-27",
          watches: dayWatches
        });
      }
    }

    return days;
  }, [currentDate, watchEntries]);

  // Month navigation
  const prevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const jumpToToday = () => {
    const today = new Date(2026, 8, 27);
    setCurrentDate(today);
    setSelectedDateStr("2026-09-27");
  };

  // Preset selector helper
  const handlePresetSelect = (presetCode: string) => {
    const preset = MARITIME_WATCHES.find(p => p.code === presetCode);
    if (preset) {
      const name = `${preset.startTime}–${preset.endTime} ${preset.name}`;
      setFormData(prev => ({
        ...prev,
        selectedPreset: preset.code,
        startTime: preset.startTime,
        endTime: preset.endTime,
        watchPeriodName: name
      }));
    }
  };

  // Open Add Modal
  const openAddWatchModal = (targetDate?: string) => {
    const defaultDate = targetDate || selectedDateStr || "2026-09-27";
    const initialOow = deckRoster.officers.find(o => 
      o.label.toLowerCase().includes(personalIdentity.toLowerCase()) || 
      personalIdentity.toLowerCase().includes(o.label.toLowerCase())
    )?.label || deckRoster.officers[0]?.label || personalIdentity;

    const initialHelmsman = deckRoster.ratings.find(r => r.rank.toLowerCase().includes("ab") || r.name.toLowerCase().includes("santos"))?.label 
      || deckRoster.ratings[0]?.label 
      || "Able Seaman (AB) - Esteban Santos";

    const initialLookout = deckRoster.ratings.find(r => r.rank.toLowerCase().includes("os") || r.name.toLowerCase().includes("ali"))?.label 
      || deckRoster.ratings[1]?.label 
      || deckRoster.ratings[0]?.label 
      || "Ordinary Seaman (OS) - Muhammad Ali";

    setScheduleMode("single");
    setRangeEndDate("2026-10-05");

    setFormData({
      date: defaultDate,
      selectedPreset: "0800-1200",
      startTime: "08:00",
      endTime: "12:00",
      watchPeriodName: "08:00–12:00 Forenoon Watch",
      oow: initialOow,
      helmsman: initialHelmsman,
      lookout: initialLookout,
      chiefOfficerAssignment: "Assigned by C/O Mateo Rodriguez: Maintain safe navigation, continuous radar tracking, log barometer hourly.",
      chiefOfficerName: "Mateo Rodriguez (Chief Officer)",
      activities: "Visual lookout maintained. Parallel indexing verified against ECDIS route.",
      weatherConditions: "Wind NE F4, Sea state moderate, Baro 1013 hPa, Vis 10nm",
      status: "scheduled"
    });
    setShowAddModal(true);
  };

  // Open Edit Modal
  const openEditWatchModal = (entry: WatchEntry) => {
    setFormData({
      id: entry.id,
      date: entry.date,
      selectedPreset: "custom",
      startTime: entry.startTime,
      endTime: entry.endTime,
      watchPeriodName: entry.watchPeriodName,
      oow: entry.team.oow,
      helmsman: entry.team.helmsman,
      lookout: entry.team.lookout,
      chiefOfficerAssignment: entry.chiefOfficerAssignment,
      chiefOfficerName: entry.chiefOfficerName || "Chief Officer",
      activities: entry.activities,
      weatherConditions: entry.weatherConditions || "",
      status: entry.status
    });
    setShowEditModal(true);
  };

  // Calculate duration in hours
  const calculateWatchHours = (start: string, end: string) => {
    const [sH, sM] = start.split(":").map(Number);
    const [eH, eM] = end.split(":").map(Number);
    let startMin = sH * 60 + sM;
    let endMin = eH * 60 + eM;
    if (endMin <= startMin) {
      endMin += 24 * 60; // Spans midnight
    }
    const diff = (endMin - startMin) / 60;
    return diff > 0 ? diff : 4;
  };

  // Save New Watch (Single day or recurring date range)
  const handleSaveNewWatch = () => {
    if (!formData.date) {
      alert("Please specify a watch date.");
      return;
    }
    if (!formData.startTime || !formData.endTime) {
      alert("Please specify watch start and end times.");
      return;
    }
    if (!formData.oow.trim()) {
      alert("Please specify the designated Officer on Watch.");
      return;
    }

    const duration = calculateWatchHours(formData.startTime, formData.endTime);
    const isPersonal = formData.oow.toLowerCase().includes(personalIdentity.toLowerCase()) || 
                       personalIdentity.toLowerCase().includes(formData.oow.toLowerCase());

    // 1. Multi-Day Recurring Range Mode
    if (scheduleMode === "range") {
      if (!rangeEndDate || rangeEndDate < formData.date) {
        alert("Please specify a valid End Date that is on or after the Start Date.");
        return;
      }
      const dateList = getDatesInRange(formData.date, rangeEndDate);
      if (dateList.length === 0) {
        alert("No valid dates found in the specified range.");
        return;
      }

      const generatedEntries: WatchEntry[] = dateList.map((curDate, idx) => ({
        id: `w-${curDate}-${formData.startTime.replace(":", "")}-${Date.now()}-${idx}`,
        date: curDate,
        startTime: formData.startTime,
        endTime: formData.endTime,
        watchPeriodName: formData.watchPeriodName || `${formData.startTime}–${formData.endTime} Watch`,
        team: {
          oow: formData.oow,
          helmsman: formData.helmsman,
          lookout: formData.lookout
        },
        chiefOfficerAssignment: formData.chiefOfficerAssignment,
        chiefOfficerName: formData.chiefOfficerName,
        activities: formData.activities,
        weatherConditions: formData.weatherConditions,
        status: formData.status,
        loggedHours: duration,
        isPersonalWatch: isPersonal
      }));

      setWatchEntries(prev => [...generatedEntries, ...prev].sort((a, b) => {
        const comp = b.date.localeCompare(a.date);
        if (comp !== 0) return comp;
        return b.startTime.localeCompare(a.startTime);
      }));

      setSelectedDateStr(formData.date);
      setShowAddModal(false);
      triggerNotification(`Created ${generatedEntries.length} recurring watch duties (${formData.date} to ${rangeEndDate}).`);
      return;
    }

    // 2. Single Day Watch Mode
    const newEntry: WatchEntry = {
      id: `w-${Date.now()}`,
      date: formData.date,
      startTime: formData.startTime,
      endTime: formData.endTime,
      watchPeriodName: formData.watchPeriodName || `${formData.startTime}–${formData.endTime} Watch`,
      team: {
        oow: formData.oow,
        helmsman: formData.helmsman,
        lookout: formData.lookout
      },
      chiefOfficerAssignment: formData.chiefOfficerAssignment,
      chiefOfficerName: formData.chiefOfficerName,
      activities: formData.activities,
      weatherConditions: formData.weatherConditions,
      status: formData.status,
      loggedHours: duration,
      isPersonalWatch: isPersonal
    };

    setWatchEntries(prev => [newEntry, ...prev].sort((a, b) => {
      const comp = b.date.localeCompare(a.date);
      if (comp !== 0) return comp;
      return b.startTime.localeCompare(a.startTime);
    }));

    setSelectedDateStr(formData.date);
    setShowAddModal(false);
    triggerNotification(`Watch entry created: ${newEntry.watchPeriodName} on ${newEntry.date}`);
  };

  // Confirm Batch Delete
  const handleConfirmBatchDelete = () => {
    const idsToDelete = new Set(filteredWatches.map(w => w.id));
    if (idsToDelete.size === 0) {
      setShowBatchDeleteModal(false);
      return;
    }
    setWatchEntries(prev => prev.filter(w => !idsToDelete.has(w.id)));
    setShowBatchDeleteModal(false);
    triggerNotification(`Batch deleted ${idsToDelete.size} watchkeeping duties.`);
  };

  // Open Relieve OOW Modal
  const openRelieveModal = (watch: WatchEntry) => {
    setRelievingWatch(watch);
    const candidate = deckRoster.officers.find(o => !isMasterRank(o.rank) && o.label !== watch.team.oow);
    setIncomingOfficerForRelief(candidate?.label || "");
    setReliefRemarks(`Relief of Officer on Watch executed in accordance with STCW Code Section A-VIII/2. Navigational status, radar targets, and engine telemetry verified.`);
  };

  // Confirm Relief & Replace Shift
  const handleConfirmRelief = (e: React.FormEvent) => {
    e.preventDefault();
    if (!relievingWatch || !incomingOfficerForRelief) return;

    const relievedOOW = relievingWatch.team.oow;
    const incomingOOW = incomingOfficerForRelief;
    const nowTimestamp = new Date().toISOString().replace("T", " ").substring(0, 16) + " UTC";

    // 1. Create Relieved Watch Record preserving historical record
    const newRecord: RelievedWatchRecord = {
      id: `rel-${Date.now()}`,
      originalWatchId: relievingWatch.id,
      date: relievingWatch.date,
      startTime: relievingWatch.startTime,
      endTime: relievingWatch.endTime,
      watchPeriodName: relievingWatch.watchPeriodName,
      relievedOfficer: relievedOOW,
      incomingOfficer: incomingOOW,
      handoverTimestamp: nowTimestamp,
      handoverRemarks: reliefRemarks.trim() || `Watch relieved and handed over to ${incomingOOW}. Standard STCW protocol observed.`,
      loggedHours: relievingWatch.loggedHours || 4,
      activities: relievingWatch.activities,
      preWatchTelemetry: relievingWatch.preWatchTelemetry,
      postWatchTelemetry: relievingWatch.postWatchTelemetry
    };

    // 2. Prepend to relieved history
    const updatedHistory = [newRecord, ...relievedRecords];
    setRelievedRecords(updatedHistory);
    saveRelievedHistory(updatedHistory);

    // 3. Update watch entries: replace active duty shift with new incoming officer
    setWatchEntries(prev => prev.map(w => {
      if (w.id === relievingWatch.id) {
        return {
          ...w,
          team: {
            ...w.team,
            oow: incomingOOW
          },
          status: "active" as WatchStatus,
          activities: w.activities 
            ? `${w.activities} [OOW Relieved: Handover from ${relievedOOW} to ${incomingOOW} at ${nowTimestamp}]`
            : `[OOW Relieved: Handover from ${relievedOOW} to ${incomingOOW} at ${nowTimestamp}]`
        };
      }
      return w;
    }));

    triggerNotification(`Shift replaced: ${incomingOOW} is now OOW. Historical duty by ${relievedOOW} preserved in Relieved History.`);
    setRelievingWatch(null);
    setIncomingOfficerForRelief("");
    setReliefRemarks("");
  };

  // Save Edited Watch
  const handleSaveEditedWatch = () => {
    if (!formData.id) return;
    const duration = calculateWatchHours(formData.startTime, formData.endTime);

    // Check if OOW is being changed / relieved
    const targetEntry = watchEntries.find(w => w.id === formData.id);
    if (targetEntry && targetEntry.team.oow !== formData.oow) {
      const nowTimestamp = new Date().toISOString().replace("T", " ").substring(0, 16) + " UTC";
      const preservedRecord: RelievedWatchRecord = {
        id: `rel-${Date.now()}`,
        originalWatchId: targetEntry.id,
        date: targetEntry.date,
        startTime: targetEntry.startTime,
        endTime: targetEntry.endTime,
        watchPeriodName: targetEntry.watchPeriodName,
        relievedOfficer: targetEntry.team.oow,
        incomingOfficer: formData.oow,
        handoverTimestamp: nowTimestamp,
        handoverRemarks: `OOW shift reassigned from ${targetEntry.team.oow} to ${formData.oow}. Preserved duty record.`,
        loggedHours: targetEntry.loggedHours || 4,
        activities: targetEntry.activities,
        preWatchTelemetry: targetEntry.preWatchTelemetry,
        postWatchTelemetry: targetEntry.postWatchTelemetry
      };
      const updatedHistory = [preservedRecord, ...relievedRecords];
      setRelievedRecords(updatedHistory);
      saveRelievedHistory(updatedHistory);
    }

    setWatchEntries(prev => prev.map(entry => {
      if (entry.id === formData.id) {
        return {
          ...entry,
          date: formData.date,
          startTime: formData.startTime,
          endTime: formData.endTime,
          watchPeriodName: formData.watchPeriodName,
          team: {
            oow: formData.oow,
            helmsman: formData.helmsman,
            lookout: formData.lookout
          },
          chiefOfficerAssignment: formData.chiefOfficerAssignment,
          chiefOfficerName: formData.chiefOfficerName,
          activities: formData.activities,
          weatherConditions: formData.weatherConditions,
          status: formData.status,
          loggedHours: duration,
          isPersonalWatch: formData.oow.toLowerCase().includes(personalIdentity.toLowerCase()) || personalIdentity.toLowerCase().includes(formData.oow.toLowerCase())
        };
      }
      return entry;
    }));

    setShowEditModal(false);
    triggerNotification(`Watch entry updated successfully.`);
  };

  // Delete Watch
  const handleDeleteWatch = (id: string) => {
    setWatchEntries(prev => prev.filter(w => w.id !== id));
    setShowDeleteConfirm(null);
    triggerNotification("Watch entry deleted.");
  };

  // Quick Status Toggle (fallback)
  const handleQuickStatusChange = (id: string, newStatus: WatchStatus) => {
    setWatchEntries(prev => prev.map(w => {
      if (w.id === id) {
        return { ...w, status: newStatus };
      }
      return w;
    }));
    triggerNotification(`Watch marked as ${newStatus.replace("_", " ").toUpperCase()}`);
  };

  // 1. Start Watch Duties: Prompts user to fill out Pre-Watch Navigation & Weather Form
  const handleInitiateStartWatch = (watch: WatchEntry) => {
    setTelemetryModalState({
      isOpen: true,
      mode: "pre_watch",
      watchId: watch.id
    });
  };

  // 2. Finish / Handover Watch Duties: Presents Post-Watch Handover Form to fill in final readings
  const handleInitiateFinishWatch = (watch: WatchEntry) => {
    setTelemetryModalState({
      isOpen: true,
      mode: "post_watch",
      watchId: watch.id
    });
  };

  // 3. Update In-Watch Telemetry: Allows updating telemetry readings at any point during the watch
  const handleInitiateUpdateTelemetry = (watch: WatchEntry, mode: "pre_watch" | "post_watch" | "update" = "update") => {
    setTelemetryModalState({
      isOpen: true,
      mode,
      watchId: watch.id
    });
  };

  // 4. Save Telemetry Callback from TelemetryFormModal
  const handleSaveTelemetry = (telemetryData: WatchTelemetryLog) => {
    const { watchId, mode } = telemetryModalState;
    setWatchEntries(prev => prev.map(w => {
      if (w.id === watchId) {
        if (mode === "pre_watch") {
          return {
            ...w,
            status: "active" as WatchStatus,
            preWatchTelemetry: telemetryData
          };
        } else if (mode === "post_watch") {
          return {
            ...w,
            status: "handed_over" as WatchStatus,
            postWatchTelemetry: telemetryData
          };
        } else {
          // "update" mode
          return {
            ...w,
            preWatchTelemetry: w.preWatchTelemetry ? { ...w.preWatchTelemetry, ...telemetryData } : telemetryData
          };
        }
      }
      return w;
    }));

    if (mode === "pre_watch") {
      triggerNotification("Pre-Watch Navigation & Weather Form logged. Duty status: ACTIVE.");
    } else if (mode === "post_watch") {
      triggerNotification("Post-Watch Handover Form logged. Watch duty completed & HANDED OVER.");
    } else {
      triggerNotification("Interim watch telemetry updated successfully.");
    }
    setTelemetryModalState(prev => ({ ...prev, isOpen: false }));
  };

  // The active watch currently targeted by the telemetry modal
  const targetTelemetryWatch = useMemo(() => {
    return watchEntries.find(w => w.id === telemetryModalState.watchId) || null;
  }, [watchEntries, telemetryModalState.watchId]);

  // Filtered Watches list
  const filteredWatches = useMemo(() => {
    let result = [...watchEntries];

    // Status / View filter
    if (filterType === "selected_date") {
      result = result.filter(w => w.date === selectedDateStr);
    } else if (filterType === "upcoming") {
      result = result.filter(w => w.status === "scheduled" || w.date >= "2026-09-27");
    } else if (filterType === "active") {
      result = result.filter(w => w.status === "active" || w.date === "2026-09-27");
    } else if (filterType === "completed") {
      result = result.filter(w => w.status === "completed" || w.status === "handed_over");
    } else if (filterType === "personal") {
      result = result.filter(w => 
        w.team.oow.toLowerCase().includes(personalIdentity.toLowerCase()) ||
        personalIdentity.toLowerCase().includes(w.team.oow.toLowerCase())
      );
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(w => 
        w.watchPeriodName.toLowerCase().includes(q) ||
        w.team.oow.toLowerCase().includes(q) ||
        w.team.helmsman.toLowerCase().includes(q) ||
        w.team.lookout.toLowerCase().includes(q) ||
        w.chiefOfficerAssignment.toLowerCase().includes(q) ||
        w.activities.toLowerCase().includes(q) ||
        w.date.includes(q)
      );
    }

    // Chronological order: latest date/time first
    return result.sort((a, b) => {
      const dateComp = b.date.localeCompare(a.date);
      if (dateComp !== 0) return dateComp;
      return b.startTime.localeCompare(a.startTime);
    });
  }, [watchEntries, filterType, selectedDateStr, searchQuery, personalIdentity]);

  // Statistics & STCW Compliance Checks
  const stats = useMemo(() => {
    const personalEntries = watchEntries.filter(w => 
      w.team.oow.toLowerCase().includes(personalIdentity.toLowerCase()) ||
      personalIdentity.toLowerCase().includes(w.team.oow.toLowerCase())
    );

    const totalHoursLogged = personalEntries.reduce((acc, curr) => acc + (curr.loggedHours || 4), 0);
    const activeWatch = watchEntries.find(w => w.status === "active");
    const upcomingWatches = personalEntries.filter(w => w.status === "scheduled");

    // Scheduled vs. Completed Watch Counters
    const scheduledWatches = watchEntries.filter(w => w.status === "scheduled");
    const totalScheduledCount = scheduledWatches.length;
    const totalScheduledHours = scheduledWatches.reduce((acc, curr) => acc + (curr.loggedHours || 4), 0);

    const completedWatches = watchEntries.filter(w => w.status === "completed" || w.status === "handed_over");
    const totalCompletedCount = completedWatches.length;
    const totalCompletedHours = completedWatches.reduce((acc, curr) => acc + (curr.loggedHours || 4), 0);

    // STCW Reg. VIII/1 Rest Hour Check (Standard: at least 10 hours rest in 24h period, max 14 hours work)
    const todayPersonalHours = personalEntries
      .filter(w => w.date === "2026-09-27")
      .reduce((acc, curr) => acc + curr.loggedHours, 0);

    const restHours24h = Math.max(0, 24 - todayPersonalHours);
    const isStcwCompliant = restHours24h >= 10;

    return {
      totalHoursLogged,
      activeWatch,
      upcomingCount: upcomingWatches.length,
      totalScheduledCount,
      totalScheduledHours,
      totalCompletedCount,
      totalCompletedHours,
      todayPersonalHours,
      restHours24h,
      isStcwCompliant
    };
  }, [watchEntries, personalIdentity]);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 right-4 bg-[#0A2540] border border-[#00A86B] text-white px-4 py-2.5 shadow-2xl z-50 flex items-center gap-2 text-xs font-semibold"
          >
            <CheckCircle2 className="w-4 h-4 text-[#00A86B]" />
            <span>{notification}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. TOP HEADER & WATCHKEEPER PROFILE BAR */}
      <div className="bg-white border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <Compass className="w-5 h-5 text-[#00A86B]" />
              <h2 className="text-base font-extrabold text-[#0A2540] uppercase tracking-wide">
                Personal Bridge Watchkeeping & Calendar Log
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Personal navigational duty tracker & Chief Officer assignment records adhering to <strong>STCW Code Section A-VIII/2</strong>.
            </p>
          </div>

          {/* Watchkeeper Identity Dropdown & Action Controls */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 text-xs">
              <User className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">Watchkeeper:</span>
              <select
                value={personalIdentity}
                onChange={(e) => setPersonalIdentity(e.target.value)}
                className="bg-transparent text-xs font-bold text-[#0A2540] focus:outline-none cursor-pointer max-w-[240px] truncate"
              >
                {deckRoster.officers.map(off => (
                  <option key={off.label} value={off.label}>{off.label}</option>
                ))}
                {!deckRoster.officers.some(o => o.label === personalIdentity) && (
                  <option value={personalIdentity}>{personalIdentity}</option>
                )}
              </select>
            </div>

            <button
              onClick={() => openAddWatchModal()}
              className="px-3.5 py-1.5 bg-[#00A86B] hover:bg-emerald-600 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Log Watch Assignment
            </button>
          </div>
        </div>

        {/* Scheduled vs. Completed Watch Counters & Telemetry Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-1 text-xs font-mono">
          {/* Card 1: Total Scheduled Watches */}
          <div className="p-3 bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between text-slate-500 text-[10px] uppercase font-bold">
              <span>Total Scheduled</span>
              <Clock className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-lg font-black text-slate-800 tabular-nums">
                {stats.totalScheduledCount}
              </span>
              <span className="text-[10px] text-slate-500 font-sans">watches</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              <span className="font-bold text-[#0A2540]">{stats.totalScheduledHours} hrs</span> upcoming
            </div>
          </div>

          {/* Card 2: Total Completed Watches */}
          <div className="p-3 bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between text-slate-500 text-[10px] uppercase font-bold">
              <span>Total Completed</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-[#00A86B]" />
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-lg font-black text-[#00A86B] tabular-nums">
                {stats.totalCompletedCount}
              </span>
              <span className="text-[10px] text-slate-500 font-sans">watches</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              <span className="font-bold text-[#00A86B]">{stats.totalCompletedHours} hrs</span> verified
            </div>
          </div>

          {/* Card 3: My Total Watch Hours */}
          <div className="p-3 bg-slate-50 border border-slate-200">
            <span className="text-slate-500 block text-[10px] uppercase font-bold">My Total Watch Hours</span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-lg font-black text-[#0A2540] tabular-nums">
                {stats.totalHoursLogged}
              </span>
              <span className="text-[10px] text-slate-500 font-sans">hours logged</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Cumulative Sea Service
            </div>
          </div>

          {/* Card 4: Current Watch Status */}
          <div className="p-3 bg-slate-50 border border-slate-200">
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Current Watch Status</span>
            <div className="mt-2 flex items-center gap-1.5">
              {stats.activeWatch ? (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-[#00A86B] animate-ping" />
                  <span className="font-bold text-[#00A86B] text-xs uppercase">On Watch</span>
                </>
              ) : (
                <span className="font-semibold text-slate-600 text-xs uppercase">Standby / Off Duty</span>
              )}
            </div>
          </div>

          {/* Card 5: STCW 24h Rest Margin */}
          <div className="p-3 bg-slate-50 border border-slate-200">
            <span className="text-slate-500 block text-[10px] uppercase font-bold">STCW 24h Rest</span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className={`text-lg font-black tabular-nums ${stats.isStcwCompliant ? "text-[#00A86B]" : "text-amber-600"}`}>
                {stats.restHours24h}h
              </span>
              <span className="text-[10px] text-slate-500 font-sans">rest margin</span>
            </div>
            <div className="mt-0.5 flex items-center gap-1">
              <ShieldCheck className={`w-3 h-3 ${stats.isStcwCompliant ? "text-[#00A86B]" : "text-amber-500"}`} />
              <span className={`text-[10px] font-bold uppercase ${stats.isStcwCompliant ? "text-[#00A86B]" : "text-amber-600"}`}>
                {stats.isStcwCompliant ? "Compliant (≥10h)" : "Notice"}
              </span>
            </div>
          </div>
        </div>

        {/* Sub-Navigation Tabs: [ 📅 Calendar & Watch Log ] vs [ ⏱️ Duties Total Hours ] */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
          <button
            onClick={() => setActiveSubTab("calendar_duty")}
            className={`px-4 py-2 text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all border ${
              activeSubTab === "calendar_duty"
                ? "bg-[#0A2540] text-white border-[#0A2540] shadow-xs"
                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            Calendar & Watch Schedule
          </button>

          <button
            onClick={() => setActiveSubTab("duties_total_hours")}
            className={`px-4 py-2 text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all border ${
              activeSubTab === "duties_total_hours"
                ? "bg-[#0A2540] text-white border-[#0A2540] shadow-xs"
                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Duties Total Hours
            <span className="ml-1 text-[10px] px-1.5 py-0.2 bg-emerald-600 text-white font-mono font-bold">
              {stats.totalHoursLogged}h
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab("relieved_history")}
            className={`px-4 py-2 text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all border ${
              activeSubTab === "relieved_history"
                ? "bg-[#0A2540] text-white border-[#0A2540] shadow-xs"
                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <History className="w-3.5 h-3.5 text-[#00A86B]" />
            Relieved Officer Watch History
            <span className="ml-1 text-[10px] px-1.5 py-0.2 bg-blue-600 text-white font-mono font-bold">
              {relievedRecords.length}
            </span>
          </button>
        </div>
      </div>

      {/* 2. MAIN WORKSPACE: CALENDAR VIEW & DUTY TIMELINE OR DUTIES TOTAL HOURS */}
      {activeSubTab === "calendar_duty" ? (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: INTERACTIVE CALENDAR (7 COLS on XL) */}
        <div className="xl:col-span-7 bg-white border border-slate-200 p-5 shadow-sm space-y-4">
          {/* Calendar Header with Controls */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-[#00A86B]" />
              <h3 className="text-sm font-black text-[#0A2540] uppercase tracking-wider">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h3>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={jumpToToday}
                className="px-2.5 py-1 text-[10px] font-mono font-bold uppercase border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Today
              </button>
              <button
                onClick={prevMonth}
                className="p-1 border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={nextMonth}
                className="p-1 border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Calendar Day of Week Header */}
          <div className="grid grid-cols-7 gap-1 text-center font-mono text-[10px] font-bold text-slate-400 uppercase py-1 border-b border-slate-100">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          {/* Calendar Date Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, idx) => {
              const isSelected = selectedDateStr === day.dateStr;
              const hasWatches = day.watches.length > 0;
              const hasPersonal = day.watches.some(w => 
                w.team.oow.toLowerCase().includes(personalIdentity.toLowerCase()) ||
                personalIdentity.toLowerCase().includes(w.team.oow.toLowerCase())
              );

              return (
                <div
                  key={`${day.dateStr}-${idx}`}
                  onClick={() => {
                    setSelectedDateStr(day.dateStr);
                    setFilterType("selected_date");
                  }}
                  className={`min-h-[72px] sm:min-h-[82px] p-1.5 border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected 
                      ? "border-[#0A2540] bg-blue-50/40 ring-1 ring-[#0A2540]" 
                      : day.isCurrentMonth
                        ? "border-slate-100 bg-white hover:border-slate-300 hover:bg-slate-50/50"
                        : "border-slate-100/50 bg-slate-50/60 text-slate-400"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[11px] font-mono font-bold tabular-nums ${
                      day.isToday 
                        ? "w-5 h-5 flex items-center justify-center bg-[#00A86B] text-white rounded-full" 
                        : day.isCurrentMonth ? "text-slate-800" : "text-slate-400"
                    }`}>
                      {day.dayNumber}
                    </span>

                    {hasPersonal && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#0A2540]" title="Personal Watch Assigned" />
                    )}
                  </div>

                  {/* Day Watch Badges */}
                  <div className="mt-1 space-y-0.5 overflow-hidden">
                    {day.watches.slice(0, 2).map((w) => (
                      <div
                        key={w.id}
                        className={`text-[9px] font-mono px-1 py-0.2 truncate border ${
                          w.status === "active"
                            ? "bg-emerald-50 text-[#00A86B] border-emerald-200 font-bold"
                            : w.status === "completed"
                              ? "bg-slate-100 text-slate-600 border-slate-200"
                              : "bg-blue-50 text-[#0A2540] border-blue-100"
                        }`}
                        title={`${w.watchPeriodName} - ${w.team.oow}`}
                      >
                        {w.startTime} {w.watchPeriodName.split(" ")[1] || "Watch"}
                      </div>
                    ))}
                    {day.watches.length > 2 && (
                      <div className="text-[8px] font-mono text-slate-400 text-right pr-0.5">
                        +{day.watches.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Calendar Legend & Quick Add for Selected Date */}
          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[11px]">
            <div className="flex flex-wrap items-center gap-3 text-slate-500 font-sans">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#00A86B]" /> Today
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#0A2540]" /> My Assigned Watch
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 border border-[#0A2540] bg-blue-50" /> Selected Date
              </span>
            </div>

            <button
              onClick={() => openAddWatchModal(selectedDateStr)}
              className="text-[11px] font-bold text-[#0A2540] hover:text-[#00A86B] flex items-center gap-1 transition-colors self-start sm:self-auto cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Watch for {selectedDateStr}
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: WATCH ENTRIES TIMELINE & DETAILS (5 COLS on XL) */}
        <div className="xl:col-span-5 bg-white border border-slate-200 p-5 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            {/* Filter Tabs Header */}
            <div className="flex flex-col gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-[#0A2540] uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-[#00A86B]" />
                  Watch Records & Directives
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-slate-400">
                    {filteredWatches.length} {filteredWatches.length === 1 ? "entry" : "entries"}
                  </span>
                  {filteredWatches.length > 0 && (
                    <button
                      onClick={() => setShowBatchDeleteModal(true)}
                      className="px-2 py-0.5 text-[9px] font-mono font-bold uppercase text-red-600 hover:text-white hover:bg-red-600 border border-red-200 transition-colors flex items-center gap-1 cursor-pointer"
                      title="Batch delete watch tasks in current filter"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>
                        {filterType === "all" && `Delete All (${filteredWatches.length})`}
                        {filterType === "selected_date" && `Delete Date Tasks (${filteredWatches.length})`}
                        {filterType === "upcoming" && `Delete Upcoming (${filteredWatches.length})`}
                        {filterType === "completed" && `Delete Completed (${filteredWatches.length})`}
                        {filterType === "personal" && `Delete My Tasks (${filteredWatches.length})`}
                      </span>
                    </button>
                  )}
                </div>
              </div>

              {/* Segmented Filter Buttons */}
              <div className="flex flex-wrap gap-1 p-1 bg-slate-100 rounded-none text-[11px] font-medium">
                <button
                  onClick={() => setFilterType("all")}
                  className={`px-2.5 py-1 transition-colors cursor-pointer ${
                    filterType === "all" ? "bg-white text-[#0A2540] font-bold shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilterType("selected_date")}
                  className={`px-2.5 py-1 transition-colors cursor-pointer ${
                    filterType === "selected_date" ? "bg-white text-[#0A2540] font-bold shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Date ({selectedDateStr.slice(5)})
                </button>
                <button
                  onClick={() => setFilterType("personal")}
                  className={`px-2.5 py-1 transition-colors cursor-pointer ${
                    filterType === "personal" ? "bg-white text-[#0A2540] font-bold shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  My Watches
                </button>
                <button
                  onClick={() => setFilterType("upcoming")}
                  className={`px-2.5 py-1 transition-colors cursor-pointer ${
                    filterType === "upcoming" ? "bg-white text-[#0A2540] font-bold shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Upcoming
                </button>
                <button
                  onClick={() => setFilterType("completed")}
                  className={`px-2.5 py-1 transition-colors cursor-pointer ${
                    filterType === "completed" ? "bg-white text-[#0A2540] font-bold shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Completed
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter by officer, rating, directive..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#00A86B]"
                />
              </div>
            </div>

            {/* List of Watches */}
            <div className="mt-4 space-y-3 max-h-[580px] overflow-y-auto pr-1">
              {filteredWatches.length === 0 ? (
                <div className="text-center py-12 px-4 border border-dashed border-slate-200">
                  <CalendarIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-600 uppercase">No Watch Entries Found</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {filterType === "selected_date" 
                      ? `No watches scheduled for ${selectedDateStr}.`
                      : "Try adjusting your filter or search query."}
                  </p>
                  <button
                    onClick={() => openAddWatchModal(selectedDateStr)}
                    className="mt-3 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold uppercase transition-colors"
                  >
                    + Add Watch Entry
                  </button>
                </div>
              ) : (
                filteredWatches.map((watch) => {
                  const isPersonal = watch.team.oow.toLowerCase().includes(personalIdentity.toLowerCase()) ||
                                     personalIdentity.toLowerCase().includes(watch.team.oow.toLowerCase());

                  return (
                    <div
                      key={watch.id}
                      className={`p-3.5 border transition-all ${
                        watch.status === "active"
                          ? "border-[#00A86B] bg-emerald-50/30"
                          : isPersonal
                            ? "border-slate-300 bg-white"
                            : "border-slate-200 bg-slate-50/50"
                      }`}
                    >
                      {/* Card Top Row: Date, Period & Status */}
                      <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2 mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-extrabold text-[#0A2540] uppercase">
                              {watch.watchPeriodName}
                            </span>
                            {isPersonal && (
                              <span className="text-[9px] font-mono text-[#00A86B] bg-emerald-50 border border-emerald-200 px-1 py-0.2 uppercase font-bold">
                                Personal
                              </span>
                            )}
                          </div>
                          {/* Unboxed Metadata per Zero-Pill Discipline */}
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono mt-0.5">
                            <span>{watch.date}</span>
                            <span aria-hidden="true">·</span>
                            <span>{watch.startTime} – {watch.endTime}</span>
                            <span aria-hidden="true">·</span>
                            <span>{watch.loggedHours}h duration</span>
                          </div>
                        </div>

                        {/* Status Label & Quick Toggle */}
                        <div className="flex items-center gap-1">
                          <span className={`text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 border ${
                            watch.status === "active"
                              ? "bg-[#00A86B] text-white border-[#00A86B]"
                              : watch.status === "completed"
                                ? "bg-slate-100 text-slate-600 border-slate-200"
                                : watch.status === "handed_over"
                                  ? "bg-blue-50 text-blue-700 border-blue-200"
                                  : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}>
                            {watch.status.replace("_", " ")}
                          </span>
                        </div>
                      </div>

                      {/* Watchstanding Team Detail */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 py-1 text-xs">
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-mono text-slate-400 uppercase font-bold block">Officer on Watch</span>
                            {(watch.team.oow.toLowerCase().includes(currentUserProfile.fullName.toLowerCase()) || 
                              watch.team.oow.toLowerCase().includes(currentUserProfile.rank.toLowerCase())) && (
                              <span className="text-[8px] font-mono bg-emerald-600 text-white px-1 py-0.2 font-black uppercase tracking-wider">
                                [ME / USER]
                              </span>
                            )}
                          </div>
                          <span className="font-bold text-slate-800 text-[11px] truncate block" title={watch.team.oow}>
                            {watch.team.oow}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] font-mono text-slate-400 uppercase font-bold block">Helmsman</span>
                          <span className="font-semibold text-slate-700 text-[11px] truncate block" title={watch.team.helmsman}>
                            {watch.team.helmsman}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] font-mono text-slate-400 uppercase font-bold block">Lookout</span>
                          <span className="font-semibold text-slate-700 text-[11px] truncate block" title={watch.team.lookout}>
                            {watch.team.lookout}
                          </span>
                        </div>
                      </div>

                      {/* Chief Officer Assignment / Orders Box */}
                      {watch.chiefOfficerAssignment && (
                        <div className="mt-2 p-2.5 bg-blue-50/60 border-l-2 border-[#0A2540] text-[11px]">
                          <span className="text-[9px] font-mono font-bold text-[#0A2540] uppercase block mb-0.5">
                            Chief Officer Directive:
                          </span>
                          <p className="text-slate-700 italic leading-relaxed">
                            "{watch.chiefOfficerAssignment}"
                          </p>
                        </div>
                      )}

                      {/* Operational Remarks / Weather */}
                      {watch.activities && (
                        <div className="mt-2 text-[11px] text-slate-600 leading-relaxed font-sans">
                          <span className="font-semibold text-slate-700">Remarks: </span>
                          {watch.activities}
                        </div>
                      )}

                      {watch.weatherConditions && (
                        <div className="mt-1 text-[10px] font-mono text-slate-500">
                          {watch.weatherConditions}
                        </div>
                      )}

                      {/* Navigation Telemetry Section: Pre-Watch & Post-Watch readings */}
                      {(watch.preWatchTelemetry || watch.postWatchTelemetry) && (
                        <div className="mt-2.5 pt-2 border-t border-slate-100">
                          <div className="flex flex-wrap items-center justify-between gap-1.5">
                            <div className="flex items-center gap-1.5 text-[10px] font-mono">
                              <Compass className="w-3.5 h-3.5 text-[#00A86B]" />
                              <span className="font-bold text-[#0A2540] uppercase">Telemetry Log:</span>
                              {watch.preWatchTelemetry && (
                                <span className="text-[#00A86B] font-bold">Start Logged [✓]</span>
                              )}
                              {watch.postWatchTelemetry ? (
                                <span className="text-blue-700 font-bold">· Handover Logged [✓]</span>
                              ) : watch.status === "active" ? (
                                <span className="text-amber-600 font-bold">· Relief Pending [⌛]</span>
                              ) : null}
                            </div>

                            <div className="flex items-center gap-1.5">
                              {watch.status === "active" && (
                                <button
                                  type="button"
                                  onClick={() => handleInitiateUpdateTelemetry(watch, "update")}
                                  className="text-[10px] font-mono text-blue-700 hover:text-blue-900 font-bold underline cursor-pointer"
                                >
                                  Update Readings
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => toggleTelemetryExpansion(watch.id)}
                                className="text-[10px] font-mono text-[#0A2540] font-bold bg-slate-100 hover:bg-slate-200 px-2 py-0.5 border border-slate-200 flex items-center gap-1 cursor-pointer transition-colors"
                              >
                                {expandedTelemetryCardIds.has(watch.id) ? (
                                  <><span>Hide Comparison</span> <ChevronUp className="w-3 h-3" /></>
                                ) : (
                                  <><span>Compare Initial vs Final</span> <ChevronDown className="w-3 h-3" /></>
                                )}
                              </button>
                            </div>
                          </div>

                          {/* Quick Telemetry Glance (single row preview) */}
                          {!expandedTelemetryCardIds.has(watch.id) && watch.preWatchTelemetry && (
                            <div className="mt-1.5 text-[10px] font-mono text-slate-600 bg-slate-50 p-1.5 border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                              <div><span className="text-slate-400">Course:</span> {watch.preWatchTelemetry.shipCourse}</div>
                              <div><span className="text-slate-400">Speed:</span> {watch.preWatchTelemetry.vesselSpeed.split(" / ")[0]}</div>
                              <div><span className="text-slate-400">Depth:</span> {watch.preWatchTelemetry.waterDepth.split(" ")[0]}m</div>
                              <div><span className="text-slate-400">Draft:</span> Fwd {watch.preWatchTelemetry.draftForward} / Aft {watch.preWatchTelemetry.draftAft}</div>
                            </div>
                          )}

                          {/* Side-by-Side Comparison Accordion */}
                          {expandedTelemetryCardIds.has(watch.id) && (
                            <div className="mt-2.5">
                              <TelemetryComparisonView
                                preWatch={watch.preWatchTelemetry}
                                postWatch={watch.postWatchTelemetry}
                                onEditTelemetry={(mode) => handleInitiateUpdateTelemetry(watch, mode)}
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {/* Card Action Buttons */}
                      <div className="mt-3 pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {watch.status === "scheduled" && (
                            <button
                              onClick={() => handleInitiateStartWatch(watch)}
                              className="px-2.5 py-1 bg-[#00A86B] hover:bg-emerald-600 text-white font-mono text-[10px] uppercase font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                              title="Start watch duty and record initial navigation & weather telemetry"
                            >
                              <Compass className="w-3 h-3" />
                              Start Watch Duties (Pre-Watch Log)
                            </button>
                          )}
                          {watch.status === "active" && (
                            <>
                              <button
                                onClick={() => handleInitiateFinishWatch(watch)}
                                className="px-2.5 py-1 bg-[#0A2540] hover:bg-slate-800 text-white font-mono text-[10px] uppercase font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs border border-[#00A86B]"
                                title="Finish watch duty and complete post-watch handover telemetry form"
                              >
                                <CheckCircle2 className="w-3 h-3 text-[#00A86B]" />
                                Finish / Handover Watch Duties
                              </button>
                              <button
                                onClick={() => handleInitiateUpdateTelemetry(watch, "update")}
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-[#0A2540] font-mono text-[10px] uppercase font-bold transition-colors cursor-pointer flex items-center gap-1 border border-slate-300"
                                title="Update in-watch course, speed, or weather"
                              >
                                <Gauge className="w-3 h-3 text-blue-600" />
                                Update Telemetry
                              </button>
                            </>
                          )}
                          {(watch.status === "completed" || watch.status === "handed_over") && (
                            <button
                              onClick={() => setViewingTelemetryWatch(watch)}
                              className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 text-[#0A2540] font-mono text-[10px] uppercase font-bold transition-colors cursor-pointer flex items-center gap-1 border border-slate-200"
                              title="Open official pre-watch vs post-watch telemetry comparison modal"
                            >
                              <Eye className="w-3 h-3 text-[#00A86B]" />
                              View Pre/Post Telemetry
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => openRelieveModal(watch)}
                            className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 text-[10px] font-mono font-bold uppercase transition-colors cursor-pointer flex items-center gap-1"
                            title="Relieve OOW / Handover shift to incoming officer (preserves duty history)"
                          >
                            <ArrowRightLeft className="w-3 h-3 text-blue-600" />
                            <span>Relieve OOW</span>
                          </button>
                          <button
                            onClick={() => openEditWatchModal(watch)}
                            className="p-1 text-slate-500 hover:text-[#0A2540] transition-colors cursor-pointer"
                            title="Edit Watch Details"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(watch.id)}
                            className="p-1 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                            title="Delete Watch Entry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Quick STCW Notice Box at bottom */}
          <div className="p-3 bg-slate-50 border border-slate-200 text-[11px] text-slate-600 font-sans">
            <strong>STCW Watchkeeping Mandate:</strong> The Officer on Watch is the Master’s representative and is primarily responsible at all times for the safe navigation of the ship and compliance with the International Regulations for Preventing Collisions at Sea (COLREGs 1972). Master holds overall vessel command (SOLAS Reg. V/14) and does not have a routine watchkeeping schedule; watchstanding shifts are stood by designated Deck Officers (Chief Officer, 2nd Officer, and 3rd Officer).
          </div>
        </div>
      </div>
      ) : activeSubTab === "duties_total_hours" ? (
        <DutiesTotalHoursView
          watchEntries={watchEntries}
          personalIdentity={personalIdentity}
        />
      ) : (
        <RelievedOfficerWatchHistoryView
          onBackToCalendar={() => setActiveSubTab("calendar_duty")}
        />
      )}

      {/* 3. ADD WATCH MODAL */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-300 shadow-2xl p-6 w-full max-w-xl relative max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <Compass className="w-5 h-5 text-[#00A86B]" />
                  <div>
                    <h3 className="text-sm font-extrabold text-[#0A2540] uppercase tracking-wide">
                      Add Watchkeeping Duty Record
                    </h3>
                    <p className="text-[10px] text-slate-400 font-mono">STCW Watchstanding Assignment</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Mode Selector: Single Day vs Multi-Day Date Range */}
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setScheduleMode("single")}
                    className={`flex-1 py-1.5 text-xs font-mono font-bold uppercase transition-all cursor-pointer ${
                      scheduleMode === "single"
                        ? "bg-white text-[#0A2540] shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Single Watch Day
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setScheduleMode("range");
                      if (!rangeEndDate || rangeEndDate < formData.date) {
                        // default to +7 days ahead
                        const [y, m, d] = formData.date.split("-").map(Number);
                        const future = new Date(y, m - 1, d + 7);
                        const fY = future.getFullYear();
                        const fM = String(future.getMonth() + 1).padStart(2, "0");
                        const fD = String(future.getDate()).padStart(2, "0");
                        setRangeEndDate(`${fY}-${fM}-${fD}`);
                      }
                    }}
                    className={`flex-1 py-1.5 text-xs font-mono font-bold uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      scheduleMode === "range"
                        ? "bg-[#0A2540] text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <CalendarDays className="w-3.5 h-3.5" />
                    Date Range / Multi-Day
                  </button>
                </div>

                {/* 1. Date Inputs & Maritime Watch Presets */}
                {scheduleMode === "single" ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-mono uppercase text-slate-500 font-bold mb-1">
                        Watch Date (YYYY-MM-DD)
                      </label>
                      <input
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 px-3 py-1.5 text-xs text-slate-800 font-mono focus:outline-none focus:border-[#00A86B]"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono uppercase text-slate-500 font-bold mb-1">
                        Standard Maritime Watch
                      </label>
                      <select
                        value={formData.selectedPreset}
                        onChange={(e) => handlePresetSelect(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 px-3 py-1.5 text-xs text-slate-800 font-sans focus:outline-none focus:border-[#00A86B]"
                      >
                        {MARITIME_WATCHES.map(w => (
                          <option key={w.code} value={w.code}>
                            {w.startTime}–{w.endTime} ({w.name.split(" ")[0]})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] font-mono uppercase text-slate-500 font-bold mb-1">
                          Start Date (e.g. 05 Oct 2026)
                        </label>
                        <input
                          type="date"
                          value={formData.date}
                          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 px-2.5 py-1.5 text-xs text-slate-800 font-mono focus:outline-none focus:border-[#00A86B]"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono uppercase text-slate-500 font-bold mb-1">
                          End Date (e.g. 28 Oct 2026)
                        </label>
                        <input
                          type="date"
                          value={rangeEndDate}
                          onChange={(e) => setRangeEndDate(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 px-2.5 py-1.5 text-xs text-slate-800 font-mono focus:outline-none focus:border-[#00A86B]"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono uppercase text-slate-500 font-bold mb-1">
                          Standard Maritime Watch
                        </label>
                        <select
                          value={formData.selectedPreset}
                          onChange={(e) => handlePresetSelect(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 px-2.5 py-1.5 text-xs text-slate-800 font-sans focus:outline-none focus:border-[#00A86B]"
                        >
                          {MARITIME_WATCHES.map(w => (
                            <option key={w.code} value={w.code}>
                              {w.startTime}–{w.endTime} ({w.name.split(" ")[0]})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Range calculation summary banner */}
                    {(() => {
                      const rangeCount = getDatesInRange(formData.date, rangeEndDate).length;
                      const duration = calculateWatchHours(formData.startTime, formData.endTime);
                      const totalRangeHours = rangeCount * duration;
                      return (
                        <div className="p-2.5 bg-blue-50/70 border border-blue-200/80 text-[11px] text-[#0A2540] flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span>
                              Will generate <strong>{rangeCount} recurring daily watch duties</strong> ({formData.watchPeriodName})
                            </span>
                          </div>
                          <span className="font-mono font-bold text-blue-800 text-[10px]">
                            {totalRangeHours} total hours
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* 2. Custom Time & Period Name */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-slate-500 font-bold mb-1">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 px-2 py-1.5 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-slate-500 font-bold mb-1">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 px-2 py-1.5 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-slate-500 font-bold mb-1">
                      Watch Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as WatchStatus })}
                      className="w-full bg-slate-50 border border-slate-200 px-2 py-1.5 text-xs"
                    >
                      <option value="scheduled">Scheduled</option>
                      <option value="active">Active / On Duty</option>
                      <option value="completed">Completed</option>
                      <option value="handed_over">Handed Over</option>
                    </select>
                  </div>
                </div>

                {/* 3. Watchstanding Team Section */}
                <div className="p-3 bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
                    <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-[#0A2540] uppercase">
                      <Users className="w-3.5 h-3.5 text-[#00A86B]" />
                      <span>Designated Watchstanding Team</span>
                    </div>

                    {/* Toggle: Sync from Deck Department Crew List */}
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <span className="text-[10px] font-mono font-bold text-slate-600 uppercase">
                        Sync from Deck Department Crew List
                      </span>
                      <div className="relative inline-flex items-center">
                        <input
                          type="checkbox"
                          checked={syncCrewFromDeck}
                          onChange={(e) => {
                            const val = e.target.checked;
                            setSyncCrewFromDeck(val);
                            localStorage.setItem("sms_sync_deck_crew", String(val));
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-8 h-4 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#00A86B]"></div>
                      </div>
                    </label>
                  </div>

                  {syncCrewFromDeck ? (
                    /* Dynamic Dropdown Mode */
                    <div className="space-y-3">
                      <div className="text-[10px] font-mono text-[#00A86B] bg-emerald-50/70 border border-emerald-200/80 px-2.5 py-1 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3 h-3 shrink-0 text-[#00A86B]" />
                          <span>Roster Synced: Deck Officers for OOW · Deck Ratings only for Helmsman & Lookout</span>
                        </span>
                        <span className="text-[9px] text-slate-500 font-sans">Officers strictly excluded from rating duties</span>
                      </div>

                      <div>
                        <label className="block text-[9px] font-mono text-slate-500 uppercase font-bold mb-1">
                          Designated Officer on Watch (OOW)
                          <span className="ml-1 text-[9px] font-normal text-slate-400 font-sans">(Licensed Deck Officers only · Master excluded)</span>
                        </label>
                        <select
                          value={formData.oow}
                          onChange={(e) => setFormData({ ...formData, oow: e.target.value })}
                          className="w-full bg-white border border-slate-200 px-2 py-1.5 text-xs font-semibold text-[#0A2540] focus:outline-none focus:border-[#00A86B]"
                        >
                          <option value="">-- Select Officer on Watch (Licensed) --</option>
                          {deckRoster.officers
                            .filter(off => !isMasterRank(off.rank))
                            .map(off => (
                              <option key={off.label} value={off.label}>
                                {off.label}
                              </option>
                            ))}
                          {formData.oow && 
                           !isMasterRank(formData.oow) && 
                           !deckRoster.officers.some(o => o.label === formData.oow) && (
                            <option value={formData.oow}>
                              {formData.oow} (Current Selection)
                            </option>
                          )}
                        </select>
                        <span className="text-[9px] text-slate-400 font-mono block mt-1">
                          * Master is in overall vessel command and is excluded from routine watchkeeping schedule.
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[9px] font-mono text-slate-500 uppercase font-bold mb-1">
                            Designated Helmsman (Rating)
                            <span className="ml-1 text-[9px] font-normal text-slate-400 font-sans">(Non-Officer Ratings only)</span>
                          </label>
                          <select
                            value={formData.helmsman}
                            onChange={(e) => setFormData({ ...formData, helmsman: e.target.value })}
                            className="w-full bg-white border border-slate-200 px-2 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:border-[#00A86B]"
                          >
                            <option value="">-- Select Designated Helmsman (Rating) --</option>
                            {deckRoster.ratings.map(rat => (
                              <option key={rat.label} value={rat.label}>
                                {rat.label}
                              </option>
                            ))}
                            {formData.helmsman && !deckRoster.ratings.some(r => r.label === formData.helmsman) && (
                              <option value={formData.helmsman}>
                                {formData.helmsman} (Current Selection)
                              </option>
                            )}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[9px] font-mono text-slate-500 uppercase font-bold mb-1">
                            Designated Lookout (Rating)
                            <span className="ml-1 text-[9px] font-normal text-slate-400 font-sans">(Non-Officer Ratings only)</span>
                          </label>
                          <select
                            value={formData.lookout}
                            onChange={(e) => setFormData({ ...formData, lookout: e.target.value })}
                            className="w-full bg-white border border-slate-200 px-2 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:border-[#00A86B]"
                          >
                            <option value="">-- Select Designated Lookout (Rating) --</option>
                            {deckRoster.ratings.map(rat => (
                              <option key={rat.label} value={rat.label}>
                                {rat.label}
                              </option>
                            ))}
                            <option value="None (Single-Watch Day Condition)">None (Single-Watch Day Condition)</option>
                            {formData.lookout && 
                             formData.lookout !== "None (Single-Watch Day Condition)" && 
                             !deckRoster.ratings.some(r => r.label === formData.lookout) && (
                              <option value={formData.lookout}>
                                {formData.lookout} (Current Selection)
                              </option>
                            )}
                          </select>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Fallback Manual Text Input Mode */
                    <div className="space-y-3">
                      <div className="text-[10px] font-mono text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-1 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Sliders className="w-3 h-3 text-slate-500" />
                          <span>Manual Mode: Custom text entry enabled for watchstanding team</span>
                        </span>
                        <span className="text-[9px] text-slate-400 font-sans">Freeform input</span>
                      </div>

                      <div>
                        <label className="block text-[9px] font-mono text-slate-500 uppercase font-bold mb-0.5">
                          Designated Officer on Watch (OOW)
                        </label>
                        <input
                          type="text"
                          value={formData.oow}
                          onChange={(e) => setFormData({ ...formData, oow: e.target.value })}
                          className="w-full bg-white border border-slate-200 px-2 py-1.5 text-xs font-medium"
                          placeholder="e.g. 2nd Officer - Yuki Tanaka"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[9px] font-mono text-slate-500 uppercase font-bold mb-0.5">
                            Designated Helmsman (Rating)
                          </label>
                          <input
                            type="text"
                            value={formData.helmsman}
                            onChange={(e) => setFormData({ ...formData, helmsman: e.target.value })}
                            className="w-full bg-white border border-slate-200 px-2 py-1.5 text-xs"
                            placeholder="e.g. AB-1 Esteban Santos"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-mono text-slate-500 uppercase font-bold mb-0.5">
                            Designated Lookout (Rating / Assistant)
                          </label>
                          <input
                            type="text"
                            value={formData.lookout}
                            onChange={(e) => setFormData({ ...formData, lookout: e.target.value })}
                            className="w-full bg-white border border-slate-200 px-2 py-1.5 text-xs"
                            placeholder="e.g. OS Muhammad Ali"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. Chief Officer Assignment Directives */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[10px] font-mono uppercase text-slate-500 font-bold">
                      Chief Officer Assignment Directives
                    </label>
                    <span className="text-[9px] text-slate-400 font-mono">Quick Template Presets:</span>
                  </div>
                  
                  <div className="flex flex-wrap gap-1 mb-2">
                    {CHIEF_OFFICER_TEMPLATES.map((tpl, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setFormData({ ...formData, chiefOfficerAssignment: tpl.text })}
                        className="text-[9px] font-sans px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors"
                      >
                        {tpl.title}
                      </button>
                    ))}
                  </div>

                  <textarea
                    rows={3}
                    value={formData.chiefOfficerAssignment}
                    onChange={(e) => setFormData({ ...formData, chiefOfficerAssignment: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 p-2 text-xs text-slate-800 focus:outline-none focus:border-[#00A86B]"
                    placeholder="Enter instructions given by Chief Officer for this watch..."
                  />
                </div>

                {/* 5. Activities & Weather */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-slate-500 font-bold mb-1">
                      Weather & Environmental Conditions
                    </label>
                    <input
                      type="text"
                      value={formData.weatherConditions}
                      onChange={(e) => setFormData({ ...formData, weatherConditions: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 px-2 py-1.5 text-xs"
                      placeholder="e.g. Wind NE F4, Sea 3, Baro 1014mb"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-slate-500 font-bold mb-1">
                      Operational Remarks / Activity Log
                    </label>
                    <input
                      type="text"
                      value={formData.activities}
                      onChange={(e) => setFormData({ ...formData, activities: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 px-2 py-1.5 text-xs"
                      placeholder="e.g. Monitored traffic, tested steering gear..."
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer Controls */}
              <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-mono uppercase font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveNewWatch}
                  className="px-4 py-1.5 bg-[#00A86B] hover:bg-emerald-600 text-white text-xs font-mono uppercase font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  Save Watch Duty
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. EDIT WATCH MODAL */}
      <AnimatePresence>
        {showEditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-300 shadow-2xl p-6 w-full max-w-xl relative max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-[#00A86B]" />
                  <div>
                    <h3 className="text-sm font-extrabold text-[#0A2540] uppercase tracking-wide">
                      Edit Watchkeeping Entry
                    </h3>
                    <p className="text-[10px] text-slate-400 font-mono">Update Duty Record or Directive</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-slate-500 font-bold mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-1.5 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-slate-500 font-bold mb-1">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as WatchStatus })}
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-1.5 text-xs"
                    >
                      <option value="scheduled">Scheduled</option>
                      <option value="active">Active / On Duty</option>
                      <option value="completed">Completed</option>
                      <option value="handed_over">Handed Over</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-slate-500 font-bold mb-1">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 px-2 py-1.5 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-slate-500 font-bold mb-1">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 px-2 py-1.5 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-slate-500 font-bold mb-1">
                      Watch Label
                    </label>
                    <input
                      type="text"
                      value={formData.watchPeriodName}
                      onChange={(e) => setFormData({ ...formData, watchPeriodName: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 px-2 py-1.5 text-xs"
                    />
                  </div>
                </div>

                {/* Team Details */}
                <div className="p-3 bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
                    <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-[#0A2540] uppercase">
                      <Users className="w-3.5 h-3.5 text-[#00A86B]" />
                      <span>Designated Watchstanding Team</span>
                    </div>

                    {/* Toggle: Sync from Deck Department Crew List */}
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <span className="text-[10px] font-mono font-bold text-slate-600 uppercase">
                        Sync from Deck Department Crew List
                      </span>
                      <div className="relative inline-flex items-center">
                        <input
                          type="checkbox"
                          checked={syncCrewFromDeck}
                          onChange={(e) => {
                            const val = e.target.checked;
                            setSyncCrewFromDeck(val);
                            localStorage.setItem("sms_sync_deck_crew", String(val));
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-8 h-4 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#00A86B]"></div>
                      </div>
                    </label>
                  </div>

                  {syncCrewFromDeck ? (
                    /* Dynamic Dropdown Mode */
                    <div className="space-y-3">
                      <div className="text-[10px] font-mono text-[#00A86B] bg-emerald-50/70 border border-emerald-200/80 px-2.5 py-1 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3 h-3 shrink-0 text-[#00A86B]" />
                          <span>Roster Synced: Deck Officers for OOW · Deck Ratings only for Helmsman & Lookout</span>
                        </span>
                        <span className="text-[9px] text-slate-500 font-sans">Officers strictly excluded from rating duties</span>
                      </div>

                      <div>
                        <label className="block text-[9px] font-mono text-slate-500 uppercase font-bold mb-1">
                          Designated Officer on Watch (OOW)
                          <span className="ml-1 text-[9px] font-normal text-slate-400 font-sans">(Licensed Deck Officers only · Master excluded)</span>
                        </label>
                        <select
                          value={formData.oow}
                          onChange={(e) => setFormData({ ...formData, oow: e.target.value })}
                          className="w-full bg-white border border-slate-200 px-2 py-1.5 text-xs font-semibold text-[#0A2540] focus:outline-none focus:border-[#00A86B]"
                        >
                          <option value="">-- Select Officer on Watch (Licensed) --</option>
                          {deckRoster.officers
                            .filter(off => !isMasterRank(off.rank))
                            .map(off => (
                              <option key={off.label} value={off.label}>
                                {off.label}
                              </option>
                            ))}
                          {formData.oow && 
                           !isMasterRank(formData.oow) && 
                           !deckRoster.officers.some(o => o.label === formData.oow) && (
                            <option value={formData.oow}>
                              {formData.oow} (Current Selection)
                            </option>
                          )}
                        </select>
                        <span className="text-[9px] text-slate-400 font-mono block mt-1">
                          * Master is in overall vessel command and is excluded from routine watchkeeping schedule.
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[9px] font-mono text-slate-500 uppercase font-bold mb-1">
                            Designated Helmsman (Rating)
                            <span className="ml-1 text-[9px] font-normal text-slate-400 font-sans">(Non-Officer Ratings only)</span>
                          </label>
                          <select
                            value={formData.helmsman}
                            onChange={(e) => setFormData({ ...formData, helmsman: e.target.value })}
                            className="w-full bg-white border border-slate-200 px-2 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:border-[#00A86B]"
                          >
                            <option value="">-- Select Designated Helmsman (Rating) --</option>
                            {deckRoster.ratings.map(rat => (
                              <option key={rat.label} value={rat.label}>
                                {rat.label}
                              </option>
                            ))}
                            {formData.helmsman && !deckRoster.ratings.some(r => r.label === formData.helmsman) && (
                              <option value={formData.helmsman}>
                                {formData.helmsman} (Current Selection)
                              </option>
                            )}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[9px] font-mono text-slate-500 uppercase font-bold mb-1">
                            Designated Lookout (Rating)
                            <span className="ml-1 text-[9px] font-normal text-slate-400 font-sans">(Non-Officer Ratings only)</span>
                          </label>
                          <select
                            value={formData.lookout}
                            onChange={(e) => setFormData({ ...formData, lookout: e.target.value })}
                            className="w-full bg-white border border-slate-200 px-2 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:border-[#00A86B]"
                          >
                            <option value="">-- Select Designated Lookout (Rating) --</option>
                            {deckRoster.ratings.map(rat => (
                              <option key={rat.label} value={rat.label}>
                                {rat.label}
                              </option>
                            ))}
                            <option value="None (Single-Watch Day Condition)">None (Single-Watch Day Condition)</option>
                            {formData.lookout && 
                             formData.lookout !== "None (Single-Watch Day Condition)" && 
                             !deckRoster.ratings.some(r => r.label === formData.lookout) && (
                              <option value={formData.lookout}>
                                {formData.lookout} (Current Selection)
                              </option>
                            )}
                          </select>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Fallback Manual Text Input Mode */
                    <div className="space-y-3">
                      <div className="text-[10px] font-mono text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-1 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Sliders className="w-3 h-3 text-slate-500" />
                          <span>Manual Mode: Custom text entry enabled for watchstanding team</span>
                        </span>
                        <span className="text-[9px] text-slate-400 font-sans">Freeform input</span>
                      </div>

                      <div>
                        <label className="block text-[9px] font-mono text-slate-500 uppercase font-bold mb-0.5">
                          Designated Officer on Watch (OOW)
                        </label>
                        <input
                          type="text"
                          value={formData.oow}
                          onChange={(e) => setFormData({ ...formData, oow: e.target.value })}
                          className="w-full bg-white border border-slate-200 px-2 py-1.5 text-xs font-medium"
                          placeholder="e.g. 2nd Officer - Yuki Tanaka"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[9px] font-mono text-slate-500 uppercase font-bold mb-0.5">
                            Designated Helmsman (Rating)
                          </label>
                          <input
                            type="text"
                            value={formData.helmsman}
                            onChange={(e) => setFormData({ ...formData, helmsman: e.target.value })}
                            className="w-full bg-white border border-slate-200 px-2 py-1.5 text-xs"
                            placeholder="e.g. AB-1 Esteban Santos"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-mono text-slate-500 uppercase font-bold mb-0.5">
                            Designated Lookout (Rating / Assistant)
                          </label>
                          <input
                            type="text"
                            value={formData.lookout}
                            onChange={(e) => setFormData({ ...formData, lookout: e.target.value })}
                            className="w-full bg-white border border-slate-200 px-2 py-1.5 text-xs"
                            placeholder="e.g. OS Muhammad Ali"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Chief Officer Directives */}
                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-500 font-bold mb-1">
                    Chief Officer Assignment / Orders
                  </label>
                  <textarea
                    rows={3}
                    value={formData.chiefOfficerAssignment}
                    onChange={(e) => setFormData({ ...formData, chiefOfficerAssignment: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 p-2 text-xs text-slate-800 focus:outline-none focus:border-[#00A86B]"
                  />
                </div>

                {/* Remarks & Activities */}
                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-500 font-bold mb-1">
                    Activities / Log Remarks
                  </label>
                  <textarea
                    rows={2}
                    value={formData.activities}
                    onChange={(e) => setFormData({ ...formData, activities: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 p-2 text-xs text-slate-800 focus:outline-none focus:border-[#00A86B]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-mono uppercase font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditedWatch}
                  className="px-4 py-1.5 bg-[#0A2540] hover:bg-slate-800 text-white text-xs font-mono uppercase font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  Save Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. DELETE CONFIRMATION DIALOG */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-300 p-6 w-full max-w-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2 text-red-600 mb-2">
                <AlertCircle className="w-5 h-5" />
                <h4 className="text-xs font-extrabold uppercase tracking-wide">Confirm Deletion</h4>
              </div>
              <p className="text-xs text-slate-600">
                Are you sure you want to delete this watchkeeping entry? This action will remove it from your personal log.
              </p>
              <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-100">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-mono uppercase font-bold"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteWatch(showDeleteConfirm)}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-mono uppercase font-bold"
                >
                  Delete Entry
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 6. BATCH DELETE CONFIRMATION DIALOG */}
      <AnimatePresence>
        {showBatchDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-300 p-6 w-full max-w-md shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2 text-red-600 mb-2">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <h4 className="text-sm font-extrabold uppercase tracking-wide">
                  Confirm Batch Delete Watch Tasks
                </h4>
              </div>

              <div className="text-xs text-slate-700 space-y-2 mt-2">
                <p>
                  {filterType === "all" && (
                    <>Are you sure you want to permanently delete <strong>all {filteredWatches.length} watchkeeping records</strong>?</>
                  )}
                  {filterType === "selected_date" && (
                    <>Are you sure you want to delete all <strong>{filteredWatches.length} watch tasks assigned to {selectedDateStr}</strong>?</>
                  )}
                  {filterType === "upcoming" && (
                    <>Are you sure you want to delete all <strong>{filteredWatches.length} upcoming/scheduled watch tasks</strong>?</>
                  )}
                  {filterType === "completed" && (
                    <>Are you sure you want to delete all <strong>{filteredWatches.length} completed/past watch tasks</strong>?</>
                  )}
                  {filterType === "personal" && (
                    <>Are you sure you want to delete all <strong>{filteredWatches.length} personal watch tasks</strong>?</>
                  )}
                </p>
                <div className="p-2.5 bg-red-50 border border-red-200 text-red-800 text-[11px] font-mono leading-relaxed">
                  <strong>Warning:</strong> This batch operation cannot be undone. These records will be permanently removed from your sea duty logbook.
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-5 pt-3 border-t border-slate-100">
                <button
                  onClick={() => setShowBatchDeleteModal(false)}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-mono uppercase font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmBatchDelete}
                  className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-mono uppercase font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Confirm Batch Delete ({filteredWatches.length} tasks)
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 7. PRE-WATCH & POST-WATCH TELEMETRY FORM MODAL */}
      <TelemetryFormModal
        isOpen={telemetryModalState.isOpen}
        onClose={() => setTelemetryModalState(prev => ({ ...prev, isOpen: false }))}
        mode={telemetryModalState.mode}
        watchTitle={targetTelemetryWatch?.watchPeriodName || "Bridge Watch Duty"}
        watchDate={targetTelemetryWatch?.date || "2026-09-27"}
        watchOow={targetTelemetryWatch?.team.oow || personalIdentity}
        initialData={
          telemetryModalState.mode === "pre_watch"
            ? targetTelemetryWatch?.preWatchTelemetry
            : telemetryModalState.mode === "post_watch"
              ? targetTelemetryWatch?.postWatchTelemetry
              : targetTelemetryWatch?.preWatchTelemetry
        }
        referencePreWatch={targetTelemetryWatch?.preWatchTelemetry}
        onSave={handleSaveTelemetry}
      />

      {/* 8. OFFICIAL TELEMETRY COMPARISON DIALOG MODAL */}
      <AnimatePresence>
        {viewingTelemetryWatch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-300 w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <Compass className="w-5 h-5 text-[#00A86B]" />
                  <div>
                    <h4 className="text-sm font-extrabold text-[#0A2540] uppercase">
                      Official Watchkeeping Telemetry Comparison Log
                    </h4>
                    <p className="text-[11px] font-mono text-slate-500">
                      {viewingTelemetryWatch.watchPeriodName} · {viewingTelemetryWatch.date} · Designated OOW: {viewingTelemetryWatch.team.oow}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setViewingTelemetryWatch(null)}
                  className="text-slate-400 hover:text-slate-700 font-bold p-1 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="my-4">
                <TelemetryComparisonView
                  preWatch={viewingTelemetryWatch.preWatchTelemetry}
                  postWatch={viewingTelemetryWatch.postWatchTelemetry}
                  onEditTelemetry={(mode) => {
                    const w = viewingTelemetryWatch;
                    setViewingTelemetryWatch(null);
                    handleInitiateUpdateTelemetry(w, mode);
                  }}
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <div className="text-[10px] font-mono text-slate-400">
                  Certified Bridge Logbook Record · STCW Reg. VIII/2
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const w = viewingTelemetryWatch;
                      setViewingTelemetryWatch(null);
                      handleInitiateUpdateTelemetry(w, w.status === "completed" || w.status === "handed_over" ? "post_watch" : "pre_watch");
                    }}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-[#0A2540] text-xs font-mono uppercase font-bold cursor-pointer transition-colors"
                  >
                    Edit Telemetry Readings
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewingTelemetryWatch(null)}
                    className="px-4 py-1.5 bg-[#0A2540] hover:bg-slate-800 text-white text-xs font-mono uppercase font-bold cursor-pointer transition-colors"
                  >
                    Close Log
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 8. RELIEVE OOW / HANDOVER SHIFT MODAL */}
      <AnimatePresence>
        {relievingWatch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-300 shadow-2xl p-6 w-full max-w-lg relative"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
                    <ArrowRightLeft className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-[#0A2540]">
                      Relieve Officer on Watch (OOW) & Handover Shift
                    </h3>
                    <p className="text-[10px] text-slate-400 font-mono">
                      STCW Bridge Handover & Preserved Duty Archive
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setRelievingWatch(null)}
                  className="text-slate-400 hover:text-slate-700 font-bold p-1 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleConfirmRelief} className="space-y-4 font-mono text-xs">
                {/* Current Watch Details & Relieved Officer */}
                <div className="p-3 bg-amber-50/70 border border-amber-200 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] uppercase font-bold text-amber-800">
                      Officer Currently on Watch (To Be Relieved)
                    </span>
                    <span className="text-[8px] bg-amber-200 text-amber-900 px-1.5 py-0.2 font-bold uppercase">
                      Duty Preserved
                    </span>
                  </div>
                  <div className="font-bold text-slate-900 text-xs">
                    {relievingWatch.team.oow}
                  </div>
                  <div className="text-[10px] text-slate-600 font-sans mt-0.5">
                    Shift: <strong>{relievingWatch.date}</strong> · <strong>{relievingWatch.watchPeriodName}</strong> ({relievingWatch.loggedHours} hrs)
                  </div>
                </div>

                {/* Incoming Officer Selection */}
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-bold text-slate-600">
                    Incoming Relieving Officer (Assuming OOW Duty)
                  </label>
                  <select
                    required
                    value={incomingOfficerForRelief}
                    onChange={(e) => setIncomingOfficerForRelief(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 p-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#0A2540]"
                  >
                    <option value="">-- Select Incoming Deck Officer --</option>
                    {deckRoster.officers
                      .filter(o => !isMasterRank(o.rank) && o.label !== relievingWatch.team.oow)
                      .map(o => (
                        <option key={o.label} value={o.label}>
                          {o.label}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Handover Directives / Notes */}
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-bold text-slate-600">
                    Handover Notes & Navigational Directives
                  </label>
                  <textarea
                    rows={3}
                    value={reliefRemarks}
                    onChange={(e) => setReliefRemarks(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 p-2 text-xs font-sans text-slate-800 focus:outline-none focus:border-[#0A2540] resize-none"
                    placeholder="Enter lookout status, traffic situation, weather, and steering directives..."
                  />
                </div>

                {/* Preservation Notice */}
                <div className="p-2.5 bg-blue-50 border border-blue-200 text-[10px] text-blue-900 font-sans flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                  <span>
                    Past watch hours and telemetry by <strong>{relievingWatch.team.oow}</strong> are archived in the <strong>Relieved Officer Watch History</strong> view and will not be overwritten.
                  </span>
                </div>

                {/* Modal Actions */}
                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setRelievingWatch(null)}
                    className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold uppercase cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-[#00A86B] hover:bg-emerald-600 text-white font-bold uppercase cursor-pointer flex items-center gap-1.5 shadow"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm Relief & Replace OOW</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
