import React, { useState, useEffect, useRef } from "react";
import { Student, Session, RecitationSegment } from "./types";
import { DEFAULT_STUDENTS, DEFAULT_SESSIONS } from "./initialData";
import Dashboard from "./components/Dashboard";
import StudentsList from "./components/StudentsList";
import SessionRecorder from "./components/SessionRecorder";
import SessionReview from "./components/SessionReview";
import { translations } from "./translations";
import { 
  Users, Clock, LayoutDashboard, Sparkles, Volume2, 
  HelpCircle, AlertCircle, RefreshCw, Star, Info, Edit, Mic, Trash2, Globe, Square, Settings
} from "lucide-react";

export default function App() {
  const [students, setStudents] = useState<Student[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  
  // High-fidelity Multi-language Translation State & Helper
  const [language, setLanguage] = useState<'ar' | 'en'>(() => {
    return (localStorage.getItem("mizan_language") as 'ar' | 'en') || "ar";
  });

  useEffect(() => {
    document.dir = language === "ar" ? "rtl" : "ltr";
    localStorage.setItem("mizan_language", language);
  }, [language]);

  const t = (key: string): string => {
    const dict = translations[language] as Record<string, string>;
    return dict[key] || key;
  };
  
  const [teacherName, setTeacherName] = useState(() => localStorage.getItem("mizan_teacher_name") || "عمر فاروق");
  const [isEditingTeacher, setIsEditingTeacher] = useState(false);
  const [teacherInput, setTeacherInput] = useState("");

  // Teacher voice fingerprint states
  const [teacherVoice, setTeacherVoice] = useState(() => localStorage.getItem("mizan_teacher_voice") || "");
  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [isRecordingTeacher, setIsRecordingTeacher] = useState(false);
  const [teacherRecSecs, setTeacherRecSecs] = useState(0);

  const teacherMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const teacherAudioChunksRef = useRef<Blob[]>([]);
  const teacherTimerRef = useRef<any>(null);

  const handleTeacherVoiceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setTeacherVoice(base64);
        localStorage.setItem("mizan_teacher_voice", base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const startRecordingTeacher = async () => {
    teacherAudioChunksRef.current = [];
    setTeacherRecSecs(0);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          teacherAudioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(teacherAudioChunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          setTeacherVoice(base64);
          localStorage.setItem("mizan_teacher_voice", base64);
        };
        reader.readAsDataURL(audioBlob);
        
        stream.getTracks().forEach((track) => track.stop());
      };

      teacherMediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecordingTeacher(true);

      teacherTimerRef.current = setInterval(() => {
        setTeacherRecSecs((prev) => prev + 1);
      }, 1000);

    } catch (err) {
      console.error("فشل الوصول إلى الميكروفون:", err);
      alert(language === "ar" ? "الرجاء إعطاء صلاحية الميكروفون للمتصفح لتسجيل بصمة الصوت." : "Please give microphone permission to record voice print.");
    }
  };

  const stopRecordingTeacher = () => {
    if (teacherMediaRecorderRef.current && isRecordingTeacher) {
      teacherMediaRecorderRef.current.stop();
      setIsRecordingTeacher(false);
      if (teacherTimerRef.current) {
        clearInterval(teacherTimerRef.current);
      }
    }
  };

  const deleteTeacherVoice = () => {
    setTeacherVoice("");
    localStorage.removeItem("mizan_teacher_voice");
  };

  const [currentTab, setCurrentTab] = useState<string>("dashboard");
  const [activeReviewSession, setActiveReviewSession] = useState<{
    title: string;
    participants: string[];
    audioUrl?: string;
    segments: RecitationSegment[];
    generalFeedback: string;
    isReadOnly: boolean;
  } | null>(null);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Load from local storage or seed initial dummy data
  useEffect(() => {
    const rawSt = localStorage.getItem("mizan_students");
    const rawSess = localStorage.getItem("mizan_sessions");

    if (rawSt) {
      setStudents(JSON.parse(rawSt));
    } else {
      setStudents(DEFAULT_STUDENTS);
      localStorage.setItem("mizan_students", JSON.stringify(DEFAULT_STUDENTS));
    }

    if (rawSess) {
      setSessions(JSON.parse(rawSess));
    } else {
      setSessions(DEFAULT_SESSIONS);
      localStorage.setItem("mizan_sessions", JSON.stringify(DEFAULT_SESSIONS));
    }
  }, []);

  // Save state helpers
  const saveStudents = (updated: Student[]) => {
    setStudents(updated);
    localStorage.setItem("mizan_students", JSON.stringify(updated));
  };

  const saveSessions = (updated: Session[]) => {
    setSessions(updated);
    localStorage.setItem("mizan_sessions", JSON.stringify(updated));
  };

  // Student directory callbacks
  const handleAddStudent = (name: string, accentNotes: string, voiceSampleUrl?: string) => {
    const newSt: Student = {
      id: `st-${Date.now()}`,
      name,
      registeredAt: new Date().toISOString(),
      accentNotes,
      voiceSampleUrl
    };
    const updated = [newSt, ...students];
    saveStudents(updated);
  };

  const handleDeleteStudent = (id: string) => {
    const updated = students.filter(s => s.id !== id);
    saveStudents(updated);
    // Remove references in sessions if required, or let them remain as orphan
  };

  const handleUpdateStudent = (id: string, name: string, accentNotes: string, voiceSampleUrl?: string) => {
    const updated = students.map(st => {
      if (st.id === id) {
        return {
          ...st,
          name,
          accentNotes,
          voiceSampleUrl: voiceSampleUrl !== undefined ? voiceSampleUrl : st.voiceSampleUrl
        };
      }
      return st;
    });
    saveStudents(updated);
  };

  const handleDeleteSession = (id: string) => {
    const updated = sessions.filter(s => s.id !== id);
    saveSessions(updated);
  };

  // Call the real Gemini server proxy endpoint, or fallback to an beautiful Tajweed simulator if no API Keyconfigured
  const handleStartAnalysis = async (payload: { title: string; participants: string[]; audioBase64: string; mimeType: string }) => {
    setIsAnalyzing(true);
    setApiError(null);

    // Prepare participants with voice samples to supply as comparative materials
    const attendingStudents = students.filter(st => payload.participants.includes(st.id));

    try {
      const response = await fetch("/api/analyze-recitation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupAudioBase64: payload.audioBase64,
          mimeType: payload.mimeType,
          students: attendingStudents
        })
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.error || "فشل الاتصال بخادم الذكاء الاصطناعي.");
      }

      const resData = await response.json();
      
      // Successfully parsed return array
      if (resData && Array.isArray(resData.segments)) {
        // Map indices to correct IDs
        const finalSegments: RecitationSegment[] = resData.segments.map((seg: any, idx: number) => ({
          id: `seg-${Date.now()}-${idx}`,
          startTime: seg.startTime || "0:00",
          endTime: seg.endTime || "0:10",
          transcription: seg.transcription || "",
          studentId: seg.studentId || payload.participants[idx % payload.participants.length], // Fallback to round-robin
          studentGuess: attendingStudents.find(s => s.id === seg.studentId)?.name || undefined,
          surahPage: seg.surahPage || "مقتطف من الذكر",
          mistakes: seg.mistakes || [],
          score: seg.evaluation?.score || 9,
          grade: seg.evaluation?.grade || "ممتاز",
          notes: seg.evaluation?.teacherNotes || "تلاوة جيدة ومتقنة."
        }));

        setActiveReviewSession({
          title: payload.title,
          participants: payload.participants,
          audioUrl: payload.audioBase64,
          segments: finalSegments,
          generalFeedback: resData.generalFeedback || "أحسنت الحلقة تلاوة طيبة.",
          isReadOnly: false
        });
      } else {
        throw new Error("تنسيق النتيجة المستلمة غير صالح.");
      }

    } catch (error: any) {
      console.warn("API Error, launching informative simulated demonstration mode:", error);
      
      // Let the user know the server fell back to the local educational simulation
      setApiError(`تنبيه: تم تشغيل 'وضع تقويم المحاكاة التعليمي' لمناسبة المعاينة السريعة (سبب: ${error.message || "لم يتم تفعيل مفتاح Gemini بعد"}).`);
      
      // Synthesize elegant Quranic simulated response based on the selected participants!
      // This is highly immersive and shows the exact capability of the application beautifully!
      setTimeout(() => {
        const simulatedVerses = [
          { surah: "سورة النبأ 1-5", text: "عَمَّ يَتَسَاءَلُونَ (1) عَنِ النَّبَإِ الْعَظِيمِ (2) الَّذِي هُمْ فِيهِ مُخْتَلِفُونَ (3) كَلَّا سَيَعْلَمُونَ (4) ثُمَّ كَلَّا سَيَعْلَمُونَ (5)" },
          { surah: "سورة النازعات 1-5", text: "وَالنَّازِعَاتِ غَرْقًا (1) وَالنَّاشِطَاتِ نَشْطًا (2) وَالسَّابِحَاتِ سَبْحًا (3) فَالسَّابِقَاتِ سَبْقًا (4) فَالْمُدَبِّرَاتِ أَمْرًا (5)" },
          { surah: "سورة الإخلاص 1-4", text: "قُلْ هُوَ اللَّهُ أَحَدٌ (1) اللَّهُ الصَّمَدُ (2) لَمْ يَلِدْ وَلَمْ يُولَدْ (3) وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ (4)" }
        ];

        const generatedSegments: RecitationSegment[] = payload.participants.map((pid, idx) => {
          const stName = students.find(s => s.id === pid)?.name || "طالب";
          const verseSample = simulatedVerses[idx % simulatedVerses.length];
          
          // Randomize a small tajweed mistake to demonstrate correction
          const mockMistakesList: any[] = [
            {
              id: `m-sim-${idx}-1`,
              text: verseSample.text.split(" ")[0] || "عَمَّ",
              type: "تجويد",
              correction: `${verseSample.text.split(" ")[0]} (مع غنة الميم المشددة حركتين)`,
              explanation: "التقصير في وزن حركة الغنة بمقدار حركتين في الميم المشددة."
            }
          ];

          return {
            id: `seg-sim-${Date.now()}-${idx}`,
            startTime: `00:${idx * 15 + 2}`,
            endTime: `00:${(idx + 1) * 15}`,
            transcription: verseSample.text,
            studentId: pid,
            studentGuess: stName, // Simulate voice-sample recognition
            surahPage: verseSample.surah,
            mistakes: idx % 2 === 0 ? mockMistakesList : [], // alternate mistakes for interest
            score: idx % 2 === 0 ? 8 : 10,
            grade: idx % 2 === 0 ? "جيد جداً" : "ممتاز",
            notes: idx % 2 === 0 ? `أداء ممتاز للغنة يا ${stName.split(" ")[0]}` : `ترتيل كالفراشة الخاشعة، بوركت يا ${stName.split(" ")[0]}`
          };
        });

        setActiveReviewSession({
          title: payload.title,
          participants: payload.participants,
          audioUrl: payload.audioBase64,
          segments: generatedSegments,
          generalFeedback: "الحمد لله الذي بنعمته تتم الصالحات، كانت التلاوات طيبة وأثنى الشيخ على تحسن مخارج حروف الطلاب اليوم وخاصة القلقلة والمد الطبيعي.",
          isReadOnly: false
        });

        setIsAnalyzing(false);
      }, 800); // 800ms wait for blazing-fast response

    } finally {
      if (!isAnalyzing) {
         // safety
      }
    }
  };

  // Workshop permanent save session callback
  const handleSaveSession = (newSess: Session) => {
    const updated = [newSess, ...sessions];
    saveSessions(updated);
    setActiveReviewSession(null);
    setCurrentTab("dashboard");
    setApiError(null);
  };

  // Selection of historically compiled session click
  const handleSelectPastSession = (sess: Session) => {
    setActiveReviewSession({
      title: sess.title,
      participants: sess.participants,
      audioUrl: sess.audioUrl,
      segments: sess.segments,
      generalFeedback: sess.notes,
      isReadOnly: true
    });
  };

  return (
    <div className="h-screen bg-[#F8FAFC] flex flex-col md:flex-row font-sans antialiased text-slate-800 overflow-hidden" id="main-application" dir="rtl">
      
      {/* Mobile Top Header (hidden on desktop) */}
      <header className="md:hidden bg-[#064E3B] text-white p-4 flex justify-between items-center z-40 border-b border-[#043427] shrink-0">
        <button
          type="button"
          onClick={() => {
            setTeacherInput(teacherName);
            setShowTeacherModal(true);
          }}
          className="flex items-center gap-2.5 text-right cursor-pointer hover:bg-[#054030] active:scale-95 transition-all p-1.5 -m-1.5 rounded-xl border border-emerald-500/10"
          title={language === 'ar' ? "إعدادات وبصمة صوت الشيخ" : "Sheikh & Voice Print settings"}
        >
          <div className="w-9 h-9 bg-[#D97706] rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm shrink-0">
            <Settings className="w-4.5 h-4.5 text-white" />
          </div>
          <div className="text-right">
            <h1 className="text-sm font-bold leading-tight flex items-center gap-1">
              <span>{teacherName}</span>
              <span className="text-[10px] text-emerald-300">⚙️</span>
            </h1>
            <p className="text-[9px] text-emerald-200/80 font-mono leading-none">{t("teacher_label")}</p>
          </div>
        </button>
        
        {/* Navigation buttons for mobile */}
        <div className="flex gap-1.5 bg-[#043427] p-1 rounded-xl text-[10px]">
          <button
            onClick={() => { setCurrentTab("dashboard"); setActiveReviewSession(null); }}
            className={`px-2 py-1 rounded-md transition-all ${currentTab === "dashboard" && !activeReviewSession ? "bg-[#065F46] text-white" : "text-emerald-100"}`}
          >
            {language === 'ar' ? 'الرئيسية' : 'Home'}
          </button>
          <button
            onClick={() => { setCurrentTab("sessions"); setActiveReviewSession(null); }}
            className={`px-2 py-1 rounded-md transition-all ${currentTab === "sessions" || activeReviewSession ? "bg-[#065F46] text-white" : "text-emerald-100"}`}
          >
            {language === 'ar' ? 'التسجيل' : 'Recording'}
          </button>
          <button
            onClick={() => { setCurrentTab("students"); setActiveReviewSession(null); }}
            className={`px-2 py-1 rounded-md transition-all ${currentTab === "students" && !activeReviewSession ? "bg-[#065F46] text-white" : "text-emerald-100"}`}
          >
            {language === 'ar' ? 'الطلاب' : 'Students'}
          </button>
        </div>
      </header>

      {/* Desktop sidebar (hidden on mobile) */}
      <aside className="hidden md:flex w-72 bg-[#064E3B] flex-col shrink-0 text-white border-l border-[#043427] justify-between relative z-30 shadow-xl">
        <div>
          {/* Logo Brand Header */}
          <div className="p-6 border-b border-[#065F46]">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-[#D97706] rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-md transform hover:rotate-6 transition-all duration-300">م</div>
              <div className="text-right">
                <h1 className="text-white font-bold text-base leading-tight">{t("app_title")}</h1>
                <p className="text-[10px] text-emerald-300/80 font-mono tracking-wider">Mizan Quranic Analytics</p>
              </div>
            </div>
          </div>

          {/* Navigation Sidebar List */}
          <nav className="p-4 space-y-2.5">
            <button
               onClick={() => {
                 setCurrentTab("dashboard");
                 setActiveReviewSession(null);
               }}
               className={`w-full text-right px-4 py-3.5 rounded-xl flex items-center gap-3.5 cursor-pointer transition-all duration-200 group ${
                 currentTab === "dashboard" && !activeReviewSession
                   ? "bg-[#065F46] text-white font-bold shadow-md ring-1 ring-emerald-500/20"
                   : "text-emerald-100 hover:bg-[#065F46]/60 hover:text-white"
               }`}
             >
               <LayoutDashboard className={`w-5 h-5 ml-1.5 transition-transform duration-300 group-hover:scale-110 ${currentTab === "dashboard" && !activeReviewSession ? "text-[#D97706]" : "text-emerald-300"}`} />
               <span className="text-xs tracking-wide">{t("quick_dashboard")}</span>
             </button>

             <button
               onClick={() => {
                 setCurrentTab("sessions");
                 setActiveReviewSession(null);
               }}
               className={`w-full text-right px-4 py-3.5 rounded-xl flex items-center gap-3.5 cursor-pointer transition-all duration-200 group ${
                 currentTab === "sessions" || (activeReviewSession && !activeReviewSession.isReadOnly)
                   ? "bg-[#065F46] text-white font-bold shadow-md ring-1 ring-emerald-500/20"
                   : "text-emerald-100 hover:bg-[#065F46]/60 hover:text-white"
               }`}
             >
               <Clock className={`w-5 h-5 ml-1.5 transition-transform duration-300 group-hover:scale-110 ${currentTab === "sessions" || activeReviewSession ? "text-[#D97706]" : "text-emerald-300"}`} />
               <span className="text-xs tracking-wide">{t("sessions_live")}</span>
             </button>

             <button
               onClick={() => {
                 setCurrentTab("students");
                 setActiveReviewSession(null);
               }}
               className={`w-full text-right px-4 py-3.5 rounded-xl flex items-center gap-3.5 cursor-pointer transition-all duration-200 group ${
                 currentTab === "students" && !activeReviewSession
                   ? "bg-[#065F46] text-white font-bold shadow-md ring-1 ring-emerald-500/20"
                   : "text-emerald-100 hover:bg-[#065F46]/60 hover:text-white"
               }`}
             >
               <Users className={`w-5 h-5 ml-1.5 transition-transform duration-300 group-hover:scale-110 ${currentTab === "students" && !activeReviewSession ? "text-[#D97706]" : "text-emerald-300"}`} />
               <span className="text-xs tracking-wide">{t("students_ledger")}</span>
             </button>
          </nav>
        </div>

        {/* Sidebar Footer Teacher & Fingerprint Status */}
        <div className="p-4 bg-[#043427] text-xs text-emerald-200/90 space-y-1.5 rounded-t-2xl border-t border-[#065F46]/40">
          <div className="group/teacher">
            {isEditingTeacher ? (
              <div className="flex items-center gap-1.5 w-full">
                <input
                  type="text"
                  value={teacherInput}
                  onChange={(e) => setTeacherInput(e.target.value)}
                  onBlur={() => {
                    setIsEditingTeacher(false);
                    const name = teacherInput.trim() || "عمر فاروق";
                    setTeacherName(name);
                    localStorage.setItem("mizan_teacher_name", name);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setIsEditingTeacher(false);
                      const name = teacherInput.trim() || "عمر فاروق";
                      setTeacherName(name);
                      localStorage.setItem("mizan_teacher_name", name);
                    }
                  }}
                  autoFocus
                  className="bg-emerald-950 text-white text-[11px] p-1 rounded border border-emerald-700 w-full font-serif text-right outline-none ring-1 ring-emerald-500"
                />
              </div>
            ) : (
              <div className="flex items-center justify-between w-full">
                <p className="font-semibold text-[11px] text-white font-serif tracking-wide select-none truncate">
                  {t("teacher_label")}: {teacherName}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setTeacherInput(teacherName);
                      setIsEditingTeacher(true);
                    }}
                    className="text-emerald-400 hover:text-white cursor-pointer transition-colors p-1"
                    title={language === "ar" ? "تعديل اسم الشيخ المحفظ" : "Edit teacher name"}
                  >
                    <Edit className="w-3 h-3 text-emerald-450" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Teacher Voice Fingerprint toggle popup */}
          <div className="bg-emerald-950/40 p-2 rounded-xl flex items-center justify-between border border-emerald-800/30">
            <div className="text-[9px] font-light leading-snug">
              <span className="font-bold text-white block">{t("teacher_fingerprint")}</span>
              <span className={`${teacherVoice ? 'text-emerald-400' : 'text-amber-400/80'}`}>
                {teacherVoice ? t("fingerprint_ok") : t("no_fingerprint")}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowTeacherModal(true)}
              className="bg-emerald-800 hover:bg-emerald-750 text-white text-[10px] px-2 py-1 rounded font-bold cursor-pointer transition-all shrink-0 ml-1"
            >
              ✎
            </button>
          </div>

          <p className="text-[9px] opacity-70 font-mono text-right">{t("license_badge")}</p>
        </div>
      </aside>

      {/* Main Content Pane */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Workspace Top Header Controls */}
        <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-6 md:px-8 shrink-0 z-10 shadow-xs">
          <div className="space-y-0.5 text-right w-1/2">
            <h2 className="text-base md:text-lg font-extrabold text-slate-900 tracking-tight">
              {activeReviewSession 
                ? activeReviewSession.title 
                : currentTab === "dashboard" 
                ? t("quick_dashboard")
                : currentTab === "sessions"
                ? t("sessions_live")
                : t("students_ledger")}
            </h2>
            <p className="text-xs text-slate-500 flex items-center gap-1">
              <span>{t("morning_class")}</span>
              <span>•</span>
              <span className="font-mono">{new Date().toLocaleDateString(language === "ar" ? "ar-EG" : "en-US", { weekday: "long", day: "numeric", month: "long" })}</span>
            </p>
          </div>

          {/* Top Controls: Language switcher and status */}
          <div className="flex items-center gap-3">
            {/* Language Switcher Button */}
            <button
              onClick={() => setLanguage(l => l === "ar" ? "en" : "ar")}
              className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 text-[#064E3B] hover:text-[#065F46] border border-slate-200/80 px-3.5 py-1.8 rounded-xl text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5 text-[#064E3B]" />
              <span>{language === "ar" ? "English" : "العربية"}</span>
            </button>

            {isAnalyzing ? (
              <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3.5 py-1.5 rounded-full border border-emerald-100 text-xs font-semibold animate-pulse">
                <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-ping"></span>
                {t("analyzing_rec")}
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2 bg-slate-50 text-slate-600 px-3.5 py-1.5 rounded-full border border-slate-100 text-[11px] font-semibold font-mono">
                <span className="w-2 h-2 bg-emerald-550 rounded-full"></span>
                {t("mizan_online")}
              </div>
            )}
          </div>
        </header>

        {/* Scrollable contents zone */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          
          {/* Warn alert if simulation triggers */}
          {apiError && (
            <div className="bg-amber-50 border border-amber-200 text-amber-950 text-xs rounded-2xl p-4 flex items-start gap-3 shadow-xs animate-fade-in">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-[#D97706] mt-0.5" />
              <div className="space-y-1 text-right">
                <span className="font-bold text-amber-900 block">منصة محاكاة ميزان البديلة للذكاء الاصطناعي مفعّلة حالياً:</span>
                <p className="font-light leading-normal text-amber-950">{apiError}</p>
                <span className="text-[10px] text-amber-800/80 block pt-0.5">يمكنك التجربة والتقييم الفوري والتعدیل وقراءة مخارج الكلمات مع حفظ وتثبيت السجل النهائي لكل طالب.</span>
              </div>
            </div>
          )}

          {/* Core App Routing */}
          <div className="animate-fade-in">
            {activeReviewSession ? (
              <SessionReview
                students={students}
                sessionTitle={activeReviewSession.title}
                sessionParticipants={activeReviewSession.participants}
                sessionAudioUrl={activeReviewSession.audioUrl}
                initialSegments={activeReviewSession.segments}
                initialGeneralFeedback={activeReviewSession.generalFeedback}
                onSaveSession={handleSaveSession}
                onCancel={() => {
                  setActiveReviewSession(null);
                  setApiError(null);
                }}
                isReadOnly={activeReviewSession.isReadOnly}
                language={language}
              />
            ) : (
              <>
                {currentTab === "dashboard" && (
                  <Dashboard
                    students={students}
                    sessions={sessions}
                    onNavigateToTab={(tab) => setCurrentTab(tab)}
                    onSelectedSession={handleSelectPastSession}
                  />
                )}

                {currentTab === "sessions" && (
                  <SessionRecorder
                    students={students}
                    onStartAnalysis={handleStartAnalysis}
                    isAnalyzing={isAnalyzing}
                    pastSessions={sessions}
                    onSelectPastSession={handleSelectPastSession}
                    onDeleteSession={handleDeleteSession}
                  />
                )}

                {currentTab === "students" && (
                  <StudentsList
                    students={students}
                    sessions={sessions}
                    onAddStudent={handleAddStudent}
                    onDeleteStudent={handleDeleteStudent}
                    onUpdateStudent={handleUpdateStudent}
                    onUpdateSessions={setSessions}
                    language={language}
                  />
                )}
              </>
            )}
          </div>

          {/* Teacher Profile with Voice Fingerprint Modal Overlay */}
          {showTeacherModal && (
            <div className="fixed inset-0 bg-[#064E3B]/80 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans animate-fade-in text-slate-800">
              <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col">
                <div className="bg-[#064E3B] text-white p-6 text-right relative">
                  <h3 className="font-extrabold text-sm">{t("manage_fingerprint")}</h3>
                  <p className="text-emerald-200/85 text-xs font-light mt-0.5">{t("teacher_label")}</p>
                </div>
                
                <div className="p-6 space-y-4 flex-1 text-right">
                  {/* Teacher Name Input */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">{t("teacher_name_placeholder")}:</label>
                    <input
                      type="text"
                      value={teacherName}
                      onChange={(e) => {
                        const val = e.target.value;
                        setTeacherName(val);
                        localStorage.setItem("mizan_teacher_name", val);
                      }}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#065F46]"
                    />
                  </div>

                  {/* Voice Sample Print Status */}
                  <div className="space-y-2 pt-2 border-t border-slate-100 pb-2">
                    <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                      {teacherVoice ? (
                        <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-bold">
                          <span className="w-2 h-2 bg-emerald-550 rounded-full animate-pulse" />
                          <span>{t("fingerprint_ok")}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs font-semibold">{t("no_fingerprint")}</span>
                      )}
                      <span className="text-xs font-bold text-slate-800">{t("teacher_fingerprint")}:</span>
                    </div>

                    {teacherVoice && (
                      <div className="flex flex-col items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
                        <audio src={teacherVoice} controls className="h-8 w-full" />
                        <button
                          type="button"
                          onClick={deleteTeacherVoice}
                          className="cursor-pointer text-xs text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 self-end mt-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{t("delete_fingerprint")}</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Recorder section */}
                  <div className="p-4 bg-emerald-50/50 border border-emerald-100/80 rounded-2xl text-center space-y-3">
                    <p className="text-[11px] text-emerald-950 font-medium">
                      {t("voice_print_record_desc")}
                    </p>

                    {isRecordingTeacher ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-center gap-2 text-rose-600 font-mono font-bold text-xs animate-pulse">
                          <span className="w-2 h-2 bg-rose-600 rounded-full animate-ping" />
                          <span>{teacherRecSecs}s</span>
                        </div>
                        <button
                          type="button"
                          onClick={stopRecordingTeacher}
                          className="cursor-pointer bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all w-full flex items-center justify-center gap-1.5"
                        >
                          <Square className="w-3.5 h-3.5 font-bold" />
                          <span>{t("stop_fingerprint")}</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={startRecordingTeacher}
                        className="cursor-pointer bg-[#064E3B] hover:bg-[#065F46] text-white text-xs font-bold px-4 py-2 rounded-xl transition-all w-full flex items-center justify-center gap-1.5 animate-pulse"
                      >
                        <Mic className="w-3.5 h-3.5" />
                        <span>{t("record_fingerprint")}</span>
                      </button>
                    )}

                    {!isRecordingTeacher && (
                      <div className="pt-2 border-t border-slate-200/60 mt-1.5 flex flex-col items-center gap-1.5">
                        <span className="text-[10px] text-slate-500 font-medium">
                          {language === "ar" ? "أو رفع ملف صوتي جاهز للبصمة:" : "Or upload an audio sample for voiceprint:"}
                        </span>
                        <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 text-xs px-3.5 py-1.8 rounded-xl font-bold flex items-center gap-1.5 justify-center transition-all w-full leading-none">
                          <span>📁 {language === "ar" ? "اختر ملف صوتي" : "Choose audio file"}</span>
                          <input 
                            type="file" 
                            accept="audio/*" 
                            className="hidden" 
                            onChange={handleTeacherVoiceUpload}
                          />
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setShowTeacherModal(false);
                      stopRecordingTeacher();
                    }}
                    className="cursor-pointer bg-[#064E3B] text-white hover:bg-[#065F46] text-xs font-bold px-5 py-2 rounded-xl"
                  >
                    {t("btn_cancel")}
                  </button>
                </div>
              </div>
            </div>
          )}

          <footer className="pt-6 border-t border-slate-100 text-center text-[11px] text-slate-400 space-y-1 pb-4">
            <p className="font-semibold text-slate-500 font-mono">{t("footer_text")}</p>
            <p className="font-light max-w-md mx-auto leading-relaxed">{t("footer_desc")}</p>
          </footer>

        </div>
      </main>
    </div>
  );
}
