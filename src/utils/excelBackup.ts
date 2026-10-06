import * as XLSX from "xlsx";
import { getStoredUserProfile, UserProfile, getRemainingContractDays } from "../types/userProfile";
import { ROTATION_PHASES, getDynamicPhaseDates } from "../types/cadetTraining";
import { getStoredCadetTasks } from "../utils/cadetFirestoreSync";

interface ExportOptions {
  vesselName?: string;
  imoNumber?: string;
  callSign?: string;
  flagState?: string;
  userProfile?: UserProfile;
}

/**
 * Helper to get clean vessel and seafarer metadata
 */
function getSystemMetadata(customOpts?: ExportOptions) {
  const profile = customOpts?.userProfile || getStoredUserProfile();
  const vesselName = customOpts?.vesselName || localStorage.getItem("sms_vesselName") || "PACIFIC SENTINEL";
  const imoNumber = customOpts?.imoNumber || localStorage.getItem("sms_imoNumber") || "9845722";
  const callSign = customOpts?.callSign || localStorage.getItem("sms_callSign") || "9V8841";
  const flagState = customOpts?.flagState || localStorage.getItem("sms_flagState") || "Singapore 🇸🇬";

  const now = new Date();
  const timestampUTC = now.toISOString().replace("T", " ").substring(0, 19) + " UTC";
  const dateStr = now.toISOString().split("T")[0];

  return {
    vesselName,
    imoNumber,
    callSign,
    flagState,
    profile,
    timestampUTC,
    dateStr
  };
}

/**
 * Standard Header banner prepended to each sheet in the backup workbook
 */
function createHeaderBlock(moduleTitle: string, meta: ReturnType<typeof getSystemMetadata>): (string | number)[][] {
  return [
    ["SHIPBOARD MANAGEMENT SYSTEM · SOLAS & STCW COMPLIANT BACKUP"],
    [`MODULE: ${moduleTitle.toUpperCase()}`],
    [
      `Vessel: ${meta.vesselName}`,
      `IMO: ${meta.imoNumber}`,
      `Call Sign: ${meta.callSign}`,
      `Flag: ${meta.flagState}`,
      `Backup Timestamp: ${meta.timestampUTC}`
    ],
    [
      `Logged By: ${meta.profile.fullName || "Master/OOW"}`,
      `Rank: ${meta.profile.rank || "Officer"}`,
      `Seafarer ID: ${meta.profile.seafarerId || "N/A"}`,
      `Nationality: ${meta.profile.nationality || "N/A"}`,
      `Contract: ${meta.profile.contractDurationMonths || 12} Months (${meta.profile.signOnDate || "2026-01-05"} → ${meta.profile.signOffDate || "2027-01-05"})`
    ],
    [] // Blank line separator
  ];
}

/**
 * Formats column widths dynamically for a worksheet
 */
function autoFitColumns(ws: XLSX.WorkSheet, data: (string | number)[][]) {
  const colWidths: { wch: number }[] = [];
  data.forEach(row => {
    row.forEach((cell, colIdx) => {
      const cellLen = cell !== undefined && cell !== null ? String(cell).length : 0;
      if (!colWidths[colIdx] || cellLen > colWidths[colIdx].wch) {
        colWidths[colIdx] = { wch: Math.min(Math.max(cellLen + 3, 12), 65) };
      }
    });
  });
  ws["!cols"] = colWidths;
}

/**
 * 1. VESSEL PROFILE BACKUP
 */
