import { useState } from "react";

/* ==============================================================================
   COMPONENT: CodeExamples
   
   Purpose: Show real, non-trivial code that demonstrates actual capabilities.
   Developers evaluate tools by reading code.
   
   Implementation notes:
   - Tabbed interface with 3-4 examples
   - Syntax highlighting (use Prism or highlight.js)
   - Copy button on each example
   - Examples should show progressively complex features
   ============================================================================== */

/**
 * Simple syntax highlighting using regex patterns.
 * Highlights keywords, strings, comments, JSX tags, attributes, and numbers.
 */
function highlightCode(code: string): string {
  let highlighted = code;
  
  // Process string patterns first to avoid highlighting inside strings
  const stringPlaceholders: string[] = [];
  highlighted = highlighted.replace(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g, (match) => {
    const placeholder = `__STRING_${stringPlaceholders.length}__`;
    stringPlaceholders.push(`<span class="text-emerald-400">${match}</span>`);
    return placeholder;
  });

  // Process comments
  const commentPlaceholders: string[] = [];
  highlighted = highlighted.replace(/(\/\/[^\n]*|\/\*[\s\S]*?\*\/|\{\/\*[\s\S]*?\*\/\})/g, (match) => {
    const placeholder = `__COMMENT_${commentPlaceholders.length}__`;
    commentPlaceholders.push(`<span class="text-slate-500">${match}</span>`);
    return placeholder;
  });

  // Keywords
  highlighted = highlighted.replace(
    /\b(import|export|from|function|return|const|let|var|if|else|for|while|class|extends|new|this|typeof|instanceof)\b/g,
    '<span class="text-purple-400">$1</span>'
  );

  // JSX tags
  highlighted = highlighted.replace(
    /(<\/?)([\w.]+)/g,
    '<span class="text-slate-500">$1</span><span class="text-blue-400">$2</span>'
  );

  // JSX attributes
  highlighted = highlighted.replace(
    /\s(className|src|name|target|duration|style|volume)=/g,
    ' <span class="text-amber-400">$1</span>='
  );

  // Numbers
  highlighted = highlighted.replace(
    /\b(\d+)\b/g,
    '<span class="text-orange-400">$1</span>'
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

export function Welcome() {
  return (
    <Timegroup className="w-[1920px] h-[1080px] bg-slate-900">
      <Video 
        src="background.mp4" 
        className="absolute inset-0 opacity-50" 
      />
      <Text className="text-white text-6xl font-bold text-center">
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

export function Interview() {
  return (
    <Timegroup className="w-[1080px] h-[1920px]">
      <Video src="interview.mp4" name="speaker" />
      
      {/* Auto-generated, word-level captions */}
      <Captions 
        target="speaker"
        className="absolute bottom-20 inset-x-8
                   text-white text-2xl font-semibold
                   [&_.active]:text-yellow-400"
      />
    </Timegroup>
  );
}`,
    },
    {
      id: 'animations',
      name: 'CSS Animations',
      code: `import { Timegroup, Sequence, Text } from '@editframe/react';

export function Intro() {
  return (
    <Timegroup className="w-[1920px] h-[1080px] bg-black">
      <Sequence>
        <Text 
          duration={2}
          className="text-white text-8xl animate-[fadeIn_0.5s_ease-out]"
        >
          First
        </Text>
        <Text 
          duration={2}
          className="text-emerald-400 text-8xl animate-[slideUp_0.3s_ease-out]"
        >
          Then this
        </Text>
        <Text 
          duration={2}
          className="text-white text-8xl animate-[scale_0.4s_ease-out]"
        >
          Finally
        </Text>
      </Sequence>
    </Timegroup>
  );
}`,
    },
    {
      id: 'data',
      name: 'Data-Driven',
      code: `import { Timegroup, Image, Text } from '@editframe/react';

// Generate thousands of unique videos from data
export function ProductAd({ product }) {
  return (
    <Timegroup className="w-[1080px] h-[1080px] bg-white">
      <Image 
        src={product.imageUrl}
        className="absolute inset-0 object-cover"
      />
      <div className="absolute bottom-0 inset-x-0 p-8 bg-gradient-to-t from-black">
        <Text className="text-white text-4xl font-bold">
          {product.name}
        </Text>
        <Text className="text-emerald-400 text-2xl mt-2">
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
    <div className="bg-slate-900 rounded-2xl overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-slate-800">
        {examples.map((example) => (
          <button
            key={example.id}
            onClick={() => setActiveTab(example.id)}
            className={`px-6 py-4 text-sm font-medium transition-colors ${
              example.id === activeTab
                ? 'text-white bg-slate-800 border-b-2 border-emerald-500'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
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
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-2"
          title="Copy to clipboard"
        >
          {copied ? (
            <>
              <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-xs text-emerald-400">Copied!</span>
            </>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          )}
        </button>
        <pre className="p-6 overflow-x-auto text-sm">
          <code 
            className="text-slate-300"
            dangerouslySetInnerHTML={{ __html: highlightCode(activeExample.code) }}
          />
        </pre>
      </div>
    </div>
  );
}

export default CodeExamples;
