export { stripAnsi, stripAnsiFast } from "./ansi.js";
export { truncate } from "./truncate.js";
export { filterBuildOutput, isBuildCommand } from "./build.js";
export { aggregateTestOutput, isTestCommand } from "./test-output.js";
export { aggregateLinterOutput, isLinterCommand } from "./linter.js";
export {
	detectLanguage,
	filterMinimal,
	filterAggressive,
	smartTruncate,
	filterSourceCode,
	type Language,
} from "./source.js";
export { compactDiff, compactStatus, compactLog, compactGitOutput, isGitCommand } from "./git.js";
export { groupSearchResults } from "./search.js";
export { normalizeCommandForDetection, matchesCommandPatterns } from "./command-detection.js";
