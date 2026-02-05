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
   ============================================================================== */

/**
 * Simple syntax highlighting using regex patterns.
 * Uses De Stijl primary colors: red for keywords, blue for tags/strings, yellow for attributes.
 */
function highlightCode(code: string): string {
  let highlighted = code;
  
  // Process string patterns first to avoid highlighting inside strings
  const stringPlaceholders: string[] = [];
  highlighted = highlighted.replace(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g, (match) => {
    const placeholder = `__STRING_${stringPlaceholders.length}__`;
    stringPlaceholders.push(`<span class="text-[var(--destijl-blue)]">${match}</span>`);
    return placeholder;
  });

  // Process comments
  const commentPlaceholders: string[] = [];
  highlighted = highlighted.replace(/(\/\/[^\n]*|\/\*[\s\S]*?\*\/|\{\/\*[\s\S]*?\*\/\})/g, (match) => {
    const placeholder = `__COMMENT_${commentPlaceholders.length}__`;
    commentPlaceholders.push(`<span class="opacity-50">${match}</span>`);
    return placeholder;
  });

  // Keywords
  highlighted = highlighted.replace(
    /\b(import|export|from|function|return|const|let|var|if|else|for|while|class|extends|new|this|typeof|instanceof)\b/g,
    '<span class="text-[var(--destijl-red)]">$1</span>'
  );

  // JSX tags
  highlighted = highlighted.replace(
    /(<\/?)([\w.]+)/g,
    '<span class="opacity-50">$1</span><span class="text-[var(--destijl-blue)]">$2</span>'
  );

  // JSX attributes
  highlighted = highlighted.replace(
    /\s(className|src|name|target|duration|style|volume|barColor|barWidth|barGap|start|id|loop)=/g,
    ' <span class="text-[var(--destijl-yellow)]">$1</span>='
  );

  // Numbers
  highlighted = highlighted.replace(
    /\b(\d+(?:\.\d+)?)\b/g,
    '<span class="text-[var(--destijl-yellow)]">$1</span>'
  );

  // Restore strings and comments
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
      name: '16:9 Landscape',
      dimensions: '1920 × 1080',
      containerClass: 'aspect-video max-w-[480px]',
      timelineClass: 'w-[1920px] h-[1080px]',
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
      name: '9:16 Portrait',
      dimensions: '1080 × 1920',
      containerClass: 'aspect-[9/16] max-w-[200px]',
      timelineClass: 'w-[1080px] h-[1920px]',
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
      <Text className="absolute bottom-16 inset-x-6
                       text-emerald-400 text-2xl font-semibold
                       text-center">
        Swipe up ↑
      </Text>
    </Timegroup>
  );
}`,
    },
    square: {
      name: '1:1 Square',
      dimensions: '1080 × 1080',
      containerClass: 'aspect-square max-w-[300px]',
      timelineClass: 'w-[1080px] h-[1080px]',
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
      <div className="absolute inset-0 bg-gradient-to-t 
                      from-black/60 to-transparent" />
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
      // Fallback for older browsers
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
    <div className="relative">
      {/* Template selector - Bauhaus tabs */}
      <div className="flex items-center justify-start gap-0 mb-0">
        {(Object.keys(templates) as Array<keyof typeof templates>).map((templateId, index) => (
          <button
            key={templateId}
            onClick={() => handleTemplateChange(templateId)}
            className={`px-6 py-4 text-xs font-bold uppercase tracking-wider transition-colors border-4 border-black dark:border-white ${
              index > 0 ? 'border-l-0' : ''
            } ${
              selectedTemplate === templateId
                ? 'bg-[var(--destijl-blue)] text-white'
                : 'bg-white dark:bg-[#0a0a0a] hover:bg-[var(--destijl-yellow)] hover:text-black'
            }`}
          >
            {templates[templateId].name}
          </button>
        ))}
        <Link
          to="/docs/quickstart"
          className="ml-auto px-6 py-4 text-xs font-bold uppercase tracking-wider bg-[var(--destijl-red)] text-white hover:bg-black transition-colors border-4 border-black dark:border-white"
        >
          Get started
        </Link>
      </div>
      
      {/* Playground container - Bold borders with texture */}
      <div className="border-4 border-t-0 border-black dark:border-white bg-white dark:bg-[#0a0a0a]">
        {/* Window chrome - Geometric with ink texture */}
        <div className="flex items-center border-b-4 border-black dark:border-white">
          <div className="flex">
            <div className="w-4 h-4 bg-[var(--destijl-red)]" style={{boxShadow: 'inset 0 0 8px rgba(0,0,0,0.15)'}} />
            <div className="w-4 h-4 bg-[var(--destijl-yellow)]" style={{boxShadow: 'inset 0 0 8px rgba(0,0,0,0.1)'}} />
            <div className="w-4 h-4 bg-[var(--destijl-blue)]" style={{boxShadow: 'inset 0 0 8px rgba(0,0,0,0.15)'}} />
          </div>
          <div className="flex-1 flex items-center justify-center gap-4 px-4 py-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em]">composition.tsx</span>
            <span className="opacity-30">|</span>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em]">preview</span>
          </div>
        </div>
        
        {/* Editor + Preview */}
        <div className="grid md:grid-cols-2 min-h-[450px]">
          {/* Code editor */}
          <div className="relative p-4 bg-black font-mono text-sm overflow-auto border-r-0 md:border-r-4 border-black dark:border-white">
            {/* Copy button */}
            <button
              onClick={handleCopyCode}
              className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-[var(--destijl-red)] transition-colors z-10"
              title="Copy code"
            >
              {copied ? (
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                  <path strokeLinecap="square" strokeLinejoin="miter" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="square" strokeLinejoin="miter" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </button>
            
            <pre 
              className={`text-white/90 leading-relaxed transition-opacity duration-150 ${
                isTransitioning ? 'opacity-0' : 'opacity-100'
              }`}
            >
              <code 
                dangerouslySetInnerHTML={{ __html: highlightCode(currentTemplate.code) }}
              />
            </pre>
          </div>
          
          {/* Live Preview with actual Editframe components */}
          <div 
            className={`bg-gray-100 dark:bg-[#111] flex flex-col transition-opacity duration-150 ${
              isTransitioning ? 'opacity-0' : 'opacity-100'
            }`}
          >
            {isClient ? (
              <Preview id={previewId} loop className="flex-1 flex flex-col">
                {/* Video preview area */}
                <div className="flex-1 flex items-center justify-center p-4 bg-black min-h-[280px]">
                  <div className={`${currentTemplate.containerClass} w-full`}>
                    <Timegroup 
                      mode="contain" 
                      className="w-full h-full relative bg-black"
                    >
                      <Video
                        src={currentTemplate.videoSrc}
                        className="size-full object-contain"
                      />
                      {selectedTemplate === 'landscape' && (
                        <Text className="absolute bottom-4 inset-x-4 text-white text-lg font-black uppercase tracking-wider text-center">
                          16:9 Landscape
                        </Text>
                      )}
                      {selectedTemplate === 'portrait' && (
                        <>
                          <Text className="absolute top-6 inset-x-3 text-white text-base font-black uppercase tracking-wider text-center">
                            9:16 Portrait
                          </Text>
                          <Text className="absolute bottom-6 inset-x-3 text-[var(--destijl-yellow)] text-sm font-bold uppercase tracking-wider text-center">
                            Swipe up
                          </Text>
                        </>
                      )}
                      {selectedTemplate === 'square' && (
                        <>
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                          <Text className="absolute bottom-4 inset-x-3 text-white text-base font-black uppercase tracking-wider text-center">
                            1:1 Square
                          </Text>
                        </>
                      )}
                    </Timegroup>
                  </div>
                </div>
                
                {/* Filmstrip */}
                <div className="h-16 bg-black border-t-2 border-white/20">
                  <Filmstrip autoScale className="w-full h-full" />
                </div>
              </Preview>
            ) : (
              /* SSR fallback */
              <div className="flex-1 flex items-center justify-center bg-black">
                <div className="text-white/50 text-xs font-bold uppercase tracking-wider">Loading...</div>
              </div>
            )}
            
            {/* Format info */}
            <div className="px-4 py-3 bg-white dark:bg-[#0a0a0a] border-t-4 border-black dark:border-white">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-center">
                <span>{currentTemplate.dimensions}</span>
                <span className="mx-3 opacity-30">|</span>
                <span className="opacity-60">{currentTemplate.description}</span>
              </p>
            </div>
          </div>
        </div>
        
        {/* Playback Controls - Geometric */}
        <div className="border-t-4 border-black dark:border-white">
          {isClient ? (
            <div className="flex items-center">
              {/* Play/Pause toggle */}
              <TogglePlay target={previewId}>
                <button
                  slot="pause"
                  className="w-12 h-12 flex items-center justify-center bg-[var(--destijl-red)] hover:bg-[var(--destijl-blue)] transition-colors"
                >
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                  </svg>
                </button>
                <button
                  slot="play"
                  className="w-12 h-12 flex items-center justify-center bg-[var(--destijl-blue)] hover:bg-[var(--destijl-red)] transition-colors"
                >
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </button>
              </TogglePlay>
              
              {/* Scrubber */}
              <div className="flex-1 px-4 border-l-4 border-black dark:border-white h-12 flex items-center">
                <Scrubber 
                  target={previewId}
                  className="w-full h-2 bg-gray-200 dark:bg-white/20 cursor-pointer [&::part(progress)]:bg-[var(--destijl-red)] [&::part(thumb)]:bg-[var(--destijl-red)] [&::part(thumb)]:w-4 [&::part(thumb)]:h-4"
                />
              </div>
              
              {/* Time display */}
              <div className="px-4 border-l-4 border-black dark:border-white h-12 flex items-center">
                <TimeDisplay 
                  target={previewId}
                  className="text-[10px] font-bold font-mono tabular-nums uppercase tracking-wider"
                />
              </div>
            </div>
          ) : (
            /* SSR fallback controls */
            <div className="flex items-center">
              <div className="w-12 h-12 flex items-center justify-center bg-[var(--destijl-blue)]">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
              <div className="flex-1 px-4 border-l-4 border-black dark:border-white h-12 flex items-center">
                <div className="w-full h-2 bg-gray-200 dark:bg-white/20" />
              </div>
              <div className="px-4 border-l-4 border-black dark:border-white h-12 flex items-center">
                <span className="text-[10px] font-bold font-mono uppercase tracking-wider">0:00 / 0:00</span>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Mobile fallback message */}
      <div className="md:hidden mt-4 text-center">
        <p className="text-xs font-bold uppercase tracking-wider opacity-60">
          For full experience,{' '}
          <Link to="/docs/quickstart" className="text-[var(--destijl-blue)] hover:underline">
            get started
          </Link>
        </p>
      </div>
    </div>
  );
}

export default InteractivePlayground;
export { InteractivePlayground };
