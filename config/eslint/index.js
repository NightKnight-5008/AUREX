/**
 * ESLint Configuration Index
 * 
 * Centralized configuration management for different linting contexts.
 * This provides a single entry point for all ESLint configurations.
 */

import baseConfig from './base.config.js';
import mcpConfig from './eslint.mcp.config.js';

export { baseConfig, mcpConfig };

// Default export uses base configuration
export default [
  ...baseConfig
]; 