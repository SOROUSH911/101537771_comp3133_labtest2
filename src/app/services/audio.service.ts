import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AudioService {
  private sounds: Record<string, HTMLAudioElement> = {};
  private currentBg: HTMLAudioElement | null = null;

  preload() {
    this.sounds['ignition'] = new Audio('assets/sounds/rocket_ignition.wav');
    this.sounds['rumble'] = new Audio('assets/sounds/rocket_rumble.wav');
    this.sounds['engine'] = new Audio('assets/sounds/rocket_engine.wav');
    this.sounds['distant'] = new Audio('assets/sounds/rocket_distant.wav');
    // Preload all
    Object.values(this.sounds).forEach(s => s.load());
  }

  play(name: string, volume = 0.5, loop = false): void {
    const sound = this.sounds[name];
    if (!sound) return;
    sound.volume = volume;
    sound.loop = loop;
    sound.currentTime = 0;
    sound.play().catch(() => {}); // ignore autoplay block
  }

  playBackground(name: string, volume = 0.3): void {
    this.stopBackground();
    const sound = this.sounds[name];
    if (!sound) return;
    this.currentBg = sound;
    sound.volume = volume;
    sound.loop = true;
    sound.currentTime = 0;
    sound.play().catch(() => {});
  }

  stopBackground(): void {
    if (this.currentBg) {
      this.currentBg.pause();
      this.currentBg.currentTime = 0;
      this.currentBg = null;
    }
  }

  stopAll(): void {
    Object.values(this.sounds).forEach(s => { s.pause(); s.currentTime = 0; });
    this.currentBg = null;
  }
}
