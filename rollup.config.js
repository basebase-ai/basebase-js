import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";

const external = ["js-cookie"];

const plugins = [
  resolve({
    preferBuiltins: false,
    browser: true,
  }),
  commonjs(),
  typescript({
    tsconfig: "./tsconfig.json",
    exclude: ["**/*.test.ts", "**/*.spec.ts"],
  }),
];

export default [
  // ES Modules build
  {
    input: "src/index.ts",
    output: {
      file: "dist/index.esm.js",
      format: "es",
      sourcemap: true,
    },
    external,
    plugins,
  },
  // CommonJS build
  {
    input: "src/index.ts",
    output: {
      file: "dist/index.cjs",
      format: "cjs",
      sourcemap: true,
      exports: "named",
    },
    external,
    plugins,
  },
  // Browser UMD build (for script tag usage)
  {
    input: "src/index.ts",
    output: {
      file: "dist/index.umd.js",
      format: "umd",
      name: "BasebaseSDK",
      sourcemap: true,
      globals: {
        "js-cookie": "Cookies",
      },
    },
    external,
    plugins,
  },
  // Auth module ES build
  {
    input: "src/auth.ts",
    output: {
      file: "dist/auth.esm.js",
      format: "es",
      sourcemap: true,
    },
    external,
    plugins,
  },
  // Auth module CommonJS build
  {
    input: "src/auth.ts",
    output: {
      file: "dist/auth.cjs",
      format: "cjs",
      sourcemap: true,
      exports: "named",
    },
    external,
    plugins,
  },
];
