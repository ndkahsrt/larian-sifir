/**
 * Enjin Bunyi Web Audio API (Synthesized Audio Engine)
 * Menjana kesan bunyi (SFX) dan muzik kembara (BGM) tanpa memerlukan fail MP3 luaran.
 */

class SoundEffects {
    constructor() {
        this.ctx = null;
        this.isMuted = false;
        this.bgmPlaying = false;
        this.bgmInterval = null;
        this.bgmStep = 0;
        this.tempo = 125; // BPM
    }

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.isMuted) {
            this.stopBGM();
        } else {
            this.startBGM();
        }
        return this.isMuted;
    }

    // --- KESAN BUNYI (SFX) ---

    // Bunyi tukar lorong (Whoosh)
    playWhoosh() {
        if (this.isMuted) return;
        this.init();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(320, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.15);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(600, this.ctx.currentTime);

        gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.15);
    }

    // Bunyi kutip syiling (Coin Ping)
    playCoin() {
        if (this.isMuted) return;
        this.init();

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(987.77, now); // B5
        osc.frequency.setValueAtTime(1318.51, now + 0.08); // E6

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.25);
    }

    // Bunyi Jawapan Betul (Victory Ding / Chord)
    playCorrect() {
        if (this.isMuted) return;
        this.init();

        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        const now = this.ctx.currentTime;

        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.06);

            gain.gain.setValueAtTime(0, now + idx * 0.06);
            gain.gain.linearRampToValueAtTime(0.25, now + idx * 0.06 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.35);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now + idx * 0.06);
            osc.stop(now + idx * 0.06 + 0.35);
        });
    }

    // Bunyi Jawapan Salah (Thud / Buzz)
    playWrong() {
        if (this.isMuted) return;
        this.init();

        const now = this.ctx.currentTime;
        
        // Osc 1: Dissonant low buzz
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc1.type = 'sawtooth';
        osc2.type = 'sawtooth';

        osc1.frequency.setValueAtTime(140, now);
        osc1.frequency.exponentialRampToValueAtTime(55, now + 0.35);

        osc2.frequency.setValueAtTime(147, now);
        osc2.frequency.exponentialRampToValueAtTime(58, now + 0.35);

        gain.gain.setValueAtTime(0.28, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.35);
        osc2.stop(now + 0.35);
    }

    // Bunyi Game Over
    playGameOver() {
        if (this.isMuted) return;
        this.init();

        const notes = [440, 392, 349.23, 293.66]; // A4, G4, F4, D4
        const now = this.ctx.currentTime;

        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + idx * 0.18);

            gain.gain.setValueAtTime(0.25, now + idx * 0.18);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.18 + 0.45);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now + idx * 0.18);
            osc.stop(now + idx * 0.18 + 0.45);
        });
    }

    // --- MUZIK LATAR BELAKANG KEMBARA (SYNTH BGM) ---

    startBGM() {
        if (this.isMuted || this.bgmPlaying) return;
        this.init();
        this.bgmPlaying = true;
        this.bgmStep = 0;

        const stepDuration = (60 / this.tempo) / 2; // 16th notes approx
        this.bgmInterval = setInterval(() => {
            this.playBGMStep();
        }, stepDuration * 1000);
    }

    stopBGM() {
        if (this.bgmInterval) {
            clearInterval(this.bgmInterval);
            this.bgmInterval = null;
        }
        this.bgmPlaying = false;
    }

    playBGMStep() {
        if (!this.ctx || this.isMuted) return;
        const now = this.ctx.currentTime;
        const step = this.bgmStep % 16;

        // Kick drum purba pada rentak 0, 4, 8, 12
        if (step === 0 || step === 4 || step === 8 || step === 12) {
            this.playKick(now);
        }

        // Shaker / Hi-hat purba pada setiap rentak ganjil
        if (step % 2 === 0) {
            this.playWoodShaker(now, step === 4 || step === 12 ? 0.08 : 0.04);
        }

        // Melodi Kembara Marimba / Kalimba Pentatonik
        // Tangga nada A minor pentatonic: A3 (220), C4 (261), D4 (293), E4 (329), G4 (392), A4 (440)
        const melody = [
            220, null, 261.63, 293.66,
            329.63, null, 392.00, 329.63,
            293.66, null, 261.63, null,
            220, 261.63, 293.66, null
        ];

        const note = melody[step];
        if (note) {
            this.playMarimba(now, note);
        }

        this.bgmStep++;
    }

    playKick(now) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.frequency.setValueAtTime(120, now);
        osc.frequency.exponentialRampToValueAtTime(35, now + 0.12);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.12);
    }

    playWoodShaker(now, volume) {
        // White noise burst untuk bunyi gemersik daun / kayu
        const bufferSize = this.ctx.sampleRate * 0.03;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(4500, now);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        noise.start(now);
    }

    playMarimba(now, freq) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.09, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.18);
    }
}

if (typeof window !== 'undefined') {
    window.SoundEffects = SoundEffects;
}
