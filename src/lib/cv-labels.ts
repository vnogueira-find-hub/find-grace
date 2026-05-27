import type { CVLanguage } from "./cv-types";

export const LABELS: Record<
  CVLanguage,
  {
    phone: string;
    email: string;
    linkedin: string;
    education: string;
    qualifications: string;
    experience: string;
    role: string;
    responsibilities: string;
    languages: string;
    compensation: string;
    salaryExpectation: string;
    analysis: string;
    careerHistory: string;
    currentExperienceAndCases: string;
    peopleLeadership: string;
    communication: string;
    motivation: string;
    whyRecommending: string;
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
  }
> = {
  pt: {
    phone: "Telefone",
    email: "Email",
    linkedin: "LinkedIn",
    education: "Formação Acadêmica",
    qualifications: "Qualificações e Certificações",
    experience: "Experiência Profissional",
    role: "Cargo",
    responsibilities: "Principais responsabilidades",
    languages: "Idiomas",
    compensation: "Pacote de Remuneração Detalhado",
    salaryExpectation: "Pretensão Salarial",
    analysis: "Análise de Entrevista",
    careerHistory: "Trajetória/Histórico Profissional",
    currentExperienceAndCases: "Experiência Atual e Cases de Sucesso",
    peopleLeadership: "Liderança de Pessoas",
    communication: "Comunicação e Impressão Pessoal",
    motivation: "Motivação",
    whyRecommending: "Por que Estamos Indicando",
    monthlySalary: "Salário Mensal (R$ e formato – CLT, PJ, Estatutário)",
    annualBonus: "Bônus anual, PPR/PLR e Afins (target e último recebido)",
    privatePension: "Previdência Privada (sim ou não, se possível detalhar)",
    stockOptions: "Stock Options ou outras políticas de retenção",
    healthInsurance: "Assistência Médica",
    dentalInsurance: "Assistência Odontológica",
    mealVoucher: "Vale Refeição",
    foodVoucher: "Vale Alimentação",
    transportVoucher: "Vale Transporte ou Combustível",
    other: "Outros",
  },
  en: {
    phone: "Phone",
    email: "Email",
    linkedin: "LinkedIn",
    education: "Education",
    qualifications: "Qualifications and Certifications",
    experience: "Professional Experience",
    role: "Position",
    responsibilities: "Key responsibilities",
    languages: "Languages",
    compensation: "Detailed Compensation Package",
    salaryExpectation: "Salary Expectation",
    analysis: "Interview Analysis",
    careerHistory: "Career Background",
    currentExperienceAndCases: "Current Experience and Success Cases",
    peopleLeadership: "People Leadership",
    communication: "Communication and Personal Impression",
    motivation: "Motivation",
    whyRecommending: "Why We Are Recommending",
    monthlySalary: "Monthly Salary (currency and format – CLT, PJ, Statutory)",
    annualBonus: "Annual bonus, PPR/PLR and similar (target and last received)",
    privatePension: "Private Pension (yes or no, with details if possible)",
    stockOptions: "Stock Options or other retention policies",
    healthInsurance: "Health Insurance",
    dentalInsurance: "Dental Insurance",
    mealVoucher: "Meal Voucher",
    foodVoucher: "Food Voucher",
    transportVoucher: "Transport or Fuel Voucher",
    other: "Other",
  },
  es: {
    phone: "Teléfono",
    email: "Email",
    linkedin: "LinkedIn",
    education: "Formación Académica",
    qualifications: "Calificaciones y Certificaciones",
    experience: "Experiencia Profesional",
    role: "Cargo",
    responsibilities: "Principales responsabilidades",
    languages: "Idiomas",
    compensation: "Paquete de Remuneración Detallado",
    salaryExpectation: "Pretensión Salarial",
    analysis: "Análisis de Entrevista",
    careerHistory: "Trayectoria/Historial Profesional",
    currentExperienceAndCases: "Experiencia Actual y Casos de Éxito",
    peopleLeadership: "Liderazgo de Personas",
    communication: "Comunicación e Impresión Personal",
    motivation: "Motivación",
    whyRecommending: "Por qué Estamos Recomendando",
    monthlySalary: "Salario Mensual (moneda y formato – CLT, PJ, Estatutario)",
    annualBonus: "Bono anual, PPR/PLR y similares (target y último recibido)",
    privatePension: "Previsión Privada (sí o no, con detalles si es posible)",
    stockOptions: "Stock Options u otras políticas de retención",
    healthInsurance: "Asistencia Médica",
    dentalInsurance: "Asistencia Odontológica",
    mealVoucher: "Vale Comida",
    foodVoucher: "Vale Alimentación",
    transportVoucher: "Vale Transporte o Combustible",
    other: "Otros",
  },
};
