import nextConfig from "eslint-config-next";

// Use Next.js' native flat config for ESLint 9+.
const config = [
    {
        ignores: [".next/**", "node_modules/**", "dist/**", "build/**", "out/**", "public/**", "**/*.d.ts", ".worktrees/**"]
    },
    ...nextConfig
];

export default config;
