// src/lib/videoToGif/gifHexFixer.ts

/**
 * GIF 十六进制后处理工具
 *
 * 背景：有反馈指出部分前端播放/渲染环境下，FFmpeg 产出的 GIF 在末尾存在 0x2B，
 * 需要将最后一字节从 0x2B 替换为 0x21 以避免黑框问题。
 *
 * 说明：
 * - 本工具不改变任何 FFmpeg 转换流程，仅在生成 GIF 之后提供可选的安全修正。
 * - 若最后一字节不是 0x2B，将不会做任何修改（幂等）。
 * - 若 GIF 已以 0x3B 结尾（标准 trailer ';'），也不会修改。
 * - 仅对最后一个字节进行定点替换，避免破坏 GIF 结构的其它部分。
 */

export interface GifHexFixOptions {
  /**
   * 期望替换的源字节（默认 0x2B）。
   */
  fromByte?: number;
  /**
   * 目标字节（默认 0x21）。
   */
  toByte?: number;
  /**
   * 若为 true，当最后字节为 0x3B（标准 trailer）时强制不修改（默认 true）。
   */
  keepIfStandardTrailer?: boolean;
}

const DEFAULT_OPTIONS: Required<GifHexFixOptions> = {
  fromByte: 0x2B,
  toByte: 0x21,
  keepIfStandardTrailer: true,
};

export interface GifDelaySummary {
  frames: number;
  minDelayCs: number; // centiseconds
  maxDelayCs: number; // centiseconds
  distinctDelaysCs: number;
}

/**
 * 提取 GIF 每帧 delay（Graphics Control Extension: 0x21 0xF9 0x04 ... delayLo delayHi ... 0x00）
 * 用于诊断“观感帧率不一致”问题：本质是 delay 分布/帧数不同。
 *
 * 注意：这是“尽力解析”的轻量扫描，不做完整 GIF 结构校验。
 */
export function summarizeGifFrameDelays(bytes: Uint8Array): GifDelaySummary {
  let frames = 0;
  let minDelayCs = Number.POSITIVE_INFINITY;
  let maxDelayCs = 0;
  const distinct = new Set<number>();

  // GCE block pattern: 21 F9 04 [packed] [delayLo] [delayHi] [transparentIndex] 00
  for (let i = 0; i + 7 < bytes.length; i++) {
    if (bytes[i] === 0x21 && bytes[i + 1] === 0xF9 && bytes[i + 2] === 0x04) {
      const delayLo = bytes[i + 4];
      const delayHi = bytes[i + 5];
      const delayCs = (delayHi << 8) | delayLo;
      frames++;
      if (delayCs < minDelayCs) minDelayCs = delayCs;
      if (delayCs > maxDelayCs) maxDelayCs = delayCs;
      distinct.add(delayCs);

      // 跳过本 GCE block 的剩余字节，减少重复命中概率
      i += 7;
    }
  }

  if (frames === 0) {
    return { frames: 0, minDelayCs: 0, maxDelayCs: 0, distinctDelaysCs: 0 };
  }
  return {
    frames,
    minDelayCs: Number.isFinite(minDelayCs) ? minDelayCs : 0,
    maxDelayCs,
    distinctDelaysCs: distinct.size,
  };
}

/**
 * 将任意输入统一为 Uint8Array
 */
async function toUint8Array(input: Uint8Array | ArrayBuffer | Blob | string): Promise<Uint8Array> {
  if (input instanceof Uint8Array) return input;
  if (input instanceof ArrayBuffer) return new Uint8Array(input);

  // 处理 Blob
  if (input instanceof Blob) {
    const buf = await input.arrayBuffer();
    return new Uint8Array(buf);
  }

  // 处理 URL（含 blob: 或 http/https）
  if (typeof input === 'string') {
    const res = await fetch(input);
    const buf = await res.arrayBuffer();
    return new Uint8Array(buf);
  }

  throw new Error('Unsupported input type for toUint8Array');
}

/**
 * 安全修正 GIF 末尾字节。
 * - 仅当最后一字节等于 options.fromByte 时，替换为 options.toByte。
 * - 若 keepIfStandardTrailer 为 true 且最后字节为 0x3B，则不做修改。
 */
export function fixGifEndingByteBytes(bytes: Uint8Array, options: GifHexFixOptions = {}): Uint8Array {
  const { fromByte, toByte, keepIfStandardTrailer } = { ...DEFAULT_OPTIONS, ...options };

  if (!bytes || bytes.length === 0) return bytes;

  const lastIndex = bytes.length - 1;
  const lastByte = bytes[lastIndex];

  // 若已经是标准 GIF trailer 0x3B，则跳过
  if (keepIfStandardTrailer && lastByte === 0x3B) {
    return bytes;
  }

  if (lastByte === fromByte) {
    const cloned = new Uint8Array(bytes);
    cloned[lastIndex] = toByte;
    return cloned;
  }

  // 否则不修改
  return bytes;
}

/**
 * 输入任意来源的 GIF（Uint8Array/ArrayBuffer/Blob/URL），返回修正后的 Blob（type: image/gif）。
 */
export async function fixGifToBlob(
  input: Uint8Array | ArrayBuffer | Blob | string,
  options: GifHexFixOptions = {}
): Promise<Blob> {
  const bytes = await toUint8Array(input);
  const fixed = fixGifEndingByteBytes(bytes, options);
  return new Blob([fixed], { type: 'image/gif' });
}

/**
 * 输入任意来源的 GIF，返回修正后的 blob: URL。调用方可负责在不需要时 revoke。
 */
export async function fixGifToObjectURL(
  input: Uint8Array | ArrayBuffer | Blob | string,
  options: GifHexFixOptions = {}
): Promise<string> {
  const blob = await fixGifToBlob(input, options);
  return URL.createObjectURL(blob);
}

/**
 * 对一组 GIF URL/Blob/Bytes 进行批量修正，返回修正后的 blob: URL 数组。
 */
export async function fixMultipleGifsToObjectURLs(
  inputs: Array<Uint8Array | ArrayBuffer | Blob | string>,
  options: GifHexFixOptions = {}
): Promise<string[]> {
  const results: string[] = [];
  for (const input of inputs) {
    // 顺序处理以节省内存，避免同时生成过多 Blob
    // 若需并行，可改成 Promise.all 但注意内存占用
    const url = await fixGifToObjectURL(input, options);
    results.push(url);
  }
  return results;
}

/**
 * 释放由本工具创建的 blob: URL。
 */
export function revokeObjectURLs(urls: string[]): void {
  urls.forEach((u) => {
    if (typeof u === 'string' && u.startsWith('blob:')) {
      try { URL.revokeObjectURL(u); } catch (error) { void error; }
    }
  });
} 