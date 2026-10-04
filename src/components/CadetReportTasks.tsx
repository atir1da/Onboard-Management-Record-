import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Anchor, 
  Flame, 
  Compass, 
  Shield, 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  FileText, 
  Camera, 
  Upload, 
  Plus, 
  Search, 
  Filter, 
  Edit3, 
  Trash2, 
  User, 
  Award, 
  Check, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Paperclip, 
  Eye, 
  Sparkles,
  Download,
  Info,
  Layers,
  Ship,
  FileCheck
} from "lucide-react";
import { 
  CadetRotationPhase, 
  CadetTaskItem, 
  CadetTaskStatus, 
  ROTATION_PHASES 
} from "../types/cadetTraining";
import { 
  getStoredCadetTasks, 
  saveCadetTasksLocally, 
  syncCadetTaskToFirestore, 
  deleteCadetTaskFromFirestore, 
  subscribeToFirestoreCadetTasks 
} from "../utils/cadetFirestoreSync";
import { getStoredUserProfile, UserProfile } from "../types/userProfile";
import { useFirebase } from "../context/FirebaseContext";

const SAMPLE_ATTACHMENTS = [
  {
    name: "Forecastle_Mooring_Wire_Inspection.jpg",
    type: "image" as const,
    url: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=600&q=80"
  },
  {
    name: "LSA_Lifeboat_Hydrostatic_Release.jpg",
    type: "image" as const,
    url: "https://images.unsplash.com/photo-1584466977773-e625c37cdd50?auto=format&fit=crop&w=600&q=80"
  },
  {
    name: "ECDIS_ENC_Passage_Plot_Tokyo.png",
    type: "image" as const,
    url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80"
  },
  {
    name: "Draft_Survey_Hydrometer_Density.pdf",
    type: "document" as const,
    url: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80"
  }
];

