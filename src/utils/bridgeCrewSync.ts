/**
 * Utility for synchronizing Deck Department Crew Changes (C/O, 2/O, 3rd/O)
 * with Bridge Watchkeeping duties, ensuring Master is excluded from watchkeeping schedules,
 * and archiving relieved officer duties.
 */

export type BridgeOfficerRole = "chief_officer" | "second_officer" | "third_officer" | null;

/**
 * Normalizes an officer's rank or label to identify their specific STCW watchkeeping role.
 * Explicitly returns null for Master / Captain, since Master does not stand routine watches.
 */
export function getOfficerRole(rankOrLabel: string): BridgeOfficerRole {
  const s = (rankOrLabel || "").toLowerCase().trim();
  
  // Master / Captain has overall vessel command and is NOT on the routine watch schedule
  if (s.includes("master") || s.includes("captain")) {
    return null;
  }

  // Chief Officer (C/O, Chief Mate, First Mate, 1st Officer)
  if (
    s.includes("chief officer") ||
    s.includes("chief mate") ||
    s.includes("first mate") ||
    s.includes("1st officer") ||
    /\bc\s*\/\s*o\b/.test(s) ||
    /\bco\b/.test(s)
  ) {
    return "chief_officer";
  }

  // Second Officer (2/O, 2nd Officer, Second Mate, 2nd Mate)
  if (
    s.includes("second officer") ||
    s.includes("2nd officer") ||
    s.includes("second mate") ||
    s.includes("2nd mate") ||
    /\b2\s*\/\s*o\b/.test(s) ||
    /\b2nd\s*\/\s*o\b/.test(s)
  ) {
    return "second_officer";
  }

  // Third Officer (3/O, 3rd/O, 3rd Officer, Third Mate, 3rd Mate)
  if (
    s.includes("third officer") ||
    s.includes("3rd officer") ||
    s.includes("third mate") ||
    s.includes("3rd mate") ||
    /\b3\s*\/\s*o\b/.test(s) ||
    /\b3rd\s*\/\s*o\b/.test(s)
  ) {
    return "third_officer";
  }

  return null;
}

/**
 * Checks whether a rank or string corresponds to Master / Captain.
 */
export function isMasterRank(rankOrLabel: string): boolean {
  const s = (rankOrLabel || "").toLowerCase();
  return s.includes("master") || s.includes("captain");
}

export interface DeckCrewMember {
  rank: string;
  name: string;
  department: string;
  [key: string]: any;
}

export interface RelievedWatchRecordItem {
  id: string;
  originalWatchId: string;
  date: string;
  startTime: string;
  endTime: string;
  watchPeriodName: string;
  relievedOfficer: string;
  incomingOfficer: string;
  handoverTimestamp: string;
  handoverRemarks: string;
  loggedHours: number;
  activities: string;
  preWatchTelemetry?: any;
  postWatchTelemetry?: any;
}

/**
 * Synchronizes active Deck Department officers (C/O, 2/O, 3rd/O) with all Bridge Watchkeeping duties.
 * - SGM/STCW Compliance: Master is completely removed from any watchkeeping duties.
 * - Dynamic 3rd Officer replacement: Automatically transfers all active and upcoming 3rd Officer
 *   watchkeeping duties to the newly assigned 3rd Officer.
 * - Relieved Officer duty preservation & archiving: Automatically archives all completed watch duties
 *   previously served by the outgoing 3rd Officer into the "Relieved Officer Watch History" log.
 *   Completed watch records retain the outgoing officer's name for certified sea service verification.
 */
