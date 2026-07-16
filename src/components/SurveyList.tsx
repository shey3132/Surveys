import { Survey, SurveyResponse } from "../types";
import { Plus, Edit2, Trash2, Calendar, Clipboard, CheckCircle2, Play, ChevronLeft } from "lucide-react";

interface SurveyListProps {
  surveys: Survey[];
  responses: SurveyResponse[];
  selectedSurveyId: string | null;
  onSelectSurvey: (id: string) => void;
  onCreateSurvey: () => void;
  onEditSurvey: (survey: Survey) => void;
  onDeleteSurvey: (id: string) => void;
}

export default function SurveyList({
  surveys,
  responses,
  selectedSurveyId,
  onSelectSurvey,
  onCreateSurvey,
  onEditSurvey,
  onDeleteSurvey,
}: SurveyListProps) {
  
  const getResponseCount = (surveyId: string) => {
    return responses.filter((r) => r.surveyId === surveyId && r.completed).length;
  };

  const getPartialResponseCount = (surveyId: string) => {
    return responses.filter((r) => r.surveyId === surveyId && !r.completed).length;
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Top Banner & Action */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">הסקרים הטלפוניים שלכם</h2>
          <p className="text-xs text-slate-500 mt-0.5">נהלו את השאלונים, צפו בכמויות המענה וקשרו אותם לימות המשיח</p>
        </div>
        <button
          onClick={onCreateSurvey}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>יצירת סקר חדש</span>
        </button>
      </div>

      {surveys.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200">
          <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Clipboard className="w-7 h-7 text-slate-400" />
          </div>
          <h3 className="font-bold text-slate-800 mb-1">אין סקרים רשומים במערכת</h3>
          <p className="text-slate-500 text-xs max-w-sm mx-auto mb-4 leading-relaxed">
            לחצו על הכפתור כדי להקים את סקר ה-API הטלפוני הראשון שלכם, להוסיף שאלות ולחבר למערכת ימות המשיח.
          </p>
          <button
            onClick={onCreateSurvey}
            className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
          >
            צור סקר ראשון עכשיו
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {surveys.map((survey) => {
            const isSelected = selectedSurveyId === survey.id;
            const compCount = getResponseCount(survey.id);
            const partCount = getPartialResponseCount(survey.id);
            
            return (
              <div
                key={survey.id}
                onClick={() => onSelectSurvey(survey.id)}
                className={`group rounded-2xl border bg-white p-5 shadow-sm transition-all duration-300 relative flex flex-col justify-between cursor-pointer ${
                  isSelected
                    ? "border-indigo-600 ring-2 ring-indigo-50"
                    : "border-slate-100 hover:border-slate-300 hover:shadow"
                }`}
              >
                {/* Active check indicator */}
                {isSelected && (
                  <span className="absolute top-4 left-4 bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    סקר פעיל
                  </span>
                )}

                <div>
                  <h3 className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors text-base line-clamp-1">
                    {survey.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 min-h-[32px] leading-relaxed">
                    {survey.description || "אין תיאור מוגדר לסקר זה."}
                  </p>

                  {/* Metadata Row */}
                  <div className="flex flex-wrap items-center gap-y-2 gap-x-4 mt-4 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(survey.createdAt).toLocaleDateString("he-IL")}
                    </span>
                    <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                      {survey.questions?.length || 0} שאלות
                    </span>
                  </div>
                </div>

                {/* Responses brief and actions */}
                <div className="mt-5 pt-4 border-t border-slate-50 flex items-center justify-between">
                  <div className="flex gap-3 text-xs">
                    <div>
                      <span className="block font-bold text-slate-700 font-mono text-sm">{compCount}</span>
                      <span className="text-[10px] text-slate-400">מענים מלאים</span>
                    </div>
                    {partCount > 0 && (
                      <div>
                        <span className="block font-bold text-amber-600 font-mono text-sm">{partCount}</span>
                        <span className="text-[10px] text-slate-400">בשלבי מענה</span>
                      </div>
                    )}
                  </div>

                  {/* Action group */}
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onEditSurvey(survey)}
                      className="p-2 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-700 transition-colors"
                      title="עריכת סקר"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDeleteSurvey(survey.id)}
                      className="p-2 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                      title="מחיקת סקר"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onSelectSurvey(survey.id)}
                      className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-semibold hover:bg-indigo-100 transition-colors flex items-center gap-1 ml-1"
                    >
                      <Play className="w-3 h-3" />
                      <span>הפעל בסימולטור</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
