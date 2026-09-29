export interface UserProfile {
  fullName: string;
  department: "Deck" | "Engine" | "Catering";
  rank: string;
  seafarerId: string;
  nationality: string;
  isLoggedIn?: boolean;
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
  isLoggedIn: true
};

export function getStoredUserProfile(): UserProfile {
  try {
    const saved = localStorage.getItem("sms_user_profile");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.fullName && parsed.rank) {
        return parsed;
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
