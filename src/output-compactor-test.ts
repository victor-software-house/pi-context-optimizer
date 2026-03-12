import assert from "node:assert/strict";
import { homedir } from "node:os";
import { join } from "node:path";

import { compactToolResult } from "./output-compactor.ts";
import { cloneDefaultConfig, runTest } from "./test-helpers.ts";

function buildReadContent(lineCount: number): string {
	const lines: string[] = [];
	for (let index = 0; index < lineCount; index += 1) {
		if (index % 2 === 0) {
			lines.push(`// comment ${index}`);
		} else {
			lines.push(`const value${index} = ${index};`);
		}
	}
	return `${lines.join("\n")}\n`;
}

function firstTextBlock(content: unknown[] | undefined): string {
	if (!Array.isArray(content) || content.length === 0) {
		return "";
	}
	const first = content[0] as { type?: string; text?: string };
	if (first?.type !== "text" || typeof first.text !== "string") {
		return "";
	}
	return first.text;
}

const OUTPUT_EMOJI_MARKERS = ["✓", "✔", "❌", "⚠️", "⚠", "📋", "📄", "🔍", "✅", "⏭️", "📌", "📝", "❓", "•"];

function compactBashOutput(command: string, text: string): string {
	const result = compactToolResult(
		{
			toolName: "bash",
			input: { command },
			content: [{ type: "text", text }],
		},
		cloneDefaultConfig(),
	);

	assert.equal(result.changed, true);
	return firstTextBlock(result.content);
}

function compactGrepOutput(text: string): string {
	const result = compactToolResult(
		{
			toolName: "grep",
			input: { pattern: "match" },
			content: [{ type: "text", text }],
		},
		cloneDefaultConfig(),
	);

	assert.equal(result.changed, true);
	return firstTextBlock(result.content);
}

function assertNoOutputEmoji(text: string): void {
	for (const marker of OUTPUT_EMOJI_MARKERS) {
		assert.equal(text.includes(marker), false, `Unexpected output emoji marker: ${marker}`);
	}
}

runTest("precision read with offset keeps exact output (no source/smart/hard truncation)", () => {
	const config = cloneDefaultConfig();
	config.outputCompaction.truncate.enabled = true;
	config.outputCompaction.truncate.maxChars = 500;
	config.outputCompaction.smartTruncate.enabled = true;
	config.outputCompaction.smartTruncate.maxLines = 40;

	const content = buildReadContent(220);
	const result = compactToolResult(
		{
			toolName: "read",
			input: { path: "sample.ts", offset: 1 },
			content: [{ type: "text", text: content }],
		},
		config,
	);

	assert.equal(result.changed, false);
	assert.deepEqual(result.techniques, []);
});

runTest("precision read with limit keeps exact output", () => {
	const config = cloneDefaultConfig();
	config.outputCompaction.truncate.enabled = true;
	config.outputCompaction.truncate.maxChars = 500;
	config.outputCompaction.smartTruncate.enabled = true;
	config.outputCompaction.smartTruncate.maxLines = 40;

	const content = buildReadContent(220);
	const result = compactToolResult(
		{
			toolName: "read",
			input: { path: "sample.ts", limit: 200 },
			content: [{ type: "text", text: content }],
		},
		config,
	);

	assert.equal(result.changed, false);
	assert.deepEqual(result.techniques, []);
});

runTest("normal read compacts and adds banner", () => {
	const config = cloneDefaultConfig();
	config.outputCompaction.smartTruncate.enabled = true;
	config.outputCompaction.smartTruncate.maxLines = 40;

	const content = buildReadContent(220);
	const result = compactToolResult(
		{
			toolName: "read",
			input: { path: "sample.ts" },
			content: [{ type: "text", text: content }],
		},
		config,
	);

	assert.equal(result.changed, true);
	assert.ok(result.techniques.includes("source:minimal"));

	const compacted = firstTextBlock(result.content);
	assert.ok(compacted.startsWith("[RTK compacted output:"));
	assert.ok(compacted.includes("source:minimal"));
});

runTest("short read output stays exact below threshold", () => {
	const config = cloneDefaultConfig();
	const content = buildReadContent(40);

	const result = compactToolResult(
		{
			toolName: "read",
			input: { path: "sample.ts" },
			content: [{ type: "text", text: content }],
		},
		config,
	);

	assert.equal(result.changed, false);
	assert.deepEqual(result.techniques, []);
});

runTest("read output stays exact at the 80-line boundary with trailing newline", () => {
	const config = cloneDefaultConfig();
	config.outputCompaction.smartTruncate.enabled = true;
	config.outputCompaction.smartTruncate.maxLines = 40;

	const content = buildReadContent(80);
	const result = compactToolResult(
		{
			toolName: "read",
			input: { path: "sample.ts" },
			content: [{ type: "text", text: content }],
		},
		config,
	);

	assert.equal(result.changed, false);
	assert.deepEqual(result.techniques, []);
});

runTest("read output compacts once the content exceeds the 80-line exactness threshold", () => {
	const config = cloneDefaultConfig();
	config.outputCompaction.smartTruncate.enabled = true;
	config.outputCompaction.smartTruncate.maxLines = 40;

	const content = buildReadContent(81);
	const result = compactToolResult(
		{
			toolName: "read",
			input: { path: "sample.ts" },
			content: [{ type: "text", text: content }],
		},
		config,
	);

	assert.equal(result.changed, true);
	assert.ok(result.techniques.includes("source:minimal") || result.techniques.includes("smart-truncate"));
});

