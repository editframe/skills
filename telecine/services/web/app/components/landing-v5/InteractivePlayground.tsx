import { useState, useEffect, useId } from "react";
import { Link } from "react-router";
import {
  Preview,
  Timegroup,
  Video,
  Text,
  Scrubber,
  TogglePlay,
  TimeDisplay,
  Filmstrip,
} from "@editframe/react";

/* ==============================================================================
   COMPONENT: InteractivePlayground
   
   Purpose: Let visitors experience the development flow using actual
   Editframe components with working playback controls.
   
   Design: Clean editor/preview split with subtle styling
   ============================================================================== */

function highlightCode(code: string): string {
  let highlighted = code;
  
  const stringPlaceholders: string[] = [];
  highlighted = highlighted.replace(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g, (match) => {
    const placeholder = `__STRING_${stringPlaceholders.length}__`;
    stringPlaceholders.push(`<span class="text-emerald-400">${match}</span>`);
    return placeholder;
  });

  const commentPlaceholders: string[] = [];
  highlighted = highlighted.replace(/(\/\/[^\n]*|\/\*[\s\S]*?\*\/|\{\/\*[\s\S]*?\*\/\})/g, (match) => {
    const placeholder = `__COMMENT_${commentPlaceholders.length}__`;
    commentPlaceholders.push(`<span class="opacity-50">${match}</span>`);
    return placeholder;
  });

  highlighted = highlighted.replace(
    /\b(import|export|from|function|return|const|let|var|if|else|for|while|class|extends|new|this|typeof|instanceof)\b/g,
    '<span class="text-[var(--accent-red)]">$1</span>'
  );

  highlighted = highlighted.replace(
    /(<\/?)([\w.]+)/g,
    '<span class="opacity-50">$1</span><span class="text-[var(--accent-blue)]">$2</span>'
  );

  highlighted = highlighted.replace(
    /\s(className|src|name|target|duration|style|volume|barColor|barWidth|barGap|start|id|loop|mode)=/g,
    ' <span class="text-[var(--accent-gold)]">$1</span>='
  );

  highlighted = highlighted.replace(
    /\b(\d+(?:\.\d+)?)\b/g,
    '<span class="text-[var(--accent-gold)]">$1</span>'
  );

  stringPlaceholders.forEach((str, i) => {
    highlighted = highlighted.replace(`__STRING_${i}__`, str);
  });
  commentPlaceholders.forEach((comment, i) => {
    highlighted = highlighted.replace(`__COMMENT_${i}__`, comment);
  });

  return highlighted;
}

