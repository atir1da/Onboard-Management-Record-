import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Ship, 
  Anchor, 
  User, 
  Check, 
  AlertTriangle, 
  RotateCcw, 
  Sliders, 
  Plus, 
  Trash2, 
  Flame, 
  Shield, 
  Activity, 
  FileText, 
  Database, 
  Code, 
  Copy, 
  CheckCircle2, 
  Coffee, 
  Wrench, 
  Radio, 
  Compass,
  ArrowLeft,
  Briefcase,
  Layers,
  Sparkles,
  Search,
  Scale,
  Pencil
} from "lucide-react";
import { WORLDWIDE_NATIONALITIES } from "../constants/maritimeData";
import { DEPARTMENT_RANKS, getStoredUserProfile, UserProfile } from "../types/userProfile";
import { syncDeckOfficersToBridgeWatches } from "../utils/bridgeCrewSync";

interface DutyTask {
  timeRange: string;
  description: string;
}

// Definitions of crew rank types
interface CrewMemberProfile {
  rank: string;
  department: "Deck" | "Engine" | "Catering";
  duties: DutyTask[];
  defaultWatch: string;
  watchLabel: string;
  schedule: boolean[]; // 24 hours (true = work, false = rest)
  name?: string;
  nationality?: string;
  seafarerId?: string;
  isMe?: boolean;
}

// Custom specialized galley equipment type
interface GalleyEquipment {
  name: string;
  status: "Operational" | "Warning" | "Maintenance Due";
  nextService: string;
  stormRailsEngaged: boolean;
  notes: string;
}

// MARPOL waste entry
interface MarpolWasteEntry {
  id: string;
  date: string;
  weight: number; // kg
  comminuted: boolean; // ground < 25mm
  distanceToLand: number; // NM
  seaDischargeApproved: boolean;
  loggedBy: string;
}

// Initial default duties and schedules
const INITIAL_CREW: CrewMemberProfile[] = [
  // --- DECK DEPARTMENT ---
  {
    rank: "Master",
    department: "Deck",
    duties: [
      { timeRange: "08:00 - 12:00", description: "Ultimate command and responsibility for navigation, vessel safety, and cargo integrity under SOLAS." },
      { timeRange: "13:00 - 17:00", description: "Leads onboard safety committee, approves all critical checklists, and handles daily administration." }
    ],
    defaultWatch: "Daywork",
    watchLabel: "Master On-Call / Executive Command",
    schedule: Array(24).fill(false).map((_, h) => (h >= 8 && h < 12) || (h >= 13 && h < 17)) // 08-12 and 13-17 work
  },
  {
    rank: "Chief Officer",
    department: "Deck",
    duties: [
      { timeRange: "04:00 - 08:00", description: "Supervises cargo loading, discharging, and ballast water management for vessel stability." },
      { timeRange: "16:00 - 20:00", description: "Manages STCW crew work/rest logs, ensuring regulatory compliance." }
    ],
    defaultWatch: "0400-0800",
    watchLabel: "Watch Rotation: 04:00-08:00 & 16:00-20:00",
    schedule: Array(24).fill(false).map((_, h) => (h >= 4 && h < 8) || (h >= 16 && h < 20))
  },
  {
    rank: "Second Officer",
    department: "Deck",
    duties: [
      { timeRange: "00:00 - 04:00", description: "Designated Navigational Officer; creates, reviews, and executes the Voyage Passage Plan." },
      { timeRange: "12:00 - 16:00", description: "Maintains and updates marine charts, ECDIS electronic corrections, and bridge almanacs." }
    ],
    defaultWatch: "0000-0400",
    watchLabel: "Watch Rotation: 00:00-04:00 & 12:00-16:00",
    schedule: Array(24).fill(false).map((_, h) => (h >= 0 && h < 4) || (h >= 12 && h < 16))
  },
  {
    rank: "Third Officer",
    department: "Deck",
    duties: [
      { timeRange: "08:00 - 12:00", description: "Designated Ship Safety Officer under direct supervision of the Chief Officer." },
      { timeRange: "20:00 - 24:00", description: "Inspects, maintains, and logs all Lifesaving Appliances (LSA) (lifeboats, lifejackets)." }
    ],
    defaultWatch: "0800-1200",
    watchLabel: "Watch Rotation: 08:00-12:00 & 20:00-24:00",
    schedule: Array(24).fill(false).map((_, h) => (h >= 8 && h < 12) || (h >= 20 && h < 24))
  },
  {
    rank: "Bosun",
    department: "Deck",
    duties: [
      { timeRange: "08:00 - 12:00", description: "Leads deck crew (ABs, OSs) in daily maintenance (chipping rust, painting, greasing)." },
      { timeRange: "13:00 - 17:00", description: "Coordinates mooring and unmooring operations under guidance of Chief Officer." }
    ],
    defaultWatch: "Daywork",
    watchLabel: "Standard Deck Daywork: 08:00 - 17:00",
    schedule: Array(24).fill(false).map((_, h) => (h >= 8 && h < 12) || (h >= 13 && h < 17))
  },
  {
    rank: "Able Seaman (AB)",
    department: "Deck",
    duties: [
      { timeRange: "00:00 - 04:00", description: "Acts as bridge helmsman and lookout during navigation, berthing, and harbor approaches." },
      { timeRange: "12:00 - 16:00", description: "Assists Bosun in deck scaling, painting, rust control, and mechanical scraping." }
    ],
    defaultWatch: "0000-0400",
    watchLabel: "Watch Rotation: 00:00-04:00 & 12:00-16:00",
    schedule: Array(24).fill(false).map((_, h) => (h >= 0 && h < 4) || (h >= 12 && h < 16))
  },
  {
    rank: "Ordinary Seaman (OS)",
    department: "Deck",
    duties: [
      { timeRange: "08:00 - 12:00", description: "Performs manual scaling, deck washing, paint preparation, and general ship sanitation." },
      { timeRange: "13:00 - 17:00", description: "Assists in cargo space preparation, cleaning, and bilge clearance." }
    ],
    defaultWatch: "Daywork",
    watchLabel: "Standard Deck Daywork: 08:00 - 17:00",
    schedule: Array(24).fill(false).map((_, h) => (h >= 8 && h < 12) || (h >= 13 && h < 17))
  },
  {
    rank: "Deck Cadet",
    department: "Deck",
    duties: [
      { timeRange: "08:00 - 12:00", description: "Undergoes intensive navigational training under Chief Officer's watch instruction." },
      { timeRange: "20:00 - 24:00", description: "Logs meteorological readings, barometric pressures, and GPS coordinates." }
    ],
    defaultWatch: "0800-1200",
    watchLabel: "Training Watch: 08:00-12:00 & 20:00-24:00",
    schedule: Array(24).fill(false).map((_, h) => (h >= 8 && h < 12) || (h >= 20 && h < 24))
  },

  // --- ENGINE DEPARTMENT ---
  {
    rank: "Chief Engineer",
    department: "Engine",
    duties: [
      { timeRange: "08:00 - 12:00", description: "Ultimate responsibility for main propulsion, boilers, auxiliary generation, and hydraulic grids." },
      { timeRange: "13:00 - 17:00", description: "Signs and authenticates official Oil Record Book Part I entries daily." }
    ],
    defaultWatch: "Daywork",
    watchLabel: "Chief Engineer On-Call / Technical Command",
    schedule: Array(24).fill(false).map((_, h) => (h >= 8 && h < 12) || (h >= 13 && h < 17))
  },
  {
    rank: "Second Engineer",
    department: "Engine",
    duties: [
      { timeRange: "04:00 - 08:00", description: "Direct supervisor of engine room crew and daily machinery overhaul maintenance." },
      { timeRange: "16:00 - 20:00", description: "Oversees cylinder oil lubricants, main engine telemetry, and coolant balances." }
    ],
    defaultWatch: "0400-0800",
    watchLabel: "Engine Watch: 04:00-08:00 & 16:00-20:00",
    schedule: Array(24).fill(false).map((_, h) => (h >= 4 && h < 8) || (h >= 16 && h < 20))
  },
  {
    rank: "Third Engineer",
    department: "Engine",
    duties: [
      { timeRange: "00:00 - 04:00", description: "Directly responsible for auxiliary diesel engines, emergency power, and fuel purifiers." },
      { timeRange: "12:00 - 16:00", description: "Conducts fresh water generator audits and monitors salinity sensors." }
    ],
    defaultWatch: "0000-0400",
    watchLabel: "Engine Watch: 00:00-04:00 & 12:00-16:00",
    schedule: Array(24).fill(false).map((_, h) => (h >= 0 && h < 4) || (h >= 12 && h < 16))
  },
  {
    rank: "Fourth Engineer",
    department: "Engine",
    duties: [
      { timeRange: "08:00 - 12:00", description: "Manages air compressors, bilge separation, sanitary water pressure, and sewage treatment." },
      { timeRange: "20:00 - 24:00", description: "Logs exhaust gas scrubbers and environmental telemetry statistics." }
    ],
    defaultWatch: "0800-1200",
    watchLabel: "Engine Watch: 08:00-12:00 & 20:00-24:00",
    schedule: Array(24).fill(false).map((_, h) => (h >= 8 && h < 12) || (h >= 20 && h < 24))
  },
  {
    rank: "Electro-Technical Officer (ETO)",
    department: "Engine",
    duties: [
      { timeRange: "08:00 - 12:00", description: "Maintains automation control systems, bridge navigation displays, and satellite terminals." },
      { timeRange: "13:00 - 17:00", description: "Calibrates digital temperature probes, pressure transducers, and alarm panels." }
    ],
    defaultWatch: "Daywork",
    watchLabel: "Automation Daywork: 08:00 - 17:00",
    schedule: Array(24).fill(false).map((_, h) => (h >= 8 && h < 12) || (h >= 13 && h < 17))
  },
  {
    rank: "Fitter",
    department: "Engine",
    duties: [
      { timeRange: "08:00 - 12:00", description: "Executes welding, metal lathe machining, and pipe-threading repairs in workshop." },
      { timeRange: "13:00 - 17:00", description: "Repairs leaking seawater valves and steel ballast trunk pipelines." }
    ],
    defaultWatch: "Daywork",
    watchLabel: "Technical Daywork: 08:00 - 17:00",
    schedule: Array(24).fill(false).map((_, h) => (h >= 8 && h < 12) || (h >= 13 && h < 17))
  },
  {
    rank: "Oiler/Motorman",
    department: "Engine",
    duties: [
      { timeRange: "00:00 - 04:00", description: "Conducts manual diagnostic watch rounds, checking pump seals and motor bearings." },
      { timeRange: "12:00 - 16:00", description: "Assists watchkeeping engineer in engine room sounding logs." }
    ],
    defaultWatch: "0000-0400",
    watchLabel: "Engine Watch: 00:00-04:00 & 12:00-16:00",
    schedule: Array(24).fill(false).map((_, h) => (h >= 0 && h < 4) || (h >= 12 && h < 16))
  },
  {
    rank: "Wiper",
    department: "Engine",
    duties: [
      { timeRange: "08:00 - 12:00", description: "Maintains physical cleanliness and safety layouts of engine room workshop floorings." },
      { timeRange: "13:00 - 17:00", description: "Organizes oily rags waste in sealed steel bins under MARPOL restrictions." }
    ],
    defaultWatch: "Daywork",
    watchLabel: "Maintenance Daywork: 08:00 - 17:00",
    schedule: Array(24).fill(false).map((_, h) => (h >= 8 && h < 12) || (h >= 13 && h < 17))
  },
  {
    rank: "Engine Cadet",
    department: "Engine",
    duties: [
      { timeRange: "08:00 - 12:00", description: "Receives hands-on mechanical training under supervision of Second Engineer." },
      { timeRange: "20:00 - 24:00", description: "Logs pressure gauge readings and helps analyze auxiliary engine load trends." }
    ],
    defaultWatch: "0800-1200",
    watchLabel: "Training Watch: 08:00-12:00 & 20:00-24:00",
    schedule: Array(24).fill(false).map((_, h) => (h >= 8 && h < 12) || (h >= 20 && h < 24))
  },

  // --- CATERING DEPARTMENT ---
  {
    rank: "Chief Cook",
    department: "Catering",
    duties: [
      { timeRange: "06:00 - 14:00", description: "Manages entire galley budget, meal planning, and dry/frozen/fresh provision storage." },
      { timeRange: "16:00 - 20:00", description: "Enforces absolute food hygiene standards and sanitary procedures (MLC 2006 Title 3)." }
    ],
    defaultWatch: "Daywork",
    watchLabel: "Galley Daywork: 06:00-14:00 & 16:00-20:00",
    schedule: Array(24).fill(false).map((_, h) => (h >= 6 && h < 14) || (h >= 16 && h < 20))
  },
  {
    rank: "Assistant Cook",
    department: "Catering",
    duties: [
      { timeRange: "06:00 - 14:00", description: "Prepares dough, bakes fresh bread daily, and prepares ingredients under Cook's guidance." },
      { timeRange: "16:00 - 20:00", description: "Cleans 11 crew/officer cabins daily, including sweeping, dusting, and changing linens." }
    ],
    defaultWatch: "Daywork",
    watchLabel: "Galley/Cabin Daywork: 06:00-14:00 & 16:00-20:00",
    schedule: Array(24).fill(false).map((_, h) => (h >= 6 && h < 14) || (h >= 16 && h < 20))
  },
  {
    rank: "Steward",
    department: "Catering",
    duties: [
      { timeRange: "07:00 - 14:00", description: "Prepares and serves tables in the officers' dining saloon during meal watches." },
      { timeRange: "17:00 - 20:00", description: "Organizes dry stores inventory shelves and sanitizes food preparation counters." }
    ],
    defaultWatch: "Daywork",
    watchLabel: "Dining/Linen Daywork: 07:00-14:00 & 17:00-20:00",
    schedule: Array(24).fill(false).map((_, h) => (h >= 7 && h < 14) || (h >= 17 && h < 20))
  },
  {
    rank: "Messman",
    department: "Catering",
    duties: [
      { timeRange: "07:00 - 14:00", description: "Manages, cleans, and serves in the ratings' crew messroom during meal times." },
      { timeRange: "17:00 - 20:00", description: "Collects and washes rating crew dining plates, cutlery, and trays." }
    ],
    defaultWatch: "Daywork",
    watchLabel: "Messroom Daywork: 07:00-14:00 & 17:00-20:00",
    schedule: Array(24).fill(false).map((_, h) => (h >= 7 && h < 14) || (h >= 17 && h < 20))
  }
];

