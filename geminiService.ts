
import { GoogleGenAI } from "@google/genai";

export const refineReportDescription = async (text: string): Promise<string> => {
  if (!text || text.length < 10) return text;

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    Você é um assistente jurídico especializado em direitos do trabalho. 
    O texto a seguir é um relato de um jovem aprendiz sobre uma situação no trabalho. 
    Sua tarefa é REESCREVER o texto para torná-lo mais claro, objetivo e formal para uma denúncia oficial ao Ministério do Trabalho, sem alterar os fatos relatados.
    
    Texto original: "${text}"
    
    Retorne APENAS o texto refinado, sem introduções ou explicações.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: prompt
  });

  return response.text || text;
};
