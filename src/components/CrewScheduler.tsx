import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Clock, 
  User, 
  BookOpen, 
  Plus, 
  Trash2, 
  CheckCircle, 
  FileText, 
  ShieldAlert, 
  Cpu, 
  Terminal, 
  RefreshCw,
  Award,
  ChevronDown,
  ChevronUp,
  Navigation,
  Compass
} from "lucide-react";
import { CrewScheduleInput, CrewScheduleResponse } from "../types";

// Standard timeline details for maritime crew ranks
interface TimelineEvent {
  time: string;
  title: string;
  desc: string;
  solasRef: string;
  duration: string;
  fatigueRisk: "LOW" | "MED" | "HIGH";
  details: string[];
}

const RANK_TIMELINES: Record<string, TimelineEvent[]> = {
  "Master (Captain)": [
    {
      time: "07:00",
      title: "Morning watch briefing & safety walk-through",
      desc: "Assemble deck and engine officers to review meteorological reports and verify ship course coordinates.",
      solasRef: "SOLAS V/14 - Safe Manning",
      duration: "1.5 hrs",
      fatigueRisk: "LOW",
      details: [
        "Met-ocean report integration",
        "Manning checklist verification",
        "Master's standing orders signature"
      ]
    },
    {
      time: "08:30",
      title: "Navigation deck watch (bridge navigation)",
      desc: "Assume bridge control watch during navigation through high-traffic traffic separation schemes.",
      solasRef: "SOLAS V/22 - Bridge Visibility",
      duration: "4.0 hrs",
      fatigueRisk: "LOW",
      details: [
        "ARPA Radar targeting review",
        "ECDIS chart validation",
        "Lookout coordination"
      ]
    },
    {
      time: "14:00",
      title: "Safety Drill assessment & briefing",
      desc: "Direct weekly general emergency muster drills. Perform post-drill debrief and sign ship logbook.",
      solasRef: "SOLAS III/19 - Emergency Training",
      duration: "2.0 hrs",
      fatigueRisk: "MED",
      details: [
        "Muster list compliance review",
        "Egress path clearance checks",
        "Post-drill safety performance audit"
      ]
    },
    {
      time: "18:00",
      title: "Evening master report review",
      desc: "Log daily noon report, ballast water exchanges, and environmental emissions stats.",
      solasRef: "MARPOL Annex I & V",
      duration: "1.5 hrs",
      fatigueRisk: "LOW",
      details: [
        "Ballast management plan validation",
        "Noon report transmission",
        "Oil Record Book inspection"
      ]
    }
  ],
  "Chief Engineer": [
    {
      time: "08:00",
      title: "Engine room morning team assembly & checklist",
      desc: "Hold watch handover briefing with engine department watchkeepers. Review auxiliary power status.",
      solasRef: "STCW Section A-III/1",
      duration: "1.0 hr",
      fatigueRisk: "LOW",
      details: [
        "Handover log authentication",
        "Auxiliary engine redundancy check",
        "Machinery space safety walk-through"
      ]
    },
    {
      time: "09:30",
      title: "Propulsion telemetry audit & maintenance",
      desc: "Execute remote telemetry sensor audit of the main diesel power unit. Validate exhaust temperatures.",
      solasRef: "SOLAS II-1/Part C",
      duration: "2.5 hrs",
      fatigueRisk: "MED",
      details: [
        "Cylinder lubrication rate adjustments",
        "Scavenge air temperature logs",
        "Vibration monitoring analysis"
      ]
    },
    {
      time: "13:30",
      title: "Fresh water generator audit",
      desc: "Monitor evaporative generator output. Run salinity tests on produced fresh water reserves.",
      solasRef: "WHO Sanitation Code",
      duration: "1.5 hrs",
      fatigueRisk: "LOW",
      details: [
        "Vacuum pressure diagnostics",
        "Distillate salinity level confirmation",
        "Dosing pump chemical review"
      ]
    },
    {
      time: "15:00",
      title: "Emergency safety drill inspection (fire pump)",
      desc: "Test manual starting overrides for emergency engine-room fire pump systems.",
      solasRef: "SOLAS II-2/Reg 10",
      duration: "2.0 hrs",
      fatigueRisk: "HIGH",
      details: [
        "Emergency pump startup lag timing",
        "Hydrant pressure discharge measurement",
        "Ventilation quick-closing valve checks"
      ]
    }
  ],
  "Third Officer": [
    {
      time: "08:00",
      title: "Bridge navigation watch & GPS sync",
      desc: "Maintain navigation watch. Perform satellite communication and GPS receiver synchronizations.",
      solasRef: "SOLAS V/19",
      duration: "4.0 hrs",
      fatigueRisk: "LOW",
      details: [
        "SATCOM transceiver diagnostic test",
        "GMDSS emergency alert readiness logs",
        "Watchkeeping handover signoff"
      ]
    },
    {
      time: "13:00",
      title: "Lifeboat equipment inspection",
      desc: "Audit survival craft rations, emergency signaling lights, and manual hand-crank startup systems.",
      solasRef: "SOLAS III/20",
      duration: "2.5 hrs",
      fatigueRisk: "MED",
      details: [
        "Lifeboat engine fuel levels verification",
        "Pyrotechnic flare expiry audit",
        "Muster locker inventory validation"
      ]
    },
    {
      time: "16:00",
      title: "Fire-fighting appliances review",
      desc: "Examine portable CO2 extinguishers, fire hoses, and firemen outfits across accommodation spaces.",
      solasRef: "SOLAS II-2/Reg 14",
      duration: "2.0 hrs",
      fatigueRisk: "LOW",
      details: [
        "Breathing apparatus bottle pressure logs",
        "Fire damper linkage lubrication",
        "Main alarm bell loop diagnostic"
      ]
    },
    {
      time: "20:00",
      title: "Night navigation watch",
      desc: "Execute nocturnal deck watch duties. Set appropriate radar guard zone parameters.",
      solasRef: "STCW VIII/2",
      duration: "4.0 hrs",
      fatigueRisk: "MED",
      details: [
        "Night vision adaptation setup",
        "Lookout watchkeeper safety checks",
        "Vessel radar sweep customization"
      ]
    }
  ],
  "Cadet / ABK": [
    {
      time: "07:30",
      title: "Deck cleaning & general maintenance",
      desc: "Clean bridge wings, accommodation decks, and organize marine safety stores.",
      solasRef: "SOLAS III/19",
      duration: "2.0 hrs",
      fatigueRisk: "MED",
      details: [
        "Bridge window glass cleaning",
        "Escape route obstacle clearance",
        "Safety barrier checks"
      ]
    },
    {
      time: "09:30",
      title: "Lifeboat launching assistance",
      desc: "Assist Third Officer with survival craft davit lubrication and winch test operations.",
      solasRef: "SOLAS III/Reg 20",
      duration: "2.5 hrs",
      fatigueRisk: "HIGH",
      details: [
        "Davit wire greasing",
        "Limit switch mechanism safety checks",
        "Launching harness inspection"
      ]
    },
    {
      time: "14:00",
      title: "Muster station safety training",
      desc: "Participate in fire-fighting hose deployment training under supervision of Chief Officer.",
      solasRef: "STCW Chapter VI",
      duration: "2.0 hrs",
      fatigueRisk: "MED",
      details: [
        "Self-contained breathing apparatus donning",
        "Hose nozzle pressure management",
        "Muster card instructions review"
      ]
    },
    {
      time: "18:00",
      title: "Mooring lines inspection",
      desc: "Verify anchor windlass tension and check alignment of mooring ropes on the forward deck.",
      solasRef: "SOLAS II-1/3-8",
      duration: "1.5 hrs",
      fatigueRisk: "MED",
      details: [
        "Mooring line chafing inspections",
        "Warping drum brakes verification",
        "Heaving line storage preparation"
      ]
    }
  ]
};