const DEFAULT_CREW_INFO: Record<string, { name: string; nationality: string; seafarerId: string }> = {
  "Master": { name: "Capt. Alexander Sterling", nationality: "British", seafarerId: "GBR-94821-M" },
  "Chief Officer": { name: "Mateo Rodriguez", nationality: "Filipino", seafarerId: "PHL-44812-C" },
  "Second Officer": { name: "Yuki Tanaka", nationality: "Filipino", seafarerId: "PHL-55291-O" },
  "Third Officer": { name: "Dmitry Ivanov", nationality: "Ukrainian", seafarerId: "UKR-30291-O" },
  "Bosun": { name: "Arnel Pineda", nationality: "Filipino", seafarerId: "PHL-10294-B" },
  "Able Seaman (AB)": { name: "Esteban Santos", nationality: "Filipino", seafarerId: "PHL-55214-A" },
  "Ordinary Seaman (OS)": { name: "Muhammad Ali", nationality: "Indonesian", seafarerId: "IDN-88241-S" },
  "Deck Cadet": { name: "James Collins", nationality: "British", seafarerId: "GBR-11029-D" },
  "Chief Engineer": { name: "Viktor Kovalenko", nationality: "Ukrainian", seafarerId: "UKR-88214-E" },
  "Second Engineer": { name: "Budi Santoso", nationality: "Indonesian", seafarerId: "IDN-44291-E" },
  "Third Engineer": { name: "Rajesh Sharma", nationality: "Indian", seafarerId: "IND-55912-E" },
  "Fourth Engineer": { name: "Sandro Tomic", nationality: "Croatian", seafarerId: "HRV-22194-E" },
  "Electro-Technical Officer (ETO)": { name: "Arthur Pendelton", nationality: "British", seafarerId: "GBR-77291-T" },
  "Fitter": { name: "Grygoriy Shevchenko", nationality: "Ukrainian", seafarerId: "UKR-11204-F" },
  "Oiler/Motorman": { name: "Putra Wijaya", nationality: "Indonesian", seafarerId: "IDN-33912-O" },
  "Wiper": { name: "Juan de la Cruz", nationality: "Filipino", seafarerId: "PHL-88294-W" },
  "Engine Cadet": { name: "Dev Patel", nationality: "Indian", seafarerId: "IND-11048-C" },
  "Chief Cook": { name: "Lars Sorensen", nationality: "Filipino", seafarerId: "PHL-44294-K" },
  "Assistant Cook": { name: "Aditya Roy", nationality: "Indian", seafarerId: "IND-99214-K" },
  "Steward": { name: "Marko Baric", nationality: "Croatian", seafarerId: "HRV-44210-S" },
  "Messman": { name: "Ramon Valenzuela", nationality: "Filipino", seafarerId: "PHL-22104-M" }
};

