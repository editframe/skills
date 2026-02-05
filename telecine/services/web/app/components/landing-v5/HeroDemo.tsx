/* ==============================================================================
   COMPONENT: HeroDemo
   
   Purpose: The centerpiece of the hero. Shows the product in action.
   This is NOT a placeholder image - it should be an actual working demo
   or at minimum an autoplay video.
   
   Implementation requirements:
   - Option A (ideal): Embedded mini-editor with live preview
     - Simplified code editor (read-only or limited editing)
     - Video preview that plays automatically
     - Timeline scrubbing interaction
   
   - Option B (acceptable): High-quality product video
     - Autoplay, muted, looped
     - Shows: code editing → instant preview → timeline scrubbing
     - 10-15 seconds, professionally produced
   
   - Option C (fallback): Animated mockup
     - CSS/JS animation showing the workflow
     - Better than a static screenshot
   
   Technical notes:
   - Must be performant - don't block page load
   - Lazy load video content
   - Provide poster image for initial paint
   ============================================================================== */

/**
 * CSS styles required for HeroDemo animations.
 * Include this in your page's style tag or global CSS.
 * 
 * ```css
 * @keyframes gradient-shift {
 *   0%, 100% { background-position: 0% 50%; }
 *   50% { background-position: 100% 50%; }
 * }
 * 
 * @keyframes blink-cursor {
 *   0%, 50% { opacity: 1; }
 *   51%, 100% { opacity: 0; }
 * }
 * 
 * @keyframes playhead-progress {
 *   0% { width: 0%; }
 *   100% { width: 100%; }
 * }
 * 
 * @keyframes preview-pulse {
 *   0%, 100% { 
 *     opacity: 1;
 *     box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
 *   }
 *   50% { 
 *     opacity: 0.9;
 *     box-shadow: 0 0 20px 4px rgba(16, 185, 129, 0.15);
 *   }
 * }
 * 
 * @keyframes scan-line {
 *   0% { transform: translateY(-100%); opacity: 0; }
 *   10% { opacity: 0.5; }
 *   90% { opacity: 0.5; }
 *   100% { transform: translateY(100%); opacity: 0; }
 * }
 * 
 * @keyframes play-button-pulse {
 *   0%, 100% { transform: scale(1); }
 *   50% { transform: scale(1.05); }
 * }
 * 
 * .animate-blink-cursor {
 *   animation: blink-cursor 1s step-end infinite;
 * }
 * 
 * .animate-playhead {
 *   animation: playhead-progress 12s linear infinite;
 * }
 * 
 * .animate-preview-pulse {
 *   animation: preview-pulse 3s ease-in-out infinite;
 * }
 * 
 * .animate-scan-line {
 *   animation: scan-line 4s linear infinite;
 * }
 * 
 * .play-button-hover:hover {
 *   animation: play-button-pulse 0.6s ease-in-out infinite;
 * }
 * 
 * .play-button-hover:hover .play-icon {
 *   transform: scale(1.1);
 * }
 * 
 * .animate-gradient {
 *   background-size: 200% 200%;
 *   animation: gradient-shift 8s ease infinite;
 * }
 * ```
 */

