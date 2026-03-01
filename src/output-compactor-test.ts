import assert from "node:assert/strict";

import { compactToolResult } from "./output-compactor.ts";
import { DEFAULT_RTK_INTEGRATION_CONFIG, type RtkIntegrationConfig } from "./types.ts";

function runTest(name: string, testFn: () => void): void {
	testFn();
	console.log(`[PASS] ${name}`);
}

function cloneConfig(): RtkIntegrationConfig {
	return structuredClone(DEFAULT_RTK_INTEGRATION_CONFIG);
}

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

runTest("precision read with offset keeps exact output (no source/smart/hard truncation)", () => {
	const config = cloneConfig();
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
	const config = cloneConfig();
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
	const config = cloneConfig();
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
	const config = cloneConfig();
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

console.log("All output-compactor tests passed.");
