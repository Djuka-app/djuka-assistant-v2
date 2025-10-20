import Voice from '@react-native-voice/voice';

class VoiceService {
  constructor() {
    this.isListening = false;
  }

  async startListening(onResult, onError) {
    try {
      Voice.onSpeechResults = (event) => {
        const text = event.value[0];
        onResult(text);
      };

      Voice.onSpeechError = (error) => {
        onError(error);
      };

      await Voice.start('sr-RS');
      this.isListening = true;
    } catch (error) {
      console.error('Error starting voice:', error);
      onError(error);
    }
  }

  async stopListening() {
    try {
      await Voice.stop();
      this.isListening = false;
    } catch (error) {
      console.error('Error stopping voice:', error);
    }
  }

  async destroy() {
    try {
      await Voice.destroy();
      Voice.removeAllListeners();
    } catch (error) {
      console.error('Error destroying voice:', error);
    }
  }
}

export default new VoiceService();
