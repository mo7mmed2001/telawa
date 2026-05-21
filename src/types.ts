export interface TajweedMistake {
  id: string;
  text: string; // The specific word/phrase with the error, e.g. "أنعمت"
  type: 'تجويد' | 'مخارج' | 'تشكيل' | 'حفظ';
  correction: string; // The correct way to read it
  explanation: string; // Brief rules or details
  teacherCorrectionAudioUrl?: string; // Optional recorded pronunciation corrected by the teacher
}

export interface RecitationSegment {
  id: string;
  startTime: string; // e.g. "0:12"
  endTime: string; // e.g. "0:35"
  transcription: string; // Arabic text of recited verse
  studentId: string; // ID of the mapped student
  studentGuess?: string; // AI's tentative name guess
  surahPage: string; // e.g. "سورة النبأ 1-5"
  mistakes: TajweedMistake[];
  score: number; // 1-10
  grade: 'ممتاز' | 'جيد جداً' | 'جيد' | 'مقبول' | 'بحاجة لمراجعة';
  notes: string; // Feedback from teacher
  audioUrl?: string; // Base64 audio url for specific segment or offset (if sliced)
}

export interface Student {
  id: string;
  name: string;
  voiceSampleUrl?: string; // base64 voice sample (10s)
  voiceSampleDuration?: number;
  registeredAt: string;
  accentNotes?: string; // Notes about voice characteristics (deep, high, child, adult, etc.)
}

export interface Session {
  id: string;
  date: string;
  title: string; // e.g. "حلقة تفسير وتلاوة جزء عمّ"
  audioUrl?: string; // The main group recording
  participants: string[]; // List of Student IDs
  segments: RecitationSegment[];
  notes: string; // General feedback
}

export interface TajweedRuleGuide {
  title: string;
  category: string;
  description: string;
  examples: { text: string; audioText: string }[];
}
