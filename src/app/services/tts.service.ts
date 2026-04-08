import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class TtsService {
  private synth = window.speechSynthesis;
  readonly enabled = signal(true);
  private preferredVoices = [
    'Google UK English Female',
    'Google US English',
    'Samantha',
    'Karen',
    'Microsoft Zira',
  ];

  private getVoice(): SpeechSynthesisVoice | null {
    const voices = this.synth.getVoices();
    for (const name of this.preferredVoices) {
      const match = voices.find(v => v.name.includes(name));
      if (match) return match;
    }
    return voices.find(v => v.lang.startsWith('en')) || voices[0] || null;
  }

  toggle(): void {
    this.enabled.set(!this.enabled());
    if (!this.enabled()) this.stop();
  }

  speak(text: string): void {
    if (!this.enabled()) return;
    this.synth.cancel();
    const trySpeak = () => {
      const utterance = new SpeechSynthesisUtterance(text);
      const voice = this.getVoice();
      if (voice) utterance.voice = voice;
      utterance.rate = 0.92;
      utterance.pitch = 1.0;
      utterance.volume = 0.85;
      this.synth.speak(utterance);
    };
    if (this.synth.getVoices().length > 0) {
      trySpeak();
    } else {
      this.synth.onvoiceschanged = () => trySpeak();
    }
  }

  stop(): void {
    this.synth.cancel();
  }

  narrateMission(launch: {
    name: string;
    date_utc: string;
    success: boolean | null;
    upcoming: boolean;
    details: string | null;
  }, rocketName: string): void {
    const date = new Date(launch.date_utc).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
    const status = launch.upcoming ? 'upcoming'
      : launch.success === true ? 'successful'
      : launch.success === false ? 'unsuccessful' : 'status unknown';

    let text = `Mission ${launch.name}. `;
    text += `Launched on ${date}, using the ${rocketName} rocket. `;
    text += `The launch was ${status}. `;
    if (launch.details) {
      // Limit to first 2 sentences for brevity
      const sentences = launch.details.split('. ').slice(0, 2).join('. ');
      text += sentences + '.';
    }
    this.speak(text);
  }
}
