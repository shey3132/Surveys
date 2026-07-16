import { useState, useEffect } from "react";
import { Survey } from "../types";
import { Phone, PhoneOff, Mic, Keyboard, ShieldAlert, ArrowLeftRight, Activity, HelpCircle } from "lucide-react";

interface CallSimulatorProps {
  survey: Survey | null;
  onCallSuccess: () => void; // Trigger refresh of logs & responses
}

interface ActiveCallState {
  status: "idle" | "ringing" | "connected" | "completed" | "error";
  phone: string;
  callId: string;
  errorMessage?: string;
  rawResponse?: string;
  
  // Current active question parsed from Yemot command
  activePrompt?: string;
  activeParam?: string;
  dataType?: "Digits" | "record" | "voice";
  minDigits?: number;
  maxDigits?: number;
  
  // Input buffer
  inputValue: string;
}

export default function CallSimulator({ survey, onCallSuccess }: CallSimulatorProps) {
  const [phoneNumber, setPhoneNumber] = useState("054-1234567");
  const [callState, setCallState] = useState<ActiveCallState>({
    status: "idle",
    phone: "",
    callId: "",
    inputValue: ""
  });
  
  const [exchangeLogs, setExchangeLogs] = useState<{
    timestamp: string;
    type: "request" | "response";
    text: string;
    payload?: any;
  }[]>([]);

  // Reset simulator if survey changes
  useEffect(() => {
    hangUp();
  }, [survey]);

  if (!survey) {
    return (
      <div className="text-center py-12 bg-white rounded-2xl border border-slate-100 shadow-sm" dir="rtl">
        <Phone className="w-12 h-12 text-slate-300 mx-auto mb-2" />
        <h3 className="font-bold text-slate-800">בחרו סקר להפעלת הסימולטור</h3>
        <p className="text-slate-500 text-xs mt-1">בחרו סקר פעיל מרשימת הסקרים כדי להתחיל לדמות שיחות טלפוניות.</p>
      </div>
    );
  }

  // Parse Yemot Hashama response command
  const parseYemotCommand = (raw: string): Partial<ActiveCallState> => {
    try {
      if (raw.startsWith("read=")) {
        const parts = raw.substring(5).split("=");
        const rawPrompt = parts[0];
        const textToPlay = rawPrompt.replace(/^t-/, ""); // strip t- prefix
        
        const rest = parts[1].split(",");
        const paramName = rest[0];
        let maxDigits = 1;
        let minDigits = 1;
        let dataTypeRaw = "Digits";

        if (rest.length >= 6) {
          minDigits = parseInt(rest[2]) || 1;
          maxDigits = parseInt(rest[3]) || 1;
          dataTypeRaw = rest[5] || "Digits";
        } else {
          maxDigits = parseInt(rest[2]) || 1;
          minDigits = parseInt(rest[3]) || 1;
          dataTypeRaw = rest[4] || "Digits";
        }

        let dataType: "Digits" | "record" | "voice" = "Digits";
        const dLow = dataTypeRaw.toLowerCase();
        if (dLow === "record") {
          dataType = "record";
        } else if (dLow === "voice") {
          dataType = "voice";
        }

        return {
          status: "connected",
          activePrompt: textToPlay,
          activeParam: paramName,
          dataType,
          maxDigits,
          minDigits,
          inputValue: ""
        };
      } else if (raw.includes("hangup=yes")) {
        const match = raw.match(/id_list_message=([^&]+)/);
        const textToPlay = match ? match[1].replace(/^t-/, "") : "תודה רבה על השתתפותכם, השיחה מנותקת.";
        return {
          status: "completed",
          activePrompt: textToPlay,
          activeParam: undefined,
          dataType: undefined
        };
      }
    } catch (e) {
      console.error("Error parsing Yemot command:", e);
    }

    return {
      status: "error",
      errorMessage: "תשובת השרת אינה בפורמט התקין של ימות המשיח"
    };
  };

  const addExchangeLog = (type: "request" | "response", text: string, payload?: any) => {
    const timeStr = new Date().toLocaleTimeString("he-IL");
    setExchangeLogs((prev) => [
      { timestamp: timeStr, type, text, payload },
      ...prev
    ]);
  };

  // Start Call
  const startCall = async () => {
    if (!phoneNumber.trim()) return;

    const callId = "call-" + Math.floor(100000 + Math.random() * 900000);
    setExchangeLogs([]);
    
    setCallState({
      status: "ringing",
      phone: phoneNumber,
      callId,
      inputValue: ""
    });

    addExchangeLog("request", `📱 חיוג לשלוחת ה-API...`, {
      ApiPhone: phoneNumber,
      ApiCallId: callId,
      ApiExtension: "5"
    });

    // Simulate short network delay for realism!
    setTimeout(async () => {
      try {
        const res = await fetch(`/api/yemot/survey/${survey.id}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded"
          },
          body: new URLSearchParams({
            ApiCallId: callId,
            ApiPhone: phoneNumber,
            ApiExtension: "5"
          })
        });

        const text = await res.text();
        addExchangeLog("response", `📞 תשובת השרת (פנייה ראשונה):`, text);

        const parsed = parseYemotCommand(text);
        setCallState((prev) => ({
          ...prev,
          ...parsed,
          rawResponse: text
        }));

        // Refresh parent responses/logs
        onCallSuccess();
      } catch (err) {
        setCallState((prev) => ({
          ...prev,
          status: "error",
          errorMessage: "לא ניתן ליצור קשר עם שרת ה-API"
        }));
        addExchangeLog("response", `❌ שגיאת תקשורת: לא ניתן לפנות לשרת`);
      }
    }, 1000);
  };

  // Submit Answer
  const submitAnswer = async (valueToSend: string) => {
    const { callId, phone, activeParam } = callState;
    if (!activeParam) return;

    addExchangeLog("request", `📤 שליחת תשובה לשרת: [${activeParam}=${valueToSend}]`, {
      ApiPhone: phone,
      ApiCallId: callId,
      [activeParam]: valueToSend
    });

    try {
      const res = await fetch(`/api/yemot/survey/${survey.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
          ApiCallId: callId,
          ApiPhone: phone,
          ApiExtension: "5",
          [activeParam]: valueToSend
        })
      });

      const text = await res.text();
      addExchangeLog("response", `📞 תשובת השרת הבאה:`, text);

      const parsed = parseYemotCommand(text);
      setCallState((prev) => ({
        ...prev,
        ...parsed,
        rawResponse: text
      }));

      // Refresh parent database
      onCallSuccess();
    } catch (err) {
      setCallState((prev) => ({
        ...prev,
        status: "error",
        errorMessage: "שגיאת תקשורת במהלך מעבר שאלה"
      }));
      addExchangeLog("response", `❌ שגיאת תקשורת בעת העברת התשובה`);
    }
  };

  const handleKeyPress = (num: string) => {
    if (callState.status !== "connected") return;
    
    const newVal = callState.inputValue + num;
    const max = callState.maxDigits ?? 1;

    setCallState((prev) => ({ ...prev, inputValue: newVal }));

    // If it's a 1-digit question, submit instantly for premium feel!
    if (max === 1) {
      submitAnswer(num);
    }
  };

  const handleKeypadSubmit = () => {
    if (!callState.inputValue) return;
    submitAnswer(callState.inputValue);
  };

  const handleVoiceSubmit = (text: string) => {
    if (!text.trim()) return;
    submitAnswer(text);
  };

  const handleRecordingSubmit = () => {
    // Generate a simulated file ID for Yemot Compatibility
    const simFileId = `ym_rec_sim_${Math.floor(100000 + Math.random() * 900000)}.wav`;
    submitAnswer(simFileId);
  };

  const hangUp = () => {
    setCallState({
      status: "idle",
      phone: "",
      callId: "",
      inputValue: ""
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" dir="rtl">
      {/* Visual Phone Column */}
      <div className="lg:col-span-5 flex flex-col items-center">
        <div className="w-full max-w-[340px] bg-slate-900 rounded-[44px] p-4 shadow-2xl border-4 border-slate-800 aspect-[9/19] flex flex-col relative overflow-hidden text-white">
          {/* Top Notch */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-32 h-4 bg-slate-800 rounded-full z-20 flex items-center justify-center">
            <span className="w-2 h-2 rounded-full bg-slate-950 block"></span>
          </div>

          {/* Screen Content */}
          <div className="flex-1 bg-slate-950 rounded-[32px] p-5 pt-7 flex flex-col justify-between overflow-hidden relative">
            {/* Status bar */}
            <div className="flex justify-between items-center text-[10px] text-slate-400 px-1 mb-2 font-mono">
              <span>Cellular IVR</span>
              <span>100% 🔋</span>
            </div>

            {/* Calling Screen based on state */}
            {callState.status === "idle" && (
              <div className="flex-1 flex flex-col justify-between py-4 text-center">
                <div className="space-y-1 mt-6">
                  <div className="w-14 h-14 bg-indigo-600/10 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-2 border border-indigo-500/20">
                    <Phone className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-sm">סימולטור שיחות סקר</h4>
                  <p className="text-slate-400 text-xs">בצעו שיחת סימולציה ישירות לדפדפן לבדיקת תקינות זרימת ה-API שלכם.</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1 text-right">
                    <label className="text-[10px] text-slate-400 font-semibold px-1">מספר טלפון לזיהוי (Caller ID)</label>
                    <input
                      type="text"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-center text-sm font-bold font-mono tracking-wider focus:outline-none focus:border-indigo-500 text-white"
                    />
                  </div>

                  <button
                    onClick={startCall}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition-all text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-950/20"
                  >
                    <Phone className="w-4 h-4 fill-white" />
                    <span>התחל שיחת סקר טלפוני</span>
                  </button>
                </div>
              </div>
            )}

            {callState.status === "ringing" && (
              <div className="flex-1 flex flex-col justify-between py-6 text-center animate-pulse">
                <div className="space-y-2 mt-8">
                  <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-indigo-600/30">
                    <Phone className="w-7 h-7 fill-white" />
                  </div>
                  <h4 className="font-bold text-base">מחייג לשרת...</h4>
                  <p className="text-slate-400 text-xs font-mono">{callState.phone}</p>
                </div>

                <button
                  onClick={hangUp}
                  className="w-12 h-12 bg-rose-600 hover:bg-rose-500 rounded-full flex items-center justify-center mx-auto active:scale-95 transition-all"
                >
                  <PhoneOff className="w-5 h-5 fill-white" />
                </button>
              </div>
            )}

            {callState.status === "connected" && (
              <div className="flex-1 flex flex-col justify-between py-1">
                {/* Visual Speaker Header */}
                <div className="text-center">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-950/80 border border-indigo-900/40 rounded-full text-[10px] text-indigo-300 font-bold">
                    <Activity className="w-3 h-3 animate-pulse" />
                    <span>מחובר - שלוחת API</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 font-mono">מזהה: {callState.callId}</p>
                </div>

                {/* TTS speech visualizer & text */}
                <div className="my-3 space-y-2.5 max-h-[140px] overflow-y-auto bg-slate-900/50 p-3.5 rounded-2xl border border-slate-800/60" dir="rtl">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-indigo-400">🔊 מושמע כעת:</span>
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed font-medium">
                    {callState.activePrompt}
                  </p>
                </div>

                {/* Interactive keypad or options based on data type */}
                <div className="mt-auto space-y-3">
                  {callState.dataType === "Digits" && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-[10px] text-slate-400">הקשת מקשים:</span>
                        <span className="font-bold text-indigo-400 font-mono tracking-widest text-sm bg-slate-900 px-2 py-0.5 rounded border border-slate-800 min-w-[40px] text-center">
                          {callState.inputValue || "---"}
                        </span>
                      </div>

                      {/* Phone DTMF Keypad Grid */}
                      <div className="grid grid-cols-3 gap-1.5 font-mono">
                        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"].map((key) => (
                          <button
                            key={key}
                            onClick={() => handleKeyPress(key)}
                            className="bg-slate-900/80 hover:bg-slate-800 border border-slate-800/80 rounded-xl py-2.5 text-sm font-bold active:scale-95 transition-all cursor-pointer text-slate-100"
                          >
                            {key}
                          </button>
                        ))}
                      </div>

                      {/* If max digits > 1, show manually confirm key */}
                      {(callState.maxDigits ?? 1) > 1 && (
                        <button
                          onClick={handleKeypadSubmit}
                          disabled={!callState.inputValue}
                          className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-[11px] disabled:opacity-40 transition-opacity"
                        >
                          שלח הקשות (אישור)
                        </button>
                      )}
                    </div>
                  )}

                  {callState.dataType === "record" && (
                    <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800 space-y-2.5 text-center">
                      <div className="w-9 h-9 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mx-auto animate-pulse">
                        <Mic className="w-4.5 h-4.5" />
                      </div>
                      <div>
                        <h5 className="text-[11px] font-bold text-slate-200">הקלטת משוב קולי פעילה</h5>
                        <p className="text-[10px] text-slate-400 mt-0.5">המערכת ממתינה להקלטת תשובה חופשית.</p>
                      </div>
                      <button
                        onClick={handleRecordingSubmit}
                        className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg text-[11px]"
                      >
                        סימולציה של סיום הקלטה ושליחה
                      </button>
                    </div>
                  )}

                  {callState.dataType === "voice" && (
                    <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800 space-y-2.5">
                      <div className="text-center">
                        <h5 className="text-[11px] font-bold text-slate-200">זיהוי דיבור והמרה לטקסט</h5>
                        <p className="text-[10px] text-slate-400">הקלידו את התמליל שהשרת יקבל:</p>
                      </div>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          id="stt-simulation-input"
                          placeholder="לדוגמה: אני בן עשרים"
                          className="flex-1 bg-slate-950 border border-slate-800 text-xs px-2.5 py-1.5 rounded-lg text-white"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleVoiceSubmit((e.target as HTMLInputElement).value);
                            }
                          }}
                        />
                        <button
                          onClick={() => {
                            const input = document.getElementById("stt-simulation-input") as HTMLInputElement;
                            if (input) handleVoiceSubmit(input.value);
                          }}
                          className="px-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-semibold"
                        >
                          שלח
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Red Hangup button */}
                  <button
                    onClick={hangUp}
                    className="w-11 h-11 bg-rose-600 hover:bg-rose-500 rounded-full flex items-center justify-center mx-auto mt-2 active:scale-95 transition-all shadow-md shadow-rose-950/20 cursor-pointer"
                    title="נתק שיחה"
                  >
                    <PhoneOff className="w-4.5 h-4.5 fill-white" />
                  </button>
                </div>
              </div>
            )}

            {callState.status === "completed" && (
              <div className="flex-1 flex flex-col justify-between py-4 text-center">
                <div className="space-y-2.5 mt-8">
                  <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
                    ✓
                  </div>
                  <h4 className="font-bold text-base text-emerald-400">השיחה הושלמה!</h4>
                  <p className="text-slate-300 text-xs px-2 leading-relaxed bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                    🔊 &quot;{callState.activePrompt}&quot;
                  </p>
                </div>

                <button
                  onClick={hangUp}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs"
                >
                  סגור שיחה
                </button>
              </div>
            )}

            {callState.status === "error" && (
              <div className="flex-1 flex flex-col justify-between py-4 text-center">
                <div className="space-y-2.5 mt-8">
                  <div className="w-12 h-12 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-full flex items-center justify-center mx-auto">
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-base text-rose-400">שגיאת מערכת</h4>
                  <p className="text-slate-300 text-xs leading-relaxed px-2 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                    {callState.errorMessage}
                  </p>
                </div>

                <button
                  onClick={hangUp}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs"
                >
                  חזרה למסך הראשי
                </button>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Live Developer Console Column */}
      <div className="lg:col-span-7 flex flex-col">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex-1 flex flex-col overflow-hidden min-h-[440px]">
          {/* Header */}
          <div className="p-4 border-b border-slate-50 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-2">
              <ArrowLeftRight className="w-4.5 h-4.5 text-indigo-600" />
              <h3 className="font-bold text-slate-800 text-sm">ניטור תקשורת API חי (Live Webhook Debugger)</h3>
            </div>
            <span className="flex items-center gap-1.5 text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 block animate-ping"></span>
              השרת מאזין
            </span>
          </div>

          {/* Logs scroll area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 max-h-[420px] bg-slate-950 font-mono text-xs">
            {exchangeLogs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 py-16">
                <HelpCircle className="w-8 h-8 mb-2 opacity-40" />
                <p>כאן יוצגו קריאות ה-API, הפרמטרים ותשובות השרת בזמן אמת במהלך שיחה.</p>
                <p className="text-[10px] mt-1 text-slate-600">הפעילו את הטלפון משמאל כדי להתחיל בדיקה טכנית.</p>
              </div>
            ) : (
              exchangeLogs.map((log, idx) => (
                <div key={idx} className="border-b border-slate-900 pb-3 last:border-0">
                  <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                    <span>{log.timestamp}</span>
                    <span className={log.type === "request" ? "text-indigo-400 font-bold" : "text-emerald-400 font-bold"}>
                      {log.type === "request" ? "📥 CLIENT_REQUEST" : "📤 SERVER_RESPONSE"}
                    </span>
                  </div>

                  <p className="text-slate-300 font-semibold text-xs leading-relaxed">
                    {log.text}
                  </p>

                  {log.payload && (
                    <pre className="mt-1 bg-slate-900/60 p-2 rounded text-[11px] text-indigo-300 overflow-x-auto leading-relaxed border border-slate-900">
                      {JSON.stringify(log.payload, null, 2)}
                    </pre>
                  )}

                  {log.type === "response" && !log.text.includes("❌") && (
                    <pre className="mt-1 bg-slate-900/90 p-2.5 rounded text-[11px] text-emerald-400 border border-emerald-950/20 font-bold overflow-x-auto break-all">
                      {log.text.includes("תשובת השרת") ? log.text.split("\n")[1] : log.text}
                    </pre>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
