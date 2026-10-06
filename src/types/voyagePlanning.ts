export type VoyageStatus = "Planned" | "In Transit" | "Completed" | "Delayed";

export type CargoLoadingStatus = "Loaded" | "In Ballast" | "Partially Loaded" | "Discharging" | "Loading";

export interface PortDetails {
  name: string;
  country: string;
  locode: string; // UN/LOCODE, e.g. SGSIN, USLAX, JPTYO, NLRTM
  flag?: string;
}

export interface VoyageRecord {
  id: string;
  voyageNumber: string; // e.g. "V.012-NORTH"
  departurePort: PortDetails;
  arrivalPort: PortDetails;
  etd: string; // YYYY-MM-DD or YYYY-MM-DDTHH:mm
  atd?: string;
  eta: string;
  ata?: string;
  cargoType: string; // e.g. "Containerized General Cargo"
  cargoQuantity: number; // e.g. 72500
  cargoUnit: string; // "MT", "TEU", "CBM", "BBL"
  loadingStatus: CargoLoadingStatus;
  distanceNm: number; // Nautical Miles
  avgSpeedKts: number; // Knots
  status: VoyageStatus;
  masterName?: string;
  chiefOfficerName?: string;
  remarks?: string;
  bunkerConsumedMt?: number;
  createdAt: string;
  updatedAt: string;
}

export const POPULAR_WORLD_PORTS: PortDetails[] = [
  { name: "Port of Singapore", country: "Singapore", locode: "SGSIN", flag: "🇸🇬" },
  { name: "Port of Los Angeles", country: "United States", locode: "USLAX", flag: "🇺🇸" },
  { name: "Port of Tokyo", country: "Japan", locode: "JPTYO", flag: "🇯🇵" },
  { name: "Port of Rotterdam", country: "Netherlands", locode: "NLRTM", flag: "🇳🇱" },
  { name: "Port of Shanghai", country: "China", locode: "CNSHA", flag: "🇨🇳" },
  { name: "Port of Busan", country: "South Korea", locode: "KRPUS", flag: "🇰🇷" },
  { name: "Port of Yokohama", country: "Japan", locode: "JPYOK", flag: "🇯🇵" },
  { name: "Port of Hamburg", country: "Germany", locode: "DEHAM", flag: "🇩🇪" },
  { name: "Port of Antwerp", country: "Belgium", locode: "BEANR", flag: "🇧🇪" },
  { name: "Port of Jebel Ali / Dubai", country: "United Arab Emirates", locode: "AEJEA", flag: "🇦🇪" },
  { name: "Port of Houston", country: "United States", locode: "USHOU", flag: "🇺🇸" },
  { name: "Port of Santos", country: "Brazil", locode: "BRSSZ", flag: "🇧🇷" },
  { name: "Port of Tanjung Pelepas", country: "Malaysia", locode: "MYTPP", flag: "🇲🇾" },
  { name: "Port of Manila", country: "Philippines", locode: "PHMNL", flag: "🇵🇭" },
  { name: "Port of Sydney", country: "Australia", locode: "AUSYD", flag: "🇦🇺" },
  { name: "Port of Felixstowe", country: "United Kingdom", locode: "GBFXT", flag: "🇬🇧" }
];

