import React, { useState, useEffect } from "react";
import { Survey, Question } from "../types";
import { Plus, Trash2, ArrowUp, ArrowDown, Save, X, Settings2, HelpCircle } from "lucide-react";

interface SurveyEditorProps {
  survey: Survey | null; // null if creating new
  onSave: (surveyData: Partial<Survey>) => void;
  onCancel: () => void;
}

export default function SurveyEditor({ survey, onSave, onCancel }: SurveyEditorProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (survey) {
      setTitle(survey.title);
      setDescription(survey.description);
      setQuestions(survey.questions || []);
    } else {
      setTitle("");
      setDescription("");
      setQuestions([
        {
          id: "q-" + Math.random().toString(36).substring(2, 9),
          text: "אנא הקישו 1 לאישור, או 2 לביטול.",
          paramName: "ConfirmChoice",
          type: "digits",
          minDigits: 1,
          maxDigits: 1,
          choices: [
            { value: "1", label: "אישור" },
            { value: "2", label: "ביטול" }
          ]
        }
      ]);
    }
    setErrors({});
  }, [survey]);

  const addQuestion = () => {
    const qNum = questions.length + 1;
    const newQ: Question = {
      id: "q-" + Math.random().toString(36).substring(2, 9),
      text: `נא להשיב על שאלה מספר ${qNum}`,
      paramName: `Answer${qNum}`,
      type: "digits",
      minDigits: 1,
      maxDigits: 1,
      choices: []
    };
    setQuestions([...questions, newQ]);
  };

  const removeQuestion = (index: number) => {
    const updated = [...questions];
    updated.splice(index, 1);
    setQuestions(updated);
  };

  const moveQuestion = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === questions.length - 1) return;

    const updated = [...questions];
    const temp = updated[index];
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;
    setQuestions(updated);
  };

  const updateQuestionField = (index: number, field: keyof Question, value: any) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  // Choice mapping management
  const addChoice = (qIndex: number) => {
    const q = questions[qIndex];
    const currentChoices = q.choices || [];
    const valNum = currentChoices.length + 1;
    const updatedChoices = [...currentChoices, { value: valNum.toString(), label: `תווית מענה ${valNum}` }];
    updateQuestionField(qIndex, "choices", updatedChoices);
  };

  const removeChoice = (qIndex: number, cIndex: number) => {
    const q = questions[qIndex];
    const currentChoices = q.choices || [];
    const updatedChoices = [...currentChoices];
    updatedChoices.splice(cIndex, 1);
    updateQuestionField(qIndex, "choices", updatedChoices);
  };

  const updateChoiceField = (qIndex: number, cIndex: number, field: "value" | "label", val: string) => {
    const q = questions[qIndex];
    const currentChoices = q.choices || [];
    const updatedChoices = [...currentChoices];
    updatedChoices[cIndex] = { ...updatedChoices[cIndex], [field]: val };
    updateQuestionField(qIndex, "choices", updatedChoices);
  };

  const validate = () => {
    const tempErrors: Record<string, string> = {};
    if (!title.trim()) tempErrors.title = "כותרת הסקר היא חובה";

    // Validate parameters
    const paramNames = new Set<string>();
    questions.forEach((q, idx) => {
      if (!q.text.trim()) {
        tempErrors[`q-${idx}-text`] = "חובה להזין את הטקסט של השאלה להשמעה";
      }
      if (!q.paramName.trim()) {
        tempErrors[`q-${idx}-param`] = "שם הפרמטר הוא חובה";
      } else if (!/^[a-zA-Z0-9_]+$/.test(q.paramName)) {
        tempErrors[`q-${idx}-param`] = "שם הפרמטר חייב להכיל רק אותיות באנגלית, מספרים וקו תחתון";
      } else if (paramNames.has(q.paramName)) {
        tempErrors[`q-${idx}-param`] = "שם הפרמטר חייב להיות ייחודי בסקר זה";
      } else {
        paramNames.add(q.paramName);
      }
    });

    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    onSave({
      title,
      description,
      questions
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" dir="rtl">
      {/* Top action bar */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-800">
            {survey ? `עריכת סקר: ${survey.title}` : "יצירת סקר חדש"}
          </h2>
          <p className="text-xs text-slate-500">הגדירו את השאלות ואת סוגי המענה המבוקשים</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            ביטול
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>שמור סקר</span>
          </button>
        </div>
      </div>

      {/* Main Info */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">כותרת הסקר *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all outline-none"
            placeholder="לדוגמה: סקר שביעות רצון לקוחות"
          />
          {errors.title && <p className="text-rose-600 text-xs mt-1">{errors.title}</p>}
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">תיאור קצר</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all outline-none min-h-[80px]"
            placeholder="תיאור כללי של הסקר ומטרתו..."
          />
        </div>
      </div>

      {/* Questions Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-800">שאלות הסקר ({questions.length})</h3>
          <button
            type="button"
            onClick={addQuestion}
            className="px-3.5 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>הוסף שאלה</span>
          </button>
        </div>

        {questions.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-slate-200">
            <Settings2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500 font-medium">אין שאלות מוגדרות בסקר עדיין.</p>
            <button
              type="button"
              onClick={addQuestion}
              className="mt-3 text-xs font-bold text-indigo-600 hover:underline"
            >
              לחצו להוספת השאלה הראשונה
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {questions.map((q, idx) => (
              <div
                key={q.id}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 relative group"
              >
                {/* Drag-alike actions */}
                <div className="absolute left-4 top-4 flex items-center gap-1">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => moveQuestion(idx, "up")}
                    className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-700 disabled:opacity-30"
                    title="העבר למעלה"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === questions.length - 1}
                    onClick={() => moveQuestion(idx, "down")}
                    className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-700 disabled:opacity-30"
                    title="העבר למטה"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeQuestion(idx)}
                    className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 ml-1 transition-colors"
                    title="מחק שאלה"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="text-xs font-bold text-slate-400 mb-3">שאלה #{idx + 1}</div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  {/* Question Text */}
                  <div className="md:col-span-8">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      הודעה להשמעה (טקסט-אל-דיבור TTS) *
                    </label>
                    <input
                      type="text"
                      value={q.text}
                      onChange={(e) => updateQuestionField(idx, "text", e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-50/50 transition-all outline-none text-sm"
                      placeholder="לדוגמה: נא הקישו 1 לשביעות רצון גבוהה, 2 לשביעות רצון נמוכה"
                    />
                    {errors[`q-${idx}-text`] && (
                      <p className="text-rose-600 text-xs mt-1">{errors[`q-${idx}-text`]}</p>
                    )}
                  </div>

                  {/* Param Name */}
                  <div className="md:col-span-4">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      שם הפרמטר ב-API *
                    </label>
                    <input
                      type="text"
                      value={q.paramName}
                      onChange={(e) => updateQuestionField(idx, "paramName", e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-50/50 transition-all outline-none text-sm font-mono text-left"
                      dir="ltr"
                      placeholder="e.g. Satisfaction"
                    />
                    {errors[`q-${idx}-param`] && (
                      <p className="text-rose-600 text-xs mt-1">{errors[`q-${idx}-param`]}</p>
                    )}
                  </div>
                </div>

                {/* Additional Settings */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mt-4 pt-4 border-t border-slate-50">
                  {/* Type */}
                  <div className="md:col-span-4">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">סוג המענה המבוקש</label>
                    <select
                      value={q.type}
                      onChange={(e) => updateQuestionField(idx, "type", e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-50/50 outline-none text-sm bg-white"
                    >
                      <option value="digits">הקשת ספרות (Digits)</option>
                      <option value="record">הקלטה קולית (Record)</option>
                      <option value="voice">זיהוי דיבור והמרה לטקסט (Voice)</option>
                    </select>
                  </div>

                  {/* Min / Max Digits - Only if type is digits */}
                  {q.type === "digits" && (
                    <>
                      <div className="md:col-span-4">
                        <label className="block text-xs font-semibold text-slate-600 mb-1">מינימום ספרות</label>
                        <input
                          type="number"
                          min={1}
                          max={10}
                          value={q.minDigits ?? 1}
                          onChange={(e) => updateQuestionField(idx, "minDigits", parseInt(e.target.value) || 1)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-50/50 outline-none text-sm"
                        />
                      </div>
                      <div className="md:col-span-4">
                        <label className="block text-xs font-semibold text-slate-600 mb-1">מקסימום ספרות</label>
                        <input
                          type="number"
                          min={1}
                          max={10}
                          value={q.maxDigits ?? 1}
                          onChange={(e) => updateQuestionField(idx, "maxDigits", parseInt(e.target.value) || 1)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-50/50 outline-none text-sm"
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* Choices mapping for 'digits' type */}
                {q.type === "digits" && (
                  <div className="mt-4 pt-4 border-t border-slate-50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-slate-600">תרגום מקשים לטקסט (לאנליטיקה)</span>
                      <button
                        type="button"
                        onClick={() => addChoice(idx)}
                        className="text-[11px] font-bold text-indigo-600 hover:underline flex items-center gap-0.5 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        הוסף ערך תרגום
                      </button>
                    </div>

                    {q.choices && q.choices.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                        {q.choices.map((choice, cIdx) => (
                          <div key={cIdx} className="flex items-center gap-1 bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                            <input
                              type="text"
                              value={choice.value}
                              onChange={(e) => updateChoiceField(idx, cIdx, "value", e.target.value)}
                              className="w-12 px-1 py-1 rounded border border-slate-200 text-xs text-center font-mono"
                              placeholder="מקש"
                            />
                            <span className="text-slate-400 text-xs">→</span>
                            <input
                              type="text"
                              value={choice.label}
                              onChange={(e) => updateChoiceField(idx, cIdx, "label", e.target.value)}
                              className="flex-1 px-1.5 py-1 rounded border border-slate-200 text-xs"
                              placeholder="כותרת הסבר"
                            />
                            <button
                              type="button"
                              onClick={() => removeChoice(idx, cIdx)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400">
                        מומלץ להגדיר תרגום מענים (למשל: מקש <code className="bg-slate-100 px-0.5 rounded">1</code> יתורגם ל-&quot;מעולה&quot;) כדי שהגרפים בדף האנליטיקה יהיו מובנים וקריאים.
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </form>
  );
}
