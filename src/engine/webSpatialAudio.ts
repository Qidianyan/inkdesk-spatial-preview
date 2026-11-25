import type { SoundAnchorId, SpatialAudioAnchor } from '../data/artifacts';

interface AnchorAudioNodes {
  panner: PannerNode;
  gainNode: GainNode;
  stopTimers: number[];
}

/**
 * Real WebAudio API 3D HRTF Spatial Audio Synthesizer using PannerNode.
 * Procedurally synthesizes all 4 Eastern study soundscapes so audio works 100% locally offline.
 */
export class WebSpatialSoundscapeEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private nodes = new Map<SoundAnchorId, AnchorAudioNodes>();
  private running = false;

  public isRunning(): boolean {
    return this.running;
  }

  private createNoiseBuffer(ctx: AudioContext, seconds = 3): AudioBuffer {
    const length = ctx.sampleRate * seconds;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      lastOut = (lastOut + 0.03 * white) / 1.03;
      data[i] = lastOut * 2.8;
    }
    return buffer;
  }

  public async start(anchors: SpatialAudioAnchor[], headYawDeg: number): Promise<boolean> {
    if (typeof window === 'undefined' || (!window.AudioContext && !(window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)) {
      return false;
    }
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.55;
      this.masterGain.connect(this.ctx.destination);
      this.buildAllChannels(anchors);
    }
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
    this.running = true;
    this.sync(anchors, headYawDeg);
    return true;
  }

  private buildAllChannels(anchors: SpatialAudioAnchor[]): void {
    if (!this.ctx || !this.masterGain) return;
    const ctx = this.ctx;
    const noiseBuffer = this.createNoiseBuffer(ctx, 4);

    for (const anchor of anchors) {
      const panner = ctx.createPanner();
      panner.panningModel = 'HRTF';
      panner.distanceModel = 'inverse';
      panner.refDistance = 0.7;
      panner.maxDistance = 8;
      panner.rolloffFactor = 1.15;

      const gainNode = ctx.createGain();
      gainNode.gain.value = anchor.enabled ? anchor.gain * 0.45 : 0;
      panner.connect(gainNode);
      gainNode.connect(this.masterGain);

      const stopTimers: number[] = [];

      if (anchor.id === 'PINE_WIND') {
        const src = ctx.createBufferSource();
        src.buffer = noiseBuffer;
        src.loop = true;
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 340;
        filter.Q.value = 1.8;

        const lfo = ctx.createOscillator();
        lfo.frequency.value = 0.14;
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 140;
        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);
        lfo.start();

        src.connect(filter);
        filter.connect(panner);
        src.start();
      } else if (anchor.id === 'EAVES_RAIN') {
        const src = ctx.createBufferSource();
        src.buffer = noiseBuffer;
        src.loop = true;
        const hp = ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 1650;
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 4800;
        const rainGain = ctx.createGain();
        rainGain.gain.value = 0.32;
        src.connect(hp);
        hp.connect(lp);
        lp.connect(rainGain);
        rainGain.connect(panner);
        src.start();
      } else if (anchor.id === 'CHARCOAL_TEA') {
        const src = ctx.createBufferSource();
        src.buffer = noiseBuffer;
        src.loop = true;
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 260;
        const rumble = ctx.createGain();
        rumble.gain.value = 0.52;
        src.connect(lp);
        lp.connect(rumble);
        rumble.connect(panner);
        src.start();

        const crackleTimer = window.setInterval(() => {
          if (!this.running || !this.ctx) return;
          const osc = this.ctx.createOscillator();
          const env = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.value = 820 + Math.random() * 900;
          const now = this.ctx.currentTime;
          env.gain.setValueAtTime(0.0001, now);
          env.gain.exponentialRampToValueAtTime(0.06, now + 0.006);
          env.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);
          osc.connect(env);
          env.connect(panner);
          osc.start(now);
          osc.stop(now + 0.05);
        }, 680);
        stopTimers.push(crackleTimer);
      } else if (anchor.id === 'CHIME_BELLS') {
        const pentatonicHz = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25];
        let step = 0;
        const chimeTimer = window.setInterval(() => {
          if (!this.running || !this.ctx) return;
          const freq = pentatonicHz[step % pentatonicHz.length];
          step += 1;
          const now = this.ctx.currentTime;
          const osc1 = this.ctx.createOscillator();
          const osc2 = this.ctx.createOscillator();
          const env = this.ctx.createGain();
          osc1.type = 'sine';
          osc2.type = 'sine';
          osc1.frequency.value = freq;
          osc2.frequency.value = freq * 2.41;
          env.gain.setValueAtTime(0.0001, now);
          env.gain.linearRampToValueAtTime(0.14, now + 0.03);
          env.gain.exponentialRampToValueAtTime(0.0001, now + 2.4);
          osc1.connect(env);
          osc2.connect(env);
          env.connect(panner);
          osc1.start(now);
          osc2.start(now);
          osc1.stop(now + 2.5);
          osc2.stop(now + 2.5);
        }, 2800);
        stopTimers.push(chimeTimer);
      }

      this.nodes.set(anchor.id, { panner, gainNode, stopTimers });
    }
  }

  public sync(anchors: SpatialAudioAnchor[], headYawDeg: number): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const yawRad = (headYawDeg * Math.PI) / 180;
    const fx = Math.sin(yawRad);
    const fz = -Math.cos(yawRad);
    const listener = this.ctx.listener;
    if (listener.forwardX) {
      listener.forwardX.setTargetAtTime(fx, now, 0.04);
      listener.forwardY.setTargetAtTime(0, now, 0.04);
      listener.forwardZ.setTargetAtTime(fz, now, 0.04);
      listener.upX.setTargetAtTime(0, now, 0.04);
      listener.upY.setTargetAtTime(1, now, 0.04);
      listener.upZ.setTargetAtTime(0, now, 0.04);
    }

    for (const anchor of anchors) {
      const channel = this.nodes.get(anchor.id);
      if (!channel) continue;
      channel.panner.positionX.setTargetAtTime(anchor.positionMeters.x, now, 0.05);
      channel.panner.positionY.setTargetAtTime(anchor.positionMeters.y, now, 0.05);
      channel.panner.positionZ.setTargetAtTime(anchor.positionMeters.z, now, 0.05);
      const targetGain = this.running && anchor.enabled ? anchor.gain * 0.45 : 0;
      channel.gainNode.gain.setTargetAtTime(targetGain, now, 0.06);
    }
  }

  public stop(): void {
    this.running = false;
    if (this.ctx) {
      const now = this.ctx.currentTime;
      for (const ch of this.nodes.values()) {
        ch.gainNode.gain.setTargetAtTime(0, now, 0.05);
      }
    }
  }

  public dispose(): void {
    this.running = false;
    for (const ch of this.nodes.values()) {
      ch.stopTimers.forEach((id) => window.clearInterval(id));
    }
    this.nodes.clear();
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
  }
}