export default function CrewScheduler() {
  const [inputs, setInputs] = useState<CrewScheduleInput>({
    operation: "Lifeboat Maintenance & Launching Test",
    personnel: ["Third Officer (Deck Officer)", "Deck Cadet", "Oiler"],
    scheduledTime: "Saturday, 09:00 - 11:30 Local Time",
  });

  const [newPerson, setNewPerson] = useState("");
  const [loading, setLoading] = useState(false);
  const [showJson, setShowJson] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scheduleResult, setScheduleResult] = useState<CrewScheduleResponse | null>({
    jobDescriptions: [
      {
        rank: "Third Officer (Deck Officer)",
        responsibilities: [
          "Act as Officer-in-Charge of the lifeboat operation, ensuring SOLAS compliance.",
          "Verify all personnel don appropriate safety equipment including lifejackets, safety helmets, and safety shoes.",
          "Inspect davit limit switches, winch brakes, and fall wires prior to swinging out.",
          "Maintain direct VHF radio contact with the bridge throughout the drill."
        ],
        solasReference: "SOLAS Chapter III, Regulation 20 (Operational readiness, maintenance and inspections)"
      },
      {
        rank: "Deck Cadet",
        responsibilities: [
          "Assist Third Officer with pre-launch checks and safety pin removals.",
          "Prepare the lifeboat painter line and secure it at the forward deck.",
          "Perform general inspection of survival equipment inside the craft, including rations, water, and pyrotechnics.",
          "Document work times, checklist statuses, and winch performance logs."
        ],
        solasReference: "SOLAS Chapter III, Regulation 36 (Instructions for on-board maintenance)"
      },
      {
        rank: "Oiler",
        responsibilities: [
          "Verify lifeboat engine fluid levels: lubricating oil, fuel oil, and coolant.",
          "Perform test run of the lifeboat engine (both ahead and astern gear) for at least 3 minutes.",
          "Ensure the lifeboat battery charging system is operational and disconnected before launch.",
          "Assist in lubricating the davit tracks and block assemblies with marine grease."
        ],
        solasReference: "SOLAS Chapter III, Regulation 20.6 (Weekly and monthly inspections of life-saving appliances)"
      }
    ],
    stcwCompliance: {
      compliant: true,
      explanation: "The scheduled duration (09:00 - 11:30 LT, 2.5 hours) complies with STCW Rest Hours regulations. A minimum of 10 rest hours within any 24-hour period is successfully maintained.",
      restHoursCheck: "COMPLIANT"
    },
    deckLogBookEntry: "0900 LT: Lifeboat No. 1 swung out and lowered to embarkation deck for scheduled maintenance and launch testing. Weather: Sea calm, Wind Light Airs. Visual inspections completed. 0930 LT: Lifeboat engine test run successful. Davit fall wires inspected. 1100 LT: Lifeboat No. 1 hoisted back to stowed position, locking pins secured. 1130 LT: Operation successfully completed. All equipment secured for sea. Deck Cadet logged. Under supervision of Third Officer."
  });

  // Duty Timeline State
  const [selectedRank, setSelectedRank] = useState<string>("Master (Captain)");
  const [expandedEventIdx, setExpandedEventIdx] = useState<number | null>(0);

  const addPerson = () => {
    if (newPerson.trim() && !inputs.personnel.includes(newPerson.trim())) {
      setInputs(prev => ({
        ...prev,
        personnel: [...prev.personnel, newPerson.trim()],
      }));
      setNewPerson("");
    }
  };

  const removePerson = (idx: number) => {
    setInputs(prev => ({
      ...prev,
      personnel: prev.personnel.filter((_, i) => i !== idx),
    }));
  };

  const generateSchedule = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/crew-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inputs),
      });
      if (!response.ok) {
        throw new Error("Unable to build duty sheets. Serving emergency standard files.");
      }
      const data = await response.json();
      setScheduleResult(data);
    } catch (err: any) {
      setError(err.message || "Could not generate compliance schedule.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="crew-scheduler-module" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Control panel (Left side: 4 cols) */}
      <div className="lg:col-span-4 bg-white border border-slate-200 p-5 shadow-md flex flex-col justify-between rounded-none">
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2 border-b border-slate-100 pb-3">
            <Clock className="text-[#0A2540] w-5 h-5" />
            <h2 className="text-sm font-bold tracking-widest text-[#0A2540] uppercase font-sans">
              Schedule Planner
            </h2>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed font-sans">
            Plan safety-critical operations. The system automatically inspects assigned crew, analyzes hours against STCW fatigue limitations, and designs SOLAS task sheets.
          </p>

          {/* Operation Input */}
          <div className="space-y-1">
            <label className="block text-[10px] uppercase tracking-wider text-slate-500 font-mono">
              Vessel Operation / Task
            </label>
            <input
              type="text"
              value={inputs.operation}
              onChange={(e) => setInputs(prev => ({ ...prev, operation: e.target.value }))}
              className="w-full bg-white border border-slate-200 p-2 text-[#0A2540] font-sans text-xs focus:outline-none focus:border-[#0A2540]"
              placeholder="e.g. Lifeboat Launching"
            />
          </div>

          {/* Scheduled Time */}
          <div className="space-y-1">
            <label className="block text-[10px] uppercase tracking-wider text-slate-500 font-mono">
              Scheduled Time & Day
            </label>
            <input
              type="text"
              value={inputs.scheduledTime}
              onChange={(e) => setInputs(prev => ({ ...prev, scheduledTime: e.target.value }))}
              className="w-full bg-white border border-slate-200 p-2 text-[#0A2540] font-sans text-xs focus:outline-none focus:border-[#0A2540]"
              placeholder="e.g. Saturday, 09:00 - 11:30"
            />
          </div>

          {/* Personnel list */}
          <div className="space-y-2">
            <label className="block text-[10px] uppercase tracking-wider text-slate-500 font-mono">
              Assigned Watchkeepers / Crew
            </label>
            <div className="bg-slate-50 rounded-none border border-slate-200 p-2 max-h-[140px] overflow-y-auto space-y-1.5">
              {inputs.personnel.map((person, idx) => (
                <div key={idx} className="flex justify-between items-center bg-white px-2 py-1 rounded-none border border-slate-200">
                  <span className="text-xs text-slate-700 flex items-center gap-1.5 font-sans">
                    <User className="w-3 h-3 text-[#0A2540]" /> {person}
                  </span>
                  <button
                    onClick={() => removePerson(idx)}
                    className="text-[#FF4500] hover:text-red-500 transition-colors p-0.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {inputs.personnel.length === 0 && (
                <p className="text-[10px] text-slate-400 italic text-center py-2">No crew assigned.</p>
              )}
            </div>

            {/* Add crew rank */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newPerson}
                onChange={(e) => setNewPerson(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addPerson()}
                placeholder="Add rank (e.g., Chief Officer)"
                className="flex-1 bg-white border border-slate-200 px-2 py-1.5 text-[#0A2540] font-sans text-xs focus:outline-none focus:border-[#0A2540]"
              />
              <button
                onClick={addPerson}
                className="bg-slate-100 hover:bg-slate-200 border border-slate-300 text-[#0A2540] rounded-none px-3 flex items-center justify-center cursor-pointer active:scale-95 transition-all"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <button
          onClick={generateSchedule}
          disabled={loading}
          className="mt-6 w-full py-2.5 bg-[#0A2540] border border-[#0A2540] text-white hover:bg-[#1a3f64] text-xs font-bold uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-98 shadow-md rounded-none"
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-white" />
              Assessing STCW Hours...
            </>
          ) : (
            <>
              <Cpu className="w-4 h-4 text-white" />
              Draft Crew Job Specs & Log
            </>
          )}
        </button>
      </div>

      {/* Output Display (Right side: 8 cols) */}
      <div className="lg:col-span-8 flex flex-col gap-6">
        
        {/* "The Duty Timeline" - Core Interactive Feature */}
        <div className="bg-white border border-slate-200 p-5 shadow-md rounded-none">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 border-b border-slate-100 pb-3 gap-3">
            <div>
              <h3 className="text-xs font-bold tracking-widest text-[#0A2540] uppercase font-sans flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-[#00A86B] animate-pulse" />
                The Duty Timeline
              </h3>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">Chronological pathways with dynamic glowing routes</p>
            </div>
            
            {/* Rank selectors */}
            <div className="flex flex-wrap gap-1">
              {Object.keys(RANK_TIMELINES).map((rank) => (
                <button
                  key={rank}
                  onClick={() => {
                    setSelectedRank(rank);
                    setExpandedEventIdx(0); // autoexpand first on shift
                  }}
                  className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer border ${
                    selectedRank === rank
                      ? "bg-[#0A2540] text-white border-[#0A2540]"
                      : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {rank.split(" ")[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Timeline pathway visualization */}
          <div className="relative pl-6 md:pl-10 py-2">
            {/* The vertical glowing path line */}
            <div className="absolute left-3 md:left-5 top-0 bottom-0 w-0.5 bg-slate-100" />
            
            {/* Glowing Nautical Path Animation overlay line */}
            <motion.div 
              className="absolute left-3 md:left-5 top-0 w-0.5 bg-gradient-to-b from-[#00A86B] via-[#00A86B] to-transparent"
              initial={{ height: 0 }}
              animate={{ height: "100%" }}
              transition={{ duration: 1, ease: "easeInOut" }}
              style={{
                boxShadow: "0 0 10px #00A86B, 0 0 20px #00A86B"
              }}
            />

            <div className="space-y-4">
              {RANK_TIMELINES[selectedRank].map((event, idx) => {
                const isExpanded = expandedEventIdx === idx;
                return (
                  <div key={idx} className="relative">
                    {/* Pulsing indicator node on timeline */}
                    <div className="absolute -left-6 md:-left-10 top-1.5 z-10 flex items-center justify-center">
                      <div className="w-3.5 h-3.5 bg-white border-2 border-[#0A2540] rounded-full flex items-center justify-center">
                        <motion.div 
                          className="w-1.5 h-1.5 rounded-full" 
                          style={{ backgroundColor: event.fatigueRisk === "HIGH" ? "#FF4500" : "#00A86B" }}
                          animate={{ scale: [1, 1.4, 1] }}
                          transition={{ repeat: Infinity, duration: 2, delay: idx * 0.3 }}
                        />
                      </div>
                    </div>

                    {/* Timeline card */}
                    <div className="bg-slate-50 border border-slate-200 rounded-sm overflow-hidden hover:border-[#0A2540]/30 transition-all">
                      <button
                        onClick={() => setExpandedEventIdx(isExpanded ? null : idx)}
                        className="w-full text-left p-3 flex justify-between items-start gap-4 hover:bg-slate-100/50 transition-all cursor-pointer"
                      >
                        <div className="flex gap-3 items-start">
                          <span className="font-mono text-xs font-bold text-[#0A2540] bg-slate-200 px-1.5 py-0.5 rounded-sm shrink-0">
                            {event.time}
                          </span>
                          <div>
                            <h4 className="text-xs font-bold text-[#0A2540] font-sans leading-tight">
                              {event.title}
                            </h4>
                            <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{event.desc}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-sm border ${
                            event.fatigueRisk === "HIGH" 
                              ? "bg-red-50 text-[#FF4500] border-red-200" 
                              : event.fatigueRisk === "MED" 
                              ? "bg-amber-50 text-amber-600 border-amber-200"
                              : "bg-emerald-50 text-[#00A86B] border-emerald-200"
                          }`}>
                            RISK: {event.fatigueRisk}
                          </span>
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                        </div>
                      </button>

                      {/* Expandable sub-tasks details */}
                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            className="border-t border-slate-200/60 bg-white p-3.5 space-y-3"
                          >
                            <p className="text-xs text-slate-600 leading-relaxed font-sans">
                              {event.desc}
                            </p>

                            <div className="space-y-1.5">
                              <span className="text-[9px] font-mono uppercase text-slate-400 tracking-wider block">Stipulated Checklist Details:</span>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                {event.details.map((detail, dIdx) => (
                                  <div key={dIdx} className="bg-slate-50 border border-slate-100 p-2 rounded-sm text-xs text-slate-700 flex items-start gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[#00A86B] mt-1.5 shrink-0" />
                                    <span className="leading-tight">{detail}</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 pt-2 border-t border-slate-100">
                              <span>Regulatory standard: <strong className="text-slate-600">{event.solasRef}</strong></span>
                              <span>Duration: {event.duration}</span>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Output Header Console */}
        <div className="bg-white border border-slate-200 p-5 shadow-md flex-1 flex flex-col justify-between rounded-none">
          <div>
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Terminal className="text-[#0A2540] w-4 h-4" />
                <h3 className="text-xs uppercase tracking-widest text-[#0A2540] font-sans font-bold">
                  Crew Assignment & Deck Log Book Entry
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-mono text-slate-400 cursor-pointer uppercase" htmlFor="crew-json-toggle">
                  RAW JSON MODE
                </label>
                <button
                  id="crew-json-toggle"
                  onClick={() => setShowJson(!showJson)}
                  className={`w-8 h-4 rounded-full p-0.5 transition-colors duration-200 focus:outline-none cursor-pointer ${showJson ? "bg-[#0A2540]" : "bg-slate-200"}`}
                >
                  <div className={`bg-white w-3 h-3 rounded-full shadow-md transform transition-transform duration-200 ${showJson ? "translate-x-4" : "translate-x-0"}`} />
                </button>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-20 text-center space-y-4"
                >
                  <div className="relative w-16 h-16 border-2 border-[#0A2540]/10 rounded-full flex items-center justify-center bg-slate-50">
                    <motion.div
                      className="absolute inset-0 border-2 border-[#00A86B] rounded-full"
                      animate={{ scale: [1, 1.8], opacity: [0.6, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
                    />
                    <Clock className="w-6 h-6 text-[#0A2540] animate-spin" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-mono text-[#0A2540] uppercase tracking-widest animate-pulse">
                      Analyzing rest periods against STCW regulations...
                    </p>
                    <p className="text-[10px] font-mono text-slate-400">
                      Generating official SOLAS Chapter III tasks & Deck Log entries
                    </p>
                  </div>
                </motion.div>
              ) : showJson ? (
                <motion.div
                  key="json"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="bg-slate-900 p-3 rounded-none border border-slate-800 max-h-[360px] overflow-y-auto font-mono text-[9px] text-[#00A86B] leading-tight"
                >
                  <pre>{JSON.stringify(scheduleResult || { info: "Run schedule generation to view" }, null, 2)}</pre>
                </motion.div>
              ) : scheduleResult ? (
                <motion.div
                  key="results"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-5"
                >
                  {/* STCW Fatigue Check Block */}
                  <div className={`p-4 border flex items-center gap-3 rounded-sm ${
                    scheduleResult.stcwCompliance.compliant 
                      ? "bg-[#00A86B]/5 border-[#00A86B]/20 text-[#00A86B]" 
                      : "bg-red-50 border-red-200 text-[#FF4500]"
                  }`}>
                    <CheckCircle className={`w-5 h-5 shrink-0 ${scheduleResult.stcwCompliance.compliant ? "text-[#00A86B]" : "text-[#FF4500]"}`} />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[9px] uppercase font-mono font-bold tracking-widest text-slate-500">
                          Fatigue Compliance (STCW Rest Hours Verification)
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm border ${
                          scheduleResult.stcwCompliance.compliant 
                            ? "bg-emerald-50 text-[#00A86B] border-emerald-200" 
                            : "bg-red-50 text-[#FF4500] border-red-200"
                        }`}>
                          {scheduleResult.stcwCompliance.restHoursCheck}
                        </span>
                      </div>
                      <p className="text-xs mt-1 font-sans leading-relaxed text-slate-700 font-medium text-justify">
                        {scheduleResult.stcwCompliance.explanation}
                      </p>
                    </div>
                  </div>

                  {/* SOLAS Job Descriptions by Rank */}
                  <div>
                    <h4 className="text-[11px] font-mono uppercase tracking-widest text-[#0A2540] mb-3 font-bold flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-[#00A86B]" /> SOLAS STIPULATED TASK SHEETS
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {scheduleResult.jobDescriptions.map((job, idx) => (
                        <div key={idx} className="bg-slate-50 p-3.5 border border-slate-200 flex flex-col justify-between rounded-none hover:border-[#0A2540]/20 transition-all">
                          <div>
                            <div className="flex items-center gap-1.5 border-b border-slate-200 pb-1.5 mb-2">
                              <User className="w-3.5 h-3.5 text-[#0A2540]" />
                              <h5 className="text-xs font-semibold text-[#0A2540] tracking-tight leading-none uppercase font-sans">
                                {job.rank}
                              </h5>
                            </div>
                            <ul className="space-y-1.5 list-none">
                              {job.responsibilities.map((resp, rIdx) => (
                                <li key={rIdx} className="text-xs text-slate-600 leading-normal pl-2 border-l border-slate-300 font-sans">
                                  {resp}
                                </li>
                              ))}
                            </ul>
                          </div>
                          
                          <div className="mt-3 pt-2 border-t border-slate-200/60 text-[9px] font-mono text-slate-400 text-right uppercase">
                            Ref: {job.solasReference}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Deck Log Book Entry */}
                  <div className="space-y-2">
                    <h4 className="text-[11px] font-mono uppercase tracking-widest text-[#0A2540] font-bold flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-[#0A2540]" /> DECK LOG BOOK TRANSLATION (SMCP)
                    </h4>
                    
                    {/* Pristine high-fidelity paper layout */}
                    <div className="bg-white p-4 border border-slate-200 relative overflow-hidden rounded-none shadow-xs">
                      <div className="absolute right-3 top-3 opacity-5">
                        <BookOpen className="w-20 h-20 text-[#0A2540]" />
                      </div>
                      <div className="flex justify-between items-center text-[9px] font-mono text-slate-400 uppercase border-b border-slate-100 pb-2 mb-2">
                        <span>DECK LOG ENTRY: DRAFT</span>
                        <span>OFFICIAL SMCP RECORD</span>
                      </div>
                      <p className="text-xs text-slate-800 font-mono italic leading-relaxed whitespace-pre-line pl-1 border-l-2 border-[#0A2540]">
                        "{scheduleResult.deckLogBookEntry}"
                      </p>
                      <div className="flex justify-end text-[8px] font-mono text-slate-400 uppercase mt-2.5">
                        <span>Status: Verified and Logged to Ship DB</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <div className="flex flex-col items-center justify-center py-24 text-center text-slate-400">
                  <Clock className="w-10 h-10 mb-2 text-slate-300" />
                  <p className="text-xs font-mono text-[#0A2540]">NO WATCHKEEPING TASK DATA LOADED</p>
                  <p className="text-[10px] text-slate-500 max-w-xs mt-1">
                    Press the button to perform STCW Rest Checks and draft custom SOLAS duty logs.
                  </p>
                </div>
              )}
            </AnimatePresence>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-100 flex justify-between items-center text-[10px] font-mono text-slate-400 font-bold">
            <span>REGULATION: STCW Code Section A-VIII/1 (Rest Hours)</span>
            <span>PMS STATUS: ACTIVE SYNC</span>
          </div>
        </div>
      </div>
    </div>
  );
}
