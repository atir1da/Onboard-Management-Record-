import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { 
  User, 
  ShieldCheck, 
  Anchor, 
  Compass, 
  Wrench, 
  Coffee, 
  CheckCircle2, 
  X, 
  IdCard, 
  Globe2, 
  Sparkles,
  Layers,
  Clock,
  CalendarDays
} from "lucide-react";
import { 
  UserProfile, 
  DEPARTMENT_RANKS, 
  getStoredUserProfile,
  calculateSignOffDate,
  getRemainingContractDays,
  getTotalContractDays
} from "../types/userProfile";
import { WORLDWIDE_NATIONALITIES } from "../constants/maritimeData";
import { syncUserProfileWithSystem } from "../utils/userProfileSync";
import { useFirebase } from "../context/FirebaseContext";

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProfileUpdated?: (profile: UserProfile) => void;
}

export default function UserProfileModal({ isOpen, onClose, onProfileUpdated }: UserProfileModalProps) {
  const { currentUser, saveFirestoreProfile, logout } = useFirebase();
  const [profile, setProfile] = useState<UserProfile>(() => getStoredUserProfile());
  const [department, setDepartment] = useState<"Deck" | "Engine" | "Catering">("Deck");
  const [rank, setRank] = useState<string>("Second Officer");
  const [fullName, setFullName] = useState<string>("");
  const [seafarerId, setSeafarerId] = useState<string>("");
  const [nationality, setNationality] = useState<string>("Filipino");
  const [contractDurationMonths, setContractDurationMonths] = useState<number>(12);
  const [signOnDate, setSignOnDate] = useState<string>("2026-01-05");
  const [signOffDate, setSignOffDate] = useState<string>("2027-01-05");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      const current = getStoredUserProfile();
      setProfile(current);
      setDepartment(current.department || "Deck");
      setRank(current.rank || "Second Officer");
      setFullName(current.fullName || "");
      setSeafarerId(current.seafarerId || "");
      setNationality(current.nationality || "Filipino");
      const duration = current.contractDurationMonths || 12;
      const signOn = current.signOnDate || "2026-01-05";
      setContractDurationMonths(duration);
      setSignOnDate(signOn);
      setSignOffDate(current.signOffDate || calculateSignOffDate(signOn, duration));
      setErrorMsg("");
      setSavedSuccess(false);
    }
  }, [isOpen]);

  // When department changes, if the current rank is not in that department's ranks, auto-select first rank
  const handleDepartmentChange = (dept: "Deck" | "Engine" | "Catering") => {
    setDepartment(dept);
    const availableRanks = DEPARTMENT_RANKS[dept];
    if (!availableRanks.includes(rank)) {
      setRank(availableRanks[0]);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setErrorMsg("Full Name is required.");
      return;
    }
    if (!seafarerId.trim()) {
      setErrorMsg("Seafarer ID / CDC Number is required.");
      return;
    }

    const updatedProfile: UserProfile = {
      fullName: fullName.trim(),
      department,
      rank,
      seafarerId: seafarerId.trim().toUpperCase(),
      nationality,
      contractDurationMonths: Number(contractDurationMonths) || 12,
      signOnDate: signOnDate || "2026-01-05",
      signOffDate: signOffDate || calculateSignOffDate(signOnDate || "2026-01-05", Number(contractDurationMonths) || 12),
      email: currentUser?.email || profile.email || "",
      userId: currentUser?.uid || profile.userId,
      isLoggedIn: true
    };

    syncUserProfileWithSystem(updatedProfile);
    setProfile(updatedProfile);
    
    // Save to Cloud Firestore if user is authenticated
    if (currentUser) {
      saveFirestoreProfile({
        fullName: updatedProfile.fullName,
        department: updatedProfile.department,
        rank: updatedProfile.rank,
        seafarerId: updatedProfile.seafarerId,
        nationality: updatedProfile.nationality,
        contractDurationMonths: updatedProfile.contractDurationMonths,
        signOnDate: updatedProfile.signOnDate,
        signOffDate: updatedProfile.signOffDate,
        email: currentUser.email || ""
      }).catch(err => console.error("Firestore profile update error:", err));
    }

    setSavedSuccess(true);
    if (onProfileUpdated) {
      onProfileUpdated(updatedProfile);
    }

    setTimeout(() => {
      onClose();
    }, 900);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white border border-slate-300 shadow-2xl w-full max-w-lg relative rounded-none overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header HUD */}
        <div className="bg-[#0A2540] text-white p-4 flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#00A86B] rounded-none flex items-center justify-center text-white shadow-md">
              <Anchor className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-white">
                  User Profile & Sea Duty Setup
                </h3>
                <span className="text-[9px] px-1.5 py-0.2 bg-emerald-500/20 text-[#00A86B] border border-emerald-500/40 font-mono font-bold uppercase">
                  [ME / USER]
                </span>
              </div>
              <p className="text-[10px] text-slate-300 font-mono mt-0.5">
                Shipboard identity & STCW watchkeeping credential sync
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-4">
          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-mono p-2.5">
              {errorMsg}
            </div>
          )}

          {savedSuccess && (
            <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-mono p-2.5 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#00A86B]" />
              <span>Identity synced successfully across Bridge, Drills & Crew module!</span>
            </div>
          )}

          {/* Full Name */}
          <div className="space-y-1">
            <label className="block text-[10px] font-mono uppercase text-slate-500 font-bold tracking-wider">
              Full Legal Name (as per Passport / CDC)
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Yuki Tanaka"
                className="w-full bg-slate-50 border border-slate-200 pl-8 pr-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:bg-white focus:border-[#0A2540] transition-colors"
              />
              <User className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
            </div>
          </div>

          {/* Department Selection (Deck, Engine, Catering) */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-mono uppercase text-slate-500 font-bold tracking-wider">
              Department Assigned
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleDepartmentChange("Deck")}
                className={`py-2 px-3 border text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all ${
                  department === "Deck"
                    ? "bg-[#0A2540] text-white border-[#0A2540] shadow-sm"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                Deck
              </button>

              <button
                type="button"
                onClick={() => handleDepartmentChange("Engine")}
                className={`py-2 px-3 border text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all ${
                  department === "Engine"
                    ? "bg-[#FF4500] text-white border-[#FF4500] shadow-sm"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <Wrench className="w-3.5 h-3.5" />
                Engine
              </button>

              <button
                type="button"
                onClick={() => handleDepartmentChange("Catering")}
                className={`py-2 px-3 border text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all ${
                  department === "Catering"
                    ? "bg-[#00A86B] text-white border-[#00A86B] shadow-sm"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <Coffee className="w-3.5 h-3.5" />
                Catering
              </button>
            </div>
          </div>

          {/* Rank Onboard (Populated strictly based on selected Department) */}
          <div className="space-y-1">
            <label className="block text-[10px] font-mono uppercase text-slate-500 font-bold tracking-wider flex items-center justify-between">
              <span>Rank Onboard (Dynamic Department Filtering)</span>
              <span className="text-[9px] text-[#00A86B] font-mono font-bold lowercase">
                filtered to {department}
              </span>
            </label>
            <select
              value={rank}
              onChange={(e) => setRank(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:bg-white focus:border-[#0A2540] transition-colors"
            >
              {DEPARTMENT_RANKS[department].map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* STCW Watch Auto-Assignment Notice for Deck Officers */}
          {department === "Deck" && (
            <div className="bg-blue-50 border border-blue-200 p-2.5 text-[10px] font-mono text-blue-900 flex items-start gap-2">
              <Clock className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block uppercase text-blue-950">STCW Watch Rotation Auto-Assignment:</span>
                {rank.toLowerCase().includes("second") && (
                  <span>Auto-mapped to <strong>00:00–04:00 & 12:00–16:00</strong> (Middle & Afternoon Watch) on Bridge.</span>
                )}
                {rank.toLowerCase().includes("third") && (
                  <span>Auto-mapped to <strong>08:00–12:00 & 20:00–24:00</strong> (Forenoon & First Watch) on Bridge.</span>
                )}
                {rank.toLowerCase().includes("chief") && (
                  <span>Auto-mapped to <strong>04:00–08:00 & 16:00–20:00</strong> (Morning & Evening Watch) on Bridge.</span>
                )}
                {rank.toLowerCase().includes("master") && (
                  <span>Designated Executive Command & On-Call Watchkeeper.</span>
                )}
                {rank.toLowerCase().includes("cadet") && (
                  <span>Auto-mapped to Navigational Training Watch under OOW supervision.</span>
                )}
                {!rank.toLowerCase().includes("officer") && !rank.toLowerCase().includes("master") && !rank.toLowerCase().includes("cadet") && (
                  <span>Deck Rating assignment: Helmsman & Lookout rotation eligible.</span>
                )}
              </div>
            </div>
          )}

          {/* Seafarer ID / CDC Number */}
          <div className="space-y-1">
            <label className="block text-[10px] font-mono uppercase text-slate-500 font-bold tracking-wider">
              Seafarer ID / CDC Number
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={seafarerId}
                onChange={(e) => setSeafarerId(e.target.value.toUpperCase())}
                placeholder="e.g. PHL-55291-O or GBR-94821-M"
                className="w-full bg-slate-50 border border-slate-200 pl-8 pr-3 py-2 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:bg-white focus:border-[#0A2540] transition-colors"
              />
              <IdCard className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
            </div>
          </div>

          {/* Nationality */}
          <div className="space-y-1">
            <label className="block text-[10px] font-mono uppercase text-slate-500 font-bold tracking-wider">
              Nationality / Flag State License
            </label>
            <div className="relative">
              <select
                value={nationality}
                onChange={(e) => setNationality(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 pl-8 pr-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:bg-white focus:border-[#0A2540] transition-colors"
              >
                {WORLDWIDE_NATIONALITIES.map((nat) => (
                  <option key={nat} value={nat}>
                    {nat}
                  </option>
                ))}
              </select>
              <Globe2 className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
            </div>
          </div>

          {/* Sea Service Contract Parameters (Contract Duration 1-12 Months, Sign-On Date, Sign-Off Date) */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-[#00A86B]" />
                <span className="text-[11px] font-mono uppercase font-bold text-[#0A2540]">
                  Sea Duty Contract Parameters (1–12 Months Dynamic Sync)
                </span>
              </div>
              <span className="text-[9px] font-mono px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold uppercase border border-emerald-300">
                STCW Sea Duty Sync
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              {/* Contract Duration Selector (1 to 12 Months) */}
              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-500 font-bold mb-1 flex items-center justify-between">
                  <span>Contract Duration *</span>
                  <span className="text-[9px] text-[#00A86B] font-bold">1 to 12 Mos</span>
                </label>
                <select
                  value={contractDurationMonths}
                  onChange={(e) => {
                    const val = Math.max(1, Math.min(12, parseInt(e.target.value) || 12));
                    setContractDurationMonths(val);
                    if (signOnDate) {
                      setSignOffDate(calculateSignOffDate(signOnDate, val));
                    }
                  }}
                  className="w-full bg-white border border-slate-200 px-2.5 py-1.5 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-[#0A2540] cursor-pointer"
                >
                  <option value={1}>1 Month</option>
                  <option value={2}>2 Months</option>
                  <option value={3}>3 Months (1 Quarter / Bosun Phase)</option>
                  <option value={4}>4 Months (Standard 4-Mo Turnaround)</option>
                  <option value={5}>5 Months</option>
                  <option value={6}>6 Months (Standard 6-Mo Contract)</option>
                  <option value={7}>7 Months</option>
                  <option value={8}>8 Months</option>
                  <option value={9}>9 Months (Standard Officer Rotation)</option>
                  <option value={10}>10 Months</option>
                  <option value={11}>11 Months</option>
                  <option value={12}>12 Months (Full STCW Cadet Year)</option>
                </select>

                {/* Quick Selection Pills */}
                <div className="flex items-center gap-1 mt-1.5">
                  {[1, 3, 6, 9, 12].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        setContractDurationMonths(m);
                        if (signOnDate) {
                          setSignOffDate(calculateSignOffDate(signOnDate, m));
                        }
                      }}
                      className={`text-[9px] font-mono font-bold px-1.5 py-0.5 border cursor-pointer transition-all ${
                        contractDurationMonths === m
                          ? "bg-[#0A2540] text-white border-[#0A2540]"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {m}M
                    </button>
                  ))}
                </div>
              </div>

              {/* Sign-On Date */}
              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-500 font-bold mb-1">
                  Sign-On Date *
                </label>
                <input
                  type="date"
                  required
                  value={signOnDate}
                  onChange={(e) => {
                    const newSignOn = e.target.value;
                    setSignOnDate(newSignOn);
                    if (newSignOn && contractDurationMonths) {
                      setSignOffDate(calculateSignOffDate(newSignOn, contractDurationMonths));
                    }
                  }}
                  className="w-full bg-white border border-slate-200 px-2.5 py-1.5 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-[#0A2540]"
                />
                <span className="block text-[9px] font-mono text-slate-400 mt-1 truncate">
                  Port: Active Vessel Sign-On
                </span>
              </div>

              {/* Calculated Sign-Off Date */}
              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-500 font-bold mb-1 flex items-center justify-between">
                  <span>Sign-Off Date</span>
                  <span className="text-[9px] text-[#00A86B] font-bold lowercase">auto / edit</span>
                </label>
                <input
                  type="date"
                  required
                  value={signOffDate}
                  onChange={(e) => setSignOffDate(e.target.value)}
                  className="w-full bg-white border border-slate-200 px-2.5 py-1.5 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-[#0A2540]"
                />
                <span className="block text-[9px] font-mono text-emerald-600 font-semibold mt-1 truncate">
                  Syncs to +{contractDurationMonths} Months
                </span>
              </div>
            </div>

            {/* Contract Timeline summary badge */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[10px] font-mono bg-white p-2 border border-slate-200 text-slate-600">
              <div className="flex items-center gap-3">
                <span>Remaining: <strong className="text-[#0A2540]">{getRemainingContractDays(signOffDate, undefined, signOnDate)} Days</strong></span>
                <span>Total Span: <strong className="text-slate-700">{getTotalContractDays(signOnDate, signOffDate)} Days</strong> ({contractDurationMonths} Months)</span>
              </div>
              <span className="text-emerald-700 font-semibold">Auto-Syncs Bridge Watches &amp; Cadet Phases</span>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-[9px] font-mono text-slate-400 uppercase flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#00A86B]" />
                Synced across PMS & Watch Hours
              </span>
              {currentUser && (
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    onClose();
                  }}
                  className="text-[10px] font-mono text-red-600 hover:text-red-800 underline uppercase cursor-pointer"
                >
                  Sign Out
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-mono font-bold uppercase tracking-wider cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#00A86B] hover:bg-emerald-600 text-white text-xs font-mono font-bold uppercase tracking-wider cursor-pointer flex items-center gap-1.5 shadow"
              >
                <CheckCircle2 className="w-4 h-4" />
                Save & Set Active User
              </button>
            </div>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
