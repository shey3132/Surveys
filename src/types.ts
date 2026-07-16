export interface Question {
  id: string;
  text: string; // The text to be played to the user
  paramName: string; // The parameter name (e.g., Answer1)
  type: 'digits' | 'record' | 'voice';
  minDigits?: number;
  maxDigits?: number;
  choices?: { value: string; label: string }[]; // Mapping of numeric answers to text labels
}

export interface Survey {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  questions: Question[];
  isOpen: boolean; // Managed open/closed status
  isPublished?: boolean; // True if admin published the results to Page 3
  durationMinutes?: number; // Pre-defined duration of timer in minutes
  expiresAt?: string; // ISO String indicating when the survey closes
}

export interface SurveyResponse {
  id: string;
  surveyId: string;
  apiCallId: string;
  apiPhone: string;
  createdAt: string;
  answers: Record<string, string>; // paramName -> answer
  completed: boolean;
  currentQuestionIndex: number; // Tracks where they are in the survey
}

export interface ApiLog {
  id: string;
  surveyId: string;
  apiCallId: string;
  phone: string;
  timestamp: string;
  method: string;
  url: string;
  payload: any;
  response: string;
}
