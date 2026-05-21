import React from "react";
import { Student, Session, TajweedMistake } from "../types";
import { Users, BookOpen, Clock, Award, Star, AlertTriangle, Calendar, ChevronRight } from "lucide-react";

interface DashboardProps {
  students: Student[];
  sessions: Session[];
  onNavigateToTab: (tab: string) => void;
  onSelectedSession: (session: Session) => void;
}

export default function Dashboard({ students, sessions, onNavigateToTab, onSelectedSession }: DashboardProps) {
  // Compute analytics
  const totalStudents = students.length;
  const totalSessions = sessions.length;

  // Average score compilation
  let allScores: number[] = [];
  let mistakesList: TajweedMistake[] = [];

  sessions.forEach(s => {
    s.segments.forEach(seg => {
      allScores.push(seg.score);
      mistakesList.push(...seg.mistakes);
    });
  });

  const avgScore = allScores.length 
    ? (allScores.reduce((prev, curr) => prev + curr, 0) / allScores.length).toFixed(1) 
    : "0.0";

  // Compute common mistake categories
  const mistakeCountByType = mistakesList.reduce((acc, m) => {
    acc[m.type] = (acc[m.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const commonMistakes = Object.entries(mistakeCountByType)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-6 animate-fade-in" id="dashboard-container">
      {/* Welcome Banner */}
      <div className="bg-[#064E3B] text-slate-100 rounded-3xl p-6 md:p-8 shadow-md relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center border border-[#043427]">
        <div className="absolute right-0 top-0 opacity-15 pointer-events-none transform translate-x-12 -translate-y-12">
          {/* Islamic geometric shape representation */}
          <div className="w-96 h-96 rounded-full border-8 border-white p-12">
            <div className="w-full h-full border-4 border-dashed border-white rounded-full"></div>
          </div>
        </div>
        <div className="z-10 space-y-2">
          <span className="bg-[#065F46] text-emerald-250 font-mono text-[10px] px-3 py-1 rounded-full uppercase tracking-wider font-bold">
            البوابة الرقمية الموحدة للمحفظين
          </span>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight">مرحباً بك يا فضيلة الشيخ في لوحة الترتيل</h2>
          <p className="text-emerald-100/90 text-xs md:text-sm max-w-xl font-light leading-relaxed">
            منصة متكاملة لتوجيه حلقات الطلاب الجماعية، وتفريغ مخارج الحروف بالذكاء الاصطناعي، والاحتفاظ بالسجلات المترابطة تلقائياً.
          </p>
        </div>
        <div className="z-10 mt-5 md:mt-0 flex gap-3 w-full md:w-auto">
          <button 
            id="start-session-btn"
            onClick={() => onNavigateToTab("sessions")}
            className="cursor-pointer bg-[#D97706] hover:bg-[#b45309] active:scale-95 transition-all text-white font-bold px-5 py-2.5 rounded-xl shadow-md flex items-center justify-center gap-2 text-xs flex-1 md:flex-initial"
          >
            <Clock className="w-4 h-4 ml-1.5" />
            تفعيل حلقة اليوم الصوتية
          </button>
          <button 
            id="manage-students-btn"
            onClick={() => onNavigateToTab("students")}
            className="cursor-pointer bg-[#065F46] hover:bg-[#077455] active:scale-95 transition-all text-emerald-100 px-5 py-2.5 rounded-xl border border-emerald-500/20 flex items-center justify-center gap-2 text-xs flex-1 md:flex-initial"
          >
            <Users className="w-4 h-4 ml-1.5" />
            سجل الطلاب والتقارير
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between hover:shadow-sm hover:border-[#065F46]/40 transition-all duration-300">
          <div className="space-y-1">
            <span className="text-slate-500 text-[11px] md:text-xs font-semibold">الطلاب المقيدون</span>
            <p className="text-xl md:text-2xl font-black text-slate-900 leading-none">{totalStudents}</p>
          </div>
          <div className="bg-emerald-50 text-[#065F46] p-3 rounded-xl">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between hover:shadow-sm hover:border-[#065F46]/40 transition-all duration-300">
          <div className="space-y-1">
            <span className="text-slate-500 text-[11px] md:text-xs font-semibold">حلقات مراجعة</span>
            <p className="text-xl md:text-2xl font-black text-slate-900 leading-none">{totalSessions}</p>
          </div>
          <div className="bg-amber-50 text-[#D97706] p-3 rounded-xl">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between hover:shadow-sm hover:border-[#065F46]/40 transition-all duration-300">
          <div className="space-y-1">
            <span className="text-slate-500 text-[11px] md:text-xs font-semibold">التقييم العام</span>
            <p className="text-xl md:text-2xl font-black text-[#065F46] leading-none">{avgScore} <span className="text-[11px] text-slate-400 font-normal">/١٠</span></p>
          </div>
          <div className="bg-emerald-550/10 text-[#065F46] p-3 rounded-xl">
            <Award className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between hover:shadow-sm hover:border-[#065F46]/40 transition-all duration-300">
          <div className="space-y-1">
            <span className="text-slate-500 text-[11px] md:text-xs font-semibold">أخطاء متداركة</span>
            <p className="text-xl md:text-2xl font-black text-rose-600 leading-none">{mistakesList.length}</p>
          </div>
          <div className="bg-rose-50 text-rose-750 p-3 rounded-xl">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Sections Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-slate-800">
        {/* Left column: Recent Sessions */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#064E3B]" />
              آخر الحلقات والدروس المكتملة
            </h3>
            <button 
              onClick={() => onNavigateToTab("sessions")} 
              className="text-[#064E3B] hover:text-[#065F46] text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              جميع الحلقات <ChevronRight className="w-3.5 h-3.5 transform rotate-180" />
            </button>
          </div>

          <div className="space-y-3">
            {sessions.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 border border-dashed border-slate-200 text-center text-slate-400">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30 text-[#064E3B]" />
                <p className="text-sm">لم يتم تسجيل أي حلقات حتى الآن.</p>
                <button 
                  onClick={() => onNavigateToTab("sessions")}
                  className="mt-3 bg-emerald-50 text-[#064E3B] text-xs font-bold px-4 py-2 rounded-xl hover:bg-emerald-100 transition-colors cursor-pointer"
                >
                  سجل أول حلقة تلاوة
                </button>
              </div>
            ) : (
              sessions.slice(0, 3).map((session) => {
                const dateFormatted = new Date(session.date).toLocaleDateString("ar-EG", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                });
                return (
                  <div
                    key={session.id}
                    className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-[#065F46]/60 hover:shadow-sm transition-all duration-300 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 cursor-pointer"
                    onClick={() => onSelectedSession(session)}
                  >
                    <div className="space-y-1.5 flex-1">
                      <h4 className="font-extrabold text-[#064E3B] hover:text-[#065F46] transition-colors text-sm">
                        {session.title}
                      </h4>
                      <p className="text-[10px] text-slate-500 font-mono flex items-center gap-2">
                        <span>{dateFormatted}</span>
                        <span>•</span>
                        <span className="bg-emerald-50 text-[#064E3B] px-1.5 py-0.2 rounded">حضور: {session.participants.length} طلاب</span>
                      </p>
                      {session.notes && (
                        <p className="text-xs text-slate-600 line-clamp-1 italic bg-slate-50 p-2 rounded-lg border border-slate-100 mt-1">
                          " {session.notes} "
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                      <div className="flex gap-1.5 flex-wrap">
                        {session.segments.slice(0, 3).map((seg, idx) => {
                          const sName = students.find(st => st.id === seg.studentId)?.name || "طالب";
                          return (
                            <span 
                              key={idx} 
                              className="text-[10px] bg-slate-50 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-md"
                            >
                              {sName.split(" ")[0]}
                            </span>
                          );
                        })}
                        {session.segments.length > 3 && (
                          <span className="text-[10px] bg-amber-50 text-[#D97706] px-1.5 py-0.5 rounded-md font-mono">
                            +{session.segments.length - 3}
                          </span>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 transform rotate-180 hidden md:block" />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right column: Tajweed Focus & Common Mistakes */}
        <div className="space-y-4">
          <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2 px-1">
            <Star className="w-4 h-4 text-[#D97706] fill-[#D97706]" />
            تحليل أداء الحلقة والمستويات
          </h3>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
            <h4 className="text-xs font-bold text-slate-800 border-b border-slate-100 pb-2">تفصيل الأخطاء الأكثر رصداً وتكراراً</h4>
            {commonMistakes.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">لا تتوفر إحصائيات كافية للأخطاء بعد.</p>
            ) : (
              <div className="space-y-3">
                {commonMistakes.map(({ type, count }) => {
                  const percentage = Math.min(100, Math.round((count / mistakesList.length) * 100));
                  let colorClass = "bg-rose-500";
                  if (type === "تجويد") colorClass = "bg-[#D97706]";
                  if (type === "مخارج") colorClass = "bg-[#065F46]";
                  if (type === "تشكيل") colorClass = "bg-indigo-600";

                  return (
                    <div key={type} className="space-y-1">
                      <div className="flex justify-between text-[11px] font-bold">
                        <span className="text-slate-700">خطأ {type}</span>
                        <span className="text-slate-500 font-mono">{count} مكرر ({percentage}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div className={`h-full ${colorClass} rounded-full transition-all duration-500`} style={{ width: `${percentage}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-amber-50/70 rounded-2xl p-5 border border-amber-200/60 space-y-3">
            <div className="flex items-center gap-2 text-[#D97706]">
              <BookOpen className="w-4 h-4" />
              <h4 className="text-xs font-extrabold">تنبيه ومساعدة التمكين للمعلم</h4>
            </div>
            <p className="text-xs text-amber-900 leading-relaxed font-light">
              لتسهيل الربط الصوتي وتفريغ الكلمات بدقة، احرص على استخدام ميزة تفويض الأصوات (Voice Samples) من إعدادات الطالب. يساعد تطبيق ميزان في توثيق الحضور تلقائياً بمجرد سماع نبرات أصواتهم المحفوظة.
            </p>
            <button
              onClick={() => onNavigateToTab("guide")}
              className="text-xs font-bold text-[#D97706] hover:text-[#b45309] underline block cursor-pointer"
            >
              عرض دليل موازين أحكام التجويد المتكامل ←
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
