import React, { useState, useRef, useEffect } from "react";
import { Student, Session, TajweedMistake } from "../types";
import { 
  Plus, Users, Mic, Square, Play, Pause, Trash, Award, AlertTriangle, 
  ChevronRight, Calendar, User, Search, RefreshCw, Volume2, Trash2,
  ChevronDown, ChevronUp, Share2, Copy, Check, Printer, FileText, Edit3
} from "lucide-react";

interface StudentsListProps {
  students: Student[];
  sessions: Session[];
  onAddStudent: (name: string, accentNotes: string, voiceSampleUrl?: string) => void;
  onDeleteStudent: (id: string) => void;
  onUpdateStudent: (id: string, name: string, accentNotes: string, voiceSampleUrl?: string) => void;
  onUpdateSessions?: (updatedSessions: Session[]) => void;
  language?: 'ar' | 'en';
}

export default function StudentsList({ 
  students, 
  sessions, 
  onAddStudent, 
  onDeleteStudent,
  onUpdateStudent,
  onUpdateSessions,
  language = "ar"
}: StudentsListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [isPendingDelete, setIsPendingDelete] = useState(false);
  const [studentFormError, setStudentFormError] = useState<string | null>(null);
  
  // States for Adding a student
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentNotes, setNewStudentNotes] = useState("");
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);

  // States for Editing a student
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState("");
  const [editingStudentName, setEditingStudentName] = useState("");
  const [editingStudentNotes, setEditingStudentNotes] = useState("");

  // Accordion trace state for selected student session details and errors
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [selectedFilterSessionId, setSelectedFilterSessionId] = useState<string>("all");
  const [copiedSegmentId, setCopiedSegmentId] = useState<string | null>(null);
  const [activeStudentPrint, setActiveStudentPrint] = useState(false);
  const [copiedCumulative, setCopiedCumulative] = useState(false);

  // State for Editing a student's mistake
  const [editingMistake, setEditingMistake] = useState<{
    id: string;
    sessionId: string;
    segmentId: string;
    text: string;
    type: 'تجويد' | 'مخارج' | 'تشكيل' | 'حفظ';
    correction: string;
    explanation: string;
  } | null>(null);

  const handleStudentVoiceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setRecordedAudioUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    setIsPendingDelete(false);
    setStudentFormError(null);
    setSelectedFilterSessionId("all");
    setExpandedSessionId(null);
  }, [selectedStudentId]);

  const [activePrintReport, setActivePrintReport] = useState<{ sess: Session; seg: any } | null>(null);

  useEffect(() => {
    if (activePrintReport) {
      const timer = setTimeout(() => {
        window.print();
        setActivePrintReport(null);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [activePrintReport]);

  useEffect(() => {
    if (activeStudentPrint) {
      const timer = setTimeout(() => {
        window.print();
        setActiveStudentPrint(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [activeStudentPrint]);

  useEffect(() => {
    if (showAddModal || showEditModal) {
      setStudentFormError(null);
    }
  }, [showAddModal, showEditModal]);
  
  // Recorder states
  const [isRecording, setIsRecording] = useState(false);
  const [recDuration, setRecDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  // Playback states
  const [playingMap, setPlayingMap] = useState<Record<string, boolean>>({});
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({});

  // Compute student stats
  const getStudentStats = (studentId: string) => {
    let totals = 0;
    let counts = 0;
    let studentMistakes: any[] = [];
    let attendedSessionsCount = 0;

    sessions.forEach(sess => {
      let attended = false;
      sess.segments.forEach(seg => {
        if (seg.studentId === studentId) {
          totals += seg.score;
          counts += 1;
          const mappedMistakes = seg.mistakes.map(m => ({
            ...m,
            _sessionId: sess.id,
            _segmentId: seg.id,
            _sessionTitle: sess.title
          }));
          studentMistakes.push(...mappedMistakes);
          attended = true;
        }
      });
      if (attended) attendedSessionsCount++;
    });

    const averageRating = counts > 0 ? (totals / counts).toFixed(1) : "N/A";
    const totalMistakesCount = studentMistakes.length;

    return {
      averageRating,
      totalMistakesCount,
      attendedSessionsCount,
      studentMistakes,
    };
  };

  // Recording voice sample methods
  const startRecording = async () => {
    audioChunksRef.current = [];
    setRecordedAudioUrl(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onloadend = () => {
          setRecordedAudioUrl(reader.result as string);
        };
        reader.readAsDataURL(audioBlob);
        
        // Stop all tracks in the stream
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      setRecDuration(0);

      timerRef.current = setInterval(() => {
        setRecDuration((prev) => prev + 1);
      }, 1000);

    } catch (err) {
      console.error("فشل الوصول إلى الميكروفون:", err);
      setStudentFormError("الرجاء إعطاء صلاحية الميكروفون في المتصفح لتسجيل بصمة الصوت.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const handleSaveStudent = () => {
    if (!newStudentName.trim()) {
      setStudentFormError("يرجى إدخال اسم الطالب");
      return;
    }
    setStudentFormError(null);
    onAddStudent(newStudentName, newStudentNotes, recordedAudioUrl || undefined);
    
    // Reset states
    setNewStudentName("");
    setNewStudentNotes("");
    setRecordedAudioUrl(null);
    setShowAddModal(false);
  };

  const handleSaveEditedStudent = () => {
    if (!editingStudentName.trim()) {
      setStudentFormError("يرجى إدخال اسم الطالب");
      return;
    }
    setStudentFormError(null);
    onUpdateStudent(editingStudentId, editingStudentName, editingStudentNotes, recordedAudioUrl || undefined);
    
    // Reset states
    setEditingStudentId("");
    setEditingStudentName("");
    setEditingStudentNotes("");
    setRecordedAudioUrl(null);
    setShowEditModal(false);
  };

  // Playback control for voice samples
  const togglePlayAudio = (id: string, url: string) => {
    if (playingMap[id]) {
      // stop
      audioRefs.current[id]?.pause();
      setPlayingMap(prev => ({ ...prev, [id]: false }));
    } else {
      // stop others
      Object.keys(playingMap).forEach(key => {
        if (playingMap[key]) {
          audioRefs.current[key]?.pause();
          playingMap[key] = false;
        }
      });

      if (!audioRefs.current[id]) {
        audioRefs.current[id] = new Audio(url);
        audioRefs.current[id].onended = () => {
          setPlayingMap(prev => ({ ...prev, [id]: false }));
        };
      }
      audioRefs.current[id].play();
      setPlayingMap(prev => ({ ...prev, [id]: true }));
    }
  };

  const handleEditMistakeSubmit = () => {
    if (!editingMistake || !onUpdateSessions) return;
    const updatedSessions = sessions.map(sess => {
      if (sess.id !== editingMistake.sessionId) return sess;
      return {
        ...sess,
        segments: sess.segments.map(seg => {
          if (seg.id !== editingMistake.segmentId) return seg;
          return {
            ...seg,
            mistakes: seg.mistakes.map(m => {
              if (m.id !== editingMistake.id) return m;
              return {
                ...m,
                text: editingMistake.text,
                type: editingMistake.type,
                correction: editingMistake.correction,
                explanation: editingMistake.explanation
              };
            })
          };
        })
      };
    });
    onUpdateSessions(updatedSessions);
    setEditingMistake(null);
  };

  const handleDeleteMistakeClick = (mis: any) => {
    if (!onUpdateSessions) return;
    const confirmDelete = window.confirm(
      language === "ar" 
        ? "هل أنت متأكد من حذف هذا الخطأ نهائياً من سجلات الطالب والحلقة؟" 
        : "Are you sure you want to permanently delete this mistake?"
    );
    if (!confirmDelete) return;

    const updatedSessions = sessions.map(sess => {
      if (sess.id !== mis._sessionId) return sess;
      return {
        ...sess,
        segments: sess.segments.map(seg => {
          if (seg.id !== mis._segmentId) return seg;
          return {
            ...seg,
            mistakes: seg.mistakes.filter(m => m.id !== mis.id)
          };
        })
      };
    });
    onUpdateSessions(updatedSessions);
  };

  const filteredStudents = students.filter(st => 
    st.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedStudent = students.find(st => st.id === selectedStudentId);
  const selectedStats = selectedStudent ? getStudentStats(selectedStudent.id) : null;

  const generateShareText = (sess: Session, seg: any) => {
    const studentName = selectedStudent?.name || "البطل القارئ";
    const dateFormatted = new Date(sess.date).toLocaleDateString("ar-EG");
    const mistakesCount = seg.mistakes.length;
    
    let text = `📖 *تقرير تلاوة وأخطاء من مقرأة ميزان* 📖\n\n`;
    text += `👤 *القارئ:* ${studentName}\n`;
    text += `🏫 *الحلقة:* ${sess.title}\n`;
    text += `📅 *التاريخ:* ${dateFormatted}\n\n`;
    
    text += `🔹 *المقطع المقروء:* ${seg.surahPage} (${seg.startTime} - ${seg.endTime})\n`;
    text += `🎯 *التقييم والدرجة:* ${seg.score}/10 (${seg.grade})\n`;
    
    if (seg.notes) {
      text += `📝 *توجيه الشيخ المعلم:* "${seg.notes}"\n`;
    }
    
    text += `\n⚠️ *الأخطاء المرصودة (${mistakesCount}):*\n`;
    
    if (mistakesCount === 0) {
      text += `✨ ما شاء الله! تلاوة خالية من الأخطاء واللحون. استمر على هذا التميز! ✨\n`;
    } else {
      seg.mistakes.forEach((mis: TajweedMistake, idx: number) => {
        text += `${idx + 1}. *نوع الخطأ [${mis.type}]:*\n`;
        text += `   • الموضع الخطأ: "${mis.text}"\n`;
        text += `   • التصحيح المقترح: "${mis.correction}"\n`;
        if (mis.explanation) {
          text += `   • توضيح: "${mis.explanation}"\n`;
        }
        text += `\n`;
      });
    }
    
    text += `\n✨ *مقرأة ميزان - لضبط تلاوة القرآن الكريم بالذكاء الاصطناعي* ✨`;
    return text;
  };

  const handleCopyToClipboard = (sess: Session, seg: any) => {
    const text = generateShareText(sess, seg);
    navigator.clipboard.writeText(text).then(() => {
      setCopiedSegmentId(seg.id || `${sess.id}_${seg.surahPage}`);
      setTimeout(() => {
        setCopiedSegmentId(null);
      }, 2500);
    }).catch(err => {
      console.error("Failed to copy report: ", err);
    });
  };

  const generateCumulativeShareText = (student: Student, stats: any) => {
    let text = `📖 *التقرير الأكاديمي الشامل وسجل أخطاء التلاوة - مقرأة ميزان* 📖\n\n`;
    text += `👤 *اسم الطالب القارئ:* ${student.name}\n`;
    text += `📅 *تاريخ التسجيل المبدئي:* ${new Date(student.registeredAt).toLocaleDateString("ar-EG")}\n`;
    text += `📝 *ملامح وبصمة الصوت:* ${student.accentNotes || "لا توجد ملاحظات خاصة"}\n\n`;
    
    text += `📊 *مؤشرات الأداء الإجمالي:* \n`;
    text += `   • متوسط التقييم العام: ${stats.averageRating} / 10\n`;
    text += `   • عدد الحلقات التي حضرها: ${stats.attendedSessionsCount}\n`;
    text += `   • إجمالي الأخطاء واللحون المرصودة: ${stats.totalMistakesCount}\n\n`;
    
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `📃 *تفصيل الحلقات والأخطاء المرصودة حلقة بحلقة:*\n`;
    
    // Filter sessions where student has read
    const studentSessions = sessions.filter(sess => sess.segments.some(seg => seg.studentId === student.id));
    
    if (studentSessions.length === 0) {
      text += `• لم يشارك الطالب في أي حلقات تلاوة في ميزان حتى الآن.\n`;
    } else {
      studentSessions.forEach((sess, sIdx) => {
        text += `\n[${sIdx + 1}] 🏫 *الحلقة:* ${sess.title}\n`;
        text += `   📅 *التاريخ:* ${new Date(sess.date).toLocaleDateString("ar-EG")}\n`;
        
        const relevantSegments = sess.segments.filter(seg => seg.studentId === student.id);
        relevantSegments.forEach((seg, segIdx) => {
          text += `   🔹 *موضع ومقطع المقروء:* ${seg.surahPage} (${seg.startTime} - ${seg.endTime})\n`;
          text += `   🎯 *درجة التلاوة والتقدير:* ${seg.score}/10 (${seg.grade})\n`;
          if (seg.notes) {
            text += `   📝 *توجيه الشيخ المعلم:* "${seg.notes}"\n`;
          }
          
          text += `   ⚠️ *الأخطاء المرصودة (${seg.mistakes.length}):*\n`;
          if (seg.mistakes.length === 0) {
            text += `      ✨ تلاوة خالية من الأخطاء! ✨\n`;
          } else {
            seg.mistakes.forEach((mis: TajweedMistake, mIndex: number) => {
              text += `      ${mIndex + 1}) خطأ [${mis.type}]: الكلمة "${mis.text}" 👈 التصحيح السليم "${mis.correction}"\n`;
              if (mis.explanation) {
                text += `         توضيح: "${mis.explanation}"\n`;
              }
            });
          }
        });
        text += `┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈\n`;
      });
    }
    
    text += `\n✨ تم استخراج هذا التقرير آلياً عبر منصة ميزان لضبط تلاوة القرآن الكريم بالذكاء الاصطناعي ✨`;
    return text;
  };

  const handleCopyCumulativeReport = () => {
    if (!selectedStudent || !selectedStats) return;
    const text = generateCumulativeShareText(selectedStudent, selectedStats);
    navigator.clipboard.writeText(text).then(() => {
      setCopiedCumulative(true);
      setTimeout(() => setCopiedCumulative(false), 3000);
    }).catch(err => {
      console.error("Failed to copy cumulative report: ", err);
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-slate-800" id="students-view">
      {/* List Column */}
      <div className="lg:col-span-1 space-y-4">
        {/* Header and Search */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5 font-sans">
              <Users className="w-4 h-4 text-[#064E3B]" />
              الطلاب المقيدون بالمجموعة ({students.length})
            </h3>
            <button
              onClick={() => {
                setRecordedAudioUrl(null);
                setShowAddModal(true);
              }}
              className="cursor-pointer bg-emerald-50 hover:bg-emerald-100 text-[#064E3B] text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors border border-emerald-100"
            >
              <Plus className="w-3 h-3 ml-0.5 animate-pulse" />
              تسجيل قارئ جديد
            </button>
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="البحث عن طالب..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-10 pl-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#065F46]/10 focus:border-[#065F46] bg-slate-50/80 text-right"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3.5 top-3" />
          </div>
        </div>

        {/* Student Cards */}
        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
          {filteredStudents.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 border border-dashed border-slate-200 text-center text-slate-400 text-xs">
              لم يتم العثور على أي طلاب في السجل المفتوح.
            </div>
          ) : (
            filteredStudents.map((student) => {
              const isActive = student.id === selectedStudentId;
              const stats = getStudentStats(student.id);

              return (
                <div
                  key={student.id}
                  onClick={() => setSelectedStudentId(student.id)}
                  className={`bg-white rounded-2xl p-4 border transition-all cursor-pointer flex justify-between items-center shadow-xs ${
                    isActive 
                      ? "border-[#065F46] bg-emerald-50/10 shadow-xs ring-1 ring-[#065F46]" 
                      : "border-slate-200/80 hover:border-slate-300"
                  }`}
                >
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-xs text-slate-800 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-450" />
                      {student.name}
                    </h4>
                    <p className="text-[9px] text-slate-400 font-mono">
                      تاريخ التسجيل: {new Date(student.registeredAt).toLocaleDateString("ar-EG")}
                    </p>
                    <div className="flex items-center gap-3 pt-1">
                      {student.voiceSampleUrl && (
                        <span className="inline-flex items-center text-[8px] bg-emerald-50 text-[#064E3B] border border-emerald-100 px-1.5 py-0.5 rounded font-bold font-mono gap-1">
                          <Volume2 className="w-2.5 h-2.5 animate-pulse" />
                          البصمة الصوتية مفعلة
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 font-mono text-[10px]">
                    <span className="bg-slate-50 text-slate-700 border border-slate-200 font-bold px-1.5 py-0.5 rounded">
                      التقييم: {stats.averageRating}
                    </span>
                    <span className="text-[9px] text-slate-450 block pt-0.5 font-sans">
                      {stats.attendedSessionsCount} حلقات
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Portfolio Column */}
      <div className="lg:col-span-2">
        {selectedStudent && selectedStats ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden" id="student-portfolio">
            {/* Header Banner */}
            <div className="bg-[#064E3B] p-6 text-white flex justify-between items-start md:items-center">
              <div className="space-y-1">
                <span className="text-emerald-200 font-mono text-[8px] tracking-wider uppercase font-extrabold">ملف ومسند الطالب الشخصي بميزان</span>
                <h3 className="text-base font-extrabold tracking-tight">{selectedStudent.name}</h3>
                <p className="text-xs text-emerald-100/80 font-light max-w-sm leading-relaxed">
                  {selectedStudent.accentNotes || "لا توجد ملاحظات مبدئية لملامح صوت الطالب."}
                </p>
              </div>

              {/* Sample playback controls */}
              <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2.5">
                {selectedStudent.voiceSampleUrl ? (
                  <button
                    onClick={() => togglePlayAudio(selectedStudent.id, selectedStudent.voiceSampleUrl!)}
                    className={`cursor-pointer px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                      playingMap[selectedStudent.id]
                        ? "bg-amber-500 text-emerald-950 font-extrabold"
                        : "bg-white/10 hover:bg-white/20 text-white border border-white/15"
                    }`}
                  >
                    {playingMap[selectedStudent.id] ? (
                      <>
                        <Pause className="w-3.5 h-3.5" />
                        إيقاف بصمة الصوت
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5" />
                        سماع بصمة الصوت
                      </>
                    )}
                  </button>
                ) : (
                  <span className="text-emerald-300 text-xs font-bold bg-white/5 border border-white/10 px-3 py-2 rounded-xl">بصمة الصوت غير مسجلة</span>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setEditingStudentId(selectedStudent.id);
                    setEditingStudentName(selectedStudent.name);
                    setEditingStudentNotes(selectedStudent.accentNotes || "");
                    setRecordedAudioUrl(selectedStudent.voiceSampleUrl || null);
                    setShowEditModal(true);
                  }}
                  className="cursor-pointer bg-[#D97706] hover:bg-[#B45309] text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  {language === "ar" ? "تعديل وبصمة الصوت" : "Modify Voiceprint"}
                </button>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-3 border-b border-slate-100 text-center font-sans">
              <div className="p-4 border-l border-slate-150">
                <span className="text-slate-500 text-[10px] block mb-1">متوسط التقييم العام</span>
                <span className="text-base font-extrabold text-[#064E3B] block font-mono">{selectedStats.averageRating} <span className="text-[10px] text-slate-400 font-sans">/١٠</span></span>
              </div>
              <div className="p-4 border-l border-slate-150">
                <span className="text-slate-500 text-[10px] block mb-1">الحلقات التي حضرها</span>
                <span className="text-base font-extrabold text-slate-800 block font-mono">{selectedStats.attendedSessionsCount}</span>
              </div>
              <div className="p-4">
                <span className="text-slate-500 text-[10px] block mb-1">إجمالي الأخطاء المرصودة</span>
                <span className="text-base font-extrabold text-[#D97706] block font-mono">{selectedStats.totalMistakesCount}</span>
              </div>
            </div>

            {/* Comprehensive Report Generation Block */}
            <div className="m-6 p-4 bg-emerald-50/20 border border-emerald-100/75 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 text-right">
              <div className="space-y-1">
                <span className="text-xs font-extrabold text-emerald-950 flex items-center gap-1.5 justify-start">
                  <FileText className="w-4 h-4 text-emerald-800" />
                  التقرير السنوي والتراكمي لبيانات وأخطاء الطالب 📂
                </span>
                <p className="text-[11px] text-zinc-500 font-light leading-relaxed">
                  يمكنك استخراج تقرير شامل ومكثف يحتوي على كافة مستويات التقييم، مع توثيق الأخطاء التجويدية واللحظية في جميع الحلقات، لحفظها كملف PDF مباشر أو نسخها فورا للمتابعة.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {/* Print Cumulative Report / Save PDF */}
                <button
                  type="button"
                  onClick={() => setActiveStudentPrint(true)}
                  className="cursor-pointer bg-slate-900 hover:bg-black text-white text-[11px] px-4 py-2 rounded-xl font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95 animate-pulse"
                >
                  <Printer className="w-3.5 h-3.5 text-white" />
                  <span>تحميل التقرير كـ PDF 🖨️</span>
                </button>

                {/* Copy Cumulative Report */}
                <button
                  type="button"
                  onClick={handleCopyCumulativeReport}
                  className="cursor-pointer bg-white hover:bg-slate-50 border border-emerald-100 text-[#064E3B] text-[11px] px-4 py-2 rounded-xl font-bold flex items-center gap-1.5 transition-all shadow-xs active:scale-95"
                >
                  {copiedCumulative ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600 font-bold shrink-0 animate-bounce" />
                      <span className="text-emerald-700 font-extrabold">تم النسخ بنجاح! ✔️</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                      <span>نسخ التقرير الشامل</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Content Tabs / lists */}
            <div className="p-6 space-y-6">
              {/* Chronological Mistakes List */}
              <div className="space-y-3">
                <h4 className="font-bold text-zinc-900 flex items-center gap-2 text-sm">
                  <AlertTriangle className="w-4.5 h-4.5 text-rose-500" />
                  تفاصيل الأخطاء وحالة التصحيح ({selectedStats.totalMistakesCount})
                </h4>

                {selectedStats.studentMistakes.length === 0 ? (
                  <div className="p-6 bg-zinc-50 rounded-2xl text-center text-zinc-400 text-xs border border-dashed border-zinc-200">
                    أحسنت! لم يتم تسجيل أي أخطاء تلاوة لهذا الطالب حتى الآن.
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                    {selectedStats.studentMistakes.map((mistake: any, index: number) => (
                      <div key={index} className="p-4 bg-zinc-50 rounded-xl border border-zinc-100 space-y-2 text-xs relative group hover:border-[#065F46]/30 transition-all">
                        <div className="flex justify-between items-center text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <span className={`${
                              mistake.type === 'تجويد' ? 'bg-amber-100 text-amber-800' :
                              mistake.type === 'مخارج' ? 'bg-teal-100 text-teal-800' :
                              mistake.type === 'تشكيل' ? 'bg-purple-100 text-purple-800' :
                              'bg-rose-100 text-rose-800'
                            } font-bold px-2 py-0.5 rounded`}>
                              خطأ {mistake.type}
                            </span>
                            <span className="text-zinc-400 font-light text-[10px] hidden sm:inline">({mistake._sessionTitle || "حلقة سابقة"})</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingMistake({
                                id: mistake.id,
                                sessionId: mistake._sessionId,
                                segmentId: mistake._segmentId,
                                text: mistake.text,
                                type: mistake.type,
                                correction: mistake.correction,
                                explanation: mistake.explanation || ""
                              })}
                              className="cursor-pointer text-slate-400 hover:text-[#064E3B] p-0.5 transition"
                              title="تعديل الخطأ"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteMistakeClick(mistake)}
                              className="cursor-pointer text-slate-400 hover:text-red-600 p-0.5 transition"
                              title="حذف الخطأ من التقرير"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-zinc-400 font-mono">رقم {index + 1}</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                          <div>
                            <span className="text-zinc-500 block mb-0.5">الكلمة أو الموضع الخطأ:</span>
                            <span className="font-bold text-rose-600 text-sm text-right font-semibold bg-rose-50/50 px-2 py-0.5 rounded border border-rose-100/50 block w-fit">
                              {mistake.text}
                            </span>
                          </div>
                          <div>
                            <span className="text-zinc-500 block mb-0.5">التصويب الصحيح:</span>
                            <span className="font-bold text-emerald-700 text-xs text-right bg-emerald-50/50 px-2 py-0.5 rounded border border-emerald-100/50 block w-fit">
                              {mistake.correction}
                            </span>
                          </div>
                        </div>
                        <div className="border-t border-zinc-150 pt-2 text-[11px] text-zinc-650 leading-relaxed font-light">
                          <span className="font-semibold text-zinc-700">شرح المعلم / القاعدة:</span> {mistake.explanation}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Attendance and progression history list */}
              <div className="space-y-4 border-t border-zinc-100 pt-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-zinc-50 border border-zinc-200 p-4 rounded-2xl text-right">
                  <div className="space-y-0.5">
                    <h4 className="font-bold text-zinc-900 flex items-center gap-2 text-sm">
                      <Calendar className="w-4.5 h-4.5 text-emerald-700 font-bold shrink-0" />
                      أرشيف تقييمات الطالب حلقة بحلقة
                    </h4>
                    <p className="text-[10px] text-zinc-500">
                      تصفح تقييمات تلاوات الطالب وأخطائه لكل حلقة على حدة أو اعزل حلقة معينة.
                    </p>
                  </div>

                  {/* Interactive selector to show mistakes for a specific session */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-zinc-700 shrink-0">اختر حلقة للعزل:</span>
                    <select
                      value={selectedFilterSessionId}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedFilterSessionId(val);
                        if (val !== "all") {
                          setExpandedSessionId(val); // Auto-expand when chosen
                        } else {
                          setExpandedSessionId(null);
                        }
                      }}
                      className="cursor-pointer bg-white border border-zinc-200 text-zinc-800 text-xs px-2.5 py-1.5 rounded-xl focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 font-bold max-w-[200px] shadow-sm text-right font-sans"
                    >
                      <option value="all">📁 جميع الحلقات</option>
                      {sessions
                        .filter(sess => sess.segments.some(seg => seg.studentId === selectedStudent.id))
                        .map(sess => (
                          <option key={sess.id} value={sess.id}>
                            📖 {sess.title}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                {/* Filter notification banner */}
                {selectedFilterSessionId !== "all" && (
                  <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl flex items-center justify-between gap-2.5 text-xs text-amber-900 animate-fade-in text-right">
                    <div className="flex items-center gap-1.5 font-semibold text-[11px]">
                      <span>🔍</span>
                      <span>
                        معروض حالياً: تلاوات وأخطاء حلقة{" "}
                        <strong className="text-amber-950 underline decoration-amber-500/50">
                          {sessions.find(s => s.id === selectedFilterSessionId)?.title}
                        </strong>{" "}
                        دون غيرها.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFilterSessionId("all");
                        setExpandedSessionId(null);
                      }}
                      className="cursor-pointer text-[10px] bg-amber-600 hover:bg-amber-700 text-white font-extrabold px-3 py-1.5 rounded-xl transition-all shadow-sm"
                    >
                      إلغاء التصفية
                    </button>
                  </div>
                )}

                <div className="space-y-2">
                  {sessions.filter(sess => sess.segments.some(seg => seg.studentId === selectedStudent.id)).length === 0 ? (
                    <p className="text-zinc-400 text-center py-2 text-xs">لم يقرأ الطالب في أي حلقات بعد.</p>
                  ) : (
                    sessions.map(sess => {
                      const relevantSegments = sess.segments.filter(seg => seg.studentId === selectedStudent.id);
                      if (relevantSegments.length === 0) return null;

                      // If a specific session filter is set, and this session is NOT the picked one, hide it completely!
                      if (selectedFilterSessionId !== "all" && sess.id !== selectedFilterSessionId) {
                        return null;
                      }

                      const isExpanded = selectedFilterSessionId === sess.id || expandedSessionId === sess.id;

                      return (
                        <div key={sess.id} className="bg-zinc-50 rounded-xl border border-zinc-200 overflow-hidden text-xs transition-all duration-200">
                          {/* Card Header clickable to expand/collapse */}
                          <div 
                            onClick={() => setExpandedSessionId(isExpanded ? null : sess.id)}
                            className="p-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center cursor-pointer hover:bg-zinc-100/85 transition-all select-none gap-2"
                          >
                            <div className="space-y-1 text-right">
                              <span className="font-semibold text-zinc-800 text-sm flex items-center gap-1.5 justify-start">
                                {sess.title}
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4 text-emerald-700 font-bold shrink-0" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-zinc-500 font-bold shrink-0" />
                                )}
                              </span>
                              <span className="text-[10px] text-zinc-400 font-mono block">
                                {new Date(sess.date).toLocaleDateString("ar-EG")}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1.5 justify-end">
                              {relevantSegments.map((seg, sIdx) => (
                                <span key={sIdx} className="bg-emerald-50 text-emerald-800 border border-emerald-100 font-semibold px-2 py-1 rounded-lg">
                                  تلاوة {seg.surahPage}: ({seg.score}/10) {seg.grade}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Card Body - shown below the session only if selected/expanded */}
                          {isExpanded && (
                            <div className="border-t border-zinc-200 bg-white p-4 space-y-4 animate-fade-in text-right">
                              {relevantSegments.map((seg, segIdx) => {
                                return (
                                  <div key={seg.id || segIdx} className="space-y-3 pb-3 border-b border-zinc-100 last:border-b-0 last:pb-0">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-dashed border-zinc-150 pb-2.5">
                                      <span className="text-xs font-extrabold text-[#064E3B] bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-lg">
                                        سورة/صفحة التلاوة: {seg.surahPage} ({seg.startTime} - {seg.endTime})
                                      </span>
                                      <div className="flex items-center gap-1.5 mt-1.5 sm:mt-0 font-bold text-[11px] text-slate-700">
                                        <span>درجة الحفظ والأداء:</span>
                                        <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded font-mono">{seg.score} / ١٠</span>
                                        <span className="text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">{seg.grade}</span>
                                      </div>
                                    </div>

                                    {/* Transcription */}
                                    {seg.transcription && (
                                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-1">
                                        <span className="text-[10px] text-slate-400 block font-light">النص المقروء الفعلي:</span>
                                        <p className="text-xs text-slate-800 font-serif leading-relaxed text-right font-medium">
                                          " {seg.transcription} "
                                        </p>
                                      </div>
                                    )}

                                    {/* Segment custom feedback notes */}
                                    {seg.notes && (
                                      <div className="text-[11px] text-slate-650 bg-amber-50/20 border border-amber-100/50 rounded-xl p-2.5">
                                        <strong className="text-amber-900 block mb-0.5">توجيه المعلم الخاص بهذه التلاوة:</strong>
                                        <p className="font-light">{seg.notes}</p>
                                      </div>
                                    )}

                                    {/* Segment Mistakes */}
                                    <div className="space-y-2">
                                      <span className="text-[10px] font-bold text-slate-700 block">الأخطاء المرصودة في هذه الحلقة ({seg.mistakes.length}):</span>
                                      {seg.mistakes.length === 0 ? (
                                        <div className="p-2.5 bg-emerald-50/20 border border-emerald-100 rounded-xl text-[11px] text-emerald-800 font-medium">
                                          تلاوة طيبة سليمة! لم يرصد المحفظ أي أخطاء أو لحون في هذا المقطع.
                                        </div>
                                      ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                          {seg.mistakes.map((mis, mIndex) => (
                                            <div key={mis.id || mIndex} className="p-3 bg-rose-50/10 hover:bg-rose-50/20 rounded-xl border border-rose-100 space-y-2 relative transition-all">
                                              <div className="flex justify-between items-center text-[9px] font-bold">
                                                <span className={`${
                                                  mis.type === 'تجويد' ? 'bg-amber-100 text-amber-800' :
                                                  mis.type === 'مخارج' ? 'bg-teal-100 text-teal-800' :
                                                  mis.type === 'تشكيل' ? 'bg-purple-100 text-purple-800' :
                                                  'bg-rose-100 text-rose-800'
                                                } px-1.5 py-0.5 rounded`}>
                                                  خطأ {mis.type}
                                                </span>
                                                <span className="text-rose-600/60">خطأ #{mIndex + 1}</span>
                                              </div>

                                              <div className="space-y-1 font-sans">
                                                <p className="text-[11px]">
                                                  <span className="text-zinc-500 font-light">الموضع الخطأ:</span>{" "}
                                                  <strong className="text-rose-600 font-extrabold bg-rose-50 px-1.5 py-0.5 rounded">{mis.text}</strong>
                                                </p>
                                                <p className="text-[11px]">
                                                  <span className="text-zinc-500 font-light">التصحيح الصحيح:</span>{" "}
                                                  <strong className="text-emerald-800 font-extrabold bg-emerald-50 px-1.5 py-0.5 rounded">{mis.correction}</strong>
                                                </p>
                                              </div>

                                              {mis.explanation && (
                                                <p className="text-[10px] text-zinc-650 italic leading-snug border-t border-rose-100/40 pt-1.5 pb-1 block">
                                                  "{mis.explanation}"
                                                </p>
                                              )}

                                              {mis.teacherCorrectionAudioUrl && (
                                                <div className="mt-2 pt-1.5 border-t border-rose-100/30 w-full flex flex-col gap-1 text-right">
                                                  <span className="text-[9px] text-[#064E3B] font-bold flex items-center gap-1">
                                                    🔊 استمع لبصمة تصحيح الشيخ المعلم:
                                                  </span>
                                                  <audio src={mis.teacherCorrectionAudioUrl} controls className="h-5 w-full" />
                                                </div>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>

                                    {/* Share report tools */}
                                    <div className="mt-4 pt-3.5 border-t border-zinc-100/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-indigo-50/5 hover:bg-indigo-50/10 p-3.5 rounded-2xl border border-zinc-200 text-right transition-colors">
                                      <div className="space-y-0.5">
                                        <span className="text-[11px] font-bold text-zinc-800 block flex items-center gap-1.5 justify-start">
                                          <Share2 className="w-3.5 h-3.5 text-emerald-600" />
                                          نشر وتصدير تقرير تلاوة الطالب:
                                        </span>
                                        <span className="text-[10px] text-zinc-400 block font-light">يمكنك نسخ أو مشاركة هذا التقرير التفصيلي مع القارئ أو ولي أمره للمتابعة المنزلية.</span>
                                      </div>
                                      <div className="flex flex-wrap items-center gap-2 justify-end">
                                        {/* Print & Save PDF Button */}
                                        <button
                                          type="button"
                                          onClick={() => setActivePrintReport({ sess, seg })}
                                          className="cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all shadow-xs active:scale-95"
                                        >
                                          <Printer className="w-3.5 h-3.5 text-white shrink-0" />
                                          <span>طباعة وحفظ PDF 🖨️</span>
                                        </button>

                                        {/* Copy Text Button */}
                                        <button
                                          type="button"
                                          onClick={() => handleCopyToClipboard(sess, seg)}
                                          className="cursor-pointer bg-white hover:bg-slate-50 border border-zinc-200 text-zinc-700 text-[11px] px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all shadow-xs active:scale-95"
                                        >
                                          {copiedSegmentId === (seg.id || `${sess.id}_${seg.surahPage}`) ? (
                                            <>
                                              <Check className="w-3.5 h-3.5 text-emerald-600 font-bold shrink-0 animate-bounce" />
                                              <span className="text-emerald-700 font-extrabold">تم نسخ التقرير! ✔️</span>
                                            </>
                                          ) : (
                                            <>
                                              <Copy className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                                              <span>نسخ نص التقرير</span>
                                            </>
                                          )}
                                        </button>

                                        {/* WhatsApp Direct Share Button */}
                                        <a
                                          href={`https://api.whatsapp.com/send?text=${encodeURIComponent(generateShareText(sess, seg))}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="cursor-pointer bg-[#25D366] hover:bg-[#20ba59] text-white text-[11px] px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all shadow-xs active:scale-95"
                                        >
                                          <span>💬 إرسال عبر واتساب</span>
                                        </a>
                                      </div>
                                    </div>

                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Danger Zone */}
              <div className="pt-4 border-t border-zinc-100 flex justify-end w-full">
                {isPendingDelete ? (
                  <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 flex flex-col gap-3 font-sans w-full text-right animate-fade-in">
                    <p className="text-xs font-bold text-rose-900">
                      هل أنت متأكد من رغبتك في حذف الطالب "{selectedStudent.name}" نهائياً؟ هذا الإجراء سيقوم بإلغاء الملف التدريسي للطالب.
                    </p>
                    <div className="flex gap-2 justify-start">
                      <button
                        type="button"
                        onClick={() => {
                          onDeleteStudent(selectedStudent.id);
                          setSelectedStudentId(null);
                          setIsPendingDelete(false);
                        }}
                        className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] px-3.5 py-2 rounded-xl cursor-pointer"
                      >
                        نعم، احذف الطالب
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsPendingDelete(false);
                        }}
                        className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-[10px] px-3.5 py-2 rounded-xl cursor-pointer"
                      >
                        تراجع
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setIsPendingDelete(true);
                    }}
                    className="cursor-pointer text-xs text-rose-500 hover:text-rose-700 flex items-center gap-1.5 font-bold hover:scale-[1.02] transition-transform"
                  >
                    <Trash className="w-3.5 h-3.5" />
                    حذف الطالب نهائياً من السجل
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full min-h-[400px] border border-dashed border-zinc-200 rounded-2xl flex flex-col items-center justify-center p-8 text-center text-zinc-400 bg-white">
            <Users className="w-12 h-12 text-zinc-300 mb-2" />
            <h4 className="font-bold text-zinc-800 text-sm">لم يتم تحديد طالب</h4>
            <p className="text-xs text-zinc-500 max-w-xs mt-1">
              اختر مكمن الطالب في القائمة اليمنى لعرض كشف درجاته بالتفصيل، وأرشيف أخطائه، والتحكم بصوته المرجعي.
            </p>
          </div>
        )}
      </div>

      {/* Add Student Modal Panel */}
      {showAddModal && (
        <div id="add-student-modal" className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden border border-zinc-100 shadow-2xl flex flex-col">
            <div className="bg-emerald-900 p-5 text-white">
              <h3 className="text-lg font-bold">تسجيل طالب جديد بالحلقة القرآنية</h3>
              <p className="text-emerald-200/80 text-xs font-light">املأ البيانات واحفظ بصمة صوته لتمكين التصنيف الآلي.</p>
            </div>
            <div className="p-6 space-y-4 flex-1">
              {studentFormError && (
                <div className="bg-rose-50 border border-rose-150 text-rose-900 text-xs p-3.5 rounded-xl font-bold animate-fade-in text-right">
                  ⚠️ {studentFormError}
                </div>
              )}
              {/* Form entries */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-700 block">اسم الطالب ثلاثي *</label>
                <input
                  type="text"
                  placeholder="مثال: يوسف أحمد الصاوي"
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-700 block">معالم وميزات صوتية (اختياري)</label>
                <textarea
                  rows={2}
                  placeholder="مثال: صوت حاد، مخارج واضحة، يستعجل المدود..."
                  value={newStudentNotes}
                  onChange={(e) => setNewStudentNotes(e.target.value)}
                  className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 text-right"
                />
              </div>

              {/* Vocal print recorder portion */}
              <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-150 space-y-3">
                <p className="text-xs font-bold text-zinc-800 flex items-center gap-1.5 justify-start">
                  <Mic className="w-4 h-4 text-emerald-800" />
                  تسجيل بصمة صوت مرجعية (عينة للتلاوة)
                </p>
                <p className="text-[11px] text-zinc-500">
                  يرجى من الطالب تلاوة سورة الإخلاص أو بضع آيات من سورة الفاتحة بمفرده (5-10 ثوانٍ) كبصمة لمطابقته آلياً لاحقاً.
                </p>

                <div className="flex gap-3 items-center">
                  {!isRecording ? (
                    <button
                      type="button"
                      onClick={startRecording}
                      className="cursor-pointer bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl px-4 py-2 text-xs font-bold flex items-center gap-1 transition-colors"
                    >
                      <Mic className="w-3.5 h-3.5 ml-1 animate-pulse" />
                      بدء التسجيل المباشر
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="cursor-pointer bg-rose-500 hover:bg-rose-600 text-white rounded-xl px-4 py-2 text-xs font-bold flex items-center gap-1 transition-all animate-pulse"
                    >
                      <Square className="w-3.5 h-3.5 ml-1" />
                      إيقاف ({recDuration} ثانية)
                    </button>
                  )}

                  {recordedAudioUrl && !isRecording && (
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] bg-emerald-100/50 text-emerald-800 px-2 py-0.5 rounded-md font-semibold">بصمة الصوت جاهزة!</span>
                      <audio src={recordedAudioUrl} controls className="h-8 max-w-[130px]" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-5 bg-zinc-50 border-t border-zinc-150 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="cursor-pointer text-xs text-zinc-500 hover:text-zinc-700 bg-zinc-200/50 px-4 py-2 rounded-xl"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSaveStudent}
                className="cursor-pointer text-xs bg-emerald-800 hover:bg-emerald-950 text-white font-bold px-5 py-2.5 rounded-xl transition-colors shadow-lg shadow-emerald-900/10"
              >
                حفظ الطالب وتسجيله
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Student Modal Panel */}
      {showEditModal && (
        <div id="edit-student-modal" className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in text-slate-800">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden border border-zinc-100 shadow-2xl flex flex-col text-right">
            <div className="bg-[#D97706] p-5 text-white">
              <h3 className="text-lg font-bold">تحديث ملف وبصمة صوت: {editingStudentName}</h3>
              <p className="text-amber-100 text-xs font-light">تعديل بيانات القارئ وتحديث البصمة الصوتية المرجعية الخاصة به.</p>
            </div>
            <div className="p-6 space-y-4 flex-1">
              {studentFormError && (
                <div className="bg-rose-50 border border-rose-150 text-rose-900 text-xs p-3.5 rounded-xl font-bold animate-fade-in text-right">
                  ⚠️ {studentFormError}
                </div>
              )}
              {/* Form entries */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-700 block">اسم الطالب ثلاثي *</label>
                <input
                  type="text"
                  placeholder="مثال: يوسف أحمد الصاوي"
                  value={editingStudentName}
                  onChange={(e) => setEditingStudentName(e.target.value)}
                  className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 text-right"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-700 block">معالم وميزات صوتية (اختياري)</label>
                <textarea
                  rows={2}
                  placeholder="مثال: صوت حاد، مخارج واضحة، يستعجل المدود..."
                  value={editingStudentNotes}
                  onChange={(e) => setEditingStudentNotes(e.target.value)}
                  className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 text-right"
                />
              </div>

              {/* Vocal print recorder portion */}
              <div className="bg-[#FFFBEB] p-4 rounded-2xl border border-amber-100 space-y-3 text-right">
                <p className="text-xs font-bold text-amber-900 flex items-center gap-1.5 justify-start">
                  <Mic className="w-4 h-4 text-amber-800" />
                  تسجيل أو تعديل بصمة الصوت المرجعية
                </p>
                <p className="text-[11px] text-zinc-500">
                  سجل صوت القارئ لـ 5-10 ثوانٍ، أو قم برفع ملف صوتي مباشر عينة من الجهاز لتحديث بصمة مطابقة هويته الصوتية فورياً.
                </p>

                <div className="flex flex-wrap gap-3 items-center">
                  {!isRecording ? (
                    <button
                      type="button"
                      onClick={startRecording}
                      className="cursor-pointer bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-xl px-4 py-2 text-xs font-bold flex items-center gap-1 transition-colors border border-amber-200"
                    >
                      <Mic className="w-3.5 h-3.5 ml-1 animate-pulse text-amber-750" />
                      بدء تسجيل مباشرة
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="cursor-pointer bg-rose-500 hover:bg-rose-600 text-white rounded-xl px-4 py-2 text-xs font-bold flex items-center gap-1 transition-all animate-pulse"
                    >
                      <Square className="w-3.5 h-3.5 ml-1" />
                      إيقاف ({recDuration} ثانية)
                    </button>
                  )}

                  {!isRecording && (
                    <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 text-xs px-3 py-2 rounded-xl font-bold flex items-center gap-1 transition-all leading-none">
                      <span>📁 رفع ملف صوت عينة</span>
                      <input 
                        type="file" 
                        accept="audio/*" 
                        className="hidden" 
                        onChange={handleStudentVoiceUpload}
                      />
                    </label>
                  )}

                  {recordedAudioUrl && !isRecording && (
                    <div className="flex items-center gap-2 mt-2 w-full justify-between bg-white p-2 rounded-xl border border-amber-100 animate-fade-in">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md font-bold">البصمة جاهزة!</span>
                        <button
                          type="button"
                          onClick={() => setRecordedAudioUrl(null)}
                          className="cursor-pointer text-[10px] text-rose-500 hover:text-rose-700 font-bold"
                        >
                          إزالة
                        </button>
                      </div>
                      <audio src={recordedAudioUrl} controls className="h-8 max-w-[150px]" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-5 bg-zinc-50 border-t border-zinc-150 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false);
                  setRecordedAudioUrl(null);
                }}
                className="cursor-pointer text-xs text-zinc-500 hover:text-zinc-700 bg-zinc-200/50 px-4 py-2 rounded-xl font-medium"
              >
                إلغاء التعديل
              </button>
              <button
                type="button"
                onClick={handleSaveEditedStudent}
                className="cursor-pointer text-xs bg-[#D97706] hover:bg-[#B45309] text-white font-bold px-5 py-2.5 rounded-xl transition-colors shadow-lg"
              >
                حفظ التعديلات والبصمة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Student Mistake Modal Panel */}
      {editingMistake && (
        <div id="edit-mistake-modal" className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in text-slate-800" dir="rtl">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden border border-zinc-100 shadow-2xl flex flex-col text-right font-sans">
            <div className="bg-gradient-to-r from-teal-900 to-[#064E3B] p-5 text-white">
              <h3 className="text-sm font-extrabold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                تعديل وتدقيق خطأ التلاوة المسجل
              </h3>
              <p className="text-zinc-200 text-[11px] font-light mt-0.5">تعديل الموضع والكلمة والتصحيح ونوع اللحن في السجل التراكمي للطالب.</p>
            </div>
            
            <div className="p-6 space-y-4 flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-700 block">الكلمة أو الموضع الخطأ *</label>
                  <input
                    type="text"
                    value={editingMistake.text}
                    onChange={(e) => setEditingMistake({ ...editingMistake, text: e.target.value })}
                    className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:outline-none focus:border-emerald-600 font-bold text-rose-600"
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-700 block">التصويب الصحيح *</label>
                  <input
                    type="text"
                    value={editingMistake.correction}
                    onChange={(e) => setEditingMistake({ ...editingMistake, correction: e.target.value })}
                    className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:outline-none focus:border-emerald-600 font-bold text-emerald-700"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-700 block">تصنيف ونوع اللحن *</label>
                <select
                  value={editingMistake.type}
                  onChange={(e: any) => setEditingMistake({ ...editingMistake, type: e.target.value })}
                  className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:outline-none focus:border-emerald-600 font-bold"
                >
                  <option value="تجويد">لحن تجويدي (قواعد الغنة، المدود، النون والميم)</option>
                  <option value="مخارج">مخارج الصفات وأصوات الحروف الفردية</option>
                  <option value="تشكيل">لحن جلي في حركات الإعراب والتشكيل</option>
                  <option value="حفظ">خطأ أو نسيان في التسميع والحفظ</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-700 block">شرح وتوجيه المعلم / تفصيل الخطأ</label>
                <textarea
                  rows={3}
                  value={editingMistake.explanation}
                  onChange={(e) => setEditingMistake({ ...editingMistake, explanation: e.target.value })}
                  className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:outline-none focus:border-emerald-600 text-right font-light"
                  placeholder="مثال: التقصير في فترات الغنة للنون المشددة بمقدار حركتين..."
                />
              </div>
            </div>

            <div className="p-5 bg-zinc-50 border-t border-zinc-150 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setEditingMistake(null)}
                className="cursor-pointer text-xs text-zinc-500 hover:text-zinc-750 bg-zinc-200/50 px-4 py-2 rounded-xl font-bold"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleEditMistakeSubmit}
                className="cursor-pointer text-xs bg-emerald-800 hover:bg-emerald-950 text-white font-extrabold px-5 py-2.5 rounded-xl transition-colors shadow-lg"
              >
                حفظ تعديلات الخطأ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Report View (Visible only during printing) */}
      {activePrintReport && (
        <div id="printable-report-container-root" className="hidden print:block bg-white p-8 font-sans text-slate-900 border-2 border-emerald-800 m-4 rounded-xl text-right" dir="rtl">
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              body {
                background-color: white !important;
                color: black !important;
                font-family: 'Inter', system-ui, sans-serif !important;
              }
              /* Hide all components of the main application layout */
              body > #root > * {
                display: none !important;
              }
              /* Ensure the printable container itself is block and visible */
              #printable-report-container-root {
                display: block !important;
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                margin: 0 !important;
                padding: 20px !important;
                border: none !important;
                background: white !important;
                color: black !important;
                direction: rtf;
              }
              /* Simple page break optimization for printers */
              tr {
                page-break-inside: avoid !important;
              }
            }
          `}} />

          {/* Logo / Header Motif */}
          <div className="flex justify-between items-center border-b-2 border-emerald-800 pb-4 mb-6">
            <div className="text-right">
              <h1 className="text-2xl font-bold text-emerald-800 font-serif">مِنَصَّة مِيزَانْ لِضَبْطِ التِّلَاوَةِ</h1>
              <p className="text-xs text-emerald-600 mt-1 font-medium">نظام المتابعة الحلقية الذكية وضبط المصاحف والمخارج بالذكاء الاصطناعي</p>
            </div>
            <div className="text-left border-r border-emerald-100 pr-4">
              <p className="text-sm font-bold text-zinc-750">تقرير تقييم تلاوة القارئ الرسمي</p>
              <p className="text-[10px] text-zinc-400 font-mono mt-0.5">تاريخ إصدار التقرير: {new Date().toLocaleDateString("ar-EG")}</p>
            </div>
          </div>

          {/* Metadata Card Info */}
          <div className="grid grid-cols-2 gap-4 mb-6 bg-emerald-50/20 p-5 rounded-2xl border border-emerald-150">
            <div className="space-y-1">
              <span className="text-[10px] text-zinc-400 font-bold block">اسم الطالب القارئ:</span>
              <span className="text-sm font-bold text-emerald-950">{selectedStudent?.name || "القارئ المبارك"}</span>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-zinc-400 font-bold block">عنوان حلقة التقييم:</span>
              <span className="text-sm font-bold text-emerald-950">{activePrintReport.sess.title}</span>
            </div>
            <div className="space-y-1 mt-2">
              <span className="text-[10px] text-zinc-400 font-bold block">تاريخ تقييم الحلقة:</span>
              <span className="text-sm font-semibold text-zinc-800 font-mono">
                {new Date(activePrintReport.sess.date).toLocaleDateString("ar-EG")}
              </span>
            </div>
            <div className="space-y-1 mt-2">
              <span className="text-[10px] text-zinc-400 font-bold block">موضع التلاوة في المصحف:</span>
              <span className="text-sm font-bold text-zinc-800">
                {activePrintReport.seg.surahPage} ({activePrintReport.seg.startTime} - {activePrintReport.seg.endTime})
              </span>
            </div>
          </div>

          {/* Performance Grading stats */}
          <div className="flex justify-between items-center bg-zinc-50 border border-zinc-200 p-4 rounded-xl mb-6 font-bold text-xs">
            <span className="text-zinc-650">درجة الحفظ والأداء الإجمالي للمقطع:</span>
            <div className="flex gap-3">
              <span className="bg-emerald-100 text-emerald-900 border border-emerald-200 px-3 py-1 rounded-lg">
                الدرجة الحلقية: {activePrintReport.seg.score} / ١٠
              </span>
              <span className="bg-emerald-50 text-emerald-850 border border-emerald-150 px-3 py-1 rounded-lg">
                التقدير: {activePrintReport.seg.grade}
              </span>
            </div>
          </div>

          {/* Teacher guidance recommendations */}
          {activePrintReport.seg.notes && (
            <div className="mb-6 p-4 bg-amber-50/30 border border-amber-100 rounded-xl space-y-1.5 break-inside-avoid">
              <h3 className="text-xs font-bold text-amber-900 flex items-center gap-1">
                📝 توصيات وتوجيهات الشيخ المعلم للمتابعة المنزلية:
              </h3>
              <p className="text-xs text-zinc-700 leading-relaxed font-light">{activePrintReport.seg.notes}</p>
            </div>
          )}

          {/* Segment Transcription detail */}
          {activePrintReport.seg.transcription && (
            <div className="mb-6 p-4 bg-slate-50 border border-zinc-150 rounded-xl space-y-1.5 break-inside-avoid">
              <h3 className="text-xs font-bold text-slate-700">📖 النص القرآني المقروء تالياً من الطالب:</h3>
              <p className="text-xs text-slate-800 leading-relaxed font-serif font-semibold">"{activePrintReport.seg.transcription}"</p>
            </div>
          )}

          {/* Mistakes and Correction Table */}
          <div className="space-y-3 break-inside-avoid">
            <h3 className="text-xs font-bold text-zinc-800 border-r-4 border-emerald-700 pr-2 block">سجل الأخطاء واللحون المرصودة بالتفصيل</h3>
            
            {activePrintReport.seg.mistakes.length === 0 ? (
              <div className="bg-emerald-50/20 border border-emerald-100 text-emerald-850 p-5 rounded-2xl text-center text-xs font-bold">
                ما شاء الله تبارك الرحمن! تلاوة ممتازة مطابقة لأحكام الترتيل والتأصيل، خالية تماماً من اللحون والأخطاء.
              </div>
            ) : (
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-emerald-800 text-white border border-emerald-800">
                    <th className="p-2.5 text-right font-bold border border-emerald-700 w-10">م</th>
                    <th className="p-2.5 text-right font-bold border border-emerald-700 w-24">نوع وموضع الخطأ</th>
                    <th className="p-2.5 text-right font-bold border border-emerald-700">الكلمة المقروءة خطأ</th>
                    <th className="p-2.5 text-right font-bold border border-emerald-700">التصحيح السليم والبيان</th>
                    <th className="p-2.5 text-right font-bold border border-emerald-700">توجيه وضبط الشيخ</th>
                  </tr>
                </thead>
                <tbody>
                  {activePrintReport.seg.mistakes.map((mis: TajweedMistake, idx: number) => (
                    <tr key={mis.id || idx} className="hover:bg-zinc-50 border-b border-zinc-200">
                      <td className="p-2.5 font-semibold text-center border border-zinc-200 text-zinc-800">{idx + 1}</td>
                      <td className="p-2.5 border border-zinc-200 font-bold text-zinc-900 bg-zinc-100">{mis.type}</td>
                      <td className="p-2.5 border border-zinc-200 font-bold text-rose-700 bg-rose-50/25">
                        "{mis.text}"
                      </td>
                      <td className="p-2.5 border border-zinc-200 font-bold text-emerald-800 bg-emerald-50/25">
                        "{mis.correction}"
                      </td>
                      <td className="p-2.5 border border-zinc-200 text-zinc-650 font-light text-[11px] leading-relaxed">
                        {mis.explanation || " ضبط تلاوة وتوجيه مباشر"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Official Stamp footer and credentials */}
          <div className="mt-12 flex justify-between items-end text-[10px] text-zinc-400 border-t border-zinc-150 pt-5 pr-1">
            <div className="space-y-1 text-right">
              <p className="font-medium text-zinc-500">تم مراجعة وضبط التقرير بواسطة نظام الذكاء الاصطناعي لمقرأة ميزان</p>
              <p>ملاحظة: هذا التقرير مخصص للمتابعة المنزلية لرفع أداء الطالب.</p>
            </div>
            <div className="space-y-4 text-left font-semibold">
              <p className="text-zinc-500">توقيع المعلم المقرئ الحلقي:</p>
              <p className="text-zinc-605 tracking-wider">__________________________</p>
            </div>
          </div>
        </div>
      )}

      {/* Printable Cumulative Student Report (Visible only during printing) */}
      {activeStudentPrint && (
        <div id="printable-student-container-root" className="hidden print:block bg-white p-8 font-sans text-slate-900 border-2 border-emerald-800 m-4 rounded-xl text-right" dir="rtl">
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              body {
                background-color: white !important;
                color: black !important;
                font-family: 'Inter', system-ui, sans-serif !important;
              }
              /* Hide all components of the main application layout */
              body > #root > * {
                display: none !important;
              }
              /* Ensure the printable container itself is block and visible */
              #printable-student-container-root {
                display: block !important;
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                margin: 0 !important;
                padding: 20px !important;
                border: none !important;
                background: white !important;
                color: black !important;
                direction: rtf;
              }
              /* Simple page break optimization for printers */
              .print-avoid-break {
                page-break-inside: avoid !important;
              }
            }
          `}} />

          {/* Logo / Header Motif */}
          <div className="flex justify-between items-center border-b-2 border-emerald-800 pb-4 mb-6">
            <div className="text-right">
              <h1 className="text-2xl font-bold text-emerald-800 font-serif">مِنَصَّة مِيزَانْ لِضَبْطِ التِّلَاوَةِ</h1>
              <p className="text-xs text-emerald-600 mt-1 font-medium">سجل الأداء الأكاديمي التراكمي وحصيلة أخطاء تلاوة القارئ</p>
            </div>
            <div className="text-left border-r border-emerald-100 pr-4">
              <p className="text-sm font-bold text-zinc-750">التقرير التراكمي الشامل وسجل المتابعة</p>
              <p className="text-[10px] text-zinc-400 font-mono mt-0.5">تاريخ الطباعة: {new Date().toLocaleDateString("ar-EG")}</p>
            </div>
          </div>

          {/* Metadata Card Info */}
          <div className="grid grid-cols-2 gap-4 mb-6 bg-emerald-50/20 p-5 rounded-2xl border border-emerald-150">
            <div className="space-y-1">
              <span className="text-[10px] text-zinc-400 font-bold block">اسم الطالب القارئ:</span>
              <span className="text-sm font-bold text-emerald-950">{selectedStudent?.name || "القارئ القدوة"}</span>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-zinc-400 font-bold block">تاريخ التسجيل المبدئي:</span>
              <span className="text-sm font-semibold text-zinc-800 font-mono">
                {selectedStudent ? new Date(selectedStudent.registeredAt).toLocaleDateString("ar-EG") : ""}
              </span>
            </div>
            <div className="space-y-1 col-span-2 mt-2">
              <span className="text-[10px] text-zinc-400 font-bold block">ملامح وبصمة الصوت:</span>
              <span className="text-sm text-zinc-750 font-normal">
                {selectedStudent?.accentNotes || "لا توجد ملاحظات مبدئية لملامح صوت الطالب."}
              </span>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-3 border border-zinc-250 rounded-xl divide-x divide-x-reverse divide-zinc-250 text-center font-bold text-xs mb-6">
            <div className="p-3">
              <span className="text-zinc-500 block mb-1">متوسط التقييم العام</span>
              <span className="text-emerald-900 font-bold font-mono text-sm">{selectedStats?.averageRating} / ١٠</span>
            </div>
            <div className="p-3">
              <span className="text-zinc-500 block mb-1">عدد الحلقات التي حضرها</span>
              <span className="text-zinc-900 font-bold font-mono text-sm">{selectedStats?.attendedSessionsCount} حلقات</span>
            </div>
            <div className="p-3">
              <span className="text-zinc-500 block mb-1">إجمالي الأخطاء المرصودة</span>
              <span className="text-rose-800 font-bold font-mono text-sm">{selectedStats?.totalMistakesCount} أخطاء وملاحظات</span>
            </div>
          </div>

          {/* Chronological sessions list */}
          <div className="space-y-6">
            <h3 className="text-xs font-bold text-zinc-800 border-r-4 border-emerald-700 pr-2 block">سجل الحلقات والمقاطع المقروءة بحصيلة الأخطاء المرتبطة</h3>
            
            {selectedStudent && sessions.filter(sess => sess.segments.some(seg => seg.studentId === selectedStudent.id)).length === 0 ? (
              <div className="text-center py-4 text-xs text-zinc-400 bg-zinc-50 border border-dashed rounded-xl">
                لا توجد حصيلة تلاوات سابقة مسجلة للطالب.
              </div>
            ) : (
              selectedStudent && sessions
                .filter(sess => sess.segments.some(seg => seg.studentId === selectedStudent.id))
                .map((sess, sIdx) => {
                  const relevantSegments = sess.segments.filter(seg => seg.studentId === selectedStudent.id);
                  return (
                    <div key={sess.id} className="p-4 border border-zinc-250 rounded-xl space-y-4 print-avoid-break bg-zinc-50/10 mb-4 text-right" dir="rtl">
                      {/* Session title bar */}
                      <div className="flex justify-between items-center bg-zinc-100 border border-zinc-250 p-2.5 rounded-lg text-right">
                        <span className="font-bold text-emerald-900 text-xs text-right">حلقة #{sIdx + 1}: {sess.title}</span>
                        <span className="text-[10px] text-zinc-450 font-mono font-bold text-right">{new Date(sess.date).toLocaleDateString("ar-EG")}</span>
                      </div>

                      {relevantSegments.map((seg, segIdx) => (
                        <div key={seg.id || segIdx} className="space-y-3 border-t border-dashed border-zinc-200 pt-3 first:border-t-0 first:pt-0">
                          <div className="flex justify-between items-center text-[11px] font-bold">
                            <div className="text-right">📖 المقطع: <span className="text-emerald-800">{seg.surahPage} (دقائق {seg.startTime} - {seg.endTime})</span></div>
                            <div className="text-left">التقييم: <span className="text-emerald-850 font-mono">{seg.score}/١٠ ({seg.grade})</span></div>
                          </div>

                          {seg.notes && (
                            <p className="text-[11px] leading-relaxed text-zinc-700 font-light pr-2 bg-amber-50/15 py-1.5 px-2.5 border-r-2 border-amber-400 rounded-l text-right">
                              <strong>توجيه الشيخ المعلم:</strong> "{seg.notes}"
                            </p>
                          )}

                          {seg.mistakes.length === 0 ? (
                            <p className="text-[10px] text-emerald-800 font-bold text-right">✨ تلاوة خالية من اللحون والأخطاء في هذا المقطع. ✨</p>
                          ) : (
                            <div className="space-y-1.5 text-right">
                              <span className="text-[10px] font-semibold text-zinc-500 block">الأخطاء المرصودة ({seg.mistakes.length}):</span>
                              <div className="grid grid-cols-1 gap-1.5">
                                {seg.mistakes.map((mis, mIdx) => (
                                  <div key={mis.id || mIdx} className="p-2.5 border border-rose-100 rounded-xl bg-rose-50/15 text-[10px] flex justify-between items-start text-right">
                                    <div className="space-y-0.5 text-right">
                                      <span className="font-bold bg-rose-50 border border-rose-150 px-1.5 py-0.2 rounded ml-1.5 text-rose-800">{mis.type}</span>
                                      <span>الكلمة: <strong className="text-rose-700">"{mis.text}"</strong> 👈 الصواب: <strong className="text-emerald-800 font-extrabold">"{mis.correction}"</strong></span>
                                      {mis.explanation && <p className="text-[9.5px] text-zinc-500 font-light mt-0.5 text-right">القاعدة والضبط: {mis.explanation}</p>}
                                    </div>
                                    <span className="text-[9px] text-zinc-400 font-mono">خطأ #{mIdx + 1}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })
            )}
          </div>

          {/* Official Stamp footer and credentials */}
          <div className="mt-12 flex justify-between items-end text-[10px] text-zinc-400 border-t border-zinc-150 pt-5 pr-1 text-right">
            <div className="space-y-1 text-right">
              <p className="font-medium text-zinc-500">تم مراجعة وضبط التقرير التراكمي لمقرأة ميزان بالذكاء الاصطناعي</p>
              <p>مقرأة ميزان لتعليم وضبط تلاوة وقراءات القرآن الكريم.</p>
            </div>
            <div className="space-y-4 text-left font-semibold">
              <p className="text-zinc-500">توقيع فضيلة الشيخ المحفظ:</p>
              <p className="text-zinc-600 tracking-wider">__________________________</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