export function syncDeckOfficersToBridgeWatches(crewSource?: DeckCrewMember[]): { updated: boolean; count: number } {
  let deckCrew: DeckCrewMember[] = [];

  if (Array.isArray(crewSource) && crewSource.length > 0) {
    deckCrew = crewSource.filter(m => m && (m.department === "Deck" || m.department === "deck"));
  } else {
    try {
      const saved = localStorage.getItem("sms_crewList");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          deckCrew = parsed.filter(m => m && (m.department === "Deck" || m.department === "deck"));
        }
      }
    } catch (e) {
      console.error("Error reading sms_crewList in syncDeckOfficersToBridgeWatches:", e);
    }
  }

  // Find active Deck Officers for each role
  const chiefOfficer = deckCrew.find(m => getOfficerRole(m.rank) === "chief_officer" && m.name?.trim());
  const secondOfficer = deckCrew.find(m => getOfficerRole(m.rank) === "second_officer" && m.name?.trim());
  const thirdOfficer = deckCrew.find(m => getOfficerRole(m.rank) === "third_officer" && m.name?.trim());

  let watches: any[] = [];
  try {
    const saved = localStorage.getItem("sms_bridge_personal_watches");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        watches = parsed;
      }
    }
  } catch (e) {
    console.error("Error reading sms_bridge_personal_watches:", e);
  }

  if (watches.length === 0) {
    return { updated: false, count: 0 };
  }

  const coLabel = chiefOfficer ? `${chiefOfficer.rank} - ${chiefOfficer.name}` : "Chief Officer (Chief Mate) - Mateo Rodriguez";
  const soLabel = secondOfficer ? `${secondOfficer.rank} - ${secondOfficer.name}` : "2nd Officer (Second Mate) - Yuki Tanaka";
  const toLabel = thirdOfficer ? `${thirdOfficer.rank} - ${thirdOfficer.name}` : "3rd Officer (Third Mate) - Dmitry Ivanov";

  // Check stored active 3rd Officer to detect replacement
  const lastActive3rdOfficer = localStorage.getItem("sms_active_3rd_officer");
  const is3rdOfficerReplaced = lastActive3rdOfficer && toLabel && lastActive3rdOfficer !== toLabel;

  let updatedCount = 0;
  const nowTimestamp = new Date().toISOString().replace("T", " ").substring(0, 16) + " UTC";

  // Collect completed duties of relieved officers to archive in Relieved Watch History
  const completedDutiesToArchive: RelievedWatchRecordItem[] = [];

  const updatedWatches = watches.map((w: any) => {
    let watchChanged = false;
    let currentOOW = (w.team?.oow || "").trim();
    let updatedOOW = currentOOW;
    let updatedChiefOfficerName = w.chiefOfficerName;
    let updatedAssignment = w.chiefOfficerAssignment || "";

    // 1. SGM/STCW Compliance: Master is NEVER assigned as Officer on Watch (OOW)
    if (isMasterRank(currentOOW)) {
      if (w.startTime === "04:00" || w.startTime === "16:00") {
        updatedOOW = coLabel;
      } else if (w.startTime === "08:00" || w.startTime === "20:00") {
        updatedOOW = toLabel;
      } else {
        updatedOOW = soLabel;
      }

      if (updatedAssignment.toLowerCase().includes("master assumed bridge navigation command")) {
        updatedAssignment = `Assigned by C/O ${chiefOfficer?.name || "Mateo Rodriguez"}: Standard navigational passage watch through precautionary transit area. Maintain continuous radar parallel indexing.`;
      }
      watchChanged = true;
    }

    // 2. Identify the role of the current OOW
    const role = getOfficerRole(updatedOOW);
    const isCompleted = w.status === "completed" || w.status === "handed_over";

    // 3. Dynamic 3rd Officer Replacement & Watch Handoff
    if (role === "third_officer" && toLabel) {
      if (updatedOOW !== toLabel) {
        if (isCompleted) {
          // Rule 3: Do NOT overwrite or wipe past watch records served by the previous 3rd Officer!
          // Preserve them under their name in the history view for sea service verification.
          // Archive to Relieved Officer Watch History
          completedDutiesToArchive.push({
            id: `rel-auto-${w.id}`,
            originalWatchId: w.id,
            date: w.date,
            startTime: w.startTime,
            endTime: w.endTime,
            watchPeriodName: w.watchPeriodName || `${w.startTime}–${w.endTime} Watch`,
            relievedOfficer: updatedOOW,
            incomingOfficer: toLabel,
            handoverTimestamp: nowTimestamp,
            handoverRemarks: `3rd Officer relieved via Department Crew Change. All completed watchkeeping hours archived and preserved under ${updatedOOW} for official STCW sea service verification.`,
            loggedHours: w.loggedHours || 4,
            activities: w.activities || "Navigational bridge watchkeeping duty completed and verified.",
            preWatchTelemetry: w.preWatchTelemetry,
            postWatchTelemetry: w.postWatchTelemetry
          });
        } else {
          // Rule 2: Active or upcoming watchkeeping duties are automatically transferred to new 3rd Officer!
          const previousOfficerName = updatedOOW;
          updatedOOW = toLabel;
          watchChanged = true;
          w.activities = w.activities 
            ? `${w.activities} [OOW Transfer: Shift transferred from ${previousOfficerName} to incoming 3rd Officer ${thirdOfficer?.name || toLabel}]`
            : `[OOW Transfer: Shift transferred to incoming 3rd Officer ${thirdOfficer?.name || toLabel}]`;
        }
      }
    } else if (role === "chief_officer" && coLabel) {
      if (updatedOOW !== coLabel) {
        if (!isCompleted) {
          updatedOOW = coLabel;
          watchChanged = true;
        }
      }
    } else if (role === "second_officer" && soLabel) {
      if (updatedOOW !== soLabel) {
        if (!isCompleted) {
          updatedOOW = soLabel;
          watchChanged = true;
        }
      }
    }

    // 4. Update Chief Officer directive signatory if Chief Officer changed
    if (chiefOfficer && chiefOfficer.name) {
      const properCOName = `${chiefOfficer.name} (Chief Officer)`;
      if (updatedChiefOfficerName !== properCOName) {
        updatedChiefOfficerName = properCOName;
        watchChanged = true;
      }
    }

    if (watchChanged) {
      updatedCount++;
      return {
        ...w,
        team: {
          ...w.team,
          oow: updatedOOW
        },
        chiefOfficerName: updatedChiefOfficerName,
        chiefOfficerAssignment: updatedAssignment
      };
    }

    return w;
  });

  // Archive any collected completed duties of relieved officers
  if (completedDutiesToArchive.length > 0) {
    try {
      let existingRelieved: RelievedWatchRecordItem[] = [];
      const savedHistory = localStorage.getItem("sms_relieved_watch_history");
      if (savedHistory) {
        const parsed = JSON.parse(savedHistory);
        if (Array.isArray(parsed)) {
          existingRelieved = parsed;
        }
      }

      // Avoid duplicates
      const newItemsToAdd = completedDutiesToArchive.filter(newItem => 
        !existingRelieved.some(ex => ex.originalWatchId === newItem.originalWatchId && ex.relievedOfficer === newItem.relievedOfficer)
      );

      if (newItemsToAdd.length > 0) {
        const combined = [...newItemsToAdd, ...existingRelieved];
        localStorage.setItem("sms_relieved_watch_history", JSON.stringify(combined));
        window.dispatchEvent(new CustomEvent("sms_relieved_history_updated"));
      }
    } catch (e) {
      console.error("Error archiving relieved officer duty history:", e);
    }
  }

  // Record current active 3rd Officer
  if (toLabel) {
    localStorage.setItem("sms_active_3rd_officer", toLabel);
  }

  // Update personal watchkeeper identity if it was the Master or outgoing 3rd Officer
  const currentPersonal = localStorage.getItem("sms_personal_watchkeeper");
  if (currentPersonal) {
    if (isMasterRank(currentPersonal)) {
      localStorage.setItem("sms_personal_watchkeeper", soLabel);
      window.dispatchEvent(new CustomEvent("sms_personal_watchkeeper_changed"));
    } else if (lastActive3rdOfficer && currentPersonal.includes(lastActive3rdOfficer) && toLabel) {
      localStorage.setItem("sms_personal_watchkeeper", toLabel);
      window.dispatchEvent(new CustomEvent("sms_personal_watchkeeper_changed"));
    }
  }

  if (updatedCount > 0) {
    try {
      localStorage.setItem("sms_bridge_personal_watches", JSON.stringify(updatedWatches));
      window.dispatchEvent(new CustomEvent("sms_bridge_watches_updated"));
    } catch (e) {
      console.error("Error saving updated bridge watches:", e);
    }
    return { updated: true, count: updatedCount };
  }

  return { updated: false, count: 0 };
}
