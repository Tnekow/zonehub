// src/lib/videoToGif/videoToGifFfmpeg.ts

import type { FFmpeg as FFmpegClass } from '@ffmpeg/ffmpeg';

type FFmpegInstance = FFmpegClass;
type ToBlobURL = (url: string, mimeType: string) => Promise<string>;

// 动态导入FFmpeg模块，避免构建时的模块解析问题
let FFmpeg: typeof FFmpegClass | undefined;
let toBlobURL: ToBlobURL | undefined;

// 动态加载FFmpeg模块
const loadFFmpegModules = async () => {
  if (!FFmpeg) {
    const ffmpegModule = await import('@ffmpeg/ffmpeg');
    FFmpeg = ffmpegModule.FFmpeg;
  }
  if (!toBlobURL) {
    const utilModule = await import('@ffmpeg/util');
    toBlobURL = utilModule.toBlobURL;
  }
};
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import { fixGifEndingByteBytes, summarizeGifFrameDelays } from './gifHexFixer';
// 优先使用同源资源（Vite 会将 ?url 的资源输出到 /assets/*），避免 CDN CORS/拦截导致卡在 “Loading FFmpeg core...”
import ffmpegCoreUrl from '@ffmpeg/core?url';
import ffmpegWasmUrl from '@ffmpeg/core/wasm?url';

export interface VideoToGifOptions {
  width: number;
  height: number;
  quality: number; // 1-10 (used to calculate frame rate)
  delay: number; // not directly used by ffmpeg, frame rate is used instead
  keepAspectRatio?: boolean; // 是否保持原始视频的宽高比
  autoFill?: boolean; // 视频比例与输出比例不符时，自动填充剩余部分
}

export interface ConversionProgress {
  percentage: number;
  message: string;
}

export interface ConversionResult {
  success: boolean;
  gifUrl?: string;
  error?: string;
}

// 新增：五等分相关接口
export interface FiveSplitProgress {
  percentage: number;
  currentPart: number;
  totalParts: number;
  message: string;
}

export interface FiveSplitResult {
  success: boolean;
  splitGifUrls?: string[];
  error?: string;
}

let ffmpeg: FFmpegInstance | null = null;
let ffmpegLoadingPromise: Promise<void> | null = null;

function isFfmpegDebugEnabled(): boolean {
  try {
    const sp = new URLSearchParams(window.location.search);
    return sp.get('ffmpegDebug') === '1' || localStorage.getItem('ffmpeg_debug') === '1';
  } catch {
    return false;
  }
}

function createThrottle(ms: number) {
  let last = 0;
  return (fn: () => void) => {
    const now = Date.now();
    if (now - last >= ms) {
      last = now;
      fn();
    }
  };
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: number | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = window.setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([p, timeout]).finally(() => {
    if (timer) window.clearTimeout(timer);
  }) as Promise<T>;
}

function isTerminateError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? '');
  return msg.includes('called FFmpeg.terminate') || msg.includes('FFmpeg.terminate') || msg.includes('terminate()');
}

async function ensureFFmpegLoaded(onProgress: (message: string) => void): Promise<void> {
  if (ffmpeg && ffmpeg.loaded) return;
  if (ffmpegLoadingPromise) return await ffmpegLoadingPromise;
  ffmpegLoadingPromise = loadFFmpeg(onProgress);
  try {
    await ffmpegLoadingPromise;
  } finally {
    ffmpegLoadingPromise = null;
  }
}

async function retryOnceIfTerminated<T>(
  fn: () => Promise<T>,
  onProgress: (message: string) => void
): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (!isTerminateError(e)) throw e;
    onProgress('FFmpeg worker terminated unexpectedly. Re-initializing FFmpeg core and retrying...');
    cleanupFFmpeg();
    await ensureFFmpegLoaded(onProgress);
    return await fn();
  }
}

// 自定�?fetchFile 函数�?.12.x 版本已移除此 API�?
const readFromBlobOrFile = (blob: Blob | File): Promise<ArrayBuffer> => (
  new Promise((resolve, reject) => {
    const fileReader = new FileReader();
    fileReader.onload = () => {
      resolve(fileReader.result as ArrayBuffer);
    };
    fileReader.onerror = () => {
      reject(new Error('File could not be read.'));
    };
    fileReader.readAsArrayBuffer(blob);
  })
);

