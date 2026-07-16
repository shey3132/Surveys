import { useState, useEffect } from "react";
import { Survey, SurveyResponse, ApiLog } from "./types";
import Header from "./components/Header";
import SurveyList from "./components/SurveyList";
import SurveyEditor from "./components/SurveyEditor";
import CallSimulator from "./components/CallSimulator";
import ResponseAnalytics from "./components/ResponseAnalytics";
import CleanResults from "./components/CleanResults";
import { 
  Play, 
  Square, 
  Timer, 
  Plus, 
  Edit, 
  Trash2, 
  Check, 
  X, 
  ShieldAlert, 
  BarChart3, 
  Radio, 
  HelpCircle, 
  PhoneCall, 
  RefreshCw,
  FolderOpen,
  Lock,
  Unlock,
  PlusCircle,
  Clock,
  Copy,
  Link2,
  ExternalLink,
  Megaphone
} from "lucide-react";

export default function App() {
  const [currentView, setCurrentView] = useState<"manage" | "results">("manage");
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [logs, setLogs] = useState<ApiLog[]>([]);
  const [selectedSurveyId, setSelectedSurveyId] = useState<string | null>(null);
  
  // Editor States
  const [isEditing, setIsEditing] = useState(false);
  const [editingSurvey, setEditingSurvey] = useState<Survey | null>(null);
  
  // Loading & Sync state
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Live Timer Countdown State
  const [timeLeft, setTimeLeft] = useState<string>("");

  // Copy indicator state
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Route change listener
  useEffect(() => {
    const handleRoute = () => {
      const params = new URLSearchParams(window.location.search);
      const isResultsQuery = params.get("view") === "results";
      const isResultsPath = window.location.pathname.startsWith("/results");
      
      if (isResultsQuery || isResultsPath) {
        setCurrentView("results");
        const surveyIdParam = params.get("surveyId");
        if (surveyIdParam) {
          setSelectedSurveyId(surveyIdParam);
        }
      } else {
        setCurrentView("manage");
      }
    };

    handleRoute();
    window.addEventListener("popstate", handleRoute);
    return () => window.removeEventListener("popstate", handleRoute);
  }, [surveys]);

  // Fetch all initial data
  const fetchData = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setRefreshing(true);
    else setLoading(true);

    try {
      // Fetch Surveys
      const surveysRes = await fetch("/api/surveys");
      if (surveysRes.ok) {
        const surveysData: Survey[] = await surveysRes.json();
        setSurveys(surveysData);
        
        // Auto-select first survey if none selected
        if (surveysData.length > 0 && !selectedSurveyId) {
          setSelectedSurveyId(surveysData[0].id);
        }
      }

      // Fetch Responses for selected survey if available
      if (selectedSurveyId) {
        await fetchResponsesAndLogs(selectedSurveyId);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchResponsesAndLogs = async (surveyId: string) => {
    try {
      const [respRes, logsRes] = await Promise.all([
        fetch(`/api/surveys/${surveyId}/responses`),
        fetch(`/api/surveys/${surveyId}/logs`)
      ]);

      if (respRes.ok) {
        const respData = await respRes.json();
        setResponses((prev) => {
          const filtered = prev.filter((r) => r.surveyId !== surveyId);
          return [...filtered, ...respData];
        });
      }

      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setLogs(logsData);
      }
    } catch (err) {
      console.error("Error fetching responses or logs:", err);
    }
  };

  // Trigger load on mount
  useEffect(() => {
    fetchData();
  }, []);

  // Fetch responses and logs whenever selected survey changes
  useEffect(() => {
    if (selectedSurveyId) {
      fetchResponsesAndLogs(selectedSurveyId);
    }
  }, [selectedSurveyId]);

  // Real-time ticking effect for countdown timer
  useEffect(() => {
    if (!selectedSurveyId || surveys.length === 0) {
      setTimeLeft("");
      return;
    }
    const currentSurvey = surveys.find((s) => s.id === selectedSurveyId);
    if (!currentSurvey || !currentSurvey.expiresAt || currentSurvey.isOpen === false) {
      setTimeLeft("");
      return;
    }

    const interval = setInterval(() => {
      const diff = new Date(currentSurvey.expiresAt!).getTime() - Date.now();
      if (diff <= 0) {
        clearInterval(interval);
        setTimeLeft("הסתיים");
        // Automatically mark as closed
        handleToggleSurvey(currentSurvey.id);
      } else {
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        setTimeLeft(`${minutes}:${seconds < 10 ? "0" : ""}${seconds}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [selectedSurveyId, surveys]);

  // Handle survey selection
  const handleSelectSurvey = (id: string) => {
    setSelectedSurveyId(id);
  };

  // Open creation mode
  const handleCreateSurvey = () => {
    setEditingSurvey(null);
    setIsEditing(true);
  };

  // Open edit mode
  const handleEditSurvey = (survey: Survey) => {
    setEditingSurvey(survey);
    setIsEditing(true);
  };

  // Save new or updated survey
  const handleSaveSurvey = async (surveyData: Partial<Survey>) => {
    try {
      let res;
      if (editingSurvey) {
        res = await fetch(`/api/surveys/${editingSurvey.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(surveyData),
        });
      } else {
        res = await fetch("/api/surveys", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(surveyData),
        });
      }

      if (res.ok) {
        const saved: Survey = await res.json();
        setIsEditing(false);
        setEditingSurvey(null);
        setSelectedSurveyId(saved.id);
        setTimeout(() => fetchData(true), 150);
      }
    } catch (err) {
      console.error("Error saving survey:", err);
    }
  };

  // Delete survey
  const handleDeleteSurvey = async (id: string) => {
    if (!confirm("האם אתה בטוח שברצונך למחוק סקר זה? כל התשובות והלוגים שלו יימחקו גם כן.")) return;

    try {
      const res = await fetch(`/api/surveys/${id}`, { method: "DELETE" });
      if (res.ok) {
        if (selectedSurveyId === id) {
          setSelectedSurveyId(null);
        }
        setTimeout(() => fetchData(true), 150);
      }
    } catch (err) {
      console.error("Error deleting survey:", err);
    }
  };

  // Toggle survey open/closed status
  const handleToggleSurvey = async (id: string) => {
    try {
      const res = await fetch(`/api/surveys/${id}/toggle`, { method: "PUT" });
      if (res.ok) {
        setTimeout(() => fetchData(true), 150);
      }
    } catch (err) {
      console.error("Error toggling survey:", err);
    }
  };

  // Toggle survey results publication
  const handleTogglePublish = async (id: string) => {
    try {
      const res = await fetch(`/api/surveys/${id}/toggle-publish`, { method: "PUT" });
      if (res.ok) {
        setTimeout(() => fetchData(true), 150);
      }
    } catch (err) {
      console.error("Error toggling publication:", err);
    }
  };

  // Extend survey timer
  const handleExtendSurvey = async (id: string, minutes: number) => {
    try {
      const res = await fetch(`/api/surveys/${id}/extend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ minutes }),
      });
      if (res.ok) {
        setTimeout(() => fetchData(true), 150);
      }
    } catch (err) {
      console.error("Error extending survey:", err);
    }
  };

  // Delete single response
  const handleDeleteResponse = async (responseId: string) => {
    try {
      const res = await fetch(`/api/responses/${responseId}`, { method: "DELETE" });
      if (res.ok) {
        setResponses((prev) => prev.filter((r) => r.id !== responseId));
        if (selectedSurveyId) {
          fetchResponsesAndLogs(selectedSurveyId);
        }
      }
    } catch (err) {
      console.error("Error deleting response:", err);
    }
  };

  // Clear logs
  const handleClearLogs = async () => {
    if (!selectedSurveyId) return;
    try {
      const res = await fetch(`/api/surveys/${selectedSurveyId}/logs`, { method: "DELETE" });
      if (res.ok) {
        setLogs([]);
      }
    } catch (err) {
      console.error("Error clearing logs:", err);
    }
  };

  const getSelectedSurvey = () => {
    return surveys.find((s) => s.id === selectedSurveyId) || null;
  };

  const currentSurvey = getSelectedSurvey();

  // Responses stats
  const currentResponses = currentSurvey ? responses.filter((r) => r.surveyId === currentSurvey.id) : [];
  const compCount = currentResponses.filter((r) => r.completed).length;
  const partCount = currentResponses.filter((r) => !r.completed).length;
  const totalCount = currentResponses.length;
  const completionRate = totalCount > 0 ? Math.round((compCount / totalCount) * 100) : 0;

  if (currentView === "results") {
    return (
      <CleanResults />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans antialiased" dir="rtl">
      {/* Top Header Navigation */}
      <Header
        surveyCount={surveys.length}
      />

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
            <p className="text-sm font-medium text-slate-500">טוען את נתוני הסקרים...</p>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Quick sync & state header bar */}
            {surveys.length > 0 && selectedSurveyId && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white rounded-xl px-5 py-3 border border-slate-100 shadow-sm gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`w-2 h-2 rounded-full block ${currentSurvey?.isOpen !== false ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`}></span>
                  <span className="font-semibold text-slate-700">סקר נבחר:</span>
                  <span className="bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded">
                    {currentSurvey?.title}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${currentSurvey?.isOpen !== false ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-rose-50 text-rose-700 border border-rose-100"}`}>
                    {currentSurvey?.isOpen !== false ? "פתוח ומאזין" : "סגור כעת"}
                  </span>
                  {currentSurvey?.isOpen !== false && timeLeft && (
                    <span className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-800 font-bold px-2.5 py-0.5 rounded-full text-[10px] animate-pulse">
                      <Clock className="w-3 h-3 text-amber-600" />
                      <span>זמן שנותר:</span>
                      <span className="font-mono tracking-wider">{timeLeft}</span>
                    </span>
                  )}
                </div>
                
                <button
                  onClick={() => fetchData(true)}
                  disabled={refreshing}
                  className="flex items-center gap-1 text-slate-400 hover:text-indigo-600 font-medium transition-colors cursor-pointer self-start sm:self-auto disabled:opacity-45"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-indigo-600" : ""}`} />
                  <span>{refreshing ? "מרענן..." : "רענן נתונים"}</span>
                </button>
              </div>
            )}

            {/* Editing Survey Form (overlay / main view replacement) */}
            {isEditing ? (
              <SurveyEditor
                survey={editingSurvey}
                onSave={handleSaveSurvey}
                onCancel={() => {
                  setIsEditing(false);
                  setEditingSurvey(null);
                }}
              />
            ) : (
              <>
                {/* הקישורים שלך להפעלה וחיבור (3 Links Section) */}
                {currentSurvey && (
                  <div className="bg-gradient-to-br from-indigo-950 to-slate-900 text-white rounded-3xl p-6 shadow-xl border border-indigo-900/40 space-y-5 animate-fadeIn">
                    <div className="flex items-center gap-2">
                      <Link2 className="w-5 h-5 text-indigo-400" />
                      <h2 className="text-sm font-extrabold text-slate-100 tracking-wide">שלושת הקישורים הישירים שלך להפעלת המערכת:</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                      
                      {/* Link 1: Plain Text API */}
                      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col justify-between space-y-3 hover:border-indigo-500/30 transition-colors">
                        <div className="space-y-1">
                          <span className="bg-emerald-500/15 text-emerald-400 font-bold px-2 py-0.5 rounded text-[10px]">דף 1 • קישור API לימות המשיח</span>
                          <h4 className="font-extrabold text-white text-xs mt-1.5">קוד API (טקסט פשוט ללא עיצוב)</h4>
                          <p className="text-slate-300 text-[11px] leading-relaxed">
                            העתיקו קישור זה והדביקו אותו בהגדרות השלוחה בימות המשיח בסעיף <code className="bg-black/30 px-1 py-0.5 rounded font-mono text-[10px]">api_link</code>. הקישור מחזיר פקודות טקסט בלבד.
                          </p>
                        </div>
                        <div className="flex gap-1.5 pt-1">
                          <button
                            onClick={() => {
                              const url = `${window.location.origin}/api/yemot/survey/${currentSurvey.id}`;
                              navigator.clipboard.writeText(url);
                              setCopiedIndex(1);
                              setTimeout(() => setCopiedIndex(null), 2000);
                            }}
                            className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
                          >
                            {copiedIndex === 1 ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedIndex === 1 ? "הועתק!" : "העתק קישור API"}</span>
                          </button>
                          <a
                            href={`/api/yemot/survey/${currentSurvey.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors flex items-center justify-center"
                            title="פתח בדפדפן"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>

                      {/* Link 2: Admin Panel */}
                      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col justify-between space-y-3 hover:border-indigo-500/30 transition-colors">
                        <div className="space-y-1">
                          <span className="bg-indigo-500/20 text-indigo-300 font-bold px-2 py-0.5 rounded text-[10px]">דף 2 • ממשק ניהול</span>
                          <h4 className="font-extrabold text-white text-xs mt-1.5">לוח הבקרה ומנהל הסקרים הנוכחי</h4>
                          <p className="text-slate-300 text-[11px] leading-relaxed">
                            הדף הנוכחי שבו אתם שולטים בסקר, מגדירים שאלות חדשות, מדמים שיחות בסימולטור ומפרסמים תוצאות בלייב.
                          </p>
                        </div>
                        <div className="flex gap-1.5 pt-1">
                          <button
                            onClick={() => {
                              const url = `${window.location.origin}/`;
                              navigator.clipboard.writeText(url);
                              setCopiedIndex(2);
                              setTimeout(() => setCopiedIndex(null), 2000);
                            }}
                            className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
                          >
                            {copiedIndex === 2 ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedIndex === 2 ? "הועתק!" : "העתק קישור ניהול"}</span>
                          </button>
                        </div>
                      </div>

                      {/* Link 3: Clean Results Screen */}
                      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col justify-between space-y-3 hover:border-indigo-500/30 transition-colors">
                        <div className="space-y-1">
                          <span className="bg-indigo-500/20 text-indigo-300 font-bold px-2 py-0.5 rounded text-[10px]">דף 3 • תוצאות לקהל</span>
                          <h4 className="font-extrabold text-white text-xs mt-1.5">דף תוצאות נקי ומזוקק לקהל</h4>
                          <p className="text-slate-300 text-[11px] leading-relaxed">
                            דף חיצוני נקי לחלוטין. יציג "הסקר פתוח" כברירת מחדל, ויציג את הנתונים רק כשתלחצו על "פרסם תוצאות בלייב" או כשהסקר ייסגר.
                          </p>
                        </div>
                        <div className="flex gap-1.5 pt-1">
                          <button
                            onClick={() => {
                              const url = `${window.location.origin}/results?surveyId=${currentSurvey.id}`;
                              navigator.clipboard.writeText(url);
                              setCopiedIndex(3);
                              setTimeout(() => setCopiedIndex(null), 2000);
                            }}
                            className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
                          >
                            {copiedIndex === 3 ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedIndex === 3 ? "הועתק!" : "העתק קישור תוצאות"}</span>
                          </button>
                          <a
                            href={`/results?surveyId=${currentSurvey.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors flex items-center justify-center"
                            title="פתח דף תוצאות נקי"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>

                    </div>
                  </div>
                )}

                {/* MANAGEMENT & LIVE WORKSPACE */}
                <div className="space-y-6">
                  {/* Control Cards Row */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                    
                    {/* Survey Status & Predefined Timer Card */}
                    <div className="lg:col-span-6 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between gap-4">
                      <div>
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold text-slate-800 text-sm">מצב הסקר וניהול פרסום תוצאות</h3>
                          <span className="text-[10px] text-indigo-600 bg-indigo-50 font-bold px-2 py-0.5 rounded-full font-mono">Live Control</span>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-2.5 my-4">
                          <button
                            onClick={() => currentSurvey && handleToggleSurvey(currentSurvey.id)}
                            className={`px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all ${
                              currentSurvey?.isOpen !== false
                                ? "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
                                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                            }`}
                          >
                            {currentSurvey?.isOpen !== false ? (
                              <>
                                <Lock className="w-3.5 h-3.5" />
                                <span>סגור סקר כעת</span>
                              </>
                            ) : (
                              <>
                                <Unlock className="w-3.5 h-3.5" />
                                <span>פתח סקר לשיחות</span>
                              </>
                            )}
                          </button>

                          {/* PUBLISH TO PAGE 3 BUTTON */}
                          <button
                            onClick={() => currentSurvey && handleTogglePublish(currentSurvey.id)}
                            className={`px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all border ${
                              currentSurvey?.isPublished === true
                                ? "bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-700"
                                : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                            }`}
                          >
                            <Megaphone className="w-3.5 h-3.5" />
                            <span>{currentSurvey?.isPublished === true ? "בטל פרסום בלייב (דף 3 חסוי)" : "פרסם תוצאות בלייב (בדף 3)"}</span>
                          </button>

                          <div className="flex-1 min-w-[140px] bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-indigo-600" />
                              זמן שנותר:
                            </span>
                            <span className="font-mono font-black text-xs text-indigo-700 tracking-wider">
                              {timeLeft ? timeLeft : "אין טיימר פעיל"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Extend Timer buttons */}
                      <div className="pt-3 border-t border-slate-50">
                        <span className="text-[11px] font-bold text-slate-400 block mb-2">אפשרויות הארכת זמן:</span>
                        <div className="flex gap-2">
                          {[5, 15, 30].map((mins) => (
                            <button
                              key={mins}
                              onClick={() => currentSurvey && handleExtendSurvey(currentSurvey.id, mins)}
                              className="flex-1 py-2 bg-indigo-50 hover:bg-indigo-100 active:scale-95 text-indigo-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
                            >
                              +{mins} דקות
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Live Call Stats Card */}
                    <div className="lg:col-span-6 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold text-slate-800 text-sm">מדדי מענה בלייב (Real-time Stats)</h3>
                          <span className="flex items-center gap-1 text-[9px] bg-red-50 text-red-600 font-bold px-2 py-0.5 rounded-full animate-pulse">
                            <span className="w-1 h-1 rounded-full bg-red-600 block"></span>
                            LIVE
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-3.5 my-4 text-center">
                          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="block text-xl font-black font-mono text-slate-800">{totalCount}</span>
                            <span className="text-[10px] text-slate-400">סה&quot;כ מחייגים</span>
                          </div>
                          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="block text-xl font-black font-mono text-indigo-600">{compCount}</span>
                            <span className="text-[10px] text-slate-400">השלימו סקר</span>
                          </div>
                          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="block text-xl font-black font-mono text-amber-600">{partCount}</span>
                            <span className="text-[10px] text-slate-400">בשלבי מענה</span>
                          </div>
                        </div>
                      </div>

                      {/* Completion rate bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-slate-500 font-semibold">
                          <span>אחוז השלמת סקר:</span>
                          <span>{completionRate}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-600 rounded-full transition-all duration-500" style={{ width: `${completionRate}%` }}></div>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Main Workspace Column Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    
                    {/* Left Side: Survey Selection & Simulator Control */}
                    <div className="lg:col-span-5 space-y-6">
                      
                      {/* Selected survey meta & list switcher */}
                      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-50">
                          <h3 className="font-bold text-slate-800 text-xs">ניהול ועריכת הסקרים</h3>
                          <button
                            onClick={handleCreateSurvey}
                            className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-[10px] flex items-center gap-1 cursor-pointer"
                          >
                            <PlusCircle className="w-3.5 h-3.5" />
                            <span>סקר חדש</span>
                          </button>
                        </div>

                        <div className="space-y-2 max-h-[160px] overflow-y-auto">
                          {surveys.map((s) => {
                            const isSelected = s.id === selectedSurveyId;
                            return (
                              <div
                                key={s.id}
                                onClick={() => handleSelectSurvey(s.id)}
                                className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                                  isSelected
                                    ? "border-indigo-600 bg-indigo-50/40"
                                    : "border-slate-100 bg-white hover:border-slate-200"
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <span className={`w-1.5 h-1.5 rounded-full ${s.isOpen !== false ? "bg-emerald-500" : "bg-rose-500"}`}></span>
                                  <span className="text-xs font-bold text-slate-700 line-clamp-1">{s.title}</span>
                                </div>

                                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    onClick={() => handleEditSurvey(s)}
                                    className="p-1 text-slate-400 hover:text-slate-700 rounded"
                                    title="ערוך סקר"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteSurvey(s.id)}
                                    className="p-1 text-slate-400 hover:text-rose-600 rounded"
                                    title="מחק סקר"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Direct simulator integration */}
                      <div className="bg-slate-900 rounded-2xl p-4 text-white">
                        <h3 className="text-xs font-bold mb-3 flex items-center gap-2 text-indigo-400">
                          <PhoneCall className="w-4 h-4" />
                          סימולטור בדיקת API טלפוני (Live IVR)
                        </h3>
                        <CallSimulator
                          survey={currentSurvey}
                          onCallSuccess={() => selectedSurveyId && fetchResponsesAndLogs(selectedSurveyId)}
                        />
                      </div>

                    </div>

                    {/* Right Side: Live Results Render */}
                    <div className="lg:col-span-7">
                      <ResponseAnalytics
                        survey={currentSurvey}
                        responses={responses}
                        logs={logs}
                        onDeleteResponse={handleDeleteResponse}
                        onClearLogs={handleClearLogs}
                      />
                    </div>

                  </div>
                </div>
              </>
            )}

          </div>
        )}
      </main>

      {/* Humble, Clean Footer */}
      <footer className="bg-white border-t border-slate-100 py-6 mt-12 text-center text-xs text-slate-400" dir="rtl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <span>ימות המשיח - מערכת ניהול סקרי API • נבנה עבור מפתחים ומנהלי מערכות IVR</span>
        </div>
      </footer>
    </div>
  );
}
