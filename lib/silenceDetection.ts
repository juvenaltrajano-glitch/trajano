import { Segment, SilenceConfig } from "./types";

// Pure silence detection using Web Audio API AudioBuffer.
// Returns segments (both kept and removed) sorted by startTime.
export function detectSilence(
  buffer: AudioBuffer,
  config: SilenceConfig
): Segment[] {
  const { threshold, minDuration, padding } = config;
  const sampleRate = buffer.sampleRate;
  const totalDuration = buffer.duration;

  // Mix all channels down to mono for analysis
  const channelData = getMono(buffer);

  // Analyse in ~20ms windows
  const windowSize = Math.floor(sampleRate * 0.02);
  const windowDurationMs = (windowSize / sampleRate) * 1000;

  // Compute RMS dBFS for each window
  const windows: { timeMs: number; db: number }[] = [];
  for (let i = 0; i < channelData.length; i += windowSize) {
    const slice = channelData.slice(i, i + windowSize);
    const rms = Math.sqrt(slice.reduce((sum, v) => sum + v * v, 0) / slice.length);
    const db = 20 * Math.log10(rms + 1e-9);
    windows.push({ timeMs: (i / sampleRate) * 1000, db });
  }

  // Mark windows as silent
  const isSilent = windows.map((w) => w.db < threshold);

  // Merge contiguous silent windows into regions [startMs, endMs]
  const silentRegions: [number, number][] = [];
  let regionStart: number | null = null;

  for (let i = 0; i <= isSilent.length; i++) {
    if (i < isSilent.length && isSilent[i]) {
      if (regionStart === null) regionStart = windows[i].timeMs;
    } else {
      if (regionStart !== null) {
        const endMs = i < windows.length ? windows[i].timeMs : totalDuration * 1000;
        silentRegions.push([regionStart, endMs]);
        regionStart = null;
      }
    }
  }

  // Drop silences shorter than minDuration
  const filteredRegions = silentRegions.filter(
    ([s, e]) => e - s >= minDuration
  );

  // Shrink each silence region by padding (keep a bit of natural breath)
  const paddedRegions = filteredRegions
    .map(([s, e]): [number, number] => [s + padding, e - padding])
    .filter(([s, e]) => e > s);

  // Convert ms → seconds and build final segment list
  return buildSegments(paddedRegions, totalDuration, windowDurationMs);
}

// Mix multi-channel AudioBuffer to mono Float32Array
function getMono(buffer: AudioBuffer): Float32Array {
  const length = buffer.length;
  const mono = new Float32Array(length);
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < length; i++) mono[i] += data[i];
  }
  const channels = buffer.numberOfChannels;
  for (let i = 0; i < length; i++) mono[i] /= channels;
  return mono;
}

// Turn silence regions into interleaved keep/removed segment array
function buildSegments(
  silentRegionsMs: [number, number][],
  totalDurationS: number,
  _windowDurationMs: number
): Segment[] {
  const totalMs = totalDurationS * 1000;
  const segments: Segment[] = [];
  let cursor = 0;
  let id = 1;

  for (const [silStart, silEnd] of silentRegionsMs) {
    if (silStart > cursor) {
      segments.push({
        id: `s${id++}`,
        startTime: parseFloat((cursor / 1000).toFixed(3)),
        endTime: parseFloat((silStart / 1000).toFixed(3)),
        kind: "keep",
      });
    }
    segments.push({
      id: `s${id++}`,
      startTime: parseFloat((silStart / 1000).toFixed(3)),
      endTime: parseFloat((silEnd / 1000).toFixed(3)),
      kind: "removed",
    });
    cursor = silEnd;
  }

  // Remaining audio after last silence
  if (cursor < totalMs) {
    segments.push({
      id: `s${id++}`,
      startTime: parseFloat((cursor / 1000).toFixed(3)),
      endTime: parseFloat(totalDurationS.toFixed(3)),
      kind: "keep",
    });
  }

  return segments;
}