export const DEFAULT_VOYAGES: VoyageRecord[] = [
  {
    id: "voy-009",
    voyageNumber: "V.009-BALLAST",
    departurePort: { name: "Yokohama", country: "Japan", locode: "JPYOK", flag: "🇯🇵" },
    arrivalPort: { name: "Port of Singapore", country: "Singapore", locode: "SGSIN", flag: "🇸🇬" },
    etd: "2026-04-12T08:00",
    atd: "2026-04-12T09:15",
    eta: "2026-04-21T18:00",
    ata: "2026-04-21T17:40",
    cargoType: "Segregated Clean Ballast Water",
    cargoQuantity: 0,
    cargoUnit: "MT",
    loadingStatus: "In Ballast",
    distanceNm: 2900,
    avgSpeedKts: 16.0,
    status: "Completed",
    masterName: "Capt. Alexander Sterling",
    chiefOfficerName: "Mateo Rodriguez",
    remarks: "Repositioning passage to Singapore for scheduled container loading operations. Heavy weather avoided off Taiwan.",
    bunkerConsumedMt: 348.0,
    createdAt: "2026-04-10T10:00:00Z",
    updatedAt: "2026-04-22T08:00:00Z"
  },
  {
    id: "voy-010",
    voyageNumber: "V.010-WEST",
    departurePort: { name: "Port of Singapore", country: "Singapore", locode: "SGSIN", flag: "🇸🇬" },
    arrivalPort: { name: "Port of Rotterdam", country: "Netherlands", locode: "NLRTM", flag: "🇳🇱" },
    etd: "2026-05-10T14:00",
    atd: "2026-05-10T14:30",
    eta: "2026-06-04T12:00",
    ata: "2026-06-05T06:00",
    cargoType: "Containerized High-Tech Electronics & Consumer Cargo",
    cargoQuantity: 68500,
    cargoUnit: "MT",
    loadingStatus: "Loaded",
    distanceNm: 8350,
    avgSpeedKts: 15.2,
    status: "Completed",
    masterName: "Capt. Alexander Sterling",
    chiefOfficerName: "Mateo Rodriguez",
    remarks: "Cape of Good Hope transit with optimized sea margin. All container twistlocks and lashing inspected daily.",
    bunkerConsumedMt: 1002.0,
    createdAt: "2026-05-08T12:00:00Z",
    updatedAt: "2026-06-06T14:00:00Z"
  },
  {
    id: "voy-011",
    voyageNumber: "V.011-EAST",
    departurePort: { name: "Port of Rotterdam", country: "Netherlands", locode: "NLRTM", flag: "🇳🇱" },
    arrivalPort: { name: "Port of Los Angeles", country: "United States", locode: "USLAX", flag: "🇺🇸" },
    etd: "2026-06-18T10:00",
    atd: "2026-06-18T10:45",
    eta: "2026-07-06T16:00",
    ata: "2026-07-06T18:30",
    cargoType: "Machinery, Automotive Parts & Packaged Chemicals",
    cargoQuantity: 54200,
    cargoUnit: "MT",
    loadingStatus: "Loaded",
    distanceNm: 5600,
    avgSpeedKts: 14.8,
    status: "Completed",
    masterName: "Capt. Alexander Sterling",
    chiefOfficerName: "Mateo Rodriguez",
    remarks: "Trans-Atlantic crossing to Panama Canal transit and onward to San Pedro Bay. Pilotage smooth.",
    bunkerConsumedMt: 672.0,
    createdAt: "2026-06-15T09:00:00Z",
    updatedAt: "2026-07-07T11:00:00Z"
  },
  {
    id: "voy-012",
    voyageNumber: "V.012-NORTH",
    departurePort: { name: "Port of Los Angeles", country: "United States", locode: "USLAX", flag: "🇺🇸" },
    arrivalPort: { name: "Port of Tokyo", country: "Japan", locode: "JPTYO", flag: "🇯🇵" },
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
    remarks: "Active voyage en route. Great Circle navigation via northern Pacific corridor. ECDIS route verified.",
    bunkerConsumedMt: 420.0,
    createdAt: "2026-09-22T08:00:00Z",
    updatedAt: "2026-10-03T18:00:00Z"
  },
  {
    id: "voy-013",
    voyageNumber: "V.013-ASIA",
    departurePort: { name: "Port of Tokyo", country: "Japan", locode: "JPTYO", flag: "🇯🇵" },
    arrivalPort: { name: "Port of Shanghai", country: "China", locode: "CNSHA", flag: "🇨🇳" },
    etd: "2026-10-14T10:00",
    eta: "2026-10-18T14:00",
    cargoType: "Commercial Electronics & Auto Assembly Kits",
    cargoQuantity: 38000,
    cargoUnit: "MT",
    loadingStatus: "Partially Loaded",
    distanceNm: 1050,
    avgSpeedKts: 14.5,
    status: "Planned",
    masterName: "Capt. Alexander Sterling",
    chiefOfficerName: "Mateo Rodriguez",
    remarks: "Short sea passage through East China Sea. Typhoon season weather routing monitor scheduled.",
    bunkerConsumedMt: 126.0,
    createdAt: "2026-09-28T11:00:00Z",
    updatedAt: "2026-09-28T11:00:00Z"
  },
  {
    id: "voy-014",
    voyageNumber: "V.014-SOUTH",
    departurePort: { name: "Port of Shanghai", country: "China", locode: "CNSHA", flag: "🇨🇳" },
    arrivalPort: { name: "Port of Singapore", country: "Singapore", locode: "SGSIN", flag: "🇸🇬" },
    etd: "2026-10-24T12:00",
    eta: "2026-10-31T08:00",
    cargoType: "Heavy Steel Coils & Renewable Solar Equipment",
    cargoQuantity: 81000,
    cargoUnit: "MT",
    loadingStatus: "Loaded",
    distanceNm: 2240,
    avgSpeedKts: 15.0,
    status: "Planned",
    masterName: "Capt. Alexander Sterling",
    chiefOfficerName: "Mateo Rodriguez",
    remarks: "Southward passage through South China Sea and Singapore Straits Traffic Separation Scheme (TSS).",
    bunkerConsumedMt: 268.0,
    createdAt: "2026-09-29T14:00:00Z",
    updatedAt: "2026-09-29T14:00:00Z"
  }
];

