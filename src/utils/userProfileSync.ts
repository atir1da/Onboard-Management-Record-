import { UserProfile, saveUserProfile } from "../types/userProfile";

export function syncUserProfileWithSystem(profile: UserProfile): void {
  // 1. Save profile to localStorage
  saveUserProfile(profile);

  // 2. Sync to Crew List in localStorage ("sms_crewList")
  try {
    const savedCrew = localStorage.getItem("sms_crewList");
    let crewList: any[] = [];
    if (savedCrew) {
      try {
        crewList = JSON.parse(savedCrew);
      } catch (e) {
        crewList = [];
      }
    }

    if (Array.isArray(crewList) && crewList.length > 0) {
      // First clear isMe flag on all other crew members
      crewList = crewList.map(member => ({
        ...member,
        isMe: false
      }));

      // Find matching rank in crew list or append
      const existingIdx = crewList.findIndex(
        m => m.rank.toLowerCase() === profile.rank.toLowerCase() && m.department.toLowerCase() === profile.department.toLowerCase()
      );

      if (existingIdx !== -1) {
        crewList[existingIdx] = {
          ...crewList[existingIdx],
          name: profile.fullName,
          seafarerId: profile.seafarerId,
          nationality: profile.nationality,
          isMe: true
        };
      } else {
        // Append new member with isMe
        crewList.push({
          rank: profile.rank,
          department: profile.department,
          duties: [
            { timeRange: "08:00 - 12:00", description: `Primary sea duty operations for ${profile.rank}.` },
            { timeRange: "13:00 - 17:00", description: `Departmental administrative and equipment maintenance duties.` }
          ],
          defaultWatch: profile.department === "Deck" ? "0000-0400" : "Daywork",
          watchLabel: `${profile.rank} Regular Watch`,
          schedule: Array(24).fill(false).map((_, h) => (h >= 8 && h < 12) || (h >= 13 && h < 17)),
          name: profile.fullName,
          nationality: profile.nationality,
          seafarerId: profile.seafarerId,
          isMe: true
        });
      }

      localStorage.setItem("sms_crewList", JSON.stringify(crewList));
      window.dispatchEvent(new CustomEvent("sms_crewList_changed"));
    }
  } catch (e) {
    console.error("Error syncing user profile to crew list:", e);
  }

  // 3. Pre-assign Watchkeeping shifts on Bridge if Deck Officer
  try {
    const isDeckOfficer = profile.department === "Deck" && (
      profile.rank.toLowerCase().includes("officer") ||
      profile.rank.toLowerCase().includes("cadet")
    ) && !profile.rank.toLowerCase().includes("master") && !profile.rank.toLowerCase().includes("captain");

    const formattedIdentity = `${profile.rank} - ${profile.fullName}`;
    if (isDeckOfficer) {
      localStorage.setItem("sms_personal_watchkeeper", formattedIdentity);
    }

    if (isDeckOfficer) {
      const savedWatches = localStorage.getItem("sms_bridge_personal_watches");
      if (savedWatches) {
        let watches = JSON.parse(savedWatches);
        if (Array.isArray(watches)) {
          // Standard STCW Shift mapping:
          // 2nd Officer: 00:00–04:00 & 12:00–16:00
          // 3rd Officer: 08:00–12:00 & 20:00–24:00 (or 20:00-00:00)
          // Chief Officer: 04:00–08:00 & 16:00–20:00
          // Master does not have routine watchkeeping duties
          const lowerRank = profile.rank.toLowerCase();

          const targetStartTimes: string[] = [];
          if (lowerRank.includes("second") || lowerRank.includes("2nd")) {
            targetStartTimes.push("00:00", "12:00");
          } else if (lowerRank.includes("third") || lowerRank.includes("3rd")) {
            targetStartTimes.push("08:00", "20:00");
          } else if (lowerRank.includes("chief") || lowerRank.includes("first")) {
            targetStartTimes.push("04:00", "16:00");
          }

          if (targetStartTimes.length > 0) {
            watches = watches.map(w => {
              if (targetStartTimes.includes(w.startTime)) {
                return {
                  ...w,
                  team: {
                    ...w.team,
                    oow: formattedIdentity
                  },
                  isPersonalWatch: true
                };
              }
              return w;
            });

            localStorage.setItem("sms_bridge_personal_watches", JSON.stringify(watches));
            window.dispatchEvent(new CustomEvent("sms_bridge_watches_updated"));
          }
        }
      }
    }
  } catch (e) {
    console.error("Error auto-assigning bridge watches:", e);
  }
}
