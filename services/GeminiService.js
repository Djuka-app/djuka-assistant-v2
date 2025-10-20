import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = 'AIzaSyCceKXFLYlVR1E7FiIMiFIlSl5uH0Z5KZg';

class GeminiService {
  constructor() {
    this.genAI = null;
    this.model = null;
  }

  initialize() {
    try {
      this.genAI = new GoogleGenerativeAI(API_KEY);
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      console.log('Gemini initialized successfully');
    } catch (error) {
      console.error('Error initializing Gemini:', error);
    }
  }

  async askQuestion(question) {
    try {
      if (!this.model) {
        this.initialize();
      }

      const result = await this.model.generateContent(question);
      const response = await result.response;
      const text = response.text();
      return text;
    } catch (error) {
      console.error('Error asking Gemini:', error);
      throw error;
    }
  }
}

export default new GeminiService();
