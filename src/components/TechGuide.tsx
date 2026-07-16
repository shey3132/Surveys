import { useState, useEffect } from "react";
import { Survey } from "../types";
import { Clipboard, Check, BookOpen, Settings, Info, Cloud, Cpu, ArrowLeftRight } from "lucide-react";

interface TechGuideProps {
  selectedSurvey: Survey | null;
  surveys?: Survey[];
  onSelectSurvey?: (id: string) => void;
}

export default function TechGuide({ selectedSurvey, surveys = [], onSelectSurvey }: TechGuideProps) {
  const [copiedIni, setCopiedIni] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedVercel, setCopiedVercel] = useState(false);
  const [activeTab, setActiveTab] = useState<"setup" | "vercel">("setup");
  const [rawTextOutput, setRawTextOutput] = useState("");

  // Get current app domain
  const appDomain = typeof window !== "undefined" ? window.location.origin : "https://your-server-url.com";
  const webhookUrl = selectedSurvey 
    ? `${appDomain}/api/yemot/survey/${selectedSurvey.id}`
    : `${appDomain}/api/yemot/survey/[survey_id]`;

  const iniContent = `type=api
api_link=${webhookUrl}
api_url_post=yes
api_wait_answer_music_on_hold=yes`;

  // Dynamically generate raw preview output
  useEffect(() => {
    if (!selectedSurvey) {
      setRawTextOutput("id_list_message=t-אין סקר שנבחר במערכת&hangup=yes");
      return;
    }
    if (selectedSurvey.isOpen === false) {
      setRawTextOutput("id_list_message=t-הסקר סגור כעת&hangup=yes");
      return;
    }
    if (selectedSurvey.questions && selectedSurvey.questions.length > 0) {
      const q = selectedSurvey.questions[0];
      const maxDig = q.maxDigits ?? 1;
      const minDig = q.minDigits ?? 1;
      let yType = "Digits";
      if (q.type === "record") yType = "record";
      else if (q.type === "voice") yType = "voice";
      
      setRawTextOutput(`read=t-${q.text}=${q.paramName},,${maxDig},${minDig},${yType}`);
    } else {
      setRawTextOutput("id_list_message=t-אין שאלות מוגדרות בסקר זה&hangup=yes");
    }
  }, [selectedSurvey]);

  const copyToClipboard = (text: string, type: "ini" | "url" | "vercel") => {
    navigator.clipboard.writeText(text);
    if (type === "ini") {
      setCopiedIni(true);
      setTimeout(() => setCopiedIni(false), 2000);
    } else if (type === "url") {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } else {
      setCopiedVercel(true);
      setTimeout(() => setCopiedVercel(false), 2000);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn" dir="rtl">
      
      {/* Page Title Header */}
      <div className="bg-indigo-900 rounded-3xl p-6 text-white shadow-lg shadow-indigo-950/20">
        <span className="text-xs font-bold uppercase tracking-wider bg-indigo-800/80 text-indigo-200 px-2.5 py-1 rounded-full">
          דף 1: חיבור למערכת ימות המשיח והתאמה לוורסל
        </span>
        <h2 className="text-2xl font-bold mt-2.5">הגדרות API וקבלת טקסט פשוט לימות המשיח</h2>
        <p className="text-indigo-200 text-xs mt-1 leading-relaxed max-w-3xl">
          כאן תוכלו לקבל את כתובת ה-API שלכם שמחזירה את קוד הטקסט הפשוט הנדרש עבור ימות המשיח, לראות את הפלט בזמן אמת, ולהגדיר את הפרויקט להתאמה מלאה לפלטפורמת הענן Vercel.
        </p>

        {/* Tab selector */}
        <div className="flex gap-2 mt-6">
          <button
            onClick={() => setActiveTab("setup")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === "setup"
                ? "bg-white text-indigo-900 shadow-sm"
                : "bg-indigo-800/50 text-indigo-100 hover:bg-indigo-800"
            }`}
          >
            <Cpu className="w-4 h-4" />
            חיבור השלוחה בימות המשיח (העתק-הדבק)
          </button>
          <button
            onClick={() => setActiveTab("vercel")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === "vercel"
                ? "bg-white text-indigo-900 shadow-sm"
                : "bg-indigo-800/50 text-indigo-100 hover:bg-indigo-800"
            }`}
          >
            <Cloud className="w-4 h-4" />
            התאמה והעלאה ל-Vercel (הסבר מלא)
          </button>
        </div>
      </div>

      {activeTab === "setup" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Main Copy-Paste Widget */}
          <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-6">
            
            {/* Survey Selector to customize API display */}
            {surveys.length > 0 && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <label className="block text-xs font-bold text-slate-600 mb-2">בחרו סקר כדי לעדכן את הקישורים והפלט להלן:</label>
                <select
                  value={selectedSurvey?.id || ""}
                  onChange={(e) => onSelectSurvey && onSelectSurvey(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-100 outline-none"
                >
                  {surveys.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title} ({s.isOpen ? "פתוח" : "סגור"})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-slate-800 text-sm">1. כתובת ה-API שלכם לימות המשיח (החזרת טקסט פשוט):</h3>
                <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-mono font-semibold">
                  TEXT/PLAIN
                </span>
              </div>
              <p className="text-slate-500 text-xs mb-3">
                זהו הקישור שתכניסו בהגדרות השלוחה. כתובת זו מחזירה קוד טקסט קריא ומזוקק ישירות למרכזייה הטלפונית:
              </p>
              
              <div className="flex items-center gap-2 bg-slate-900 p-3 rounded-xl border border-slate-800">
                <div className="flex-1 overflow-x-auto text-left font-mono text-xs text-indigo-300 whitespace-nowrap scrollbar-none px-1" dir="ltr">
                  {webhookUrl}
                </div>
                <button
                  onClick={() => copyToClipboard(webhookUrl, "url")}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg shrink-0 flex items-center gap-1 transition-colors"
                >
                  {copiedUrl ? <Check className="w-3.5 h-3.5" /> : <Clipboard className="w-3.5 h-3.5" />}
                  <span>העתק קישור</span>
                </button>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-slate-800 text-sm">2. הגדרות שלוחה מלאות עבור המערכת (ext.ini):</h3>
              </div>
              <p className="text-slate-500 text-xs mb-3">
                העתיקו את קובץ ההגדרות והדביקו אותו בשלוחה הרצויה בימות המשיח כדי שהחיוג ייקלט ישירות בשרת שלכם:
              </p>

              <div className="relative bg-slate-950 rounded-xl p-4 font-mono text-xs text-slate-300 text-left" dir="ltr">
                <button
                  onClick={() => copyToClipboard(iniContent, "ini")}
                  className="absolute top-3 right-3 p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors"
                  title="העתק הגדרות ext.ini"
                >
                  {copiedIni ? <Check className="w-4 h-4 text-emerald-400" /> : <Clipboard className="w-4 h-4" />}
                </button>
                <pre className="whitespace-pre-wrap leading-relaxed">{iniContent}</pre>
              </div>
            </div>

            {/* Simulated Live View from the URL */}
            <div className="pt-4 border-t border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm mb-2">3. תצוגה מקדימה חיה של הטקסט הפשוט המתקבל מה-API:</h3>
              <p className="text-slate-500 text-xs mb-3">
                כך נראה פלט הטקסט הפשוט הנקי (Plain-Text) שהמרכזייה של ימות המשיח קוראת ברגע זה מהכתובת למעלה:
              </p>
              <div className="bg-amber-50/70 border border-amber-200/60 rounded-xl p-3.5 font-mono text-xs text-amber-800 text-left tracking-wide" dir="ltr">
                {rawTextOutput}
              </div>
              <div className="flex items-center gap-1.5 mt-2 text-[11px] text-amber-600 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse block"></span>
                <span>פלט זה משתנה אוטומטית בהתאם למצב הסקר (פתוח/סגור/פעיל) ולשאלות המוגדרות בו.</span>
              </div>
            </div>

          </div>

          {/* Side parameter guide */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* API Parameters block */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-50">
                <Info className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-800 text-sm">איך ימות המשיח קוראת את הטקסט?</h3>
              </div>
              
              <div className="space-y-3.5 text-xs">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <span className="font-mono font-bold text-indigo-600 block">read=</span>
                  <p className="text-slate-600 mt-1">פקודה המורה למערכת להשמיע קול למאזין ולהמתין להקשה שלו.</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <span className="font-mono font-bold text-indigo-600 block">t-</span>
                  <p className="text-slate-600 mt-1">מציין כי מדובר בטקסט חופשי (TTS) שהמערכת תקריא קולית למאזין בעברית.</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <span className="font-mono font-bold text-indigo-600 block">id_list_message=</span>
                  <p className="text-slate-600 mt-1">פקודה להשמעת הודעה סופית למאזין ללא צורך בהקשה.</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <span className="font-mono font-bold text-indigo-600 block">hangup=yes</span>
                  <p className="text-slate-600 mt-1">מנתק את השיחה מיד בסיום השמעת ההודעה.</p>
                </div>
              </div>
            </div>

            {/* Quick Tips */}
            <div className="bg-emerald-50/70 border border-emerald-100 rounded-2xl p-6 space-y-3">
              <h4 className="font-bold text-emerald-800 text-xs uppercase tracking-wider">עצות מנצחות לחיבור:</h4>
              <ul className="text-[11px] text-emerald-700 space-y-2 list-disc list-inside leading-relaxed">
                <li>הגדרת השלוחה בימות המשיח לוקחת פחות מדקה.</li>
                <li>שימוש בשיטת <code className="bg-white/80 px-1 rounded">POST</code> בקובץ <code className="bg-white/80 px-1 rounded">ext.ini</code> מעניקה מהירות תגובה ואבטחה מוגברת.</li>
                <li>כאשר המאזין מקיש תשובה, השרת שלכם מקבל אותה מיידית, מעבד אותה ומחזיר את השאלה הבאה בתוך חצי שנייה!</li>
              </ul>
            </div>

          </div>

        </div>
      ) : (
        /* Vercel Deployment Instructions */
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-6">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <Cloud className="w-6 h-6 text-indigo-600" />
            <h3 className="font-bold text-slate-800">העלאה והתאמה לשרתי Vercel</h3>
          </div>

          <p className="text-slate-600 text-sm leading-relaxed">
            האפליקציה פותחה בצורה מלאה ומותאמת מושלם להעלאה לפלטפורמת הענן הפופולרית <strong>Vercel</strong>.
            יצרנו עבורכם את קובץ ההגדרות <code className="bg-slate-100 text-slate-700 px-1 py-0.5 rounded font-mono text-xs">vercel.json</code> בתיקיית השורש של הפרויקט, המגדיר אוטומטית שירות serverless מלא המנווט את כל פניות ה-API למנוע השרת שלכם.
          </p>

          <div className="bg-indigo-50/70 rounded-xl p-4 border border-indigo-100 space-y-3">
            <h4 className="font-semibold text-indigo-900 text-sm">מדריך להעלאה ל-Vercel ב-3 שלבים פשוטים:</h4>
            <div className="space-y-3 text-xs text-indigo-950">
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0">1</span>
                <p className="mt-0.5"><strong>העלו את קוד הפרויקט ל-GitHub:</strong> פתחו פרויקט חדש ב-GitHub והעלו אליו את קוד האפליקציה.</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0">2</span>
                <p className="mt-0.5"><strong>חברו ל-Vercel:</strong> היכנסו לחשבון ה-Vercel שלכם, לחצו על <strong>Add New Project</strong> ובחרו את התיקייה מה-GitHub.</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0">3</span>
                <p className="mt-0.5"><strong>סיימו וקבלו כתובת קבועה:</strong> Vercel תזהה אוטומטית את קובץ ה-<code className="bg-white px-1.5 py-0.5 rounded font-mono">vercel.json</code> ותבנה את השרת שלכם בתוך פחות מ-30 שניות עם כתובת API מאובטחת המסתיימת ב-<code className="bg-white px-1.5 py-0.5 rounded font-mono">.vercel.app</code>.</p>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-slate-800 text-sm mb-2">קובץ ההגדרות שיצרנו עבורכם (vercel.json):</h4>
            <div className="relative bg-slate-950 rounded-xl p-4 font-mono text-xs text-slate-300 text-left" dir="ltr">
              <button
                onClick={() => copyToClipboard(`{\n  "version": 2,\n  "builds": [\n    {\n      "src": "server.ts",\n      "use": "@vercel/node"\n    },\n    {\n      "src": "package.json",\n      "use": "@vercel/static-build",\n      "config": {\n        "distDir": "dist"\n      }\n    }\n  ],\n  "routes": [\n    {\n      "src": "/api/(.*)",\n      "dest": "server.ts"\n    },\n    {\n      "src": "/assets/(.*)",\n      "dest": "/assets/$1"\n    },\n    {\n      "src": "/(.*)",\n      "dest": "/index.html"\n    }\n  ]\n}`, "vercel")}
                className="absolute top-3 right-3 p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors"
                title="העתק vercel.json"
              >
                {copiedVercel ? <Check className="w-4 h-4 text-emerald-400" /> : <Clipboard className="w-4 h-4" />}
              </button>
              <pre className="whitespace-pre-wrap leading-relaxed">{`{
  "version": 2,
  "builds": [
    {
      "src": "server.ts",
      "use": "@vercel/node"
    },
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "server.ts"
    },
    {
      "src": "/assets/(.*)",
      "dest": "/assets/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ]
}`}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
