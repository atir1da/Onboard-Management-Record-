import { useState } from "react";
import { Download, FileSpreadsheet, CheckCircle2, ChevronUp } from "lucide-react";
import { 
  exportVesselProfileBackup, 
  exportDepartmentsCrewBackup, 
  exportBridgeWatchkeepingBackup, 
  exportDrillsTrainingBackup, 
  exportCadetTasksBackup, 
  exportVoyagePlanningBackup 
} from "../utils/excelBackup";
import { UserProfile } from "../types/userProfile";

export type ModuleTabKey = "vessel" | "departments" | "bridge" | "drills" | "planning" | "cadet_tasks";

interface ExcelBackupButtonProps {
  activeTab: ModuleTabKey;
  vesselName: string;
  imoNumber: string;
  callSign: string;
  flagState: string;
  userProfile?: UserProfile;
  className?: string;
}

const MODULE_TITLES: Record<ModuleTabKey, string> = {
  vessel: "Vessel Profile",
  departments: "Departments & Crew",
  bridge: "Bridge Watchkeeping",
  drills: "Drills & Training",
  planning: "Voyage Planning",
  cadet_tasks: "Cadet Report & Task"
};

export default function ExcelBackupButton({
  activeTab,
  vesselName,
  imoNumber,
  callSign,
  flagState,
  userProfile,
  className = ""
}: ExcelBackupButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);

  const moduleName = MODULE_TITLES[activeTab] || "System";

  const triggerExport = (tabKey: ModuleTabKey) => {
    setIsExporting(true);
    const opts = { vesselName, imoNumber, callSign, flagState, userProfile };

    try {
      let downloadedFilename = "";
      switch (tabKey) {
        case "vessel":
          downloadedFilename = exportVesselProfileBackup(opts);
          break;
        case "departments":
          downloadedFilename = exportDepartmentsCrewBackup(opts);
          break;
        case "bridge":
          downloadedFilename = exportBridgeWatchkeepingBackup(opts);
          break;
        case "drills":
          downloadedFilename = exportDrillsTrainingBackup(opts);
          break;
        case "cadet_tasks":
          downloadedFilename = exportCadetTasksBackup(opts);
          break;
        case "planning":
          downloadedFilename = exportVoyagePlanningBackup(opts);
          break;
      }

      const targetTitle = MODULE_TITLES[tabKey];
      setSuccessMsg(`✓ ${targetTitle} data successfully backed up to Excel (${downloadedFilename})`);
      setTimeout(() => {
        setSuccessMsg(null);
      }, 5000);
    } catch (err) {
      console.error("Backup export failed:", err);
      setSuccessMsg(`⚠ Error generating Excel backup: ${(err as any)?.message || "Export error"}`);
      setTimeout(() => setSuccessMsg(null), 5000);
    } finally {
      setIsExporting(false);
      setShowMenu(false);
    }
  };

  const handleBackupAll = () => {
    setIsExporting(true);
    const opts = { vesselName, imoNumber, callSign, flagState, userProfile };
    try {
      exportVesselProfileBackup(opts);
      exportDepartmentsCrewBackup(opts);
      exportBridgeWatchkeepingBackup(opts);
      exportDrillsTrainingBackup(opts);
      exportCadetTasksBackup(opts);
      exportVoyagePlanningBackup(opts);

      setSuccessMsg(`✓ All primary modules (6 workbooks) successfully backed up to Excel!`);
      setTimeout(() => setSuccessMsg(null), 6000);
    } catch (err) {
      console.error("Full backup failed:", err);
    } finally {
      setIsExporting(false);
      setShowMenu(false);
    }
  };

  return (
    <div className={`relative inline-block font-mono ${className}`}>
      {/* Temporary Toast Success Notification Badge */}
      {successMsg && (
        <div className="fixed bottom-20 left-6 z-50 max-w-md bg-[#0A2540] text-white border-2 border-[#00A86B] p-3 shadow-2xl flex items-start gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <CheckCircle2 className="w-5 h-5 text-[#00A86B] shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-extrabold text-[#00A86B] block uppercase tracking-wider text-[10px]">
              DATA BACKUP CONFIRMED
            </span>
            <span className="text-slate-200 font-sans font-medium text-xs leading-snug">
              {successMsg}
            </span>
          </div>
          <button 
            onClick={() => setSuccessMsg(null)}
            className="text-slate-400 hover:text-white text-xs font-bold ml-auto cursor-pointer p-0.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Backup Action Button */}
      <div className="flex items-center shadow-lg border border-slate-300 bg-white">
        <button
          type="button"
          onClick={() => triggerExport(activeTab)}
          disabled={isExporting}
          className="px-3.5 py-2.5 bg-[#0A2540] hover:bg-slate-800 text-white text-xs font-bold tracking-wider uppercase flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
          title={`Backup ${moduleName} data to Excel (.xlsx)`}
        >
          <FileSpreadsheet className="w-4 h-4 text-[#00A86B] shrink-0" />
          <span>📥 Backup Data to Excel</span>
          <span className="hidden sm:inline-block text-[10px] px-1.5 py-0.2 bg-emerald-500/20 text-[#00A86B] border border-emerald-500/30 uppercase">
            {moduleName}
          </span>
        </button>

        {/* Dropdown Toggle for Module Selection */}
        <button
          type="button"
          onClick={() => setShowMenu(!showMenu)}
          className="px-2 py-2.5 bg-slate-800 hover:bg-slate-700 text-white border-l border-slate-700 cursor-pointer transition-colors"
          title="Module Backup Options"
        >
          <ChevronUp className={`w-3.5 h-3.5 transition-transform ${showMenu ? "rotate-180" : ""}`} />
        </button>
      </div>

      {/* Quick Select Menu for other modules */}
      {showMenu && (
        <div className="absolute bottom-full left-0 mb-2 w-72 bg-white border-2 border-[#0A2540] shadow-2xl z-50 text-xs py-1">
          <div className="px-3 py-1.5 bg-[#0A2540] text-white text-[10px] font-bold uppercase tracking-wider flex items-center justify-between">
            <span>Select Module Backup</span>
            <span className="text-[9px] text-[#00A86B]">.XLSX</span>
          </div>

          <div className="py-1">
            {(Object.keys(MODULE_TITLES) as ModuleTabKey[]).map((tabKey) => {
              const isCurrent = tabKey === activeTab;
              return (
                <button
                  key={tabKey}
                  type="button"
                  onClick={() => triggerExport(tabKey)}
                  className={`w-full text-left px-3 py-1.5 flex items-center justify-between transition-colors cursor-pointer ${
                    isCurrent 
                      ? "bg-emerald-50 text-[#0A2540] font-extrabold" 
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Download className={`w-3.5 h-3.5 ${isCurrent ? "text-[#00A86B]" : "text-slate-400"}`} />
                    {MODULE_TITLES[tabKey]}
                  </span>
                  {isCurrent && (
                    <span className="text-[9px] bg-[#00A86B] text-white px-1 font-mono uppercase">
                      Current
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="border-t border-slate-200 pt-1 mt-1">
            <button
              type="button"
              onClick={handleBackupAll}
              className="w-full text-left px-3 py-2 text-[#0A2540] hover:bg-blue-50 font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-blue-600" />
              <span>Backup All 6 Modules (Full Suite)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
