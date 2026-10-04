export interface UserProfile {
  fullName: string;
  department: "Deck" | "Engine" | "Catering";
  rank: string;
  seafarerId: string;
  nationality: string;
  isLoggedIn?: boolean;
  email?: string;
  userId?: string;
  // Contract Duration & Sea Duty Setup Parameters
  contractDurationMonths?: number; // e.g. 12 Months
  signOnDate?: string;             // e.g. "2026-01-05"
  signOffDate?: string;            // e.g. "2027-01-05"
}

export const DEPARTMENT_RANKS: Record<"Deck" | "Engine" | "Catering", string[]> = {
  Deck: [
    "Master",
    "Chief Officer",
    "Second Officer",
    "Third Officer",
    "Bosun",
    "Able Seaman (AB)",
    "Ordinary Seaman (OS)",
    "Deck Cadet"
  ],
  Engine: [
    "Chief Engineer",
    "Second Engineer",
    "Third Engineer",
    "Fourth Engineer",
    "Electro-Technical Officer (ETO)",
    "Fitter",
    "Oiler/Motorman",
    "Wiper",
    "Engine Cadet"
  ],
  Catering: [
    "Chief Cook",
    "Assistant Cook",
    "Steward",
    "Messman"
  ]
};

export const DEFAULT_USER_PROFILE: UserProfile = {
  fullName: "Yuki Tanaka",
  department: "Deck",
  rank: "Second Officer",
  seafarerId: "PHL-55291-O",
  nationality: "Filipino",
  isLoggedIn: true,
  contractDurationMonths: 12,
  signOnDate: "2026-01-05",
  signOffDate: "2027-01-05"
};

/**
 * Calculates the exact sign-off date based on Sign-On Date + Contract Duration (Months).
 * Seamlessly supports both ISO "YYYY-MM-DD" and maritime "DD/MM/YYYY" date formats.
 */
export function calculateSignOffDate(signOnDateStr: string, durationMonths: number): string {
  if (!signOnDateStr) return "";
  const validDuration = Math.max(1, Math.min(12, Number(durationMonths) || 12));

  let year: number, month: number, day: number;
  let isSlashFormat = false;

  if (signOnDateStr.includes("/")) {
    isSlashFormat = true;
    const parts = signOnDateStr.split("/").map(Number);
    if (parts.length !== 3) return "";
    day = parts[0];
    month = parts[1];
    year = parts[2];
  } else {
    const parts = signOnDateStr.split("-").map(Number);
    if (parts.length !== 3) return "";
    year = parts[0];
    month = parts[1];
    day = parts[2];
  }

  // Calculate target month and year
  const totalMonths = month - 1 + validDuration;
  const targetYear = year + Math.floor(totalMonths / 12);
  const targetMonth = ((totalMonths % 12) + 12) % 12;
  const daysInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  const targetDay = Math.min(day, daysInTargetMonth);

  const y = String(targetYear);
  const m = String(targetMonth + 1).padStart(2, "0");
  const d = String(targetDay).padStart(2, "0");

  if (isSlashFormat) {
    return `${d}/${m}/${y}`;
  }
  return `${y}-${m}-${d}`;
}

/**
 * Calculates total sea service days for the entire contract window (Sign-On to Sign-Off)
 */
export function getTotalContractDays(signOnDateStr?: string, signOffDateStr?: string): number {
  if (!signOnDateStr || !signOffDateStr) return 0;
  
  const parseToDate = (dStr: string) => {
    if (dStr.includes("/")) {
      const p = dStr.split("/").map(Number);
      return new Date(p[2], p[1] - 1, p[0]);
    }
    const p = dStr.split("-").map(Number);
    return new Date(p[0], p[1] - 1, p[2]);
  };

  try {
    const sDate = parseToDate(signOnDateStr);
    const eDate = parseToDate(signOffDateStr);
    const diff = eDate.getTime() - sDate.getTime();
    const days = Math.round(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  } catch {
    return 0;
  }
}

/**
 * Calculates remaining contract sea days from current simulated or system date to sign-off date
 */
export function getRemainingContractDays(
  signOffDateStr?: string, 
  referenceDateStr?: string,
  signOnDateStr?: string
): number {
  if (!signOffDateStr) return 0;
  
  let targetYear = 0, targetMonth = 0, targetDay = 0;
  if (signOffDateStr.includes("/")) {
    const p = signOffDateStr.split("/").map(Number);
    if (p.length === 3) {
      targetDay = p[0];
      targetMonth = p[1];
      targetYear = p[2];
    }
  } else {
    const p = signOffDateStr.split("-").map(Number);
    if (p.length === 3) {
      targetYear = p[0];
      targetMonth = p[1];
      targetDay = p[2];
    }
  }
  if (!targetYear) return 0;
  const target = new Date(targetYear, targetMonth - 1, targetDay);

  let refDate = new Date();
  if (referenceDateStr) {
    if (referenceDateStr.includes("/")) {
      const p = referenceDateStr.split("/").map(Number);
      if (p.length === 3) refDate = new Date(p[2], p[1] - 1, p[0]);
    } else {
      const p = referenceDateStr.split("-").map(Number);
      if (p.length === 3) refDate = new Date(p[0], p[1] - 1, p[2]);
    }
  } else if (signOnDateStr) {
    if (signOnDateStr.includes("/")) {
      const p = signOnDateStr.split("/").map(Number);
      if (p.length === 3) {
        const s = new Date(p[2], p[1] - 1, p[0]);
        if (refDate < s) refDate = s;
      }
    } else {
      const p = signOnDateStr.split("-").map(Number);
      if (p.length === 3) {
        const s = new Date(p[0], p[1] - 1, p[2]);
        if (refDate < s) refDate = s;
      }
    }
  }

  const today = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate());
  const diffMs = target.getTime() - today.getTime();
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return days > 0 ? days : 0;
}

export function getStoredUserProfile(): UserProfile {
  try {
    const saved = localStorage.getItem("sms_user_profile");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.fullName && parsed.rank) {
        const duration = parsed.contractDurationMonths 
          ? Math.max(1, Math.min(12, Number(parsed.contractDurationMonths))) 
          : 12;
        const signOn = parsed.signOnDate || "2026-01-05";
        return {
          ...DEFAULT_USER_PROFILE,
          ...parsed,
          contractDurationMonths: duration,
          signOnDate: signOn,
          signOffDate: parsed.signOffDate || calculateSignOffDate(signOn, duration)
        };
      }
    }
  } catch (e) {
    console.error("Error reading sms_user_profile", e);
  }
  return DEFAULT_USER_PROFILE;
}

export function saveUserProfile(profile: UserProfile): void {
  try {
    localStorage.setItem("sms_user_profile", JSON.stringify(profile));
    window.dispatchEvent(new CustomEvent("sms_user_profile_changed", { detail: profile }));
  } catch (e) {
    console.error("Error saving sms_user_profile", e);
  }
}
