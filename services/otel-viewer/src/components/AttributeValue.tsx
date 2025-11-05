import { useState } from "react";

interface AttributeValueProps {
  value: any;
}

export function AttributeValue({ value }: AttributeValueProps) {
  const displayValue = extractValue(value);
  const isObject = isJsonObject(displayValue);

  if (!isObject) {
    return <span className="json-primitive">{formatPrimitive(displayValue)}</span>;
  }

  return <JsonViewer data={displayValue} />;
}

function JsonViewer({ data, depth = 0 }: { data: any; depth?: number }) {
  const [isExpanded, setIsExpanded] = useState(depth < 2);

  if (data === null) {
    return <span className="json-null">null</span>;
  }

  if (typeof data !== 'object') {
    return <span className={`json-${typeof data}`}>{formatPrimitive(data)}</span>;
  }

  const isArray = Array.isArray(data);
  const entries = isArray ? data : Object.entries(data);
  const isEmpty = entries.length === 0;

  if (isEmpty) {
    return <span className="json-empty">{isArray ? '[]' : '{}'}</span>;
  }

  const openBracket = isArray ? '[' : '{';
  const closeBracket = isArray ? ']' : '}';

  return (
    <div className="json-object">
      <span className="json-bracket" onClick={() => setIsExpanded(!isExpanded)}>
        <span className="json-toggle-icon">{isExpanded ? '▼' : '▶'}</span>
        {openBracket}
      </span>
      {isExpanded && (
        <div className="json-children">
          {isArray
            ? data.map((item: any, index: number) => (
              <div key={index} className="json-item">
                <JsonViewer data={item} depth={depth + 1} />
                {index < data.length - 1 && <span className="json-comma">,</span>}
              </div>
            ))
            : Object.entries(data).map(([key, val], index, arr) => (
              <div key={key} className="json-item">
                <span className="json-key">"{key}"</span>
                <span className="json-colon">: </span>
                <JsonViewer data={val} depth={depth + 1} />
                {index < arr.length - 1 && <span className="json-comma">,</span>}
              </div>
            ))}
        </div>
      )}
      <span className="json-bracket">{closeBracket}</span>
    </div>
  );
}

function formatPrimitive(value: any): string {
  if (typeof value === 'string') {
    return `"${value}"`;
  }
  return String(value);
}

function extractValue(attrValue: any): any {
  if (typeof attrValue === 'string' || typeof attrValue === 'number' || typeof attrValue === 'boolean') {
    return attrValue;
  }

  if (attrValue.stringValue !== undefined) return attrValue.stringValue;
  if (attrValue.intValue !== undefined) return attrValue.intValue;
  if (attrValue.boolValue !== undefined) return attrValue.boolValue;
  if (attrValue.doubleValue !== undefined) return attrValue.doubleValue;
  if (attrValue.arrayValue !== undefined) {
    return attrValue.arrayValue.values?.map((v: any) => extractValue(v)) ?? [];
  }
  if (attrValue.kvlistValue !== undefined) {
    const obj: any = {};
    for (const kv of attrValue.kvlistValue.values || []) {
      obj[kv.key] = extractValue(kv.value);
    }
    return obj;
  }

  return attrValue;
}

function isJsonObject(value: any): boolean {
  return typeof value === 'object' && value !== null;
}
