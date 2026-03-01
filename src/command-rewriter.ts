import type { RtkIntegrationConfig } from "./types.js";
import { RTK_REWRITE_RULES, type RtkRewriteCategory, type RtkRewriteRule } from "./rewrite-rules.js";

const ENV_PREFIX_PATTERN = /^((?:[A-Za-z_][A-Za-z0-9_]*=[^\s]*\s+)*)/;

type CommandToken =
	| {
			type: "segment";
			value: string;
	  }
	| {
			type: "separator";
			value: string;
	  };

export interface RewriteDecision {
	changed: boolean;
	originalCommand: string;
	rewrittenCommand: string;
	rule?: RtkRewriteRule;
	reason:
		| "ok"
		| "empty"
		| "already_rtk"
		| "heredoc"
		| "disabled_category"
		| "no_match";
}

interface SegmentRewriteResult {
	value: string;
	changed: boolean;
	rule?: RtkRewriteRule;
	skippedByDisabledCategory: boolean;
	considered: boolean;
	alreadyRtk: boolean;
}

interface SingleSegmentRewriteResult {
	changed: boolean;
	rule?: RtkRewriteRule;
	rewrittenBody?: string;
	skippedByDisabledCategory: boolean;
	alreadyRtk: boolean;
}

function categoryEnabled(config: RtkIntegrationConfig, category: RtkRewriteCategory): boolean {
	switch (category) {
		case "gitGithub":
			return config.rewriteGitGithub;
		case "filesystem":
			return config.rewriteFilesystem;
		case "rust":
			return config.rewriteRust;
		case "javascript":
			return config.rewriteJavaScript;
		case "python":
			return config.rewritePython;
		case "go":
			return config.rewriteGo;
		case "containers":
			return config.rewriteContainers;
		case "network":
			return config.rewriteNetwork;
		case "packageManagers":
			return config.rewritePackageManagers;
		default:
			return true;
	}
}

function tokenizeCommand(command: string): CommandToken[] {
	if (!command) {
		return [];
	}

	const tokens: CommandToken[] = [];
	let segmentStart = 0;
	let quote: "'" | '"' | "`" | null = null;
	let escaped = false;

	for (let index = 0; index < command.length; index += 1) {
		const char = command[index];

		if (escaped) {
			escaped = false;
			continue;
		}

		if (quote !== null) {
			if (char === "\\" && quote !== "'") {
				escaped = true;
				continue;
			}
			if (char === quote) {
				quote = null;
			}
			continue;
		}

		if (char === "'" || char === '"' || char === "`") {
			quote = char;
			continue;
		}

		const nextChar = command[index + 1] ?? "";
		if ((char === "&" && nextChar === "&") || (char === "|" && nextChar === "|")) {
			const segment = command.slice(segmentStart, index);
			if (segment.length > 0) {
				tokens.push({ type: "segment", value: segment });
			}
			tokens.push({ type: "separator", value: command.slice(index, index + 2) });
			segmentStart = index + 2;
			index += 1;
			continue;
		}

		if (char === ";") {
			const segment = command.slice(segmentStart, index);
			if (segment.length > 0) {
				tokens.push({ type: "segment", value: segment });
			}
			tokens.push({ type: "separator", value: ";" });
			segmentStart = index + 1;
		}
	}

	const tail = command.slice(segmentStart);
	if (tail.length > 0 || tokens.length === 0) {
		tokens.push({ type: "segment", value: tail });
	}

	return tokens;
}

export function isAlreadyRtkCommand(command: string): boolean {
	const trimmed = command.trimStart();
	return /^rtk\s+/.test(trimmed) || /(?:^|\s)[^\s]*\/rtk\s+/.test(trimmed);
}

function applyPlatformProxyCommandFixups(command: string): string {
	if (process.platform !== "win32") {
		return command;
	}

	const windowsProxyExecutables: Array<[string, string]> = [
		["npm", "npm.cmd"],
		["npx", "npx.cmd"],
		["pnpm", "pnpm.cmd"],
		["yarn", "yarn.cmd"],
	];

	let next = command;
	for (const [base, windowsExecutable] of windowsProxyExecutables) {
		next = next.replace(
			new RegExp(`^(rtk\\s+proxy\\s+)${base}(\\b)`, "i"),
			`$1${windowsExecutable}$2`,
		);
	}

	return next;
}

