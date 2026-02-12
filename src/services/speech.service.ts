import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SpeechService {
  isListening = signal(false);
  
  private recognition: any;
  private synthesis: SpeechSynthesis;

  constructor() {
    this.synthesis = window.speechSynthesis;
    
    if ('webkitSpeechRecognition' in window) {
      // @ts-ignore
      this.recognition = new webkitSpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = 'en-US';
    }
  }

  speak(text: string, pitch: number = 1.2, rate: number = 0.9) {
    if (!this.synthesis) return;
    
    // Cancel any current speaking
    this.synthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.pitch = pitch; // Higher pitch for child
    utterance.rate = rate; // Slower rate for child
    
    // Try to find a female voice which often sounds more child-like when pitched up
    const voices = this.synthesis.getVoices();
    const preferredVoice = voices.find(v => v.name.includes('Female') || v.name.includes('Google US English'));
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    this.synthesis.speak(utterance);
  }

  listen(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.recognition) {
        reject('Speech recognition not supported');
        return;
      }

      this.isListening.set(true);

      this.recognition.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        this.isListening.set(false);
        resolve(text);
      };

      this.recognition.onerror = (event: any) => {
        this.isListening.set(false);
        reject(event.error);
      };

      this.recognition.onend = () => {
        this.isListening.set(false);
      };

      this.recognition.start();
    });
  }
}
