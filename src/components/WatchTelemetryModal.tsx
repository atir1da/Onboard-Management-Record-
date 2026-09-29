import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Compass, 
  Wind, 
  Waves, 
  Gauge, 
  Navigation, 
  MapPin, 
  Anchor, 
  CheckCircle2, 
  X, 
  Clock, 
  Ship, 
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Minus,
  Edit2
} from "lucide-react";

export interface WatchTelemetryLog {
  seaCurrent: string; // e.g. "1.2 kts / 085° ENE"
  waterDepth: string; // e.g. "45.0 m (Echo Sounder)"
  draftForward: string; // e.g. "14.80 m"
  draftAft: string; // e.g. "15.40 m"
  vesselSpeed: string; // e.g. "SOG 15.4 kts / STW 15.0 kts"
  shipCourse: string; // e.g. "072° Gyro / 073° Mag"
  position: string; // e.g. "01° 14.50' N, 103° 55.20' E"
  wind: string; // e.g. "18 kts (Bft 5) / 045° NE"
  barometer?: string; // e.g. "1013.5 hPa"
  loggedAt: string; // ISO / display string
  remarks?: string;
  loggedBy?: string;
}

interface TelemetryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "pre_watch" | "post_watch" | "update";
  watchTitle: string;
  watchDate: string;
  watchOow: string;
  initialData?: WatchTelemetryLog | null;
  referencePreWatch?: WatchTelemetryLog | null; // For post_watch reference
  onSave: (data: WatchTelemetryLog) => void;
}

