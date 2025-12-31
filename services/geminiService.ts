import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API Key is missing");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const getSheepAdvice = async (query: string): Promise<string> => {
  const ai = getClient();
  if (!ai) return "عذراً، مفتاح API غير متوفر.";

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: query,
      config: {
        systemInstruction: `أنت خبير زراعي وبيطري متخصص في تربية الأغنام والماشية في العالم العربي. 
        أجب على أسئلة المستخدم بوضوح واختصار. قدم نصائح عملية حول التغذية، الصحة، تصميم الحظائر، والتكاثر.
        تحدث باللغة العربية بأسلوب ودود ومحترف.`,
        temperature: 0.7,
      },
    });

    return response.text || "لم أتمكن من الحصول على إجابة، يرجى المحاولة مرة أخرى.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "حدث خطأ أثناء الاتصال بالمستشار الذكي. يرجى التحقق من الاتصال.";
  }
};
