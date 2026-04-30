import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { adminSettingsApi } from "../api/adminSettingsApi";

export interface CompanyInfo {
  companyName: string;
  logo?: string;
  timezone: string;
  fiscalYearStart: string;
  workingDays: string[];
  attendancePolicy: {
    officeStartTime: string;
    graceMinutes: number;
    autoClockOutTime: string;
    autoMarkAbsentTime: string;
  };
}

const DEFAULTS: CompanyInfo = {
  companyName: "Employee Portal",
  logo: "",
  timezone: "UTC",
  fiscalYearStart: "January",
  workingDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
  attendancePolicy: {
    officeStartTime: "09:00",
    graceMinutes: 0,
    autoClockOutTime: "19:00",
    autoMarkAbsentTime: "01:00",
  },
};

interface CompanyContextValue extends CompanyInfo {
  refresh: () => Promise<void>;
  isWorkingDay: (date: Date) => boolean;
}

const CompanyContext = createContext<CompanyContextValue>({
  ...DEFAULTS,
  refresh: async () => {},
  isWorkingDay: () => true,
});

const DAY_MAP: Record<number, string> = { 0: "Sun", 1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri", 6: "Sat" };

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [info, setInfo] = useState<CompanyInfo>(() => {
    try {
      const cached = localStorage.getItem("companyInfo");
      if (cached) return { ...DEFAULTS, ...JSON.parse(cached) };
    } catch { /* ignore */ }
    return DEFAULTS;
  });

  const refresh = async () => {
    try {
      const r = await adminSettingsApi.getPublicCompanyInfo();
      const d = r.data.data;
      if (d) {
        const merged: CompanyInfo = {
          companyName: d.companyName || DEFAULTS.companyName,
          logo: d.logo,
          timezone: d.timezone || DEFAULTS.timezone,
          fiscalYearStart: d.fiscalYearStart || DEFAULTS.fiscalYearStart,
          workingDays: d.workingDays?.length ? d.workingDays : DEFAULTS.workingDays,
          attendancePolicy: { ...DEFAULTS.attendancePolicy, ...(d.attendancePolicy || {}) },
        };
        setInfo(merged);
        localStorage.setItem("companyInfo", JSON.stringify(merged));
        if (merged.companyName) document.title = merged.companyName;
      }
    } catch { /* ignore */ }
  };

  useEffect(() => {
    refresh();
    if (info.companyName) document.title = info.companyName;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isWorkingDay = (date: Date) => info.workingDays.includes(DAY_MAP[date.getDay()]);

  return (
    <CompanyContext.Provider value={{ ...info, refresh, isWorkingDay }}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  return useContext(CompanyContext);
}
