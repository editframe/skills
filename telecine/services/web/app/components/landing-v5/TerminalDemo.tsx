import { useState, useEffect, useRef, useCallback } from "react";

/* ==============================================================================
   COMPONENT: TerminalDemo
   
   Purpose: Show the getting started flow. Make it feel fast and easy.
   
   Animation sequence:
   1. Type: npm create @editframe@latest
   2. Show prompts and answers appearing
   3. Show success messages
   4. Type: cd my-video-app && npm run dev
   5. Show server ready message
   6. Loop after 5 second pause
   
   Technical approach:
   - CSS transitions for fade-in effects
   - requestAnimationFrame for smooth typing
   - Respects prefers-reduced-motion
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
      { text: '✓ Created my-video-app/', className: 'text-slate-400 [&>span:first-child]:text-emerald-400', delay: 0 },
      { text: '✓ Installed dependencies', className: 'text-slate-400 [&>span:first-child]:text-emerald-400', delay: 400 },
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
      { text: '✓ Dev server ready', className: 'text-emerald-400', delay: 0 },
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
  
  const animationRef = useRef<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  // Check for reduced motion preference
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

  // Main animation loop
  useEffect(() => {
    if (prefersReducedMotion) {
      // Show everything immediately for reduced motion
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
      // Animation complete, restart after brief pause
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
        // Typing complete for this command
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
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [currentStepIndex, typedText, visibleOutputs, prefersReducedMotion, resetAnimation]);

  // Build the rendered content
  const renderContent = () => {
    const elements: React.ReactNode[] = [];
    let commandIndex = 0;

    ANIMATION_STEPS.forEach((step, stepIndex) => {
      if (step.type === 'type') {
        const command = commands[commandIndex];
        if (command) {
          elements.push(
            <div key={`cmd-${stepIndex}`} className="flex items-center">
              <span className="text-[var(--destijl-red)] font-bold">$</span>
              <span className="text-white ml-2">
                {command.text}
                {!command.complete && (
                  <span className="inline-block w-2 h-4 bg-[var(--destijl-red)] ml-0.5 animate-[blink_1s_step-end_infinite]" />
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
                
                // Handle checkmark prefix specially
                if (line.text.startsWith('✓')) {
                  return (
                    <p 
                      key={lineIndex} 
                      className={`text-white/70 animate-[fadeIn_0.2s_ease-out]`}
                    >
                      <span className="text-[var(--destijl-blue)] font-bold">✓</span>
                      {line.text.slice(1)}
                    </p>
                  );
                }
                
                // Handle URLs
                if (line.text.includes('http://')) {
                  const parts = line.text.split(/(http:\/\/[^\s]+)/);
                  return (
                    <p 
                      key={lineIndex} 
                      className={`text-white/70 animate-[fadeIn_0.2s_ease-out]`}
                    >
                      {parts.map((part, i) => 
                        part.startsWith('http://') 
                          ? <span key={i} className="text-[var(--destijl-blue)]">{part}</span>
                          : part
                      )}
                    </p>
                  );
                }
                
                // Handle prompt lines with answers
                if (line.text.startsWith('?')) {
                  const colonIndex = line.text.indexOf(':');
                  if (colonIndex > -1) {
                    return (
                      <p 
                        key={lineIndex} 
                        className={`text-white/70 animate-[fadeIn_0.2s_ease-out]`}
                      >
                        {line.text.slice(0, colonIndex + 1)}
                        <span className="text-white font-bold">{line.text.slice(colonIndex + 1)}</span>
                      </p>
                    );
                  }
                }
                
                return (
                  <p 
                    key={lineIndex} 
                    className={`text-white/70 animate-[fadeIn_0.2s_ease-out]`}
                  >
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
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(2px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-\\[blink_1s_step-end_infinite\\] {
            animation: none;
            opacity: 1;
          }
          .animate-\\[fadeIn_0\\.2s_ease-out\\] {
            animation: none;
          }
        }
      `}} />
      <div className="border-4 border-black dark:border-white bg-black relative">
        {/* Window chrome - Bauhaus geometric with ink texture */}
        <div className="flex items-center border-b-4 border-black dark:border-white">
          <div className="flex">
            <div className="w-4 h-4 bg-[var(--destijl-red)]" style={{boxShadow: 'inset 0 0 8px rgba(0,0,0,0.15)'}} />
            <div className="w-4 h-4 bg-[var(--destijl-yellow)]" style={{boxShadow: 'inset 0 0 8px rgba(0,0,0,0.1)'}} />
            <div className="w-4 h-4 bg-[var(--destijl-blue)]" style={{boxShadow: 'inset 0 0 8px rgba(0,0,0,0.15)'}} />
          </div>
          <span className="text-[10px] text-white font-bold uppercase tracking-[0.2em] px-4 py-2" style={{textShadow: '0 0 0.5px currentColor'}}>Terminal</span>
        </div>
        
        {/* Terminal content with subtle grain */}
        <div className="p-6 font-mono text-sm space-y-3 min-h-[280px] text-white" style={{textShadow: '0 0 0.5px rgba(255,255,255,0.5)'}}>
          {renderContent()}
        </div>
        
        {/* Subtle noise overlay for screen texture */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            mixBlendMode: 'soft-light'
          }}
        />
      </div>
    </div>
  );
}

export { TerminalDemo };
export default TerminalDemo;
