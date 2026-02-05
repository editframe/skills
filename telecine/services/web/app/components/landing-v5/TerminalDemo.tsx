import { useState, useEffect, useRef, useCallback } from "react";

/* ==============================================================================
   COMPONENT: TerminalDemo
   
   Purpose: Show the getting started flow. Make it feel fast and easy.
   
   Design: Clean terminal with subtle styling
   ============================================================================== */

type AnimationStep = 
  | { type: 'type'; text: string; speed?: number }
  | { type: 'output'; lines: OutputLine[]; delay?: number }
  | { type: 'pause'; duration: number };

type OutputLine = {
  text: string;
  className?: string;
  delay?: number;
};

const ANIMATION_STEPS: AnimationStep[] = [
  { type: 'type', text: 'npm create @editframe@latest', speed: 40 },
  { type: 'pause', duration: 400 },
  { 
    type: 'output', 
    lines: [
      { text: '? Project name: my-video-app', className: 'text-slate-500', delay: 0 },
      { text: '? Template: Social Clip', className: 'text-slate-500', delay: 300 },
    ],
    delay: 200
  },
  { type: 'pause', duration: 600 },
  {
    type: 'output',
    lines: [
      { text: '', className: 'h-2', delay: 0 },
      { text: 'Creating project...', className: 'text-slate-400', delay: 0 },
    ],
    delay: 100
  },
  { type: 'pause', duration: 800 },
  {
    type: 'output',
    lines: [
      { text: '✓ Created my-video-app/', delay: 0 },
      { text: '✓ Installed dependencies', delay: 400 },
    ],
    delay: 100
  },
  { type: 'pause', duration: 800 },
  { type: 'type', text: 'cd my-video-app && npm run dev', speed: 35 },
  { type: 'pause', duration: 600 },
  {
    type: 'output',
    lines: [
      { text: '', className: 'h-2', delay: 0 },
      { text: '✓ Dev server ready', delay: 0 },
      { text: '', className: 'h-1', delay: 200 },
      { text: 'Local:   http://localhost:3000', className: 'text-slate-500', delay: 400 },
      { text: 'Preview: http://localhost:3000/preview', className: 'text-slate-500', delay: 200 },
    ],
    delay: 300
  },
  { type: 'pause', duration: 5000 },
];

