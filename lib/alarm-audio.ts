import { ALARM_AUDIO_PATH, ALARM_AUDIO_VOLUME } from "@/lib/alarm-config";

const SOUND_ENABLED_KEY = "broker-monitor-alarm-sound-enabled";
let audioContext: AudioContext | null = null;
let alarmAudio: HTMLAudioElement | null = null;
let playbackGeneration = 0;

export function isAlarmSoundEnabled() {
  return typeof window !== "undefined" && window.localStorage.getItem(SOUND_ENABLED_KEY) === "true";
}

export function setAlarmSoundEnabled(enabled: boolean) {
  window.localStorage.setItem(SOUND_ENABLED_KEY, String(enabled));
}

export async function playAlarmSound() {
  const generation = playbackGeneration;
  if (ALARM_AUDIO_PATH) {
    alarmAudio ??= new Audio(new URL(ALARM_AUDIO_PATH, window.location.href).href);
    alarmAudio.volume = Math.max(0, Math.min(1, ALARM_AUDIO_VOLUME));
    if (!alarmAudio.paused) return;
    alarmAudio.currentTime = 0;
    try {
      await alarmAudio.play();
      if (generation !== playbackGeneration) alarmAudio?.pause();
      return;
    } catch (error) {
      if (generation !== playbackGeneration) return;
      // 浏览器禁止自动播放时交由界面提示，文件不可用时播放内置声音。
      if (error instanceof DOMException && error.name === "NotAllowedError") throw error;
    }
  }
  const AudioContextClass = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return;

  audioContext ??= new AudioContextClass();
  const context = audioContext;
  await context.resume();
  if (generation !== playbackGeneration || context.state === "closed") return;
  [0, 0.32, 0.64].forEach((offset, index) => {
    const oscillator = audioContext!.createOscillator();
    const gain = audioContext!.createGain();
    oscillator.type = "square";
    oscillator.frequency.setValueAtTime(index % 2 === 0 ? 880 : 660, audioContext!.currentTime + offset);
    gain.gain.setValueAtTime(0.0001, audioContext!.currentTime + offset);
    gain.gain.exponentialRampToValueAtTime(0.16, audioContext!.currentTime + offset + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext!.currentTime + offset + 0.25);
    oscillator.connect(gain).connect(audioContext!.destination);
    oscillator.start(audioContext!.currentTime + offset);
    oscillator.stop(audioContext!.currentTime + offset + 0.26);
  });
}

export async function stopAlarmSound() {
  playbackGeneration += 1;
  if (alarmAudio) {
    alarmAudio.pause();
    alarmAudio.currentTime = 0;
  }
  const context = audioContext;
  audioContext = null;
  if (context && context.state !== "closed") await context.close();
}
