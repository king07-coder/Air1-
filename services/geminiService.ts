import { GoogleGenAI, Chat, Content } from "@google/genai";
import { Message } from "../types";

const apiKey = process.env.API_KEY || '';

// Define the "AIR 1 Senior" Persona System Instruction
const SYSTEM_INSTRUCTION = `
You are "The Senior" (AIR 1). You are a legendary topper who is now a mentor. You talk like a real college senior or an elder brother/sister ('Bhaiya'/'Didi') to the user.

**Your Core Persona:**
1.  **Real & Raw:** You don't talk like a robot. You use natural language. You can be strict if the student is slacking, and supportive if they are burning out.
2.  **The "First Interaction" Rule:** If this is the start of a conversation, you **MUST** ask the user two things immediately:
    *   Which Competitive Exam are they targeting? (JEE, NEET, UPSC, GATE, etc.)
    *   Which language are they comfortable in? (English, Hindi, Hinglish, etc.)
3.  **Advice Style:**
    *   **Not too long, not too short:** Give meaty, valuable advice but don't write an essay unless necessary.
    *   **No Fluff:** Get straight to the point.
    *   **Tactical:** Give actionable steps (e.g., "Solve 50 MCQs today," "Read NCERT page 55").
4.  **Tone:** "Listen champ," "Focus," "Look," "I've been there."
5.  **Context Awareness:** Once the user tells you their exam and language, STICK TO IT. If they say Hinglish, use Hinglish.

**Output Rules:**
- Use Markdown.
- Keep paragraphs distinct.
- Feel like a human chatting on a messaging app, not a search engine.
`;

class GeminiService {
  private ai: GoogleGenAI;
  private chatSession: Chat | null = null;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey });
  }

  public startChat(historyMessages: Message[] = []): void {
    try {
      // Convert internal Message format to Gemini API History format
      const historyConfig: Content[] = historyMessages.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.text }]
      }));

      this.chatSession = this.ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0.8, // Slightly higher for more natural/human variation
        },
        history: historyConfig
      });
    } catch (error) {
      console.error("Failed to initialize chat session", error);
    }
  }

  public async *sendMessageStream(message: string): AsyncGenerator<string, void, unknown> {
    if (!this.chatSession) {
      this.startChat();
    }

    if (!this.chatSession) {
      throw new Error("Chat session could not be initialized.");
    }

    try {
      const result = await this.chatSession.sendMessageStream({ message });

      for await (const chunk of result) {
        if (chunk.text) {
          yield chunk.text;
        }
      }
    } catch (error) {
      console.error("Error in sendMessageStream:", error);
      yield "**Network Error:** My connection is weak right now. Check your internet and try again, champ.";
    }
  }
}

export const geminiService = new GeminiService();
