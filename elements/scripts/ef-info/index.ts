import { SCRIPT_NAME } from "../ef-utils/paths.js";
import { listSessions } from "./list.js";
import { infoHistory } from "./history.js";
import { infoSummary } from "./summary.js";
import { infoWarnings } from "./warnings.js";
import { infoErrors } from "./errors.js";
import { infoTest } from "./test.js";
import { infoLogs, infoLogPrefixes } from "./logs.js";
import { infoSearch } from "./search.js";
import { infoSuggest } from "./suggest.js";
import { infoCompare } from "./compare.js";
import { findSessionId, hasFlag, resolveSessionId } from "./utils.js";
import { loadSessionData } from "../ef-utils/session-storage.js";

export async function handleInfoCommand(args: string[]): Promise<void> {
  const subcommand = args[1];
  
  // Handle list command (doesn't require session ID)
  if (subcommand === "list") {
    const limitIndex = args.indexOf("--limit");
    const limit = limitIndex >= 0 && args[limitIndex + 1] ? parseInt(args[limitIndex + 1], 10) : undefined;
    const sandboxIndex = args.indexOf("--sandbox");
    const sandbox = sandboxIndex >= 0 && args[sandboxIndex + 1] ? args[sandboxIndex + 1] : undefined;
    await listSessions(limit, sandbox);
    process.exit(0);
  }
  
  // Handle history command (doesn't require session ID)
  if (subcommand === "history") {
    const sessionIdIndex = args.findIndex((a, i) => !a.startsWith("--") && a !== "history" && a !== "info" && (i === 0 || args[i - 1] !== "--limit"));
    const sessionId = sessionIdIndex >= 0 ? args[sessionIdIndex] : undefined;
    const limitIndex = args.indexOf("--limit");
    const limit = limitIndex >= 0 && args[limitIndex + 1] ? parseInt(args[limitIndex + 1], 10) : 10;
    const jsonFlag = hasFlag(args, "--json");
    await infoHistory(sessionId, limit, jsonFlag);
    process.exit(0);
  }
  
  // Handle compare command (doesn't use --session flag, takes two session IDs as positional args)
  if (subcommand === "compare") {
    const sessionId1Index = args.findIndex((a, i) => !a.startsWith("--") && a !== "compare" && a !== "info" && (i === 0 || args[i - 1] !== "--session"));
    const sessionId2Index = args.findIndex((a, i) => i > sessionId1Index && !a.startsWith("--") && a !== "compare" && a !== "info" && (i === 0 || args[i - 1] !== "--session"));
    const sessionId1 = sessionId1Index >= 0 ? args[sessionId1Index] : undefined;
    const sessionId2 = sessionId2Index >= 0 ? args[sessionId2Index] : undefined;
    
    if (!sessionId1 || !sessionId2) {
      console.error("Error: two session IDs are required");
      console.error(`Usage: ${SCRIPT_NAME} info compare <session-id-1> <session-id-2> [--json]`);
      process.exit(1);
    }
    const json = hasFlag(args, "--json");
    await infoCompare(sessionId1, sessionId2, json);
    process.exit(0);
  }
  
  // Show help if no subcommand provided
  if (!subcommand || subcommand.startsWith("--")) {
    console.log(`
Info Command - Progressive Discovery for Test Sessions

Usage:
  ${SCRIPT_NAME} info <subcommand> [--session <session-id>] [options]

Subcommands:
  list                          List available test sessions (no --session required)
  history [session-id]           Show test run history (optionally for specific session/sandbox)
  summary                       Show session summary (tests, duration, status)
  errors [type]                 Show error analysis (optionally filtered by type)
  warnings [type]               Show warning analysis (optionally filtered by type)
  test <name>                   Show individual test details
  logs [test-name]              Show logs (optionally filtered by test, level, or grep pattern)
  search <query>                Search tests and errors by name/message
  suggest                       Get AI-friendly suggestions based on session results
  compare <id1> <id2>           Compare two test sessions (supports "last", "previous" aliases)

Options:
  --session <id>                Session ID (required for all subcommands except list)
  --json                        Output JSON for machine parsing
  --unexpected                  (errors) Show only unexpected errors
  --logs                        (test) Include browser logs
  --profile                     (test) Include performance profile
  --grep <pattern>              (logs, test --logs) Filter logs by text pattern
  --level <level>               (logs, test --logs) Filter logs by level (error, warning, info, debug, log)
  --tests-only                  (search) Search only test names
  --errors-only                 (search) Search only errors

Examples:
  ${SCRIPT_NAME} info list                                    # List all sessions
  ${SCRIPT_NAME} info list --limit 5 --sandbox EFThumbnailStrip  # List recent 5 for sandbox
  ${SCRIPT_NAME} info history                                 # Show recent 10 runs
  ${SCRIPT_NAME} info history <session-id>                    # Show history relative to session
  ${SCRIPT_NAME} info summary --session ef-20260115-143022-a3f9
  ${SCRIPT_NAME} info errors --session ef-20260115-143022-a3f9
  ${SCRIPT_NAME} info errors scrubVideoInitSegmentFetchTask --session ef-20260115-143022-a3f9
  ${SCRIPT_NAME} info warnings --session ef-20260115-143022-a3f9
  ${SCRIPT_NAME} info warnings Canvas2D --session ef-20260115-143022-a3f9
  ${SCRIPT_NAME} info logs --session ef-20260115-143022-a3f9                # Show all log prefixes
  ${SCRIPT_NAME} info logs captureFromClone --session ef-20260115-143022-a3f9  # Show prefix details
  ${SCRIPT_NAME} info test "handles complex composition" --session ef-20260115-143022-a3f9
  ${SCRIPT_NAME} info test "EFThumbnailStrip:renders thumbnails" --logs --grep "error" --session ef-20260115-143022-a3f9
  ${SCRIPT_NAME} info logs --test "video" --level error --session ef-20260115-143022-a3f9
  ${SCRIPT_NAME} info logs --grep "rendition" --session ef-20260115-143022-a3f9
  ${SCRIPT_NAME} info search "video" --session ef-20260115-143022-a3f9
  ${SCRIPT_NAME} info suggest --session ef-20260115-143022-a3f9
  ${SCRIPT_NAME} info compare last previous                   # Compare last two runs
  ${SCRIPT_NAME} info compare <id> last                       # Compare session with latest
  ${SCRIPT_NAME} info compare <id1> <id2>

Note: Session IDs are printed after running '${SCRIPT_NAME} run'. Use progressive discovery
      to drill down into test results without overwhelming context windows.
`);
    process.exit(0);
  }
  
  let sessionId = findSessionId(args);
  
  if (!sessionId) {
    console.error("Error: --session <session-id> is required");
    console.error(`Usage: ${SCRIPT_NAME} info <subcommand> --session <session-id> [options]`);
    console.error(`\nList available sessions: ${SCRIPT_NAME} info list`);
    console.error(`Session IDs are also printed after running '${SCRIPT_NAME} run'`);
    console.error(`\nYou can also use aliases: "last", "previous" (e.g., --session last)`);
    process.exit(1);
  }
  
  // Resolve session ID alias if needed
  if (sessionId === "last" || sessionId === "latest" || sessionId === "previous" || sessionId === "prev") {
    const resolvedSessionId = resolveSessionId(sessionId);
    if (!resolvedSessionId) {
      console.error(`Session alias "${sessionId}" not found. No previous sessions available.`);
      console.error(`Run tests first: ${SCRIPT_NAME} run [sandbox-name]`);
      process.exit(1);
    }
    sessionId = resolvedSessionId;
  }
  
  const json = hasFlag(args, "--json");
  
  if (subcommand === "summary") {
    await infoSummary(sessionId, json);
  } else if (subcommand === "warnings") {
    const sessionIdIndex = args.indexOf("--session");
    if (sessionIdIndex < 0 || !args[sessionIdIndex + 1]) {
      console.error("Error: --session <session-id> is required");
      console.error(`Usage: ${SCRIPT_NAME} info warnings [<warning-type>] --session <session-id> [--json]`);
      process.exit(1);
    }
    const sessionId = args[sessionIdIndex + 1];
    const json = hasFlag(args, "--json");
    
    // Check if a specific warning type was provided
    const warningTypeIndex = args.findIndex((a, i) => 
      !a.startsWith("--") && 
      a !== "warnings" && 
      a !== "info" && 
      i > 0 && 
      args[i - 1] !== "--session" &&
      args[i - 1] !== "--json"
    );
    const warningType = warningTypeIndex >= 0 ? args[warningTypeIndex] : undefined;
    
    await infoWarnings(sessionId, warningType, json);
    process.exit(0);
  } else if (subcommand === "errors") {
    // Find error type - it's the first non-flag argument that's not "errors", "info", or the session ID
    const sessionIndex = args.indexOf("--session");
    const errorTypeIndex = args.findIndex((a, i) => 
      !a.startsWith("--") && 
      a !== "errors" && 
      a !== "info" && 
      (sessionIndex < 0 || i !== sessionIndex + 1) // Not the session ID value
    );
    const errorType = errorTypeIndex >= 0 ? args[errorTypeIndex] : undefined;
    const unexpectedOnly = hasFlag(args, "--unexpected");
    await infoErrors(sessionId, errorType, json, unexpectedOnly);
  } else if (subcommand === "test") {
    const testNameIndex = args.findIndex(a => !a.startsWith("--") && a !== "test" && a !== "info");
    const testName = testNameIndex >= 0 ? args[testNameIndex] : undefined;
    if (!testName) {
      console.error("Error: test name is required");
      console.error("\nUsage:");
      console.error(`  ${SCRIPT_NAME} info test "<scenario-name>" --session <session-id> [--logs] [--profile]`);
      console.error(`  ${SCRIPT_NAME} info test "SandboxName:<scenario-name>" --session <session-id> [--logs] [--profile]`);
      console.error("\nTest name formats:");
      console.error("  - Scenario name only: \"dispatches position-changed event\"");
      console.error("  - With sandbox prefix: \"EFOverlayItem:dispatches position-changed event\"");
      console.error("\nExamples:");
      console.error(`  ${SCRIPT_NAME} info test "plays audio in timegroup" --session <id>`);
      console.error(`  ${SCRIPT_NAME} info test "EFAudio:plays audio in timegroup" --session <id>`);
      process.exit(1);
    }
    const logs = hasFlag(args, "--logs");
    const profile = hasFlag(args, "--profile");
    const grepIndex = args.indexOf("--grep");
    const grep = grepIndex >= 0 && args[grepIndex + 1] ? args[grepIndex + 1] : undefined;
    const levelIndex = args.indexOf("--level");
    const level = levelIndex >= 0 && args[levelIndex + 1] ? args[levelIndex + 1] : undefined;
    await infoTest(sessionId, testName, json, logs, profile, grep, level);
  } else if (subcommand === "logs") {
    // Logs can take optional prefix/test name as positional arg, or use --test flag
    const testFlagIndex = args.indexOf("--test");
    const testNameFromFlag = testFlagIndex >= 0 && args[testFlagIndex + 1] ? args[testFlagIndex + 1] : undefined;
    const testNameIndex = args.findIndex((a, i) => 
      !a.startsWith("--") && 
      a !== "logs" && 
      a !== "info" && 
      (i === 0 || (args[i - 1] !== "--grep" && args[i - 1] !== "--level" && args[i - 1] !== "--test" && args[i - 1] !== "--session"))
    );
    const testNameFromPos = testNameIndex >= 0 ? args[testNameIndex] : undefined;
    const testName = testNameFromFlag || testNameFromPos;
    
    // Check if the positional arg is a log prefix (by checking if it exists in logPrefixes)
    // If it's a prefix, show prefix details; otherwise treat as test name
    if (testNameFromPos && !testNameFromFlag) {
      const data = loadSessionData(sessionId);
      if (data && data.logPrefixes.has(testNameFromPos)) {
        // Show log prefix details
        await infoLogPrefixes(sessionId, testNameFromPos, json);
        return;
      }
    }
    
    // Show logs (filtered by test name if provided, or show all prefixes if no args)
    if (!testName && !testNameFromFlag) {
      // No test name or prefix provided - show all log prefixes
      await infoLogPrefixes(sessionId, undefined, json);
    } else {
      // Show logs filtered by test name
      const grepIndex = args.indexOf("--grep");
      const grep = grepIndex >= 0 && args[grepIndex + 1] ? args[grepIndex + 1] : undefined;
      const levelIndex = args.indexOf("--level");
      const level = levelIndex >= 0 && args[levelIndex + 1] ? args[levelIndex + 1] : undefined;
      await infoLogs(sessionId, testName, grep, level, json);
    }
  } else if (subcommand === "search") {
    const queryIndex = args.findIndex(a => !a.startsWith("--") && a !== "search" && a !== "info");
    const query = queryIndex >= 0 ? args[queryIndex] : undefined;
    if (!query) {
      console.error("Error: search query is required");
      console.error(`Usage: ${SCRIPT_NAME} info search <query> --session <session-id> [--json] [--tests-only] [--errors-only]`);
      process.exit(1);
    }
    const testsOnly = hasFlag(args, "--tests-only");
    const errorsOnly = hasFlag(args, "--errors-only");
    await infoSearch(sessionId, query, json, testsOnly, errorsOnly);
  } else if (subcommand === "suggest") {
    await infoSuggest(sessionId, json);
  } else {
    console.error(`Unknown subcommand: ${subcommand}`);
    console.error(`Usage: ${SCRIPT_NAME} info <subcommand> [--session <session-id>] [options]`);
    console.error(`\nList available subcommands: ${SCRIPT_NAME} info`);
    process.exit(1);
  }
}
