// 更换警报音：把 MP3 放进 public/audio/，将 null 改为 "./audio/alarm.mp3"。
// 路径使用 ./ 开头，兼容本地服务和 GitHub Pages 的仓库目录。
// null 使用内置警报音；MP3 无法加载时也会回退到内置声音。
export const ALARM_AUDIO_PATH: string | null = null;
export const ALARM_AUDIO_VOLUME = 0.7;
