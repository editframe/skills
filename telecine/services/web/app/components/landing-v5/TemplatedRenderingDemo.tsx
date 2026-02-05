import { useState, useEffect, useId } from "react";
import {
  Preview,
  Timegroup,
  Text,
} from "@editframe/react";

interface UserData {
  name: string;
  role: string;
  company: string;
  metric: string;
  color: string;
}

const SAMPLE_DATA: UserData[] = [
  { name: "Sarah Chen", role: "Product Lead", company: "Acme Corp", metric: "+47%", color: "#E53935" },
  { name: "Marcus Johnson", role: "Growth Manager", company: "TechStart", metric: "+128%", color: "#1565C0" },
  { name: "Emma Williams", role: "CEO", company: "DataFlow", metric: "+89%", color: "#2E7D32" },
];

export function TemplatedRenderingDemo() {
  const id = useId();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isClient, setIsClient] = useState(false);
  const selectedData = SAMPLE_DATA[selectedIndex]!;
  const previewId = `templated-demo-${id}-${selectedIndex}`;

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      {/* Left - Template Code */}
      <div>
        <div className="border-4 border-black dark:border-white bg-[#1a1a1a] overflow-hidden">
          {/* Code Header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/20">
            <div className="w-3 h-3 rounded-full bg-[var(--poster-red)]" />
            <div className="w-3 h-3 rounded-full bg-[var(--poster-gold)]" />
            <div className="w-3 h-3 rounded-full bg-[var(--poster-green)]" />
            <span className="ml-3 text-white/40 text-xs font-mono">welcome-video.tsx</span>
          </div>
          
          {/* Code Content */}
          <div className="p-4 overflow-x-auto">
            <pre className="text-xs font-mono leading-relaxed">
              <code>
                <span className="text-[#C586C0]">import</span>
                <span className="text-white"> {'{'} getRenderData {'}'} </span>
                <span className="text-[#C586C0]">from</span>
                <span className="text-[#CE9178]"> "@editframe/elements"</span>
                <span className="text-white">;</span>
                {'\n\n'}
                <span className="text-[#C586C0]">interface</span>
                <span className="text-[#4EC9B0]"> VideoData</span>
                <span className="text-white"> {'{'}</span>
                {'\n'}
                <span className="text-white">  name: </span>
                <span className="text-[#4EC9B0]">string</span>
                <span className="text-white">;</span>
                {'\n'}
                <span className="text-white">  role: </span>
                <span className="text-[#4EC9B0]">string</span>
                <span className="text-white">;</span>
                {'\n'}
                <span className="text-white">  company: </span>
                <span className="text-[#4EC9B0]">string</span>
                <span className="text-white">;</span>
                {'\n'}
                <span className="text-white">  metric: </span>
                <span className="text-[#4EC9B0]">string</span>
                <span className="text-white">;</span>
                {'\n'}
                <span className="text-white">{'}'}</span>
                {'\n\n'}
                <span className="text-[#C586C0]">export function</span>
                <span className="text-[#DCDCAA]"> WelcomeVideo</span>
                <span className="text-white">() {'{'}</span>
                {'\n'}
                <span className="text-[#C586C0]">  const</span>
                <span className="text-[#9CDCFE]"> data</span>
                <span className="text-white"> = </span>
                <span className="text-[#DCDCAA]">getRenderData</span>
                <span className="text-white">{'<'}</span>
                <span className="text-[#4EC9B0]">VideoData</span>
                <span className="text-white">{'>'}();</span>
                {'\n\n'}
                <span className="text-[#C586C0]">  return</span>
                <span className="text-white"> (</span>
                {'\n'}
                <span className="text-[#808080]">    {'<'}</span>
                <span className="text-[#4EC9B0]">Timegroup</span>
                <span className="text-[#9CDCFE]"> mode</span>
                <span className="text-white">=</span>
                <span className="text-[#CE9178]">"fixed"</span>
                <span className="text-[#9CDCFE]"> duration</span>
                <span className="text-white">=</span>
                <span className="text-[#CE9178]">"5s"</span>
                <span className="text-[#808080]">{'>'}</span>
                {'\n'}
                <span className="text-[#808080]">      {'<'}</span>
                <span className="text-[#4EC9B0]">Text</span>
                <span className="text-[#808080]">{'>'}</span>
                <span className="text-white">Welcome, </span>
                <span className="text-white">{'{'}</span>
                <span className="text-[#9CDCFE]">data</span>
                <span className="text-white">.name{'}'}</span>
                <span className="text-white">!</span>
                <span className="text-[#808080]">{'</'}</span>
                <span className="text-[#4EC9B0]">Text</span>
                <span className="text-[#808080]">{'>'}</span>
                {'\n'}
                <span className="text-[#808080]">      {'<'}</span>
                <span className="text-[#4EC9B0]">Text</span>
                <span className="text-[#808080]">{'>'}</span>
                <span className="text-white">{'{'}</span>
                <span className="text-[#9CDCFE]">data</span>
                <span className="text-white">.role{'}'} at {'{'}</span>
                <span className="text-[#9CDCFE]">data</span>
                <span className="text-white">.company{'}'}</span>
                <span className="text-[#808080]">{'</'}</span>
                <span className="text-[#4EC9B0]">Text</span>
                <span className="text-[#808080]">{'>'}</span>
                {'\n'}
                <span className="text-[#808080]">      {'<'}</span>
                <span className="text-[#4EC9B0]">Text</span>
                <span className="text-[#808080]">{'>'}</span>
                <span className="text-white">{'{'}</span>
                <span className="text-[#9CDCFE]">data</span>
                <span className="text-white">.metric{'}'} growth</span>
                <span className="text-[#808080]">{'</'}</span>
                <span className="text-[#4EC9B0]">Text</span>
                <span className="text-[#808080]">{'>'}</span>
                {'\n'}
                <span className="text-[#808080]">    {'</'}</span>
                <span className="text-[#4EC9B0]">Timegroup</span>
                <span className="text-[#808080]">{'>'}</span>
                {'\n'}
                <span className="text-white">  );</span>
                {'\n'}
                <span className="text-white">{'}'}</span>
              </code>
            </pre>
          </div>
        </div>
        
        {/* CLI Command */}
        <div className="mt-4 border-4 border-black dark:border-white bg-black overflow-hidden">
          <div className="px-4 py-2 border-b border-white/20 flex items-center gap-2">
            <span className="text-[#4CAF50] font-mono text-sm">$</span>
            <span className="text-white/50 text-xs font-mono uppercase">Terminal</span>
          </div>
          <div className="p-4">
            <pre className="text-xs font-mono text-white/90 leading-relaxed whitespace-pre-wrap">
              <span className="text-[#4CAF50]">npx editframe render</span>
              {' \\\n  '}
              <span className="text-[#9CDCFE]">--data-file</span>
              <span className="text-[#CE9178]"> users.json</span>
              {' \\\n  '}
              <span className="text-[#9CDCFE]">-o</span>
              <span className="text-[#CE9178]"> welcome-videos/</span>
            </pre>
          </div>
        </div>
      </div>
      
      {/* Right - Output Preview */}
      <div>
        {/* Data Selector */}
        <div className="border-4 border-black dark:border-white bg-white dark:bg-[#1a1a1a] overflow-hidden mb-4">
          <div className="px-4 py-2 bg-[var(--poster-gold)] border-b-4 border-black dark:border-white">
            <span className="text-xs font-black uppercase tracking-wider text-black">
              users.json
            </span>
          </div>
          <div className="p-3 space-y-2">
            {SAMPLE_DATA.map((data, i) => (
              <button
                key={i}
                onClick={() => setSelectedIndex(i)}
                className={`w-full text-left px-3 py-2 text-xs font-mono transition-colors border-2 ${
                  selectedIndex === i
                    ? "bg-[var(--poster-blue)] text-white border-[var(--poster-blue)]"
                    : "bg-transparent text-black dark:text-white border-black/20 dark:border-white/20 hover:border-black dark:hover:border-white"
                }`}
              >
                {'{'} "name": "{data.name}", "company": "{data.company}" {'}'}
              </button>
            ))}
          </div>
        </div>
        
        {/* Video Preview - Real Editframe Components */}
        <div className="relative">
          <div className="absolute -bottom-3 -right-3 w-full h-full" style={{ backgroundColor: selectedData.color }} />
          <div className="relative border-4 border-black dark:border-white bg-[#1a1a1a] overflow-hidden">
            {/* Video Header */}
            <div className="px-4 py-2 border-b border-white/20 flex items-center justify-between">
              <span className="text-white/50 text-xs font-mono">welcome-{selectedData.name.split(' ')[0]?.toLowerCase()}.mp4</span>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#4CAF50]" />
                <span className="text-[#4CAF50] text-xs font-mono">Rendered</span>
              </div>
            </div>
            
            {/* Live Preview */}
            {isClient ? (
              <Preview id={previewId} key={previewId}>
                <Timegroup
                  mode="fixed"
                  duration="5s"
                  className="aspect-video w-full flex flex-col items-center justify-center p-8 text-center"
                  style={{ backgroundColor: selectedData.color }}
                >
                  <Text className="text-white/80 text-sm uppercase tracking-wider">
                    Welcome
                  </Text>
                  <Text className="text-white text-3xl font-black uppercase tracking-tight mt-2">
                    {selectedData.name}!
                  </Text>
                  <Text className="text-white/70 text-sm mt-2">
                    {selectedData.role} at {selectedData.company}
                  </Text>
                  <Text className="text-white text-5xl font-black mt-4">
                    {selectedData.metric}
                  </Text>
                  <Text className="text-white/70 text-lg mt-1">
                    growth
                  </Text>
                </Timegroup>
              </Preview>
            ) : (
              <div
                className="aspect-video flex flex-col items-center justify-center p-8 text-center"
                style={{ backgroundColor: selectedData.color }}
              >
                <p className="text-white/80 text-sm uppercase tracking-wider">Welcome</p>
                <h3 className="text-white text-3xl font-black uppercase tracking-tight mt-2">{selectedData.name}!</h3>
                <p className="text-white/70 text-sm mt-2">{selectedData.role} at {selectedData.company}</p>
                <p className="text-white text-5xl font-black mt-4">{selectedData.metric}</p>
                <p className="text-white/70 text-lg mt-1">growth</p>
              </div>
            )}
            
            {/* Video Footer */}
            <div className="px-4 py-3 border-t border-white/20 bg-black/50">
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/50 font-mono">1920×1080 • 30fps • H.264</span>
                <span className="text-white/50 font-mono">5.2 MB</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Output Summary */}
        <div className="mt-6 grid grid-cols-3 gap-3">
          {SAMPLE_DATA.map((data, i) => (
            <button
              key={i}
              onClick={() => setSelectedIndex(i)}
              className={`aspect-video border-2 transition-all ${
                selectedIndex === i 
                  ? "border-white scale-105" 
                  : "border-white/30 hover:border-white/60"
              }`}
              style={{ backgroundColor: data.color }}
            >
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-white text-xs font-bold uppercase truncate px-2">
                  {data.name.split(' ')[0]}
                </span>
              </div>
            </button>
          ))}
        </div>
        
        <p className="mt-4 text-xs text-center text-black/50 dark:text-white/50">
          One template → {SAMPLE_DATA.length} personalized videos
        </p>
      </div>
    </div>
  );
}

export default TemplatedRenderingDemo;
