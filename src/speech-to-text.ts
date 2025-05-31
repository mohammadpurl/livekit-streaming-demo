interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: (event: SpeechRecognitionEvent) => void;
  onend: () => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  start: () => void;
  stop: () => void;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }
}

export class SpeechToText {
  private recognition: SpeechRecognition | null = null;
  private isListening: boolean = false;
  private finalTranscript: string = '';
  private silenceTimer: number | null = null;
  private readonly silenceThreshold = 2000; // 2 seconds of silence
  private speechOutput: HTMLElement;

  constructor(
    private onSpeechEnd: (text: string) => void,
    private language: string = 'en-US'
  ) {
    this.speechOutput = document.getElementById('speechOutput') as HTMLElement;
    
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
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
          this.finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      // Update the display
      if (finalTranscript) {
        const finalSpan = document.createElement('span');
        finalSpan.textContent = finalTranscript;
        finalSpan.className = 'final';
        this.speechOutput.appendChild(finalSpan);
      }
      if (interimTranscript) {
        const interimSpan = document.createElement('span');
        interimSpan.textContent = interimTranscript;
        interimSpan.className = 'interim';
        this.speechOutput.appendChild(interimSpan);
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
        // Clear interim results
        const interimElements = this.speechOutput.getElementsByClassName('interim');
        while (interimElements.length > 0) {
          interimElements[0].remove();
        }
      }
    }, this.silenceThreshold);
  }

  public start() {
    if (!this.recognition) return;
    
    this.isListening = true;
    this.finalTranscript = '';
    this.speechOutput.innerHTML = ''; // Clear previous output
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