import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useI18n } from '../../hooks/useI18n';
import useMeta from '../../hooks/useMeta';
import {
  localeFromPathname,
  withLocalePath,
} from '../../lib/localePath';
import {
  convertVideoToGifWithFFmpeg,
  convertVideoToFiveSplitGifsWithFFmpeg,
  cleanupFFmpeg,
  downloadGif,
  downloadFiveSplitGifs,
  cleanupFiveSplitGifs,
  type VideoToGifOptions,
  type ConversionProgress,
  type ConversionResult,
  type FiveSplitProgress,
  type FiveSplitResult,
} from '../../lib/videoToGif/videoToGifFfmpeg';
import { UploadTutorialSection } from './UploadTutorialSection';

const VideoToGifTool: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useI18n();
  const locale = localeFromPathname(location.pathname);
  const inDesktopShell = location.pathname.startsWith('/desktop');
  const basePath = inDesktopShell ? '/desktop/artwork-showcase' : withLocalePath(location.pathname, '/artwork-showcase');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  useMeta({
    title: t('artworkShowcase:meta.videoToGifTitle'),
    description: t('artworkShowcase:meta.videoToGifDescription'),
  });
  
  // 步骤状态管理
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [step1Completed, setStep1Completed] = useState(false);
  const [step2Completed, setStep2Completed] = useState(false);
  const [, setStep3Completed] = useState(false);
  
  // FFmpeg-related state
  const [ffmpegLoaded, setFfmpegLoaded] = useState(false);
  const [ffmpegLoadingMessage, setFfmpegLoadingMessage] = useState('');

  // 参数设置
  // Steam 常见的 5 等分展柜尺寸（配合 gap=5px 时，每片可得到 122px 宽）
  const [width, setWidth] = useState(630);
  const [height, setHeight] = useState(354);
  const [quality, setQuality] = useState(5); // Now controls frame rate
  const [delay] = useState(100); // No longer used by FFmpeg logic
  const [keepAspectRatio, setKeepAspectRatio] = useState(false); // 保持宽高比选项
  const [autoFill, setAutoFill] = useState(false); // 自动填充剩余部分选项
  
  const [isConverting, setIsConverting] = useState(false);
  const [conversionProgress, setConversionProgress] = useState<ConversionProgress | null>(null);
  const [conversionResult, setConversionResult] = useState<ConversionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  // 五等分相关状态
  const [isSplitting, setIsSplitting] = useState(false);
  const [splitProgress, setSplitProgress] = useState<FiveSplitProgress | null>(null);
  const [splitResult, setSplitResult] = useState<FiveSplitResult | null>(null);
  const [splitError, setSplitError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);

  // 步骤指示器组件
  const StepIndicator = () => (
    <div className="mb-8">
      <div className="flex items-center justify-center space-x-4">
        <div className={`flex items-center ${currentStep >= 1 ? 'text-steam-primary' : 'text-steam-textMuted'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
            currentStep >= 1 ? 'border-steam-primary bg-steam-primary text-steam-dark' : 'border-steam-gray'
          }`}>
            {step1Completed ? '✓' : '1'}
          </div>
          <span className="ml-2 text-sm font-medium">{t('artworkShowcase:videoToGif.step1')}</span>
        </div>
        
        <div className={`w-12 h-0.5 ${currentStep >= 2 ? 'bg-steam-primary' : 'bg-steam-gray'}`}></div>
        
        <div className={`flex items-center ${currentStep >= 2 ? 'text-steam-primary' : 'text-steam-textMuted'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
            currentStep >= 2 ? 'border-steam-primary bg-steam-primary text-steam-dark' : 'border-steam-gray'
          }`}>
            {step2Completed ? '✓' : '2'}
          </div>
          <span className="ml-2 text-sm font-medium">{t('artworkShowcase:videoToGif.step2')}</span>
        </div>
        
        <div className={`w-12 h-0.5 ${currentStep >= 3 ? 'bg-steam-primary' : 'bg-steam-gray'}`}></div>
        
        <div className={`flex items-center ${currentStep >= 3 ? 'text-steam-primary' : 'text-steam-textMuted'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
            currentStep >= 3 ? 'border-steam-primary bg-steam-primary text-steam-dark' : 'border-steam-gray'
          }`}>
            {conversionResult?.success ? '✓' : '3'}
          </div>
          <span className="ml-2 text-sm font-medium">{t('artworkShowcase:videoToGif.step3')}</span>
        </div>
        
        <div className={`w-12 h-0.5 ${currentStep >= 4 ? 'bg-steam-primary' : 'bg-steam-gray'}`}></div>
        
        <div className={`flex items-center ${currentStep >= 4 ? 'text-steam-primary' : 'text-steam-textMuted'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
            currentStep >= 4 ? 'border-steam-primary bg-steam-primary text-steam-dark' : 'border-steam-gray'
          }`}>
            {currentStep >= 4 ? '✓' : '4'}
          </div>
          <span className="ml-2 text-sm font-medium">{t('artworkShowcase:videoToGif.step4')}</span>
        </div>
      </div>
    </div>
  );

  // Load FFmpeg on component mount
  useEffect(() => {
    async function load() {
      try {
        const { loadFFmpeg } = await import('../../lib/videoToGif/videoToGifFfmpeg');
        await loadFFmpeg(setFfmpegLoadingMessage);
        setFfmpegLoaded(true);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        if (errorMessage.includes('SharedArrayBuffer')) {
          setError(t('artworkShowcase:videoToGif.sharedArrayBufferError'));
        } else {
          setError(t('artworkShowcase:videoToGif.ffmpegLoadError', { message: errorMessage }));
        }
        console.error('FFmpeg loading error:', err);
      }
    }
    load();
  }, [t]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setError(null);
    setConversionResult(null);
    setConversionProgress(null);

    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    
    // 自动进入第三步
    handleStep2Complete();
  };

  const handleGenerateGif = async () => {
    if (!selectedFile || !ffmpegLoaded) return;
    
    setIsConverting(true);
    setError(null);
    setConversionResult(null);
    setConversionProgress({ percentage: 0, message: 'Starting...' });
    
    const options: VideoToGifOptions = {
      width,
      height,
      quality,
      delay,
      keepAspectRatio, // 添加保持宽高比选项
      autoFill, // 添加自动填充选项
    };

    const result = await convertVideoToGifWithFFmpeg(
      selectedFile,
      options,
      (progress) => {
        // FFmpeg's progress is not a simple percentage, so we'll just show the message
        setConversionProgress(progress);
      }
    );
      
    setConversionResult(result);
      
    if (!result.success) {
      setError(result.error || t('artworkShowcase:videoToGif.conversionError'));
    }
    
    setIsConverting(false);
  };

  // 五等分处理函数
  const handleGenerateFiveSplitGifs = async () => {
    if (!selectedFile || !ffmpegLoaded) return;
    
    setIsSplitting(true);
    setSplitError(null);
    setSplitResult(null);
    setSplitProgress({ 
      percentage: 0, 
      currentPart: 0, 
      totalParts: 5, 
      message: t('artworkShowcase:videoToGif.startingFiveSplit'),
    });
    
    const options: VideoToGifOptions = {
      width,
      height,
      quality,
      delay,
      keepAspectRatio, // 添加保持宽高比选项
      autoFill, // 添加自动填充选项
    };

    const result = await convertVideoToFiveSplitGifsWithFFmpeg(
      selectedFile,
      options,
      (progress) => {
        setSplitProgress(progress);
      }
    );
    
    setSplitResult(result);
    
    if (!result.success) {
      setSplitError(result.error || t('artworkShowcase:videoToGif.fiveSplitError'));
    }
    
    setIsSplitting(false);
  };

  // 步骤导航函数
  const handleStep1Complete = () => {
    setStep1Completed(true);
    setCurrentStep(2);
  };

  const handleStep2Complete = () => {
    setStep2Completed(true);
    setCurrentStep(3);
  };

  const handleStep3Complete = () => {
    setStep3Completed(true);
    setCurrentStep(4);
  };

  const handleRestart = () => {
    setCurrentStep(1);
    setStep1Completed(false);
    setStep2Completed(false);
    setStep3Completed(false);
    setSelectedFile(null);
    setVideoUrl(null);
    setConversionResult(null);
    setError(null);
    setConversionProgress(null);
    // 清理五等分相关状态
    setSplitResult(null);
    setSplitError(null);
    setSplitProgress(null);
    // 清理视频 URL
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
      setVideoUrl(null);
    }
    // 清理 GIF URL
    if (conversionResult?.gifUrl) {
      URL.revokeObjectURL(conversionResult.gifUrl);
    }
    // 清理五等分结果
    if (splitResult?.splitGifUrls) {
      cleanupFiveSplitGifs(splitResult.splitGifUrls);
    }
  };

  // 下载五等分图片
  const handleDownloadSplitParts = async () => {
    if (!splitResult?.splitGifUrls) return;
    try {
      await downloadFiveSplitGifs(splitResult.splitGifUrls, 'converted');
    } catch (error) {
      console.error('下载失败:', error);
    }
  };

  // Cleanup resources (URLs) when values change / on unmount.
  // IMPORTANT: do NOT terminate FFmpeg here, because this effect re-runs whenever
  // videoUrl/conversionResult/splitResult changes. Terminating here would kill FFmpeg
  // during normal user actions (e.g. selecting a file sets videoUrl).
  useEffect(() => {
    return () => {
      if (conversionResult?.gifUrl) {
        URL.revokeObjectURL(conversionResult.gifUrl);
      }
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
      // 清理五等分结果
      if (splitResult?.splitGifUrls) {
        cleanupFiveSplitGifs(splitResult.splitGifUrls);
      }
    };
  }, [conversionResult, videoUrl, splitResult]);

  // 仅在页面卸载时终止 FFmpeg（避免在 setVideoUrl 等交互时误杀 FFmpeg）
  useEffect(() => {
    return () => {
      cleanupFFmpeg();
    };
  }, []);

  return (
    <div className="min-h-screen bg-steam-background-color">
      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="bg-steam-card backdrop-blur-md border border-white/10 rounded p-6">
          {/* Back Button */}
          <button
            onClick={() => navigate(basePath)}
            className="text-steam-textSecondary hover:text-steam-textPrimary mb-6 flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
            </svg>
            {t('artworkShowcase:videoToGif.backToToolSelection')}
          </button>

          <h1 className="text-2xl font-bold text-steam-textPrimary mb-6">
            {t('artworkShowcase:videoToGif.videoToGifTool')}
          </h1>
          
          {/* 步骤指示器 */}
          <StepIndicator />
          
          <div className="space-y-6">
            {/* 第一步：GIF参数设置 */}
            {currentStep === 1 && (
              <div className="bg-steam-item rounded p-6">
                <h3 className="text-lg font-medium text-steam-textPrimary mb-4">{t('artworkShowcase:videoToGif.step1Title')}</h3>
                <div className="space-y-4">
                  <div className="mb-4">
                    <div className="flex items-center mb-2">
                      <input
                        type="checkbox"
                        id="keepAspectRatio"
                        checked={keepAspectRatio}
                        onChange={(e) => setKeepAspectRatio(e.target.checked)}
                        className="mr-2"
                      />
                      <label htmlFor="keepAspectRatio" className="text-steam-textPrimary cursor-pointer">
                        {t('artworkShowcase:videoToGif.keepAspectRatio')}
                      </label>
                    </div>
                    <p className="text-steam-textMuted text-xs mb-2">
                      {t('artworkShowcase:videoToGif.keepAspectDesc')}
                    </p>
                  </div>
                  
                  {!keepAspectRatio && (
                    <div className="mb-4">
                      <div className="flex items-center mb-2">
                        <input
                          type="checkbox"
                          id="autoFill"
                          checked={autoFill}
                          onChange={(e) => setAutoFill(e.target.checked)}
                          className="mr-2"
                        />
                        <label htmlFor="autoFill" className="text-steam-textPrimary cursor-pointer">
                          {t('artworkShowcase:videoToGif.autoFill')}
                        </label>
                      </div>

                    </div>
                  )}
                  
                  {!keepAspectRatio && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-steam-textMuted text-sm mb-2">{t('artworkShowcase:videoToGif.widthPx')}</label>
                        <input
                          type="number"
                          value={width}
                          onChange={(e) => setWidth(Number(e.target.value))}
                          className="w-full bg-steam-item-in border border-steam-gray text-steam-textPrimary rounded px-3 py-2"
                          min="100"
                          max="800"
                        />
                      </div>
                      <div>
                        <label className="block text-steam-textMuted text-sm mb-2">{t('artworkShowcase:videoToGif.heightPx')}</label>
                        <input
                          type="number"
                          value={height}
                          onChange={(e) => setHeight(Number(e.target.value))}
                          className="w-full bg-steam-item-in border border-steam-gray text-steam-textPrimary rounded px-3 py-2"
                          min="100"
                          max="600"
                        />
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-steam-textMuted text-sm mb-2">{t('artworkShowcase:videoToGif.frameRateQuality')}</label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={quality}
                      onChange={(e) => setQuality(Number(e.target.value))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-steam-textMuted mt-1">
                      <span>{t('artworkShowcase:videoToGif.lowSmooth')}</span>
                      <span>{quality}</span>
                      <span>{t('artworkShowcase:videoToGif.highClear')}</span>
                    </div>
                  </div>

                  <div className="p-3 bg-blue-900/20 border border-blue-500/30 rounded">
                     <p className="text-blue-400 text-sm font-medium mb-1">💡 {t('artworkShowcase:videoToGif.tipTitle')}</p>
                     <p className="text-blue-300 text-xs">
                       {t('artworkShowcase:videoToGif.tipText')}
                     </p>
                   </div>

                  <div className="flex justify-center pt-4">
                    <button
                      onClick={handleStep1Complete}
                      className="bg-steam-primary text-steam-dark px-6 py-3 rounded hover:bg-steam-secondary transition-colors"
                    >
                      {t('artworkShowcase:videoToGif.confirmParam')}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 第二步：视频上传 */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="bg-steam-item rounded p-6 border-2 border-dashed border-steam-gray hover:border-steam-primary transition-colors">
                  <div className="text-center">
                     <svg className="w-12 h-12 mx-auto text-steam-textMuted mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                     </svg>
                     <p className="text-steam-textPrimary font-medium mb-2">{t('artworkShowcase:videoToGif.step2Title')}</p>
                   <p className="text-steam-textMuted text-sm mb-4">{t('artworkShowcase:videoToGif.formatsSupport')}</p>
                   <input
                     type="file"
                     accept="video/*"
                     onChange={handleFileSelect}
                     className="hidden"
                     id="video-upload"
                   />
                   <label
                     htmlFor="video-upload"
                     className="bg-steam-primary text-steam-dark px-4 py-2 rounded hover:bg-steam-secondary transition-colors cursor-pointer"
                   >
                     {t('artworkShowcase:videoToGif.selectFile')}
                   </label>
                   {selectedFile && (
                     <div className="text-steam-textSecondary text-sm mt-2">
                       <p>{t('artworkShowcase:videoToGif.selectedFile')}: {selectedFile.name}</p>
                       <p>{t('artworkShowcase:videoToGif.fileSize')}: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                     </div>
                   )}
                  </div>
                </div>

                {/* 重新上传按钮 */}
                <div className="flex justify-center">
                  <button
                    onClick={handleRestart}
                    className="text-steam-textSecondary hover:text-steam-textPrimary flex items-center"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                    </svg>
                    {t('artworkShowcase:videoToGif.reUpload')}
                  </button>
                </div>
              </div>
            )}

            {/* 第三步：生成GIF */}
            {currentStep === 3 && (
              <div className="space-y-6">
                {/* 视频预览 */}
                {videoUrl && (
                  <div className="bg-steam-item rounded p-4">
                    <h3 className="text-lg font-medium text-steam-textPrimary mb-4">{t('artworkShowcase:videoToGif.videoPreview')}</h3>
                    <video
                      ref={videoRef}
                      src={videoUrl}
                      className="w-full h-auto rounded"
                      controls
                      muted
                      playsInline
                    />
                  </div>
                )}

                {/* 生成按钮 */}
                {!conversionResult?.success && (
                  <div className="bg-steam-item rounded p-6 border-2 border-green-500/30">
                    <div className="flex justify-center">
                      <button
                        onClick={handleGenerateGif}
                        disabled={isConverting || !ffmpegLoaded}
                        className={`px-8 py-4 rounded-lg transition-colors text-lg font-medium ${
                          isConverting || !ffmpegLoaded
                            ? 'bg-steam-gray text-steam-textMuted cursor-not-allowed'
                            : 'bg-green-600 text-white hover:bg-green-700 shadow-lg'
                        }`}
                      >
                        {isConverting ? (
                          <span className="flex items-center">
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            {t('artworkShowcase:videoToGif.generating')}
                          </span>
                        ) : (
                          <span className="flex items-center">
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                            </svg>
                            {t('artworkShowcase:videoToGif.generateGif')}
                          </span>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Loading/Progress */}
                {(isConverting || !ffmpegLoaded) && (
                  <div className="bg-steam-item rounded p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-steam-textPrimary">{!ffmpegLoaded ? t('artworkShowcase:videoToGif.loadingCore') : t('artworkShowcase:videoToGif.conversionProgress')}</span>
                    </div>
                    <p className="text-steam-textMuted text-sm">
                      {!ffmpegLoaded ? ffmpegLoadingMessage : conversionProgress?.message}
                    </p>
                  </div>
                )}
                
                {/* Error Message */}
                {error && (
                  <div className="bg-red-900/20 border border-red-500/30 rounded p-4">
                      <p className="text-red-400 text-sm font-medium mb-2">❌ {t('artworkShowcase:videoToGif.errorTitle')}</p>
                      <p className="text-red-300 text-sm">{error}</p>
                  </div>
                )}

                {/* GIF 结果和五等分功能 */}
                {conversionResult?.success && (
                  <div className="space-y-6">
                    {/* GIF 预览 */}
                    <div className="bg-steam-item rounded p-6">
                      <h3 className="text-lg font-medium text-steam-textPrimary mb-4">{t('artworkShowcase:videoToGif.fullGifResult')}</h3>
                      {conversionResult.gifUrl && (
                        <div className="bg-steam-item-in rounded p-3">
                          <img 
                            src={conversionResult.gifUrl} 
                            alt={t('artworkShowcase:videoToGif.convertedGifAlt')}
                            className="max-w-full h-auto rounded"
                          />
                        </div>
                      )}
                    </div>

                    {/* 五等分功能 */}
                    <div className="bg-steam-item rounded p-6">
                      <h3 className="text-lg font-medium text-steam-textPrimary mb-4">{t('artworkShowcase:videoToGif.fiveSplitTitle')}</h3>
                      <div className="space-y-4">
                        <p className="text-steam-textMuted text-sm">
                          {t('artworkShowcase:videoToGif.fiveSplitDesc')}
                        </p>
                        

                        
                        <div className="flex justify-center">
                          {!splitResult?.success && !isSplitting && (
                            <button
                              onClick={handleGenerateFiveSplitGifs}
                              className="bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700 transition-colors"
                            >
                              <svg className="w-5 h-5 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                              </svg>
                              {t('artworkShowcase:videoToGif.generateFiveSplit')}
                            </button>
                          )}
                        </div>

                        {/* 五等分进度 */}
                        {isSplitting && (
                          <div className="bg-steam-item-in rounded p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-steam-textPrimary">{t('artworkShowcase:videoToGif.fiveSplitProgress')}</span>
                              <span className="text-steam-textSecondary">
                                {splitProgress?.currentPart || 0}/{splitProgress?.totalParts || 5} 
                                ({splitProgress?.percentage || 0}%)
                              </span>
                            </div>
                            <p className="text-steam-textMuted text-sm">
                              {splitProgress?.message || t('artworkShowcase:videoToGif.processing')}
                            </p>
                          </div>
                        )}

                        {/* 五等分错误 */}
                        {splitError && (
                          <div className="bg-red-900/20 border border-red-500/30 rounded p-4">
                            <p className="text-red-400 text-sm font-medium mb-2">❌ {t('artworkShowcase:videoToGif.fiveSplitError')}</p>
                            <p className="text-red-300 text-sm">{splitError}</p>
                          </div>
                        )}

                        {/* 五等分结果预览 */}
                        {splitResult?.success && splitResult.splitGifUrls && (
                          <div className="space-y-4">
                            <h4 className="text-steam-textPrimary font-medium">{t('artworkShowcase:videoToGif.fiveSplitPreview')}</h4>
                            <div className="bg-steam-item-in rounded p-3">
                              <div className="flex gap-2">
                                {splitResult.splitGifUrls.map((gifUrl, index) => (
                                  <div key={index} className="flex-1">
                                    <img 
                                      src={gifUrl} 
                                      alt={`Part ${index + 1}`} 
                                      className="max-w-full h-auto rounded"
                                    />
                                    <p className="text-center text-xs text-steam-textMuted mt-1">{t('artworkShowcase:videoToGif.partLabel', { n: index + 1 })}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 下载按钮 */}
                    <div className="bg-steam-item rounded p-6">
                      <h3 className="text-lg font-medium text-steam-textPrimary mb-4">{t('artworkShowcase:videoToGif.downloadOptions')}</h3>
                      <div className="flex justify-center space-x-4">
                        {conversionResult.gifUrl && (
                          <button
                            onClick={() => {
                              downloadGif(conversionResult.gifUrl!, 'converted.gif');
                            }}
                            className="bg-steam-primary text-steam-dark px-6 py-3 rounded hover:bg-steam-secondary transition-colors"
                          >
                            <svg className="w-5 h-5 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                            </svg>
                            {t('artworkShowcase:videoToGif.downloadFullGif')}
                          </button>
                        )}
                        
                        {splitResult?.success && splitResult.splitGifUrls && (
                          <button
                            onClick={handleDownloadSplitParts}
                            className="bg-green-600 text-white px-6 py-3 rounded hover:bg-green-700 transition-colors"
                          >
                            <svg className="w-5 h-5 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                            </svg>
                            {t('artworkShowcase:videoToGif.downloadFiveSplit')}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* 进入步骤四按钮 */}
                    <div className="flex justify-center">
                      <button
                        onClick={handleStep3Complete}
                        className="bg-purple-600 text-white px-6 py-3 rounded hover:bg-purple-700 transition-colors"
                      >
                        <svg className="w-5 h-5 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                        </svg>
                        {t('artworkShowcase:videoToGif.viewUploadTutorial')}
                      </button>
                    </div>
                  </div>
                )}

                {/* 重新上传按钮 */}
                <div className="flex justify-center">
                  <button
                    onClick={handleRestart}
                    className="text-steam-textSecondary hover:text-steam-textPrimary flex items-center"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                    </svg>
                    {t('artworkShowcase:videoToGif.reUpload')}
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Upload tutorial (MDX) */}
            {currentStep === 4 && <UploadTutorialSection locale={locale} />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoToGifTool;