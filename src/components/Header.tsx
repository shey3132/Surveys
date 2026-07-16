import { Layout, PhoneCall } from "lucide-react";

export default function Header({ surveyCount }: { surveyCount: number }) {
  return (
    <header className="bg-white border-b border-slate-100 sticky top-0 z-50 shadow-sm" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between py-4 gap-4">
          
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-md shadow-indigo-100">
              📞
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800 tracking-tight">ימות המשיח - ניהול סקרים טלפוניים</h1>
              <p className="text-xs text-slate-500">דף ניהול ובקרה ראשי (ממשק מנהל)</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-xl border border-indigo-100">
              מחובר בהצלחה • {surveyCount} סקרים פעילים
            </span>
          </div>

        </div>
      </div>
    </header>
  );
}
