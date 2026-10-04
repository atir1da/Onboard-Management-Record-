import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Ship, 
  Anchor, 
  Compass, 
  ShieldCheck, 
  Lock, 
  Mail, 
  User, 
  IdCard, 
  Globe2, 
  Layers, 
  CheckCircle2, 
  AlertTriangle, 
  LogOut, 
  ArrowRight,
  Eye,
  EyeOff,
  Radio,
  Clock,
  Wrench,
  Coffee,
  Sparkles,
  UserPlus
} from "lucide-react";
import { useFirebase } from "../context/FirebaseContext";
import { DEPARTMENT_RANKS, UserProfile } from "../types/userProfile";
import { WORLDWIDE_NATIONALITIES } from "../constants/maritimeData";

interface AuthScreenProps {
  onSuccess?: () => void;
}

export default function AuthScreen({ onSuccess }: AuthScreenProps) {
  const { 
    currentUser, 
    isProfileComplete, 
    isLoadingProfile, 
    loginWithGoogle, 
    loginWithEmail, 
    signUpWithEmail, 
    logout,
    saveFirestoreProfile 
  } = useFirebase();

  // Mode: "login" | "signup"
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  
  // Auth Form State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [suggestSignUp, setSuggestSignUp] = useState(false);
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);

  // Mandatory Profile Setup Form State
  const [fullName, setFullName] = useState(() => currentUser?.displayName || "");
  const [seafarerId, setSeafarerId] = useState("");
  const [department, setDepartment] = useState<"Deck" | "Engine" | "Catering">("Deck");
  const [rank, setRank] = useState("Second Officer");
  const [nationality, setNationality] = useState("Filipino");
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Handle department change -> reset rank to first available
  const handleDepartmentChange = (dept: "Deck" | "Engine" | "Catering") => {
    setDepartment(dept);
    const ranks = DEPARTMENT_RANKS[dept];
    if (ranks && ranks.length > 0 && !ranks.includes(rank)) {
      setRank(ranks[0]);
    }
  };

  // Submit Email / Password Auth
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setSuggestSignUp(false);

    if (!email.trim() || !password) {
      setAuthError("Please provide both email address and password.");
      return;
    }

    if (password.length < 6) {
      setAuthError("Password must be at least 6 characters long.");
      return;
    }

    setIsSubmittingAuth(true);
    try {
      if (authMode === "signup") {
        await signUpWithEmail(email.trim(), password);
      } else {
        await loginWithEmail(email.trim(), password);
      }
    } catch (err: any) {
      const code = err?.code || "";
      if (code === "auth/user-not-found" || code === "auth/wrong-password" || code === "auth/invalid-credential") {
        if (authMode === "login") {
          setAuthError("No registered seafarer account found for this email, or password incorrect. If this is your first time here, click below to register.");
          setSuggestSignUp(true);
        } else {
          setAuthError("Invalid email or password format. Please verify your credentials.");
        }
      } else if (code === "auth/email-already-in-use") {
        setAuthError("An account with this email already exists. Switched to Sign In mode.");
        setAuthMode("login");
      } else if (code === "auth/invalid-email") {
        setAuthError("Invalid email address format.");
      } else if (code === "auth/weak-password") {
        setAuthError("Password is too weak. Please use at least 6 characters.");
      } else {
        console.error("Auth error:", err);
        setAuthError(err?.message || "Authentication failed. Please check network and credentials.");
      }
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  // One-click Register from Suggestion
  const handleRegisterFromSuggestion = async () => {
    if (!email.trim() || !password) {
      setAuthMode("signup");
      return;
    }
    setAuthMode("signup");
    setAuthError(null);
    setSuggestSignUp(false);
    setIsSubmittingAuth(true);
    try {
      await signUpWithEmail(email.trim(), password);
    } catch (err: any) {
      const code = err?.code || "";
      if (code === "auth/email-already-in-use") {
        setAuthError("An account with this email already exists. Please verify your password and Sign In.");
        setAuthMode("login");
      } else {
        setAuthError(err?.message || "Failed to create account.");
      }
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  // Google Login
  const handleGoogleLogin = async () => {
    setAuthError(null);
    setSuggestSignUp(false);
    setIsSubmittingAuth(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      if (err?.code !== "auth/popup-closed-by-user" && err?.code !== "auth/cancelled-popup-request") {
        console.error("Google sign-in error:", err);
        setAuthError(err?.message || "Google sign-in was interrupted. Please try again.");
      }
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  // Instant 1-Click Demo Login with Auto-Provisioning & Profile Setup
  const handleQuickDemoSignIn = async (role: "deck" | "engine") => {
    setIsSubmittingAuth(true);
    setAuthError(null);
    setSuggestSignUp(false);

    const isDeck = role === "deck";
    const demoEmail = isDeck ? "yuki.tanaka@maritime-sentinel.com" : "chief.engineer@maritime-sentinel.com";
    const demoPass = "Sentinel2026!";
    const demoName = isDeck ? "Yuki Tanaka" : "Hendrik Van Der Bilt";
    const demoDept = isDeck ? "Deck" : "Engine";
    const demoRank = isDeck ? "Second Officer" : "Chief Engineer";
    const demoCdc = isDeck ? "PHL-55291-O" : "NLD-88124-E";
    const demoNat = isDeck ? "Filipino" : "Dutch";

    setEmail(demoEmail);
    setPassword(demoPass);
    setFullName(demoName);
    setDepartment(demoDept as any);
    setRank(demoRank);
    setSeafarerId(demoCdc);
    setNationality(demoNat);

    try {
      try {
        await loginWithEmail(demoEmail, demoPass);
      } catch (loginErr: any) {
        const code = loginErr?.code || "";
        if (code === "auth/invalid-credential" || code === "auth/user-not-found" || code === "auth/wrong-password") {
          // Provision account in Firebase Auth if not already existing
          await signUpWithEmail(demoEmail, demoPass);
        } else {
          throw loginErr;
        }
      }

      // Save complete Seafarer Profile to Firestore
      await saveFirestoreProfile({
        fullName: demoName,
        department: demoDept as any,
        rank: demoRank,
        seafarerId: demoCdc,
        nationality: demoNat,
        email: demoEmail
      });

      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      const code = err?.code || "";
      if (code !== "auth/invalid-credential" && code !== "auth/user-not-found") {
        console.error("Demo login error:", err);
      }
      setAuthError(err?.message || "Failed to initialize demo account.");
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  // Mandatory Profile Save
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);

    if (!fullName.trim()) {
      setProfileError("Full Name is mandatory for STCW compliance.");
      return;
    }

    if (!seafarerId.trim()) {
      setProfileError("Seafarer ID / CDC Number is strictly required.");
      return;
    }

    setIsSavingProfile(true);
    try {
      const cleanProfile: Omit<UserProfile, "isLoggedIn"> = {
        fullName: fullName.trim(),
        department,
        rank,
        seafarerId: seafarerId.trim().toUpperCase(),
        nationality,
        email: currentUser?.email || email.trim()
      };

      await saveFirestoreProfile(cleanProfile);
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      console.error("Save profile error:", err);
      setProfileError(err?.message || "Failed to persist seafarer credentials to Firestore. Please retry.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  // If user is already logged in but profile is not completed -> Show Profile Setup Screen
  if (currentUser && !isProfileComplete) {
    return (
      <div className="min-h-screen bg-[#071728] text-slate-100 flex flex-col justify-between font-sans selection:bg-[#00A86B] selection:text-white">
        {/* Top Telemetry Bar */}
        <header className="border-b border-slate-800 bg-[#0A2540]/80 backdrop-blur-md px-6 py-3 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#00A86B]/20 border border-[#00A86B] flex items-center justify-center text-[#00A86B]">
              <Anchor className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-black font-mono tracking-widest text-white uppercase">
                PACIFIC SENTINEL · IMO 9845722
              </div>
              <div className="text-[10px] font-mono text-slate-400">
                STCW 2010 CREW ONBOARDING TERMINAL
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block font-mono text-[10px]">
              <span className="text-slate-400 block">AUTHENTICATED ACCOUNT</span>
              <span className="text-[#00A86B] font-bold">{currentUser.email || currentUser.displayName}</span>
            </div>
            <button
              onClick={() => logout()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-mono text-xs border border-slate-700 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </header>

        {/* Profile Setup Form Container */}
        <main className="flex-1 flex items-center justify-center p-4 sm:p-6 z-10">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-2xl bg-[#0B2138] border border-slate-700/80 shadow-2xl p-6 sm:p-8 relative"
          >
            {/* Top Badge */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-700/60 mb-6">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-emerald-950/80 border border-[#00A86B] flex items-center justify-center text-[#00A86B]">
                  <IdCard className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-extrabold text-white uppercase tracking-wider font-mono">
                    Mandatory Seafarer Profile Setup
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Enter your official shipboard credentials to synchronize duties, bridge watch schedules, and STCW records.
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-mono font-bold uppercase tracking-wider hidden sm:block">
                Required Before Access
              </span>
            </div>

            {profileError && (
              <div className="mb-5 p-3 bg-red-950/50 border border-red-800 text-red-300 text-xs flex items-center gap-2 font-mono">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{profileError}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-5 font-mono text-xs">
              {/* Full Name */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Full Legal Seafarer Name *</span>
                  <span className="text-[10px] text-slate-400 font-normal">As shown on Passport / Seaman's Book</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    required
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Yuki Tanaka or Capt. Alexander Sterling"
                    className="w-full bg-[#071728] border border-slate-700 pl-10 pr-3 py-2.5 text-white font-sans text-xs focus:outline-none focus:border-[#00A86B] transition-colors"
                  />
                </div>
              </div>

              {/* Seafarer ID / CDC Number */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Seafarer ID / CDC Number *</span>
                  <span className="text-[10px] text-[#00A86B] font-bold">Mandatory STCW Record</span>
                </label>
                <div className="relative">
                  <IdCard className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    required
                    type="text"
                    value={seafarerId}
                    onChange={(e) => setSeafarerId(e.target.value.toUpperCase())}
                    placeholder="e.g. PHL-55291-O or SGP-98457-C"
                    className="w-full bg-[#071728] border border-slate-700 pl-10 pr-3 py-2.5 text-white font-mono text-xs uppercase tracking-wider focus:outline-none focus:border-[#00A86B] transition-colors"
                  />
                </div>
              </div>

              {/* Department Selector */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Shipboard Department *
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {(["Deck", "Engine", "Catering"] as const).map((dept) => {
                    const isSelected = department === dept;
                    const Icon = dept === "Deck" ? Compass : dept === "Engine" ? Wrench : Coffee;
                    return (
                      <button
                        key={dept}
                        type="button"
                        onClick={() => handleDepartmentChange(dept)}
                        className={`p-3 border text-left flex flex-col justify-between transition-all cursor-pointer ${
                          isSelected
                            ? "bg-[#00A86B]/20 border-[#00A86B] text-white shadow-xs"
                            : "bg-[#071728] border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-200"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <Icon className={`w-4 h-4 ${isSelected ? "text-[#00A86B]" : "text-slate-500"}`} />
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-[#00A86B]" />}
                        </div>
                        <span className="font-bold uppercase tracking-wider text-xs block">{dept}</span>
                        <span className="text-[9px] text-slate-400 block mt-0.5">
                          {dept === "Deck" ? "Navigation & Cargo" : dept === "Engine" ? "Propulsion & Power" : "Provisions & Galley"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic Rank Dropdown based on Department */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Assigned Rank Onboard ({department}) *
                  </label>
                  <select
                    value={rank}
                    onChange={(e) => setRank(e.target.value)}
                    className="w-full bg-[#071728] border border-slate-700 p-2.5 text-white font-mono text-xs focus:outline-none focus:border-[#00A86B] transition-colors cursor-pointer"
                  >
                    {DEPARTMENT_RANKS[department].map((r) => (
                      <option key={r} value={r} className="bg-[#071728] text-white">
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Nationality */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Seafarer Nationality *
                  </label>
                  <select
                    value={nationality}
                    onChange={(e) => setNationality(e.target.value)}
                    className="w-full bg-[#071728] border border-slate-700 p-2.5 text-white font-mono text-xs focus:outline-none focus:border-[#00A86B] transition-colors cursor-pointer"
                  >
                    <option value="Filipino">Filipino 🇵🇭</option>
                    <option value="Indonesian">Indonesian 🇮🇩</option>
                    <option value="Indian">Indian 🇮🇳</option>
                    <option value="Greek">Greek 🇬🇷</option>
                    <option value="Russian">Russian 🇷🇺</option>
                    <option value="Ukrainian">Ukrainian 🇺🇦</option>
                    <option value="Dutch">Dutch 🇳🇱</option>
                    <option value="British">British 🇬🇧</option>
                    <option value="Chinese">Chinese 🇨🇳</option>
                    <option value="Singaporean">Singaporean 🇸🇬</option>
                    <option value="Croatian">Croatian 🇭🇷</option>
                    {WORLDWIDE_NATIONALITIES.filter(n => ![
                      "Filipino", "Indonesian", "Indian", "Greek", "Russian", 
                      "Ukrainian", "Dutch", "British", "Chinese", "Singaporean", "Croatian"
                    ].includes(n)).map((nat) => (
                      <option key={nat} value={nat} className="bg-[#071728] text-white">
                        {nat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Live Preview Card */}
              <div className="p-3 bg-[#071728] border border-slate-700/60 rounded-xs flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-800 border border-slate-600 flex items-center justify-center font-bold text-white text-xs">
                    {fullName ? fullName.charAt(0).toUpperCase() : "U"}
                  </div>
                  <div>
                    <span className="text-[9px] px-1 py-0.2 bg-[#00A86B] text-white font-mono font-black uppercase inline-block mb-0.5">
                      [ME / USER BADGE PREVIEW]
                    </span>
                    <div className="text-xs font-bold text-white">
                      {rank || "Officer"} · {fullName || "Seafarer Name"}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      ID: {seafarerId || "PENDING"} · {department} Dept · {nationality}
                    </div>
                  </div>
                </div>
                <div className="text-right font-mono text-[9px] text-[#00A86B] hidden sm:block">
                  <span className="block font-bold">Cloud Firestore</span>
                  <span className="text-slate-500">users/{currentUser.uid.slice(0, 8)}...</span>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSavingProfile}
                className="w-full py-3 bg-[#00A86B] hover:bg-emerald-600 text-white font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-lg disabled:opacity-50"
              >
                {isSavingProfile ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Synchronizing with Vessel Database...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm Seafarer Credentials &amp; Enter Vessel Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </motion.div>
        </main>

        {/* Footer info */}
        <footer className="border-t border-slate-800 px-6 py-2.5 text-center text-[10px] font-mono text-slate-500">
          INTERNATIONAL MARITIME ORGANIZATION (IMO) · STCW 2010 REGULATION I/14 SHIPBOARD COMPLIANCE
        </footer>
      </div>
    );
  }

  // User is NOT logged in -> Show Authentication Screen (Sign Up / Log In)
  return (
    <div className="min-h-screen bg-[#071728] text-slate-100 flex flex-col justify-between font-sans selection:bg-[#00A86B] selection:text-white relative overflow-hidden">
      {/* Background nautical grid & radar ambiance */}
      <div className="absolute inset-0 opacity-5 pointer-events-none bg-[radial-gradient(#00A86B_1px,transparent_1px)] [background-size:24px_24px]" />
      
      {/* Top Header */}
      <header className="border-b border-slate-800/80 bg-[#0A2540]/80 backdrop-blur-md px-6 py-3.5 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#00A86B] flex items-center justify-center text-[#0A2540] font-black shadow-md">
            <Ship className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-sm font-black font-mono tracking-widest text-white uppercase flex items-center gap-2">
              <span>PACIFIC SENTINEL</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-[#00A86B]/20 text-[#00A86B] border border-[#00A86B]/40 font-bold">
                ONLINE
              </span>
            </div>
            <div className="text-[10px] font-mono text-slate-400">
              IMO 9845722 · CALL SIGN 9V8841 · FLAG SINGAPORE 🇸🇬
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="hidden sm:flex items-center gap-2 text-slate-400 border border-slate-700/60 px-3 py-1 bg-slate-900/60">
            <ShieldCheck className="w-3.5 h-3.5 text-[#00A86B]" />
            <span>SOLAS / MARPOL / STCW ENFORCED</span>
          </div>
        </div>
      </header>

      {/* Main Authentication Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25 }}
          className="w-full max-w-md bg-[#0B2138] border border-slate-700/80 shadow-2xl p-6 sm:p-8 relative"
        >
          {/* Card Title & Icon */}
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-[#0A2540] border border-[#00A86B]/40 rounded-full flex items-center justify-center text-[#00A86B] mx-auto mb-3 shadow-inner">
              <Compass className="w-6 h-6 animate-spin-slow" />
            </div>
            <h1 className="text-base sm:text-lg font-black uppercase text-white tracking-wider font-mono">
              Shipboard Management System
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Authorized Seafarer Portal · Vessel Operations &amp; Watchkeeping
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-[#071728] border border-slate-700 mb-6 font-mono text-xs">
            <button
              type="button"
              onClick={() => { setAuthMode("login"); setAuthError(null); }}
              className={`py-2 font-bold uppercase tracking-wider transition-all cursor-pointer ${
                authMode === "login"
                  ? "bg-[#0A2540] text-white border border-[#00A86B] shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setAuthMode("signup"); setAuthError(null); }}
              className={`py-2 font-bold uppercase tracking-wider transition-all cursor-pointer ${
                authMode === "signup"
                  ? "bg-[#0A2540] text-white border border-[#00A86B] shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Error Notice */}
          {authError && (
            <div className="mb-4 p-3 bg-red-950/60 border border-red-800 text-red-300 text-xs font-mono space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                <span className="leading-tight">{authError}</span>
              </div>
              {suggestSignUp && (
                <button
                  type="button"
                  onClick={handleRegisterFromSuggestion}
                  disabled={isSubmittingAuth}
                  className="w-full mt-2 py-2 px-3 bg-[#00A86B] hover:bg-emerald-600 text-white font-mono text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 border border-emerald-400 shadow-md transition-colors cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Register &ldquo;{email}&rdquo; as New Seafarer Now</span>
                </button>
              )}
            </div>
          )}

          {/* Email / Password Form */}
          <form onSubmit={handleAuthSubmit} className="space-y-4 font-mono text-xs">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                Official Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="officer@maritime-sentinel.com"
                  className="w-full bg-[#071728] border border-slate-700 pl-10 pr-3 py-2.5 text-white font-sans text-xs focus:outline-none focus:border-[#00A86B] transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1 flex items-center justify-between">
                <span>Account Password</span>
                {authMode === "signup" && (
                  <span className="text-[10px] text-slate-400 font-normal">Min. 6 characters</span>
                )}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  required
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#071728] border border-slate-700 pl-10 pr-10 py-2.5 text-white font-mono text-xs focus:outline-none focus:border-[#00A86B] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-white"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmittingAuth}
              className="w-full py-2.5 bg-[#00A86B] hover:bg-emerald-600 text-white font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md disabled:opacity-50 mt-2"
            >
              {isSubmittingAuth ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Processing Auth...</span>
                </>
              ) : (
                <span>{authMode === "login" ? "Log In to Vessel System" : "Register Seafarer Account"}</span>
              )}
            </button>
          </form>

          {/* Social / Alternative Divider */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-700/60" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase font-mono">
              <span className="bg-[#0B2138] px-2 text-slate-400">Or continue with</span>
            </div>
          </div>

          {/* Google Sign-In */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isSubmittingAuth}
            className="w-full py-2.5 bg-white hover:bg-slate-100 text-[#0A2540] font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer border border-slate-300 shadow-sm disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <span>Sign In with Google</span>
          </button>

          {/* Quick Demo 1-Click Access */}
          <div className="mt-5 pt-4 border-t border-slate-700/60 font-mono text-[10px]">
            <span className="text-slate-400 block mb-1.5 uppercase font-bold text-center">
              1-Click Demo Profiles (Instant Access):
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemoSignIn("deck")}
                disabled={isSubmittingAuth}
                className="p-2 bg-[#071728] hover:bg-[#00A86B]/20 hover:border-[#00A86B] text-slate-200 border border-slate-700 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 disabled:opacity-50"
              >
                <span className="font-bold text-white text-xs">Deck Officer</span>
                <span className="text-[9px] text-[#00A86B]">Yuki Tanaka (2/O)</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoSignIn("engine")}
                disabled={isSubmittingAuth}
                className="p-2 bg-[#071728] hover:bg-[#00A86B]/20 hover:border-[#00A86B] text-slate-200 border border-slate-700 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 disabled:opacity-50"
              >
                <span className="font-bold text-white text-xs">Engine Officer</span>
                <span className="text-[9px] text-[#00A86B]">Hendrik (C/E)</span>
              </button>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Footer Notice */}
      <footer className="border-t border-slate-800 px-6 py-2.5 text-center text-[10px] font-mono text-slate-500">
        RESTRICTED SHIPBOARD SYSTEM · UNAUTHORIZED ACCESS SUBJECT TO MARITIME LAW (IMO ISPS / SOLAS CH. XI-2)
      </footer>
    </div>
  );
}
