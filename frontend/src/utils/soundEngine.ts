class SoundEngine {
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private musicGain: GainNode | null = null
  private sfxGain: GainNode | null = null
  private musicOscillators: OscillatorNode[] = []
  private musicTimeout: ReturnType<typeof setTimeout> | null = null
  private musicPlaying = false
  private muted = false

  init() {
    if (this.ctx) return
    this.ctx = new AudioContext()
    this.masterGain = this.ctx.createGain()
    this.masterGain.gain.value = 1.0
    this.masterGain.connect(this.ctx.destination)

    this.musicGain = this.ctx.createGain()
    this.musicGain.gain.value = 0.15
    this.musicGain.connect(this.masterGain)

    this.sfxGain = this.ctx.createGain()
    this.sfxGain.gain.value = 0.6
    this.sfxGain.connect(this.masterGain)
  }

  private ensureRunning() {
    if (this.ctx?.state === 'suspended') {
      this.ctx.resume()
    }
  }

  playRatCaught() {
    if (!this.ctx || !this.sfxGain) return
    this.ensureRunning()
    const now = this.ctx.currentTime
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(600, now)
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.2)
    gain.gain.setValueAtTime(0.4, now)
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2)
    osc.connect(gain)
    gain.connect(this.sfxGain)
    osc.start(now)
    osc.stop(now + 0.2)
  }

  playBloomStage(stage: number) {
    if (!this.ctx || !this.sfxGain) return
    this.ensureRunning()
    const now = this.ctx.currentTime
    // Pentatonic scale: C5, D5, E5, G5, A5
    const notes = [523.25, 587.33, 659.25, 783.99, 880.00]
    const freq = notes[Math.min(stage - 1, notes.length - 1)] || notes[0]

    // Main chime
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(freq, now)
    gain.gain.setValueAtTime(0.3, now)
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4)
    osc.connect(gain)
    gain.connect(this.sfxGain)
    osc.start(now)
    osc.stop(now + 0.4)

    // Sparkle overtone
    const osc2 = this.ctx.createOscillator()
    const gain2 = this.ctx.createGain()
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(freq * 2, now + 0.05)
    gain2.gain.setValueAtTime(0.15, now + 0.05)
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.35)
    osc2.connect(gain2)
    gain2.connect(this.sfxGain)
    osc2.start(now + 0.05)
    osc2.stop(now + 0.35)
  }

  playRatSpawn() {
    if (!this.ctx || !this.sfxGain) return
    this.ensureRunning()
    const now = this.ctx.currentTime
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = 'square'
    osc.frequency.setValueAtTime(200, now)
    osc.frequency.exponentialRampToValueAtTime(350, now + 0.12)
    gain.gain.setValueAtTime(0.08, now)
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12)
    osc.connect(gain)
    gain.connect(this.sfxGain)
    osc.start(now)
    osc.stop(now + 0.12)
  }

  playVictory() {
    if (!this.ctx || !this.sfxGain) return
    this.ensureRunning()
    const now = this.ctx.currentTime
    // Ascending major chord arpeggio: C5, E5, G5, C6
    const notes = [523.25, 659.25, 783.99, 1046.50]
    notes.forEach((freq, i) => {
      const t = now + i * 0.15
      const osc = this.ctx!.createOscillator()
      const gain = this.ctx!.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(freq, t)
      gain.gain.setValueAtTime(0.35, t)
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.6)
      osc.connect(gain)
      gain.connect(this.sfxGain!)
      osc.start(t)
      osc.stop(t + 0.6)
    })
  }

  playDefeat() {
    if (!this.ctx || !this.sfxGain) return
    this.ensureRunning()
    const now = this.ctx.currentTime
    // Descending sad tones: A4, G4, E4, C4
    const notes = [440, 392, 329.63, 261.63]
    notes.forEach((freq, i) => {
      const t = now + i * 0.15
      const osc = this.ctx!.createOscillator()
      const gain = this.ctx!.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, t)
      gain.gain.setValueAtTime(0.3, t)
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.5)
      osc.connect(gain)
      gain.connect(this.sfxGain!)
      osc.start(t)
      osc.stop(t + 0.5)
    })
  }

  startMusic() {
    if (!this.ctx || !this.musicGain || this.musicPlaying) return
    this.ensureRunning()
    this.musicPlaying = true
    this.playMusicLoop()
  }

  private playMusicLoop() {
    if (!this.ctx || !this.musicGain || !this.musicPlaying) return

    const now = this.ctx.currentTime
    // 2-bar pentatonic melody, staccato chiptune feel
    // C5, E5, G5, A5, G5, E5, D5, C5, D5, E5, G5, A5, G5, E5, D5, C5
    const melody = [
      523.25, 659.25, 783.99, 880.00, 783.99, 659.25, 587.33, 523.25,
      587.33, 659.25, 783.99, 880.00, 783.99, 659.25, 587.33, 523.25,
    ]
    const noteLength = 0.12
    const noteGap = 0.18 // total beat = 0.30s
    const totalDuration = melody.length * (noteLength + noteGap)

    const oscs: OscillatorNode[] = []
    melody.forEach((freq, i) => {
      const t = now + i * (noteLength + noteGap)
      const osc = this.ctx!.createOscillator()
      const gain = this.ctx!.createGain()
      osc.type = 'square'
      osc.frequency.setValueAtTime(freq, t)
      gain.gain.setValueAtTime(0.25, t)
      gain.gain.setValueAtTime(0.25, t + noteLength * 0.8)
      gain.gain.exponentialRampToValueAtTime(0.01, t + noteLength)
      osc.connect(gain)
      gain.connect(this.musicGain!)
      osc.start(t)
      osc.stop(t + noteLength)
      oscs.push(osc)
    })

    this.musicOscillators = oscs
    this.musicTimeout = setTimeout(() => {
      this.playMusicLoop()
    }, totalDuration * 1000)
  }

  stopMusic() {
    this.musicPlaying = false
    if (this.musicTimeout) {
      clearTimeout(this.musicTimeout)
      this.musicTimeout = null
    }
    for (const osc of this.musicOscillators) {
      try { osc.stop() } catch { /* already stopped */ }
    }
    this.musicOscillators = []
  }

  toggleMute(): boolean {
    if (!this.masterGain) return false
    this.muted = !this.muted
    this.masterGain.gain.value = this.muted ? 0 : 1
    return this.muted
  }

  get isMuted(): boolean {
    return this.muted
  }
}

export const soundEngine = new SoundEngine()
