
import { GoogleGenAI } from "@google/genai";

/**
 * Refina o relato do usuário e extrai orientações legais.
 */
export const analyzeReportWithIA = async (text: string) => {
  if (!text || text.length < 10) return { refinedText: text, legalAnalysis: "" };

  if (!process.env.API_KEY) {
    console.warn("API_KEY não detectada.");
    return { refinedText: text, legalAnalysis: "" };
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Usamos o Pro para análise complexa de direitos
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Analise este relato de um jovem aprendiz: "${text}"`,
      config: {
        systemInstruction: `Você é um consultor jurídico sênior especializado na Lei do Aprendiz (Lei 10.097/2000). 
        Sua resposta deve ser um JSON estritamente formatado com duas chaves:
        1. "refinedText": O relato reescrito de forma profissional e objetiva para uma denúncia formal.
        2. "legalAnalysis": Um breve resumo (máx 3 parágrafos) citando quais direitos podem estar sendo violados e qual o próximo passo recomendado.
        Não use markdown de bloco de código no JSON.`,
        responseMimeType: "application/json",
        temperature: 0.7,
      },
    });

    try {
      return JSON.parse(response.text || "{}");
    } catch {
      return { refinedText: response.text, legalAnalysis: "Análise técnica indisponível no momento." };
    }
  } catch (error) {
    console.error("Erro Gemini:", error);
    return { refinedText: text, legalAnalysis: "Erro ao processar análise." };
  }
};