runTest("source file reads skip lossy source filtering when truncation safeguards are not needed", () => {
	const config = cloneDefaultConfig();
	config.outputCompaction.smartTruncate.enabled = false;
	config.outputCompaction.truncate.enabled = false;

	const content = buildReadContent(120);
	const result = compactToolResult(
		{
			toolName: "read",
			input: { path: "sample.ts" },
			content: [{ type: "text", text: content }],
		},
		config,
	);

	assert.equal(result.changed, false);
	assert.deepEqual(result.techniques, []);
	assert.equal(firstTextBlock(result.content), "");
});

runTest("skill reads stay exact when preserveExactSkillReads is enabled for user skills", () => {
	const config = cloneDefaultConfig();
	config.outputCompaction.preserveExactSkillReads = true;
	config.outputCompaction.truncate.enabled = true;
	config.outputCompaction.truncate.maxChars = 500;
	config.outputCompaction.smartTruncate.enabled = true;
	config.outputCompaction.smartTruncate.maxLines = 40;

	const content = buildReadContent(220);
	const result = compactToolResult(
		{
			toolName: "read",
			input: { path: join(homedir(), ".pi", "agent", "skills", "example", "SKILL.md") },
			content: [{ type: "text", text: content }],
		},
		config,
	);

	assert.equal(result.changed, false);
	assert.deepEqual(result.techniques, []);
});

runTest("project .pi skill reads stay exact when preserveExactSkillReads is enabled", () => {
	const config = cloneDefaultConfig();
	config.outputCompaction.preserveExactSkillReads = true;
	config.outputCompaction.truncate.enabled = true;
	config.outputCompaction.truncate.maxChars = 500;
	config.outputCompaction.smartTruncate.enabled = true;
	config.outputCompaction.smartTruncate.maxLines = 40;

	const content = buildReadContent(220);
	const result = compactToolResult(
		{
			toolName: "read",
			input: { path: ".pi/skills/example/SKILL.md" },
			content: [{ type: "text", text: content }],
		},
		config,
	);

	assert.equal(result.changed, false);
	assert.deepEqual(result.techniques, []);
});

runTest("ancestor .agents skill reads stay exact when preserveExactSkillReads is enabled", () => {
	const config = cloneDefaultConfig();
	config.outputCompaction.preserveExactSkillReads = true;
	config.outputCompaction.truncate.enabled = true;
	config.outputCompaction.truncate.maxChars = 500;
	config.outputCompaction.smartTruncate.enabled = true;
	config.outputCompaction.smartTruncate.maxLines = 40;

	const content = buildReadContent(220);
	const result = compactToolResult(
		{
			toolName: "read",
			input: { path: "../.agents/skills/example/SKILL.md" },
			content: [{ type: "text", text: content }],
		},
		config,
	);

	assert.equal(result.changed, false);
	assert.deepEqual(result.techniques, []);
});

runTest("build output uses plain-text status markers", () => {
	const compacted = compactBashOutput("npm run build", "Compiling app v0.1.0\n");

	assert.equal(compacted, "[OK] Build successful (1 units compiled)");
	assertNoOutputEmoji(compacted);
});

runTest("git status output uses plain-text labels", () => {
	const compacted = compactBashOutput(
		"git status --short --branch",
		"## main...origin/main\nM  staged.ts\n M modified.ts\n?? new.ts\nUU conflict.ts\n",
	);

	assert.ok(compacted.startsWith("Branch: main\n"));
	assert.ok(compacted.includes("Staged: 1 files\n  staged.ts\n"));
	assert.ok(compacted.includes("Modified: 1 files\n  modified.ts\n"));
	assert.ok(compacted.includes("Untracked: 1 files\n  new.ts\n"));
	assert.ok(compacted.includes("Conflicts: 1 files"));
	assertNoOutputEmoji(compacted);
});

runTest("git diff output uses plain-text file markers", () => {
	const compacted = compactBashOutput(
		"git diff",
		"diff --git a/src/example.ts b/src/example.ts\n@@ -1 +1 @@\n-oldValue\n+newValue\n",
	);

	assert.ok(compacted.includes("\n> src/example.ts\n"));
	assertNoOutputEmoji(compacted);
});

runTest("linter success output uses plain-text status markers", () => {
	const compacted = compactBashOutput("npx eslint .", "");

	assert.equal(compacted, "[OK] ESLint: No issues found");
	assertNoOutputEmoji(compacted);
});

runTest("test output uses plain-text labels and bullets", () => {
	const compacted = compactBashOutput(
		"bun test",
		"3 passed, 1 failed, 2 skipped\nFAIL src/example.test.ts\n  Expected: true\n  Received: false\n\n\n",
	);

	assert.ok(compacted.includes("Test Results:"));
	assert.ok(compacted.includes("PASS: 3 passed"));
	assert.ok(compacted.includes("FAIL: 1 failed"));
	assert.ok(compacted.includes("SKIP: 2 skipped"));
	assert.ok(compacted.includes("   - FAIL src/example.test.ts"));
	assertNoOutputEmoji(compacted);
});

runTest("search output uses plain-text summary and file markers", () => {
	const compacted = compactGrepOutput("src/a.ts:1:const match = true;\nsrc/b.ts:2:return match;\n");

	assert.ok(compacted.startsWith("2 matches in 2 files:\n\n"));
	assert.ok(compacted.includes("> src/a.ts (1 matches):\n"));
	assert.ok(compacted.includes("> src/b.ts (1 matches):\n"));
	assertNoOutputEmoji(compacted);
});

console.log("All output-compactor tests passed.");
