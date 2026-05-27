// Shared types for CV formatting (client-safe — no server imports).

export type CVLanguage = "pt" | "en" | "es";

export interface CVData {
  name: string;
  phone: string;
  email: string;
  linkedin: string;
  education: string[];
  qualifications: string[];
  experience: {
    company: string;
    period: string;
    roles: {
      title: string;
      period: string;
      responsibilities: string[];
    }[];
  }[];
  languages: string[];
  compensationPackage: {
    monthlySalary: string;
    annualBonus: string;
    privatePension: string;
    stockOptions: string;
    healthInsurance: string;
    dentalInsurance: string;
    mealVoucher: string;
    foodVoucher: string;
    transportVoucher: string;
    other: string;
  };
  salaryExpectation: string;
  interviewAnalysis: {
    careerHistory: string;
    currentExperienceAndCases: string;
    peopleLeadership: string;
    communicationAndPersonalImpression: string;
    motivation: string;
    whyWeAreRecommending: string;
  };
}
