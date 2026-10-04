export type CadetRotationPhase = 
  | "bosun_assist"           // Phase 1: Months 1–3 (Seamanship & Deck Maintenance)
  | "third_officer_assist"   // Phase 2: Months 4–6 (Safety, LSA & FFA Inspections)
  | "second_officer_assist"  // Phase 3: Months 7–9 (Navigational Planning & ECDIS)
  | "chief_officer_assist";  // Phase 4: Months 10–12 (Cargo Operations, Ballast & Stability)

export type CadetTaskStatus = 
  | "Pending Review"
  | "In Progress"
  | "Completed"
  | "Approved by Officer";

export interface CadetTaskItem {
  id: string;
  phase: CadetRotationPhase;
  title: string;                 // Task Title / Module Name
  description: string;           // Task Description (Detailed entry of shipboard tasks performed)
  assistDescription: string;     // Assist Description (Specific duties assisted with under supervision)
  date: string;                  // Task Date (YYYY-MM-DD)
  status: CadetTaskStatus;       // Dropdown status
  documentationName?: string;    // Attachment filename/label
  documentationUrl?: string;     // Attachment image URL or base64
  documentationType?: "image" | "document" | "checklist";
  officerMentor?: string;        // Supervising Officer/Bosun Name
  officerRemarks?: string;       // Officer evaluation remarks
  trbReference?: string;         // STCW TRB Competency Code (e.g. "STCW II/1 - C1.1")
  cadetName: string;
  cadetRank: string;
  cadetId: string;
  hoursSpent?: number;
  location?: string;             // Vessel location (e.g., "Main Deck Portside", "Bridge", "Hold No. 2")
  createdAt: string;
  updatedAt: string;
}

export interface PhaseInfo {
  phase: CadetRotationPhase;
  name: string;
  shortName: string;
  period: string;
  monthRange: [number, number]; // [1, 3] or [4, 6], etc.
  mentorTitle: string;
  focusArea: string;
  iconName: string;
  stcwReference: string;
  milestones: {
    title: string;
    description: string;
    dueMonth: string;
  }[];
}

export const ROTATION_PHASES: Record<CadetRotationPhase, PhaseInfo> = {
  bosun_assist: {
    phase: "bosun_assist",
    name: "Bosun Assist (Months 1–3)",
    shortName: "Phase 1: Bosun Assist",
    period: "Months 1–3",
    monthRange: [1, 3],
    mentorTitle: "Bosun & Chief Officer",
    focusArea: "Practical Seamanship, Mooring, Rigging, Chipping & Painting, Anchor Operations",
    iconName: "Anchor",
    stcwReference: "STCW A-II/1 Section 1: Seamanship & Deck Work",
    milestones: [
      {
        title: "Mooring Winches & Line Handling Safety",
        description: "Snap-back zone avoidance, synthetic mooring line inspection, stopper knots & heaving line throwing proficiency.",
        dueMonth: "Month 1"
      },
      {
        title: "Steel Preservation & Chemical Paint Rigging",
        description: "Needlegun operation, PPE containment, 2-pack epoxy application, rust scale assessment under SOLAS.",
        dueMonth: "Month 2"
      },
      {
        title: "Windlass, Anchor Wash & Bilge Soundings",
        description: "Operating windlass friction brakes, chain locker security checks, manual sounding pipe dips.",
        dueMonth: "Month 3"
      }
    ]
  },
  third_officer_assist: {
    phase: "third_officer_assist",
    name: "3rd Officer Assist (Months 4–6)",
    shortName: "Phase 2: 3rd Officer Assist",
    period: "Months 4–6",
    monthRange: [4, 6],
    mentorTitle: "Third Officer & Safety Officer",
    focusArea: "Life-Saving Appliances (LSA), Fire-Fighting Appliances (FFA), Pyrotechnics, Drill Logging",
    iconName: "Flame",
    stcwReference: "STCW A-II/1 Section 2: Emergency Procedures & LSA/FFA",
    milestones: [
      {
        title: "Weekly Lifeboat & Hydrostatic Release Inspection",
        description: "Air bottles recharge test, painter release hook inspection, HRU validity date recording.",
        dueMonth: "Month 4"
      },
      {
        title: "FFA Extinguishers, SCBA & Breathing Air Quality",
        description: "Monthly pressure gauge inspection, SCBA cylinder hydro-testing dates, fire pump emergency start test.",
        dueMonth: "Month 5"
      },
      {
        title: "Bridge Pyrotechnics & Immersion Suit Regime",
        description: "Expiry checks on rocket parachute flares, smoke floats, line throwers, immersion suit zipper lubrication.",
        dueMonth: "Month 6"
      }
    ]
  },
  second_officer_assist: {
    phase: "second_officer_assist",
    name: "2nd Officer Assist (Months 7–9)",
    shortName: "Phase 3: 2nd Officer Assist",
    period: "Months 7–9",
    monthRange: [7, 9],
    mentorTitle: "Second Officer (Navigational Officer)",
    focusArea: "Passage Planning, ECDIS ENC Updates, Paper Chart Corrections, Navigational Publications, Bridge Watch",
    iconName: "Compass",
    stcwReference: "STCW A-II/1 Section 3: Navigation at the Operational Level",
    milestones: [
      {
        title: "ECDIS Weekly ENC Update & Permit Installation",
        description: "Installing Admiralty Vector Chart Service (AVCS) updates, applying temporary and preliminary (T&P) notices.",
        dueMonth: "Month 7"
      },
      {
        title: "Passage Plan Compilation & Waypoint Route Setting",
        description: "Calculation of wheel-over points, parallel indexing margins, UKC calculation, squatt table verification.",
        dueMonth: "Month 8"
      },
      {
        title: "Celestial Fix, Compass Deviation & GPS Verification",
        description: "Calculating azimuth of the sun, gyro error observations, standard magnetic compass deviation cards.",
        dueMonth: "Month 9"
      }
    ]
  },
  chief_officer_assist: {
    phase: "chief_officer_assist",
    name: "Chief Officer Assist (Months 10–12)",
    shortName: "Phase 4: Chief Officer Assist",
    period: "Months 10–12",
    monthRange: [10, 12],
    mentorTitle: "Chief Officer & Ship Security Officer",
    focusArea: "Cargo Watch, Ballast Water Management, Ship Stability & Trim, Draft Surveys, Permit to Work",
    iconName: "Shield",
    stcwReference: "STCW A-II/1 Section 4: Cargo Handling, Stowage & Ship Stability",
    milestones: [
      {
        title: "Draft Survey & Loading Computer Stability Check",
        description: "Forward, midships, and aft draft readings with density correction, SF & BM calculations against class limits.",
        dueMonth: "Month 10"
      },
      {
        title: "Ballast Water Treatment (BWTS) & D-2 Exchange",
        description: "Ballast pump sequencing, tank soundings, BWMS UV-reactor monitoring, IMO Ballast Logbook entry.",
        dueMonth: "Month 11"
      },
      {
        title: "Permit to Work (PTW) & Enclosed Space Entry Protocol",
        description: "Multi-gas 4-gas detector atmospheric testing (O2, LEL, H2S, CO), ventilation verification, safety sentry.",
        dueMonth: "Month 12"
      }
    ]
  }
};