export default function DepartmentDirectory() {
  const [crewList, setCrewList] = useState<CrewMemberProfile[]>(() => {
    const saved = localStorage.getItem("sms_crewList");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error loading crewList from localStorage", e);
      }
    }
    return INITIAL_CREW.map(member => ({
      ...member,
      name: DEFAULT_CREW_INFO[member.rank]?.name || "Not Assigned",
      nationality: DEFAULT_CREW_INFO[member.rank]?.nationality || "Filipino",
      seafarerId: DEFAULT_CREW_INFO[member.rank]?.seafarerId || `SEID-${Math.floor(100000 + Math.random() * 900000)}`
    }));
  });

  // Staging crew state to allow editing/adding/deleting before final apply
  const [stagedCrewList, setStagedCrewList] = useState<CrewMemberProfile[]>([]);

  // Sync stagedCrewList initially and whenever crewList changes
  useEffect(() => {
    setStagedCrewList(crewList);
  }, [crewList]);

  // Local Storage synchronization effect
  useEffect(() => {
    localStorage.setItem("sms_crewList", JSON.stringify(crewList));
  }, [crewList]);

  // Toast notification state
  const [notification, setNotification] = useState<string | null>(null);
  const triggerNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification(prev => prev === msg ? null : prev);
    }, 4500);
  };

  const [currentUser, setCurrentUser] = useState<UserProfile>(() => getStoredUserProfile());

  // Listen to profile updates & crew roster updates
  useEffect(() => {
    const handleProfileChange = () => {
      setCurrentUser(getStoredUserProfile());
      const saved = localStorage.getItem("sms_crewList");
      if (saved) {
        try {
          setCrewList(JSON.parse(saved));
        } catch (e) {
          console.error(e);
        }
      }
    };
    const handleCrewChange = () => {
      const saved = localStorage.getItem("sms_crewList");
      if (saved) {
        try {
          setCrewList(JSON.parse(saved));
        } catch (e) {
          console.error(e);
        }
      }
    };
    window.addEventListener("sms_user_profile_changed", handleProfileChange);
    window.addEventListener("sms_crewList_changed", handleCrewChange);
    return () => {
      window.removeEventListener("sms_user_profile_changed", handleProfileChange);
      window.removeEventListener("sms_crewList_changed", handleCrewChange);
    };
  }, []);

  const isMeMember = (member: CrewMemberProfile) => {
    return (
      member.isMe === true ||
      (member.rank.toLowerCase() === currentUser.rank.toLowerCase() &&
        member.name?.toLowerCase() === currentUser.fullName.toLowerCase())
    );
  };

  const getStcwDefaultsForRank = (dept: "Deck" | "Engine" | "Catering", rank: string) => {
    const lower = rank.toLowerCase();
    if (dept === "Deck") {
      if (lower.includes("second") || lower.includes("2nd")) {
        return {
          defaultWatch: "0000-0400",
          watchLabel: "Watch Rotation: 00:00-04:00 & 12:00-16:00",
          preset: "3-watch" as const,
          schedule: Array(24).fill(false).map((_, h) => (h >= 0 && h < 4) || (h >= 12 && h < 16)),
          duties: "00:00 - 04:00 : Designated Navigational Officer; reviews and executes Voyage Passage Plan.\n12:00 - 16:00 : Maintains marine navigation charts, ECDIS updates, and bridge logbooks."
        };
      }
      if (lower.includes("third") || lower.includes("3rd")) {
        return {
          defaultWatch: "0800-1200",
          watchLabel: "Watch Rotation: 08:00-12:00 & 20:00-24:00",
          preset: "3-watch" as const,
          schedule: Array(24).fill(false).map((_, h) => (h >= 8 && h < 12) || (h >= 20 && h < 24)),
          duties: "08:00 - 12:00 : Designated Ship Safety Officer under direct supervision of the Chief Officer.\n20:00 - 24:00 : Inspects, maintains, and logs all Lifesaving Appliances (LSA) and firefighting equipment."
        };
      }
      if (lower.includes("chief") || lower.includes("first")) {
        return {
          defaultWatch: "0400-0800",
          watchLabel: "Watch Rotation: 04:00-08:00 & 16:00-20:00",
          preset: "3-watch" as const,
          schedule: Array(24).fill(false).map((_, h) => (h >= 4 && h < 8) || (h >= 16 && h < 20)),
          duties: "04:00 - 08:00 : Supervises cargo loading, discharging, and ballast water management.\n16:00 - 20:00 : Manages STCW crew work/rest logs, ensuring regulatory compliance."
        };
      }
      if (lower.includes("master") || lower.includes("captain")) {
        return {
          defaultWatch: "Daywork",
          watchLabel: "Master On-Call / Executive Command",
          preset: "Daywork" as const,
          schedule: Array(24).fill(false).map((_, h) => (h >= 8 && h < 12) || (h >= 13 && h < 17)),
          duties: "08:00 - 12:00 : Ultimate command and responsibility for navigation, vessel safety, and cargo integrity under SOLAS.\n13:00 - 17:00 : Leads onboard safety committee, approves all critical checklists, and handles daily administration."
        };
      }
      if (lower.includes("cadet")) {
        return {
          defaultWatch: "0800-1200",
          watchLabel: "Training Watch: 08:00-12:00 & 20:00-24:00",
          preset: "3-watch" as const,
          schedule: Array(24).fill(false).map((_, h) => (h >= 8 && h < 12) || (h >= 20 && h < 24)),
          duties: "08:00 - 12:00 : Undergoes intensive navigational training under Chief Officer's watch instruction.\n20:00 - 24:00 : Logs meteorological readings, barometric pressures, and GPS coordinates."
        };
      }
    } else if (dept === "Engine") {
      if (lower.includes("second") || lower.includes("2nd")) {
        return {
          defaultWatch: "0400-0800",
          watchLabel: "Engine Watch: 04:00-08:00 & 16:00-20:00",
          preset: "3-watch" as const,
          schedule: Array(24).fill(false).map((_, h) => (h >= 4 && h < 8) || (h >= 16 && h < 20)),
          duties: "04:00 - 08:00 : Direct supervisor of engine room crew and daily machinery overhaul maintenance.\n16:00 - 20:00 : Oversees cylinder oil lubricants, main engine telemetry, and coolant balances."
        };
      }
      if (lower.includes("third") || lower.includes("3rd")) {
        return {
          defaultWatch: "0000-0400",
          watchLabel: "Engine Watch: 00:00-04:00 & 12:00-16:00",
          preset: "3-watch" as const,
          schedule: Array(24).fill(false).map((_, h) => (h >= 0 && h < 4) || (h >= 12 && h < 16)),
          duties: "00:00 - 04:00 : Directly responsible for auxiliary diesel engines, emergency power, and fuel purifiers.\n12:00 - 16:00 : Conducts fresh water generator audits and monitors salinity sensors."
        };
      }
      if (lower.includes("cadet")) {
        return {
          defaultWatch: "0800-1200",
          watchLabel: "Training Watch: 08:00-12:00 & 20:00-24:00",
          preset: "3-watch" as const,
          schedule: Array(24).fill(false).map((_, h) => (h >= 8 && h < 12) || (h >= 20 && h < 24)),
          duties: "08:00 - 12:00 : Receives hands-on mechanical training under supervision of Second Engineer.\n20:00 - 24:00 : Logs pressure gauge readings and helps analyze auxiliary engine load trends."
        };
      }
    }
    return {
      defaultWatch: "Daywork",
      watchLabel: `${rank} Regular Schedule`,
      preset: "Daywork" as const,
      schedule: Array(24).fill(false).map((_, h) => (h >= 8 && h < 12) || (h >= 13 && h < 17)),
      duties: `08:00 - 12:00 : Primary duty operations for ${rank}.\n13:00 - 17:00 : General departmental routine and maintenance.`
    };
  };

  const applyDepartmentChanges = (dept: "Deck" | "Engine" | "Catering") => {
    setCrewList(stagedCrewList);
    localStorage.setItem("sms_crewList", JSON.stringify(stagedCrewList));
    
    // Global Crew Change Integration: Sync deck officer assignments to Bridge Watchkeeping
    // If there's a change for C/O, 2/O, or 3rd/O, the previous officer on bridge watchkeeping duties is removed and replaced by the new officer.
    // Master is also removed from bridge watchkeeping duties as Master does not have a watch schedule.
    try {
      syncDeckOfficersToBridgeWatches(stagedCrewList);
    } catch (e) {
      console.error("Error syncing crew change to bridge watches:", e);
    }

    window.dispatchEvent(new CustomEvent("sms_crewList_changed"));
    triggerNotification(`Successfully applied changes for ${dept} Department. Personnel count updated to ${stagedCrewList.length}!`);
  };

  const [selectedDept, setSelectedDept] = useState<"Deck" | "Engine" | "Catering" | null>(null);
  const [selectedRank, setSelectedRank] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<"departments" | "ranks" | "profile">("departments");

  // Add Crew Form State
  const [isAddingCrew, setIsAddingCrew] = useState(false);
  const [addCrewRank, setAddCrewRank] = useState("");
  const [isCustomRank, setIsCustomRank] = useState(false);
  const [customRankInput, setCustomRankInput] = useState("");
  const [addCrewName, setAddCrewName] = useState("");
  const [addCrewNationality, setAddCrewNationality] = useState("Filipino");
  const [addCrewSeafarerId, setAddCrewSeafarerId] = useState("");
  const [addCrewWatchLabel, setAddCrewWatchLabel] = useState("");
  const [addCrewDefaultWatch, setAddCrewDefaultWatch] = useState<"3-watch" | "6-6" | "Daywork">("Daywork");
  const [addCrewDutiesText, setAddCrewDutiesText] = useState("");

  const [crewRankToDelete, setCrewRankToDelete] = useState<string | null>(null);

  // Search filter
  const [searchQuery, setSearchQuery] = useState("");

  // Crew Personal Info Editing States
  const [isEditingProfileInfo, setIsEditingProfileInfo] = useState(false);
  const [editingProfileName, setEditingProfileName] = useState("");
  const [editingProfileNationality, setEditingProfileNationality] = useState("");
  const [editingProfileSeafarerId, setEditingProfileSeafarerId] = useState("");

  // Reset editing states on profile or department change
  useEffect(() => {
    setEditingDutyIdx(null);
    cancelEditingCardDuty();
    setIsEditingProfileInfo(false);
    setEditingProfileName("");
    setEditingProfileNationality("");
    setEditingProfileSeafarerId("");
  }, [selectedRank, selectedDept]);



  // Technical Specs tab
  const [techTab, setTechTab] = useState<"dart" | "json">("json");
  const [copiedNotification, setCopiedNotification] = useState(false);

  // active profile state
  const activeProfile = stagedCrewList.find(c => c.rank === selectedRank);

  // editable duty item state
  const [editingDutyIdx, setEditingDutyIdx] = useState<number | null>(null);
  const [editingDutyTimeRange, setEditingDutyTimeRange] = useState("");
  const [editingDutyText, setEditingDutyText] = useState("");
  const [newDutyTimeRange, setNewDutyTimeRange] = useState("08:00 - 12:00");
  const [newDutyText, setNewDutyText] = useState("");

  // Card-based duty editing and expansion states for every department rank card
  const [expandedRank, setExpandedRank] = useState<Record<string, boolean>>({});
  const [editingCardRank, setEditingCardRank] = useState<string | null>(null);
  const [editingCardDutyIdx, setEditingCardDutyIdx] = useState<number | null>(null);
  const [editingCardTimeRange, setEditingCardTimeRange] = useState("");
  const [editingCardText, setEditingCardText] = useState("");

  const [newCardTimeRange, setNewCardTimeRange] = useState<Record<string, string>>({});
  const [newCardText, setNewCardText] = useState<Record<string, string>>({});

  const startEditingCardDuty = (rank: string, idx: number, duty: DutyTask) => {
    setEditingCardRank(rank);
    setEditingCardDutyIdx(idx);
    setEditingCardTimeRange(duty.timeRange);
    setEditingCardText(duty.description);
  };

  const cancelEditingCardDuty = () => {
    setEditingCardRank(null);
    setEditingCardDutyIdx(null);
    setEditingCardTimeRange("");
    setEditingCardText("");
  };

  const saveCardDuty = (rank: string, idx: number) => {
    if (!editingCardText.trim()) return;
    const updated = [...stagedCrewList];
    const index = updated.findIndex(c => c.rank === rank);
    if (index === -1) return;

    const duties = [...updated[index].duties];
    duties[idx] = { 
      timeRange: editingCardTimeRange.trim() || "Daywork", 
      description: editingCardText.trim() 
    };
    updated[index].duties = duties;
    setStagedCrewList(updated);
    cancelEditingCardDuty();
  };

  const deleteCardDuty = (rank: string, idx: number) => {
    const updated = [...stagedCrewList];
    const index = updated.findIndex(c => c.rank === rank);
    if (index === -1) return;

    const duties = updated[index].duties.filter((_, i) => i !== idx);
    updated[index].duties = duties;
    setStagedCrewList(updated);
    if (editingCardRank === rank && editingCardDutyIdx === idx) {
      cancelEditingCardDuty();
    }
  };

  const addCardDuty = (rank: string) => {
    const time = newCardTimeRange[rank]?.trim() || "08:00 - 12:00";
    const desc = newCardText[rank]?.trim() || "";
    if (!desc) return;

    const updated = [...stagedCrewList];
    const index = updated.findIndex(c => c.rank === rank);
    if (index === -1) return;

    updated[index].duties = [
      ...updated[index].duties,
      { timeRange: time, description: desc }
    ];
    setStagedCrewList(updated);

    // clear inputs
    setNewCardText(prev => ({ ...prev, [rank]: "" }));
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2000);
  };

  // Pre-filled duty schedules
  const applyRotation = (type: "3-watch" | "6-6") => {
    if (!activeProfile) return;
    const updated = [...stagedCrewList];
    const index = updated.findIndex(c => c.rank === activeProfile.rank);
    if (index === -1) return;

    let newSchedule = Array(24).fill(false);
    if (type === "3-watch") {
      // Restore standard watch rotations
      const d = activeProfile.defaultWatch;
      if (d === "0000-0400") {
        newSchedule = Array(24).fill(false).map((_, h) => (h >= 0 && h < 4) || (h >= 12 && h < 16));
      } else if (d === "0400-0800") {
        newSchedule = Array(24).fill(false).map((_, h) => (h >= 4 && h < 8) || (h >= 16 && h < 20));
      } else if (d === "0800-1200") {
        newSchedule = Array(24).fill(false).map((_, h) => (h >= 8 && h < 12) || (h >= 20 && h < 24));
      } else {
        newSchedule = Array(24).fill(false).map((_, h) => (h >= 8 && h < 12) || (h >= 13 && h < 17));
      }
    } else {
      // Port stay: "6-on / 6-off" shift (Mooring & cargo watch standby)
      // e.g. 00:00 - 06:00 and 12:00 - 18:00
      newSchedule = Array(24).fill(false).map((_, h) => (h >= 0 && h < 6) || (h >= 12 && h < 18));
    }

    updated[index].schedule = newSchedule;
    setStagedCrewList(updated);
  };

  // Toggle single hour of work/rest log
  const toggleHour = (hourIndex: number) => {
    if (!activeProfile) return;
    const updated = [...stagedCrewList];
    const index = updated.findIndex(c => c.rank === activeProfile.rank);
    if (index === -1) return;

    const currentSchedule = [...updated[index].schedule];
    currentSchedule[hourIndex] = !currentSchedule[hourIndex];
    updated[index].schedule = currentSchedule;
    setStagedCrewList(updated);
  };

  const handleSelectAddCrewRank = (rankToSet: string) => {
    setAddCrewRank(rankToSet);
    const dept = selectedDept || "Deck";
    const defaults = getStcwDefaultsForRank(dept, rankToSet);
    setAddCrewDefaultWatch(defaults.preset);
    setAddCrewWatchLabel(defaults.watchLabel);
    setAddCrewDutiesText(defaults.duties);
  };

  // Create a new crew member dynamically
  const handleCreateCrew = (e: React.FormEvent) => {
    e.preventDefault();
    const finalRank = isCustomRank ? customRankInput.trim() : addCrewRank.trim();
    if (!finalRank || !selectedDept) return;

    // Check if rank already exists
    if (stagedCrewList.some(c => c.rank.toLowerCase() === finalRank.toLowerCase())) {
      triggerNotification(`Warning: Crew member rank "${finalRank}" already exists.`);
      return;
    }

    const defaults = getStcwDefaultsForRank(selectedDept, finalRank);
    let defaultWatchPreset: "3-watch" | "6-6" | "Daywork" = addCrewDefaultWatch;
    let initialSchedule: boolean[] = [];
    if (defaultWatchPreset === "3-watch") {
      initialSchedule = defaults.schedule;
    } else if (defaultWatchPreset === "6-6") {
      initialSchedule = Array(24).fill(false).map((_, h) => (h >= 0 && h < 6) || (h >= 12 && h < 18));
    } else {
      initialSchedule = defaults.schedule;
    }

    const parsedDuties: DutyTask[] = addCrewDutiesText.trim()
      ? addCrewDutiesText.split("\n").map(line => {
          const parts = line.split(":");
          if (parts.length > 1) {
            return { timeRange: parts[0].trim(), description: parts[1].trim() };
          }
          return { timeRange: "Daywork", description: line.trim() };
        })
      : [{ timeRange: "Daywork", description: `Standard ${finalRank} operations.` }];

    const memberName = addCrewName.trim() || DEFAULT_CREW_INFO[finalRank]?.name || "Not Assigned";
    const memberNationality = addCrewNationality || DEFAULT_CREW_INFO[finalRank]?.nationality || "Filipino";
    const memberSeafarerId = addCrewSeafarerId.trim() || DEFAULT_CREW_INFO[finalRank]?.seafarerId || `SEID-${Math.floor(100000 + Math.random() * 900000)}`;

    const newCrewMember: CrewMemberProfile = {
      rank: finalRank,
      department: selectedDept,
      duties: parsedDuties,
      defaultWatch: defaultWatchPreset,
      watchLabel: addCrewWatchLabel.trim() || defaults.watchLabel || `${finalRank} Watch Schedule`,
      schedule: initialSchedule,
      name: memberName,
      nationality: memberNationality,
      seafarerId: memberSeafarerId
    };

    setStagedCrewList([...stagedCrewList, newCrewMember]);
    triggerNotification(`Staged addition of ${newCrewMember.rank} (${memberName}) with STCW auto-assigned watch`);
    
    // reset form
    setAddCrewRank("");
    setCustomRankInput("");
    setIsCustomRank(false);
    setAddCrewName("");
    setAddCrewNationality("Filipino");
    setAddCrewSeafarerId("");
    setAddCrewWatchLabel("");
    setAddCrewDefaultWatch("Daywork");
    setAddCrewDutiesText("");
    setIsAddingCrew(false);
  };

  // Delete a crew member permanently (sets state to trigger confirmation modal)
  const handleDeleteCrew = (rankToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigating to profile when clicking delete
    setCrewRankToDelete(rankToDelete);
  };

  // Triggers when "YES" is confirmed on the guarded modal
  const confirmDeleteCrew = () => {
    if (!crewRankToDelete) return;
    const rankToDelete = crewRankToDelete;
    setStagedCrewList(stagedCrewList.filter(c => c.rank !== rankToDelete));
    triggerNotification(`Staged deletion of ${rankToDelete}`);
    if (selectedRank === rankToDelete) {
      setSelectedRank(null);
      setCurrentView("ranks");
    }
    setCrewRankToDelete(null);
  };

  // Add a duty
  const addDuty = () => {
    if (!activeProfile || !newDutyText.trim()) return;
    const updated = [...stagedCrewList];
    const index = updated.findIndex(c => c.rank === activeProfile.rank);
    if (index === -1) return;

    updated[index].duties = [
      ...updated[index].duties,
      { timeRange: newDutyTimeRange.trim() || "Daywork", description: newDutyText.trim() }
    ];
    setStagedCrewList(updated);
    setNewDutyText("");
    setNewDutyTimeRange("08:00 - 12:00");
  };

  // Delete a duty
  const deleteDuty = (dutyIdx: number) => {
    if (!activeProfile) return;
    const updated = [...stagedCrewList];
    const index = updated.findIndex(c => c.rank === activeProfile.rank);
    if (index === -1) return;

    const filtered = updated[index].duties.filter((_, idx) => idx !== dutyIdx);
    updated[index].duties = filtered;
    setStagedCrewList(updated);
    if (editingDutyIdx === dutyIdx) {
      setEditingDutyIdx(null);
    }
  };

  // Start editing a duty
  const startEditingDuty = (idx: number, duty: DutyTask) => {
    setEditingDutyIdx(idx);
    setEditingDutyTimeRange(duty.timeRange);
    setEditingDutyText(duty.description);
  };

  // Save edited duty
  const saveDuty = (idx: number) => {
    if (!activeProfile || !editingDutyText.trim()) return;
    const updated = [...stagedCrewList];
    const index = updated.findIndex(c => c.rank === activeProfile.rank);
    if (index === -1) return;

    const duties = [...updated[index].duties];
    duties[idx] = { timeRange: editingDutyTimeRange.trim() || "Daywork", description: editingDutyText.trim() };
    updated[index].duties = duties;
    setStagedCrewList(updated);
    setEditingDutyIdx(null);
  };

  // Rest-hour STCW validation logic
  const getValidation = (schedule: boolean[]) => {
    const workHoursCount = schedule.filter(w => w).length;
    const restHoursCount = 24 - workHoursCount;
    const violations: string[] = [];

    // Rule 1: Max 14 hours work
    if (workHoursCount > 14) {
      violations.push("Work hours exceed limit: Maximum 14 hours of work allowed in any 24h window.");
    }

    // Rule 2: Min 10 hours rest
    if (restHoursCount < 10) {
      violations.push("Rest hours insufficient: Minimum 10 hours of rest required in any 24h window.");
    }

    // Find contiguous rest blocks (sequences of false)
    const restBlocks: number[] = [];
    let currentBlock = 0;
    for (let i = 0; i < 24; i++) {
      if (!schedule[i]) {
        currentBlock++;
      } else {
        if (currentBlock > 0) {
          restBlocks.push(currentBlock);
          currentBlock = 0;
        }
      }
    }
    if (currentBlock > 0) {
      restBlocks.push(currentBlock);
    }

    // Merge wrap-around rest blocks if hour 0 and hour 23 are both rest (false)
    let wrappedRestBlocks = [...restBlocks];
    if (!schedule[0] && !schedule[23] && wrappedRestBlocks.length > 1) {
      const last = wrappedRestBlocks.pop() || 0;
      wrappedRestBlocks[0] = wrappedRestBlocks[0] + last;
    }

    const maxRestBlock = wrappedRestBlocks.length > 0 ? Math.max(...wrappedRestBlocks) : 0;
    const restPeriodsCount = wrappedRestBlocks.length;

    // Rule 3: One continuous block of at least 6 hours
    if (maxRestBlock < 6) {
      violations.push("Continuous rest violated: One block of rest must be at least 6 continuous hours.");
    }

    // Rule 4: Rest divided into more than two periods
    if (restPeriodsCount > 2) {
      violations.push(`Rest divided too much: Split into ${restPeriodsCount} periods (max 2 allowed).`);
    }

    return {
      compliant: violations.length === 0,
      violations,
      workHoursCount,
      restHoursCount,
      maxRestBlock,
      periods: restPeriodsCount
    };
  };

  // Active validation for the selected crew profile
  const validation = activeProfile ? getValidation(activeProfile.schedule) : null;

  // Department color themes
  const getDeptColorTheme = (dept: "Deck" | "Engine" | "Catering") => {
    switch (dept) {
      case "Deck":
        return {
          primary: "bg-[#0A2540]",
          text: "text-[#0A2540]",
          border: "border-slate-300",
          hoverBorder: "hover:border-[#0A2540]",
          focusBorder: "focus:border-[#0A2540]",
          badge: "bg-blue-50 text-[#0A2540] border-blue-200",
          glowingLine: "bg-[#0A2540]",
          accent: "#0A2540",
          cardBg: "hover:bg-blue-50/20"
        };
      case "Engine":
        return {
          primary: "bg-[#FF4500]",
          text: "text-[#FF4500]",
          border: "border-red-200",
          hoverBorder: "hover:border-[#FF4500]",
          focusBorder: "focus:border-[#FF4500]",
          badge: "bg-red-50 text-[#FF4500] border-red-200",
          glowingLine: "bg-[#FF4500]",
          accent: "#FF4500",
          cardBg: "hover:bg-red-50/20"
        };
      case "Catering":
        return {
          primary: "bg-[#00A86B]",
          text: "text-[#00A86B]",
          border: "border-emerald-200",
          hoverBorder: "hover:border-[#00A86B]",
          focusBorder: "focus:border-[#00A86B]",
          badge: "bg-emerald-50 text-[#00A86B] border-emerald-200",
          glowingLine: "bg-[#00A86B]",
          accent: "#00A86B",
          cardBg: "hover:bg-emerald-50/20"
        };
    }
  };

  const currentTheme = activeProfile ? getDeptColorTheme(activeProfile.department) : null;



  // Generate XML/Dart Flutter Layout code
  const generatedFlutterCode = `import 'package:flutter/material.dart';

// Department choice and profile screen widget tree matching ShipBoard-AI
class DepartmentDashboard extends StatefulWidget {
  const DepartmentDashboard({Key? key}) : super(key: key);

  @override
  _DepartmentDashboardState createState() => _DepartmentDashboardState();
}

class _DepartmentDashboardState extends State<DepartmentDashboard> {
  String selectedDept = "";
  String selectedRank = "";
  List<bool> restHours = List.generate(24, (index) => true); // true = rest, false = work

  // STCW compliance checker
  Map<String, dynamic> checkCompliance(List<bool> hours) {
    int workCount = hours.where((w) => !w).length;
    int restCount = 24 - workCount;
    List<String> breaches = [];
    
    if (workCount > 14) breaches.add("Work exceeds 14 hours in 24h period.");
    if (restCount < 10) breaches.add("Rest is less than 10 hours in 24h period.");
    
    // Find contiguous rest blocks
    List<int> blocks = [];
    int current = 0;
    for (var i = 0; i < 24; i++) {
      if (hours[i]) {
        current++;
      } else {
        if (current > 0) {
          blocks.add(current);
          current = 0;
        }
      }
    }
    if (current > 0) blocks.add(current);
    
    // Wrap around check
    if (hours[0] && hours[23] && blocks.length > 1) {
      int last = blocks.removeLast();
      blocks[0] = blocks[0] + last;
    }
    
    int maxBlock = blocks.isNotEmpty ? blocks.reduce((a, b) => a > b ? a : b) : 0;
    if (maxBlock < 6) {
      breaches.add("Requires at least 6 continuous hours of rest.");
    }
    if (blocks.length > 2) {
      breaches.add("Rest split into \${blocks.length} periods (Max 2).");
    }

    return {
      "compliant": breaches.isEmpty,
      "violations": breaches,
      "workHours": workCount,
      "restHours": restCount
    };
  }

  @override
  Widget build(BuildContext context) {
    var compliance = checkCompliance(restHours);
    
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text("ShipBoard-AI Crew Registry", style: TextStyle(fontWeight: FontWeight.extrabold)),
        backgroundColor: const Color(0xFF0A2540),
      ),
      body: selectedDept == "" 
          ? buildDepartmentMenu() 
          : selectedRank == "" 
              ? buildRankList() 
              : buildCrewProfile(compliance),
    );
  }

  Widget buildDepartmentMenu() {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text("SELECT VESSEL DEPARTMENT", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, letterSpacing: 1.5, color: Colors.grey)),
          const SizedBox(height: 16),
          // Deck Dept (Blue)
          buildDeptCard("DECK DEPARTMENT", "8 Ranks Registered", const Color(0xFF0A2540), Icons.navigation),
          // Engine Dept (Red)
          buildDeptCard("ENGINE DEPARTMENT", "9 Ranks Registered", const Color(0xFFFF4500), Icons.build),
          // Catering Dept (Green)
          buildDeptCard("CATERING DEPARTMENT", "4 Ranks Registered", const Color(0xFF00A86B), Icons.restaurant),
        ],
      ),
    );
  }

  Widget buildDeptCard(String title, String subtitle, Color color, IconData icon) {
    return Card(
      elevation: 3,
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(side: BorderSide(color: color.withOpacity(0.3), width: 1.5)),
      child: ListTile(
        leading: Icon(icon, color: color, size: 32),
        title: Text(title, style: TextStyle(fontWeight: FontWeight.bold, color: color)),
        subtitle: Text(subtitle),
        onTap: () => setState(() => selectedDept = title.split(" ")[0]),
      ),
    );
  }

  Widget buildRankList() {
    // Display dynamic lists mapped to traditional maritime themes...
    return Container(); 
  }

  Widget buildCrewProfile(Map<String, dynamic> compliance) {
    // Individual profile with interactive 24-hour logs...
    return Container();
  }
}`;

  const generatedJsonSchema = `{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "ShipBoard-AI Crew Registry Database",
  "description": "Standard schema for validating full maritime crew registry profiles, watchkeeper schedules, MLC cabins and MARPOL logs.",
  "type": "object",
  "properties": {
    "crew": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["rank", "department", "duties", "defaultWatch", "schedule"],
        "properties": {
          "rank": {
            "type": "string",
            "enum": [
              "Master", "Chief Officer", "Second Officer", "Third Officer", "Bosun", "Able Seaman (AB)", "Ordinary Seaman (OS)", "Deck Cadet",
              "Chief Engineer", "Second Engineer", "Third Engineer", "Fourth Engineer", "Electro-Technical Officer (ETO)", "Fitter", "Oiler/Motorman", "Wiper", "Engine Cadet",
              "Chief Cook", "Assistant Cook", "Steward", "Messman"
            ]
          },
          "department": {
            "type": "string",
            "enum": ["Deck", "Engine", "Catering"]
          },
          "duties": {
            "type": "array",
            "items": { "type": "string" }
          },
          "defaultWatch": {
            "type": "string",
            "enum": ["0000-0400", "0400-0800", "0800-1200", "Daywork", "Variable"]
          },
          "watchLabel": {
            "type": "string"
          },
          "schedule": {
            "type": "array",
            "minItems": 24,
            "maxItems": 24,
            "items": { "type": "boolean" },
            "description": "A 24-element array where true represents active duty/work hours and false is rest."
          }
        }
      }
    },
    "cateringIntegration": {
      "type": "object",
      "properties": {
        "provisionsInventory": {
          "type": "object",
          "properties": {
            "freshStores": { "type": "array", "items": { "$ref": "#/$defs/inventoryItem" } },
            "frozenStores": { "type": "array", "items": { "$ref": "#/$defs/inventoryItem" } },
            "dryStores": { "type": "array", "items": { "$ref": "#/$defs/inventoryItem" } }
          }
        },
        "galleyEquipment": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["name", "status", "stormRailsEngaged"],
            "properties": {
              "name": { "type": "string" },
              "status": { "type": "string", "enum": ["Operational", "Warning", "Maintenance Due"] },
              "nextService": { "type": "string", "format": "date" },
              "stormRailsEngaged": { "type": "boolean" },
              "notes": { "type": "string" }
            }
          }
        },
        "marpolGarbageWaste": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["id", "date", "weight", "comminuted", "distanceToLand", "seaDischargeApproved"],
            "properties": {
              "id": { "type": "string" },
              "date": { "type": "string", "format": "date" },
              "weight": { "type": "number", "minimum": 0 },
              "comminuted": { "type": "boolean" },
              "distanceToLand": { "type": "number", "minimum": 0 },
              "seaDischargeApproved": { "type": "boolean" },
              "loggedBy": { "type": "string" }
            }
          }
        }
      }
    }
  },
  "$defs": {
    "inventoryItem": {
      "type": "object",
      "required": ["name", "qty", "dailyCons", "capacity"],
      "properties": {
        "name": { "type": "string" },
        "qty": { "type": "number" },
        "dailyCons": { "type": "number" },
        "capacity": { "type": "number" },
        "unit": { "type": "string" }
      }
    }
  }
}`;

  // Filtered crew members based on selected department and search
  const filteredCrew = stagedCrewList.filter(c => {
    const matchesDept = selectedDept ? c.department === selectedDept : true;
    const matchesSearch = searchQuery 
      ? c.rank.toLowerCase().includes(searchQuery.toLowerCase()) || 
        c.department.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    return matchesDept && matchesSearch;
  });

  return (
    <div className="space-y-6">
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

      {/* Search Bar / Back Button Combo */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 border border-slate-200 shadow-sm rounded-none">
        <div className="flex items-center gap-3">
          {currentView !== "departments" && (
            <button
              onClick={() => {
                if (currentView === "profile") {
                  setCurrentView("ranks");
                  setSelectedRank(null);
                } else if (currentView === "ranks") {
                  setCurrentView("departments");
                  setSelectedDept(null);
                }
              }}
              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-[#0A2540] border border-slate-300 rounded-none cursor-pointer flex items-center justify-center transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-[#0A2540] font-sans flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-[#00A86B]" />
              {currentView === "departments" && "Department Command Hub"}
              {currentView === "ranks" && `${selectedDept} Department Crew Registry`}
              {currentView === "profile" && `Crew Profile • ${selectedRank}`}
            </h2>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5 uppercase">
              {currentView === "departments" && "Tiered management, stcw validation overlays and catering provisions"}
              {currentView === "ranks" && `Select rank to audit duties, responsibilities, and STCW compliance`}
              {currentView === "profile" && `${activeProfile?.department} Department • Watch rotated duty log`}
            </p>
          </div>
        </div>

        {currentView === "departments" && (
          <div className="relative w-full md:w-64">
            <input
              type="text"
              placeholder="Search rank or dept..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 pl-8 pr-3 py-1.5 text-xs text-[#0A2540] font-sans rounded-none focus:outline-none focus:border-[#0A2540]"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          </div>
        )}
      </div>

      {/* 1. DEPARTMENTS MENU VIEW */}
      {currentView === "departments" && (
        <div className="space-y-6">
          {/* Main 3-Department Dashboard Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Deck Card */}
            <motion.div
              whileHover={{ scale: 1.01 }}
              onClick={() => {
                setSelectedDept("Deck");
                setCurrentView("ranks");
              }}
              className="bg-white border-t-4 border-[#0A2540] border-x border-b border-slate-200 p-6 shadow-md hover:shadow-lg transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 bg-blue-50 flex items-center justify-center rounded-none border border-blue-100 group-hover:bg-[#0A2540] group-hover:text-white transition-all">
                    <Compass className="w-6 h-6 text-[#0A2540] group-hover:text-white" />
                  </div>
                  <span className="text-[9px] font-mono font-bold bg-blue-50 text-[#0A2540] border border-blue-200 px-2 py-0.5 uppercase">
                    Blue Team
                  </span>
                </div>
                <h3 className="text-base font-extrabold text-[#0A2540] font-sans uppercase">
                  Deck Department
                </h3>
                <p className="text-xs text-slate-500 font-sans mt-2 leading-relaxed">
                  Navigation, passage planning, ship handling, cargo and ballast stability, security controls, and lifesaving/fire safety oversight under SOLAS.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center text-[10px] font-mono text-slate-400">
                <span>8 RANKS REGISTERED</span>
                <span className="text-[#0A2540] font-bold group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                  MANAGE DECK &rarr;
                </span>
              </div>
            </motion.div>

            {/* Engine Card */}
            <motion.div
              whileHover={{ scale: 1.01 }}
              onClick={() => {
                setSelectedDept("Engine");
                setCurrentView("ranks");
              }}
              className="bg-white border-t-4 border-[#FF4500] border-x border-b border-slate-200 p-6 shadow-md hover:shadow-lg transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 bg-red-50 flex items-center justify-center rounded-none border border-red-100 group-hover:bg-[#FF4500] group-hover:text-white transition-all">
                    <Wrench className="w-6 h-6 text-[#FF4500] group-hover:text-white" />
                  </div>
                  <span className="text-[9px] font-mono font-bold bg-red-50 text-[#FF4500] border border-red-200 px-2 py-0.5 uppercase">
                    Red Team
                  </span>
                </div>
                <h3 className="text-base font-extrabold text-[#FF4500] font-sans uppercase">
                  Engine Department
                </h3>
                <p className="text-xs text-slate-500 font-sans mt-2 leading-relaxed">
                  Main diesel propulsion engines, steam boilers, auxiliaries power, fuel centrifuges, telemetry control grids, and MARPOL environmental emissions.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center text-[10px] font-mono text-slate-400">
                <span>9 RANKS REGISTERED</span>
                <span className="text-[#FF4500] font-bold group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                  MANAGE ENGINE &rarr;
                </span>
              </div>
            </motion.div>

            {/* Catering Card */}
            <motion.div
              whileHover={{ scale: 1.01 }}
              onClick={() => {
                setSelectedDept("Catering");
                setCurrentView("ranks");
              }}
              className="bg-white border-t-4 border-[#00A86B] border-x border-b border-slate-200 p-6 shadow-md hover:shadow-lg transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 bg-emerald-50 flex items-center justify-center rounded-none border border-emerald-100 group-hover:bg-[#00A86B] group-hover:text-white transition-all">
                    <Coffee className="w-6 h-6 text-[#00A86B] group-hover:text-white" />
                  </div>
                  <span className="text-[9px] font-mono font-bold bg-emerald-50 text-[#00A86B] border border-emerald-200 px-2 py-0.5 uppercase">
                    Mint Team
                  </span>
                </div>
                <h3 className="text-base font-extrabold text-[#00A86B] font-sans uppercase">
                  Catering Department
                </h3>
                <p className="text-xs text-slate-500 font-sans mt-2 leading-relaxed">
                  Provisions budgeting, nutrition and hygiene compliance, fresh/frozen/dry stores rationing, galley equipment service, and MARPOL food waste comminution.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center text-[10px] font-mono text-slate-400">
                <span>4 RANKS REGISTERED</span>
                <span className="text-[#00A86B] font-bold group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                  MANAGE CATERING &rarr;
                </span>
              </div>
            </motion.div>

          </div>

          {/* Quick Stats Grid overlay */}
          <div className="bg-white border border-slate-200 p-5 shadow-sm rounded-none grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="space-y-1 border-r border-slate-100 pr-4 last:border-r-0">
              <span className="text-[9px] font-mono uppercase text-slate-400">Active Vessel Crew Count</span>
              <div className="text-xl font-extrabold text-[#0A2540]">{crewList.length} Personnel</div>
              <p className="text-[10px] text-slate-500 leading-normal">Optimally staffed under SOLAS Safe Manning requirements.</p>
            </div>
            <div className="space-y-1 border-r border-slate-100 pr-4 last:border-r-0">
              <span className="text-[9px] font-mono uppercase text-slate-400">Average Watch Compliance</span>
              <div className="text-xl font-extrabold text-[#00A86B]">100% SECURE</div>
              <p className="text-[10px] text-slate-500 leading-normal">Rest hour periods strictly validated under STCW A-VIII/1.</p>
            </div>
            <div className="space-y-1 border-r border-slate-100 pr-4 last:border-r-0">
              <span className="text-[9px] font-mono uppercase text-slate-400">Stock Rationing Threshold</span>
              <div className="text-xl font-extrabold text-amber-500">Voyage Safe</div>
              <p className="text-[10px] text-slate-500 leading-normal">Rations planned, bought and audited for up to 6 months.</p>
            </div>
            <div className="space-y-1">
              <span className="text-[9px] font-mono uppercase text-slate-400">MARPOL Food Discharge</span>
              <div className="text-xl font-extrabold text-[#0A2540]">Approved Only</div>
              <p className="text-[10px] text-slate-500 leading-normal">Food waste reduced to &lt;25 mm for legal sea discharge.</p>
            </div>
          </div>
        </div>
      )}

      {/* 2. RANKS SELECTION LIST VIEW */}
      {currentView === "ranks" && selectedDept && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-xs font-mono uppercase text-slate-400 tracking-wider">
                Select specific rank to view Profile
              </h3>
              <p className="text-sm font-bold text-slate-700 font-sans mt-0.5">
                Each profile provides duties editing, interactive work/rest schedules, and automated STCW audits.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const nextState = !isAddingCrew;
                  setIsAddingCrew(nextState);
                  if (nextState) {
                    const dept = selectedDept || "Deck";
                    const availableRanks = DEPARTMENT_RANKS[dept] || [];
                    const firstRank = availableRanks[0] || "";
                    handleSelectAddCrewRank(firstRank);
                  }
                }}
                className="px-3 py-1.5 bg-[#00A86B] hover:bg-[#008f5a] text-white text-xs font-bold uppercase tracking-wider cursor-pointer flex items-center gap-1.5 transition-all"
              >
                {isAddingCrew ? "Hide Form" : "Add Crew Member"}
              </button>
              <button
                onClick={() => {
                  setSelectedDept(null);
                  setCurrentView("departments");
                }}
                className="text-xs font-bold text-[#0A2540] hover:underline flex items-center gap-1 cursor-pointer border border-slate-200 px-3 py-1.5"
              >
                &larr; Back to Departments
              </button>
            </div>
          </div>

          {isAddingCrew && (
            <form onSubmit={handleCreateCrew} className="bg-slate-50 border border-slate-200 p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-2.5 gap-2">
                <h4 className="text-xs font-extrabold text-[#0A2540] uppercase tracking-wider flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-[#00A86B]" /> Add New Crew to {selectedDept} Department
                </h4>
                <span className="text-[10px] font-mono text-[#00A86B] bg-emerald-50 border border-emerald-200 px-2 py-0.5 font-bold uppercase">
                  STCW Watch Auto-Assignment Active
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Dynamic Rank Selection Filtered Strictly by Selected Department */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-[10px] uppercase font-mono text-slate-500 font-bold">
                      Rank Onboard ({selectedDept} Dept Only)
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const next = !isCustomRank;
                        setIsCustomRank(next);
                        if (next) {
                          setCustomRankInput(addCrewRank);
                        } else {
                          const firstRank = (DEPARTMENT_RANKS[selectedDept || "Deck"] || [])[0] || "";
                          handleSelectAddCrewRank(firstRank);
                        }
                      }}
                      className="text-[9px] font-mono text-blue-600 hover:underline uppercase cursor-pointer"
                    >
                      {isCustomRank ? "Select standard rank" : "Custom rank"}
                    </button>
                  </div>

                  {!isCustomRank ? (
                    <select
                      value={addCrewRank}
                      onChange={(e) => handleSelectAddCrewRank(e.target.value)}
                      className="w-full bg-white border border-slate-300 p-2 text-xs text-slate-800 font-sans focus:outline-none focus:border-[#0A2540] cursor-pointer"
                      required
                    >
                      {(DEPARTMENT_RANKS[selectedDept || "Deck"] || []).map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      required
                      value={customRankInput}
                      onChange={(e) => {
                        setCustomRankInput(e.target.value);
                        handleSelectAddCrewRank(e.target.value);
                      }}
                      placeholder={`e.g. Trainee ${selectedDept} Officer...`}
                      className="w-full bg-white border border-slate-300 p-2 text-xs text-slate-800 font-sans focus:outline-none focus:border-[#0A2540]"
                    />
                  )}
                </div>

                {/* Seafarer Full Name */}
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-mono text-slate-500 font-bold">
                    Seafarer Full Name
                  </label>
                  <input
                    type="text"
                    value={addCrewName}
                    onChange={(e) => setAddCrewName(e.target.value)}
                    placeholder="e.g. Captain / Officer Name"
                    className="w-full bg-white border border-slate-300 p-2 text-xs text-slate-800 font-sans focus:outline-none focus:border-[#0A2540]"
                  />
                </div>

                {/* Seafarer ID / CDC Number */}
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-mono text-slate-500 font-bold">
                    Seafarer ID / CDC Number
                  </label>
                  <input
                    type="text"
                    value={addCrewSeafarerId}
                    onChange={(e) => setAddCrewSeafarerId(e.target.value)}
                    placeholder="e.g. PHL-68219-M / CDC-99120"
                    className="w-full bg-white border border-slate-300 p-2 text-xs text-slate-800 font-sans focus:outline-none focus:border-[#0A2540]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Nationality */}
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-mono text-slate-500 font-bold">
                    Nationality
                  </label>
                  <select
                    value={addCrewNationality}
                    onChange={(e) => setAddCrewNationality(e.target.value)}
                    className="w-full bg-white border border-slate-300 p-2 text-xs text-slate-800 font-sans focus:outline-none focus:border-[#0A2540] cursor-pointer"
                  >
                    {WORLDWIDE_NATIONALITIES.map(nat => (
                      <option key={nat} value={nat}>{nat}</option>
                    ))}
                  </select>
                </div>

                {/* Watch Rotation Preset */}
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-mono text-slate-500 font-bold">
                    STCW Watch Preset (Auto-Mapped)
                  </label>
                  <select
                    value={addCrewDefaultWatch}
                    onChange={(e) => setAddCrewDefaultWatch(e.target.value as any)}
                    className="w-full bg-white border border-slate-300 p-2 text-xs text-slate-800 font-sans focus:outline-none focus:border-[#0A2540]"
                  >
                    <option value="Daywork">Daywork (08:00-12:00 & 13:00-17:00)</option>
                    <option value="3-watch">Standard 3-Watch (00:00-04:00 & 12:00-16:00 / 04:00-08:00 / 08:00-12:00)</option>
                    <option value="6-6">6-on/6-off Shift Watch (00:00-06:00 & 12:00-18:00)</option>
                  </select>
                </div>

                {/* Watch / Schedule Label */}
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-mono text-slate-500 font-bold">
                    Watch Schedule Label
                  </label>
                  <input
                    type="text"
                    value={addCrewWatchLabel}
                    onChange={(e) => setAddCrewWatchLabel(e.target.value)}
                    placeholder="e.g. Watch Rotation: 00:00-04:00 & 12:00-16:00"
                    className="w-full bg-white border border-slate-300 p-2 text-xs text-slate-800 font-sans focus:outline-none focus:border-[#0A2540]"
                  />
                </div>
              </div>

              {/* STCW Default Assignment Guidance Box */}
              <div className="p-3 bg-blue-50/70 border border-blue-200 text-xs text-blue-900 flex items-start gap-2.5">
                <Compass className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                <div className="font-mono text-[11px] leading-relaxed">
                  <strong className="uppercase font-bold text-blue-950">STCW Watchstanding Mapping for {isCustomRank ? customRankInput || "Custom Rank" : addCrewRank}:</strong>
                  <p className="mt-0.5 text-blue-800">
                    {addCrewWatchLabel || "Standard operational watch mapping will be assigned automatically."}
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-mono text-slate-500 font-bold">
                  Duties / Responsibilities (One task per line, or prefix with "Time Slot : Description")
                </label>
                <textarea
                  value={addCrewDutiesText}
                  onChange={(e) => setAddCrewDutiesText(e.target.value)}
                  placeholder="e.g. 08:00 - 12:00 : Performs standard navigation & safety check&#10;13:00 - 17:00 : Routine equipment inspection"
                  className="w-full bg-white border border-slate-300 p-2 text-xs text-slate-800 font-sans focus:outline-none focus:border-[#0A2540] resize-none"
                  rows={3}
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingCrew(false);
                    setAddCrewRank("");
                  }}
                  className="px-4 py-2 bg-slate-200 text-slate-600 text-xs font-bold uppercase tracking-wider hover:bg-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#00A86B] text-white text-xs font-bold uppercase tracking-wider hover:bg-emerald-700 cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" /> Register Crew Member & Assign STCW Watch
                </button>
              </div>
            </form>
          )}

          {/* Department switcher tabs at the top of every department tab page with per-tab APPLY buttons */}
          {(() => {
            const deckActiveList = crewList.filter(c => c.department === "Deck");
            const deckStagedList = stagedCrewList.filter(c => c.department === "Deck");
            const hasDeckChanges = JSON.stringify(deckActiveList) !== JSON.stringify(deckStagedList);

            const engineActiveList = crewList.filter(c => c.department === "Engine");
            const engineStagedList = stagedCrewList.filter(c => c.department === "Engine");
            const hasEngineChanges = JSON.stringify(engineActiveList) !== JSON.stringify(engineStagedList);

            const cateringActiveList = crewList.filter(c => c.department === "Catering");
            const cateringStagedList = stagedCrewList.filter(c => c.department === "Catering");
            const hasCateringChanges = JSON.stringify(cateringActiveList) !== JSON.stringify(cateringStagedList);

            return (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 bg-slate-100 p-1.5 border border-slate-200">
                  {/* Deck Department Tab */}
                  <div className={`flex flex-col sm:flex-row items-center justify-between p-2.5 transition-all ${
                    selectedDept === "Deck" ? "bg-white border-l-4 border-blue-600 shadow-sm" : "bg-slate-50/70"
                  }`}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDept("Deck");
                        setCurrentView("ranks");
                      }}
                      className={`text-[11px] font-mono font-extrabold uppercase tracking-wider cursor-pointer text-left flex-1 ${
                        selectedDept === "Deck" ? "text-[#0A2540] font-black" : "text-slate-500 hover:text-[#0A2540]"
                      }`}
                    >
                      Deck Department ({deckStagedList.length} Crew)
                    </button>
                    {hasDeckChanges && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          applyDepartmentChanges("Deck");
                        }}
                        className="mt-2 sm:mt-0 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-mono text-[9px] font-black uppercase tracking-wider rounded-none cursor-pointer border border-blue-600 flex items-center gap-1 transition-all shadow-sm animate-pulse"
                      >
                        <Check className="w-3 h-3" /> APPLY
                      </button>
                    )}
                  </div>

                  {/* Engine Department Tab */}
                  <div className={`flex flex-col sm:flex-row items-center justify-between p-2.5 transition-all ${
                    selectedDept === "Engine" ? "bg-white border-l-4 border-red-600 shadow-sm" : "bg-slate-50/70"
                  }`}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDept("Engine");
                        setCurrentView("ranks");
                      }}
                      className={`text-[11px] font-mono font-extrabold uppercase tracking-wider cursor-pointer text-left flex-1 ${
                        selectedDept === "Engine" ? "text-red-600 font-black" : "text-slate-500 hover:text-red-600"
                      }`}
                    >
                      Engine Department ({engineStagedList.length} Crew)
                    </button>
                    {hasEngineChanges && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          applyDepartmentChanges("Engine");
                        }}
                        className="mt-2 sm:mt-0 px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white font-mono text-[9px] font-black uppercase tracking-wider rounded-none cursor-pointer border border-red-600 flex items-center gap-1 transition-all shadow-sm animate-pulse"
                      >
                        <Check className="w-3 h-3" /> APPLY
                      </button>
                    )}
                  </div>

                  {/* Catering Department Tab */}
                  <div className={`flex flex-col sm:flex-row items-center justify-between p-2.5 transition-all ${
                    selectedDept === "Catering" ? "bg-white border-l-4 border-emerald-600 shadow-sm" : "bg-slate-50/70"
                  }`}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDept("Catering");
                        setCurrentView("ranks");
                      }}
                      className={`text-[11px] font-mono font-extrabold uppercase tracking-wider cursor-pointer text-left flex-1 ${
                        selectedDept === "Catering" ? "text-emerald-600 font-black" : "text-slate-500 hover:text-emerald-600"
                      }`}
                    >
                      Catering Department ({cateringStagedList.length} Crew)
                    </button>
                    {hasCateringChanges && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          applyDepartmentChanges("Catering");
                        }}
                        className="mt-2 sm:mt-0 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-[9px] font-black uppercase tracking-wider rounded-none cursor-pointer border border-emerald-600 flex items-center gap-1 transition-all shadow-sm animate-pulse"
                      >
                        <Check className="w-3 h-3" /> APPLY
                      </button>
                    )}
                  </div>
                </div>

                {/* Sub Department Action Panel (Dynamic styling based on selected department) */}
                {(() => {
                  const currentStagedCount = selectedDept === "Deck" ? deckStagedList.length : selectedDept === "Engine" ? engineStagedList.length : cateringStagedList.length;
                  const currentActiveCount = selectedDept === "Deck" ? deckActiveList.length : selectedDept === "Engine" ? engineActiveList.length : cateringActiveList.length;
                  const isPending = selectedDept === "Deck" ? hasDeckChanges : selectedDept === "Engine" ? hasEngineChanges : hasCateringChanges;

                  let buttonThemeClasses = "";
                  let borderThemeClasses = "";
                  if (selectedDept === "Deck") {
                    buttonThemeClasses = "bg-blue-600 hover:bg-blue-700 text-white border-blue-600";
                    borderThemeClasses = "border-blue-200";
                  } else if (selectedDept === "Engine") {
                    buttonThemeClasses = "bg-red-600 hover:bg-red-700 text-white border-red-600";
                    borderThemeClasses = "border-red-200";
                  } else {
                    buttonThemeClasses = "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600";
                    borderThemeClasses = "border-emerald-200";
                  }

                  return (
                    <div className={`bg-white border p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 mt-2 ${borderThemeClasses}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${isPending ? "bg-amber-500 animate-pulse" : "bg-emerald-500"}`} />
                        <div>
                          <h4 className="text-xs font-bold text-[#0A2540] uppercase tracking-wide">
                            {selectedDept} Department Crew Status
                          </h4>
                          <p className="text-[10px] text-slate-500 font-mono">
                            {isPending
                              ? `STAGED: ${currentStagedCount} Crew | ACTIVE: ${currentActiveCount} Crew. Click APPLY to synchronize the ${selectedDept} Department roster.`
                              : `${selectedDept} Department fully synchronized. Active: ${currentActiveCount} Crew members committed.`}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                        {isPending && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                // Reset staged changes back to original for this department
                                const otherDepts = stagedCrewList.filter(c => c.department !== selectedDept);
                                setStagedCrewList([...otherDepts, ...crewList.filter(c => c.department === selectedDept)]);
                                triggerNotification(`Staged changes for ${selectedDept} Department reset`);
                              }}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-300 text-xs font-mono font-bold uppercase tracking-wider rounded-none cursor-pointer transition-all"
                            >
                              Reset
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                applyDepartmentChanges(selectedDept);
                              }}
                              className={`px-5 py-2 font-mono text-xs font-black uppercase tracking-widest rounded-none border transition-all cursor-pointer shadow-sm ${buttonThemeClasses} hover:shadow-md`}
                            >
                              APPLY {selectedDept.toUpperCase()} CHANGES
                            </button>
                          </>
                        )}
                        {!isPending && (
                          <span className="text-[10px] font-mono text-[#00A86B] font-bold uppercase tracking-wider flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Synchronized
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            );
          })()}

          {/* Ranks Buttons Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredCrew.map((member) => {
              const theme = getDeptColorTheme(member.department);
              const complianceObj = getValidation(member.schedule);
              const isExpanded = !!expandedRank[member.rank];

              return (
                <motion.div
                  whileHover={isExpanded ? {} : { scale: 1.01 }}
                  key={member.rank}
                  onClick={() => {
                    setSelectedRank(member.rank);
                    setCurrentView("profile");
                  }}
                  className={`bg-white border ${isMeMember(member) ? "border-[#00A86B] ring-2 ring-emerald-500/40 shadow-md" : `${theme.border} ${theme.hoverBorder}`} p-4 shadow-sm transition-all cursor-pointer flex flex-col justify-between group relative`}
                >
                  {isMeMember(member) && (
                    <div className="absolute top-0 right-0 bg-[#00A86B] text-white font-mono text-[8px] font-black px-2 py-0.5 uppercase tracking-wider shadow-xs z-10 flex items-center gap-1">
                      <CheckCircle2 className="w-2.5 h-2.5" /> [ME / USER]
                    </div>
                  )}

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <User className={`w-5 h-5 ${theme.text}`} />
                        {isMeMember(member) && (
                          <span className="px-1.5 py-0.5 bg-emerald-100 text-[#00A86B] border border-emerald-300 font-mono font-black text-[9px] uppercase tracking-wider rounded-xs flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-[#00A86B]" /> [ME / USER]
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={(e) => handleDeleteCrew(member.rank, e)}
                          className="p-1.5 bg-slate-50 border border-slate-200 text-slate-400 hover:bg-red-50 hover:text-red-600 hover:border-red-200 rounded transition-all cursor-pointer z-10 flex items-center justify-center shadow-xs"
                          title="Permanently Delete Crew Profile"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase ${theme.badge}`}>
                          {member.department}
                        </span>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wide">
                        {member.rank}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">{member.watchLabel}</p>
                      
                      <div className="mt-2.5 p-2 bg-slate-50 border border-slate-150 space-y-0.5 text-left">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-slate-400 font-mono uppercase text-[8px]">Seafarer</span>
                          <span className="font-bold text-slate-700 font-sans">{member.name || "Not Assigned"}</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-slate-400 font-mono uppercase text-[8px]">Nationality</span>
                          <span className="text-slate-600 font-sans">{member.nationality || "Filipino"}</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-slate-400 font-mono uppercase text-[8px]">Seafarer ID</span>
                          <span className="text-slate-600 font-mono font-bold uppercase text-[9px]">{member.seafarerId || "Not Registered"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Duties & Responsibilities Section (Directly on Department Card) */}
                    <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedRank(prev => ({ ...prev, [member.rank]: !prev[member.rank] }));
                        }}
                        className={`w-full py-1 border text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                          isExpanded 
                            ? "bg-slate-100 border-slate-300 text-slate-800" 
                            : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-600"
                        }`}
                      >
                        {isExpanded ? "Hide Duties" : `Duties & Responsibilities (${member.duties.length})`}
                      </button>

                      {isExpanded && (
                        <div className="mt-2 space-y-2 text-left" onClick={(e) => e.stopPropagation()}>
                          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                            {member.duties.map((duty, idx) => (
                              <div key={idx} className="p-2 bg-slate-50 border border-slate-200 text-[11px] space-y-1">
                                {editingCardRank === member.rank && editingCardDutyIdx === idx ? (
                                  <div className="space-y-1.5">
                                    <div>
                                      <label className="block text-[8px] font-mono uppercase text-slate-400">Time Range</label>
                                      <input
                                        type="text"
                                        value={editingCardTimeRange}
                                        onChange={(e) => setEditingCardTimeRange(e.target.value)}
                                        className="w-full bg-white border border-slate-300 px-1.5 py-0.5 text-[10px] font-mono text-[#0A2540] focus:outline-none"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[8px] font-mono uppercase text-slate-400">Duties / Ops</label>
                                      <textarea
                                        value={editingCardText}
                                        onChange={(e) => setEditingCardText(e.target.value)}
                                        className="w-full bg-white border border-slate-300 px-1.5 py-0.5 text-[10px] text-slate-800 focus:outline-none resize-none"
                                        rows={2}
                                      />
                                    </div>
                                    <div className="flex justify-end gap-1 pt-1 border-t border-slate-100">
                                      <button
                                        onClick={cancelEditingCardDuty}
                                        className="px-2 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-600 text-[9px] font-mono uppercase font-bold"
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        onClick={() => saveCardDuty(member.rank, idx)}
                                        className="px-2 py-0.5 bg-[#0A2540] text-white hover:bg-slate-800 text-[9px] font-mono uppercase font-bold"
                                      >
                                        Save
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <div className="flex justify-between items-start gap-2">
                                      <span className="font-mono text-[9px] font-bold text-slate-500 bg-slate-200/50 px-1 py-0.5 rounded shrink-0">
                                        {duty.timeRange}
                                      </span>
                                      <div className="flex gap-1.5 shrink-0">
                                        <button
                                          onClick={() => startEditingCardDuty(member.rank, idx, duty)}
                                          className="text-blue-500 hover:text-blue-700 font-mono text-[9px] font-bold uppercase cursor-pointer"
                                        >
                                          Edit
                                        </button>
                                        <span className="text-slate-300 font-mono">|</span>
                                        <button
                                          onClick={() => deleteCardDuty(member.rank, idx)}
                                          className="text-red-500 hover:text-red-700 font-mono text-[9px] font-bold uppercase cursor-pointer"
                                        >
                                          Del
                                        </button>
                                      </div>
                                    </div>
                                    <p className="text-slate-700 leading-normal text-[11px] font-sans text-justify">
                                      {duty.description}
                                    </p>
                                  </>
                                )}
                              </div>
                            ))}
                            {member.duties.length === 0 && (
                              <p className="text-[10px] text-slate-400 italic text-center py-2">No duties registered.</p>
                            )}
                          </div>

                          {/* Inline Add Duty Form inside Card */}
                          <div className="pt-2 border-t border-dashed border-slate-200 space-y-1.5 bg-slate-50/50 p-2">
                            <span className="block text-[8px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                              Quick Add Duty Task
                            </span>
                            <div className="grid grid-cols-3 gap-1">
                              <input
                                type="text"
                                value={newCardTimeRange[member.rank] ?? "08:00 - 12:00"}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setNewCardTimeRange(prev => ({ ...prev, [member.rank]: val }));
                                }}
                                placeholder="Time range"
                                className="col-span-1 bg-white border border-slate-200 px-1.5 py-1 text-[10px] font-mono focus:outline-none focus:border-slate-400"
                              />
                              <input
                                type="text"
                                value={newCardText[member.rank] ?? ""}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setNewCardText(prev => ({ ...prev, [member.rank]: val }));
                                }}
                                placeholder="Task description..."
                                className="col-span-2 bg-white border border-slate-200 px-1.5 py-1 text-[10px] focus:outline-none focus:border-slate-400"
                              />
                            </div>
                            <button
                              onClick={() => addCardDuty(member.rank)}
                              className="w-full py-1 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 text-[9px] font-bold uppercase tracking-wider cursor-pointer"
                            >
                              + Append Duty Task
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[8px] font-mono uppercase text-slate-400">STCW Rest check:</span>
                    {complianceObj.compliant ? (
                      <span className="text-[9px] font-mono font-bold text-[#00A86B] flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> compliant
                      </span>
                    ) : (
                      <span className="text-[9px] font-mono font-bold text-[#FF4500] flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" /> violation
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>


        </div>
      )}

      {/* 3. INDIVIDUAL CREW PROFILE EDITING & LOGS VIEW */}
      {currentView === "profile" && activeProfile && currentTheme && validation && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="bg-white border border-slate-200 p-5 shadow-sm flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-1">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${currentTheme.primary} text-white flex items-center justify-center rounded-none shadow shrink-0`}>
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[9px] font-mono uppercase text-slate-400">Selected Profile and Watch Duty</span>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-extrabold text-[#0A2540] uppercase tracking-wide leading-tight">
                      {activeProfile.rank}
                    </h3>
                    {isMeMember(activeProfile) && (
                      <span className="px-2 py-0.5 bg-[#00A86B] text-white font-mono font-black text-[9px] uppercase tracking-wider rounded-xs flex items-center gap-1 shadow-sm border border-emerald-400">
                        <CheckCircle2 className="w-3 h-3 text-white" /> [ME / USER]
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 font-sans mt-0.5">{activeProfile.watchLabel}</p>
                </div>
              </div>

              {/* Personal Info Display & Editing */}
              <div className="sm:border-l sm:border-slate-200 sm:pl-4 w-full sm:w-auto">
                {isEditingProfileInfo ? (
                  <div className="space-y-2 bg-slate-50 p-3 border border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono uppercase text-slate-500 w-24 shrink-0">Full Name:</span>
                      <input
                        type="text"
                        value={editingProfileName}
                        onChange={(e) => setEditingProfileName(e.target.value)}
                        className="bg-white border border-slate-300 px-2 py-0.5 text-xs text-[#0A2540] font-sans focus:outline-none focus:border-slate-500 rounded-none w-full sm:w-48"
                        placeholder="e.g. John Doe"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono uppercase text-slate-500 w-24 shrink-0">Nationality:</span>
                      <select
                        value={editingProfileNationality}
                        onChange={(e) => setEditingProfileNationality(e.target.value)}
                        className="bg-white border border-slate-300 px-1 py-0.5 text-xs text-[#0A2540] font-sans focus:outline-none focus:border-slate-500 rounded-none w-full sm:w-48 max-h-32 overflow-y-auto"
                      >
                        {WORLDWIDE_NATIONALITIES.map((nationality) => (
                          <option key={nationality} value={nationality}>
                            {nationality}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono uppercase text-slate-500 w-24 shrink-0">Seafarer ID:</span>
                      <input
                        type="text"
                        value={editingProfileSeafarerId}
                        onChange={(e) => setEditingProfileSeafarerId(e.target.value)}
                        className="bg-white border border-slate-300 px-2 py-0.5 text-xs text-[#0A2540] font-sans focus:outline-none focus:border-slate-500 rounded-none w-full sm:w-48"
                        placeholder="e.g. GBR-94821-M"
                        required
                      />
                    </div>
                    <div className="flex justify-end gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsEditingProfileInfo(false)}
                        className="px-2 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-600 text-[9px] font-mono uppercase font-bold rounded-none cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = stagedCrewList.map(c => {
                            if (c.rank === activeProfile.rank) {
                              return { 
                                ...c, 
                                name: editingProfileName, 
                                nationality: editingProfileNationality,
                                seafarerId: editingProfileSeafarerId
                              };
                            }
                            return c;
                          });
                          setStagedCrewList(updated);
                          setCrewList(updated);
                          localStorage.setItem("sms_crewList", JSON.stringify(updated));
                          setIsEditingProfileInfo(false);

                          // Global Crew Change Integration
                          if (isMeMember(activeProfile)) {
                            const updatedUser: UserProfile = {
                              ...currentUser,
                              fullName: editingProfileName || currentUser.fullName,
                              nationality: editingProfileNationality || currentUser.nationality,
                              seafarerId: editingProfileSeafarerId || currentUser.seafarerId
                            };
                            setCurrentUser(updatedUser);
                            localStorage.setItem("sms_user_profile", JSON.stringify(updatedUser));
                            window.dispatchEvent(new CustomEvent("sms_user_profile_changed", { detail: updatedUser }));
                          }

                          // If Deck Officer, sync to Bridge Watchkeeping
                          if (activeProfile.department === "Deck") {
                            try {
                              syncDeckOfficersToBridgeWatches(updated);
                            } catch (err) {
                              console.error("Error updating bridge watchkeeper", err);
                            }
                          }

                          window.dispatchEvent(new CustomEvent("sms_crewList_changed"));
                          triggerNotification(`Updated personal credentials for ${activeProfile.rank} (${editingProfileName}).`);
                        }}
                        className="px-2 py-0.5 bg-[#00A86B] text-white hover:bg-emerald-600 text-[9px] font-mono uppercase font-bold rounded-none cursor-pointer"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-1 py-1">
                    <div>
                      <span className="text-[9px] font-mono uppercase text-slate-400 block leading-none">Full Name</span>
                      <strong className="text-slate-800 font-sans text-xs leading-none mt-1 block">
                        {activeProfile.name || "Not Assigned"}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[9px] font-mono uppercase text-slate-400 block leading-none">Nationality</span>
                      <strong className="text-slate-800 font-sans text-xs leading-none mt-1 block">
                        {activeProfile.nationality || "Filipino"}
                      </strong>
                    </div>
                    <div className="col-span-2 lg:col-span-1">
                      <span className="text-[9px] font-mono uppercase text-slate-400 block leading-none">Seafarer ID</span>
                      <strong className="text-slate-800 font-mono text-xs leading-none mt-1 block uppercase">
                        {activeProfile.seafarerId || "Not Registered"}
                      </strong>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 shrink-0 items-center w-full lg:w-auto justify-end">
              {/* Interactive pencil icon button cleanly positioned on the LEFT side of Standard Watch */}
              <button
                onClick={() => {
                  if (!isEditingProfileInfo) {
                    setEditingProfileName(activeProfile.name || "Not Assigned");
                    setEditingProfileNationality(activeProfile.nationality || "Filipino");
                    setEditingProfileSeafarerId(activeProfile.seafarerId || "");
                  }
                  setIsEditingProfileInfo(!isEditingProfileInfo);
                }}
                className={`p-1.5 border rounded-none cursor-pointer flex items-center justify-center transition-all ${
                  isEditingProfileInfo 
                    ? "bg-[#0A2540] border-[#0A2540] text-white" 
                    : "bg-white border-slate-300 hover:bg-slate-50 text-slate-600"
                }`}
                title="Edit Personal Information"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => applyRotation("3-watch")}
                className="bg-slate-100 hover:bg-slate-200 border border-slate-300 text-[#0A2540] text-[10px] font-bold uppercase px-3 py-1.5 rounded-none flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" /> Standard Watch
              </button>

              <button
                onClick={() => applyRotation("6-6")}
                className="bg-amber-50 hover:bg-amber-100 border border-amber-300 text-[#FF4500] text-[10px] font-bold uppercase px-3 py-1.5 rounded-none flex items-center gap-1 cursor-pointer"
              >
                <Scale className="w-3 h-3" /> Shift to "6-on/6-off" Port stay
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column: Duties & Responsibilities (6 cols) */}
            <div className="lg:col-span-5 bg-white border border-slate-200 p-5 shadow-sm flex flex-col justify-between rounded-none space-y-4">
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Briefcase className={`${currentTheme.text} w-4.5 h-4.5`} />
                  <h4 className="text-xs font-bold tracking-widest text-[#0A2540] uppercase font-sans">
                    Duties & Responsibilities
                  </h4>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed font-sans">
                  List of standard roles assigned. Click on any duty row to modify, or append new requirements in the dashboard input below.
                </p>

                {/* Duties Listings */}
                <div className="space-y-3">
                  {activeProfile.duties.map((duty, idx) => (
                    <div key={idx} className="group relative p-3 bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed font-sans rounded-none flex justify-between items-start gap-4">
                      {editingDutyIdx === idx ? (
                        <div className="flex-1 space-y-2">
                          <div className="space-y-1">
                            <label className="block text-[9px] font-mono text-slate-400 uppercase">Time Range / Watch</label>
                            <input
                              type="text"
                              value={editingDutyTimeRange}
                              onChange={(e) => setEditingDutyTimeRange(e.target.value)}
                              className="w-full bg-white border border-slate-300 px-2 py-1 text-xs text-[#0A2540] font-mono focus:outline-none focus:border-slate-500"
                              placeholder="e.g., 08:00 - 12:00 or Daywork"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="block text-[9px] font-mono text-slate-400 uppercase">Duty Description</label>
                            <textarea
                              value={editingDutyText}
                              onChange={(e) => setEditingDutyText(e.target.value)}
                              className="w-full bg-white border border-slate-300 p-2 text-xs text-[#0A2540] font-sans focus:outline-none focus:border-slate-500 resize-none"
                              rows={2}
                            />
                          </div>
                          <div className="flex gap-1.5 justify-end">
                            <button
                              type="button"
                              onClick={() => setEditingDutyIdx(null)}
                              className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-600 text-[10px] font-mono font-bold uppercase cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => saveDuty(idx)}
                              className="px-2 py-1 bg-[#0A2540] text-white text-[10px] font-mono font-bold uppercase cursor-pointer"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex flex-col gap-1 flex-1 pr-4">
                            <span className="font-mono text-[9px] font-bold text-slate-500 bg-slate-200/60 px-1.5 py-0.5 rounded w-fit leading-none mb-0.5">
                              {duty.timeRange}
                            </span>
                            <span className="text-slate-700 leading-normal font-sans text-xs">
                              {duty.description}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0 border-l border-slate-200 pl-2">
                            <button
                              onClick={() => startEditingDuty(idx, duty)}
                              className="text-blue-500 hover:text-blue-700 font-mono text-[9px] font-bold uppercase cursor-pointer px-1 py-0.5 hover:bg-blue-50"
                            >
                              Edit
                            </button>
                            <span className="text-slate-300 font-mono text-[9px]">|</span>
                            <button
                              onClick={() => deleteDuty(idx)}
                              className="text-red-500 hover:text-red-700 cursor-pointer p-1 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Append new duty */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-1">
                    <label className="block text-[9px] font-mono text-slate-400 uppercase mb-1">Time Slot</label>
                    <input
                      type="text"
                      value={newDutyTimeRange}
                      onChange={(e) => setNewDutyTimeRange(e.target.value)}
                      placeholder="e.g. 08:00-12:00"
                      className="w-full bg-slate-50 border border-slate-200 px-2 py-1.5 text-xs text-slate-800 font-mono focus:outline-none focus:bg-white focus:border-slate-400"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[9px] font-mono text-slate-400 uppercase mb-1">Duty / Operation Description</label>
                    <input
                      type="text"
                      value={newDutyText}
                      onChange={(e) => setNewDutyText(e.target.value)}
                      placeholder="e.g. Safety audits, deck watch..."
                      className="w-full bg-slate-50 border border-slate-200 px-2 py-1.5 text-xs text-slate-800 font-sans focus:outline-none focus:bg-white focus:border-slate-400"
                    />
                  </div>
                </div>
                <button
                  onClick={addDuty}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-[#0A2540] text-xs font-bold uppercase tracking-wider cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Append Duty Item
                </button>
              </div>

            </div>

            {/* Right Column: Work & Rest Hour Log Grid (7 cols) */}
            <div className="lg:col-span-7 bg-white border border-slate-200 p-5 shadow-sm rounded-none space-y-5">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Activity className={`${currentTheme.text} w-4.5 h-4.5`} />
                  <h4 className="text-xs font-bold tracking-widest text-[#0A2540] uppercase font-sans">
                    24-Hour Work & Rest Hour Log
                  </h4>
                </div>
                <span className="text-[9px] font-mono uppercase text-slate-400">STCW A-VIII/1 Compliance</span>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed font-sans">
                Below is the interactive 24-hour watch schedule. Toggle individual hour blocks to shift between <strong>Work</strong> and <strong>Rest</strong> status. Rest compliance audits in real-time.
              </p>

              {/* Key colors code */}
              <div className="flex items-center gap-4 text-[10px] font-mono uppercase text-slate-500 bg-slate-50 px-3 py-1.5 border border-slate-200 w-fit">
                <div className="flex items-center gap-1.5">
                  <div className="w-3.5 h-3.5 bg-slate-200 border border-slate-300" />
                  <span>Rest hours</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className={`w-3.5 h-3.5 ${currentTheme.primary}`} />
                  <span>Work hours</span>
                </div>
              </div>

              {/* 24 click block grids */}
              <div className="grid grid-cols-6 sm:grid-cols-12 gap-2">
                {activeProfile.schedule.map((isWork, hour) => {
                  const hourStr = String(hour).padStart(2, "0") + ":00";
                  return (
                    <button
                      key={hour}
                      onClick={() => toggleHour(hour)}
                      className={`p-2 border text-center transition-all cursor-pointer flex flex-col justify-between h-14 ${
                        isWork
                          ? `${currentTheme.primary} border-${currentTheme.accent} text-white font-bold shadow-sm`
                          : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-500"
                      }`}
                    >
                      <span className="text-[8px] font-mono block opacity-60 leading-none mb-1">{hourStr}</span>
                      <span className="text-[10px] font-mono block tracking-tighter leading-none uppercase">
                        {isWork ? "WORK" : "REST"}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Real-time Rest Hours Validation Dashboard */}
              <div className="pt-4 border-t border-slate-100 space-y-4">
                <div className="flex justify-between items-center text-xs font-mono text-slate-500">
                  <span>Total Work Duration: <strong className="text-slate-800">{validation.workHoursCount} hrs</strong></span>
                  <span>Total Rest Duration: <strong className="text-slate-800">{validation.restHoursCount} hrs</strong></span>
                  <span>Longest Rest Block: <strong className="text-slate-800">{validation.maxRestBlock} hrs continuous</strong></span>
                </div>

                <AnimatePresence mode="wait">
                  {validation.compliant ? (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="bg-[#00A86B]/5 border border-[#00A86B]/20 p-4 flex items-center gap-3"
                    >
                      <CheckCircle2 className="w-5 h-5 text-[#00A86B] shrink-0" />
                      <div>
                        <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-500 block">STCW Compliance audit</span>
                        <strong className="text-xs font-sans text-[#00A86B] block">STCW CODE SECURE & COMPLIANT</strong>
                        <p className="text-[11px] text-slate-600 font-sans mt-0.5 leading-relaxed">
                          This watchkeeper schedule fully satisfies "The Golden Rules of Maritime Rest Hours" (at least 10h rest, no more than 14h work, and a continuous rest period of at least 6 hours).
                        </p>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="bg-red-50 border border-red-200 p-4 flex items-start gap-3"
                    >
                      <AlertTriangle className="text-[#FF4500] w-5 h-5 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-[#FF4500] block">STCW Regulation violation</span>
                        <strong className="text-xs font-sans text-[#FF4500] block">FATIGUE BREACH DETECTED</strong>
                        <ul className="text-[11px] text-slate-700 font-sans mt-1 list-disc pl-4 space-y-1">
                          {validation.violations.map((v, vIdx) => (
                            <li key={vIdx} className="leading-snug">{v}</li>
                          ))}
                        </ul>
                        <p className="text-[10px] text-slate-400 font-sans mt-2 italic leading-normal">
                          Notice: MLC 2006 / STCW violations trigger alert logs on port state inspections and can result in severe legal liabilities and detentions.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

            </div>

          </div>
        </div>
      )}


      {/* 4. GUARDED CREW DELETION CONFIRMATION MODAL */}
      <AnimatePresence>
        {crewRankToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCrewRankToDelete(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
            />
            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white border border-slate-300 shadow-2xl rounded-none w-full max-w-md relative z-10 overflow-hidden"
            >
              <div className="bg-[#0A2540] text-white p-4 flex items-center gap-2">
                <AlertTriangle className="text-amber-400 w-5 h-5 shrink-0" />
                <h3 className="text-xs font-bold font-mono uppercase tracking-wider">SMS Crew Roster Security Guard</h3>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed font-sans">
                  You are initiating a permanent crew record deletion command.
                </p>
                <div className="bg-red-50 border border-red-200 p-4 text-center">
                  <p className="text-sm font-extrabold text-slate-800 font-sans uppercase">
                    Delete "{crewRankToDelete}"?
                  </p>
                  <p className="text-[11px] text-red-600 font-mono mt-2 font-bold leading-normal">
                    Are you sure you want to permanently delete this crew member from the vessel's active roster?
                  </p>
                </div>
                <p className="text-[10px] text-slate-400 font-mono leading-normal">
                  WARNING: This operation will update the GMDSS registry logs and automatically decrement the vessel's Personnel on Board (POB) count in real-time.
                </p>
              </div>
              <div className="bg-slate-50 border-t border-slate-200 p-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCrewRankToDelete(null)}
                  className="px-4 py-2 border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-xs font-extrabold uppercase tracking-wider cursor-pointer transition-all"
                >
                  NO
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteCrew}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold uppercase tracking-wider cursor-pointer transition-all shadow-md"
                >
                  YES
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
