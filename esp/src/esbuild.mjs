import process from "node:process";
import console from "node:console";
import { readFileSync } from "node:fs";

import { problemMatcher } from "@hpcc-js/esbuild-plugins";
import { globalExternals } from "@fal-works/esbuild-plugin-global-externals";

const tsconfig = JSON.parse(readFileSync("./tsconfig.json", "utf8"));

const outputDirectory = "build/dist";
const watch = process.argv.includes("--watch");
const production = !watch && process.argv.includes("--production");

const aliasPlugin = {
    name: 'alias-plugin',
    setup(build) {
        const aliases = [
            {
                find: /^hpcc(.*)$/,
                replacement: "eclwatch$1"
            }, {
                find: /^src-react-css(.*)$/,
                replacement: "src-react$1"
            },
        ];

        build.onResolve({ filter: /^(src-react-css|hpcc)/ }, args => {
            for (const alias of aliases) {
                const match = args.path.match(alias.find);
                if (match) {
                    const resolved = alias.replacement.replace('$1', match[1]);
                    return { path: resolved, external: true };
                }
            }
        });
    }
};

async function main(tsconfigRaw, entryPoint, platform, format, plugins = [], outputName = null) {

    const external = [];

    const ctx = await esbuild.context({
        tsconfigRaw,
        entryPoints: outputName ? { [outputName]: entryPoint } : [entryPoint],
        outdir: outputDirectory,
        bundle: true,
        format,
        minify: production,
        sourcemap: !production ? "linked" : false,
        platform,
        target: platform === "node" ? "node20" : "es2022",
        external,
        logLevel: production ? "silent" : "info",
        // No alias overrides currently needed; remove invalid relative alias that broke esbuild
        // We intentionally do not suppress jsdom warnings; instead we rewrite resolution for the worker.
        plugins: [
            aliasPlugin,
            problemMatcher(),
        ]
    });
    if (watch) {
        await ctx.watch();
    } else {
        await ctx.rebuild();
        await ctx.dispose();
    }
}

Promise.all([
    main(tsconfig, "./src-react/index.tsx", "browser", "esm")
]).catch((e) => {
    console.error(e);
    process.exit(1);
});

