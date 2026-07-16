import { useState } from "react";
import { Survey, SurveyResponse, ApiLog } from "../types";
import { BarChart3, Users, Clock, Percent, Trash2, ChevronDown, ChevronUp, Terminal, RotateCcw, AlertCircle, FileText } from "lucide-react";

interface ResponseAnalyticsProps {
  survey: Survey | null;
  responses: SurveyResponse[];
  logs: ApiLog[];
  onDeleteResponse: (id: string) => void;
  onClearLogs: () => void;
}

export default function ResponseAnalytics({
  survey,
  responses,
  logs,
  onDeleteResponse,
  onClearLogs,
}: ResponseAnalyticsProps) {
  const [expandedResponse, setExpandedResponse] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<"results" | "logs">("results");

  if (!survey) {
    return (
      <div className="text-center py-12 bg-white rounded-2xl border border-slate-100 shadow-sm" dir="rtl">
        <BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-2" />
        <h3 className="font-bold text-slate-800">בחרו סקר לצפייה באנליטיקה</h3>
        <p className="text-slate-500 text-xs mt-1">בחרו סקר פעיל מרשימת הסקרים כדי לראות את התשובות והלוגים שלו.</p>
      </div>
    );
  }

  // Filter responses/logs for current survey
  const surveyResponses = responses.filter((r) => r.surveyId === survey.id);
  const completedResponses = surveyResponses.filter((r) => r.completed);
  const partialResponses = surveyResponses.filter((r) => !r.completed);

  // Statistics calculations
  const totalCount = surveyResponses.length;
  const completedCount = completedResponses.length;
  const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const toggleExpand = (id: string) => {
    setExpandedResponse(expandedResponse === id ? null : id);
  };

  // Helper to resolve parameter label
  const getAnswerDisplay = (questionId: string, value: string) => {
    const question = survey.questions.find((q) => q.id === questionId || q.paramName === questionId);
    if (!question) return value;

    if (question.type === "record") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-amber-50 text-amber-700 rounded text-xs font-medium">
          🎙️ הקלטת קול (קובץ {value || "Audio"})
        </span>
      );
    }

    if (question.type === "voice") {
      return `🗣️ ${value}`;
    }

    // Check choice translation
    if (question.choices && question.choices.length > 0) {
      const choice = question.choices.find((c) => c.value === value);
      if (choice) {
        return (
          <span className="inline-flex items-center gap-1">
            <span className="font-semibold text-slate-800 font-mono">({value})</span>
            <span>{choice.label}</span>
          </span>
        );
      }
    }

    return value;
  };

  // Choice frequencies generator (for charts)
  const getQuestionChartData = (questionId: string) => {
    const question = survey.questions.find((q) => q.id === questionId);
    if (!question || question.type !== "digits" || !question.choices || question.choices.length === 0) {
      return null;
    }

    const valueCounts: Record<string, number> = {};
    // Initialize with 0 for all defined choices
    question.choices.forEach((c) => {
      valueCounts[c.value] = 0;
    });

    // Count choices
    completedResponses.forEach((r) => {
      const val = r.answers[question.paramName];
      if (val !== undefined) {
        valueCounts[val] = (valueCounts[val] || 0) + 1;
      }
    });

    const totalAnswers = Object.values(valueCounts).reduce((a, b) => a + b, 0);

    return question.choices.map((c) => {
      const count = valueCounts[c.value] || 0;
      const pct = totalAnswers > 0 ? Math.round((count / totalAnswers) * 100) : 0;
      return {
        value: c.value,
        label: c.label,
        count,
        pct
      };
    });
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Title block */}
      <div className="bg-indigo-900 rounded-3xl p-6 text-white shadow-lg shadow-indigo-950/20">
        <span className="text-xs font-bold uppercase tracking-wider bg-indigo-800/80 text-indigo-200 px-2.5 py-1 rounded-full">
          אנליטיקה וסטטיסטיקה
        </span>
        <h2 className="text-xl font-bold mt-2.5">{survey.title}</h2>
        <p className="text-indigo-200 text-xs mt-1 leading-relaxed">
          {survey.description || "סקירה מקיפה של התשובות שהתקבלו במערכת, גרפים מותאמים ולוג התקשרות API ישיר."}
        </p>

        {/* Tab selector */}
        <div className="flex gap-2 mt-6">
          <button
            onClick={() => setActiveSubTab("results")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeSubTab === "results"
                ? "bg-white text-indigo-900 shadow-sm"
                : "bg-indigo-800/50 text-indigo-100 hover:bg-indigo-800"
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            תשובות ודו&quot;חות
          </button>
          <button
            onClick={() => setActiveSubTab("logs")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeSubTab === "logs"
                ? "bg-white text-indigo-900 shadow-sm"
                : "bg-indigo-800/50 text-indigo-100 hover:bg-indigo-800"
            }`}
          >
            <Terminal className="w-4 h-4" />
            לוג פניות שרת (API)
          </button>
        </div>
      </div>

      {activeSubTab === "results" ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-xs font-medium text-slate-400">סה&quot;כ שיחות סקר</span>
                <span className="text-xl font-bold text-slate-800 font-mono">{totalCount}</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                <Percent className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-xs font-medium text-slate-400">אחוז השלמה</span>
                <span className="text-xl font-bold text-emerald-600 font-mono">{completionRate}%</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-xs font-medium text-slate-400">מענים מלאים</span>
                <span className="text-xl font-bold text-blue-600 font-mono">{completedCount}</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-xs font-medium text-slate-400">שיחות חלקיות</span>
                <span className="text-xl font-bold text-amber-600 font-mono">{partialResponses.length}</span>
              </div>
            </div>
          </div>

          {/* Graphical Analytics (Only choice-based digits questions) */}
          <div className="space-y-4">
            <h3 className="font-bold text-slate-800 text-base">התפלגות תשובות (שאלות רב-ברירה)</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {survey.questions
                .filter((q) => q.type === "digits" && q.choices && q.choices.length > 0)
                .map((q) => {
                  const chartData = getQuestionChartData(q.id);
                  if (!chartData) return null;

                  return (
                    <div key={q.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                      <div className="mb-4">
                        <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded font-mono">
                          {q.paramName}
                        </span>
                        <h4 className="font-bold text-slate-800 text-sm mt-1">{q.text}</h4>
                      </div>

                      {completedCount === 0 ? (
                        <div className="text-center py-8 text-slate-400 text-xs">
                          אין עדיין מספיק תשובות מלאות להצגת גרף
                        </div>
                      ) : (
                        <div className="space-y-3.5">
                          {chartData.map((choice) => (
                            <div key={choice.value}>
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="font-medium text-slate-700">
                                  {choice.label} <span className="text-slate-400 font-mono">({choice.value})</span>
                                </span>
                                <span className="font-bold text-slate-600 font-mono">
                                  {choice.count} מענים ({choice.pct}%)
                                </span>
                              </div>
                              {/* Custom CSS Bar chart */}
                              <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                                <div
                                  className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                                  style={{ width: `${choice.pct}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              
              {survey.questions.filter((q) => q.type === "digits" && q.choices && q.choices.length > 0).length === 0 && (
                <div className="md:col-span-2 text-center py-6 bg-slate-50 rounded-xl border text-xs text-slate-500">
                  לא הוגדרו תרגומי מענה (Choices) לאף שאלת הקשת ספרות בסקר זה. הגדירו אותם בעורך כדי לראות כאן גרפים יפים!
                </div>
              )}
            </div>
          </div>

          {/* Individual Responses Feed */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-50">
              <h3 className="font-bold text-slate-800">רשימת משיבים ותשובות פרטניות</h3>
            </div>

            {surveyResponses.length === 0 ? (
              <div className="p-10 text-center text-slate-400 text-xs">
                אין עדיין תשובות מוקלטות בסקר זה. תוכלו לבצע שיחת דמו בסימולטור כדי לראות נתונים כאן מיד!
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {surveyResponses.map((resp) => {
                  const isExpanded = expandedResponse === resp.id;
                  const dateStr = new Date(resp.createdAt).toLocaleString("he-IL");
                  
                  return (
                    <div key={resp.id} className="transition-colors hover:bg-slate-50/50">
                      {/* Row Header */}
                      <div
                        onClick={() => toggleExpand(resp.id)}
                        className="p-4 flex items-center justify-between cursor-pointer gap-3 text-xs"
                      >
                        <div className="flex items-center gap-4">
                          <div>
                            <span className="font-bold text-slate-800 text-sm font-mono block" dir="ltr">
                              {resp.apiPhone}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">{dateStr}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="font-mono text-[10px] text-slate-400 max-w-[120px] truncate" title={resp.apiCallId}>
                            שיחה: {resp.apiCallId.substring(0, 10)}...
                          </span>
                          
                          {resp.completed ? (
                            <span className="bg-emerald-50 text-emerald-700 font-bold px-2.5 py-1 rounded-full text-[10px]">
                              הושלם
                            </span>
                          ) : (
                            <span className="bg-amber-50 text-amber-700 font-bold px-2.5 py-1 rounded-full text-[10px]">
                              חלקי (שאלה {resp.currentQuestionIndex})
                            </span>
                          )}

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteResponse(resp.id);
                            }}
                            className="p-1.5 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="מחק תשובה"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                          {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                        </div>
                      </div>

                      {/* Row Body Details */}
                      {isExpanded && (
                        <div className="p-4 bg-slate-50/70 border-t border-slate-100 text-xs">
                          <h4 className="font-bold text-slate-700 mb-2.5">תשובות שנרשמו:</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            {survey.questions.map((q) => {
                              const answer = resp.answers[q.paramName];
                              return (
                                <div key={q.id} className="bg-white p-3 rounded-xl border border-slate-150 flex flex-col justify-between">
                                  <div className="mb-1.5">
                                    <span className="font-mono font-bold text-indigo-600 text-[10px] block">
                                      {q.paramName}
                                    </span>
                                    <span className="text-slate-500 font-medium text-[11px] leading-tight line-clamp-1">
                                      {q.text}
                                    </span>
                                  </div>
                                  <div className="font-medium text-slate-800 mt-1">
                                    {answer !== undefined ? getAnswerDisplay(q.id, answer) : <span className="text-slate-300 italic">לא נענה</span>}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      ) : (
        /* Webhook Request Logs View */
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-50 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800">לוג קריאות API ישיר מימות המשיח</h3>
              <p className="text-slate-500 text-xs mt-0.5">מעקב בזמן אמת אחר הבקשות שנשלחות מהמערכת הטלפונית לשרת שלכם</p>
            </div>
            {logs.length > 0 && (
              <button
                onClick={onClearLogs}
                className="px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-medium flex items-center gap-1 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                נקה לוגים
              </button>
            )}
          </div>

          {logs.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-xs">
              אין עדיין בקשות API רשומות. הפעילו את סימולטור השיחות כדי לייצר תעבורה ולראות אותה כאן!
            </div>
          ) : (
            <div className="p-5 space-y-4">
              {logs.map((log) => {
                const dateStr = new Date(log.timestamp).toLocaleTimeString("he-IL");
                return (
                  <div key={log.id} className="border border-slate-200 rounded-xl overflow-hidden font-mono text-xs">
                    {/* Log Header */}
                    <div className="bg-slate-50 px-4 py-2.5 flex flex-wrap items-center justify-between border-b border-slate-200 gap-2">
                      <div className="flex items-center gap-3">
                        <span className="bg-indigo-600 text-white font-bold px-1.5 py-0.5 rounded text-[10px]">
                          {log.method}
                        </span>
                        <span className="font-bold text-slate-700 text-left" dir="ltr">
                          {log.url}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-slate-500 text-[10px]">
                        <span>טלפון: {log.phone}</span>
                        <span>שעה: {dateStr}</span>
                      </div>
                    </div>

                    {/* Log Content */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 bg-slate-950 text-slate-200 p-4 gap-4 text-left" dir="ltr">
                      {/* Left: Input Payload */}
                      <div>
                        <div className="text-slate-400 border-b border-slate-800 pb-1 mb-2 font-semibold">
                          📥 Payload Received (Form-Data / Query Parameters)
                        </div>
                        <pre className="whitespace-pre-wrap text-emerald-400 text-[11px] leading-relaxed max-h-[160px] overflow-y-auto">
                          {JSON.stringify(log.payload, null, 2)}
                        </pre>
                      </div>

                      {/* Right: Output Response */}
                      <div>
                        <div className="text-slate-400 border-b border-slate-800 pb-1 mb-2 font-semibold">
                          📤 Raw Plain-Text Response (Yemot API Command)
                        </div>
                        <div className="bg-slate-900 rounded p-2.5 text-indigo-300 text-[11px] border border-slate-800 break-all leading-relaxed whitespace-pre-wrap">
                          {log.response}
                        </div>
                        <div className="mt-2 text-[10px] text-slate-500">
                          Content-Type: text/plain; charset=utf-8
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