function rewriteSingleSegmentCommand(
	segmentCommand: string,
	config: RtkIntegrationConfig,
): SingleSegmentRewriteResult {
	const envMatch = segmentCommand.match(ENV_PREFIX_PATTERN);
	const envPrefix = envMatch?.[1] ?? "";
	const commandBody = segmentCommand.slice(envPrefix.length);

	if (isAlreadyRtkCommand(segmentCommand) || isAlreadyRtkCommand(commandBody)) {
		return {
			changed: false,
			alreadyRtk: true,
			skippedByDisabledCategory: false,
		};
	}

	let skippedByDisabledCategory = false;

	for (const rule of RTK_REWRITE_RULES) {
		if (!categoryEnabled(config, rule.category)) {
			skippedByDisabledCategory = true;
			continue;
		}

		rule.matcher.lastIndex = 0;
		if (!rule.matcher.test(commandBody)) {
			continue;
		}

		rule.matcher.lastIndex = 0;
		const rewrittenBody = commandBody.replace(rule.matcher, rule.replacement);
		const finalizedRewrittenBody = applyPlatformProxyCommandFixups(rewrittenBody);
		if (finalizedRewrittenBody === commandBody) {
			continue;
		}

		return {
			changed: true,
			rule,
			rewrittenBody: finalizedRewrittenBody,
			alreadyRtk: false,
			skippedByDisabledCategory,
		};
	}

	return {
		changed: false,
		alreadyRtk: false,
		skippedByDisabledCategory,
	};
}

function rewriteSegment(segment: string, config: RtkIntegrationConfig): SegmentRewriteResult {
	const leadingWhitespace = segment.match(/^\s*/)?.[0] ?? "";
	const trailingWhitespace = segment.match(/\s*$/)?.[0] ?? "";
	const core = segment.trim();

	if (!core) {
		return {
			value: segment,
			changed: false,
			skippedByDisabledCategory: false,
			considered: false,
			alreadyRtk: false,
		};
	}

	const rewrite = rewriteSingleSegmentCommand(core, config);
	if (!rewrite.changed || !rewrite.rule) {
		return {
			value: segment,
			changed: false,
			rule: undefined,
			skippedByDisabledCategory: rewrite.skippedByDisabledCategory,
			considered: true,
			alreadyRtk: rewrite.alreadyRtk,
		};
	}

	const envMatch = core.match(ENV_PREFIX_PATTERN);
	const envPrefix = envMatch?.[1] ?? "";
	const commandBody = core.slice(envPrefix.length);
	rewrite.rule.matcher.lastIndex = 0;
	const rewrittenBody = rewrite.rewrittenBody ?? commandBody.replace(rewrite.rule.matcher, rewrite.rule.replacement);

	return {
		value: `${leadingWhitespace}${envPrefix}${rewrittenBody}${trailingWhitespace}`,
		changed: true,
		rule: rewrite.rule,
		skippedByDisabledCategory: rewrite.skippedByDisabledCategory,
		considered: true,
		alreadyRtk: false,
	};
}

export function computeRewriteDecision(command: string, config: RtkIntegrationConfig): RewriteDecision {
	const original = command;
	const trimmed = command.trim();
	if (!trimmed) {
		return {
			changed: false,
			originalCommand: original,
			rewrittenCommand: original,
			reason: "empty",
		};
	}

	if (trimmed.includes("<<")) {
		return {
			changed: false,
			originalCommand: original,
			rewrittenCommand: original,
			reason: "heredoc",
		};
	}

	const tokens = tokenizeCommand(command);
	if (tokens.length === 0) {
		return {
			changed: false,
			originalCommand: original,
			rewrittenCommand: original,
			reason: "no_match",
		};
	}

	let changed = false;
	let skippedByDisabledCategory = false;
	let firstRule: RtkRewriteRule | undefined;
	let consideredSegments = 0;
	let alreadyRtkSegments = 0;

	const rewrittenTokens = tokens.map((token) => {
		if (token.type === "separator") {
			return token;
		}

		const result = rewriteSegment(token.value, config);
		if (result.considered) {
			consideredSegments += 1;
			if (result.alreadyRtk) {
				alreadyRtkSegments += 1;
			}
		}
		if (result.skippedByDisabledCategory) {
			skippedByDisabledCategory = true;
		}
		if (result.changed) {
			changed = true;
			if (!firstRule) {
				firstRule = result.rule;
			}
		}

		return {
			type: "segment" as const,
			value: result.value,
		};
	});

	if (changed) {
		return {
			changed: true,
			originalCommand: original,
			rewrittenCommand: rewrittenTokens.map((token) => token.value).join(""),
			rule: firstRule,
			reason: "ok",
		};
	}

	if (consideredSegments > 0 && consideredSegments === alreadyRtkSegments) {
		return {
			changed: false,
			originalCommand: original,
			rewrittenCommand: original,
			reason: "already_rtk",
		};
	}

	return {
		changed: false,
		originalCommand: original,
		rewrittenCommand: original,
		reason: skippedByDisabledCategory ? "disabled_category" : "no_match",
	};
}
