import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SoundService {
  // Using short reliable sound effects from standard open sources or synthesis where applicable
  private sounds: { [key: string]: HTMLAudioElement } = {};

  constructor() {
    // Note: In a real app, host these files locally. Using generic placeholder URLs for the example.
    // If these fail to load due to CORS or downtime, the error is caught silently.
    try {
        this.sounds['pop'] = new Audio('https://codeskulptor-demos.commondatastorage.googleapis.com/pang/pop.mp3');
        this.sounds['ding'] = new Audio('https://codeskulptor-demos.commondatastorage.googleapis.com/GalaxyInvaders/pause.wav');
        this.sounds['giggle'] = new Audio('https://codeskulptor-demos.commondatastorage.googleapis.com/GalaxyInvaders/bonus.wav'); // High pitch sound acting as giggle
        // New sounds
        this.sounds['cry'] = new Audio('https://commondatastorage.googleapis.com/codeskulptor-assets/week7-brrring.m4a'); // Annoying buzz for tantrum
        this.sounds['play'] = new Audio('https://commondatastorage.googleapis.com/codeskulptor-assets/week7-bounce.m4a'); // Bouncy sound for playing
    } catch (e) {
        console.warn('Audio setup failed', e);
    }
  }

  play(effect: 'pop' | 'ding' | 'giggle' | 'cry' | 'play') {
    const audio = this.sounds[effect];
    if (audio) {
      audio.currentTime = 0;
      audio.volume = 0.5;
      audio.play().catch(() => {}); // Auto-play policies often block without interaction
    }
  }
}