export function HeroDemo() {
  const codeLines = [
    { num: 1, content: <><span className="text-purple-400">import</span> {'{'} Timegroup, Video, Text {'}'} <span className="text-purple-400">from</span> <span className="text-emerald-400">'@editframe/react'</span>;</> },
    { num: 2, content: '' },
    { num: 3, content: <><span className="text-purple-400">export function</span> <span className="text-yellow-300">SocialClip</span>() {'{'}</> },
    { num: 4, content: <>&nbsp;&nbsp;<span className="text-purple-400">return</span> (</> },
    { num: 5, content: <>&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-blue-400">{'<Timegroup'}</span> <span className="text-sky-300">className</span>=<span className="text-emerald-400">"w-[1080px] h-[1920px]"</span><span className="text-blue-400">{'>'}</span></> },
    { num: 6, content: <>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-blue-400">{'<Video'}</span></> },
    { num: 7, content: <>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-sky-300">src</span>=<span className="text-emerald-400">"interview.mp4"</span></> },
    { num: 8, content: <>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-sky-300">className</span>=<span className="text-emerald-400">"absolute inset-0 object-cover"</span></> },
    { num: 9, content: <>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-blue-400">{'/>'}</span></> },
    { num: 10, content: <>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-blue-400">{'<Text'}</span></> },
    { num: 11, content: <>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-sky-300">className</span>=<span className="text-emerald-400">"absolute bottom-20 left-8 right-8</span></> },
    { num: 12, content: <><span className="text-emerald-400">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;text-white text-4xl font-bold"</span></> },
    { num: 13, content: <>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-sky-300">style</span>={'{{'}</> },
    { num: 14, content: <>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-sky-300">animation</span>: <span className="text-emerald-400">'fadeIn 0.5s ease-out'</span></> },
    { num: 15, content: <>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{'}}'}</> },
    { num: 16, content: <>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-blue-400">{'>'}</span></> },
    { num: 17, content: <>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{'{'}<span className="text-slate-300">data.headline</span>{'}'}</> },
    { num: 18, content: <>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-blue-400">{'</Text>'}</span></> },
    { num: 19, content: <>&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-blue-400">{'</Timegroup>'}</span></> },
    { num: 20, content: <>&nbsp;&nbsp;);</> },
    { num: 21, content: <>{'}'}<span className="animate-blink-cursor text-emerald-400">|</span></> },
  ];

  return (
    <div className="relative max-w-5xl mx-auto">
      {/* Glow effect */}
      <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500/20 via-blue-500/20 to-purple-500/20 rounded-3xl blur-2xl opacity-50 dark:opacity-30 animate-gradient" />
      
      {/* Demo container */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl shadow-slate-900/10 dark:shadow-none">
        {/* Window chrome */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-amber-400" />
            <div className="w-3 h-3 rounded-full bg-emerald-400" />
          </div>
          <div className="flex-1 text-center">
            <span className="text-xs text-slate-500 font-mono">editframe dev server</span>
          </div>
        </div>
        
        {/* Demo content */}
        <div className="grid md:grid-cols-2 divide-x divide-slate-200 dark:divide-slate-800">
          {/* Code panel */}
          <div className="bg-slate-950 font-mono text-sm overflow-hidden">
            {/* File tabs */}
            <div className="flex items-center border-b border-slate-800 bg-slate-900/50">
              <div className="flex items-center gap-2 px-4 py-2 border-b-2 border-emerald-500 bg-slate-950">
                <svg className="w-4 h-4 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M14.23 12.004a2.236 2.236 0 0 1-2.235 2.236 2.236 2.236 0 0 1-2.236-2.236 2.236 2.236 0 0 1 2.235-2.236 2.236 2.236 0 0 1 2.236 2.236zm2.648-10.69c-1.346 0-3.107.96-4.888 2.622-1.78-1.653-3.542-2.602-4.887-2.602-.41 0-.783.093-1.106.278-1.375.793-1.683 3.264-.973 6.365C1.98 8.917 0 10.42 0 12.004c0 1.59 1.99 3.097 5.043 4.03-.704 3.113-.39 5.588.988 6.38.32.187.69.275 1.102.275 1.345 0 3.107-.96 4.888-2.624 1.78 1.654 3.542 2.603 4.887 2.603.41 0 .783-.09 1.106-.275 1.374-.792 1.683-3.263.973-6.365C22.02 15.096 24 13.59 24 12.004c0-1.59-1.99-3.097-5.043-4.032.704-3.11.39-5.587-.988-6.38a2.167 2.167 0 0 0-1.092-.278zm-.005 1.09v.006c.225 0 .406.044.558.127.666.382.955 1.835.73 3.704-.054.46-.142.945-.25 1.44a23.476 23.476 0 0 0-3.107-.534A23.892 23.892 0 0 0 12.769 4.7c1.592-1.48 3.087-2.292 4.105-2.295zm-9.77.02c1.012 0 2.514.808 4.11 2.28-.686.72-1.37 1.537-2.02 2.442a22.73 22.73 0 0 0-3.113.538 15.02 15.02 0 0 1-.254-1.42c-.23-1.868.054-3.32.714-3.707.19-.09.4-.127.563-.132zm4.882 3.05c.455.468.91.992 1.36 1.564-.44-.02-.89-.034-1.345-.034-.46 0-.915.01-1.36.034.44-.572.895-1.096 1.345-1.565zM12 8.1c.74 0 1.477.034 2.202.093.406.582.802 1.203 1.183 1.86.372.64.71 1.29 1.018 1.946-.308.655-.646 1.31-1.013 1.95-.38.66-.773 1.288-1.18 1.87a25.64 25.64 0 0 1-4.412.005 26.64 26.64 0 0 1-1.183-1.86c-.372-.64-.71-1.29-1.018-1.946a25.17 25.17 0 0 1 1.013-1.954c.38-.66.773-1.286 1.18-1.868A25.245 25.245 0 0 1 12 8.098zm-3.635.254c-.24.377-.48.763-.704 1.16-.225.39-.435.782-.635 1.174-.265-.656-.49-1.31-.676-1.947.64-.15 1.315-.283 2.015-.386zm7.26 0c.695.103 1.365.23 2.006.387-.18.632-.405 1.282-.66 1.933a25.952 25.952 0 0 0-1.345-2.32zm3.063.675c.484.15.944.317 1.375.498 1.732.74 2.852 1.708 2.852 2.476-.005.768-1.125 1.74-2.857 2.475-.42.18-.88.342-1.355.493a23.966 23.966 0 0 0-1.1-2.98c.45-1.017.81-2.01 1.085-2.964zm-13.395.004c.278.96.645 1.957 1.1 2.98-.45 1.017-.812 2.01-1.086 2.964-.484-.15-.944-.318-1.37-.5-1.732-.737-2.852-1.706-2.852-2.474 0-.768 1.12-1.742 2.852-2.476.42-.18.88-.342 1.356-.494zm11.678 4.28c.265.657.49 1.312.676 1.948-.64.157-1.316.29-2.016.39a25.819 25.819 0 0 0 1.341-2.338zm-9.945.02c.24.377.48.763.705 1.16.225.39.435.788.636 1.18-.7.103-1.37.23-2.006.386.18-.63.406-1.282.66-1.93l.005-.798zm4.355 5.956c-.455-.468-.91-.993-1.36-1.565.44.02.89.034 1.345.034.46 0 .915-.01 1.36-.034-.44.572-.895 1.097-1.345 1.565z" />
                </svg>
                <span className="text-xs text-slate-300">composition.tsx</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 text-slate-500 hover:text-slate-300 cursor-pointer transition-colors">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-xs">styles.css</span>
              </div>
            </div>
            
            {/* Code content with line numbers */}
            <div className="flex text-[13px] leading-[1.6] overflow-x-auto">
              {/* Line numbers gutter */}
              <div className="flex-shrink-0 select-none border-r border-slate-800 bg-slate-900/30 pr-2 pl-4 py-4">
                {codeLines.map((line) => (
                  <div key={line.num} className="text-right text-slate-600 h-[1.6em]">
                    {line.num}
                  </div>
                ))}
              </div>
              
              {/* Code */}
              <div className="flex-1 py-4 px-4 min-w-0">
                {codeLines.map((line) => (
                  <div key={line.num} className="text-slate-300 h-[1.6em] whitespace-pre">
                    {line.content}
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Preview panel */}
          <div className="aspect-video md:aspect-auto bg-slate-100 dark:bg-slate-950 flex items-center justify-center min-h-[300px] relative overflow-hidden">
            {/* Scan line effect for "live" feel */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent animate-scan-line" />
            </div>
            
            {/* Preview content with pulse */}
            <div className="text-center p-8 animate-preview-pulse rounded-2xl">
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center mx-auto mb-4 relative">
                {/* Live indicator dot */}
                <div className="absolute -top-1 -right-1 w-3 h-3">
                  <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-75" />
                  <span className="absolute inset-0 rounded-full bg-emerald-500" />
                </div>
                <svg className="w-8 h-8 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-2 flex items-center justify-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live preview
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500">Video updates as you type</p>
              
              {/* Preview frame mockup */}
              <div className="mt-6 mx-auto w-24 h-40 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-slate-200/50 to-slate-300/50 dark:from-slate-800/50 dark:to-slate-700/50" />
                <span className="text-[10px] text-slate-400 font-mono relative">9:16</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Timeline */}
        <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
          <div className="flex items-center gap-4">
            {/* Play button with hover effect */}
            <button className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-all play-button-hover group">
              <svg className="w-5 h-5 text-slate-600 dark:text-slate-400 group-hover:text-emerald-500 transition-colors play-icon" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
            
            {/* Timeline track */}
            <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden relative">
              {/* Animated progress bar */}
              <div className="h-full bg-emerald-500 rounded-full animate-playhead" />
              {/* Playhead indicator */}
              <div className="absolute top-1/2 -translate-y-1/2 h-4 w-1 bg-emerald-500 rounded-full shadow-lg animate-playhead" style={{ left: 'calc(var(--progress, 33%) - 2px)' }} />
            </div>
            
            {/* Time display */}
            <span className="text-xs text-slate-500 font-mono tabular-nums">0:04 / 0:12</span>
          </div>
          
          {/* Mini track visualization */}
          <div className="mt-3 flex gap-1">
            <div className="flex-1 h-6 rounded bg-slate-200 dark:bg-slate-800 overflow-hidden relative">
              <div className="absolute inset-y-0 left-0 w-full bg-gradient-to-r from-blue-500/30 via-emerald-500/30 to-purple-500/30" />
              <div className="absolute inset-y-1 left-1 right-1 flex gap-1">
                <div className="h-full flex-[3] rounded-sm bg-blue-500/50" title="Video" />
                <div className="h-full flex-[2] rounded-sm bg-emerald-500/50" title="Text" />
              </div>
              {/* Playhead line */}
              <div className="absolute top-0 bottom-0 w-0.5 bg-white dark:bg-slate-300 shadow animate-playhead" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HeroDemo;