const fetchFile = async (data: File | Blob | string): Promise<Uint8Array> => {
  if (typeof data === 'undefined') {
    return new Uint8Array();
  }

  if (typeof data === 'string') {
    /* From base64 format */
    if (/data:[^;]+;base64,([^"]*)/.test(data)) {
      const base64Data = data.split(',')[1];
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes;
    /* From remote server/URL */
    } else {
      const res = await fetch(new URL(data, import.meta.url).href);
      const arrayBuffer = await res.arrayBuffer();
      return new Uint8Array(arrayBuffer);
    }
  /* From Blob or File */
  } else if (data instanceof File || data instanceof Blob) {
    const arrayBuffer = await readFromBlobOrFile(data);
    return new Uint8Array(arrayBuffer);
  }

  return new Uint8Array();
};

export async function loadFFmpeg(onProgress: (message: string) => void): Promise<void> {
  if (ffmpeg && ffmpeg.loaded) {
    onProgress('FFmpeg already loaded.');
    return;
  }
  
  try {
    // 动态加载FFmpeg模块
    await loadFFmpegModules();
    
    onProgress('Creating FFmpeg instance...');
    ffmpeg = new FFmpeg();
    const debug = isFfmpegDebugEnabled();
    const throttleUi = createThrottle(250);
    
    ffmpeg.on('log', ({ message }) => {
      // 默认静默，避免 console/页面文案被刷屏；需要时可通过 ?ffmpegDebug=1 或 localStorage.ffmpeg_debug=1 开启
      if (debug) void message;
    });
    
    ffmpeg.on('progress', ({ progress, time }) => {
      // 仅做轻量进度提示，节流避免 UI 抖动；详细信息仅在 debug 时输出
      const pct = Math.round(progress * 100);
      throttleUi(() => onProgress(`Converting... ${pct}%`));
      if (debug) void time;
    });
    
    onProgress('Loading FFmpeg core...');
    
    // 重要：不要对 core/wasm 使用 toBlobURL（会把大 wasm 完整拉进内存再转 blob，慢且容易超时/卡住）。
    // 我们优先使用“同源 assets”URL（由 Vite ?url 输出到 /assets/*），让 worker 自己按 URL 拉取 wasm。
    //
    // 注意：不要将 @ffmpeg/ffmpeg 的 worker.js 变成 blob URL 注入（它是 ESM 且有相对 import，blob URL 会导致这些 import 失效并让 load 永久 pending）。
    const timeoutMs = 45_000;
    onProgress('Loading FFmpeg core (local assets)...');
    const coreURL = ffmpegCoreUrl;
    const wasmURL = ffmpegWasmUrl;

    await withTimeout(
      ffmpeg.load({ coreURL, wasmURL }),
      timeoutMs,
      'FFmpeg core load'
    );
    
    onProgress('FFmpeg core loaded successfully.');
    
  } catch (error) {
    console.error('FFmpeg loading error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(
      `Failed to load FFmpeg: ${msg}\n` +
      `Tips:\n` +
      `- Check DevTools > Network for blocked/pending FFmpeg assets\n` +
      `- Try disabling adblock/privacy extensions (especially in Incognito)\n` +
      `- Ensure unpkg.com / cdn.jsdelivr.net are reachable from your network`
    );
  }
}

// 清理 FFmpeg 实例
export function cleanupFFmpeg(): void {
  ffmpegLoadingPromise = null;
  if (ffmpeg) {
    try {
      ffmpeg.terminate();
    } catch (error) {
      console.warn('Error terminating FFmpeg:', error);
    }
    ffmpeg = null;
  }
}

export async function convertVideoToGifWithFFmpeg(
  file: File,
  options: VideoToGifOptions,
  onProgress: (progress: ConversionProgress) => void
): Promise<ConversionResult> {
  try {
    await ensureFFmpegLoaded((message) => onProgress({ percentage: 0, message }));

    if (!ffmpeg) {
      return { success: false, error: 'FFmpeg instance could not be created.' };
    }

    onProgress({ percentage: 5, message: 'Writing video file to memory...' });
    
    // 写入输入文件
    const inputFileName = 'input.video';
    await retryOnceIfTerminated(
      async () => ffmpeg.writeFile(inputFileName, await fetchFile(file)),
      (m) => onProgress({ percentage: 6, message: m })
    );

    // 计算帧率 (1-10 映射�?5-15 fps)
    const frameRate = 5 + (options.quality * 1);
    
    onProgress({ percentage: 10, message: `Starting conversion with frame rate: ${frameRate}fps...` });

    // 构建 FFmpeg 命令
    // 使用split+palettegen+paletteuse滤镜链生成高质量GIF
    let filterComplex = '';
    
    // 处理视频缩放和填充
    if (options.keepAspectRatio) {
      // 保持宽高比：保持原始视频的宽高比，可能导致输出尺寸小于指定尺寸
      filterComplex = `fps=${frameRate},scale=${options.width}:${options.height}:force_original_aspect_ratio=decrease[v];[v]split[v1][v2];[v1]palettegen[p];[v2][p]paletteuse`;
    } else if (options.autoFill) {
      // 自动填充：先缩放保持比例，然后使用pad滤镜居中填充黑色背景
      // 使用split+palettegen+paletteuse滤镜链生成高质量GIF
      filterComplex = `fps=${frameRate},scale=${options.width}:${options.height}:force_original_aspect_ratio=decrease,pad=${options.width}:${options.height}:(ow-iw)/2:(oh-ih)/2:black[v];[v]split[v1][v2];[v1]palettegen[p];[v2][p]paletteuse`;
    } else {
      // 默认：直接缩放到指定尺寸，可能导致视频变形
      filterComplex = `fps=${frameRate},scale=${options.width}:${options.height}[v];[v]split[v1][v2];[v1]palettegen[p];[v2][p]paletteuse`;
    }
    
    const command = [
      '-i', inputFileName,
      '-filter_complex', filterComplex,
      '-f', 'gif',
      'output.gif'
    ];

    onProgress({ percentage: 20, message: 'Executing FFmpeg command...' });
    await retryOnceIfTerminated(
      async () => ffmpeg.exec(command),
      (m) => onProgress({ percentage: 20, message: m })
    );
    
    onProgress({ percentage: 90, message: 'Reading output file...' });
    
    // 读取结果文件
    const data = await retryOnceIfTerminated(
      async () => ffmpeg.readFile('output.gif'),
      (m) => onProgress({ percentage: 90, message: m })
    );
    
    // 确保数据不为空
    if (!data) {
      throw new Error('FFmpeg输出无效：未能读取输出文件');
    }
    
    // 检查数据类型并转换为Uint8Array
    let uint8Array;
    if (data instanceof Uint8Array) {
      uint8Array = data;
    } else if (data.buffer && data.buffer instanceof ArrayBuffer) {
      uint8Array = new Uint8Array(data.buffer);
    } else if (typeof data === 'object') {
      // 尝试其他可能的数据格式
      try {
        uint8Array = new Uint8Array(data as ArrayLike<number>);
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        throw new Error(`FFmpeg输出无效：无法转换为Uint8Array - ${message}`);
      }
    } else {
      throw new Error(`FFmpeg输出无效：未知的数据格式 - ${typeof data}`);
    }
    
    // 检查数据长度
    if (!uint8Array || uint8Array.length === 0) {
      throw new Error('FFmpeg输出无效：输出数据长度为0');
    }
    
    // 创建Blob
    const blob = new Blob([uint8Array], { type: 'image/gif' });
    
    // 验证Blob大小
    if (blob.size === 0) {
      throw new Error('FFmpeg输出无效：生成的GIF文件大小为0');
    }
    
    const gifUrl = URL.createObjectURL(blob);

    onProgress({ percentage: 100, message: 'Conversion complete!' });
    
    // 清理文件
    try {
      await ffmpeg.deleteFile(inputFileName);
      await ffmpeg.deleteFile('output.gif');
    } catch (error) {
      console.warn('Error cleaning up files:', error);
    }

    return { success: true, gifUrl };
    
  } catch (error) {
    console.error('FFmpeg conversion error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred during conversion.',
    };
  }
}

// 下载 GIF 文件的辅助函�?
export function downloadGif(gifUrl: string, filename: string = 'converted.gif'): void {
  try {
    saveAs(gifUrl, filename);
  } catch (error) {
    console.error('Download error:', error);
    // 回退到手动下载
    const link = document.createElement('a');
    link.href = gifUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
} 

/**
 * 将视频转换为五个等宽的GIF文件
 * @param file 视频文件
 * @param options 转换选项
 * @param onProgress 进度回调
 * @returns Promise<FiveSplitResult>
 */
export async function convertVideoToFiveSplitGifsWithFFmpeg(
  file: File,
  options: VideoToGifOptions,
  onProgress: (progress: FiveSplitProgress) => void
): Promise<FiveSplitResult> {
  try {
    await ensureFFmpegLoaded((message) => onProgress({
      percentage: 0,
      currentPart: 0,
      totalParts: 5,
      message,
    }));

    if (!ffmpeg) {
      return { success: false, error: 'FFmpeg instance could not be created.' };
    }

    onProgress({ 
      percentage: 5, 
      currentPart: 0, 
      totalParts: 5, 
      message: 'Writing video file to memory...' 
    });
    
    // 写入输入文件
    const inputFileName = 'input.video';
    await retryOnceIfTerminated(
      async () => ffmpeg.writeFile(inputFileName, await fetchFile(file)),
      (m) => onProgress({ percentage: 6, currentPart: 0, totalParts: 5, message: m })
    );

    // 计算帧率 (1-10 映射�?5-15 fps)
    const frameRate = 5 + (options.quality * 1);
    
    onProgress({ 
      percentage: 10, 
      currentPart: 0, 
      totalParts: 5, 
      message: `Starting five-split conversion with frame rate: ${frameRate}fps...` 
    });

    const splitGifUrls: string[] = [];

    // 统一 palette：先对“完整输出画布（scale/pad 后）”生成一次 palette，供 5 片共用。
    // 这样可以减少各片颜色量化差异，降低“观感帧率/抖动不一致”的错觉与 Steam 二次处理差异。
    const paletteFileName = 'palette.png';
    const baseCanvasFilter = (() => {
      if (options.keepAspectRatio) {
        return `fps=${frameRate},scale=${options.width}:${options.height}:force_original_aspect_ratio=decrease,pad=${options.width}:${options.height}:(ow-iw)/2:(oh-ih)/2:black`;
      }
      if (options.autoFill) {
        return `fps=${frameRate},scale=${options.width}:${options.height}:force_original_aspect_ratio=decrease,pad=${options.width}:${options.height}:(ow-iw)/2:(oh-ih)/2:black`;
      }
      return `fps=${frameRate},scale=${options.width}:${options.height}`;
    })();

    onProgress({
      percentage: 12,
      currentPart: 0,
      totalParts: 5,
      message: 'Generating shared palette...',
    });

    await retryOnceIfTerminated(
      async () => ffmpeg.exec([
        '-i', inputFileName,
        '-filter_complex', `${baseCanvasFilter},palettegen=stats_mode=diff[p]`,
        '-map', '[p]',
        '-frames:v', '1',
        paletteFileName,
      ]),
      (m) => onProgress({ percentage: 12, currentPart: 0, totalParts: 5, message: m })
    );
    // 五等分计算（Steam 展柜友好）：
    // - Steam 会按每张图自身宽高比缩放到同一列宽，因此 5 张图必须“等宽”，否则会出现最后一张更矮/更高。
    // - 经典设置：总宽 630、gap=5px（4 个间隙），有效宽 610 -> 每片 122px，5 片完全等宽。
    const totalWidth = options.width;
    const gapsCount = 4;
    const preferredGapWidth = totalWidth === 630 ? 5 : 4; // 630 宽用 5px；其它宽度尽量少吃掉内容
    const basePartWidth = Math.floor((totalWidth - preferredGapWidth * gapsCount) / 5);
    if (!Number.isFinite(basePartWidth) || basePartWidth <= 0) {
      throw new Error(`Invalid output width for five-split: width=${totalWidth}, gap=${preferredGapWidth}x${gapsCount}`);
    }
    const partWidth = basePartWidth; // 所有 5 片等宽
    const gaps = new Array<number>(gapsCount).fill(preferredGapWidth);
    // 由于取整可能产生 remainder，这里把差额分摊到 gap 上，保持 5 片等宽
    const usedWidth = partWidth * 5 + gaps.reduce((a, b) => a + b, 0);
    let remainder = totalWidth - usedWidth; // 目标宽 - 已用宽（可正可负）
    if (remainder !== 0) {
      const step = remainder > 0 ? 1 : -1;
      remainder = Math.abs(remainder);
      for (let i = 0; i < remainder; i++) {
        const idx = i % gapsCount;
        const next = gaps[idx] + step;
        // gap 不能为负；若出现极端情况，说明 width/gap 配置不合理
        if (next < 0) {
          throw new Error(`Invalid five-split gap distribution: width=${totalWidth}, partWidth=${partWidth}, gaps=${gaps.join(',')}`);
        }
        gaps[idx] = next;
      }
    }
    const startXForPart = (partIndex: number): number => {
      let x = partIndex * partWidth;
      for (let i = 0; i < partIndex; i++) x += gaps[i] ?? 0;
      return x;
    };

    let baselineDelaySummary: ReturnType<typeof summarizeGifFrameDelays> | null = null;
    
    // 为每个部分生成GIF
    for (let partIndex = 0; partIndex < 5; partIndex++) {
      // 计算起始位置（gap 分摊后每段的 offset 可能不同）
      const startX = startXForPart(partIndex);
      const currentPartWidth = partWidth;
      
      onProgress({ 
        percentage: 15 + (partIndex / 5) * 70, 
        currentPart: partIndex + 1, 
        totalParts: 5, 
        message: `Processing part ${partIndex + 1}/5 (x=${startX}, width=${currentPartWidth}, gaps=[${gaps.join(',')}])...` 
      });

      // 构建FFmpeg命令 - 使用稳定的时间同步参数
      // 确保与完整GIF使用相同的缩放逻辑，并添加时间轴同步
      const outputFileName = `output_part_${partIndex + 1}.gif`;
      
      // 构建滤镜字符串，使用split+palettegen+paletteuse滤镜链生成高质量GIF
      let filterComplex = '';
      
      // 处理视频缩放和填充
      // 使用 shared palette：第二输入为 palette.png
      // 统一用 baseCanvasFilter，保证 5 片的时间轴和缩放一致，只在最后 crop 不同。
      filterComplex = `[0:v]${baseCanvasFilter},crop=${currentPartWidth}:${options.height}:${startX}:0[v];[v][1:v]paletteuse`;
      
      const command = [
        '-i', inputFileName,
        '-i', paletteFileName,
        '-filter_complex', filterComplex,
        '-vsync', 'cfr',    // 恒定帧率，确保帧同步
        '-f', 'gif',
        outputFileName
      ];

      try {
        await retryOnceIfTerminated(
          async () => ffmpeg.exec(command),
          (m) => onProgress({ percentage: 15 + (partIndex / 5) * 70, currentPart: partIndex + 1, totalParts: 5, message: m })
        );
      } catch (execError) {
        console.error(`FFmpeg exec error for part ${partIndex + 1}:`, execError);
        throw new Error(`Failed to process part ${partIndex + 1}: ${execError}`);
      }
      
      // 读取结果文件
      const data = await retryOnceIfTerminated(
        async () => ffmpeg.readFile(outputFileName),
        (m) => onProgress({ percentage: 15 + (partIndex / 5) * 70, currentPart: partIndex + 1, totalParts: 5, message: m })
      );
      
      // 确保数据不为空
      if (!data) {
        throw new Error(`FFmpeg输出无效：未能读取第${partIndex + 1}部分的输出文件`);
      }
      
      // 检查数据类型并转换为Uint8Array
      let uint8Array;
      if (data instanceof Uint8Array) {
        uint8Array = data;
      } else if (data.buffer && data.buffer instanceof ArrayBuffer) {
        uint8Array = new Uint8Array(data.buffer);
      } else if (typeof data === 'object') {
        // 尝试其他可能的数据格式
        try {
          uint8Array = new Uint8Array(data as ArrayLike<number>);
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          throw new Error(`FFmpeg输出无效：第${partIndex + 1}部分无法转换为Uint8Array - ${message}`);
        }
      } else {
        throw new Error(`FFmpeg输出无效：第${partIndex + 1}部分未知的数据格式 - ${typeof data}`);
      }
      
      // 检查数据长度
      if (!uint8Array || uint8Array.length === 0) {
        throw new Error(`FFmpeg输出无效：第${partIndex + 1}部分的输出数据长度为0`);
      }
      
      // Steam 展柜兼容处理（按你的要求）：
      // 1) 若末字节为 0x3B（标准 GIF trailer），强制改为 0x21
      // 2) 若末字节为 0x2B，也改为 0x21（历史兼容）
      // 注意：这会让 GIF 在字节层面“不再是标准 trailer 结尾”，但可满足 Steam 的特定渲染/上传环境需求。
      let fixedBytes = fixGifEndingByteBytes(uint8Array, {
        fromByte: 0x3B,
        toByte: 0x21,
        keepIfStandardTrailer: false,
      });
      fixedBytes = fixGifEndingByteBytes(fixedBytes, {
        fromByte: 0x2B,
        toByte: 0x21,
        keepIfStandardTrailer: false,
      });

      // 诊断：检查每片的帧 delay 分布是否一致（delay 才是“帧率”本质）
      // 若 Steam 上传后出现“某一片更快/更慢”，这里能帮助确认是否是源 GIF delay 就不一致。
      const summary = summarizeGifFrameDelays(fixedBytes);
      // 诊断日志：默认不输出；仅保留计算以供后续一致性比较
      if (!baselineDelaySummary) {
        baselineDelaySummary = summary;
      } else {
        const base = baselineDelaySummary;
        if (
          summary.frames !== base.frames ||
          summary.minDelayCs !== base.minDelayCs ||
          summary.maxDelayCs !== base.maxDelayCs ||
          summary.distinctDelaysCs !== base.distinctDelaysCs
        ) {
          console.warn('[five-split gif] frame delay mismatch', {
            part: partIndex + 1,
            summary,
            baseline: base,
          });
        }
      }

      // 创建 Blob 并验证
      // TS/DOM 类型里 BlobPart 对 SharedArrayBuffer 更严格；这里强制拷贝一份确保是 ArrayBuffer-backed Uint8Array
      const blobBytes = new Uint8Array(fixedBytes);
      const blob = new Blob([blobBytes], { type: 'image/gif' });
      
      // 验证Blob大小
      if (blob.size === 0) {
        throw new Error(`FFmpeg输出无效：第${partIndex + 1}部分生成的GIF文件大小为0`);
      }
      
      // 创建Blob URL
      const gifUrl = URL.createObjectURL(blob);
      
      splitGifUrls.push(gifUrl);

      // 清理临时文件
      try {
        await ffmpeg.deleteFile(outputFileName);
      } catch (error) {
        console.warn(`Error cleaning up ${outputFileName}:`, error);
      }
    }

    // 清理输入文件
    try {
      await ffmpeg.deleteFile(inputFileName);
      await ffmpeg.deleteFile(paletteFileName);
    } catch (error) {
      console.warn('Error cleaning up input file:', error);
    }

    onProgress({ 
      percentage: 100, 
      currentPart: 5, 
      totalParts: 5, 
      message: 'Five-split conversion complete!' 
    });

    return { success: true, splitGifUrls };
    
  } catch (error) {
    console.error('FFmpeg five-split conversion error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred during five-split conversion.',
    };
  }
}

// 新增：下载五等分GIF文件的辅助函�?
export async function downloadFiveSplitGifs(splitGifUrls: string[], baseFilename: string = 'converted'): Promise<void> {
  try {
    const zip = new JSZip();
    
    // 为每个GIF文件创建zip条目
    for (let i = 0; i < splitGifUrls.length; i++) {
      const gifUrl = splitGifUrls[i];
      const filename = `${baseFilename}_part_${i + 1}.gif`;
      
      // 从URL获取GIF数据
      const response = await fetch(gifUrl);
      const gifBlob = await response.blob();
      
      // 添加到zip
      zip.file(filename, gifBlob);
    }
    
    // 生成zip文件
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    
    // 下载zip文件
    saveAs(zipBlob, `${baseFilename}_five_split.zip`);
    
  } catch (error) {
    console.error('Zip download error:', error);
    // 回退到单独下载   
    try {
      splitGifUrls.forEach((gifUrl, index) => {
        const filename = `${baseFilename}_part_${index + 1}.gif`;
        saveAs(gifUrl, filename);
      });
    } catch (fallbackError) {
      console.error('Fallback download error:', fallbackError);
      // 最终回退到手动下载      
      splitGifUrls.forEach((gifUrl, index) => {
        const filename = `${baseFilename}_part_${index + 1}.gif`;
        const link = document.createElement('a');
        link.href = gifUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      });
    }
  }
}

// 新增：清理五等分GIF资源
export function cleanupFiveSplitGifs(splitGifUrls: string[]): void {
  splitGifUrls.forEach(url => {
    if (url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  });
}
