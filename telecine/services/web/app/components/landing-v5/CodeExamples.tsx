import { useState } from "react";

/* ==============================================================================
   COMPONENT: CodeExamples
   
   Purpose: Show real code snippets that demonstrate Editframe capabilities.
   
   Design: Clean code viewer with subtle styling
   ============================================================================== */

type Token = {
  type: 'string' | 'comment' | 'keyword' | 'tag' | 'attr' | 'number' | 'bracket' | 'text';
  value: string;
};

function tokenize(code: string): Token[] {
  const tokens: Token[] = [];
  let remaining = code;
  
  const patterns: { type: Token['type']; regex: RegExp }[] = [
    { type: 'comment', regex: /^(\/\/[^\n]*|\/\*[\s\S]*?\*\/|\{\/\*[\s\S]*?\*\/\})/ },
    { type: 'string', regex: /^("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/ },
    { type: 'keyword', regex: /^(import|export|from|function|return|const|let|var|if|else|for|while|class|extends|new|this|typeof|instanceof)\b/ },
    { type: 'tag', regex: /^(<\/?[A-Z][a-zA-Z0-9.]*|<\/?[a-z][a-zA-Z0-9-]*)/ },
    { type: 'attr', regex: /^\s(className|src|name|target|duration|style|volume|barColor|barWidth|barGap|start|id|loop|mode|autoScale)=/ },
    { type: 'number', regex: /^\b(\d+(?:\.\d+)?)\b/ },
    { type: 'bracket', regex: /^([{}()[\]<>\/])/ },
  ];
  
  while (remaining.length > 0) {
    let matched = false;
    
    for (const { type, regex } of patterns) {
      const match = remaining.match(regex);
      if (match) {
        if (type === 'attr') {
          tokens.push({ type: 'text', value: ' ' });
          tokens.push({ type: 'attr', value: match[1] });
          tokens.push({ type: 'text', value: '=' });
        } else {
          tokens.push({ type, value: match[0] });
        }
        remaining = remaining.slice(match[0].length);
        matched = true;
        break;
      }
    }
    
    if (!matched) {
      const nextSpecial = remaining.slice(1).search(/["'`<>{}()[\]\/]|\b(import|export|from|function|return|const|let|var|className|src|name)\b/);
      const textEnd = nextSpecial === -1 ? remaining.length : nextSpecial + 1;
      tokens.push({ type: 'text', value: remaining.slice(0, textEnd) });
      remaining = remaining.slice(textEnd);
    }
  }
  
  return tokens;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function highlightCode(code: string): string {
  const tokens = tokenize(code);
  const colorMap: Record<Token['type'], string> = {
    string: 'text-emerald-400',
    comment: 'opacity-50',
    keyword: 'text-[var(--accent-red)]',
    tag: 'text-[var(--accent-blue)]',
    attr: 'text-[var(--accent-gold)]',
    number: 'text-[var(--accent-gold)]',
    bracket: 'opacity-70',
    text: '',
  };
  
  return tokens.map(token => {
    const escaped = escapeHtml(token.value);
    const color = colorMap[token.type];
    return color ? `<span class="${color}">${escaped}</span>` : escaped;
  }).join('');
}

const examples = {
  basic: {
    name: 'Basic composition',
    code: `import { Timegroup, Video, Text } from '@editframe/react';

export function SocialClip() {
  return (
    <Timegroup mode="contain" className="w-[1080px] h-[1920px]">
      <Video src="background.mp4" className="size-full object-cover" />
      
      <Text 
        className="absolute top-16 inset-x-8 text-white text-5xl font-bold text-center"
        start={0}
        duration={3}
      >
        Welcome to Editframe
      </Text>
    </Timegroup>
  );
}`,
  },
  waveform: {
    name: 'Audio waveform',
    code: `import { Timegroup, Audio, Waveform } from '@editframe/react';

export function PodcastClip() {
  return (
    <Timegroup mode="contain" className="w-[1920px] h-[1080px] bg-slate-900">
      <Audio src="podcast.mp3" />
      
      <Waveform
        target="podcast.mp3"
        barColor="rgb(239, 68, 68)"
        barWidth={4}
        barGap={2}
        className="absolute bottom-8 inset-x-8 h-32"
      />
    </Timegroup>
  );
}`,
  },
  sequence: {
    name: 'Sequenced clips',
    code: `import { Timegroup, Video, Sequence } from '@editframe/react';

export function Montage() {
  return (
    <Timegroup mode="contain" className="w-[1920px] h-[1080px]">
      <Sequence>
        <Video src="clip1.mp4" duration={3} />
        <Video src="clip2.mp4" duration={3} />
        <Video src="clip3.mp4" duration={3} />
      </Sequence>
    </Timegroup>
  );
}`,
  },
};

function CodeExamples() {
  const [selected, setSelected] = useState<keyof typeof examples>('basic');
  const [copied, setCopied] = useState(false);
  
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(examples[selected].code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = examples[selected].code;
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
      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {(Object.keys(examples) as Array<keyof typeof examples>).map((key) => (
          <button
            key={key}
            onClick={() => setSelected(key)}
            className={`px-4 py-2 text-sm font-medium rounded transition-colors ${
              selected === key
                ? 'bg-white text-[var(--ink-black)]'
                : 'text-white/70 hover:text-white'
            }`}
          >
            {examples[key].name}
          </button>
        ))}
      </div>
      
      {/* Code block */}
      <div className="relative bg-[#1a1a1a] rounded-lg overflow-hidden">
        {/* Copy button */}
        <button
          onClick={handleCopy}
          className="absolute top-4 right-4 p-2 text-white/50 hover:text-white transition-colors"
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
        
        <pre className="p-6 overflow-x-auto">
          <code 
            className="text-sm font-mono text-white/90 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: highlightCode(examples[selected].code) }}
          />
        </pre>
      </div>
    </div>
  );
}

export { CodeExamples };
export default CodeExamples;
