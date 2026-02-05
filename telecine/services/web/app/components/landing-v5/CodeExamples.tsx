import { useState } from "react";

/* ==============================================================================
   COMPONENT: CodeExamples
   
   Purpose: Show real, non-trivial code that demonstrates actual capabilities.
   Developers evaluate tools by reading code.
   
   Implementation notes:
   - Tabbed interface with 4 examples
   - Custom syntax highlighting
   - Copy button on each example
   - Examples should show progressively complex features
   ============================================================================== */

interface Token {
  type: 'string' | 'comment' | 'keyword' | 'tag' | 'attr' | 'number' | 'text' | 'bracket';
  value: string;
}

function tokenize(code: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  
  while (i < code.length) {
    // Comments: // or /* */ or {/* */}
    if (code.slice(i, i + 2) === '//') {
      const end = code.indexOf('\n', i);
      const value = end === -1 ? code.slice(i) : code.slice(i, end);
      tokens.push({ type: 'comment', value });
      i += value.length;
      continue;
    }
    if (code.slice(i, i + 2) === '/*') {
      const end = code.indexOf('*/', i);
      const value = end === -1 ? code.slice(i) : code.slice(i, end + 2);
      tokens.push({ type: 'comment', value });
      i += value.length;
      continue;
    }
    if (code.slice(i, i + 3) === '{/*') {
      const end = code.indexOf('*/}', i);
      const value = end === -1 ? code.slice(i) : code.slice(i, end + 3);
      tokens.push({ type: 'comment', value });
      i += value.length;
      continue;
    }
    
    // Strings: ", ', or `
    if (code[i] === '"' || code[i] === "'" || code[i] === '`') {
      const quote = code[i];
      let j = i + 1;
      while (j < code.length && (code[j] !== quote || code[j - 1] === '\\')) {
        j++;
      }
      tokens.push({ type: 'string', value: code.slice(i, j + 1) });
      i = j + 1;
      continue;
    }
    
    // JSX tags: <ComponentName or </ComponentName or />
    if (code[i] === '<') {
      // Check for closing tag or self-closing
      const isClosing = code[i + 1] === '/';
      const start = isClosing ? i + 2 : i + 1;
      let j = start;
      while (j < code.length && /[\w.]/.test(code[j]!)) {
        j++;
      }
      if (j > start) {
        tokens.push({ type: 'bracket', value: isClosing ? '</' : '<' });
        tokens.push({ type: 'tag', value: code.slice(start, j) });
        i = j;
        continue;
      }
      tokens.push({ type: 'bracket', value: '<' });
      i++;
      continue;
    }
    
    // Closing brackets
    if (code[i] === '>' || code.slice(i, i + 2) === '/>') {
      const value = code.slice(i, i + 2) === '/>' ? '/>' : '>';
      tokens.push({ type: 'bracket', value });
      i += value.length;
      continue;
    }
    
    // JSX attributes (word followed by =)
    const attrMatch = code.slice(i).match(/^([a-zA-Z_][\w]*)(?==)/);
    if (attrMatch) {
      tokens.push({ type: 'attr', value: attrMatch[1]! });
      i += attrMatch[1]!.length;
      continue;
    }
    
    // Keywords and identifiers
    const wordMatch = code.slice(i).match(/^[a-zA-Z_$][\w$]*/);
    if (wordMatch) {
      const word = wordMatch[0];
      const keywords = ['import', 'export', 'from', 'function', 'return', 'const', 'let', 'var', 'if', 'else', 'for', 'while', 'class', 'extends', 'new', 'this', 'typeof', 'instanceof', 'default'];
      if (keywords.includes(word)) {
        tokens.push({ type: 'keyword', value: word });
      } else {
        tokens.push({ type: 'text', value: word });
      }
      i += word.length;
      continue;
    }
    
    // Numbers
    const numMatch = code.slice(i).match(/^\d+(\.\d+)?/);
    if (numMatch) {
      tokens.push({ type: 'number', value: numMatch[0] });
      i += numMatch[0].length;
      continue;
    }
    
    // Everything else
    tokens.push({ type: 'text', value: code[i]! });
    i++;
  }
  
  return tokens;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function highlightCode(code: string): string {
  const tokens = tokenize(code);
  const colorMap: Record<Token['type'], string> = {
    string: 'text-[var(--destijl-blue)]',
    comment: 'opacity-50',
    keyword: 'text-[var(--destijl-red)]',
    tag: 'text-[var(--destijl-blue)]',
    attr: 'text-[var(--destijl-yellow)]',
    number: 'text-[var(--destijl-yellow)]',
    bracket: 'opacity-50',
    text: '',
  };
  
  return tokens.map(token => {
    const escaped = escapeHtml(token.value);
    const color = colorMap[token.type];
    return color ? `<span class="${color}">${escaped}</span>` : escaped;
  }).join('');
}

/**
 * CodeExamples displays a tabbed interface with multiple code examples
 * demonstrating Editframe capabilities, with syntax highlighting and copy functionality.
 */
export function CodeExamples() {
  const [activeTab, setActiveTab] = useState('basic');
  const [copied, setCopied] = useState(false);

  const examples = [
    {
      id: 'basic',
      name: 'Basic Composition',
      code: `import { Timegroup, Video, Text } from '@editframe/react';

export default function Welcome() {
  return (
    <Timegroup className="w-[1920px] h-[1080px] bg-slate-900">
      <Video 
        src="/assets/background.mp4"
        name="bg"
        className="absolute inset-0 opacity-60"
        volume={0.3}
      />
      <Text className="absolute inset-0 flex items-center justify-center
                       text-white text-7xl font-bold drop-shadow-lg">
        Welcome to the future
      </Text>
    </Timegroup>
  );
}`,
    },
    {
      id: 'captions',
      name: 'Auto Captions',
      code: `import { Timegroup, Video, Captions } from '@editframe/react';

export default function Interview() {
  return (
    <Timegroup className="w-[1080px] h-[1920px] bg-black">
      <Video
        src="/assets/interview.mp4"
        name="speaker"
        className="absolute inset-0 object-cover"
      />
      {/* Word-level captions auto-synced to audio */}
      <Captions 
        target="speaker"
        className="absolute bottom-24 inset-x-8 text-center
                   text-white text-3xl font-semibold
                   [&_.word]:transition-colors
                   [&_.word.active]:text-yellow-400"
      />
    </Timegroup>
  );
}`,
    },
    {
      id: 'animations',
      name: 'CSS Animations',
      code: `import { Timegroup, Text } from '@editframe/react';

export default function Intro() {
  return (
    <Timegroup mode="sequence" className="w-[1920px] h-[1080px] bg-black">
      {/* Use fill-mode 'backwards' for fade-in to prevent flash */}
      <Text 
        duration={2}
        className="text-white text-8xl text-center
                   animate-[fadeIn_0.5s_ease-out_backwards]"
      >
        First
      </Text>
      <Text 
        duration={2}
        className="text-emerald-400 text-8xl text-center
                   animate-[slideUp_0.4s_ease-out_backwards]"
      >
        Then this
      </Text>
      <Text 
        duration={2}
        className="text-white text-8xl text-center
                   animate-[scale_0.3s_ease-out_backwards]"
      >
        Finally
      </Text>
    </Timegroup>
  );
}`,
    },
    {
      id: 'data',
      name: 'Data-Driven',
      code: `import { Timegroup, Image, Text } from '@editframe/react';

interface Product {
  name: string;
  price: number;
  imageUrl: string;
}

export default function ProductAd({ product }: { product: Product }) {
  return (
    <Timegroup className="w-[1080px] h-[1080px] bg-white">
      <Image 
        src={product.imageUrl}
        className="absolute inset-0 object-cover"
      />
      <div className="absolute bottom-0 inset-x-0 p-8
                      bg-gradient-to-t from-black/80 to-transparent">
        <Text className="text-white text-5xl font-bold">
          {product.name}
        </Text>
        <Text className="text-emerald-400 text-3xl font-semibold mt-3">
          \${product.price}
        </Text>
      </div>
    </Timegroup>
  );
}`,
    },
  ];

  const activeIndex = examples.findIndex(e => e.id === activeTab);
  const activeExample = examples[activeIndex >= 0 ? activeIndex : 0]!;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(activeExample.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = activeExample.code;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  
  return (
    <div className="border-4 border-black dark:border-white bg-black">
      {/* Tabs - Bauhaus style */}
      <div className="flex border-b-4 border-black dark:border-white">
        {examples.map((example, index) => (
          <button
            key={example.id}
            onClick={() => setActiveTab(example.id)}
            className={`px-6 py-4 text-xs font-bold uppercase tracking-wider transition-colors ${
              index > 0 ? 'border-l-4 border-black dark:border-white' : ''
            } ${
              example.id === activeTab
                ? 'bg-[var(--destijl-blue)] text-white'
                : 'bg-white dark:bg-[#0a0a0a] text-black dark:text-white hover:bg-[var(--destijl-yellow)] hover:text-black'
            }`}
          >
            {example.name}
          </button>
        ))}
      </div>
      
      {/* Code */}
      <div className="relative">
        <button 
          onClick={handleCopy}
          className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-[var(--destijl-red)] transition-colors"
          title="Copy to clipboard"
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
        <pre className="p-6 overflow-x-auto text-sm font-mono">
          <code 
            className="text-white/90"
            dangerouslySetInnerHTML={{ __html: highlightCode(activeExample.code) }}
          />
        </pre>
      </div>
    </div>
  );
}

export default CodeExamples;
