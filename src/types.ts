export interface ProvisionsInput {
  freshWaterQty: number;
  freshWaterDailyCons: number;
  freshWaterCapacity: number;
  deepFreezeQty: number;
  deepFreezeDailyCons: number;
  deepFreezeCapacity: number;
  dryProvisionsQty: number;
  dryProvisionsDailyCons: number;
  dryProvisionsCapacity: number;
  pob: number;
  etaDays: number;
}

export interface ProvisionStockAnalysis {
  remainingPercent: number;
  daysRemaining: number;
  isCritical: boolean;
  criticalDate: string;
  safetyMarginDays: number;
}

export interface ProvisionsResponse {
  freshWater: ProvisionStockAnalysis;
  deepFreeze: ProvisionStockAnalysis;
  dryProvisions: ProvisionStockAnalysis;
  overallAssessment: string;
  smcpWarnings: string[];
  smcpRecommendations: string[];
}

export interface CrewScheduleInput {
  operation: string;
  personnel: string[];
  scheduledTime: string;
}

export interface JobDescription {
  rank: string;
  responsibilities: string[];
  solasReference: string;
}

export interface STCWCompliance {
  compliant: boolean;
  explanation: string;
  restHoursCheck: string;
}

export interface CrewScheduleResponse {
  jobDescriptions: JobDescription[];
  stcwCompliance: STCWCompliance;
  deckLogBookEntry: string;
}

export interface SafetyDrillInput {
  drillType: string;
  masterInstruction: string;
  date: string;
}

export interface DrillTimelineItem {
  time: string;
  phase: string;
  action: string;
  smcpCommand: string;
}

export interface DrillOfficialReport {
  title: string;
  drillType: string;
  date: string;
  pob: number;
  summary: string;
  smcpLoggedPhrases: string[];
  status: string;
}

export interface SafetyDrillResponse {
  timeline: DrillTimelineItem[];
  officialReport: DrillOfficialReport;
}
