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
  Download, 
  Info, 
  UploadCloud, 
  AlertTriangle, 
  FileCheck,
  Save,
  RotateCcw,
  FileSpreadsheet
} from "lucide-react";
import { exportCadetTasksBackup } from "../utils/excelBackup";
import { 
  CadetRotationPhase, 
  CadetTaskItem, 
  CadetTaskStatus, 
  ROTATION_PHASES,
  getDynamicPhaseDates 
} from "../types/cadetTraining";
import { 
  getStoredCadetTasks, 
  saveCadetTasksLocally, 
  syncCadetTaskToFirestore, 
  deleteCadetTaskFromFirestore, 
  subscribeToFirestoreCadetTasks 
} from "../utils/cadetFirestoreSync";
import { 
  getStoredUserProfile, 
  UserProfile,
  getRemainingContractDays,
  calculateSignOffDate 
} from "../types/userProfile";
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
  const { userProfile: fbUserProfile } = useFirebase();
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

  // Pending Changes State for Top-Right "Apply Changes" Action
  const [hasPendingChanges, setHasPendingChanges] = useState<boolean>(false);
  const [isApplyingChanges, setIsApplyingChanges] = useState<boolean>(false);
  const [pendingDeletions, setPendingDeletions] = useState<string[]>([]);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | CadetTaskStatus>("ALL");

  // Modal State for Task Entry Form (Add/Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<CadetTaskItem | null>(null);

  // Modal State for Delete Confirmation Modal
  const [taskToDelete, setTaskToDelete] = useState<CadetTaskItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  // Dynamic Contract & Phase Dates
  const currentSignOn = currentUser.signOnDate || "2026-01-05";
  const currentSignOff = currentUser.signOffDate || "2027-01-05";
  const currentDurationMonths = currentUser.contractDurationMonths || 12;
  const currentContractDays = getRemainingContractDays(currentSignOff, undefined, currentSignOn);
  const currentPhaseDates = useMemo(
    () => getDynamicPhaseDates(activePhase, currentSignOn, currentDurationMonths), 
    [activePhase, currentSignOn, currentDurationMonths]
  );

  // Update calendar month dynamically when active phase or sign-on date changes
  useEffect(() => {
    setCalendarDate(currentPhaseDates.calendarInitialDate);
    setSelectedCalendarDateStr(null);
  }, [currentPhaseDates]);

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
    // Default task date within the active rotation phase window
    const defaultDate = specificDate || currentPhaseDates.startDateStr;
    setFormDate(defaultDate);
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
      showToast("Task updated locally. Click [Apply / Save Changes] to commit.");
    } else {
      updatedTasks = [newTaskItem, ...tasks];
      showToast("New sea project task added. Click [Apply / Save Changes] to commit.");
    }

    setTasks(updatedTasks);
    saveCadetTasksLocally(updatedTasks);
    setHasPendingChanges(true);
    setIsModalOpen(false);

    // Immediate background push to Firestore as well
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
    setHasPendingChanges(true);
    syncCadetTaskToFirestore(updatedTask).catch(() => {});
    showToast(isApproved ? "Status reverted to Completed." : "Task successfully endorsed and approved by officer.");
  };

  // Open Delete Confirmation Modal
  const handleOpenDeleteModal = (task: CadetTaskItem) => {
    setTaskToDelete(task);
  };

  // Confirm Delete Task Handler
  const handleConfirmDelete = async () => {
    if (!taskToDelete) return;
    setIsDeleting(true);

    try {
      const taskId = taskToDelete.id;
      const updated = tasks.filter(t => t.id !== taskId);
      setTasks(updated);
      saveCadetTasksLocally(updated);
      setPendingDeletions(prev => [...prev, taskId]);
      setHasPendingChanges(true);

      // Delete from Cloud Firestore
      await deleteCadetTaskFromFirestore(taskId);

      showToast(`Task "${taskToDelete.title.slice(0, 28)}..." deleted from Training Record Book.`);
      setTaskToDelete(null);
    } catch (err: any) {
      console.error("Failed to delete task from Firestore:", err);
      showToast("Error deleting task from Cloud Firestore.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Top-Right "Apply / Save Changes" Global Action
  const handleApplyChanges = async () => {
    setIsApplyingChanges(true);
    try {
      // 1. Process any pending deletions
      if (pendingDeletions.length > 0) {
        await Promise.all(pendingDeletions.map(id => deleteCadetTaskFromFirestore(id)));
        setPendingDeletions([]);
      }

      // 2. Commit all active tasks to Cloud Firestore
      await Promise.all(tasks.map(task => syncCadetTaskToFirestore(task)));

      // 3. Save locally
      saveCadetTasksLocally(tasks);

      setHasPendingChanges(false);
      showToast("✓ All Cadet Tasks & TRB changes successfully committed to Cloud Firestore!");
    } catch (err: any) {
      console.error("Apply changes error:", err);
      showToast("Failed to commit changes to Cloud Firestore. Please retry.");
    } finally {
      setIsApplyingChanges(false);
    }
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
          bg: "bg-emerald-950/80 text-emerald-300 border-emerald-500/80",
          dot: "bg-emerald-400",
          icon: CheckCircle2,
          label: "Approved by Officer"
        };
      case "Completed":
        return {
          bg: "bg-blue-950/80 text-blue-300 border-blue-500/80",
          dot: "bg-blue-400",
          icon: Check,
          label: "Completed"
        };
      case "In Progress":
        return {
          bg: "bg-amber-950/80 text-amber-300 border-amber-500/80",
          dot: "bg-amber-400",
          icon: Clock,
          label: "In Progress"
        };
      case "Pending Review":
      default:
        return {
          bg: "bg-slate-800/90 text-slate-300 border-slate-600",
          dot: "bg-slate-400",
          icon: AlertCircle,
          label: "Pending Review"
        };
    }
  };

  const currentPhaseInfo = ROTATION_PHASES[activePhase];

  return (
    <div className="space-y-6 text-slate-100 font-sans selection:bg-[#00A86B] selection:text-white">
      {/* Toast Alert */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-5 right-5 z-50 bg-[#0F172A] border-2 border-[#00A86B] text-white px-5 py-3 shadow-2xl font-mono text-xs flex items-center gap-3 backdrop-blur-md"
          >
            <CheckCircle2 className="w-5 h-5 text-[#00A86B] shrink-0 animate-pulse" />
            <span className="font-bold tracking-wide">{toastMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. TOP HEADER & DYNAMIC RANK-BASED ACCESS BANNER WITH TOP-RIGHT "APPLY CHANGES" */}
      <div className="bg-[#0F172A] border border-[#334155] p-5 shadow-xl relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 relative z-10">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-2.5 py-0.5 bg-[#1E293B] text-slate-200 text-[10px] font-mono font-bold uppercase tracking-wider border border-slate-700">
                STCW 2010 SECTION A-II/1
              </span>
              <span className="px-2.5 py-0.5 bg-emerald-950/80 text-emerald-300 text-[10px] font-mono font-bold uppercase border border-emerald-500/50 flex items-center gap-1.5">
                <FileCheck className="w-3.5 h-3.5 text-emerald-400" /> Training Record Book (TRB)
              </span>
              {hasPendingChanges && (
                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold uppercase border border-amber-400/60 flex items-center gap-1 animate-pulse">
                  <AlertCircle className="w-3 h-3" /> Unsaved Changes
                </span>
              )}
            </div>
            <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-wide mt-2 flex flex-wrap items-center gap-2">
              <span>Cadet Report &amp; Task Management</span>
              <span className="text-xs font-mono font-normal text-emerald-400 lowercase">
                (Deck Cadet Sea Project Documentation)
              </span>
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
              Official shipboard structured training matrix, sea project tasks, and continuous watchkeeping competency log endorsed by supervising shipboard officers under IMO Model Course 7.03.
            </p>
          </div>

          {/* Dynamic Rank Access Card & Top-Right Apply Changes */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Rank Status Card */}
            <div className="bg-[#1E293B] border border-[#334155] p-3.5 flex items-center justify-between gap-4 font-mono text-xs min-w-[270px] shadow-md">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-sm flex items-center justify-center font-bold text-white shadow-md ${
                  isDeckCadet ? "bg-[#00A86B]" : "bg-[#0284C7]"
                }`}>
                  {isDeckCadet ? <Award className="w-5 h-5 text-white" /> : <User className="w-5 h-5 text-white" />}
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">
                    {isDeckCadet ? "ACTIVE CADET PROFILE" : "SUPERVISING OFFICER MODE"}
                  </span>
                  <span className="font-extrabold text-white text-xs block truncate max-w-[130px]">
                    {currentUser.fullName || "Mateo Rossi"}
                  </span>
                  <span className="text-[10px] text-emerald-400 block">
                    {currentUser.rank || "Deck Cadet"} · {currentUser.seafarerId || "CDC ACTIVE"}
                  </span>
                </div>
              </div>

              <div className="text-right border-l border-slate-700 pl-3">
                <span className="text-[9px] text-slate-400 uppercase block font-semibold">TRB Certified</span>
                <span className="text-base font-black text-[#00A86B] block">
                  {overallStats.percent}%
                </span>
                <span className="text-[9px] text-slate-400">
                  {overallStats.approved}/{overallStats.total} Tasks
                </span>
              </div>
            </div>

            {/* TOP-RIGHT PROMINENT "APPLY / SAVE CHANGES" BUTTON */}
            <button
              onClick={handleApplyChanges}
              disabled={isApplyingChanges}
              className={`px-4 py-3 font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg transition-all border ${
                hasPendingChanges
                  ? "bg-gradient-to-r from-[#00A86B] to-emerald-600 hover:from-emerald-500 hover:to-emerald-700 text-white border-emerald-300 ring-2 ring-emerald-400/80 shadow-emerald-900/50 animate-pulse"
                  : "bg-[#1E293B] hover:bg-slate-700 text-slate-200 border-[#334155]"
              }`}
              title="Commit all additions, edits, and deletions to Cloud Firestore"
            >
              {isApplyingChanges ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Committing...</span>
                </>
              ) : hasPendingChanges ? (
                <>
                  <UploadCloud className="w-4 h-4 text-white" />
                  <span>Apply / Save Changes</span>
                  <span className="w-2 h-2 rounded-full bg-white animate-ping ml-0.5" />
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 text-[#00A86B]" />
                  <span>All Changes Saved</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Global Progress Bar & Fast Action Row */}
        <div className="mt-5 pt-4 border-t border-[#334155] flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs font-mono">
          <div className="flex-1 max-w-xl">
            <div className="flex items-center justify-between text-[11px] mb-1.5 font-bold">
              <span className="text-slate-300">Overall 12-Month Cadet Sea Training Progress</span>
              <span className="text-emerald-400 font-extrabold">{overallStats.approved} of {overallStats.total} Tasks Certified ({overallStats.totalHours} Sea Hours)</span>
            </div>
            <div className="w-full h-3 bg-[#1E293B] border border-[#334155] overflow-hidden p-0.5">
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-[#0284C7] transition-all duration-500 shadow-sm"
                style={{ width: `${overallStats.percent}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => handleOpenCreateModal()}
              className="px-4 py-2 bg-[#00A86B] hover:bg-emerald-600 text-white font-mono text-xs font-bold uppercase tracking-wider cursor-pointer shadow-md flex items-center gap-2 transition-colors border border-emerald-400/60"
            >
              <Plus className="w-4 h-4" /> Log Task
            </button>
            <button
              onClick={() => {
                const fname = exportCadetTasksBackup();
                showToast(`✓ Cadet Report & Task data successfully backed up to Excel (${fname})`);
              }}
              className="px-4 py-2 bg-[#0F172A] hover:bg-[#1E293B] text-emerald-400 font-mono text-xs font-bold uppercase tracking-wider border border-emerald-500/60 cursor-pointer flex items-center gap-2 transition-colors"
              title="Backup STCW TRB Task Log & Rotation Summary to Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> Backup to Excel
            </button>
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-[#1E293B] hover:bg-slate-700 text-slate-200 font-mono text-xs font-bold uppercase tracking-wider border border-[#334155] cursor-pointer flex items-center gap-2 transition-colors"
              title="Print Cadet Training Record Book Report"
            >
              <Download className="w-4 h-4 text-slate-300" /> TRB Report
            </button>
          </div>
        </div>
      </div>

      {/* 2. ROTATION SUB-TABS (4-PHASE ONBOARD TRAINING) */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-mono text-xs">
          {(["bosun_assist", "third_officer_assist", "second_officer_assist", "chief_officer_assist"] as CadetRotationPhase[]).map((phaseKey) => {
            const phase = ROTATION_PHASES[phaseKey];
            const phaseDynamic = getDynamicPhaseDates(phaseKey, currentSignOn, currentDurationMonths);
            const isActive = activePhase === phaseKey;
            const phaseCount = tasks.filter(t => t.phase === phaseKey).length;
            const approvedCount = tasks.filter(t => t.phase === phaseKey && t.status === "Approved by Officer").length;

            return (
              <button
                key={phaseKey}
                onClick={() => setActivePhase(phaseKey)}
                className={`p-3.5 text-left border transition-all cursor-pointer relative shadow-md ${
                  isActive
                    ? "bg-[#0B1E38] text-white border-[#00A86B] ring-2 ring-[#00A86B]/60 shadow-lg"
                    : "bg-[#1E293B] text-slate-200 border-[#334155] hover:bg-[#253347] hover:border-slate-500"
                }`}
              >
                {isActive && (
                  <div className="absolute top-0 right-0 w-3 h-3 bg-[#00A86B]" />
                )}
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 border ${
                    isActive 
                      ? "bg-[#00A86B] text-white border-[#00A86B]" 
                      : "bg-[#0F172A] text-slate-300 border-slate-700"
                  }`}>
                    {phaseDynamic.periodLabel || phase.period}
                  </span>
                  <span className={`text-[11px] font-bold ${isActive ? "text-emerald-400" : "text-slate-400"}`}>
                    {approvedCount}/{phaseCount} Certified
                  </span>
                </div>
                <div className="font-extrabold uppercase text-xs sm:text-sm tracking-wide text-white">
                  {phase.name.split(" (")[0]}
                </div>
                <div className={`text-[10px] mt-1 font-mono font-bold ${isActive ? "text-emerald-300" : "text-cyan-400"}`}>
                  {phaseDynamic.dateRangeLabel}
                </div>
                <div className={`text-[9px] mt-1 line-clamp-1 ${isActive ? "text-emerald-200/80" : "text-slate-400"}`}>
                  Mentor: {phase.mentorTitle}
                </div>
              </button>
            );
          })}
        </div>

        {/* Phase Details & Milestones Header Card */}
        <div className="bg-[#0F172A] border border-[#334155] p-5 shadow-lg space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#334155]">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 bg-[#00A86B] rounded-full animate-pulse" />
                <h3 className="text-base font-black text-white uppercase tracking-wider font-mono">
                  {currentPhaseInfo.name} · Sea Training Syllabus
                </h3>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-mono">
                <span className="px-2 py-0.5 bg-emerald-950/80 text-emerald-300 border border-emerald-500/60 font-bold">
                  Rotation Window: {currentPhaseDates.dateRangeLabel}
                </span>
                <span className="text-slate-400 text-[11px]">
                  ({currentPhaseDates.periodLabel} · Contract Duration: {currentDurationMonths} Months · Sign-On: {currentSignOn})
                </span>
              </div>
              <p className="text-xs text-slate-200 mt-2 leading-relaxed">
                <strong className="text-emerald-400">Focus Area:</strong> {currentPhaseInfo.focusArea}
              </p>
              <p className="text-[11px] font-mono text-slate-400 mt-1">
                Competency Regulation: <strong className="text-cyan-300">{currentPhaseInfo.stcwReference}</strong> · Supervising Officer: <strong className="text-white">{currentPhaseInfo.mentorTitle}</strong>
              </p>
            </div>

            <div className="flex items-center gap-2.5 font-mono text-xs">
              <div className="px-3.5 py-2 bg-[#1E293B] border border-[#334155] text-center min-w-[70px]">
                <span className="text-[9px] text-slate-400 block uppercase">Phase Tasks</span>
                <span className="font-extrabold text-white text-sm">{phaseStats.total}</span>
              </div>
              <div className="px-3.5 py-2 bg-emerald-950/70 border border-emerald-600/60 text-center min-w-[70px]">
                <span className="text-[9px] text-emerald-400 block uppercase">Approved</span>
                <span className="font-extrabold text-emerald-300 text-sm">{phaseStats.approved}</span>
              </div>
              <div className="px-3.5 py-2 bg-blue-950/70 border border-blue-600/60 text-center min-w-[70px]">
                <span className="text-[9px] text-blue-300 block uppercase">Hours Logged</span>
                <span className="font-extrabold text-blue-200 text-sm">{phaseStats.totalHours}h</span>
              </div>
            </div>
          </div>

          {/* 3-Month Rotation Milestones */}
          <div>
            <span className="text-[11px] font-mono uppercase font-bold text-slate-300 block mb-2.5 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-emerald-400" />
              Mandatory Phase Milestones (STCW TRB Sign-Off Targets):
            </span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {currentPhaseInfo.milestones.map((m, idx) => (
                <div key={idx} className="p-3 bg-[#1E293B] border border-[#334155] text-xs shadow-sm">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-mono font-bold text-emerald-400 bg-[#0F172A] px-2 py-0.5 border border-slate-700">
                      {m.dueMonth}
                    </span>
                    <span className="text-[9px] font-mono text-cyan-300 font-bold uppercase tracking-wider">
                      STCW Required
                    </span>
                  </div>
                  <h4 className="font-bold text-white text-xs leading-snug">{m.title}</h4>
                  <p className="text-[11px] text-slate-300 mt-1.5 leading-relaxed font-sans">{m.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3. TASK SEARCH, FILTERS & ACTION BAR */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 font-mono text-xs bg-[#0F172A] p-3 border border-[#334155]">
        <div className="flex flex-1 items-center gap-2.5">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search module title, task details, assist duties, officer..."
              className="w-full bg-[#1E293B] border border-[#334155] pl-9 pr-8 py-2 text-white text-xs placeholder-slate-400 focus:outline-none focus:border-emerald-400"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
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
              className="bg-[#1E293B] border border-[#334155] py-2 px-3 text-xs text-white focus:outline-none focus:border-emerald-400 cursor-pointer"
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
          <div className="flex items-center gap-2 px-3 py-1.5 bg-cyan-950/80 border border-cyan-500/60 text-cyan-300 text-xs">
            <span>Filtered by Date: <strong>{selectedCalendarDateStr}</strong></span>
            <button
              onClick={() => setSelectedCalendarDateStr(null)}
              className="text-cyan-300 hover:text-white font-bold ml-1"
              title="Clear calendar date filter"
            >
              ✕
            </button>
          </div>
        )}

        <button
          onClick={() => handleOpenCreateModal(selectedCalendarDateStr || undefined)}
          className="px-4 py-2 bg-[#00A86B] hover:bg-emerald-600 text-white font-mono text-xs font-bold uppercase tracking-wider cursor-pointer flex items-center justify-center gap-2 transition-colors shrink-0 shadow-md border border-emerald-400/50"
        >
          <Plus className="w-3.5 h-3.5" /> Add Task Entry
        </button>
      </div>

      {/* 4. TASK LOG ENTRIES LIST (High Contrast Dark Glassmorphic Cards) */}
      <div className="space-y-4">
        {filteredTasks.length === 0 ? (
          <div className="bg-[#0F172A] border border-[#334155] p-10 text-center text-slate-400 font-mono text-xs shadow-lg">
            <Info className="w-8 h-8 text-slate-500 mx-auto mb-3" />
            <div className="font-bold text-white text-sm">No tasks found matching your filter criteria</div>
            <p className="text-slate-400 mt-1 max-w-md mx-auto">
              There are no tasks logged in this phase matching your active search or date selection. Log a new task to continue training documentation.
            </p>
            <button
              onClick={() => handleOpenCreateModal()}
              className="mt-4 px-4 py-2 bg-[#00A86B] text-white font-bold uppercase tracking-wider inline-flex items-center gap-2 cursor-pointer shadow-md"
            >
              <Plus className="w-4 h-4" /> Log First Task for this Rotation
            </button>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const statusConfig = getStatusBadge(task.status);
            const StatusIcon = statusConfig.icon;

            return (
              <div
                key={task.id}
                className="bg-[#0F172A] border border-[#334155] p-5 shadow-lg hover:border-slate-500 transition-all relative overflow-hidden"
              >
                {/* Status Bar & Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 mb-3.5 border-b border-[#334155]">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-mono font-bold uppercase border shadow-sm ${statusConfig.bg}`}>
                      <StatusIcon className="w-3.5 h-3.5" />
                      {statusConfig.label}
                    </span>
                    <span className="text-[11px] font-mono text-slate-200 bg-[#1E293B] border border-[#334155] px-2.5 py-1">
                      📅 {task.date}
                    </span>
                    {task.hoursSpent && (
                      <span className="text-[11px] font-mono text-slate-200 bg-[#1E293B] border border-[#334155] px-2.5 py-1">
                        ⏱️ {task.hoursSpent} Hours
                      </span>
                    )}
                    {task.location && (
                      <span className="text-[11px] font-mono text-slate-200 bg-[#1E293B] border border-[#334155] px-2.5 py-1">
                        📍 {task.location}
                      </span>
                    )}
                    <span className="text-[11px] font-mono font-bold text-cyan-300 bg-[#0B2545] border border-blue-800 px-2.5 py-1">
                      {task.trbReference || "STCW TRB"}
                    </span>
                  </div>

                  {/* Actions: Endorse, Edit, Delete */}
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <button
                      onClick={() => handleQuickApprove(task)}
                      className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider cursor-pointer border flex items-center gap-1.5 transition-all shadow-sm ${
                        task.status === "Approved by Officer"
                          ? "bg-emerald-950 text-emerald-300 border-emerald-500/80 hover:bg-emerald-900"
                          : "bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400"
                      }`}
                      title={task.status === "Approved by Officer" ? "Click to revoke approval" : "Approve and endorse this task as Officer"}
                    >
                      <Check className="w-3.5 h-3.5" />
                      {task.status === "Approved by Officer" ? "Certified" : "Endorse & Approve"}
                    </button>

                    <button
                      onClick={() => handleOpenEditModal(task)}
                      className="p-1.5 bg-[#1E293B] hover:bg-slate-700 text-slate-200 hover:text-white border border-[#334155] transition-colors"
                      title="Edit task log"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    {/* FUNCTIONAL DELETE BUTTON WITH CONFIRMATION MODAL */}
                    <button
                      onClick={() => handleOpenDeleteModal(task)}
                      className="p-1.5 bg-red-950/40 hover:bg-red-900/80 text-red-300 hover:text-white border border-red-800/80 transition-colors cursor-pointer"
                      title="Delete task entry"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Task Title */}
                <h4 className="text-base sm:text-lg font-extrabold text-white leading-snug tracking-wide">
                  {task.title}
                </h4>

                {/* Descriptions Grid: Task Performed & Assist Duties (High Contrast Containers) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3.5 text-xs">
                  {/* Task Description */}
                  <div className="bg-[#152238] border border-[#1E3A5F] p-3.5 shadow-sm">
                    <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block mb-1.5 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                      Shipboard Task Details Performed:
                    </span>
                    <p className="text-slate-100 leading-relaxed font-sans text-xs">
                      {task.description}
                    </p>
                  </div>

                  {/* Assist Description */}
                  <div className="bg-[#0C243B] border border-[#0284C7]/60 p-3.5 shadow-sm">
                    <span className="text-[10px] font-mono uppercase font-bold text-cyan-400 block mb-1.5 flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-cyan-400" />
                      Assisted Duties under Officer / Mentor Supervision:
                    </span>
                    <p className="text-white leading-relaxed font-sans text-xs">
                      {task.assistDescription}
                    </p>
                  </div>
                </div>

                {/* Attachment & Documentation Container */}
                {task.documentationUrl && (
                  <div className="mt-3.5 p-3 bg-[#1E293B] border border-[#334155] flex items-center justify-between gap-3 shadow-inner">
                    <div className="flex items-center gap-3 min-w-0">
                      {task.documentationType === "document" || task.documentationType === "checklist" ? (
                        <div className="w-10 h-10 bg-blue-900/60 border border-blue-500/60 text-blue-300 flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                      ) : (
                        <img 
                          src={task.documentationUrl} 
                          alt="Evidence Attachment" 
                          className="w-12 h-12 object-cover border border-slate-600 shrink-0" 
                        />
                      )}
                      <div className="min-w-0">
                        <span className="text-[9px] font-mono uppercase font-bold text-slate-400 block">
                          Documentation Evidence Uploaded
                        </span>
                        <span className="text-xs font-mono font-bold text-white truncate block">
                          {task.documentationName || "Training_Evidence_Attachment.jpg"}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => setViewingAttachment({ url: task.documentationUrl!, name: task.documentationName || "Attachment" })}
                      className="px-3 py-1.5 bg-[#0F172A] hover:bg-slate-900 text-white border border-slate-600 font-mono text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                    >
                      <Eye className="w-3.5 h-3.5 text-emerald-400" /> View Evidence
                    </button>
                  </div>
                )}

                {/* Officer Endorsement Stamp Ribbon */}
                <div className="mt-3.5 pt-3 border-t border-[#334155] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] font-mono">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-slate-400">Mentor:</span>
                    <span className="font-bold text-emerald-400">{task.officerMentor || currentPhaseInfo.mentorTitle}</span>
                    {task.officerRemarks && (
                      <span className="text-slate-200 italic border-l border-slate-700 pl-2">
                        &ldquo;{task.officerRemarks}&rdquo;
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <span>Cadet: <strong className="text-white">{task.cadetName}</strong></span>
                    <span>·</span>
                    <span className="text-slate-300">{task.cadetId}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 5. INTEGRATED PHASE CALENDAR (High Contrast Container Directly below task log list) */}
      <div className="bg-[#0F172A] border border-[#334155] p-5 shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3.5 border-b border-[#334155]">
          <div>
            <div className="flex flex-wrap items-center gap-2.5 font-mono text-xs">
              <CalendarIcon className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-black text-white uppercase tracking-wider">
                Integrated Phase Calendar View
              </h3>
              <span className="text-[10px] px-2 py-0.5 bg-emerald-950/80 text-emerald-300 border border-emerald-500/50 font-mono font-bold">
                {currentPhaseDates.dateRangeLabel}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Scheduled tasks, daily seamanship duties, and certified milestones for <strong className="text-white">{currentPhaseInfo.name}</strong>.
            </p>
          </div>

          {/* Month Navigation & Rotation Month Quick-Pills */}
          <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
            {/* 3-Month Rotation Quick Jump Pills */}
            <div className="flex items-center gap-1 bg-[#1E293B] p-1 border border-[#334155]">
              {currentPhaseDates.phaseMonths.map((pm, i) => {
                const isSelectedMonth = calendarDate.getFullYear() === pm.date.getFullYear() && calendarDate.getMonth() === pm.date.getMonth();
                return (
                  <button
                    key={i}
                    onClick={() => {
                      setCalendarDate(new Date(pm.date));
                      setSelectedCalendarDateStr(null);
                    }}
                    className={`px-2 py-1 text-[10px] font-mono font-bold uppercase transition-all cursor-pointer ${
                      isSelectedMonth
                        ? "bg-[#00A86B] text-white shadow-xs"
                        : "text-slate-300 hover:text-white hover:bg-slate-700"
                    }`}
                    title={`Jump to Month ${i + 1} (${pm.label})`}
                  >
                    M{i + 1}: {pm.label.split(" ")[0]}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  const prev = new Date(calendarDate);
                  prev.setMonth(prev.getMonth() - 1);
                  setCalendarDate(prev);
                }}
                className="p-2 bg-[#1E293B] hover:bg-slate-700 text-white border border-[#334155] cursor-pointer transition-colors"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3.5 py-1.5 font-bold text-white bg-[#1E293B] border border-[#334155] text-xs min-w-[130px] text-center shadow-inner">
                {currentMonthName}
              </span>
              <button
                onClick={() => {
                  const next = new Date(calendarDate);
                  next.setMonth(next.getMonth() + 1);
                  setCalendarDate(next);
                }}
                className="p-2 bg-[#1E293B] hover:bg-slate-700 text-white border border-[#334155] cursor-pointer transition-colors"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div>
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1.5 text-center font-mono text-[11px] font-extrabold uppercase text-slate-300 pb-2 mb-1 border-b border-[#334155]">
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
            <div>Sun</div>
          </div>

          {/* Calendar day cells */}
          <div className="grid grid-cols-7 gap-1.5 font-mono text-xs">
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
                  className={`min-h-[82px] p-2 border transition-all cursor-pointer flex flex-col justify-between relative shadow-sm ${
                    isSelected
                      ? "bg-[#0B2545] border-cyan-400 ring-2 ring-cyan-400/60 z-10"
                      : day.isCurrentMonth
                      ? "bg-[#1E293B] border-[#334155] hover:bg-[#283548] text-slate-100"
                      : "bg-[#0B1220]/70 border-slate-900/60 text-slate-500"
                  }`}
                >
                  {/* Day Number & Today indicator */}
                  <div className="flex items-center justify-between">
                    <span className={`text-[11px] font-bold ${
                      isToday
                        ? "w-5 h-5 bg-[#00A86B] text-white rounded-full flex items-center justify-center text-[10px] font-black"
                        : day.isCurrentMonth ? "text-white" : "text-slate-500"
                    }`}>
                      {day.dayNumber}
                    </span>
                    {hasTasks && (
                      <span className="text-[10px] px-1.5 py-0.2 bg-[#0284C7] text-white font-extrabold rounded-xs">
                        {dayTasks.length}
                      </span>
                    )}
                  </div>

                  {/* Task Chips inside calendar day */}
                  <div className="space-y-1 mt-1 overflow-hidden">
                    {dayTasks.slice(0, 2).map((t) => {
                      const isApproved = t.status === "Approved by Officer";
                      return (
                        <div
                          key={t.id}
                          className={`text-[9px] truncate px-1.5 py-0.5 rounded-xs border font-medium ${
                            isApproved
                              ? "bg-emerald-950/90 text-emerald-300 border-emerald-500/70"
                              : "bg-blue-950/90 text-blue-300 border-blue-500/70"
                          }`}
                          title={`${t.title} (${t.status})`}
                        >
                          {t.title}
                        </div>
                      );
                    })}
                    {dayTasks.length > 2 && (
                      <span className="text-[9px] text-slate-400 font-bold block">
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
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 text-[11px] font-mono text-slate-300 border-t border-[#334155]">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-emerald-400 inline-block" /> Approved Task
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-blue-400 inline-block" /> Completed / In Progress
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-[#00A86B] inline-block" /> Today
            </span>
          </div>

          <div className="flex items-center gap-2">
            {selectedCalendarDateStr ? (
              <button
                onClick={() => setSelectedCalendarDateStr(null)}
                className="text-xs text-cyan-300 hover:text-white font-bold underline cursor-pointer"
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

      {/* 6. TASK ENTRY FORM MODAL (Add / Edit Task - Dark Glassmorphic Surface) */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0F172A] border border-[#334155] shadow-2xl w-full max-w-2xl my-8 relative overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="bg-[#1E293B] text-white p-4 flex items-center justify-between border-b border-[#334155]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-[#00A86B] flex items-center justify-center font-bold text-white text-xs shadow-md">
                    <FileText className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider font-mono text-white">
                      {editingTask ? "Edit Sea Project Task Log" : "Log Sea Project Task & TRB Module"}
                    </h3>
                    <p className="text-[10px] text-emerald-400 font-mono">
                      {currentPhaseInfo.name} · STCW Competency Record
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-white p-1 cursor-pointer transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleSaveTask} className="p-6 space-y-4 text-xs font-mono max-h-[75vh] overflow-y-auto">
                {formError && (
                  <div className="p-3 bg-red-950/80 border border-red-500/80 text-red-200 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Task Title */}
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-200 mb-1.5">
                    Task Title / Module Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. Lifeboat Engine Forward/Reverse Run & Sprinkler Test"
                    className="w-full bg-[#1E293B] border border-[#334155] p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 shadow-inner"
                  />
                </div>

                {/* Task Description */}
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-200 mb-1.5">
                    Task Description (Detailed Entry of Shipboard Tasks Performed) *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Describe step-by-step what tasks and operations were completed aboard the vessel..."
                    className="w-full bg-[#1E293B] border border-[#334155] p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 font-sans shadow-inner text-xs"
                  />
                </div>

                {/* Assist Description */}
                <div>
                  <label className="block text-[11px] font-bold uppercase text-cyan-400 mb-1.5">
                    Assist Description (Specific Duties Assisted with Under Supervision) *
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={formAssistDescription}
                    onChange={(e) => setFormAssistDescription(e.target.value)}
                    placeholder="Specify the exact duties and steps you carried out assisting the officer or bosun..."
                    className="w-full bg-[#0C243B] border border-[#0284C7]/60 p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-sans shadow-inner text-xs"
                  />
                </div>

                {/* Grid: Date, Status, Hours, Location */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-300 mb-1 flex items-center justify-between">
                      <span>Task Date *</span>
                      <span className="text-[9px] text-emerald-400 font-normal">phase window</span>
                    </label>
                    <input
                      type="date"
                      required
                      min={currentPhaseDates.startDateStr}
                      max={currentPhaseDates.endDateStr}
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className="w-full bg-[#1E293B] border border-[#334155] p-2 text-white focus:outline-none focus:border-emerald-400 font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-300 mb-1">
                      Status *
                    </label>
                    <select
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value as CadetTaskStatus)}
                      className="w-full bg-[#1E293B] border border-[#334155] p-2 text-white focus:outline-none focus:border-emerald-400 cursor-pointer"
                    >
                      <option value="Pending Review">Pending Review</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                      <option value="Approved by Officer">Approved by Officer</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-300 mb-1">
                      Sea Hours Spent
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      max="24"
                      value={formHours}
                      onChange={(e) => setFormHours(parseFloat(e.target.value))}
                      className="w-full bg-[#1E293B] border border-[#334155] p-2 text-white focus:outline-none focus:border-emerald-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-300 mb-1">
                      Ship Location
                    </label>
                    <input
                      type="text"
                      value={formLocation}
                      onChange={(e) => setFormLocation(e.target.value)}
                      placeholder="e.g. Forecastle, Bridge"
                      className="w-full bg-[#1E293B] border border-[#334155] p-2 text-white focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                </div>

                {/* Documentation Attachment Container */}
                <div className="border border-dashed border-[#334155] p-3.5 bg-[#152238] space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-bold uppercase text-slate-200 flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-emerald-400" />
                      Documentation Upload (Photo Evidence / Deck Log Scans / Checklists)
                    </label>
                    {formDocUrl && (
                      <button
                        type="button"
                        onClick={() => { setFormDocUrl(""); setFormDocName(""); }}
                        className="text-[10px] text-red-400 hover:underline cursor-pointer"
                      >
                        Remove Attachment
                      </button>
                    )}
                  </div>

                  {formDocUrl ? (
                    <div className="flex items-center gap-3 p-2 bg-[#1E293B] border border-[#334155]">
                      <img src={formDocUrl} alt="Preview" className="w-12 h-12 object-cover border border-slate-700" />
                      <div className="min-w-0 flex-1">
                        <span className="text-[11px] font-bold text-white block truncate">
                          {formDocName || "Attachment_Evidence.jpg"}
                        </span>
                        <span className="text-[10px] text-emerald-400 block font-semibold">
                          Ready for submission
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex flex-col sm:flex-row items-center gap-2">
                        <label className="flex-1 w-full py-2.5 bg-[#1E293B] border border-[#334155] text-slate-200 text-center font-bold text-xs uppercase cursor-pointer hover:bg-slate-700 flex items-center justify-center gap-2 transition-colors">
                          <Upload className="w-4 h-4 text-emerald-400" />
                          <span>Choose Photo / PDF File</span>
                          <input type="file" accept="image/*,.pdf" onChange={handleFileUpload} className="hidden" />
                        </label>
                      </div>

                      {/* Quick Sample Maritime Evidence buttons */}
                      <div className="mt-2.5 pt-2 border-t border-[#334155]">
                        <span className="text-[10px] text-slate-400 block mb-1">
                          Or select standard maritime sample evidence:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {SAMPLE_ATTACHMENTS.map((att, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => handleSelectSampleAttachment(att)}
                              className="px-2.5 py-1 bg-[#1E293B] border border-[#334155] text-slate-300 text-[10px] hover:border-emerald-400 hover:text-white transition-colors cursor-pointer"
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
                    <label className="block text-[10px] font-bold uppercase text-slate-300 mb-1">
                      Supervising Officer / Mentor Name
                    </label>
                    <input
                      type="text"
                      value={formOfficerMentor}
                      onChange={(e) => setFormOfficerMentor(e.target.value)}
                      placeholder={currentPhaseInfo.mentorTitle}
                      className="w-full bg-[#1E293B] border border-[#334155] p-2 text-white focus:outline-none focus:border-emerald-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-300 mb-1">
                      STCW Competency Reference
                    </label>
                    <input
                      type="text"
                      value={formTrbRef}
                      onChange={(e) => setFormTrbRef(e.target.value)}
                      placeholder="e.g. STCW II/1 Task 1.1"
                      className="w-full bg-[#1E293B] border border-[#334155] p-2 text-white focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                </div>

                {/* Officer Remarks */}
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-300 mb-1">
                    Officer Endorsement Remarks (Optional)
                  </label>
                  <input
                    type="text"
                    value={formOfficerRemarks}
                    onChange={(e) => setFormOfficerRemarks(e.target.value)}
                    placeholder="e.g. Demonstrated satisfactory compliance with safety protocols."
                    className="w-full bg-[#1E293B] border border-[#334155] p-2 text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>

                {/* Form Buttons */}
                <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#334155]">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 bg-[#1E293B] hover:bg-slate-700 text-slate-300 font-bold uppercase cursor-pointer border border-[#334155]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#00A86B] hover:bg-emerald-600 text-white font-bold uppercase tracking-wider cursor-pointer shadow-lg flex items-center gap-2 border border-emerald-400/50"
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

      {/* 7. DELETE CONFIRMATION MODAL (Dedicated React Popup Modal) */}
      <AnimatePresence>
        {taskToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0F172A] border-2 border-red-600/80 shadow-2xl max-w-md w-full relative overflow-hidden font-mono"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-red-950/90 text-white p-4 flex items-center justify-between border-b border-red-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-red-600 flex items-center justify-center text-white shadow-md">
                    <AlertTriangle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-white">
                      Delete Task Entry?
                    </h3>
                    <p className="text-[10px] text-red-300">
                      Training Record Book Removal
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setTaskToDelete(null)}
                  className="text-red-300 hover:text-white p-1 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 space-y-3.5 text-xs text-slate-200">
                <p className="text-slate-300 leading-relaxed font-sans">
                  Are you sure you want to permanently remove this cadet sea project record? This will delete the entry from both state and Cloud Firestore (<code className="text-red-400 font-mono">cadet_tasks</code> collection).
                </p>

                {/* Target Task Summary Card */}
                <div className="p-3 bg-[#1E293B] border border-slate-700 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Task to be deleted:
                  </span>
                  <div className="font-extrabold text-white text-xs">
                    {taskToDelete.title}
                  </div>
                  <div className="text-[10px] text-slate-400 flex items-center gap-2 pt-1">
                    <span>📅 {taskToDelete.date}</span>
                    <span>·</span>
                    <span className="text-emerald-400">{taskToDelete.status}</span>
                  </div>
                </div>

                <div className="p-2.5 bg-red-950/40 border border-red-900/60 text-red-300 text-[11px] flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>This action is permanent and cannot be undone.</span>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="p-4 bg-[#151F32] border-t border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setTaskToDelete(null)}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-[#1E293B] hover:bg-slate-700 text-slate-300 font-bold uppercase text-xs cursor-pointer border border-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold uppercase tracking-wider text-xs cursor-pointer shadow-lg flex items-center gap-1.5 transition-colors border border-red-500"
                >
                  {isDeleting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Confirm Delete</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 8. EVIDENCE ATTACHMENT VIEWER MODAL */}
      <AnimatePresence>
        {viewingAttachment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0F172A] border border-[#334155] shadow-2xl max-w-3xl w-full relative overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-[#1E293B] text-white p-3.5 flex items-center justify-between font-mono text-xs border-b border-[#334155]">
                <div className="flex items-center gap-2">
                  <Paperclip className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold truncate max-w-lg">{viewingAttachment.name}</span>
                </div>
                <button
                  onClick={() => setViewingAttachment(null)}
                  className="text-slate-400 hover:text-white p-1 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-5 bg-[#070D18] flex items-center justify-center max-h-[70vh] overflow-auto">
                <img
                  src={viewingAttachment.url}
                  alt={viewingAttachment.name}
                  className="max-w-full max-h-[60vh] object-contain border border-[#334155] shadow-lg"
                />
              </div>
              <div className="p-3.5 bg-[#1E293B] border-t border-[#334155] flex items-center justify-between font-mono text-xs text-slate-300">
                <span>STCW 2010 Cadet Training Photo Evidence</span>
                <button
                  onClick={() => setViewingAttachment(null)}
                  className="px-4 py-1.5 bg-[#0A2540] hover:bg-slate-700 text-white font-bold uppercase cursor-pointer border border-[#334155]"
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
