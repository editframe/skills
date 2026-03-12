#!/usr/bin/env tsx
/**
 * AST query: find all @property-decorated members in Lit element subclasses.
 *
 * Walks the full inheritance chain (including mixins) to collect own properties
 * vs inherited ones. Outputs JSON to stdout.
 *
 * Usage:
 *   tsx scripts/lit-properties.ts [options]
 *
 * Options:
 *   --glob <pattern>   Glob pattern to filter source files (relative to --root).
 *                      Can be specified multiple times. Matched against the full
 *                      absolute path so patterns like "**\/gui\/**" work.
 *                      Default: all .ts files under root, excluding tests.
 *   --root <path>      Override the source root to scan (default: elements src).
 *                      Can be specified multiple times.
 *   --tsconfig <path>  Path to tsconfig.json (default: elements/tsconfig.json).
 *   --element <name>   Filter by class name (post-filter, can combine with --glob).
 *
 * Examples:
 *   # All elements in the gui subtree
 *   tsx scripts/lit-properties.ts --glob "**\/gui\/**"
 *
 *   # Only files matching a name pattern
 *   tsx scripts/lit-properties.ts --glob "**\/EF*Timeline*"
 *
 *   # Specific element by class name
 *   tsx scripts/lit-properties.ts --element EFVideo
 *
 *   # Combine: gui subtree, only classes named EF*
 *   tsx scripts/lit-properties.ts --glob "**\/gui\/**" --element EFTree
 */

import ts from "typescript";
import path from "path";
import { fileURLToPath } from "url";

// ---------------------------------------------------------------------------
// Config defaults
// ---------------------------------------------------------------------------

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DEFAULT_ROOT = path.resolve(
  __dirname,
  "../elements/packages/elements/src",
);

const DEFAULT_TSCONFIG = path.resolve(
  __dirname,
  "../elements/tsconfig.json",
);

// Known Lit base class names — resolution stops at these
const LIT_BASE_CLASSES = new Set(["LitElement", "ReactiveElement"]);

// The decorator import that marks a Lit property
const PROPERTY_DECORATOR_IMPORT = "lit/decorators";

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

function parseArgs(argv: string[]): {
  globs: string[];
  roots: string[];
  tsconfig: string;
  filterElement: string | null;
} {
  const globs: string[] = [];
  const roots: string[] = [];
  let tsconfig = DEFAULT_TSCONFIG;
  let filterElement: string | null = null;

  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case "--glob":
        globs.push(argv[++i]!);
        break;
      case "--root":
        roots.push(path.resolve(argv[++i]!));
        break;
      case "--tsconfig":
        tsconfig = path.resolve(argv[++i]!);
        break;
      case "--element":
        filterElement = argv[++i]!;
        break;
    }
  }

  if (roots.length === 0) roots.push(DEFAULT_ROOT);
  return { globs, roots, tsconfig, filterElement };
}

const { globs, roots, tsconfig: TSCONFIG_PATH, filterElement } = parseArgs(process.argv.slice(2));

// ---------------------------------------------------------------------------
// File filtering — combine glob patterns with root constraints
// ---------------------------------------------------------------------------

// path.matchesGlob is Node 22+; the monorepo runs Node 22 per package.json engines
const pathMatchesGlob = (path as any).matchesGlob as (filePath: string, pattern: string) => boolean;

/**
 * Returns true if the file should be scanned.
 * - Must be under at least one root
 * - Must not be a test/browsertest file
 * - If globs are provided, at least one must match the absolute file path
 */
function shouldScanFile(fileName: string): boolean {
  if (!roots.some((r) => fileName.startsWith(r))) return false;
  if (/\.(test|browsertest)\.(ts|tsx)$/.test(fileName)) return false;
  if (globs.length === 0) return true;
  return globs.some((g) => {
    const absGlob = path.isAbsolute(g) ? g : path.join(roots[0]!, g);
    return pathMatchesGlob(fileName, absGlob);
  });
}

// ---------------------------------------------------------------------------
// Build TypeScript program
// ---------------------------------------------------------------------------

function createProgram(): ts.Program {
  const configFile = ts.readConfigFile(TSCONFIG_PATH, ts.sys.readFile);
  if (configFile.error) {
    throw new Error(ts.formatDiagnostics([configFile.error], ts.createCompilerHost({})));
  }

  const parsed = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    path.dirname(TSCONFIG_PATH),
  );

  return ts.createProgram({
    rootNames: parsed.fileNames,
    options: parsed.options,
  });
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PropertyInfo {
  name: string;
  type: string | null;
  /** null = default attribute name, false = no attribute binding, string = explicit name */
  attribute: string | false | null;
  reflect: boolean;
  hasConverter: boolean;
  defaultValue: string | null;
  jsdoc: string | null;
  declaredIn: string;
}