export function exportVesselProfileBackup(customOpts?: ExportOptions): string {
  const meta = getSystemMetadata(customOpts);
  const wb = XLSX.utils.book_new();

  // Read technical particulars
  const mmsi = localStorage.getItem("sms_mmsiNumber") || "563084100";
  const classSoc = localStorage.getItem("sms_classSociety") || "ABS";
  const loa = localStorage.getItem("sms_loa") || "299.9";
  const lbp = localStorage.getItem("sms_lbp") || "285.0";
  const beam = localStorage.getItem("sms_beam") || "48.2";
  const draft = localStorage.getItem("sms_draft") || "15.5";
  const freeboard = localStorage.getItem("sms_freeboard") || "6.2";
  const airDraft = localStorage.getItem("sms_airDraft") || "49.5";
  const gt = localStorage.getItem("sms_gt") || "93500";
  const nt = localStorage.getItem("sms_nt") || "57200";
  const dwt = localStorage.getItem("sms_dwt") || "115000";
  const lightship = localStorage.getItem("sms_lightship") || "23500";
  const mainEngine = localStorage.getItem("sms_mainEngine") || "MAN B&W 6G80ME-C9.5 (22,400 kW @ 72 RPM)";
  const auxEngines = localStorage.getItem("sms_auxEngines") || "3x Wärtsilä 6L20 (1,200 kWe each)";
  const serviceSpeed = localStorage.getItem("sms_serviceSpeed") || "15.8";
  const fuelConsumption = localStorage.getItem("sms_fuelConsumption") || "45.5";
  const freshWaterMax = localStorage.getItem("sms_freshWaterMax") || "450";
  const fuelCapacity = localStorage.getItem("sms_fuelCapacity") || "1800";
  const vesselType = localStorage.getItem("sms_vesselConfigType") || "Container Ship";

  const rows: (string | number)[][] = [
    ...createHeaderBlock("Vessel Profile & Technical Particulars", meta),
    ["CATEGORY", "PARAMETER", "VALUE", "UNIT / STANDARD", "STATUS / REMARKS"],
    ["General Identity", "Vessel Name", meta.vesselName, "Official Registry", "Active in Service"],
    ["General Identity", "IMO Number", meta.imoNumber, "SOLAS Mandatory", "Verified"],
    ["General Identity", "Call Sign", meta.callSign, "ITU Radio Regulations", "Active"],
    ["General Identity", "Flag State", meta.flagState, "Port State Control", "Compliant"],
    ["General Identity", "MMSI Number", mmsi, "AIS / GMDSS Transponder", "Active Transmitting"],
    ["General Identity", "Classification Society", classSoc, "IACS Member", "Valid Class Certificate"],
    ["General Identity", "Vessel Configuration", vesselType, "Commercial Type", "Full Commercial Operations"],
    ["Dimensions & Hull", "Length Overall (LOA)", Number(loa), "Meters", "Extreme Length"],
    ["Dimensions & Hull", "Length Between Perp. (LBP)", Number(lbp), "Meters", "Hydrodynamic Reference"],
    ["Dimensions & Hull", "Moulded Beam", Number(beam), "Meters", "Extreme Breadth"],
    ["Dimensions & Hull", "Design Summer Draft", Number(draft), "Meters", "Class Summer Waterline"],
    ["Dimensions & Hull", "Freeboard", Number(freeboard), "Meters", "Summer Load Line Minimum"],
    ["Dimensions & Hull", "Air Draft (Keel to Mast)", Number(airDraft), "Meters", "Maximum Clearance"],
    ["Tonnage & Weights", "Gross Tonnage (GT)", Number(gt), "ITC 69 Standard", "International Registry"],
    ["Tonnage & Weights", "Net Tonnage (NT)", Number(nt), "ITC 69 Standard", "Revenue Measurement"],
    ["Tonnage & Weights", "Deadweight (DWT)", Number(dwt), "Metric Tons", "Cargo, Bunker & Stores Capacity"],
    ["Tonnage & Weights", "Lightship Displacement", Number(lightship), "Metric Tons", "Light Vessel Weight"],
    ["Machinery & Propulsion", "Main Propulsion Engine", mainEngine, "2-Stroke Diesel", "Operating @ 85% MCR"],
    ["Machinery & Propulsion", "Auxiliary Generators", auxEngines, "4-Stroke Auxiliary Diesel", "Parallel Sync Capable"],
    ["Performance & Tankage", "Design Service Speed", Number(serviceSpeed), "Knots", "Deep Water Condition"],
    ["Performance & Tankage", "Daily Fuel Consumption", Number(fuelConsumption), "MT / Day (HFO/VLSFO)", "At Service Speed"],
    ["Performance & Tankage", "Fuel Tank Capacity", Number(fuelCapacity), "Cubic Meters (CBM)", "HFO / MDO Storage"],
    ["Performance & Tankage", "Fresh Water Max Capacity", Number(freshWaterMax), "Metric Tons", "Evaporator Supplemented"],
    ["Certifications", "SOLAS Safety Construction", "VALID", "Class ABS Endorsed", "Annual Survey Completed"],
    ["Certifications", "SOLAS Safety Equipment", "VALID", "Class ABS Endorsed", "LSA/FFA Annual Passed"],
    ["Certifications", "SOLAS Safety Radio", "VALID", "Class ABS Endorsed", "GMDSS Annual Inspection"],
    ["Certifications", "MARPOL Annex I (Oil)", "VALID", "IOPP Certificate", "15 ppm Monitor Calibrated"],
    ["Certifications", "MARPOL Annex IV & VI", "VALID", "ISPP & IAPP Certified", "Tier II NOx Compliant"],
    ["Certifications", "Maritime Labour Convention (MLC)", "VALID", "MLC 2006 Approved", "Crew Living & Working Cert"]
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  autoFitColumns(ws, rows);
  XLSX.utils.book_append_sheet(wb, ws, "Vessel Particulars");

  const filename = `${meta.vesselName.replace(/\s+/g, "_")}_Vessel_Profile_Backup_${meta.dateStr}.xlsx`;
  XLSX.writeFile(wb, filename);
  return filename;
}

/**
 * 2. DEPARTMENTS & CREW BACKUP
 */
export function exportDepartmentsCrewBackup(customOpts?: ExportOptions): string {
  const meta = getSystemMetadata(customOpts);
  const wb = XLSX.utils.book_new();

  // Read saved crew or fallback
  let crewList: any[] = [];
  try {
    const saved = localStorage.getItem("sms_crewList");
    if (saved) crewList = JSON.parse(saved);
  } catch (e) {
    console.error(e);
  }

  if (!Array.isArray(crewList) || crewList.length === 0) {
    crewList = [
      { rank: "Master", name: "Capt. Alexander Sterling", department: "Deck", nationality: "British 🇬🇧", seafarerId: "GBR-88412-M", defaultWatch: "Daywork", watchLabel: "Master On-Call / Executive Command" },
      { rank: "Chief Officer", name: "Mateo Rodriguez", department: "Deck", nationality: "Spanish 🇪🇸", seafarerId: "ESP-91823-O", defaultWatch: "0400-0800", watchLabel: "04:00-08:00 & 16:00-20:00 Watch" },
      { rank: "Second Officer", name: "Yuki Tanaka", department: "Deck", nationality: "Filipino 🇵🇭", seafarerId: "PHL-55291-O", defaultWatch: "0000-0400", watchLabel: "00:00-04:00 & 12:00-16:00 Watch" },
      { rank: "Third Officer", name: "Dmitry Ivanov", department: "Deck", nationality: "Ukrainian 🇺🇦", seafarerId: "UKR-77291-O", defaultWatch: "0800-1200", watchLabel: "08:00-12:00 & 20:00-24:00 Watch" },
      { rank: "Deck Cadet", name: "James Collins", department: "Deck", nationality: "Filipino 🇵🇭", seafarerId: "PHL-44182-C", defaultWatch: "Training Watch", watchLabel: "STCW TRB Sea Training" },
      { rank: "Bosun", name: "Arnel Pineda", department: "Deck", nationality: "Filipino 🇵🇭", seafarerId: "PHL-66128-R", defaultWatch: "Daywork", watchLabel: "Deck Maintenance & Anchor Station" },
      { rank: "Able Seaman (AB)", name: "Esteban Santos", department: "Deck", nationality: "Filipino 🇵🇭", seafarerId: "PHL-66129-R", defaultWatch: "0000-0400", watchLabel: "Helmsman & Bridge Lookout" },
      { rank: "Ordinary Seaman (OS)", name: "Muhammad Ali", department: "Deck", nationality: "Indonesian 🇮🇩", seafarerId: "IDN-33291-R", defaultWatch: "0800-1200", watchLabel: "Deck Maintenance & Lookout" },
      { rank: "Chief Engineer", name: "Hans Becker", department: "Engine", nationality: "German 🇩🇪", seafarerId: "DEU-44192-E", defaultWatch: "Daywork", watchLabel: "Chief Engineer Overall Technical" },
      { rank: "Second Engineer", name: "Klaus Schmidt", department: "Engine", nationality: "German 🇩🇪", seafarerId: "DEU-44193-E", defaultWatch: "0400-0800", watchLabel: "Engine Watch 04:00-08:00 & 16:00-20:00" },
      { rank: "Third Engineer", name: "Chen Wei", department: "Engine", nationality: "Chinese 🇨🇳", seafarerId: "CHN-11928-E", defaultWatch: "0000-0400", watchLabel: "Engine Watch 00:00-04:00 & 12:00-16:00" },
      { rank: "Electro-Technical Officer (ETO)", name: "Igor Smirnov", department: "Engine", nationality: "Russian 🇷🇺", seafarerId: "RUS-88219-E", defaultWatch: "Daywork", watchLabel: "High-Voltage Automation & Nav Comms" },
      { rank: "Chief Cook", name: "Antonio Banderas", department: "Catering", nationality: "Filipino 🇵🇭", seafarerId: "PHL-99214-C", defaultWatch: "Galley Hours", watchLabel: "Galley Provisions & Nutrition Management" },
      { rank: "Steward", name: "Reynaldo Cruz", department: "Catering", nationality: "Filipino 🇵🇭", seafarerId: "PHL-99215-C", defaultWatch: "Mess Hours", watchLabel: "Messroom & Accommodation Sanitary" }
    ];
  }

  // Sheet 1: Active Roster
  const rosterRows: (string | number)[][] = [
    ...createHeaderBlock("Department Directory & Crew Manning Roster", meta),
    [
      "NO.",
      "DEPARTMENT",
      "RANK / DESIGNATION",
      "FULL LEGAL NAME",
      "SEAFARER ID / CDC",
      "NATIONALITY",
      "DEFAULT WATCH ROTATION",
      "WATCH ROLE ASSIGNMENT",
      "ACTIVE USER (ME)",
      "STATUS ONBOARD"
    ]
  ];

  crewList.forEach((c, idx) => {
    rosterRows.push([
      idx + 1,
      c.department || "Deck",
      c.rank || "Rating",
      c.name || "Unassigned Seafarer",
      c.seafarerId || "N/A",
      c.nationality || "N/A",
      c.defaultWatch || "Daywork",
      c.watchLabel || "General Sea Duties",
      c.isMe ? "YES (Active User)" : "NO",
      "Signed-On & Valid CDC"
    ]);
  });

  const wsRoster = XLSX.utils.aoa_to_sheet(rosterRows);
  autoFitColumns(wsRoster, rosterRows);
  XLSX.utils.book_append_sheet(wb, wsRoster, "Active Crew Roster");

  // Sheet 2: Department Routine Duties
  const dutiesRows: (string | number)[][] = [
    ...createHeaderBlock("Crew Work-Rest Operational Duties", meta),
    ["DEPARTMENT", "RANK", "DUTY TIME RANGE", "DETAILED OPERATIONAL DUTY DESCRIPTION"]
  ];

  crewList.forEach(c => {
    if (Array.isArray(c.duties) && c.duties.length > 0) {
      c.duties.forEach((d: any) => {
        dutiesRows.push([c.department, c.rank, d.timeRange || "08:00 - 17:00", d.description || "Routine maintenance and shipboard duties."]);
      });
    } else {
      dutiesRows.push([c.department, c.rank, "08:00 - 17:00", `Standard departmental operations, emergency stations, and maintenance for ${c.rank}.`]);
    }
  });

  const wsDuties = XLSX.utils.aoa_to_sheet(dutiesRows);
  autoFitColumns(wsDuties, dutiesRows);
  XLSX.utils.book_append_sheet(wb, wsDuties, "Department Duties");

  const filename = `${meta.vesselName.replace(/\s+/g, "_")}_Departments_Crew_Backup_${meta.dateStr}.xlsx`;
  XLSX.writeFile(wb, filename);
  return filename;
}

/**
 * 3. BRIDGE WATCHKEEPING BACKUP
 */
export function exportBridgeWatchkeepingBackup(customOpts?: ExportOptions): string {
  const meta = getSystemMetadata(customOpts);
  const wb = XLSX.utils.book_new();

  // Retrieve stored watches
  let watchList: any[] = [];
  try {
    const saved = localStorage.getItem("sms_bridge_personal_watches");
    if (saved) watchList = JSON.parse(saved);
  } catch (e) {
    console.error(e);
  }

  // Sheet 1: Complete Watch Schedules & OOW Duty Assignments
  const watchRows: (string | number)[][] = [
    ...createHeaderBlock("Bridge Watchkeeping & Navigational Log", meta),
    [
      "WATCH ID",
      "DATE (YYYY-MM-DD)",
      "START TIME",
      "END TIME",
      "WATCH PERIOD",
      "OFFICER ON WATCH (OOW)",
      "HELMSMAN (RATING)",
      "LOOKOUT (RATING)",
      "LOGGED HOURS",
      "STATUS",
      "CHIEF OFFICER ORDERS",
      "BRIDGE ACTIVITIES & ENTRIES",
      "WEATHER & SEA CONDITIONS"
    ]
  ];

  if (Array.isArray(watchList) && watchList.length > 0) {
    watchList.forEach(w => {
      watchRows.push([
        w.id || "W-ENTRY",
        w.date || "2026-09-27",
        w.startTime || "00:00",
        w.endTime || "04:00",
        w.watchPeriodName || "Middle Watch",
        w.team?.oow || "Designated OOW",
        w.team?.helmsman || "Helmsman",
        w.team?.lookout || "Lookout",
        w.loggedHours || 4,
        (w.status || "scheduled").toUpperCase(),
        w.chiefOfficerAssignment || "Maintain strict look-out, monitor radar, log barometer.",
        w.activities || "Passage watch maintained in compliance with COLREGS & STCW Code.",
        w.weatherConditions || "Wind NE 15kts, Sea slight, Vis 10nm, Baro 1013 hPa"
      ]);
    });
  } else {
    // Standard template rows
    watchRows.push([
      "W-DEMO-001", "2026-09-27", "00:00", "04:00", "Middle Watch (Grave Watch)",
      "2nd Officer (Second Mate) - Yuki Tanaka", "Able Seaman (AB) - Esteban Santos", "Ordinary Seaman (OS) - Muhammad Ali",
      4, "COMPLETED", "Continuous radar plotting, verify parallel index on ECDIS.",
      "Vessel underway on ECDIS route WP 14 to WP 15. Celestial fix verified with Polaris.",
      "Wind ENE 14kts, Sea State 3, Barometer 1014.2 hPa, Vis > 10nm"
    ]);
  }

  const wsWatches = XLSX.utils.aoa_to_sheet(watchRows);
  autoFitColumns(wsWatches, watchRows);
  XLSX.utils.book_append_sheet(wb, wsWatches, "Watchkeeping Schedule");

  // Sheet 2: Pre & Post-Watch Telemetry Logs
  const telemetryRows: (string | number)[][] = [
    ...createHeaderBlock("Pre & Post-Watch Telemetry & Meteorological Logs", meta),
    [
      "WATCH DATE",
      "PERIOD",
      "OOW",
      "TELEMETRY LOG STAGE",
      "SPEED (KTS)",
      "COURSE (°T)",
      "LATITUDE",
      "LONGITUDE",
      "FWD DRAFT (M)",
      "AFT DRAFT (M)",
      "SEA CURRENT (KTS)",
      "CURRENT DIR",
      "WAVE HEIGHT (M)",
      "SWELL (M)",
      "BAROMETER (HPA)",
      "WIND SPEED (KTS)",
      "WIND DIR",
      "TIMESTAMP"
    ]
  ];

  if (Array.isArray(watchList)) {
    watchList.forEach(w => {
      if (w.preWatchTelemetry) {
        const t = w.preWatchTelemetry;
        telemetryRows.push([
          w.date, w.watchPeriodName, w.team?.oow || "OOW", "PRE-WATCH HANDOVER",
          t.speedKnots ?? 15.8, t.courseDegrees ?? 84, t.positionLat || "34° 02.40' N", t.positionLng || "118° 29.70' W",
          t.draftForward ?? 15.2, t.draftAft ?? 15.6, t.seaCurrentSpeed ?? 0.8, t.seaCurrentDirection || "ENE",
          t.waveHeightMeters ?? 1.5, t.swellHeightMeters ?? 2.0, t.barometricPressureHpa ?? 1013.5,
          t.windSpeedKnots ?? 16, t.windDirection || "NE", t.timestamp || `${w.date} ${w.startTime}`
        ]);
      }
      if (w.postWatchTelemetry) {
        const t = w.postWatchTelemetry;
        telemetryRows.push([
          w.date, w.watchPeriodName, w.team?.oow || "OOW", "POST-WATCH RELIEVAL",
          t.speedKnots ?? 15.6, t.courseDegrees ?? 85, t.positionLat || "34° 10.20' N", t.positionLng || "118° 12.10' W",
          t.draftForward ?? 15.2, t.draftAft ?? 15.6, t.seaCurrentSpeed ?? 0.7, t.seaCurrentDirection || "E",
          t.waveHeightMeters ?? 1.4, t.swellHeightMeters ?? 1.8, t.barometricPressureHpa ?? 1014.1,
          t.windSpeedKnots ?? 14, t.windDirection || "ENE", t.timestamp || `${w.date} ${w.endTime}`
        ]);
      }
    });
  }

  // If no detailed telemetry was attached, provide standard baseline record
  if (telemetryRows.length === createHeaderBlock("", meta).length + 1) {
    telemetryRows.push([
      "2026-09-27", "00:00–04:00 Middle Watch", "2nd Officer - Yuki Tanaka", "PRE-WATCH HANDOVER",
      15.8, 84, "34° 02.40' N", "118° 29.70' W", 15.2, 15.6, 0.8, "ENE", 1.5, 2.0, 1013.5, 16, "NE", "2026-09-27 00:00 UTC"
    ]);
  }

  const wsTelemetry = XLSX.utils.aoa_to_sheet(telemetryRows);
  autoFitColumns(wsTelemetry, telemetryRows);
  XLSX.utils.book_append_sheet(wb, wsTelemetry, "Telemetry & Weather Logs");

  // Sheet 3: Duties Total Hours & Sea Service Summary
  const totalHours = (watchList || []).reduce((acc: number, w: any) => acc + (w.loggedHours || 4), 0) || 72;
  const equivSeaDays = (totalHours / 8).toFixed(1);
  const remainingDays = getRemainingContractDays(meta.profile.signOffDate, undefined, meta.profile.signOnDate);
  const estRemainingWatchHours = remainingDays * 8;

  const summaryRows: (string | number)[][] = [
    ...createHeaderBlock("Duties Total Hours & STCW Sea Service Record", meta),
    ["METRIC PARAMETER", "VALUE", "UNIT", "REGULATORY BASIS / FORMULA"],
    ["Candidate Active Profile", meta.profile.fullName || "Yuki Tanaka", "Full Name", "STCW Rule II/1 Seafarer"],
    ["Seafarer ID / CDC", meta.profile.seafarerId || "PHL-55291-O", "Document ID", "Flag State Issued"],
    ["Officer Rank Assigned", meta.profile.rank || "Second Officer", "Deck Department", "Certified Watchkeeper"],
    ["Total Verified OOW Watch Hours", totalHours, "Hours", "Sum of completed bridge watchkeeping shifts"],
    ["Equivalent Sea Service Days", Number(equivSeaDays), "Days", "Standard IMO 8-hour watch day (2 x 4h shifts)"],
    ["Total Watch Shifts Logged", (watchList || []).length || 18, "Shifts", "Verified in Bridge Logbook"],
    ["Contract Sign-On Date", meta.profile.signOnDate || "2026-01-05", "YYYY-MM-DD", "Official Crew Agreement"],
    ["Calculated Sign-Off Date", meta.profile.signOffDate || "2027-01-05", "YYYY-MM-DD", "Contract End Date"],
    ["Contract Duration", meta.profile.contractDurationMonths || 12, "Months", "Standard Cadency / Officer Term"],
    ["Remaining Sea Duty Days", remainingDays, "Days", "Calculated to Sign-Off Date"],
    ["Estimated Remaining Watch Hours", estRemainingWatchHours, "Hours", "Projected at 8h watch per sea day"],
    ["Projected Total Watch Hours at Sign-Off", totalHours + estRemainingWatchHours, "Hours", "Total Expected STCW Sea Service"]
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  autoFitColumns(wsSummary, summaryRows);
  XLSX.utils.book_append_sheet(wb, wsSummary, "Duties Total Hours Summary");

  const filename = `${meta.vesselName.replace(/\s+/g, "_")}_Bridge_Watchkeeping_Backup_${meta.dateStr}.xlsx`;
  XLSX.writeFile(wb, filename);
  return filename;
}

/**
 * 4. DRILLS & TRAINING BACKUP
 */
export function exportDrillsTrainingBackup(customOpts?: ExportOptions): string {
  const meta = getSystemMetadata(customOpts);
  const wb = XLSX.utils.book_new();

  // Retrieve stored safety drills or fallback
  let drills: any[] = [];
  try {
    const saved = localStorage.getItem("sms_safety_drills");
    if (saved) drills = JSON.parse(saved);
  } catch (e) {
    console.error(e);
  }

  if (!Array.isArray(drills) || drills.length === 0) {
    drills = [
      { id: "abandon-ship", name: "Abandon Ship Drill", responsibility: "Master & Chief Officer", periodMonths: 1, lastConducted: "2026-06-15", nextDue: "2026-07-15", description: "SOLAS emergency muster, donning lifejackets, lifeboat davit swinging.", time: "10:00", status: "Pending" },
      { id: "fire-drill", name: "Fire Drill", responsibility: "Chief Officer & 3rd Officer", periodMonths: 1, lastConducted: "2026-06-12", nextDue: "2026-07-12", description: "Simulating fire squad muster, hose runs, SCBA checks, boundary cooling.", time: "14:00", status: "Done" },
      { id: "enclosed-space", name: "Enclosed Space Entry & Rescue", responsibility: "Chief Officer & Chief Engineer", periodMonths: 2, lastConducted: "2026-05-20", nextDue: "2026-07-20", description: "Atmospheric multi-gas pre-testing, harness rescue simulation from cargo hold.", time: "09:00", status: "Done" },
      { id: "emergency-steering", name: "Emergency Steering Drill", responsibility: "2nd Engineer & 2nd Officer", periodMonths: 3, lastConducted: "2026-04-18", nextDue: "2026-07-18", description: "Bridge control failure switchover to manual hydraulic controls at Steering Flat.", time: "11:00", status: "Done" },
      { id: "sopep", name: "SOPEP / Oil Spill Drill", responsibility: "Chief Officer & 2nd Engineer", periodMonths: 3, lastConducted: "2026-04-05", nextDue: "2026-07-05", description: "Bunker deck overflow response, scupper plugs, absorbent booms deployment.", time: "15:00", status: "Done" },
      { id: "isps-security", name: "ISPS Security Drill", responsibility: "Ship Security Officer (SSO)", periodMonths: 3, lastConducted: "2026-05-02", nextDue: "2026-08-02", description: "Unauthorized access defense, citadel lockouts, security level 2 verification.", time: "16:00", status: "Pending" }
    ];
  }

  // Sheet 1: Drills Schedule & Compliance
  const drillRows: (string | number)[][] = [
    ...createHeaderBlock("SOLAS Mandatory Safety Drills & Training Schedule", meta),
    [
      "DRILL CODE",
      "DRILL TITLE",
      "PERIODICITY (MONTHS)",
      "RESPONSIBLE OFFICER",
      "LAST CONDUCTED",
      "NEXT DUE DATE",
      "SCHEDULED TIME",
      "STATUS",
      "REGULATORY SOLAS DESCRIPTION"
    ]
  ];

  drills.forEach(d => {
    drillRows.push([
      d.id || "DRILL",
      d.name || "Safety Drill",
      d.periodMonths || 1,
      d.responsibility || "Chief Officer",
      d.lastConducted || "2026-06-01",
      d.nextDue || "2026-07-01",
      d.time || "10:00",
      (d.status || "Pending").toUpperCase(),
      d.description || "SOLAS Chapter III Regulation 19 Compliance."
    ]);
  });

  const wsDrills = XLSX.utils.aoa_to_sheet(drillRows);
  autoFitColumns(wsDrills, drillRows);
  XLSX.utils.book_append_sheet(wb, wsDrills, "Safety Drills Schedule");

  // Sheet 2: Execution Logs & Exercise Records
  const logRows: (string | number)[][] = [
    ...createHeaderBlock("Drill Execution Logs & Crew Participation Roster", meta),
    [
      "DRILL TITLE",
      "DATE CONDUCTED",
      "POB MUSTER COUNT",
      "SUPERVISING OFFICER",
      "REGULATORY COMPLIANCE REMARKS",
      "OUTCOME / EVALUATION"
    ]
  ];

  drills.filter(d => d.status === "Done").forEach(d => {
    logRows.push([
      d.name,
      d.lastConducted,
      22,
      d.responsibility.split("&")[0].trim(),
      `Satisfactory performance under SOLAS III/19. All emergency stations manned within 4 minutes. ${d.description}`,
      "SATISFACTORY / EXERCISED"
    ]);
  });

  const wsLogs = XLSX.utils.aoa_to_sheet(logRows);
  autoFitColumns(wsLogs, logRows);
  XLSX.utils.book_append_sheet(wb, wsLogs, "Drill Execution Logs");

  const filename = `${meta.vesselName.replace(/\s+/g, "_")}_Drills_Training_Backup_${meta.dateStr}.xlsx`;
  XLSX.writeFile(wb, filename);
  return filename;
}

/**
 * 5. CADET REPORT & TASK BACKUP
 */
export function exportCadetTasksBackup(customOpts?: ExportOptions): string {
  const meta = getSystemMetadata(customOpts);
  const wb = XLSX.utils.book_new();

  // Retrieve cadet tasks
  const tasks = getStoredCadetTasks();
  const currentDuration = meta.profile.contractDurationMonths || 12;
  const currentSignOn = meta.profile.signOnDate || "2026-01-05";

  // Sheet 1: STCW TRB Task Log
  const taskRows: (string | number)[][] = [
    ...createHeaderBlock("STCW Onboard Training Record Book (TRB) Task Log", meta),
    [
      "TASK ID",
      "ROTATION PHASE",
      "TASK TITLE / MODULE",
      "ASSIST DUTIES DESCRIPTION (SUPERVISED SPECIFIC TASKS)",
      "STEP-BY-STEP OPERATIONAL DETAILS",
      "DATE (YYYY-MM-DD)",
      "HOURS LOGGED",
      "SHIP LOCATION",
      "STATUS",
      "TRB REF CODE",
      "SUPERVISING OFFICER / MENTOR",
      "OFFICER EVALUATION REMARKS",
      "DOCUMENTATION ATTACHED",
      "ATTACHMENT LABEL"
    ]
  ];

  tasks.forEach(t => {
    const phaseInfo = ROTATION_PHASES[t.phase];
    taskRows.push([
      t.id,
      phaseInfo ? phaseInfo.name : t.phase,
      t.title,
      t.assistDescription || "Assisted supervising officer with critical shipboard operations.",
      t.description || "Standard task execution under supervision.",
      t.date,
      t.hoursSpent || 4,
      t.location || "Deck / Bridge",
      t.status,
      t.trbReference || "STCW II/1",
      t.officerMentor || (phaseInfo ? phaseInfo.mentorTitle : "Chief Officer"),
      t.officerRemarks || "Competency demonstrated satisfactorily in compliance with STCW Table A-II/1.",
      t.documentationUrl ? "YES (Evidence Uploaded)" : "NO",
      t.documentationName || "N/A"
    ]);
  });

  const wsTasks = XLSX.utils.aoa_to_sheet(taskRows);
  autoFitColumns(wsTasks, taskRows);
  XLSX.utils.book_append_sheet(wb, wsTasks, "Cadet TRB Task Log");

  // Sheet 2: 4-Phase Rotation Summary
  const phaseRows: (string | number)[][] = [
    ...createHeaderBlock("Cadet 4-Phase Rotation Syllabus & STCW Sign-Off Summary", meta),
    [
      "PHASE KEY",
      "ROTATION PHASE TITLE",
      "PERIOD",
      "ROTATION WINDOW DATES",
      "FOCUS SYLLABUS AREA",
      "SUPERVISING MENTOR",
      "STCW REGULATION",
      "TOTAL TASKS",
      "APPROVED BY OFFICER",
      "COMPLETED",
      "IN PROGRESS",
      "PENDING REVIEW",
      "TOTAL HOURS LOGGED",
      "COMPLETION %"
    ]
  ];

  (["bosun_assist", "third_officer_assist", "second_officer_assist", "chief_officer_assist"] as const).forEach(pkey => {
    const pInfo = ROTATION_PHASES[pkey];
    const pDates = getDynamicPhaseDates(pkey, currentSignOn, currentDuration);
    const pTasks = tasks.filter(t => t.phase === pkey);
    const approved = pTasks.filter(t => t.status === "Approved by Officer").length;
    const completed = pTasks.filter(t => t.status === "Completed").length;
    const inProgress = pTasks.filter(t => t.status === "In Progress").length;
    const pending = pTasks.filter(t => t.status === "Pending Review").length;
    const hours = pTasks.reduce((sum, t) => sum + (t.hoursSpent || 0), 0);
    const pct = pTasks.length > 0 ? Math.round((approved / pTasks.length) * 100) : 0;

    phaseRows.push([
      pkey,
      pInfo.name,
      pDates.periodLabel,
      pDates.dateRangeLabel,
      pInfo.focusArea,
      pInfo.mentorTitle,
      pInfo.stcwReference,
      pTasks.length,
      approved,
      completed,
      inProgress,
      pending,
      hours,
      `${pct}%`
    ]);
  });

  const wsPhases = XLSX.utils.aoa_to_sheet(phaseRows);
  autoFitColumns(wsPhases, phaseRows);
  XLSX.utils.book_append_sheet(wb, wsPhases, "Phase Rotation Summary");

  const filename = `${meta.vesselName.replace(/\s+/g, "_")}_Cadet_Report_Tasks_Backup_${meta.dateStr}.xlsx`;
  XLSX.writeFile(wb, filename);
  return filename;
}

/**
 * 6. VOYAGE PLANNING BACKUP (Port-to-Port Voyage Records & History)
 */
export function exportVoyagePlanningBackup(customOpts?: ExportOptions): string {
  const meta = getSystemMetadata(customOpts);
  const wb = XLSX.utils.book_new();

  // Retrieve stored voyages or fallback
  let voyages: any[] = [];
  try {
    const saved = localStorage.getItem("sms_voyage_records");
    if (saved) {
      voyages = JSON.parse(saved);
    }
  } catch (e) {
    console.error("Error reading voyages for backup:", e);
  }

  if (!Array.isArray(voyages) || voyages.length === 0) {
    // Basic defaults if storage is empty
    voyages = [
      {
        voyageNumber: "V.012-NORTH",
        departurePort: { name: "Port of Los Angeles", country: "United States", locode: "USLAX" },
        arrivalPort: { name: "Port of Tokyo", country: "Japan", locode: "JPTYO" },
        etd: "2026-09-25T08:00",
        atd: "2026-09-25T08:30",
        eta: "2026-10-08T06:00",
        cargoType: "Refrigerated Container Cargo & Agricultural Staples",
        cargoQuantity: 72500,
        cargoUnit: "MT",
        loadingStatus: "Loaded",
        distanceNm: 4820,
        avgSpeedKts: 15.8,
        status: "In Transit",
        masterName: "Capt. Alexander Sterling",
        chiefOfficerName: "Mateo Rodriguez",
        remarks: "Active voyage en route. Great Circle navigation via northern Pacific corridor."
      }
    ];
  }

  // Sheet 1: Port-to-Port Voyages Log
  const voyageRows: (string | number)[][] = [
    ...createHeaderBlock("Port-to-Port Voyage Records & Navigation Log", meta),
    [
      "VOYAGE ID",
      "STATUS",
      "DEPARTURE PORT",
      "DEP COUNTRY",
      "DEP UN/LOCODE",
      "DESTINATION PORT",
      "ARR COUNTRY",
      "ARR UN/LOCODE",
      "ETD (ESTIMATED DEPARTURE)",
      "ATD (ACTUAL DEPARTURE)",
      "ETA (ESTIMATED ARRIVAL)",
      "ATA (ACTUAL ARRIVAL)",
      "CARGO TYPE",
      "QUANTITY",
      "UNIT",
      "LOADING STATUS",
      "DISTANCE (NM)",
      "AVG SPEED (KTS)",
      "EST. STEAMING (HRS)",
      "MASTER",
      "CHIEF OFFICER",
      "OPERATIONAL REMARKS"
    ]
  ];

  voyages.forEach(v => {
    const steamingHours = v.avgSpeedKts > 0 ? (v.distanceNm / v.avgSpeedKts).toFixed(1) : "N/A";
    voyageRows.push([
      v.voyageNumber || "VOY-ENTRY",
      (v.status || "Planned").toUpperCase(),
      v.departurePort?.name || "Departure Port",
      v.departurePort?.country || "N/A",
      v.departurePort?.locode || "N/A",
      v.arrivalPort?.name || "Arrival Port",
      v.arrivalPort?.country || "N/A",
      v.arrivalPort?.locode || "N/A",
      v.etd ? v.etd.replace("T", " ") : "N/A",
      v.atd ? v.atd.replace("T", " ") : "N/A",
      v.eta ? v.eta.replace("T", " ") : "N/A",
      v.ata ? v.ata.replace("T", " ") : "N/A",
      v.cargoType || "General Cargo",
      v.cargoQuantity ?? 0,
      v.cargoUnit || "MT",
      v.loadingStatus || "Loaded",
      v.distanceNm || 0,
      v.avgSpeedKts || 15.0,
      steamingHours,
      v.masterName || "Master",
      v.chiefOfficerName || "Chief Officer",
      v.remarks || "SOLAS Passage Plan Compliant."
    ]);
  });

  const wsVoyages = XLSX.utils.aoa_to_sheet(voyageRows);
  autoFitColumns(wsVoyages, voyageRows);
  XLSX.utils.book_append_sheet(wb, wsVoyages, "Port-to-Port Voyages");

  // Sheet 2: Voyage & Port Statistics Summary
  const totalCompleted = voyages.filter(v => v.status === "Completed").length;
  const inTransitCount = voyages.filter(v => v.status === "In Transit").length;
  const totalDist = voyages.reduce((sum, v) => sum + (v.distanceNm || 0), 0);
  const completedDist = voyages.filter(v => v.status === "Completed").reduce((sum, v) => sum + (v.distanceNm || 0), 0);

  // Port frequency
  const portFreq: Record<string, number> = {};
  voyages.forEach(v => {
    const dep = `${v.departurePort?.name} (${v.departurePort?.locode || "PORT"})`;
    const arr = `${v.arrivalPort?.name} (${v.arrivalPort?.locode || "PORT"})`;
    portFreq[dep] = (portFreq[dep] || 0) + 1;
    portFreq[arr] = (portFreq[arr] || 0) + 1;
  });
  const sortedPorts = Object.entries(portFreq).sort((a, b) => b[1] - a[1]);

  const summaryRows: (string | number)[][] = [
    ...createHeaderBlock("Voyage Fleet Analytics & Port Frequency Summary", meta),
    ["METRIC / SUMMARY PARAMETER", "VALUE", "SPECIFICATION / BASIS"],
    ["Total Port-to-Port Voyages Logged", voyages.length, "Recorded in SMS Voyage History"],
    ["Total Voyages Completed", totalCompleted, "Final Discharge & Port Clearance Signed"],
    ["Active In-Transit Voyages", inTransitCount, "Underway at Sea on Deep-Sea Passage"],
    ["Total Distance Logged", `${totalDist.toLocaleString()} NM`, "Cumulative Steaming Mileage"],
    ["Completed Distance Logged", `${completedDist.toLocaleString()} NM`, "Distance for Finalized Voyages"],
    ["Top Port Call 1", sortedPorts[0] ? `${sortedPorts[0][0]} - ${sortedPorts[0][1]} calls` : "N/A", "Most Frequented Port"],
    ["Top Port Call 2", sortedPorts[1] ? `${sortedPorts[1][0]} - ${sortedPorts[1][1]} calls` : "N/A", "Second Most Frequented"],
    ["Top Port Call 3", sortedPorts[2] ? `${sortedPorts[2][0]} - ${sortedPorts[2][1]} calls` : "N/A", "Third Most Frequented"],
    ["Vessel Operational Status", "COMMERCIAL PASSAGE", "Compliant with SOLAS V/34 Passage Planning"]
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  autoFitColumns(wsSummary, summaryRows);
  XLSX.utils.book_append_sheet(wb, wsSummary, "Voyage Summary Stats");

  const filename = `${meta.vesselName.replace(/\s+/g, "_")}_Voyage_Planning_Backup_${meta.dateStr}.xlsx`;
  XLSX.writeFile(wb, filename);
  return filename;
}