export function getStoredVoyages(): VoyageRecord[] {
  try {
    const saved = localStorage.getItem("sms_voyage_records");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error("Error reading sms_voyage_records:", e);
  }
  return DEFAULT_VOYAGES;
}

export function saveStoredVoyages(voyages: VoyageRecord[]): void {
  try {
    localStorage.setItem("sms_voyage_records", JSON.stringify(voyages));
    window.dispatchEvent(new CustomEvent("sms_voyages_updated", { detail: voyages }));
  } catch (e) {
    console.error("Error saving sms_voyage_records:", e);
  }
}

export function getVoyageSummaryStats(voyages: VoyageRecord[]) {
  const completed = voyages.filter(v => v.status === "Completed");
  const totalCompletedCount = completed.length;
  const inTransitCount = voyages.filter(v => v.status === "In Transit").length;
  const plannedCount = voyages.filter(v => v.status === "Planned").length;
  const delayedCount = voyages.filter(v => v.status === "Delayed").length;

  const totalDistanceLogged = voyages.reduce((sum, v) => sum + (v.distanceNm || 0), 0);
  const completedDistance = completed.reduce((sum, v) => sum + (v.distanceNm || 0), 0);

  // Compute most frequent ports called
  const portCounts: Record<string, { count: number; name: string; locode: string; flag?: string }> = {};
  voyages.forEach(v => {
    // Departure port call
    const depKey = v.departurePort.locode || v.departurePort.name;
    if (!portCounts[depKey]) {
      portCounts[depKey] = { count: 0, name: v.departurePort.name, locode: v.departurePort.locode, flag: v.departurePort.flag };
    }
    portCounts[depKey].count++;

    // Arrival port call
    const arrKey = v.arrivalPort.locode || v.arrivalPort.name;
    if (!portCounts[arrKey]) {
      portCounts[arrKey] = { count: 0, name: v.arrivalPort.name, locode: v.arrivalPort.locode, flag: v.arrivalPort.flag };
    }
    portCounts[arrKey].count++;
  });

  const sortedPorts = Object.values(portCounts).sort((a, b) => b.count - a.count);

  return {
    totalVoyages: voyages.length,
    totalCompletedCount,
    inTransitCount,
    plannedCount,
    delayedCount,
    totalDistanceLogged,
    completedDistance,
    mostFrequentPorts: sortedPorts.slice(0, 3)
  };
}