export default function CadetReportTasks() {
  const { userProfile: fbUserProfile, isConnected } = useFirebase();
  const [currentUser, setCurrentUser] = useState<UserProfile>(() => getStoredUserProfile());

  // Listen to profile updates
  useEffect(() => {
    const handleProfileChange = () => {
      setCurrentUser(getStoredUserProfile());
    };
    window.addEventListener("sms_user_profile_changed", handleProfileChange);
    return () => window.removeEventListener("sms_user_profile_changed", handleProfileChange);
  }, []);

  useEffect(() => {
    if (fbUserProfile) {
      setCurrentUser(fbUserProfile);
    }
  }, [fbUserProfile]);

  // Is active user a Deck Cadet?
  const isDeckCadet = useMemo(() => {
    const r = (currentUser.rank || "").toLowerCase();
    const d = (currentUser.department || "").toLowerCase();
    return r.includes("cadet") || (d === "deck" && r.includes("trainee"));
  }, [currentUser]);

  // Active Rotation Sub-Tab (4 Phases)
  const [activePhase, setActivePhase] = useState<CadetRotationPhase>("bosun_assist");

  // Tasks State
  const [tasks, setTasks] = useState<CadetTaskItem[]>(() => getStoredCadetTasks());

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | CadetTaskStatus>("ALL");

  // Modal State for Task Entry Form (Add/Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<CadetTaskItem | null>(null);

  // Attachment Viewer Modal
  const [viewingAttachment, setViewingAttachment] = useState<{ url: string; name: string } | null>(null);

  // Form State
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formAssistDescription, setFormAssistDescription] = useState("");
  const [formDate, setFormDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [formStatus, setFormStatus] = useState<CadetTaskStatus>("Pending Review");
  const [formDocName, setFormDocName] = useState("");
  const [formDocUrl, setFormDocUrl] = useState("");
  const [formDocType, setFormDocType] = useState<"image" | "document" | "checklist">("image");
  const [formHours, setFormHours] = useState<number>(4);
  const [formLocation, setFormLocation] = useState("Main Deck");
  const [formOfficerMentor, setFormOfficerMentor] = useState("");
  const [formOfficerRemarks, setFormOfficerRemarks] = useState("");
  const [formTrbRef, setFormTrbRef] = useState("STCW II/1");
  const [formError, setFormError] = useState<string | null>(null);

  // Calendar Navigation State
  const [calendarDate, setCalendarDate] = useState<Date>(() => new Date(2026, 4, 1)); // May 2026 default
  const [selectedCalendarDateStr, setSelectedCalendarDateStr] = useState<string | null>(null);

  // Toast Notification
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(prev => prev === msg ? null : prev), 3500);
  };

  // Synchronize with Firestore real-time listener
  useEffect(() => {
    const unsub = subscribeToFirestoreCadetTasks((updated) => {
      setTasks(updated);
      saveCadetTasksLocally(updated);
    });

    const handleExternalUpdate = (e: any) => {
      if (e?.detail) setTasks(e.detail);
    };
    window.addEventListener("sms_cadet_tasks_updated", handleExternalUpdate);

    return () => {
      unsub();
      window.removeEventListener("sms_cadet_tasks_updated", handleExternalUpdate);
    };
  }, []);

  // Update default calendar month when active phase changes
  useEffect(() => {
    if (activePhase === "bosun_assist") {
      setCalendarDate(new Date(2026, 4, 1)); // May 2026
    } else if (activePhase === "third_officer_assist") {
      setCalendarDate(new Date(2026, 6, 1)); // July 2026
    } else if (activePhase === "second_officer_assist") {
      setCalendarDate(new Date(2026, 7, 1)); // August 2026
    } else {
      setCalendarDate(new Date(2026, 9, 1)); // October 2026
    }
    setSelectedCalendarDateStr(null);
  }, [activePhase]);

  // Filter tasks for active phase
  const phaseTasks = useMemo(() => {
    return tasks.filter(t => t.phase === activePhase);
  }, [tasks, activePhase]);

  // Filtered tasks by search, status, and selected calendar date
  const filteredTasks = useMemo(() => {
    return phaseTasks.filter(t => {
      if (statusFilter !== "ALL" && t.status !== statusFilter) return false;
      if (selectedCalendarDateStr && t.date !== selectedCalendarDateStr) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.assistDescription.toLowerCase().includes(q) ||
          (t.officerMentor && t.officerMentor.toLowerCase().includes(q)) ||
          (t.trbReference && t.trbReference.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [phaseTasks, statusFilter, searchQuery, selectedCalendarDateStr]);

  // Phase statistics
  const phaseStats = useMemo(() => {
    const total = phaseTasks.length;
    const approved = phaseTasks.filter(t => t.status === "Approved by Officer").length;
    const completed = phaseTasks.filter(t => t.status === "Completed").length;
    const inProgress = phaseTasks.filter(t => t.status === "In Progress").length;
    const pending = phaseTasks.filter(t => t.status === "Pending Review").length;
    const totalHours = phaseTasks.reduce((sum, t) => sum + (t.hoursSpent || 0), 0);
    const progressPercent = total > 0 ? Math.round((approved / total) * 100) : 0;
    return { total, approved, completed, inProgress, pending, totalHours, progressPercent };
  }, [phaseTasks]);

  // Overall TRB statistics (all 4 phases)
  const overallStats = useMemo(() => {
    const total = tasks.length;
    const approved = tasks.filter(t => t.status === "Approved by Officer").length;
    const totalHours = tasks.reduce((sum, t) => sum + (t.hoursSpent || 0), 0);
    const percent = total > 0 ? Math.round((approved / total) * 100) : 0;
    return { total, approved, totalHours, percent };
  }, [tasks]);

  // Open modal to create new task
  const handleOpenCreateModal = (specificDate?: string) => {
    setEditingTask(null);
    setFormTitle("");
    setFormDescription("");
    setFormAssistDescription("");
    setFormDate(specificDate || new Date().toISOString().split("T")[0]);
    setFormStatus("Pending Review");
    setFormDocName("");
    setFormDocUrl("");
    setFormDocType("image");
    setFormHours(4);
    setFormLocation(activePhase === "bosun_assist" ? "Forecastle Deck" : activePhase === "third_officer_assist" ? "Boat Deck" : "Navigation Bridge");
    setFormOfficerMentor(ROTATION_PHASES[activePhase].mentorTitle);
    setFormOfficerRemarks("");
    setFormTrbRef(ROTATION_PHASES[activePhase].stcwReference.split(":")[0]);
    setFormError(null);
    setIsModalOpen(true);
  };

  // Open modal to edit task
  const handleOpenEditModal = (task: CadetTaskItem) => {
    setEditingTask(task);
    setFormTitle(task.title);
    setFormDescription(task.description);
    setFormAssistDescription(task.assistDescription);
    setFormDate(task.date);
    setFormStatus(task.status);
    setFormDocName(task.documentationName || "");
    setFormDocUrl(task.documentationUrl || "");
    setFormDocType(task.documentationType || "image");
    setFormHours(task.hoursSpent || 4);
    setFormLocation(task.location || "Deck");
    setFormOfficerMentor(task.officerMentor || ROTATION_PHASES[task.phase].mentorTitle);
    setFormOfficerRemarks(task.officerRemarks || "");
    setFormTrbRef(task.trbReference || "STCW II/1");
    setFormError(null);
    setIsModalOpen(true);
  };

  // Save Task (Create or Update)
  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formTitle.trim()) {
      setFormError("Task Title / Module Name is required.");
      return;
    }
    if (!formDescription.trim()) {
      setFormError("Task Description is required.");
      return;
    }
    if (!formAssistDescription.trim()) {
      setFormError("Assist Description (duties assisted under supervision) is required.");
      return;
    }
    if (!formDate) {
      setFormError("Task Date is required.");
      return;
    }

    const newTaskItem: CadetTaskItem = {
      id: editingTask ? editingTask.id : `cadet-task-${Date.now()}`,
      phase: editingTask ? editingTask.phase : activePhase,
      title: formTitle.trim(),
      description: formDescription.trim(),
      assistDescription: formAssistDescription.trim(),
      date: formDate,
      status: formStatus,
      documentationName: formDocName.trim() || (formDocUrl ? "Attachment_Evidence.jpg" : undefined),
      documentationUrl: formDocUrl.trim() || undefined,
      documentationType: formDocType,
      officerMentor: formOfficerMentor.trim() || ROTATION_PHASES[activePhase].mentorTitle,
      officerRemarks: formOfficerRemarks.trim() || undefined,
      trbReference: formTrbRef.trim() || "STCW II/1",
      cadetName: currentUser.fullName || "Mateo Rossi",
      cadetRank: currentUser.rank || "Deck Cadet",
      cadetId: currentUser.seafarerId || "CDC-CADET-01",
      hoursSpent: Number(formHours) || 4,
      location: formLocation.trim() || "Main Deck",
      createdAt: editingTask ? editingTask.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    let updatedTasks: CadetTaskItem[];
    if (editingTask) {
      updatedTasks = tasks.map(t => t.id === editingTask.id ? newTaskItem : t);
      showToast("Task updated and synced to Training Record Book.");
    } else {
      updatedTasks = [newTaskItem, ...tasks];
      showToast("New sea project task logged successfully.");
    }

    setTasks(updatedTasks);
    saveCadetTasksLocally(updatedTasks);
    setIsModalOpen(false);

    // Sync to Firestore
    syncCadetTaskToFirestore(newTaskItem).catch(err => {
      console.warn("Firestore task sync warning:", err);
    });
  };

  // Quick Officer Approval Handler
  const handleQuickApprove = (task: CadetTaskItem) => {
    const isApproved = task.status === "Approved by Officer";
    const nextStatus: CadetTaskStatus = isApproved ? "Completed" : "Approved by Officer";
    const updatedTask: CadetTaskItem = {
      ...task,
      status: nextStatus,
      officerMentor: task.officerMentor || `${currentUser.rank} - ${currentUser.fullName}`,
      officerRemarks: isApproved 
        ? task.officerRemarks 
        : `Verified and endorsed by ${currentUser.rank} ${currentUser.fullName} on ${new Date().toISOString().split("T")[0]}. Meets STCW competency criteria.`,
      updatedAt: new Date().toISOString()
    };

    const updatedTasks = tasks.map(t => t.id === task.id ? updatedTask : t);
    setTasks(updatedTasks);
    saveCadetTasksLocally(updatedTasks);
    syncCadetTaskToFirestore(updatedTask).catch(() => {});
    showToast(isApproved ? "Status reverted to Completed." : "Task successfully endorsed and approved by officer.");
  };

  // Delete Task Handler
  const handleDeleteTask = (taskId: string) => {
    if (!confirm("Are you sure you want to delete this cadet training task?")) return;
    const updated = tasks.filter(t => t.id !== taskId);
    setTasks(updated);
    saveCadetTasksLocally(updated);
    deleteCadetTaskFromFirestore(taskId).catch(() => {});
    showToast("Task record removed.");
  };

  // Handle local sample attachment selection
  const handleSelectSampleAttachment = (attachment: typeof SAMPLE_ATTACHMENTS[0]) => {
    setFormDocName(attachment.name);
    setFormDocUrl(attachment.url);
    setFormDocType(attachment.type);
  };

  // Handle file input upload (converts to data URL preview)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormDocName(file.name);
      setFormDocType(file.type.includes("pdf") ? "document" : "image");
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setFormDocUrl(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Calendar Helpers for Integrated Phase Calendar
  const currentMonthName = useMemo(() => {
    return calendarDate.toLocaleString("default", { month: "long", year: "numeric" });
  }, [calendarDate]);

  const calendarDays = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Monday as 0, Sunday as 6
    let startingDayOfWeek = firstDay.getDay() - 1;
    if (startingDayOfWeek === -1) startingDayOfWeek = 6;

    const days: { dateStr: string; dayNumber: number; isCurrentMonth: boolean }[] = [];

    // Preceding padding days from previous month
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const prevDate = new Date(year, month - 1, prevMonthLastDay - i);
      const mStr = String(prevDate.getMonth() + 1).padStart(2, "0");
      const dStr = String(prevDate.getDate()).padStart(2, "0");
      days.push({
        dateStr: `${prevDate.getFullYear()}-${mStr}-${dStr}`,
        dayNumber: prevMonthLastDay - i,
        isCurrentMonth: false
      });
    }

    // Days of current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const mStr = String(month + 1).padStart(2, "0");
      const dStr = String(i).padStart(2, "0");
      days.push({
        dateStr: `${year}-${mStr}-${dStr}`,
        dayNumber: i,
        isCurrentMonth: true
      });
    }

    // Trailing padding days to fill 35 or 42 grid cells
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const nextDate = new Date(year, month + 1, i);
      const mStr = String(nextDate.getMonth() + 1).padStart(2, "0");
      const dStr = String(i).padStart(2, "0");
      days.push({
        dateStr: `${nextDate.getFullYear()}-${mStr}-${dStr}`,
        dayNumber: i,
        isCurrentMonth: false
      });
    }

    return days;
  }, [calendarDate]);

  const tasksByDateMap = useMemo(() => {
    const map: Record<string, CadetTaskItem[]> = {};
    phaseTasks.forEach(task => {
      if (!map[task.date]) map[task.date] = [];
      map[task.date].push(task);
    });
    return map;
  }, [phaseTasks]);

  const getStatusBadge = (status: CadetTaskStatus) => {
    switch (status) {
      case "Approved by Officer":
        return {
          bg: "bg-emerald-50 text-emerald-700 border-emerald-300",
          dot: "bg-emerald-500",
          icon: CheckCircle2,
          label: "Approved by Officer"
        };
      case "Completed":
        return {
          bg: "bg-blue-50 text-blue-700 border-blue-300",
          dot: "bg-blue-500",
          icon: Check,
          label: "Completed"
        };
      case "In Progress":
        return {
          bg: "bg-amber-50 text-amber-700 border-amber-300",
          dot: "bg-amber-500",
          icon: Clock,
          label: "In Progress"
        };
      case "Pending Review":
      default:
        return {
          bg: "bg-slate-100 text-slate-700 border-slate-300",
          dot: "bg-slate-400",
          icon: AlertCircle,
          label: "Pending Review"
        };
    }
  };

  const currentPhaseInfo = ROTATION_PHASES[activePhase];

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-5 right-5 z-50 bg-[#0A2540] border border-[#00A86B] text-white px-4 py-2.5 shadow-2xl font-mono text-xs flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-[#00A86B] shrink-0" />
            <span>{toastMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. TOP HEADER & DYNAMIC RANK-BASED ACCESS BANNER */}
      <div className="bg-white border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="px-2 py-0.5 bg-[#0A2540] text-white text-[10px] font-mono font-bold uppercase tracking-wider">
                STCW 2010 SECTION A-II/1
              </span>
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold uppercase border border-emerald-300 flex items-center gap-1">
                <FileCheck className="w-3 h-3" /> Training Record Book (TRB)
              </span>
            </div>
            <h2 className="text-lg md:text-xl font-black text-[#0A2540] uppercase tracking-wide mt-1.5 flex items-center gap-2">
              <span>Cadet Report &amp; Task Management</span>
              <span className="text-xs font-mono font-normal text-slate-500 lowercase">
                (Deck Cadet Sea Project Documentation)
              </span>
            </h2>
            <p className="text-xs text-slate-600 mt-1 max-w-3xl">
              Official shipboard structured training matrix, sea project tasks, and continuous watchkeeping competency log endorsed by supervising shipboard officers under IMO Model Course 7.03.
            </p>
          </div>

          {/* Dynamic Rank Access Card */}
          <div className="bg-slate-50 border border-slate-200 p-3.5 flex items-center justify-between gap-4 font-mono text-xs min-w-[280px]">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-sm flex items-center justify-center font-bold text-white shadow-xs ${
                isDeckCadet ? "bg-[#00A86B]" : "bg-[#0A2540]"
              }`}>
                {isDeckCadet ? <Award className="w-5 h-5" /> : <User className="w-5 h-5" />}
              </div>
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-400 block">
                  {isDeckCadet ? "ACTIVE CADET PROFILE" : "SUPERVISING OFFICER MODE"}
                </span>
                <span className="font-extrabold text-[#0A2540] text-xs block">
                  {currentUser.fullName || "Mateo Rossi"}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  {currentUser.rank || "Deck Cadet"} · {currentUser.seafarerId || "CDC ACTIVE"}
                </span>
              </div>
            </div>

            <div className="text-right border-l border-slate-200 pl-3">
              <span className="text-[9px] text-slate-400 uppercase block font-semibold">TRB Progress</span>
              <span className="text-base font-black text-[#00A86B] block">
                {overallStats.percent}%
              </span>
              <span className="text-[9px] text-slate-500">
                {overallStats.approved}/{overallStats.total} Approved
              </span>
            </div>
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
          <div className="flex-1 max-w-xl">
            <div className="flex items-center justify-between text-[11px] mb-1 font-bold text-slate-600">
              <span>Overall 12-Month Cadet Onboard Training Progress</span>
              <span className="text-[#0A2540]">{overallStats.approved} of {overallStats.total} Tasks Certified ({overallStats.totalHours} Sea Hours)</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 border border-slate-200 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 to-[#0A2540] transition-all duration-500"
                style={{ width: `${overallStats.percent}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleOpenCreateModal()}
              className="px-3.5 py-2 bg-[#00A86B] hover:bg-emerald-600 text-white font-mono text-xs font-bold uppercase tracking-wider cursor-pointer shadow-sm flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" /> Log Task
            </button>
            <button
              onClick={() => window.print()}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-xs font-bold uppercase tracking-wider border border-slate-300 cursor-pointer flex items-center gap-1.5 transition-colors"
              title="Print Cadet Training Record Book Report"
            >
              <Download className="w-3.5 h-3.5" /> TRB Report
            </button>
          </div>
        </div>
      </div>

      {/* 2. ROTATION SUB-TABS (4-PHASE ONBOARD TRAINING) */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 font-mono text-xs">
          {(["bosun_assist", "third_officer_assist", "second_officer_assist", "chief_officer_assist"] as CadetRotationPhase[]).map((phaseKey) => {
            const phase = ROTATION_PHASES[phaseKey];
            const isActive = activePhase === phaseKey;
            const phaseCount = tasks.filter(t => t.phase === phaseKey).length;
            const approvedCount = tasks.filter(t => t.phase === phaseKey && t.status === "Approved by Officer").length;

            return (
              <button
                key={phaseKey}
                onClick={() => setActivePhase(phaseKey)}
                className={`p-3.5 text-left border transition-all cursor-pointer relative ${
                  isActive
                    ? "bg-[#0A2540] text-white border-[#0A2540] shadow-md ring-1 ring-[#00A86B]"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                }`}
              >
                {isActive && (
                  <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-[#00A86B]" />
                )}
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-[10px] font-bold uppercase px-1.5 py-0.2 ${
                    isActive ? "bg-[#00A86B] text-white" : "bg-slate-100 text-slate-600"
                  }`}>
                    {phase.period}
                  </span>
                  <span className={`text-[10px] ${isActive ? "text-emerald-300 font-bold" : "text-slate-500"}`}>
                    {approvedCount}/{phaseCount} Certified
                  </span>
                </div>
                <div className="font-extrabold uppercase text-xs tracking-wide">
                  {phase.name}
                </div>
                <div className={`text-[10px] mt-1 line-clamp-1 ${isActive ? "text-slate-300" : "text-slate-500"}`}>
                  Mentor: {phase.mentorTitle}
                </div>
              </button>
            );
          })}
        </div>

        {/* Phase Details & Milestones Header Card */}
        <div className="bg-white border border-slate-200 p-4 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-[#00A86B] rounded-full animate-pulse" />
                <h3 className="text-sm font-black text-[#0A2540] uppercase tracking-wider font-mono">
                  {currentPhaseInfo.name} · Sea Training Syllabus
                </h3>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                <strong>Focus Area:</strong> {currentPhaseInfo.focusArea}
              </p>
              <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                Competency Regulation: <strong>{currentPhaseInfo.stcwReference}</strong> · Supervising Officer: <strong>{currentPhaseInfo.mentorTitle}</strong>
              </p>
            </div>

            <div className="flex items-center gap-2 font-mono text-xs">
              <div className="px-3 py-1.5 bg-slate-50 border border-slate-200 text-center">
                <span className="text-[9px] text-slate-400 block uppercase">Phase Tasks</span>
                <span className="font-bold text-[#0A2540]">{phaseStats.total}</span>
              </div>
              <div className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-center">
                <span className="text-[9px] text-emerald-600 block uppercase">Approved</span>
                <span className="font-bold text-emerald-800">{phaseStats.approved}</span>
              </div>
              <div className="px-3 py-1.5 bg-blue-50 border border-blue-200 text-center">
                <span className="text-[9px] text-blue-600 block uppercase">Hours Logged</span>
                <span className="font-bold text-blue-800">{phaseStats.totalHours} hrs</span>
              </div>
            </div>
          </div>

          {/* 3-Month Rotation Milestones */}
          <div className="mt-3 pt-1">
            <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block mb-2">
              Mandatory Phase Milestones (STCW TRB Sign-Off Targets):
            </span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {currentPhaseInfo.milestones.map((m, idx) => (
                <div key={idx} className="p-2.5 bg-slate-50/80 border border-slate-200 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono font-bold text-[#0A2540] bg-white px-1.5 py-0.2 border border-slate-200">
                      {m.dueMonth}
                    </span>
                    <span className="text-[9px] font-mono text-emerald-600 font-bold uppercase">
                      STCW Required
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-800 text-[11px] leading-snug">{m.title}</h4>
                  <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">{m.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3. TASK SEARCH, FILTERS & ACTION BAR */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 font-mono text-xs">
        <div className="flex flex-1 items-center gap-2">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search module title, task details, assist duties, officer..."
              className="w-full bg-white border border-slate-300 pl-9 pr-3 py-1.5 text-slate-800 text-xs focus:outline-none focus:border-[#0A2540]"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-white border border-slate-300 py-1.5 px-2 text-xs text-slate-800 focus:outline-none focus:border-[#0A2540] cursor-pointer"
            >
              <option value="ALL">All Statuses ({phaseTasks.length})</option>
              <option value="Approved by Officer">Approved ({phaseStats.approved})</option>
              <option value="Completed">Completed ({phaseStats.completed})</option>
              <option value="In Progress">In Progress ({phaseStats.inProgress})</option>
              <option value="Pending Review">Pending Review ({phaseStats.pending})</option>
            </select>
          </div>
        </div>

        {/* Selected Date Filter Badge */}
        {selectedCalendarDateStr && (
          <div className="flex items-center gap-2 px-2.5 py-1 bg-amber-50 border border-amber-300 text-amber-800 text-xs">
            <span>Filtered by Calendar Date: <strong>{selectedCalendarDateStr}</strong></span>
            <button
              onClick={() => setSelectedCalendarDateStr(null)}
              className="text-amber-800 hover:text-amber-950 font-bold ml-1"
              title="Clear calendar date filter"
            >
              ✕
            </button>
          </div>
        )}

        <button
          onClick={() => handleOpenCreateModal(selectedCalendarDateStr || undefined)}
          className="px-3.5 py-1.5 bg-[#0A2540] hover:bg-slate-800 text-white font-mono text-xs font-bold uppercase tracking-wider cursor-pointer flex items-center justify-center gap-1.5 transition-colors shrink-0"
        >
          <Plus className="w-3.5 h-3.5" /> Add Task Entry
        </button>
      </div>

      {/* 4. TASK LOG ENTRIES LIST */}
      <div className="space-y-3.5">
        {filteredTasks.length === 0 ? (
          <div className="bg-white border border-slate-200 p-8 text-center text-slate-500 font-mono text-xs">
            <Info className="w-6 h-6 text-slate-400 mx-auto mb-2" />
            <div className="font-bold text-slate-700 text-sm">No tasks found matching your filter criteria</div>
            <p className="text-slate-500 mt-1 max-w-md mx-auto">
              There are no tasks logged in this phase matching your active search or date selection. Log a new task to continue training documentation.
            </p>
            <button
              onClick={() => handleOpenCreateModal()}
              className="mt-3 px-3 py-1.5 bg-[#00A86B] text-white font-bold uppercase tracking-wider inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Log First Task for this Rotation
            </button>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const statusConfig = getStatusBadge(task.status);
            const StatusIcon = statusConfig.icon;

            return (
              <div
                key={task.id}
                className="bg-white border border-slate-200 p-5 shadow-xs hover:shadow-md transition-shadow relative"
              >
                {/* Status Color Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase border ${statusConfig.bg}`}>
                      <StatusIcon className="w-3 h-3" />
                      {statusConfig.label}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5">
                      📅 {task.date}
                    </span>
                    {task.hoursSpent && (
                      <span className="text-[10px] font-mono text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5">
                        ⏱️ {task.hoursSpent} Hours
                      </span>
                    )}
                    {task.location && (
                      <span className="text-[10px] font-mono text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5">
                        📍 {task.location}
                      </span>
                    )}
                    <span className="text-[10px] font-mono font-bold text-[#0A2540] bg-blue-50 border border-blue-200 px-2 py-0.5">
                      {task.trbReference || "STCW TRB"}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 font-mono text-xs">
                    <button
                      onClick={() => handleQuickApprove(task)}
                      className={`px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider cursor-pointer border flex items-center gap-1 transition-colors ${
                        task.status === "Approved by Officer"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100"
                          : "bg-slate-100 text-slate-700 border-slate-300 hover:bg-[#00A86B] hover:text-white hover:border-[#00A86B]"
                      }`}
                      title={task.status === "Approved by Officer" ? "Click to revoke approval" : "Approve and endorse this task as Officer"}
                    >
                      <Check className="w-3 h-3" />
                      {task.status === "Approved by Officer" ? "Certified" : "Endorse & Approve"}
                    </button>

                    <button
                      onClick={() => handleOpenEditModal(task)}
                      className="p-1 text-slate-500 hover:text-[#0A2540] hover:bg-slate-100 transition-colors"
                      title="Edit task log"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Delete task log"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Task Title */}
                <h4 className="text-sm md:text-base font-extrabold text-[#0A2540] leading-snug">
                  {task.title}
                </h4>

                {/* Descriptions Grid: Task Performed & Assist Duties */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mt-3 text-xs">
                  {/* Task Description */}
                  <div className="bg-slate-50/90 border border-slate-200/80 p-3">
                    <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block mb-1">
                      Shipboard Task Details Performed:
                    </span>
                    <p className="text-slate-700 leading-relaxed font-sans">
                      {task.description}
                    </p>
                  </div>

                  {/* Assist Description */}
                  <div className="bg-blue-50/40 border border-blue-200/60 p-3">
                    <span className="text-[10px] font-mono uppercase font-bold text-blue-600 block mb-1">
                      Assisted Duties under Officer / Mentor Supervision:
                    </span>
                    <p className="text-slate-800 leading-relaxed font-sans">
                      {task.assistDescription}
                    </p>
                  </div>
                </div>

                {/* Attachment & Documentation Container */}
                {task.documentationUrl && (
                  <div className="mt-3 p-2.5 bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {task.documentationType === "document" || task.documentationType === "checklist" ? (
                        <div className="w-8 h-8 bg-blue-100 border border-blue-300 text-blue-700 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                      ) : (
                        <img 
                          src={task.documentationUrl} 
                          alt="Evidence Attachment" 
                          className="w-10 h-10 object-cover border border-slate-300 shrink-0" 
                        />
                      )}
                      <div className="min-w-0">
                        <span className="text-[9px] font-mono uppercase font-bold text-slate-400 block">
                          Documentation Evidence Uploaded
                        </span>
                        <span className="text-xs font-mono font-bold text-[#0A2540] truncate block">
                          {task.documentationName || "Training_Evidence_Attachment.jpg"}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => setViewingAttachment({ url: task.documentationUrl!, name: task.documentationName || "Attachment" })}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 text-[#0A2540] border border-slate-300 font-mono text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                    >
                      <Eye className="w-3 h-3" /> View Evidence
                    </button>
                  </div>
                )}

                {/* Officer Endorsement Stamp Ribbon */}
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] font-mono text-slate-500">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Mentor:</span>
                    <span className="font-bold text-[#0A2540]">{task.officerMentor || currentPhaseInfo.mentorTitle}</span>
                    {task.officerRemarks && (
                      <span className="text-slate-600 italic border-l border-slate-200 pl-2">
                        &ldquo;{task.officerRemarks}&rdquo;
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <span>Cadet: <strong>{task.cadetName}</strong></span>
                    <span>·</span>
                    <span>{task.cadetId}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 5. INTEGRATED PHASE CALENDAR (Directly below task log list) */}
      <div className="bg-white border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 font-mono text-xs">
              <CalendarIcon className="w-4 h-4 text-[#0A2540]" />
              <h3 className="text-sm font-black text-[#0A2540] uppercase tracking-wider">
                Integrated Phase Calendar View
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Scheduled tasks, daily seamanship duties, and certified milestones for <strong>{currentPhaseInfo.name}</strong>.
            </p>
          </div>

          {/* Month Navigation Controls */}
          <div className="flex items-center gap-2 font-mono text-xs">
            <button
              onClick={() => {
                const prev = new Date(calendarDate);
                prev.setMonth(prev.getMonth() - 1);
                setCalendarDate(prev);
              }}
              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 cursor-pointer transition-colors"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 font-bold text-[#0A2540] bg-slate-50 border border-slate-200 text-xs min-w-[130px] text-center">
              {currentMonthName}
            </span>
            <button
              onClick={() => {
                const next = new Date(calendarDate);
                next.setMonth(next.getMonth() + 1);
                setCalendarDate(next);
              }}
              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 cursor-pointer transition-colors"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div>
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 text-center font-mono text-[10px] font-bold uppercase text-slate-500 pb-1 mb-1 border-b border-slate-100">
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
            <div>Sun</div>
          </div>

          {/* Calendar day cells */}
          <div className="grid grid-cols-7 gap-1 font-mono text-xs">
            {calendarDays.map((day, idx) => {
              const dayTasks = tasksByDateMap[day.dateStr] || [];
              const isSelected = selectedCalendarDateStr === day.dateStr;
              const hasTasks = dayTasks.length > 0;
              const isToday = day.dateStr === new Date().toISOString().split("T")[0];

              return (
                <div
                  key={idx}
                  onClick={() => {
                    if (isSelected) {
                      setSelectedCalendarDateStr(null);
                    } else {
                      setSelectedCalendarDateStr(day.dateStr);
                    }
                  }}
                  className={`min-h-[74px] p-1.5 border transition-all cursor-pointer flex flex-col justify-between relative ${
                    isSelected
                      ? "bg-blue-50 border-blue-500 ring-2 ring-blue-300 z-10"
                      : day.isCurrentMonth
                      ? "bg-white border-slate-200 hover:bg-slate-50"
                      : "bg-slate-50/60 border-slate-100 text-slate-300"
                  }`}
                >
                  {/* Day Number & Today indicator */}
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-bold ${
                      isToday
                        ? "w-4 h-4 bg-[#0A2540] text-white rounded-full flex items-center justify-center text-[9px]"
                        : day.isCurrentMonth ? "text-slate-800" : "text-slate-400"
                    }`}>
                      {day.dayNumber}
                    </span>
                    {hasTasks && (
                      <span className="text-[9px] px-1 py-0.2 bg-[#0A2540] text-white font-bold rounded-xs">
                        {dayTasks.length}
                      </span>
                    )}
                  </div>

                  {/* Task Chips inside calendar day */}
                  <div className="space-y-0.5 mt-1 overflow-hidden">
                    {dayTasks.slice(0, 2).map((t) => {
                      const isApproved = t.status === "Approved by Officer";
                      return (
                        <div
                          key={t.id}
                          className={`text-[8px] truncate px-1 py-0.2 rounded-xs border font-medium ${
                            isApproved
                              ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                              : "bg-blue-50 text-blue-800 border-blue-200"
                          }`}
                          title={`${t.title} (${t.status})`}
                        >
                          {t.title}
                        </div>
                      );
                    })}
                    {dayTasks.length > 2 && (
                      <span className="text-[8px] text-slate-500 block">
                        +{dayTasks.length - 2} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Calendar Footer Info & Date Filter Reset */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-[11px] font-mono text-slate-500 border-t border-slate-100">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-emerald-500 inline-block" /> Approved Task
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-blue-500 inline-block" /> Completed / In Progress
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-[#0A2540] inline-block" /> Today
            </span>
          </div>

          <div className="flex items-center gap-2">
            {selectedCalendarDateStr ? (
              <button
                onClick={() => setSelectedCalendarDateStr(null)}
                className="text-xs text-blue-600 hover:underline font-bold"
              >
                Clear Date Filter ({selectedCalendarDateStr})
              </button>
            ) : (
              <span className="text-[10px] text-slate-400">
                Click any calendar date to inspect or log tasks for that day
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 6. TASK ENTRY FORM MODAL (Add / Edit Task) */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-300 shadow-2xl w-full max-w-2xl my-8 relative overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="bg-[#0A2540] text-white p-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 bg-[#00A86B] flex items-center justify-center font-bold text-white text-xs">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider font-mono">
                      {editingTask ? "Edit Sea Project Task Log" : "Log Sea Project Task & TRB Module"}
                    </h3>
                    <p className="text-[10px] text-slate-300 font-mono">
                      {currentPhaseInfo.name} · STCW Competency Record
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-300 hover:text-white p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleSaveTask} className="p-6 space-y-4 text-xs font-mono max-h-[75vh] overflow-y-auto">
                {formError && (
                  <div className="p-3 bg-red-50 border border-red-300 text-red-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Task Title */}
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                    Task Title / Module Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. Lifeboat Engine Forward/Reverse Run & Sprinkler Test"
                    className="w-full bg-slate-50 border border-slate-300 p-2 text-slate-900 focus:outline-none focus:border-[#0A2540]"
                  />
                </div>

                {/* Task Description */}
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                    Task Description (Detailed Entry of Shipboard Tasks Performed) *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Describe step-by-step what tasks and operations were completed aboard the vessel..."
                    className="w-full bg-slate-50 border border-slate-300 p-2 text-slate-900 focus:outline-none focus:border-[#0A2540] font-sans"
                  />
                </div>

                {/* Assist Description */}
                <div>
                  <label className="block text-[11px] font-bold uppercase text-blue-700 mb-1">
                    Assist Description (Specific Duties Assisted with Under Supervision) *
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={formAssistDescription}
                    onChange={(e) => setFormAssistDescription(e.target.value)}
                    placeholder="Specify the exact duties and steps you carried out assisting the officer or bosun..."
                    className="w-full bg-blue-50/40 border border-blue-300 p-2 text-slate-900 focus:outline-none focus:border-[#0A2540] font-sans"
                  />
                </div>

                {/* Grid: Date, Status, Hours, Location */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                      Task Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 p-1.5 text-slate-900 focus:outline-none focus:border-[#0A2540]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                      Status *
                    </label>
                    <select
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value as CadetTaskStatus)}
                      className="w-full bg-slate-50 border border-slate-300 p-1.5 text-slate-900 focus:outline-none focus:border-[#0A2540] cursor-pointer"
                    >
                      <option value="Pending Review">Pending Review</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                      <option value="Approved by Officer">Approved by Officer</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                      Sea Hours Spent
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      max="24"
                      value={formHours}
                      onChange={(e) => setFormHours(parseFloat(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-300 p-1.5 text-slate-900 focus:outline-none focus:border-[#0A2540]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                      Ship Location
                    </label>
                    <input
                      type="text"
                      value={formLocation}
                      onChange={(e) => setFormLocation(e.target.value)}
                      placeholder="e.g. Forecastle, Bridge"
                      className="w-full bg-slate-50 border border-slate-300 p-1.5 text-slate-900 focus:outline-none focus:border-[#0A2540]"
                    />
                  </div>
                </div>

                {/* Documentation Attachment Container */}
                <div className="border border-dashed border-slate-300 p-3 bg-slate-50/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-bold uppercase text-slate-700 flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-[#0A2540]" />
                      Documentation Upload (Photo Evidence / Deck Log Scans / Checklists)
                    </label>
                    {formDocUrl && (
                      <button
                        type="button"
                        onClick={() => { setFormDocUrl(""); setFormDocName(""); }}
                        className="text-[10px] text-red-600 hover:underline"
                      >
                        Remove Attachment
                      </button>
                    )}
                  </div>

                  {formDocUrl ? (
                    <div className="flex items-center gap-3 p-2 bg-white border border-slate-200">
                      <img src={formDocUrl} alt="Preview" className="w-12 h-12 object-cover border border-slate-200" />
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] font-bold text-[#0A2540] block truncate">
                          {formDocName || "Attachment_Evidence.jpg"}
                        </span>
                        <span className="text-[9px] text-emerald-600 block">
                          Ready for submission
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex flex-col sm:flex-row items-center gap-2">
                        <label className="flex-1 w-full py-2 bg-white border border-slate-300 text-slate-700 text-center font-bold text-xs uppercase cursor-pointer hover:bg-slate-100 flex items-center justify-center gap-2">
                          <Upload className="w-3.5 h-3.5 text-slate-500" />
                          <span>Choose Photo / PDF File</span>
                          <input type="file" accept="image/*,.pdf" onChange={handleFileUpload} className="hidden" />
                        </label>
                      </div>

                      {/* Quick Sample Maritime Evidence buttons */}
                      <div className="mt-2 pt-2 border-t border-slate-200/80">
                        <span className="text-[9px] text-slate-400 block mb-1">
                          Or select standard maritime sample evidence:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {SAMPLE_ATTACHMENTS.map((att, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => handleSelectSampleAttachment(att)}
                              className="px-2 py-0.5 bg-white border border-slate-300 text-slate-600 text-[9px] hover:border-[#0A2540] hover:text-[#0A2540] transition-colors cursor-pointer"
                            >
                              + {att.name.slice(0, 22)}...
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Officer Mentor & Remarks */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                      Supervising Officer / Mentor Name
                    </label>
                    <input
                      type="text"
                      value={formOfficerMentor}
                      onChange={(e) => setFormOfficerMentor(e.target.value)}
                      placeholder={currentPhaseInfo.mentorTitle}
                      className="w-full bg-slate-50 border border-slate-300 p-1.5 text-slate-900 focus:outline-none focus:border-[#0A2540]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                      STCW Competency Reference
                    </label>
                    <input
                      type="text"
                      value={formTrbRef}
                      onChange={(e) => setFormTrbRef(e.target.value)}
                      placeholder="e.g. STCW II/1 Task 1.1"
                      className="w-full bg-slate-50 border border-slate-300 p-1.5 text-slate-900 focus:outline-none focus:border-[#0A2540]"
                    />
                  </div>
                </div>

                {/* Officer Remarks */}
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                    Officer Endorsement Remarks (Optional)
                  </label>
                  <input
                    type="text"
                    value={formOfficerRemarks}
                    onChange={(e) => setFormOfficerRemarks(e.target.value)}
                    placeholder="e.g. Demonstrated satisfactory compliance with safety protocols."
                    className="w-full bg-slate-50 border border-slate-300 p-1.5 text-slate-900 focus:outline-none focus:border-[#0A2540]"
                  />
                </div>

                {/* Form Buttons */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold uppercase cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#00A86B] hover:bg-emerald-600 text-white font-bold uppercase tracking-wider cursor-pointer shadow-sm flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    {editingTask ? "Save Task Changes" : "Submit Sea Project Log"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 7. EVIDENCE ATTACHMENT VIEWER MODAL */}
      <AnimatePresence>
        {viewingAttachment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-300 shadow-2xl max-w-3xl w-full relative overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-[#0A2540] text-white p-3.5 flex items-center justify-between font-mono text-xs">
                <div className="flex items-center gap-2">
                  <Paperclip className="w-4 h-4 text-[#00A86B]" />
                  <span className="font-bold truncate max-w-lg">{viewingAttachment.name}</span>
                </div>
                <button
                  onClick={() => setViewingAttachment(null)}
                  className="text-slate-300 hover:text-white p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4 bg-slate-100 flex items-center justify-center max-h-[70vh] overflow-auto">
                <img
                  src={viewingAttachment.url}
                  alt={viewingAttachment.name}
                  className="max-w-full max-h-[60vh] object-contain border border-slate-300 shadow-sm"
                />
              </div>
              <div className="p-3 bg-white border-t border-slate-200 flex items-center justify-between font-mono text-xs text-slate-500">
                <span>STCW 2010 Cadet Training Photo Evidence</span>
                <button
                  onClick={() => setViewingAttachment(null)}
                  className="px-3 py-1 bg-[#0A2540] text-white font-bold uppercase"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
