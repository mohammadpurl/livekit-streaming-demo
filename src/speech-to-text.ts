import type {
  SpeechRecognition,
  SpeechRecognitionEvent,
  SpeechRecognitionErrorEvent
} from './types/speech-recognition';

export class SpeechToText {
  private recognition: SpeechRecognition | null = null;
  private isListening: boolean = false;
  private finalTranscript: string = '';
  private silenceTimer: number | null = null;
  private readonly silenceThreshold = 2000; // 2 seconds of silence
  private onSpeechEnd: (text: string) => void;
  private language: string;

  constructor(onSpeechEnd: (text: string) => void, language: string = 'en-US') {
    this.onSpeechEnd = onSpeechEnd;
    this.language = language;
    
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window.SpeechRecognition || window.webkitSpeechRecognition) as new () => SpeechRecognition;
      this.recognition = new SpeechRecognition();
      this.setupRecognition();
    } else {
      console.error('Speech recognition not supported in this browser');
    }
  }

  private setupRecognition() {
    if (!this.recognition) return;

    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = this.language;

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          this.finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      // Reset silence timer when speech is detected
      this.resetSilenceTimer();
    };

    this.recognition.onend = () => {
      if (this.isListening) {
        this.recognition?.start();
      }
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      this.stop();
    };
  }

  private resetSilenceTimer() {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
    }

    this.silenceTimer = window.setTimeout(() => {
      if (this.finalTranscript.trim()) {
        this.onSpeechEnd(this.finalTranscript.trim());
        this.finalTranscript = '';
      }
    }, this.silenceThreshold);
  }

  public start() {
    if (!this.recognition) return;
    
    this.isListening = true;
    this.finalTranscript = '';
    this.recognition.start();
  }

  public stop() {
    if (!this.recognition) return;
    
    this.isListening = false;
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
    }
    this.recognition.stop();
  }

  public setLanguage(language: string) {
    this.language = language;
    if (this.recognition) {
      this.recognition.lang = language;
    }
  }
} 