import React, { useState, useRef } from "react";
import { Student, Session } from "../types";
import { 
  Mic, Square, Upload, Play, FileAudio, Users, AlertCircle, 
  Sparkles, CheckSquare, Square as SquareIcon, Star, RefreshCw, Trash2
} from "lucide-react";

interface SessionRecorderProps {
  students: Student[];
  onStartAnalysis: (payload: { title: string; participants: string[]; audioBase64: string; mimeType: string }) => Promise<void>;
  isAnalyzing: boolean;
  onSelectPastSession: (sess: Session) => void;
  onDeleteSession: (id: string) => void;
  pastSessions: Session[];
}

export default function SessionRecorder({ 
  students, 
  onStartAnalysis, 
  isAnalyzing, 
  onSelectPastSession, 
  onDeleteSession,
  pastSessions 
}: SessionRecorderProps) {
  const [validationError, setValidationError] = useState<string | null>(null);
  const [sessionIdToDelete, setSessionIdToDelete] = useState<string | null>(null);

  const [sessionTitle, setSessionTitle] = useState(() => {
    const today = new Date();
    return `تسميع حلقة يوم ${today.toLocaleDateString("ar-EG", { weekday: "long", day: "numeric", month: "long" })}`;
  });
  
  const [selectedStudents, setSelectedStudents] = useState<string[]>(
    students.map(st => st.id)
  );

  // Audio input mode: 'record' or 'upload'
  const [inputMode, setInputMode] = useState<'record' | 'upload'>('upload');
  
  // Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recDuration, setRecDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  // Uploaded/Recorded file states
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [audioFileName, setAudioFileName] = useState<string | null>(null);
  const [audioMimeType, setAudioMimeType] = useState<string>("");
  const [dragActive, setDragActive] = useState(false);

  // Quick Encouragement text cycler
  const encouragedQuotes = [
    "«خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ»",
    "«الَّذِي يَقْرَأُ الْقُرْآنَ وَهُوَ مَاهِرٌ بِهِ مَعَ السَّفَرَةِ الْكِرَامِ الْبَرَرَةِ»",
    "يقوم الذكاء الاصطناعي الآن بإنصات دقيق لنبرات الأصوات ومطابقتها ببصمات طلاب الحلقة..."
  ];
  const [quoteIndex, setQuoteIndex] = useState(0);

  React.useEffect(() => {
    let interval: any;
    if (isAnalyzing) {
      interval = setInterval(() => {
        setQuoteIndex((prev) => (prev + 1) % encouragedQuotes.length);
      }, 4000);
    }
    return () => clearInterval(interval);
  }, [isAnalyzing]);

  // Handle participant toggles
  const handleStudentToggle = (id: string) => {
    if (selectedStudents.includes(id)) {
      setSelectedStudents(prev => prev.filter(stId => stId !== id));
    } else {
      setSelectedStudents(prev => [...prev, id]);
    }
  };

  const handleSelectAll = (all: boolean) => {
    if (all) {
      setSelectedStudents(students.map(st => st.id));
    } else {
      setSelectedStudents([]);
    }
  };

  // Direct mic recorder methods
  const startRecording = async () => {
    audioChunksRef.current = [];
    setAudioBase64(null);
    setAudioFileName(null);
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
        setAudioFileName(`تسجيل حلقة ميزان - ${new Date().toLocaleTimeString("ar-EG")}.webm`);
        setAudioMimeType("audio/webm");

        const reader = new FileReader();
        reader.onloadend = () => {
          setAudioBase64(reader.result as string);
        };
        reader.readAsDataURL(audioBlob);

        // Stop media stream tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      setRecDuration(0);

      timerRef.current = setInterval(() => {
        setRecDuration(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error("الوصول لميكروفون الحلقة معطل:", err);
      setValidationError("يرجى إعطاء صلاحية الميكروفون للبدء في التسجيل الصوتي للحلقة.");
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

  // Drag and Drop Usability Implementation
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processAudioFile = (file: File) => {
    if (!file.type.startsWith("audio/")) {
      setValidationError("الرجاء تحميل ملف صوتي صالح فقط (مثل MP3, WAV, WEBM, OGG).");
      return;
    }
    setValidationError(null);
    setAudioFileName(file.name);
    setAudioMimeType(file.type || "audio/webm");

    const reader = new FileReader();
    reader.onloadend = () => {
      setAudioBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processAudioFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processAudioFile(e.target.files[0]);
    }
  };

  const triggerAnalyze = () => {
    if (selectedStudents.length === 0) {
      setValidationError("يرجى تحديد طالب واحد على الأقل للمشاركة في الحلقة.");
      return;
    }
    if (!audioBase64) {
      setValidationError("يرجى فحص ورفع ملف تلاوة الحلقة الصوتية أو استخدام التسجيل المباشر أولاً.");
      return;
    }
    if (!sessionTitle.trim()) {
      setValidationError("الرجاء إدخال اسم موضوع أو تسمية الحلقة.");
      return;
    }

    setValidationError(null);
    onStartAnalysis({
      title: sessionTitle,
      participants: selectedStudents,
      audioBase64,
      mimeType: audioMimeType
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-slate-800" id="recitation-workbench">
      
      {/* Configuration & Trigger */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Loading Spinner Overlays */}
        {isAnalyzing ? (
          <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-md flex flex-col items-center justify-center text-center min-h-[400px] space-y-6 animate-pulse">
            <div className="relative">
              {/* Spinning Emerald Circles */}
              <div className="w-20 h-20 rounded-full border-4 border-slate-100 border-t-[#064E3B] animate-spin"></div>
              <Sparkles className="w-6 h-6 text-[#D97706] absolute top-7 right-7 animate-bounce" />
            </div>
            <div className="space-y-2 max-w-md">
              <h3 className="text-lg font-extrabold text-[#064E3B]">تقويم التلاوة وتفريغ الأصوات بنظام ميزان...</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-light">
                يرجى عدم مغادرة الصفحة بينما يقوم النظام الذكي بالاستماع لجلسة تلاوتكم، وتفريع نبرات الحضور، ومطابقة التجويد ومخارج الحروف مع كتاب الله الكريم.
              </p>
            </div>

            {/* Cycler Quote */}
            <div className="bg-emerald-50/50 text-[#064E3B] px-6 py-4 rounded-xl border border-emerald-100 max-w-sm transition-all duration-500">
              <p className="font-extrabold text-center text-xs md:text-sm italic leading-relaxed">
                {encouragedQuotes[quoteIndex]}
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Step 1: Session Meta and student selections */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4 hover:shadow-xs transition-shadow duration-300">
              <div className="border-b border-slate-100 pb-3">
                <span className="text-[10px] bg-[#D97706] text-white px-2.5 py-0.5 rounded-full font-bold ml-2 shadow-xs">خطوة ١</span>
                <h3 className="text-sm font-extrabold text-[#064E3B] inline-block">تسمية الحلقة الحالية وتحديد الحاضرين</h3>
              </div>
              
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">عنوان الحلقة أو التلاوة اليومية *</label>
                <input
                  type="text"
                  value={sessionTitle}
                  onChange={(e) => setSessionTitle(e.target.value)}
                  placeholder="مثال: حلقة تسميع سورة النبأ"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#065F46]/10 focus:border-[#065F46] focus:bg-white text-right font-medium transition-all"
                />
              </div>

              {/* Attendance checkbox panel */}
              <div className="space-y-2 pt-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-extrabold text-slate-700">حدد الطلاب المشاركين بهذه الحلقة لتطابق أصواتهم وتفريد تفريغهم ({selectedStudents.length}):</span>
                  {students.length > 0 && (
                    <div className="flex gap-2 font-bold text-xs">
                      <button 
                        onClick={() => handleSelectAll(true)}
                        className="text-[#064E3B] hover:text-[#065F46] cursor-pointer"
                      >
                        تحديد الكل
                      </button>
                      <span className="text-slate-350">•</span>
                      <button 
                        onClick={() => handleSelectAll(false)}
                        className="text-slate-500 hover:text-slate-600 cursor-pointer"
                      >
                        إلغاء التحديد
                      </button>
                    </div>
                  )}
                </div>

                {students.length === 0 ? (
                  <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-2.5 text-rose-800 text-xs text-right leading-relaxed font-light">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600" />
                    <span>لا يوجد طلاب مسجلون حالياً. يرجى التوجه لعلامة تبويب <strong>"سجل الطلاب"</strong> لتسجيل ٣ طلاب وبصماتهم الصوتية على الأقل لتجربة هذه الميزة.</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[140px] overflow-y-auto pr-1">
                    {students.map((student) => {
                      const isChecked = selectedStudents.includes(student.id);
                      return (
                        <div
                          key={student.id}
                          onClick={() => handleStudentToggle(student.id)}
                          className={`p-2.5 rounded-xl border text-xs cursor-pointer flex justify-start items-center gap-2.5 transition-all ${
                            isChecked 
                              ? "bg-emerald-50/40 border-emerald-400 font-bold text-[#064E3B]" 
                              : "bg-slate-50/80 border-slate-200/60 hover:border-slate-300 text-slate-600"
                          }`}
                        >
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-[#065F46] flex-shrink-0" />
                          ) : (
                            <div className="w-4 h-4 border border-slate-300 rounded flex-shrink-0 bg-white"></div>
                          )}
                          <span className="truncate">{student.name}</span>
                          {student.voiceSampleUrl && (
                            <span className="text-[9px] bg-emerald-50 text-[#064E3B] border border-emerald-100 px-1.5 py-0.2 rounded font-mono font-bold mr-auto">
                              عينة البصمة مقترنة
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Step 2: Audio loading/recording inputs */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4 hover:shadow-xs transition-shadow duration-300">
              <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                <div>
                  <span className="text-[10px] bg-[#D97706] text-white px-2.5 py-0.5 rounded-full font-bold ml-2 shadow-xs">خطوة ٢</span>
                  <h3 className="text-sm font-extrabold text-[#064E3B] inline-block">ملف تسميع التلاوة أو تسجيلها</h3>
                </div>
                
                {/* Mode Selector */}
                <div className="flex bg-slate-100 p-1 rounded-xl text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => setInputMode('upload')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${inputMode === 'upload' ? 'bg-white shadow-xs text-[#064E3B]' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    <Upload className="w-3 h-3 inline ml-1" />
                    رفع ملف صوتي
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputMode('record')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${inputMode === 'record' ? 'bg-white shadow-xs text-[#064E3B]' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    <Mic className="w-3 h-3 inline ml-1" />
                    تسجيل صوتي مباشر
                  </button>
                </div>
              </div>

              {/* File Input upload block */}
              {inputMode === 'upload' ? (
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-3xl p-8 text-center transition-all flex flex-col items-center justify-center cursor-pointer min-h-[160px] ${
                    dragActive 
                      ? "border-[#065F46] bg-emerald-50/10" 
                      : audioBase64 
                      ? "border-emerald-300 bg-[#F8FAFC]" 
                      : "border-slate-200 hover:border-[#065F46] hover:bg-slate-50/30"
                  }`}
                  onClick={() => document.getElementById("session-audio-input")?.click()}
                >
                  <input
                    id="session-audio-input"
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={handleFileInputChange}
                  />
                  
                  {audioBase64 ? (
                    <div className="space-y-2">
                      <div className="bg-emerald-50 text-[#065F46] p-3 rounded-full w-fit mx-auto border border-emerald-100">
                        <FileAudio className="w-7 h-7" />
                      </div>
                      <p className="text-xs font-bold text-slate-700 leading-normal max-w-sm mx-auto truncate font-mono">
                        {audioFileName}
                      </p>
                      <p className="text-[11px] text-[#064E3B] font-bold">جاهز للتحليل. انقر أو اسحب للاستبدال.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="bg-slate-100 text-slate-400 p-3 rounded-full w-fit mx-auto hover:scale-105 transition-all">
                        <Upload className="w-7 h-7 text-[#064E3B]" />
                      </div>
                      <p className="text-xs font-extrabold text-slate-800">اسحب وألقِ هنا ملف تلاوة الحلقة الصوتية أو انقر للاختيار</p>
                      <p className="text-[11px] text-slate-450 leading-relaxed max-w-xs mx-auto">
                        يدعم ملفات مخرجات التلاوة بمختلف صيغها وصوتياتها المجمعة المسجلة من المحمول أو الريكوردر.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                /* Live recording block */
                <div className="border border-slate-200 bg-slate-50 p-6 rounded-3xl text-center space-y-4 flex flex-col items-center transition-all">
                  <div className="space-y-1">
                    <p className="text-xs font-extrabold text-slate-800">اللاقط الرقمي المباشر لحلقة التلاوة</p>
                    <p className="text-[11px] text-slate-400 leading-normal">اضغط لبدء تسجيل حلقة التسميع الجماعية مباشرة، وسيتولى محرك ميزان تقسيم الأصوات بعدها.</p>
                  </div>

                  <div className="flex gap-4 items-center">
                    {!isRecording ? (
                      <button
                        type="button"
                        onClick={startRecording}
                        className="cursor-pointer bg-[#064E3B] hover:bg-[#065F46] text-white rounded-xl px-5 py-2.5 text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-emerald-900/15"
                      >
                        <Mic className="w-3.5 h-3.5 ml-1 animate-pulse" />
                        تشغيل الميكروفون والبدء بالتسجيل الحي
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={stopRecording}
                        className="cursor-pointer bg-red-600 hover:bg-red-700 text-white rounded-xl px-5 py-2.5 text-xs font-bold flex items-center gap-2 transition-all animate-pulse shadow-md"
                      >
                        <Square className="w-3.5 h-3.5 ml-1" />
                        إيقاف التسجيل وحفظ اللقطة ({recDuration} ثانية)
                      </button>
                    )}
                  </div>

                  {audioBase64 && !isRecording && (
                    <div className="p-3 bg-white rounded-2xl border border-slate-200 flex items-center gap-3 w-fit shadow-xs">
                      <div className="text-right">
                        <p className="text-xs font-bold text-slate-700 font-mono truncate max-w-[200px]">{audioFileName}</p>
                        <span className="text-[10px] text-emerald-600 font-bold block pt-0.5">تم الحفظ بنجاح وجاهز للمطابقة</span>
                      </div>
                      <audio src={audioBase64} controls className="h-8 max-w-[150px]" />
                    </div>
                  )}
                </div>
              )}

              {/* Validation Warning Banner */}
              {validationError && (
                <div className="bg-rose-50 border border-rose-250 text-rose-950 p-4 rounded-2xl text-xs font-bold leading-relaxed flex items-start gap-2.5 animate-fade-in my-3 text-right">
                  <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                  <div className="space-y-0.5 w-full">
                    <span className="font-extrabold text-rose-900 block">تنبيه:</span>
                    <p className="font-semibold text-rose-950">{validationError}</p>
                  </div>
                </div>
              )}

              {/* Action trigger button */}
              {audioBase64 && (
                <div className="pt-4 flex justify-center">
                  <button
                    type="button"
                    onClick={triggerAnalyze}
                    className="cursor-pointer bg-[#D97706] hover:bg-[#b45309] active:scale-95 transition-all text-white font-extrabold text-xs px-8 py-3.5 rounded-xl shadow-md flex items-center gap-2"
                  >
                    <Sparkles className="w-4 h-4 text-amber-200" />
                    استخراج الأصوات وتقويم الأداء بالذكاء الاصطناعي
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Right Column: Historical Logs */}
      <div className="space-y-4">
        <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2 px-1 text-right">
          <Star className="w-4 h-4 text-[#D97706] fill-[#D97706]" />
          أرشيف وجدول الحلقات السابقة
        </h3>

        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
          {pastSessions.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 text-center text-slate-400 text-xs">
              لا توجد حلقات سابقة محفوظة في الأرشيف المالي لميزان.
            </div>
          ) : (
            pastSessions.map((session) => {
              const isPendingDelete = sessionIdToDelete === session.id;
              return (
                <div
                  key={session.id}
                  onClick={() => {
                    if (!isPendingDelete) onSelectPastSession(session);
                  }}
                  className={`bg-white rounded-2xl p-4 border transition-all flex flex-col gap-3 relative overflow-hidden text-right ${
                    isPendingDelete
                      ? "border-rose-300 bg-rose-50/20 shadow-xs"
                      : "border-slate-200/80 hover:border-[#065F46]/60 hover:shadow-xs cursor-pointer"
                  }`}
                >
                  {isPendingDelete ? (
                    <div className="space-y-2 text-right w-full font-serif">
                      <p className="text-[11px] font-extrabold text-rose-800">هل تؤكد رغبتك في حذف الحلقة: "{session.title}"؟</p>
                      <div className="flex gap-2 justify-start">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteSession(session.id);
                            setSessionIdToDelete(null);
                          }}
                          className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg cursor-pointer"
                        >
                          نعم، احذف الحلقة
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSessionIdToDelete(null);
                          }}
                          className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-[10px] px-3 py-1.5 rounded-lg cursor-pointer"
                        >
                          إلغاء
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center w-full">
                      <div className="space-y-1 select-none flex-1 truncate">
                        <h4 className="font-extrabold text-xs text-slate-800 hover:text-[#065F46] leading-normal line-clamp-1">
                          {session.title}
                        </h4>
                        <p className="text-[9px] text-slate-400 font-mono">
                          {new Date(session.date).toLocaleDateString("ar-EG")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right flex flex-col items-end gap-1 font-mono text-[10px] text-slate-500">
                          <span className="bg-emerald-50 text-[#064E3B] px-1.5 py-0.5 rounded font-bold">
                            {session.segments.length} تلاوات جماعية
                          </span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSessionIdToDelete(session.id);
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer rounded-lg hover:bg-rose-50 transition-colors"
                          title="حذف الحلقة"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