function TerminalDemo() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [typedText, setTypedText] = useState('');
  const [visibleOutputs, setVisibleOutputs] = useState<{ stepIndex: number; lineIndex: number }[]>([]);
  const [commands, setCommands] = useState<{ text: string; complete: boolean }[]>([]);
  
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const resetAnimation = useCallback(() => {
    setCurrentStepIndex(0);
    setTypedText('');
    setVisibleOutputs([]);
    setCommands([]);
    isTypingRef.current = false;
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) {
      const allCommands: { text: string; complete: boolean }[] = [];
      const allOutputs: { stepIndex: number; lineIndex: number }[] = [];
      
      ANIMATION_STEPS.forEach((step, stepIndex) => {
        if (step.type === 'type') {
          allCommands.push({ text: step.text, complete: true });
        } else if (step.type === 'output') {
          step.lines.forEach((_, lineIndex) => {
            allOutputs.push({ stepIndex, lineIndex });
          });
        }
      });
      
      setCommands(allCommands);
      setVisibleOutputs(allOutputs);
      return;
    }

    const step = ANIMATION_STEPS[currentStepIndex];
    if (!step) {
      timeoutRef.current = setTimeout(resetAnimation, 100);
      return;
    }

    if (step.type === 'type') {
      if (!isTypingRef.current) {
        isTypingRef.current = true;
        setCommands(prev => [...prev, { text: '', complete: false }]);
      }

      const targetText = step.text;
      const speed = step.speed ?? 50;
      
      if (typedText.length < targetText.length) {
        timeoutRef.current = setTimeout(() => {
          setTypedText(targetText.slice(0, typedText.length + 1));
          setCommands(prev => {
            const newCommands = [...prev];
            if (newCommands.length > 0) {
              newCommands[newCommands.length - 1] = {
                text: targetText.slice(0, typedText.length + 1),
                complete: false
              };
            }
            return newCommands;
          });
        }, speed);
      } else {
        setCommands(prev => {
          const newCommands = [...prev];
          const lastCommand = newCommands[newCommands.length - 1];
          if (lastCommand) {
            lastCommand.complete = true;
          }
          return newCommands;
        });
        setTypedText('');
        isTypingRef.current = false;
        setCurrentStepIndex(prev => prev + 1);
      }
    } else if (step.type === 'output') {
      const stepOutputs = visibleOutputs.filter(o => o.stepIndex === currentStepIndex);
      const nextLineIndex = stepOutputs.length;
      
      if (nextLineIndex < step.lines.length) {
        const line = step.lines[nextLineIndex];
        const delay = nextLineIndex === 0 ? (step.delay ?? 0) : (line?.delay ?? 100);
        
        timeoutRef.current = setTimeout(() => {
          setVisibleOutputs(prev => [...prev, { stepIndex: currentStepIndex, lineIndex: nextLineIndex }]);
        }, delay);
      } else {
        setCurrentStepIndex(prev => prev + 1);
      }
    } else if (step.type === 'pause') {
      timeoutRef.current = setTimeout(() => {
        setCurrentStepIndex(prev => prev + 1);
      }, step.duration);
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [currentStepIndex, typedText, visibleOutputs, prefersReducedMotion, resetAnimation]);

  const renderContent = () => {
    const elements: React.ReactNode[] = [];
    let commandIndex = 0;

    ANIMATION_STEPS.forEach((step, stepIndex) => {
      if (step.type === 'type') {
        const command = commands[commandIndex];
        if (command) {
          elements.push(
            <div key={`cmd-${stepIndex}`} className="flex items-center">
              <span className="text-[var(--accent-gold)] font-semibold">$</span>
              <span className="text-white ml-2">
                {command.text}
                {!command.complete && (
                  <span className="inline-block w-2 h-4 bg-white ml-0.5 animate-pulse" />
                )}
              </span>
            </div>
          );
          commandIndex++;
        }
      } else if (step.type === 'output') {
        const stepOutputs = visibleOutputs.filter(o => o.stepIndex === stepIndex);
        if (stepOutputs.length > 0) {
          elements.push(
            <div key={`output-${stepIndex}`} className="space-y-1">
              {stepOutputs.map(({ lineIndex }) => {
                const line = step.lines[lineIndex];
                if (!line) return null;
                
                if (!line.text) {
                  return <div key={lineIndex} className={line.className} />;
                }
                
                if (line.text.startsWith('✓')) {
                  return (
                    <p key={lineIndex} className="text-white/70">
                      <span className="text-emerald-400">✓</span>
                      {line.text.slice(1)}
                    </p>
                  );
                }
                
                if (line.text.includes('http://')) {
                  const parts = line.text.split(/(http:\/\/[^\s]+)/);
                  return (
                    <p key={lineIndex} className="text-white/70">
                      {parts.map((part, i) => 
                        part.startsWith('http://') 
                          ? <span key={i} className="text-[var(--accent-blue)]">{part}</span>
                          : part
                      )}
                    </p>
                  );
                }
                
                if (line.text.startsWith('?')) {
                  const colonIndex = line.text.indexOf(':');
                  if (colonIndex > -1) {
                    return (
                      <p key={lineIndex} className="text-white/70">
                        {line.text.slice(0, colonIndex + 1)}
                        <span className="text-white font-medium">{line.text.slice(colonIndex + 1)}</span>
                      </p>
                    );
                  }
                }
                
                return (
                  <p key={lineIndex} className="text-white/70">
                    {line.text}
                  </p>
                );
              })}
            </div>
          );
        }
      }
    });

    return elements;
  };

  return (
    <div className="w-full">
      <div className="bg-[#1a1a1a] rounded-lg overflow-hidden shadow-print-lg">
        {/* Window chrome */}
        <div className="flex items-center gap-2 px-4 py-3 bg-[#252525] border-b border-white/10">
          <div className="w-3 h-3 rounded-full bg-[var(--poster-red)]" />
          <div className="w-3 h-3 rounded-full bg-[var(--poster-gold)]" />
          <div className="w-3 h-3 rounded-full bg-[var(--poster-green)]" />
          <span className="ml-4 text-xs text-white/50">Terminal</span>
        </div>
        
        {/* Terminal content */}
        <div className="p-6 font-mono text-sm space-y-2 min-h-[280px] text-white">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

export { TerminalDemo };
export default TerminalDemo;
