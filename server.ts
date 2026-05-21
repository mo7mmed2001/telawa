import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Increase request size limit to handle large audio base64 uploads
app.use(express.json({ limit: "60mb" }));
app.use(express.urlencoded({ extended: true, limit: "60mb" }));

// Lazy initializer for Google Gemini API Client
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not defined. Please set it in Settings > Secrets.");
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// REST API Endpoints

// 1. Heatlh check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// 2. Main audio transcription, segmentation and Tajweed evaluation proxy endpoint
app.post("/api/analyze-recitation", async (req, res) => {
  try {
    const { groupAudioBase64, mimeType, students } = req.body;

    if (!groupAudioBase64) {
      return res.status(400).json({ error: "Missing group audio dataset." });
    }

    const ai = getGeminiClient();

    // Prepare contents array for Gemini
    const contents: any[] = [];

    // Add student voice samples to the context (if they have voice samples)
    if (students && Array.isArray(students)) {
      students.forEach((student: any) => {
        if (student.voiceSampleUrl && student.voiceSampleUrl.includes("base64,")) {
          const base64Data = student.voiceSampleUrl.split("base64,")[1];
          // We attach the student voice sample as a reference part with a naming instruction
          contents.push({
            inlineData: {
              mimeType: "audio/webm", // default recorded format
              data: base64Data
            }
          });
          contents.push({
            text: `هذا الملف الصوتي المرفق أعلاه هو عينة الصوت المرجعية للاسم: "${student.name}" (ID: ${student.id}). انتبه لبصمة صوته ونبرته لمطابقتها لاحقاً.`
          });
        }
      });
    }

    // Now add the main meeting group recitation audio
    const mainAudioData = groupAudioBase64.includes("base64,") 
      ? groupAudioBase64.split("base64,")[1] 
      : groupAudioBase64;

    contents.push({
      inlineData: {
        mimeType: mimeType || "audio/webm",
        data: mainAudioData
      }
    });

    const studentsTextList = students && Array.isArray(students)
      ? students.map((s: any) => `- اسم الطالب: "${s.name}" (ID الخاص به: ${s.id})`).join("\n")
      : "لم يتم تقديم قائمة مسبقة بالطلاب.";

    contents.push({
      text: `أنت معلم قرآن وخبير تجويد وصوتيات فذّ.
لقد تم تزويدك بملف صوتي جماعي يحتوي على تسجيل مجمع تلا فيه الطلاب القرآن الكريم بالتتابع أو التناوب في حلقة قرآنية جماعية.
مهمتك تنقسم للتالي:
1. قسّم الملف الصوتي الجماعي إلى مقاطع (segments) عند كل تلاوة طالب جديد وتحديد البداية والنهاية التقريبية لكل مقطع بالثواني (مثال: من 0:02 إلى 0:18).
2. مطابقة صوت القارئ في كل مقطع مع قائمة الطلاب المتواجدين وأي عينات صوتية مرفقة لهم لتحدد من الذي كان يقرأ.
3. تفريغ التلاوة القرآنية في كل مقطع تفريغاً دقيقاً وحرفياً بالرسم العثماني أو مع التشكيل الكامل وضبط الحركات (تشكيل الحروف).
4. استخراج الأخطاء بالتفصيل إن وجدت، مع تصنيفها إلى:
   - 'تجويد' (أحكام النون الساكنة والمد والغنة والقلقلة وغيرها)
   - 'مخارج' (مخارج الحروف ونطق أحرف من غير مخرجها الصحيح)
   - 'تشكيل' (أخطاء الحركات الإعرابية واللحن الجلي)
   - 'حفظ' (تسميع خاطئ، سقطة، أو زيادة كلمة)
5. إعطاء درجة تقييم لكل مقطع/طالب من 10، وتحديد تقدير مناسب باللغة العربية (ممتاز، جيد جداً، جيد، مقبول، بحاجة لمراجعة) مع نصيحة تربوية واضحة لتصحيح الخطأ.

قائمة الطلاب المتواجدين في الحلقة لتطابق التلاوة معهم:
${studentsTextList}

الرجاء مراعاة الدقة البالغة في التمييز بين الأخطاء لتصحيح تلاوة الطالب بشكل يساعده على التقدم.
يجب إرجاع النتيجة حصراً بصيغة JSON وفق البنية التالية دون أي نصوص إضافية خارج الـ JSON لتفادي أخطاء التحليل.`
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["segments", "generalFeedback"],
          properties: {
            segments: {
              type: Type.ARRAY,
              description: "List of identified recitation segments in the audio.",
              items: {
                type: Type.OBJECT,
                required: ["segmentIndex", "startTime", "endTime", "transcription", "studentId", "surahPage", "mistakes", "evaluation"],
                properties: {
                  segmentIndex: { type: Type.INTEGER },
                  startTime: { type: Type.STRING, description: "Start timestamp, e.g. '0:03' or '0:15'" },
                  endTime: { type: Type.STRING, description: "End timestamp, e.g. '0:12' or '0:34'" },
                  transcription: { type: Type.STRING, description: "The full Quranic text read verbatim with correct Arabic diacritics." },
                  studentId: { type: Type.STRING, description: "The ID of the identified student from the list. If unsure, match to the closest student or use the ID of the student with the most similar voice sample." },
                  surahPage: { type: Type.STRING, description: "The name of the Surah and verses read, e.g. 'سورة النبأ 1-5'" },
                  mistakes: {
                    type: Type.ARRAY,
                    description: "List of pronunciation, tajweed or memorization errors detected.",
                    items: {
                      type: Type.OBJECT,
                      required: ["text", "type", "correction", "explanation"],
                      properties: {
                        text: { type: Type.STRING, description: "The specific word or segment where the mistake happened" },
                        type: { 
                          type: Type.STRING, 
                          description: "Mistake type: 'تجويد' or 'مخارج' or 'تشكيل' or 'حفظ'" 
                        },
                        correction: { type: Type.STRING, description: "The correct way or pronunciation" },
                        explanation: { type: Type.STRING, description: "Brief details on what was wrong in Arabic" }
                      }
                    }
                  },
                  evaluation: {
                    type: Type.OBJECT,
                    required: ["score", "grade", "teacherNotes"],
                    properties: {
                      score: { type: Type.INTEGER, description: "Score out of 10" },
                      grade: { type: Type.STRING, description: "One of 'ممتاز' | 'جيد جداً' | 'جيد' | 'مقبول' | 'بحاجة لمراجعة'" },
                      teacherNotes: { type: Type.STRING, description: "Pedagogical Arabic feedback" }
                    }
                  }
                }
              }
            },
            generalFeedback: { type: Type.STRING, description: "A general warm Arabic word of feedback for the whole group" }
          }
        }
      }
    });

    const resultText = response.text;
    res.json(JSON.parse(resultText));

  } catch (error: any) {
    console.error("Gemini recitation analysis failed:", error);
    res.status(500).json({ error: error.message || "فشلت عملية تحليل التلاوة وتقييم الطلاب." });
  }
});

// Configure Vite or Serve SPA Assets
async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express server is listending on http://0.0.0.0:${PORT}`);
  });
}

start();