interface ElementInfo {
  className: string;
  tagName: string | null;
  file: string;
  ownProperties: PropertyInfo[];
  inheritedProperties: PropertyInfo[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getJSDocComment(node: ts.Node): string | null {
  const jsdoc = ts.getJSDocCommentsAndTags(node);
  const comments: string[] = [];
  for (const doc of jsdoc) {
    if (ts.isJSDoc(doc) && doc.comment) {
      const text = ts.getTextOfJSDocComment(doc.comment) ?? "";
      if (text.trim()) comments.push(text.trim());
    }
  }
  return comments.length > 0 ? comments.join(" ") : null;
}


/** Extract @property({ type, attribute, reflect, converter }) options */
function extractPropertyOptions(decorator: ts.Decorator): {
  type: string | null;
  attribute: string | false | null;
  reflect: boolean;
  hasConverter: boolean;
} {
  const result = { type: null as string | null, attribute: null as string | false | null, reflect: false, hasConverter: false };
  if (!ts.isCallExpression(decorator.expression)) return result;
  const [optionsArg] = decorator.expression.arguments;
  if (!optionsArg || !ts.isObjectLiteralExpression(optionsArg)) return result;

  for (const prop of optionsArg.properties) {
    if (!ts.isPropertyAssignment(prop)) continue;
    const key = prop.name.getText();
    const val = prop.initializer;

    switch (key) {
      case "type":
        if (ts.isIdentifier(val)) result.type = val.text;
        break;
      case "attribute":
        if (ts.isStringLiteral(val)) result.attribute = val.text;
        else if (val.kind === ts.SyntaxKind.TrueKeyword) result.attribute = null; // default
        else if (val.kind === ts.SyntaxKind.FalseKeyword) result.attribute = false;
        break;
      case "reflect":
        result.reflect = val.kind === ts.SyntaxKind.TrueKeyword;
        break;
      case "converter":
        result.hasConverter = true;
        break;
    }
  }
  return result;
}

/** Check if a symbol is imported from lit/decorators */
function isLitDecoratorSymbol(
  identifier: ts.Identifier,
  checker: ts.TypeChecker,
  sourceFile: ts.SourceFile,
): boolean {
  const symbol = checker.getSymbolAtLocation(identifier);
  if (!symbol) return false;
  const decls = symbol.declarations ?? [];
  for (const decl of decls) {
    const sf = decl.getSourceFile();
    if (sf.fileName.includes(PROPERTY_DECORATOR_IMPORT)) return true;
    // Also check import specifiers
    if (ts.isImportSpecifier(decl)) {
      const moduleSpec = (decl.parent.parent.parent as ts.ImportDeclaration).moduleSpecifier;
      if (ts.isStringLiteral(moduleSpec) && moduleSpec.text.includes("lit/decorators")) return true;
    }
  }
  return false;
}

/** Resolve the declared type of a class member as a string */
function getMemberType(
  member: ts.ClassElement,
  checker: ts.TypeChecker,
): string | null {
  if (ts.isPropertyDeclaration(member) || ts.isGetAccessorDeclaration(member)) {
    // Prefer explicit type annotation
    if (member.type) return member.type.getText();
    // Fall back to the checker-resolved type of the symbol (respects widened type)
    const sym = checker.getSymbolAtLocation(member.name);
    if (sym) {
      const type = checker.getTypeOfSymbol(sym);
      return checker.typeToString(type);
    }
  }
  return null;
}

/** Get default value text from initializer */
function getDefaultValue(member: ts.ClassElement): string | null {
  if (ts.isPropertyDeclaration(member) && member.initializer) {
    return member.initializer.getText();
  }
  return null;
}

/** Relative path from ELEMENTS_SRC */
function relPath(fileName: string): string {
  return path.relative(path.dirname(TSCONFIG_PATH), fileName);
}

// ---------------------------------------------------------------------------
// Core: extract @property members from a class declaration
// ---------------------------------------------------------------------------

function extractProperties(
  classDecl: ts.ClassDeclaration | ts.ClassExpression,
  checker: ts.TypeChecker,
  sourceFile: ts.SourceFile,
): PropertyInfo[] {
  const props: PropertyInfo[] = [];

  for (const member of classDecl.members) {
    if (!ts.canHaveDecorators(member)) continue;
    const decorators = ts.getDecorators(member);
    if (!decorators) continue;

    for (const mod of decorators) {
      const name = ts.isCallExpression(mod.expression)
        ? (mod.expression.expression as ts.Identifier).text
        : ts.isIdentifier(mod.expression)
        ? mod.expression.text
        : null;

      if (name !== "property") continue;

      // Verify it's actually lit's @property
      const identNode = ts.isCallExpression(mod.expression)
        ? (mod.expression.expression as ts.Identifier)
        : (mod.expression as ts.Identifier);

      if (!isLitDecoratorSymbol(identNode, checker, sourceFile)) continue;

      const memberName = member.name ? member.name.getText() : "<unknown>";
      const opts = extractPropertyOptions(mod);

      props.push({
        name: memberName,
        type: getMemberType(member, checker),
        attribute: opts.attribute,
        reflect: opts.reflect,
        hasConverter: opts.hasConverter,
        defaultValue: getDefaultValue(member),
        jsdoc: getJSDocComment(member),
        declaredIn: relPath(sourceFile.fileName),
      });
    }
  }

  return props;
}

// ---------------------------------------------------------------------------
// Core: resolve inheritance chain via AST + type checker
// ---------------------------------------------------------------------------

interface InheritanceNode {
  className: string;
  file: string;
  classDecl: ts.ClassDeclaration | ts.ClassExpression;
  sourceFile: ts.SourceFile;
}

/**
 * Follow a symbol through import aliases to reach its original declaration(s).
 */
function resolveAliasedSymbol(sym: ts.Symbol, checker: ts.TypeChecker): ts.Symbol {
  let resolved = sym;
  while (resolved.flags & ts.SymbolFlags.Alias) {
    resolved = checker.getAliasedSymbol(resolved);
  }
  return resolved;
}

/**
 * Given a mixin function's variable/function declaration, find class bodies inside it.
 * Handles arrow functions, function expressions, function declarations.
 */
function findClassesInFunctionBody(
  decl: ts.Declaration,
): Array<ts.ClassDeclaration | ts.ClassExpression> {
  const found: Array<ts.ClassDeclaration | ts.ClassExpression> = [];

  function visit(node: ts.Node) {
    if (ts.isClassDeclaration(node) || ts.isClassExpression(node)) {
      found.push(node);
      return; // don't recurse into nested classes
    }
    ts.forEachChild(node, visit);
  }

  if (ts.isVariableDeclaration(decl) && decl.initializer) {
    visit(decl.initializer);
  } else if (ts.isFunctionDeclaration(decl) && decl.body) {
    visit(decl.body);
  }

  return found;
}

/**
 * Walk the heritage expression of a class recursively.
 *
 * For a direct class reference: `extends EFMedia` → resolve symbol → class decl.
 * For a mixin call: `extends Mixin(Base)` → find the class body inside Mixin's
 * function, then recurse into the argument (Base).
 *
 * Returns an ordered list of ancestor nodes (outermost mixin first), stopping
 * at LitElement / ReactiveElement.
 */
function resolveInheritanceChain(
  classDecl: ts.ClassDeclaration,
  checker: ts.TypeChecker,
): InheritanceNode[] {
  const chain: InheritanceNode[] = [];
  const visited = new Set<ts.Node>();

  function walkExpr(expr: ts.Expression) {
    if (ts.isCallExpression(expr)) {
      // Mixin call: callee(arg) — find class bodies inside callee
      const calleeSym = checker.getSymbolAtLocation(expr.expression);
      if (calleeSym) {
        const resolved = resolveAliasedSymbol(calleeSym, checker);
        for (const d of resolved.declarations ?? []) {
          if (visited.has(d)) continue;
          visited.add(d);
          const classes = findClassesInFunctionBody(d);
          for (const cls of classes) {
            const name = cls.name?.text ?? "(anon)";
            if (LIT_BASE_CLASSES.has(name)) continue;
            chain.push({
              className: name,
              file: relPath(cls.getSourceFile().fileName),
              classDecl: cls,
              sourceFile: cls.getSourceFile(),
            });
            // Recurse into this class's own heritage (it extends the arg)
            walkClassHeritage(cls);
          }
        }
      }
      // Also recurse into the argument(s) to find deeper bases
      for (const arg of expr.arguments) {
        if (ts.isExpression(arg)) walkExpr(arg);
      }
    } else if (ts.isIdentifier(expr) || ts.isPropertyAccessExpression(expr)) {
      // Direct class reference
      const sym = checker.getSymbolAtLocation(expr);
      if (!sym) return;
      const resolved = resolveAliasedSymbol(sym, checker);
      for (const d of resolved.declarations ?? []) {
        if (visited.has(d)) continue;
        visited.add(d);
        if (ts.isClassDeclaration(d)) {
          const name = d.name?.text ?? "<anon>";
          if (LIT_BASE_CLASSES.has(name)) continue;
          chain.push({
            className: name,
            file: relPath(d.getSourceFile().fileName),
            classDecl: d,
            sourceFile: d.getSourceFile(),
          });
          walkClassHeritage(d);
        }
      }
    }
  }

  function walkClassHeritage(cls: ts.ClassDeclaration | ts.ClassExpression) {
    for (const clause of cls.heritageClauses ?? []) {
      if (clause.token !== ts.SyntaxKind.ExtendsKeyword) continue;
      for (const typeExpr of clause.types) {
        walkExpr(typeExpr.expression);
      }
    }
  }

  walkClassHeritage(classDecl);
  return chain;
}

// ---------------------------------------------------------------------------
// Core: find @customElement tag name
// ---------------------------------------------------------------------------

function getTagName(classDecl: ts.ClassDeclaration): string | null {
  if (!ts.canHaveDecorators(classDecl)) return null;
  const decorators = ts.getDecorators(classDecl);
  if (!decorators) return null;
  for (const mod of decorators) {
    if (!ts.isCallExpression(mod.expression)) continue;
    const callee = mod.expression.expression;
    if (ts.isIdentifier(callee) && callee.text === "customElement") {
      const [arg] = mod.expression.arguments;
      if (arg && ts.isStringLiteral(arg)) return arg.text;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Core: determine if a class is a Lit element subclass
// ---------------------------------------------------------------------------

function isLitElementSubclass(classDecl: ts.ClassDeclaration, checker: ts.TypeChecker): boolean {
  // Quick check: look for @customElement decorator
  if (getTagName(classDecl) !== null) return true;

  // Check heritage for LitElement
  function check(decl: ts.ClassDeclaration, depth: number): boolean {
    if (depth > 15) return false;
    const heritage = decl.heritageClauses;
    if (!heritage) return false;
    for (const clause of heritage) {
      if (clause.token !== ts.SyntaxKind.ExtendsKeyword) continue;
      for (const typeExpr of clause.types) {
        const type = checker.getTypeAtLocation(typeExpr.expression);
        const symbol = type.getSymbol();
        if (!symbol) continue;
        const name = symbol.name;
        if (LIT_BASE_CLASSES.has(name)) return true;
        for (const parentDecl of symbol.declarations ?? []) {
          if (ts.isClassDeclaration(parentDecl) && check(parentDecl, depth + 1)) return true;
        }
      }
    }
    return false;
  }

  return check(classDecl, 0);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const program = createProgram();
  const checker = program.getTypeChecker();

  const results: ElementInfo[] = [];

  for (const sourceFile of program.getSourceFiles()) {
    if (!shouldScanFile(sourceFile.fileName)) continue;

    ts.forEachChild(sourceFile, (node) => {
      if (!ts.isClassDeclaration(node)) return;
      if (!node.name) return;

      const className = node.name.text;
      if (filterElement && className !== filterElement) return;

      if (!isLitElementSubclass(node, checker)) return;

      const tagName = getTagName(node);
      const ownProps = extractProperties(node, checker, sourceFile);

      // Resolve inheritance chain and collect inherited properties
      const chain = resolveInheritanceChain(node, checker);
      const inheritedProps: PropertyInfo[] = [];
      for (const ancestor of chain) {
        const ancestorProps = extractProperties(ancestor.classDecl, checker, ancestor.sourceFile);
        inheritedProps.push(...ancestorProps);
      }

      results.push({
        className,
        tagName,
        file: relPath(sourceFile.fileName),
        ownProperties: ownProps,
        inheritedProperties: inheritedProps,
      });
    });
  }

  // Sort by tag name (elements with tag first), then class name
  results.sort((a, b) => {
    if (a.tagName && !b.tagName) return -1;
    if (!a.tagName && b.tagName) return 1;
    return (a.tagName ?? a.className).localeCompare(b.tagName ?? b.className);
  });

  process.stdout.write(JSON.stringify(results, null, 2) + "\n");
}

main();
