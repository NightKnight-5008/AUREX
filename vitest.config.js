import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config.js";
import { EnhancedVitestMarkdownReporter } from "./test/enhancedMarkdownReporter.js";
import {
	PARALLEL_CONFIG,
	REPORTER_CONFIG,
	TIMEOUT_CONFIG,
} from "./test/template-tests/test.config.ts";
import AlphabeticalSequencer from "./test/alphabeticalSequencer.ts";

// Load .env file for tests
function loadDotEnv() {
	try {
		const envFile = readFileSync(resolve(__dirname, ".env"), "utf-8");
		const env = {};
		for (const line of envFile.split("\n")) {
			const trimmed = line.trim();
			if (trimmed && !trimmed.startsWith("#")) {
				const [key, ...valueParts] = trimmed.split("=");
				if (key) {
					env[key.trim()] = valueParts.join("=").trim();
				}
			}
		}
		return env;
	} catch (_error) {
		return {};
	}
}

export default mergeConfig(
	viteConfig,
	defineConfig({
		test: {
			globals: true,
			environment: "jsdom",
			env: loadDotEnv(),
			// Parallel execution configuration
			fileParallelism: PARALLEL_CONFIG.enabled,
			maxConcurrency: PARALLEL_CONFIG.maxConcurrency,
			testTimeout: TIMEOUT_CONFIG.testTimeout,
			// Ensure parallel file execution even on low-core machines (e.g., GitHub Actions 2 vCPU runners)
			maxWorkers: PARALLEL_CONFIG.maxWorkers,
			minWorkers: PARALLEL_CONFIG.minWorkers,
			// Sort test files alphabetically for deterministic ordering
			sequence: {
				sequencer: AlphabeticalSequencer,
			},
			reporters: process.env.GITHUB_ACTIONS
				? [
						"default",
						"github-actions",
						new EnhancedVitestMarkdownReporter({
							title: process.env.TEST_REPORT_TITLE || REPORTER_CONFIG.title,
							enableGithubActionsSummary:
								REPORTER_CONFIG.enableGithubActionsSummary,
							outputPath: "test-results.md",
						}),
					]
				: ["default"],
		},
	}),
);
