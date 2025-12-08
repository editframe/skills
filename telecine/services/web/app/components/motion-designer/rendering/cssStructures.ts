/**
 * Structured representations of CSS rules for programmatic construction.
 * These structures are inserted into stylesheets using CSSStyleSheet.insertRule() DOM API.
 * No string concatenation - all CSS construction happens via DOM APIs.
 */

export interface KeyframeRule {
  percent: number;
  properties: Record<string, string>;
  easing?: string;
}

export interface KeyframesDefinition {
  name: string;
  keyframes: KeyframeRule[];
}

export interface CSSStyleRuleDefinition {
  selector: string;
  properties: Record<string, string>;
}