export function TelemetryFormModal({
  isOpen,
  onClose,
  mode,
  watchTitle,
  watchDate,
  watchOow,
  initialData,
  referencePreWatch,
  onSave
}: TelemetryFormModalProps) {
  // Current time formatted
  const defaultTime = new Date().toISOString().replace("T", " ").substring(0, 16) + " UTC";

  // Form State
  const [seaCurrent, setSeaCurrent] = useState(
    initialData?.seaCurrent || referencePreWatch?.seaCurrent || "1.2 kts / 085° ENE"
  );
  const [waterDepth, setWaterDepth] = useState(
    initialData?.waterDepth || referencePreWatch?.waterDepth || "45.0 m (Echo Sounder)"
  );
  const [draftForward, setDraftForward] = useState(
    initialData?.draftForward || referencePreWatch?.draftForward || "14.80 m"
  );
  const [draftAft, setDraftAft] = useState(
    initialData?.draftAft || referencePreWatch?.draftAft || "15.40 m"
  );
  const [vesselSpeed, setVesselSpeed] = useState(
    initialData?.vesselSpeed || referencePreWatch?.vesselSpeed || "SOG 15.4 kts / STW 15.0 kts"
  );
  const [shipCourse, setShipCourse] = useState(
    initialData?.shipCourse || referencePreWatch?.shipCourse || "072° Gyro / 073° Mag"
  );
  const [position, setPosition] = useState(
    initialData?.position || referencePreWatch?.position || "01° 14.50' N, 103° 55.20' E"
  );
  const [wind, setWind] = useState(
    initialData?.wind || referencePreWatch?.wind || "18 kts (Bft 5) / 045° NE"
  );
  const [barometer, setBarometer] = useState(
    initialData?.barometer || referencePreWatch?.barometer || "1013.5 hPa"
  );
  const [remarks, setRemarks] = useState(
    initialData?.remarks || (mode === "pre_watch" ? "Pre-watch checks verified. Radar tuned, Gyro repeaters matched." : "Post-watch handover verified. Relieving officer briefed.")
  );

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const telemetry: WatchTelemetryLog = {
      seaCurrent,
      waterDepth,
      draftForward,
      draftAft,
      vesselSpeed,
      shipCourse,
      position,
      wind,
      barometer,
      loggedAt: initialData?.loggedAt || defaultTime,
      remarks,
      loggedBy: watchOow
    };
    onSave(telemetry);
    onClose();
  };

  const isPre = mode === "pre_watch";
  const isPost = mode === "post_watch";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white border border-slate-300 w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className={`p-4 border-b flex items-center justify-between text-white ${isPre ? "bg-[#0A2540]" : isPost ? "bg-slate-900 border-[#00A86B]" : "bg-[#0A2540]"}`}>
          <div>
            <div className="flex items-center gap-2">
              <Compass className={`w-5 h-5 ${isPre ? "text-[#00A86B]" : isPost ? "text-amber-400" : "text-blue-400"}`} />
              <h3 className="text-sm font-extrabold uppercase tracking-wide">
                {isPre && "Pre-Watch Navigation & Weather Form (Duty Start)"}
                {isPost && "Post-Watch Handover Telemetry Form (Duty Finish)"}
                {mode === "update" && "Update In-Watch Navigation & Telemetry Readings"}
              </h3>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-300 font-mono mt-1">
              <span>{watchTitle}</span>
              <span>·</span>
              <span>{watchDate}</span>
              <span>·</span>
              <span className="text-white font-bold">OOW: {watchOow}</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informational Guidance Callout */}
        <div className="px-5 pt-3 pb-1 text-xs">
          <div className={`p-2.5 border text-[11px] font-mono leading-relaxed ${isPre ? "bg-emerald-50/70 border-emerald-200 text-emerald-900" : isPost ? "bg-amber-50/80 border-amber-200 text-amber-900" : "bg-blue-50/70 border-blue-200 text-blue-900"}`}>
            {isPre && (
              <>
                <strong>STCW Reg. VIII/2 Mandate:</strong> Record initial navigational fixing, sea current, under-keel clearance / water depth, and weather conditions prior to assuming watchkeeping responsibilities.
              </>
            )}
            {isPost && (
              <>
                <strong>Formal Handover Requirement:</strong> Record final vessel state, updated draft, and navigational telemetry for official side-by-side relief comparison.
              </>
            )}
            {mode === "update" && (
              <>
                <strong>Active Telemetry Update:</strong> Modify real-time navigation parameters to reflect altered course, speed changes, or changing weather conditions.
              </>
            )}
          </div>
        </div>

        {/* Reference: Previous Pre-Watch Data if filling Post-Watch */}
        {isPost && referencePreWatch && (
          <div className="mx-5 my-2 p-2.5 bg-slate-50 border border-slate-200 text-[10px] font-mono text-slate-600">
            <span className="font-bold text-[#0A2540] uppercase block mb-1">
              Initial Pre-Watch Reference (Start: {referencePreWatch.loggedAt}):
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>Course: <span className="font-bold text-slate-800">{referencePreWatch.shipCourse}</span></div>
              <div>Speed: <span className="font-bold text-slate-800">{referencePreWatch.vesselSpeed}</span></div>
              <div>Depth: <span className="font-bold text-slate-800">{referencePreWatch.waterDepth}</span></div>
              <div>Current: <span className="font-bold text-slate-800">{referencePreWatch.seaCurrent}</span></div>
            </div>
          </div>
        )}

        {/* Telemetry Input Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs font-sans">
          
          {/* Row 1: Sea Current & Water Depth */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-mono uppercase text-slate-600 font-bold mb-1 flex items-center gap-1.5">
                <Waves className="w-3.5 h-3.5 text-blue-600" />
                <span>Sea Current (kts / direction)</span>
              </label>
              <input
                type="text"
                required
                value={seaCurrent}
                onChange={(e) => setSeaCurrent(e.target.value)}
                placeholder="e.g. 1.2 kts / 085° ENE"
                className="w-full bg-slate-50 border border-slate-200 px-3 py-1.5 text-xs font-mono text-slate-800 focus:outline-none focus:border-[#00A86B]"
              />
              <span className="text-[9px] text-slate-400 font-mono mt-0.5 block">Estimated drift rate & set angle</span>
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase text-slate-600 font-bold mb-1 flex items-center gap-1.5">
                <Anchor className="w-3.5 h-3.5 text-blue-600" />
                <span>Water Depth (Echo Sounder)</span>
              </label>
              <input
                type="text"
                required
                value={waterDepth}
                onChange={(e) => setWaterDepth(e.target.value)}
                placeholder="e.g. 45.0 m (Echo Sounder)"
                className="w-full bg-slate-50 border border-slate-200 px-3 py-1.5 text-xs font-mono text-slate-800 focus:outline-none focus:border-[#00A86B]"
              />
              <span className="text-[9px] text-slate-400 font-mono mt-0.5 block">Under-keel sounding / seabed clearance</span>
            </div>
          </div>

          {/* Row 2: Current Ship Draft (Forward / Aft) */}
          <div className="p-3 bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-mono font-bold text-[#0A2540] uppercase block mb-2">
              Current Ship Draft (Meters)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[9px] font-mono uppercase text-slate-500 font-bold mb-1">
                  Forward Draft (Fwd)
                </label>
                <input
                  type="text"
                  required
                  value={draftForward}
                  onChange={(e) => setDraftForward(e.target.value)}
                  placeholder="e.g. 14.80 m"
                  className="w-full bg-white border border-slate-200 px-3 py-1.5 text-xs font-mono text-slate-800 focus:outline-none focus:border-[#00A86B]"
                />
              </div>

              <div>
                <label className="block text-[9px] font-mono uppercase text-slate-500 font-bold mb-1">
                  Aft Draft (Aft)
                </label>
                <input
                  type="text"
                  required
                  value={draftAft}
                  onChange={(e) => setDraftAft(e.target.value)}
                  placeholder="e.g. 15.40 m"
                  className="w-full bg-white border border-slate-200 px-3 py-1.5 text-xs font-mono text-slate-800 focus:outline-none focus:border-[#00A86B]"
                />
              </div>
            </div>
          </div>

          {/* Row 3: Vessel Speed & Ship Course */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-mono uppercase text-slate-600 font-bold mb-1 flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5 text-blue-600" />
                <span>Current Vessel Speed (kts / SOG / STW)</span>
              </label>
              <input
                type="text"
                required
                value={vesselSpeed}
                onChange={(e) => setVesselSpeed(e.target.value)}
                placeholder="e.g. SOG 15.4 kts / STW 15.0 kts"
                className="w-full bg-slate-50 border border-slate-200 px-3 py-1.5 text-xs font-mono text-slate-800 focus:outline-none focus:border-[#00A86B]"
              />
              <span className="text-[9px] text-slate-400 font-mono mt-0.5 block">Speed Over Ground (SOG) & Through Water (STW)</span>
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase text-slate-600 font-bold mb-1 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-blue-600" />
                <span>Current Ship Course (degrees °)</span>
              </label>
              <input
                type="text"
                required
                value={shipCourse}
                onChange={(e) => setShipCourse(e.target.value)}
                placeholder="e.g. 072° Gyro / 073° Mag"
                className="w-full bg-slate-50 border border-slate-200 px-3 py-1.5 text-xs font-mono text-slate-800 focus:outline-none focus:border-[#00A86B]"
              />
              <span className="text-[9px] text-slate-400 font-mono mt-0.5 block">True / Gyro course and Magnetic Compass heading</span>
            </div>
          </div>

          {/* Row 4: Current GPS Position */}
          <div>
            <label className="block text-[10px] font-mono uppercase text-slate-600 font-bold mb-1 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-blue-600" />
              <span>Current Position (Latitude & Longitude)</span>
            </label>
            <input
              type="text"
              required
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="e.g. 01° 14.50' N, 103° 55.20' E"
              className="w-full bg-slate-50 border border-slate-200 px-3 py-1.5 text-xs font-mono text-slate-800 focus:outline-none focus:border-[#00A86B]"
            />
            <span className="text-[9px] text-slate-400 font-mono mt-0.5 block">ECDIS / GPS fix coordinates</span>
          </div>

          {/* Row 5: Wind Speed / Direction & Barometer */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-mono uppercase text-slate-600 font-bold mb-1 flex items-center gap-1.5">
                <Wind className="w-3.5 h-3.5 text-blue-600" />
                <span>Wind Speed & Direction</span>
              </label>
              <input
                type="text"
                required
                value={wind}
                onChange={(e) => setWind(e.target.value)}
                placeholder="e.g. 18 kts (Bft 5) / 045° NE"
                className="w-full bg-slate-50 border border-slate-200 px-3 py-1.5 text-xs font-mono text-slate-800 focus:outline-none focus:border-[#00A86B]"
              />
              <span className="text-[9px] text-slate-400 font-mono mt-0.5 block">Wind velocity & cardinal quadrant</span>
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase text-slate-600 font-bold mb-1 flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5 text-blue-600" />
                <span>Barometric Pressure</span>
              </label>
              <input
                type="text"
                value={barometer}
                onChange={(e) => setBarometer(e.target.value)}
                placeholder="e.g. 1013.5 hPa (Steady)"
                className="w-full bg-slate-50 border border-slate-200 px-3 py-1.5 text-xs font-mono text-slate-800 focus:outline-none focus:border-[#00A86B]"
              />
              <span className="text-[9px] text-slate-400 font-mono mt-0.5 block">Atmospheric pressure & tendency</span>
            </div>
          </div>

          {/* Remarks & Operational Handover Notes */}
          <div>
            <label className="block text-[10px] font-mono uppercase text-slate-600 font-bold mb-1">
              {isPre && "Pre-Watch Condition Remarks & Equipment Verification"}
              {isPost && "Post-Watch Relief Summary & Handover Remarks"}
              {mode === "update" && "Interim Navigational Remarks"}
            </label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 p-2 text-xs font-sans text-slate-800 focus:outline-none focus:border-[#00A86B]"
              placeholder="Enter notes on look-out status, equipment alignment, traffic density, or master instructions..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-mono uppercase font-bold cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-5 py-2 text-white text-xs font-mono uppercase font-bold flex items-center gap-2 cursor-pointer transition-colors shadow-xs ${
                isPre 
                  ? "bg-[#00A86B] hover:bg-emerald-600" 
                  : isPost 
                    ? "bg-[#0A2540] hover:bg-slate-800 border border-[#00A86B]" 
                    : "bg-[#0A2540] hover:bg-slate-800"
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              {isPre && "Confirm & Start Watch Duties"}
              {isPost && "Confirm & Complete Watch Handover"}
              {mode === "update" && "Save Telemetry Updates"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// Side-by-side Telemetry Comparison View component for Completed / Handed Over records
interface TelemetryComparisonViewProps {
  preWatch?: WatchTelemetryLog | null;
  postWatch?: WatchTelemetryLog | null;
  onEditTelemetry?: (mode: "pre_watch" | "post_watch") => void;
}

export function TelemetryComparisonView({
  preWatch,
  postWatch,
  onEditTelemetry
}: TelemetryComparisonViewProps) {
  if (!preWatch && !postWatch) {
    return (
      <div className="p-3 bg-slate-50 border border-dashed border-slate-200 text-center text-xs text-slate-400 font-mono">
        No formal pre/post telemetry logged for this watch.
      </div>
    );
  }

  const rows = [
    { label: "Position (Lat/Lng)", icon: MapPin, pre: preWatch?.position, post: postWatch?.position },
    { label: "Ship Course", icon: Compass, pre: preWatch?.shipCourse, post: postWatch?.shipCourse },
    { label: "Vessel Speed (SOG/STW)", icon: Gauge, pre: preWatch?.vesselSpeed, post: postWatch?.vesselSpeed },
    { label: "Water Depth (Sounding)", icon: Anchor, pre: preWatch?.waterDepth, post: postWatch?.waterDepth },
    { label: "Sea Current", icon: Waves, pre: preWatch?.seaCurrent, post: postWatch?.seaCurrent },
    { label: "Ship Draft (Fwd / Aft)", icon: Ship, pre: preWatch ? `Fwd: ${preWatch.draftForward} | Aft: ${preWatch.draftAft}` : undefined, post: postWatch ? `Fwd: ${postWatch.draftForward} | Aft: ${postWatch.draftAft}` : undefined },
    { label: "Wind Velocity & Dir", icon: Wind, pre: preWatch?.wind, post: postWatch?.wind },
    { label: "Barometer", icon: Gauge, pre: preWatch?.barometer, post: postWatch?.barometer }
  ];

  return (
    <div className="border border-slate-200 overflow-hidden bg-white text-xs">
      <div className="p-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
        <span className="font-mono font-bold text-[#0A2540] uppercase text-[11px] flex items-center gap-1.5">
          <Compass className="w-3.5 h-3.5 text-[#00A86B]" />
          Pre-Watch vs. Post-Watch Telemetry Comparison
        </span>
        <div className="flex items-center gap-2">
          {onEditTelemetry && (
            <button
              onClick={() => onEditTelemetry("pre_watch")}
              className="text-[10px] font-mono text-slate-600 hover:text-[#0A2540] flex items-center gap-0.5 cursor-pointer underline"
            >
              <Edit2 className="w-2.5 h-2.5" /> Edit Readings
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left font-mono text-[11px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 uppercase">
              <th className="py-2 px-3 w-1/3">Parameter</th>
              <th className="py-2 px-3 w-1/3 text-emerald-800 bg-emerald-50/50">
                Initial (Start Watch)
                {preWatch?.loggedAt && <span className="block text-[8px] text-slate-400 font-normal">{preWatch.loggedAt}</span>}
              </th>
              <th className="py-2 px-3 w-1/3 text-blue-900 bg-blue-50/40">
                Final (Finish Watch)
                {postWatch?.loggedAt && <span className="block text-[8px] text-slate-400 font-normal">{postWatch.loggedAt}</span>}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r, i) => (
              <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                <td className="py-2 px-3 font-semibold text-slate-700 whitespace-nowrap flex items-center gap-1.5">
                  <r.icon className="w-3 h-3 text-slate-400 shrink-0" />
                  <span>{r.label}</span>
                </td>
                <td className="py-2 px-3 text-slate-800 bg-emerald-50/20 font-medium">
                  {r.pre || <span className="text-slate-300 italic">Not recorded</span>}
                </td>
                <td className="py-2 px-3 text-slate-800 bg-blue-50/20 font-medium">
                  {r.post || <span className="text-slate-300 italic">Pending handover</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Remarks Section */}
      {(preWatch?.remarks || postWatch?.remarks) && (
        <div className="p-3 bg-slate-50/80 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3 text-[10px] font-sans">
          {preWatch?.remarks && (
            <div>
              <span className="font-mono font-bold text-slate-500 uppercase text-[9px] block">Start Watch Remarks:</span>
              <p className="text-slate-700 italic mt-0.5">"{preWatch.remarks}"</p>
            </div>
          )}
          {postWatch?.remarks && (
            <div>
              <span className="font-mono font-bold text-slate-500 uppercase text-[9px] block">Handover Relief Remarks:</span>
              <p className="text-slate-700 italic mt-0.5">"{postWatch.remarks}"</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
