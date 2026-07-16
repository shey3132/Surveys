import { useState, useEffect } from "react";
import { Survey, SurveyResponse } from "../types";
import { RefreshCw } from "lucide-react";

export default function CleanResults() {
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>("");

  // Get surveyId from URL parameters
  const getSurveyIdFromUrl = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get("surveyId");
  };

  const surveyId = getSurveyIdFromUrl();

  // Countdown timer effect
  useEffect(() => {
    if (!survey || !survey.expiresAt || survey.isOpen === false) {
      setTimeLeft("");
      return;
    }

    const updateTimer = () => {
      const diff = new Date(survey.expiresAt!).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft("הסתיים");
      } else {
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        setTimeLeft(`${minutes}:${seconds < 10 ? "0" : ""}${seconds}`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [survey]);

  useEffect(() => {
    if (!surveyId) {
      setError("לא נבחר מזהה סקר בקישור. יש לוודא שהקישור כולל מזהה סקר תקין.");
      setLoading(false);
      return;
    }

    const fetchSurveyAndResponses = async () => {
      try {
        const [surveysRes, responsesRes] = await Promise.all([
          fetch("/api/surveys"),
          fetch(`/api/surveys/${surveyId}/responses`)
        ]);

        if (surveysRes.ok) {
          const surveys: Survey[] = await surveysRes.json();
          const foundSurvey = surveys.find((s) => s.id === surveyId);
          if (foundSurvey) {
            setSurvey(foundSurvey);
            setError(null);
          } else {
            setError("הסקר המבוקש לא נמצא במערכת.");
          }
        }

        if (responsesRes.ok) {
          const respData: SurveyResponse[] = await responsesRes.json();
          setResponses(respData);
        }
      } catch (err) {
        console.error("Error fetching data for CleanResults:", err);
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch
    fetchSurveyAndResponses();

    // Poll every 2 seconds for real-time live results popping up
    const intervalId = setInterval(fetchSurveyAndResponses, 2000);

    return () => clearInterval(intervalId);
  }, [surveyId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center" dir="rtl">
        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
        <p className="text-sm font-semibold text-slate-500">טוען את דף התוצאות...</p>
      </div>
    );
  }

  if (error || !survey) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center" dir="rtl">
        <div className="bg-white rounded-3xl p-8 max-w-md border border-slate-100 shadow-xl space-y-4">
          <p className="text-lg font-bold text-rose-600">שגיאה</p>
          <p className="text-sm font-medium text-slate-600">{error || "סקר לא נמצא"}</p>
        </div>
      </div>
    );
  }

  const completedResponses = responses.filter((r) => r.completed);
  const totalVotes = completedResponses.length;

  const isOpen = survey.isOpen !== false;
  const isPublished = survey.isPublished === true;

  // Question results generator
  const getQuestionResults = (questionId: string) => {
    const question = survey.questions.find((q) => q.id === questionId);
    if (!question) return null;

    if (question.type === "digits" && question.choices) {
      const counts: Record<string, number> = {};
      question.choices.forEach((c) => {
        counts[c.value] = 0;
      });

      completedResponses.forEach((r) => {
        const val = r.answers[question.paramName];
        if (val !== undefined && counts[val] !== undefined) {
          counts[val] += 1;
        }
      });

      const totalAnswers = Object.values(counts).reduce((a, b) => a + b, 0);

      return question.choices.map((c) => {
        const count = counts[c.value] || 0;
        const pct = totalAnswers > 0 ? Math.round((count / totalAnswers) * 100) : 0;
        return {
          value: c.value,
          label: c.label,
          count,
          pct
        };
      });
    }

    const submissionCount = completedResponses.filter(
      (r) => r.answers[question.paramName] !== undefined
    ).length;

    return {
      type: question.type,
      count: submissionCount
    };
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col items-center justify-center p-4 sm:p-8" dir="rtl">
      <div className="max-w-xl w-full bg-white rounded-3xl p-8 border border-slate-100 shadow-xl space-y-8">
        
        {/* Simple clean state indicator */}
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-black tracking-tight text-slate-800">
            {survey.title}
          </h1>
          <div className="flex flex-col items-center justify-center gap-1">
            <span className={`text-xl font-bold ${isOpen ? "text-emerald-600" : "text-rose-600"}`}>
              {isOpen ? "הסקר פתוח" : "הסקר סגור"}
            </span>
            {isOpen && timeLeft && timeLeft !== "הסתיים" && (
              <div className="mt-2 inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100/60 px-4 py-2 rounded-2xl text-indigo-700">
                <span className="text-xs font-semibold">זמן שנותר להצבעה:</span>
                <span className="font-mono font-black text-base tracking-wider">{timeLeft}</span>
              </div>
            )}
          </div>
        </div>

        {/* Show results only if published */}
        {isPublished ? (
          <div className="space-y-6 pt-6 border-t border-slate-100 animate-fadeIn">
            <div className="bg-indigo-50 border border-indigo-100/50 rounded-2xl p-4 flex justify-between items-center text-indigo-950">
              <span className="text-xs font-bold">תוצאות הסקר (מפורסם בלייב):</span>
              <span className="text-xs font-black font-mono">סה״כ מצביעים: {totalVotes}</span>
            </div>

            <div className="space-y-6">
              {survey.questions.map((q, qIndex) => {
                const results = getQuestionResults(q.id);
                if (!results) return null;

                return (
                  <div key={q.id} className="space-y-3">
                    <h3 className="font-bold text-slate-800 text-sm flex gap-2">
                      <span className="text-indigo-600 font-mono">{qIndex + 1}.</span>
                      <span>{q.text}</span>
                    </h3>

                    {Array.isArray(results) ? (
                      <div className="space-y-2.5 pl-4">
                        {results.map((r) => (
                          <div key={r.value} className="space-y-1">
                            <div className="flex justify-between text-xs font-semibold text-slate-600">
                              <span>{r.label}</span>
                              <span className="font-mono text-slate-500">
                                {r.count} הצבעות ({r.pct}%)
                              </span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                                style={{ width: `${r.pct}%` }}
                              ></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-500 text-center font-medium">
                        התקבלו {results.count} הקלטות קוליות
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center pt-4 text-slate-400 text-xs font-medium">
            התוצאות חסויות כעת ויוצגו כאן כאשר מנהל הסקר יבחר לפרסם אותן.
          </div>
        )}

      </div>
    </div>
  );
}
