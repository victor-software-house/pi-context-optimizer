import type { ExtensionAPI, ExtensionCommandContext } from "@mariozechner/pi-coding-agent";
import type { RtkIntegrationConfig } from "./types.js";

interface RtkCompatController {
	getConfig(): RtkIntegrationConfig;
	setConfig(next: RtkIntegrationConfig, ctx: ExtensionCommandContext): void;
	getMetricsSummary(): string;
	clearMetrics(): void;
}

interface BooleanToggleDefinition {
	name: string;
	description: string;
	getValue(config: RtkIntegrationConfig): boolean;
	setValue(config: RtkIntegrationConfig, nextValue: boolean): RtkIntegrationConfig;
}

const BOOLEAN_TOGGLES: BooleanToggleDefinition[] = [
	{
		name: "ansiStripping",
		description: "Toggle ANSI stripping for compacted output",
		getValue: (config) => config.outputCompaction.stripAnsi,
		setValue: (config, nextValue) => ({
			...config,
			outputCompaction: {
				...config.outputCompaction,
				stripAnsi: nextValue,
			},
		}),
	},
	{
		name: "testOutputAggregation",
		description: "Toggle test output aggregation",
		getValue: (config) => config.outputCompaction.aggregateTestOutput,
		setValue: (config, nextValue) => ({
			...config,
			outputCompaction: {
				...config.outputCompaction,
				aggregateTestOutput: nextValue,
			},
		}),
	},
	{
		name: "buildOutputFiltering",
		description: "Toggle build output filtering",
		getValue: (config) => config.outputCompaction.filterBuildOutput,
		setValue: (config, nextValue) => ({
			...config,
			outputCompaction: {
				...config.outputCompaction,
				filterBuildOutput: nextValue,
			},
		}),
	},
	{
		name: "gitCompaction",
		description: "Toggle git output compaction",
		getValue: (config) => config.outputCompaction.compactGitOutput,
		setValue: (config, nextValue) => ({
			...config,
			outputCompaction: {
				...config.outputCompaction,
				compactGitOutput: nextValue,
			},
		}),
	},
	{
		name: "searchResultGrouping",
		description: "Toggle grep/search result grouping",
		getValue: (config) => config.outputCompaction.groupSearchOutput,
		setValue: (config, nextValue) => ({
			...config,
			outputCompaction: {
				...config.outputCompaction,
				groupSearchOutput: nextValue,
			},
		}),
	},
	{
		name: "linterAggregation",
		description: "Toggle linter output aggregation",
		getValue: (config) => config.outputCompaction.aggregateLinterOutput,
		setValue: (config, nextValue) => ({
			...config,
			outputCompaction: {
				...config.outputCompaction,
				aggregateLinterOutput: nextValue,
			},
		}),
	},
	{
		name: "truncation",
		description: "Toggle output truncation",
		getValue: (config) => config.outputCompaction.truncate.enabled,
		setValue: (config, nextValue) => ({
			...config,
			outputCompaction: {
				...config.outputCompaction,
				truncate: {
					...config.outputCompaction.truncate,
					enabled: nextValue,
				},
			},
		}),
	},
	{
		name: "sourceCodeFiltering",
		description: "Toggle source-code filtering for read output",
		getValue: (config) => config.outputCompaction.sourceCodeFilteringEnabled,
		setValue: (config, nextValue) => ({
			...config,
			outputCompaction: {
				...config.outputCompaction,
				sourceCodeFilteringEnabled: nextValue,
			},
		}),
	},
	{
		name: "smartTruncation",
		description: "Toggle smart truncation for read output",
		getValue: (config) => config.outputCompaction.smartTruncate.enabled,
		setValue: (config, nextValue) => ({
			...config,
			outputCompaction: {
				...config.outputCompaction,
				smartTruncate: {
					...config.outputCompaction.smartTruncate,
					enabled: nextValue,
				},
			},
		}),
	},
];

function toOnOff(value: boolean): string {
	return value ? "enabled" : "disabled";
}

function buildWhatSummary(config: RtkIntegrationConfig): string {
	const output = config.outputCompaction;
	return [
		`RTK enabled: ${config.enabled}`,
		`ansiStripping: ${output.stripAnsi}`,
		`truncation: enabled=${output.truncate.enabled}, maxChars=${output.truncate.maxChars}`,
		`sourceCodeFiltering: enabled=${output.sourceCodeFilteringEnabled}, level=${output.sourceCodeFiltering}`,
		`smartTruncation: enabled=${output.smartTruncate.enabled}, maxLines=${output.smartTruncate.maxLines}`,
		`testOutputAggregation: ${output.aggregateTestOutput}`,
		`buildOutputFiltering: ${output.filterBuildOutput}`,
		`gitCompaction: ${output.compactGitOutput}`,
		`searchResultGrouping: ${output.groupSearchOutput}`,
		`linterAggregation: ${output.aggregateLinterOutput}`,
	].join("\n");
}

export function registerRtkCompatCommands(pi: ExtensionAPI, controller: RtkCompatController): void {
	pi.registerCommand("rtk-stats", {
		description: "Show RTK output compaction metrics",
		handler: async (_args, ctx) => {
			ctx.ui.notify(controller.getMetricsSummary(), "info");
		},
	});

	pi.registerCommand("rtk-on", {
		description: "Enable RTK integration",
		handler: async (_args, ctx) => {
			const current = controller.getConfig();
			controller.setConfig({ ...current, enabled: true }, ctx);
			ctx.ui.notify("RTK integration enabled.", "info");
		},
	});

	pi.registerCommand("rtk-off", {
		description: "Disable RTK integration",
		handler: async (_args, ctx) => {
			const current = controller.getConfig();
			controller.setConfig({ ...current, enabled: false }, ctx);
			ctx.ui.notify("RTK integration disabled.", "warning");
		},
	});

	pi.registerCommand("rtk-clear", {
		description: "Clear RTK metrics history",
		handler: async (_args, ctx) => {
			controller.clearMetrics();
			ctx.ui.notify("RTK metrics cleared.", "info");
		},
	});

	pi.registerCommand("rtk-what", {
		description: "Show current RTK integration output settings",
		handler: async (_args, ctx) => {
			ctx.ui.notify(buildWhatSummary(controller.getConfig()), "info");
		},
	});

	for (const toggle of BOOLEAN_TOGGLES) {
		pi.registerCommand(`rtk-toggle-${toggle.name}`, {
			description: toggle.description,
			handler: async (_args, ctx) => {
				const current = controller.getConfig();
				const nextValue = !toggle.getValue(current);
				controller.setConfig(toggle.setValue(current, nextValue), ctx);
				ctx.ui.notify(`RTK ${toggle.name} ${toOnOff(nextValue)}.`, nextValue ? "info" : "warning");
			},
		});
	}
}
