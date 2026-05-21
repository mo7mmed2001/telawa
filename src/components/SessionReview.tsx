import React, { useState, useRef } from "react";
import { Student, Session, RecitationSegment, TajweedMistake } from "../types";
import { translations } from "../translations";
import { 
  Play, Pause, User, Star, Plus, Trash, Edit3, Check, Save, 
  Trash2, PlusCircle, AlertCircle, Sparkles, HelpCircle, 
  ChevronRight, Calendar, Volume2, Award, ChevronDown, Mic, Square
} from "lucide-react";

interface SessionReviewProps {
  students: Student[];
  sessionTitle: string;
  sessionParticipants: string[];
  sessionAudioUrl?: string; // The base64 raw audio url
  initialSegments: RecitationSegment[];
  initialGeneralFeedback: string;
  onSaveSession: (finalSession: Session) => void;
  onCancel: () => void;
  isReadOnly?: boolean; // Set to true if reviewing a past session
  language?: 'ar' | 'en';
}

export default function SessionReview({
  students,
  sessionTitle,
  sessionParticipants,
  sessionAudioUrl,
  initialSegments,
  initialGeneralFeedback,
  onSaveSession,
  onCancel,
  isReadOnly = false,
  language = "ar"
}: SessionReviewProps) {
  
  // Translation Helper
  const t = (key: string): string => {
    const dict = (translations[language] || translations["ar"]) as Record<string, string>;
    return dict[key] || key;
  };

  // Local editable states
  const [segments, setSegments] = useState<RecitationSegment[]>(initialSegments);
  const [generalFeedback, setGeneralFeedback] = useState(initialGeneralFeedback);
  const [editableNotes, setEditableNotes] = useState("");

  // Playback control for entire file with timestamp guides
  const [isPlayingMain, setIsPlayingMain] = useState(false);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // States for adding a new student on the fly (طلب الاسم)
  const [showQuickAddStudent, setShowQuickAddStudent] = useState<string | null>(null); // holds segment ID
  const [quickAddName, setQuickAddName] = useState("");

  // States for adding a new manual correction mistake
  const [addingMistakeForSegmentId, setAddingMistakeForSegmentId] = useState<string | null>(null);
  const [newMistakeText, setNewMistakeText] = useState("");
  const [newMistakeType, setNewMistakeType] = useState<'تجويد' | 'مخارج' | 'تشكيل' | 'حفظ'>('تجويد');
  const [newMistakeCorrection, setNewMistakeCorrection] = useState("");
  const [newMistakeExplanation, setNewMistakeExplanation] = useState("");

  // Edit mistake tracking
  const [editingMistakeId, setEditingMistakeId] = useState<string | null>(null);
  
  // Teacher recording correction states
  const [isRecordingCorrection, setIsRecordingCorrection] = useState(false);
  const [correctionRecDuration, setCorrectionRecDuration] = useState(0);
  const [recordedCorrectionAudioUrl, setRecordedCorrectionAudioUrl] = useState<string | null>(null);
  
  const correctionMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const correctionAudioChunksRef = useRef<Blob[]>([]);
  const correctionTimerRef = useRef<any>(null);

  const startRecordingCorrection = async () => {
    correctionAudioChunksRef.current = [];
    setRecordedCorrectionAudioUrl(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          correctionAudioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(correctionAudioChunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onloadend = () => {
          setRecordedCorrectionAudioUrl(reader.result as string);
        };
        reader.readAsDataURL(audioBlob);
        
        stream.getTracks().forEach((track) => track.stop());
      };

      correctionMediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecordingCorrection(true);
      setCorrectionRecDuration(0);

      correctionTimerRef.current = setInterval(() => {
        setCorrectionRecDuration((prev) => prev + 1);
      }, 1000);

    } catch (err) {
      console.warn("فشل الوصول إلى الميكروفون:", err);
      alert(language === "ar" ? "الرجاء إعطاء صلاحية الميكروفون للمتصفح لتسجيل بصمة الصوت." : "Please give microphone permission to record correction.");
    }
  };

  const stopRecordingCorrection = () => {
    if (correctionMediaRecorderRef.current && isRecordingCorrection) {
      correctionMediaRecorderRef.current.stop();
      setIsRecordingCorrection(false);
      if (correctionTimerRef.current) {
        clearInterval(correctionTimerRef.current);
      }
    }
  };

  const triggerEditMistake = (segmentId: string, mistake: TajweedMistake) => {
    setEditingMistakeId(mistake.id);
    setAddingMistakeForSegmentId(segmentId);
    setNewMistakeText(mistake.text);
    setNewMistakeType(mistake.type);
    setNewMistakeCorrection(mistake.correction);
    setNewMistakeExplanation(mistake.explanation);
    setRecordedCorrectionAudioUrl(mistake.teacherCorrectionAudioUrl || null);
  };

  // Handle student select change
  const handleStudentSelect = (segmentId: string, studentId: string) => {
    setSegments(prev => prev.map(seg => {
      if (seg.id === segmentId) {
        return { ...seg, studentId };
      }
      return seg;
    }));
  };

  // Add a new student on the fly (طلب الاسم وتحديد فوري)
  const handleQuickAddStudent = (segmentId: string) => {
    if (!quickAddName.trim()) return;
    
    // Construct fake temporary student to append
    const tempStudentId = `st-quick-${Date.now()}`;
    const newSt: Student = {
      id: tempStudentId,
      name: quickAddName,
      registeredAt: new Date().toISOString(),
      accentNotes: "تم تسجيله سريعاً أثناء تصحيح الحلقة."
    };

    // Update parent list conceptually by mutating or triggering inline updates (this can be resolved on save)
    // For now, we update local segments immediately and register it
    // Add to students list by pushing into localStorage in App
    students.push(newSt); // Add to current reference array
    localStorage.setItem("mizan_students", JSON.stringify(students));

    setSegments(prev => prev.map(seg => {
      if (seg.id === segmentId) {
        return { ...seg, studentId: tempStudentId, studentGuess: undefined };
      }
      return seg;
    }));

    setQuickAddName("");
    setShowQuickAddStudent(null);
  };

  // Delete mistake from segment
  const handleDeleteMistake = (segmentId: string, mistakeId: string) => {
    setSegments(prev => prev.map(seg => {
      if (seg.id === segmentId) {
        return {
          ...seg,
          mistakes: seg.mistakes.filter(m => m.id !== mistakeId)
        };
      }
      return seg;
    }));
  };

  // Trigger New Mistake / Edit Mistake Form
  const handleAddMistake = (segmentId: string) => {
    if (!newMistakeText.trim() || !newMistakeCorrection.trim()) {
      alert(t("error_empty_mistake_text"));
      return;
    }

    if (editingMistakeId) {
      // Editing an existing mistake!
      setSegments(prev => prev.map(seg => {
        if (seg.id === segmentId) {
          return {
            ...seg,
            mistakes: seg.mistakes.map(m => {
              if (m.id === editingMistakeId) {
                return {
                  ...m,
                  text: newMistakeText,
                  type: newMistakeType,
                  correction: newMistakeCorrection,
                  explanation: newMistakeExplanation || t("use_teacher_reference"),
                  teacherCorrectionAudioUrl: recordedCorrectionAudioUrl || m.teacherCorrectionAudioUrl
                };
              }
              return m;
            })
          };
        }
        return seg;
      }));
    } else {
      // Adding a brand new mistake!
      const newMistake: TajweedMistake = {
        id: `m-cust-${Date.now()}`,
        text: newMistakeText,
        type: newMistakeType,
        correction: newMistakeCorrection,
        explanation: newMistakeExplanation || t("use_teacher_reference"),
        teacherCorrectionAudioUrl: recordedCorrectionAudioUrl || undefined
      };

      setSegments(prev => prev.map(seg => {
        if (seg.id === segmentId) {
          return {
            ...seg,
            mistakes: [...seg.mistakes, newMistake]
          };
        }
        return seg;
      }));
    }

    // Reset mistake boxes
    setNewMistakeText("");
    setNewMistakeCorrection("");
    setNewMistakeExplanation("");
    setRecordedCorrectionAudioUrl(null);
    setEditingMistakeId(null);
    setAddingMistakeForSegmentId(null);
  };

  // Modify Segment core grading
  const handleScoreChange = (segmentId: string, val: number) => {
    let grade: 'ممتاز' | 'جيد جداً' | 'جيد' | 'مقبول' | 'بحاجة لمراجعة' = 'مقبول';
    if (val >= 10) grade = 'ممتاز';
    else if (val >= 8) grade = 'جيد جداً';
    else if (val >= 7) grade = 'جيد';
    else if (val >= 5) grade = 'مقبول';
    else grade = 'بحاجة لمراجعة';

    setSegments(prev => prev.map(seg => {
      if (seg.id === segmentId) {
        return { ...seg, score: val, grade };
      }
      return seg;
    }));
  };

  // Modify Segment individual comments/notes
  const handleSegmentNotesChange = (segmentId: string, notes: string) => {
    setSegments(prev => prev.map(seg => {
      if (seg.id === segmentId) {
        return { ...seg, notes };
      }
      return seg;
    }));
  };

  // Change verse transcription text
  const handleTranscriptionChange = (segmentId: string, val: string) => {
    setSegments(prev => prev.map(seg => {
      if (seg.id === segmentId) {
        return { ...seg, transcription: val };
      }
      return seg;
    }));
  };

  // Playback helper
  const handlePlayMainAudio = () => {
    if (!audioPlayerRef.current) return;
    if (isPlayingMain) {
      audioPlayerRef.current.pause();
      setIsPlayingMain(false);
    } else {
      audioPlayerRef.current.play();
      setIsPlayingMain(true);
    }
  };

  // Save changes permanent
  const triggerSaveSession = () => {
    const finalSession: Session = {
      id: `sess-${Date.now()}`,
      date: new Date().toISOString(),
      title: sessionTitle,
      audioUrl: sessionAudioUrl,
      participants: sessionParticipants,
      segments,
      notes: editableNotes || generalFeedback
    };

    onSaveSession(finalSession);
  };

  return (
    <div className="space-y-6 text-slate-800" id="session-review-workbench">
      
      {/* Arabic layout banner wrapper */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="space-y-1">
          <span className="text-[10px] text-[#064E3B] bg-emerald-50 px-2 py-0.5 rounded font-extrabold border border-emerald-100">
            {isReadOnly ? "عرض الأرشيف الفردي" : "مراجعة وتصويب المعلم للحلقة"}
          </span>
          <h2 className="text-base font-extrabold text-[#064E3B]">{sessionTitle}</h2>
          <p className="text-[10px] text-slate-400 font-mono">تاريخ الحلقة: {new Date().toLocaleDateString("ar-EG")}</p>
        </div>

        <div className="flex gap-2 w-full lg:w-auto">
          <button
            onClick={onCancel}
            className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl transition-all mr-auto"
          >
            {isReadOnly ? "العودة للقائمة" : "الغاء وإغلاق الخبير"}
          </button>
          
          {!isReadOnly && (
            <button
              onClick={triggerSaveSession}
              className="cursor-pointer bg-[#064E3B] hover:bg-[#065F46] active:scale-95 transition-all text-white text-xs font-bold px-5 py-2.5 rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-900/10"
            >
              <Save className="w-3.5 h-3.5 ml-1" />
              حفظ الحلقة واعتماد النتائج
            </button>
          )}
        </div>
      </div>

      {/* Main audio player for reference */}
      {sessionAudioUrl && (
        <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100/60 flex flex-col md:flex-row items-center gap-4 justify-between">
          <div className="flex items-center gap-2.5">
            <Volume2 className="w-4 h-4 text-[#064E3B] animate-pulse" />
            <div className="text-right">
              <span className="text-xs font-extrabold text-[#064E3B] block">صوت التلاوة المجمع المحفوظ</span>
              <p className="text-[10px] text-slate-500">تفقد علامات الثواني تحت كل مقطع بالأسفل للنقر والإنصات الموجه.</p>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <audio 
              ref={audioPlayerRef} 
              src={sessionAudioUrl} 
              onEnded={() => setIsPlayingMain(false)}
              controls 
              className="h-9 w-full md:w-[260px]" 
            />
            <button
              onClick={handlePlayMainAudio}
              className={`cursor-pointer p-2 rounded-full text-white ${isPlayingMain ? 'bg-amber-600' : 'bg-[#064E3B]'} hover:scale-105 transition-all`}
            >
              {isPlayingMain ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      )}

      {/* General Feedbacks Block */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3">
        <h3 className="font-extrabold text-[#064E3B] text-xs flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-[#D97706] fill-[#D97706]" />
          توصية توجيهية عامة لحلقة اليوم
        </h3>
        {isReadOnly ? (
          <p className="text-xs text-slate-600 leading-relaxed font-light whitespace-pre-wrap">{generalFeedback}</p>
        ) : (
          <textarea
            rows={2}
            value={generalFeedback}
            onChange={(e) => setGeneralFeedback(e.target.value)}
            placeholder="اكتب التوجيهات الروحية أو التربوية العامة للطلاب..."
            className="w-full p-3 border border-slate-200 rounded-xl text-xs text-slate-700 bg-slate-50/80 text-right focus:outline-none focus:ring-2 focus:ring-[#065F46]/5 focus:border-[#065F46]"
          />
        )}
      </div>

      {/* Segment Workshop Lists */}
      <div className="space-y-4">
        <h3 className="text-sm font-extrabold text-slate-900 border-b border-slate-150 pb-2">تفصيل تلاوات الطلاب الفردية ({segments.length})</h3>
        
        {segments.map((seg, idx) => {
          const matchedStudent = students.find(s => s.id === seg.studentId);
          const isQuickAdding = showQuickAddStudent === seg.id;
          const isAddingMistake = addingMistakeForSegmentId === seg.id;

          return (
            <div 
              key={seg.id || idx} 
              className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col hover:border-[#065F46]/40 transition-all duration-300"
            >
              {/* Segment Header */}
              <div className="bg-slate-50/80 p-4 border-b border-slate-200/65 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#064E3B] text-white flex items-center justify-center font-bold font-mono text-[11px]">
                    {idx + 1}
                  </span>
                  <div className="text-right">
                    <span className="font-extrabold text-xs text-[#064E3B] block">تلاوة {seg.surahPage || "مقطع غير مسمى"}</span>
                    <span className="text-[9px] text-slate-400 font-mono">توقيت المقطع: {seg.startTime} ← {seg.endTime} من الملف الصوتي المرفق</span>
                  </div>
                </div>

                {/* Score Rate badge */}
                <div className="flex items-center gap-2">
                  <div className="flex flex-col items-end">
                    <span className="text-[9px] text-slate-400 font-semibold font-mono">التقييم المقترح</span>
                    <span className="text-xs bg-emerald-50 text-[#064E3B] border border-emerald-100 font-extrabold px-2 py-0.5 rounded">
                      ({seg.score}/10) - {seg.grade}
                    </span>
                  </div>
                </div>
              </div>

              {/* Segment Body */}
              <div className="p-5 md:p-6 space-y-5">
                {/* 1. Student identity section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-750 flex items-center gap-1">
                      <User className="w-4 h-4 text-[#065F46]" />
                      ربط وتحديد اسم القارئ في هذا المقطع:
                    </label>
                    
                    {isReadOnly ? (
                      <span className="font-extrabold text-xs text-slate-800 block bg-slate-50 border border-slate-150 p-2 rounded-xl">
                        {matchedStudent?.name || "طالب مجهول أو لم يتم الملاءمة"}
                      </span>
                    ) : (
                      <div className="flex gap-2">
                        <select
                          value={seg.studentId}
                          onChange={(e) => handleStudentSelect(seg.id, e.target.value)}
                          className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-[#065F46]"
                        >
                          <option value="">-- اختر طالب من السجل --</option>
                          {students.map(st => (
                            <option key={st.id} value={st.id}>
                              {st.name} {st.voiceSampleUrl ? "(بصمة مسجلة)" : ""}
                            </option>
                          ))}
                        </select>

                        {/* Quick Add trigger */}
                        <button
                          onClick={() => setShowQuickAddStudent(isQuickAdding ? null : seg.id)}
                          className="cursor-pointer bg-emerald-50 hover:bg-emerald-100 text-[#064E3B] border border-emerald-100 text-xs px-3 rounded-xl font-bold transition-all"
                        >
                          + طالب جديد
                        </button>
                      </div>
                    )}

                    {/* Gemini Guess Alert */}
                    {seg.studentGuess && !matchedStudent && (
                      <p className="text-[10px] bg-amber-50 text-amber-800 border border-amber-100/60 p-2 rounded-lg leading-relaxed">
                        💡 <strong>تلميح ميزان الذكي:</strong> تم مطابقة التلاوة مع نبرة الطالب <strong>"{seg.studentGuess}"</strong> بناء على عينة صوته المرفقة. يرجى تأكيدها أو تعديلها من المسرد.
                      </p>
                    )}
                  </div>

                  {/* Slider Grade component if editable */}
                  {!isReadOnly && (
                    <div className="space-y-1.5 p-3 bg-slate-50/70 rounded-2xl border border-slate-200">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-slate-700">تقييم الأداء الحالي (الدرجة)</span>
                        <span className="text-[#064E3B] font-mono">{seg.score} / 10</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        step="1"
                        value={seg.score}
                        onChange={(e) => handleScoreChange(seg.id, parseInt(e.target.value))}
                        className="w-full accent-[#064E3B] h-1 cursor-pointer bg-slate-200 rounded-full"
                      />
                    </div>
                  )}
                </div>

                {/* Quick Add Student Inline Panel Form */}
                {isQuickAdding && !isReadOnly && (
                  <div className="p-4 bg-emerald-50/30 border border-emerald-100 rounded-2xl space-y-2 flex flex-col md:flex-row gap-3 items-end">
                    <div className="flex-1 space-y-1">
                      <label className="text-[10px] font-bold text-emerald-950 block">ادخل اسم الطالب الجديد ثلاثي:</label>
                      <input
                        type="text"
                        placeholder="مثال: سيف الإسلام فوزي"
                        value={quickAddName}
                        onChange={(e) => setQuickAddName(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleQuickAddStudent(seg.id)}
                      className="cursor-pointer bg-[#064E3B] hover:bg-[#065F46] text-white text-xs font-semibold px-4 py-2 rounded-lg"
                    >
                      تسجيل الطالب وتطبيقه
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowQuickAddStudent(null)}
                      className="cursor-pointer text-xs text-slate-500 bg-slate-200 px-3 py-2 rounded-lg"
                    >
                      إلغاء
                    </button>
                  </div>
                )}

                {/* 2. Verse Display Text portion */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 block">التفريغ النصي لتلاوة الطالب وتطابق الكلمات للآيات:</label>
                  {isReadOnly ? (
                    <div className="p-4 bg-slate-50/45 border border-slate-150 rounded-xl text-center text-sm md:text-base text-[#064E3B] font-extrabold leading-loose font-serif">
                      {seg.transcription}
                    </div>
                  ) : (
                    <textarea
                      rows={2}
                      value={seg.transcription}
                      onChange={(e) => handleTranscriptionChange(seg.id, e.target.value)}
                      className="w-full p-3 border border-slate-200 rounded-xl text-center text-xs md:text-sm font-semibold leading-loose font-serif text-[#064E3B] bg-amber-50/5 focus:outline-none focus:ring-2 focus:ring-[#065F46]/5 focus:border-[#065F46]"
                    />
                  )}
                </div>

                {/* 3. Errors List corrected block */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-750 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4 text-red-600" />
                      {t("mistakes_detected_lbl")} ({seg.mistakes.length}):
                    </label>
                    
                    {!isReadOnly && (
                      <button
                        onClick={() => {
                          setAddingMistakeForSegmentId(isAddingMistake ? null : seg.id);
                          setEditingMistakeId(null);
                          setNewMistakeText("");
                          setNewMistakeCorrection("");
                          setNewMistakeExplanation("");
                          setRecordedCorrectionAudioUrl(null);
                        }}
                        className="cursor-pointer text-[10px] bg-red-50 hover:bg-red-100 border border-red-100 text-red-700 font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all"
                      >
                        <Plus className="w-3 h-3 ml-0.5" />
                        {t("add_mistake_btn")}
                      </button>
                    )}
                  </div>

                  {/* Add manual / Edit correction form box */}
                  {isAddingMistake && !isReadOnly && (
                    <div className="p-4 bg-red-50/30 border border-red-100 rounded-2xl grid grid-cols-1 md:grid-cols-4 gap-3 items-end text-right">
                      <div className="space-y-1 col-span-1">
                        <label className="text-[10px] font-bold text-slate-800 block">{t("mistake_text_lbl")}</label>
                        <input
                          type="text"
                          placeholder={language === "ar" ? "مثال: كَلَّى" : "e.g. Kalla"}
                          value={newMistakeText}
                          onChange={(e) => setNewMistakeText(e.target.value)}
                          className="w-full p-1.5 bg-white border border-slate-250 rounded-lg text-xs"
                        />
                      </div>
                      
                      <div className="space-y-1 col-span-1">
                        <label className="text-[10px] font-bold text-slate-800 block">{t("mistake_type_lbl")}</label>
                        <select
                          value={newMistakeType}
                          onChange={(e: any) => setNewMistakeType(e.target.value)}
                          className="w-full p-1.5 bg-white border border-slate-250 rounded-lg text-xs focus:outline-none focus:border-[#065F46]"
                        >
                          <option value="تجويد">{t("mistake_type_tajweed")}</option>
                          <option value="مخارج">{t("mistake_type_makharij")}</option>
                          <option value="تشكيل">{t("mistake_type_tashkeel")}</option>
                          <option value="حفظ">{t("mistake_type_hifz")}</option>
                        </select>
                      </div>

                      <div className="space-y-1 col-span-1">
                        <label className="text-[10px] font-bold text-slate-800 block">{t("mistake_correction_lbl")}</label>
                        <input
                          type="text"
                          placeholder={language === "ar" ? "مثال: كَلَّا" : "e.g. Kallaa"}
                          value={newMistakeCorrection}
                          onChange={(e) => setNewMistakeCorrection(e.target.value)}
                          className="w-full p-1.5 bg-white border border-slate-250 rounded-lg text-xs"
                        />
                      </div>

                      <div className="col-span-1 flex gap-1 justify-end">
                        <button
                          type="button"
                          onClick={() => handleAddMistake(seg.id)}
                          className="cursor-pointer bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold px-3 py-1.8 rounded-lg"
                        >
                          {editingMistakeId ? t("save_mistake_btn") : t("add_btn")}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAddingMistakeForSegmentId(null);
                            setEditingMistakeId(null);
                            setRecordedCorrectionAudioUrl(null);
                          }}
                          className="cursor-pointer text-[11px] text-slate-500 bg-slate-200 px-2 py-1.8 rounded-lg"
                        >
                          {t("btn_cancel")}
                        </button>
                      </div>

                      {/* Recitation Correction Fingerprint Recorder block */}
                      <div className="col-span-1 md:col-span-4 p-3 bg-[#064E3B]/5 rounded-xl border border-[#064E3B]/10 space-y-2 text-right">
                        <label className="text-[10px] font-bold text-slate-800 block">
                          {t("audio_correction_title")}:
                        </label>
                        
                        <div className="flex flex-col sm:flex-row items-center gap-3 justify-between">
                          {isRecordingCorrection ? (
                            <button
                              type="button"
                              onClick={stopRecordingCorrection}
                              className="cursor-pointer bg-amber-600 hover:bg-amber-750 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5"
                            >
                              <Square className="w-3.5 h-3.5 mr-1" />
                              <span>{t("stop_correction_btn")} ({correctionRecDuration}s)</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={startRecordingCorrection}
                              className="cursor-pointer bg-[#064E3B] hover:bg-[#065F46] text-white text-[11px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5"
                            >
                              <Mic className="w-3.5 h-3.5" />
                              <span>{t("record_correction_btn")}</span>
                            </button>
                          )}

                          {recordedCorrectionAudioUrl ? (
                            <div className="flex items-center gap-2">
                              <audio src={recordedCorrectionAudioUrl} controls className="h-6 w-36" />
                              <span className="text-[10px] text-emerald-800 font-bold bg-[#064E3B]/10 px-2 py-0.5 rounded-full">
                                {t("teacher_audio_attached")}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400">{t("no_teacher_audio")}</span>
                          )}
                        </div>
                      </div>

                      <div className="col-span-1 md:col-span-4 space-y-1">
                        <label className="text-[10px] font-bold text-slate-800 block">{t("mistake_explanation_lbl")}</label>
                        <input
                          type="text"
                          placeholder={language === "ar" ? "مثال: المد طبيعي يمد حركتين فقط ولا يزاد عليه" : "e.g. Natural Madd of 2 counts only"}
                          value={newMistakeExplanation}
                          onChange={(e) => setNewMistakeExplanation(e.target.value)}
                          className="w-full p-1.5 bg-white border border-slate-250 rounded-lg text-xs"
                        />
                      </div>
                    </div>
                  )}

                  {/* Rendering Mistakes list */}
                  {seg.mistakes.length === 0 ? (
                    <div className="p-3 bg-emerald-50/20 rounded-xl text-center text-xs text-emerald-800 border border-emerald-100 font-semibold leading-relaxed">
                      {t("clean_recitation_lbl")}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {seg.mistakes.map((mistake, mIdx) => (
                        <div key={mistake.id || mIdx} className="bg-slate-50/50 p-4 rounded-xl border border-slate-200 space-y-2 relative group hover:border-[#065F46]/30 transition-all">
                          {/* Trash / Edit indicators */}
                          {!isReadOnly && (
                            <div className="absolute left-2.5 top-2.5 flex items-center gap-1.5 opacity-50 hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => triggerEditMistake(seg.id, mistake)}
                                className="cursor-pointer text-slate-500 hover:text-[#064E3B] p-1"
                                title={t("edit_btn")}
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteMistake(seg.id, mistake.id)}
                                className="cursor-pointer text-red-500 hover:text-red-600 p-1"
                                title="حذف"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}

                          <div className="flex justify-between text-[10px] font-mono leading-none border-b border-slate-100 pb-1.5">
                            <span className={`${
                              mistake.type === "تجويد" ? "text-amber-800 font-bold bg-amber-100" :
                              mistake.type === 'مخارج' ? 'text-teal-800 font-bold bg-teal-100' :
                              mistake.type === 'تشكيل' ? 'text-purple-800 font-bold bg-purple-100' :
                              'text-red-800 font-bold bg-red-100'
                            } px-1.5 py-0.5 rounded`}>
                              {mistake.type === "تجويد" ? t("mistake_type_tajweed") :
                               mistake.type === "مخارج" ? t("mistake_type_makharij") :
                               mistake.type === "تشكيل" ? t("mistake_type_tashkeel") :
                               t("mistake_type_hifz")}
                            </span>
                            <span className="text-slate-400 px-1 ml-4 select-none">#{mIdx + 1}</span>
                          </div>

                          <div className="space-y-1">
                            <p className="text-xs font-medium">
                              <span className="text-slate-500 font-light text-[11px]">{t("mistake_word")}</span>{" "}
                              <strong className="text-red-600 font-extrabold bg-red-50/50 px-1.5 py-0.5 rounded">{mistake.text}</strong>
                            </p>
                            <p className="text-xs font-medium pt-0.5">
                              <span className="text-slate-500 font-light text-[11px]">{t("mistake_correction")}</span>{" "}
                              <strong className="text-emerald-800 font-semibold bg-emerald-50/60 px-1.5 py-0.5 rounded">{mistake.correction}</strong>
                            </p>
                          </div>

                          {mistake.explanation && (
                            <p className="text-[10px] text-slate-500 font-light leading-relaxed border-t border-slate-150 pt-1.5 italic">
                              "{mistake.explanation}"
                            </p>
                          )}

                          {mistake.teacherCorrectionAudioUrl && (
                            <div className="p-1.5 bg-[#064E3B]/5 rounded-lg border border-[#064E3B]/10 flex flex-col gap-1 text-[10px] mt-2 text-right">
                              <span className="text-[#064E3B] font-bold">{t("listen_teacher_correction")}:</span>
                              <audio src={mistake.teacherCorrectionAudioUrl} controls className="h-6 w-full" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 4. Teacher's feedback comments box */}
                <div className="space-y-1.5 pt-2">
                  <label className="text-xs font-bold text-slate-750 block">ملاحظات فضيلة الشيخ المعلم وتوجيهاته الفردية:</label>
                  {isReadOnly ? (
                    <p className="p-3 bg-slate-50 rounded-xl text-xs text-slate-700 leading-normal italic text-right font-light">
                      " {seg.notes || "تلاوة طيبة ومرتبة."} "
                    </p>
                  ) : (
                    <input
                      type="text"
                      placeholder="مثال: أحسنت الترتيل، المخرج دقيق، انتبه لغنة النون المشددة المرة القادمة."
                      value={seg.notes}
                      onChange={(e) => handleSegmentNotesChange(seg.id, e.target.value)}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-[#065F46]"
                    />
                  )}
                </div>

              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