function InteractivePlayground() {
  const id = useId();
  const [selectedTemplate, setSelectedTemplate] = useState<'landscape' | 'portrait' | 'square'>('landscape');
  const [copied, setCopied] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  const previewId = `playground-preview-${id}-${selectedTemplate}`;
  
  const templates = {
    landscape: {
      name: '16:9',
      dimensions: '1920 × 1080',
      containerClass: 'aspect-video max-w-[480px]',
      videoSrc: 'https://assets.editframe.com/bars-n-tone.mp4',
      description: 'YouTube, presentations',
      code: `import { Timegroup, Video, Text } from '@editframe/react';

export function LandscapeVideo() {
  return (
    <Timegroup mode="contain" className="w-[1920px] h-[1080px]">
      <Video 
        src="bars-n-tone.mp4"
        className="size-full object-contain"
      />
      <Text className="absolute bottom-8 inset-x-8
                       text-white text-4xl font-bold
                       text-center drop-shadow-lg">
        16:9 Landscape Format
      </Text>
    </Timegroup>
  );
}`,
    },
    portrait: {
      name: '9:16',
      dimensions: '1080 × 1920',
      containerClass: 'aspect-[9/16] max-w-[200px]',
      videoSrc: 'https://assets.editframe.com/bars-n-tone.mp4',
      description: 'TikTok, Reels, Shorts',
      code: `import { Timegroup, Video, Text } from '@editframe/react';

export function PortraitVideo() {
  return (
    <Timegroup mode="contain" className="w-[1080px] h-[1920px]">
      <Video 
        src="bars-n-tone.mp4"
        className="size-full object-cover"
      />
      <Text className="absolute top-16 inset-x-6
                       text-white text-5xl font-black
                       text-center drop-shadow-lg">
        9:16 Portrait
      </Text>
    </Timegroup>
  );
}`,
    },
    square: {
      name: '1:1',
      dimensions: '1080 × 1080',
      containerClass: 'aspect-square max-w-[300px]',
      videoSrc: 'https://assets.editframe.com/bars-n-tone.mp4',
      description: 'Instagram, LinkedIn',
      code: `import { Timegroup, Video, Text } from '@editframe/react';

export function SquareVideo() {
  return (
    <Timegroup mode="contain" className="w-[1080px] h-[1080px]">
      <Video 
        src="bars-n-tone.mp4"
        className="size-full object-cover"
      />
      <Text className="absolute bottom-8 inset-x-6
                       text-white text-3xl font-bold
                       text-center">
        1:1 Square Format
      </Text>
    </Timegroup>
  );
}`,
    },
  };
  
  const currentTemplate = templates[selectedTemplate];
  
  const handleTemplateChange = (templateId: 'landscape' | 'portrait' | 'square') => {
    if (templateId === selectedTemplate) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setSelectedTemplate(templateId);
      setTimeout(() => setIsTransitioning(false), 50);
    }, 150);
  };
  
  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(currentTemplate.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = currentTemplate.code;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  
  return (
    <div>
      {/* Format selector */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          {(Object.keys(templates) as Array<keyof typeof templates>).map((templateId) => (
            <button
              key={templateId}
              onClick={() => handleTemplateChange(templateId)}
              className={`px-4 py-2 text-sm font-medium rounded transition-colors ${
                selectedTemplate === templateId
                  ? 'bg-[var(--accent-blue)] text-white'
                  : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {templates[templateId].name}
            </button>
          ))}
        </div>
        <Link
          to="/docs/quickstart"
          className="px-4 py-2 text-sm font-semibold text-white bg-[var(--accent-red)] rounded hover:opacity-90 transition-opacity"
        >
          Get started
        </Link>
      </div>
      
      {/* Editor + Preview */}
      <div className="bg-[#1a1a1a] rounded-lg overflow-hidden">
        {/* Window chrome */}
        <div className="flex items-center gap-2 px-4 py-3 bg-[#252525] border-b border-white/10">
          <div className="w-3 h-3 rounded-full bg-[var(--poster-red)]" />
          <div className="w-3 h-3 rounded-full bg-[var(--poster-gold)]" />
          <div className="w-3 h-3 rounded-full bg-[var(--poster-green)]" />
          <span className="ml-4 text-xs text-white/50">composition.tsx</span>
          <span className="mx-2 text-white/30">|</span>
          <span className="text-xs text-white/50">preview</span>
        </div>
        
        <div className="grid md:grid-cols-2 min-h-[450px]">
          {/* Code editor */}
          <div className="relative p-4 font-mono text-sm overflow-auto border-r border-white/10">
            <button
              onClick={handleCopyCode}
              className="absolute top-4 right-4 p-2 text-white/50 hover:text-white transition-colors z-10"
              title="Copy code"
            >
              {copied ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </button>
            
            <pre 
              className={`text-white/90 leading-relaxed transition-opacity duration-150 ${
                isTransitioning ? 'opacity-0' : 'opacity-100'
              }`}
            >
              <code dangerouslySetInnerHTML={{ __html: highlightCode(currentTemplate.code) }} />
            </pre>
          </div>
          
          {/* Live Preview */}
          <div className={`bg-[#111] flex flex-col transition-opacity duration-150 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
            {isClient ? (
              <Preview id={previewId} loop className="flex-1 flex flex-col">
                <div className="flex-1 flex items-center justify-center p-4 bg-black min-h-[280px]">
                  <div className={`${currentTemplate.containerClass} w-full`}>
                    <Timegroup mode="contain" className="w-full h-full relative bg-black">
                      <Video src={currentTemplate.videoSrc} className="size-full object-contain" />
                      {selectedTemplate === 'landscape' && (
                        <Text className="absolute bottom-4 inset-x-4 text-white text-lg font-semibold text-center">
                          16:9 Landscape
                        </Text>
                      )}
                      {selectedTemplate === 'portrait' && (
                        <>
                          <Text className="absolute top-6 inset-x-3 text-white text-base font-bold text-center">
                            9:16 Portrait
                          </Text>
                          <Text className="absolute bottom-6 inset-x-3 text-[var(--accent-gold)] text-sm font-medium text-center">
                            Swipe up
                          </Text>
                        </>
                      )}
                      {selectedTemplate === 'square' && (
                        <>
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                          <Text className="absolute bottom-4 inset-x-3 text-white text-base font-semibold text-center">
                            1:1 Square
                          </Text>
                        </>
                      )}
                    </Timegroup>
                  </div>
                </div>
                
                <div className="h-16 bg-black border-t border-white/10">
                  <Filmstrip autoScale className="w-full h-full" />
                </div>
              </Preview>
            ) : (
              <div className="flex-1 flex items-center justify-center bg-black">
                <div className="text-white/50 text-xs">Loading...</div>
              </div>
            )}
            
            <div className="px-4 py-3 bg-[#1a1a1a] border-t border-white/10">
              <p className="text-xs text-white/50 text-center">
                <span>{currentTemplate.dimensions}</span>
                <span className="mx-2">·</span>
                <span>{currentTemplate.description}</span>
              </p>
            </div>
          </div>
        </div>
        
        {/* Playback Controls */}
        <div className="border-t border-white/10">
          {isClient ? (
            <div className="flex items-center">
              <TogglePlay target={previewId}>
                <button slot="pause" className="w-12 h-12 flex items-center justify-center bg-[var(--accent-red)] hover:brightness-110 transition-all">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                  </svg>
                </button>
                <button slot="play" className="w-12 h-12 flex items-center justify-center bg-[var(--accent-blue)] hover:brightness-110 transition-all">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </button>
              </TogglePlay>
              
              <div className="flex-1 px-4 h-12 flex items-center border-l border-white/10">
                <Scrubber 
                  target={previewId}
                  className="w-full h-1.5 bg-white/20 rounded-full cursor-pointer [&::part(progress)]:bg-[var(--accent-red)] [&::part(progress)]:rounded-full [&::part(thumb)]:bg-white [&::part(thumb)]:w-3 [&::part(thumb)]:h-3 [&::part(thumb)]:rounded-full"
                />
              </div>
              
              <div className="px-4 border-l border-white/10 h-12 flex items-center">
                <TimeDisplay target={previewId} className="text-xs text-white/70 font-mono tabular-nums" />
              </div>
            </div>
          ) : (
            <div className="flex items-center">
              <div className="w-12 h-12 flex items-center justify-center bg-[var(--accent-blue)]">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
              <div className="flex-1 px-4 border-l border-white/10 h-12 flex items-center">
                <div className="w-full h-1.5 bg-white/20 rounded-full" />
              </div>
              <div className="px-4 border-l border-white/10 h-12 flex items-center">
                <span className="text-xs text-white/70 font-mono">0:00 / 0:00</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default InteractivePlayground;
export { InteractivePlayground };
