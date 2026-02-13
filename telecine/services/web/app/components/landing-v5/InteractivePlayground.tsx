/* ==============================================================================
   COMPONENT: InteractivePlayground
   
   Purpose: Let visitors experience the development flow. Editable code in
   Monaco editor, live preview via EFPlayer pattern (dangerouslySetInnerHTML
   into a Preview). Template switching for different aspect ratios.
   
   Design: Clean editor/preview split with subtle styling
   ============================================================================== */

import { useState, useEffect, useId, useCallback, useRef } from "react";
import { Link } from "react-router";
import {
  Preview,
  Scrubber,
  TogglePlay,
  TimeDisplay,
  Filmstrip,
} from "@editframe/react";
import { CodeEditor } from "~/components/CodeEditor";
import { ExportButton } from "./ExportButton";

const VIDEO_SRC = "https://assets.editframe.com/bars-n-tone.mp4";

interface Template {
  name: string;
  dimensions: string;
  containerClass: string;
  description: string;
  code: string;
}

const templates: Record<string, Template> = {
  landscape: {
    name: '16:9',
    dimensions: '1920 × 1080',
    containerClass: 'aspect-video max-w-[480px]',
    description: 'YouTube, presentations',
    code: `<ef-timegroup mode="contain" style="width:100%;height:100%;position:relative">
  <ef-video
    src="${VIDEO_SRC}"
    style="width:100%;height:100%;object-fit:contain"
  ></ef-video>
  <ef-text
    style="position:absolute;bottom:1rem;left:1rem;right:1rem;
           color:white;font-size:1.2rem;font-weight:700;
           text-align:center;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.8))"
  >16:9 Landscape Format</ef-text>
</ef-timegroup>`,
  },
  portrait: {
    name: '9:16',
    dimensions: '1080 × 1920',
    containerClass: 'aspect-[9/16] max-w-[200px]',
    description: 'TikTok, Reels, Shorts',
    code: `<ef-timegroup mode="contain" style="width:100%;height:100%;position:relative">
  <ef-video
    src="${VIDEO_SRC}"
    style="width:100%;height:100%;object-fit:cover"
  ></ef-video>
  <ef-text
    style="position:absolute;top:2rem;left:0.75rem;right:0.75rem;
           color:white;font-size:1.4rem;font-weight:900;
           text-align:center;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.8))"
  >9:16 Portrait</ef-text>
</ef-timegroup>`,
  },
  square: {
    name: '1:1',
    dimensions: '1080 × 1080',
    containerClass: 'aspect-square max-w-[300px]',
    description: 'Instagram, LinkedIn',
    code: `<ef-timegroup mode="contain" style="width:100%;height:100%;position:relative">
  <ef-video
    src="${VIDEO_SRC}"
    style="width:100%;height:100%;object-fit:cover"
  ></ef-video>
  <div style="position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,0.6),transparent)"></div>
  <ef-text
    style="position:absolute;bottom:1rem;left:0.75rem;right:0.75rem;
           color:white;font-size:1.1rem;font-weight:600;
           text-align:center"
  >1:1 Square Format</ef-text>
</ef-timegroup>`,
  },
};

function InteractivePlayground() {
  const id = useId();
  const [selectedTemplate, setSelectedTemplate] = useState<string>('landscape');
  const [code, setCode] = useState(templates.landscape!.code);
  const [liveCode, setLiveCode] = useState(templates.landscape!.code);
  const [copied, setCopied] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const previewRef = useRef<HTMLElement>(null);
  
  const previewId = `playground-preview-${id}`;
  
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  const currentTemplate = templates[selectedTemplate]!;
  
  const handleTemplateChange = useCallback((templateId: string) => {
    if (templateId === selectedTemplate) return;
    setSelectedTemplate(templateId);
    const newCode = templates[templateId]!.code;
    setCode(newCode);
    setLiveCode(newCode);
  }, [selectedTemplate]);
  
  const handleCodeChange = useCallback((value: string | undefined) => {
    if (value !== undefined) {
      setCode(value);
      setLiveCode(value);
    }
  }, []);
  
  const handleCopyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = code;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [code]);
  
  return (
    <div>
      {/* Format selector */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          {Object.entries(templates).map(([templateId, tmpl]) => (
            <button
              key={templateId}
              onClick={() => handleTemplateChange(templateId)}
              className={`px-4 py-2 text-sm font-medium rounded transition-colors ${
                selectedTemplate === templateId
                  ? 'bg-[var(--accent-blue)] text-white'
                  : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {tmpl.name}
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
          <span className="ml-4 text-xs text-white/50">composition.html</span>
          <span className="mx-2 text-white/30">|</span>
          <span className="text-xs text-white/50">preview</span>
          <div className="flex-1" />
          <button
            onClick={handleCopyCode}
            className="p-2 text-white/50 hover:text-white transition-colors"
            title="Copy code"
          >
            {copied ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </button>
        </div>
        
        <div className="grid md:grid-cols-2 min-h-[450px]">
          {/* Code editor - real Monaco */}
          <div className="border-r border-white/10">
            <CodeEditor
              code={code}
              language="html"
              onChange={handleCodeChange}
              height={450}
              className="w-full h-[450px]"
            />
          </div>
          
          {/* Live Preview */}
          <div className="bg-[#111] flex flex-col">
            {isClient ? (
              <Preview id={previewId} ref={previewRef as any} loop className="flex-1 flex flex-col" key={liveCode}>
                <div className="flex-1 flex items-center justify-center p-4 bg-black min-h-[280px]">
                  <div className={`${currentTemplate.containerClass} w-full`}>
                    <div
                      className="w-full h-full"
                      dangerouslySetInnerHTML={{ __html: liveCode }}
                    />
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
                  className="w-full h-1.5 bg-white/20 rounded-full cursor-pointer [&::part(progress)]:bg-[var(--accent-red)] [&::part(progress)]:rounded-full [&::part(handle)]:bg-white [&::part(handle)]:w-3 [&::part(handle)]:h-3 [&::part(handle)]:rounded-full"
                />
              </div>
              
              <div className="px-4 border-l border-white/10 h-12 flex items-center">
                <TimeDisplay target={previewId} className="text-xs text-white/70 font-mono tabular-nums" />
              </div>
              
              <ExportButton
                compact
                getTarget={() => previewRef.current?.querySelector("ef-timegroup") as HTMLElement}
                name={`Playground (${currentTemplate.name})`}
                fileName={`playground-${selectedTemplate}.mp4`}
                renderOpts={{ includeAudio: true }}
                className="border-l border-white/10"
              />
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
