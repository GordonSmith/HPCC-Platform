import { defineConfig } from "vite";
import { resolve } from "path";
import pkg from "./package.json" with { type: "json" };

export default defineConfig({
    build: {
        lib: {
            entry: [
                // resolve(__dirname, "src/index.ts"),
                resolve(__dirname, "src-react/index.tsx")
            ],
            name: pkg.name,
            fileName: "index",
        },
        rollupOptions: {
            external: [
                "src/**/*",
                "dojo/i18n!./nls/hpcc",
                "dgrid/extensions/ColumnResizer",
                "dgrid/extensions/CompoundColumns",
                "dgrid/extensions/DijitRegistry",
                "dgrid/Keyboard",
                "dgrid/Grid",
                "dgrid/OnDemandGrid",
                "dgrid/Selection",
                "dgrid/_StoreMixin",
                "dgrid/extensions/Pagination",
                "dgrid/selector",
                "dgrid/tree",
                "dgrid/editor"
            ],
            output: {
            },
        },
        target: ["es2022"]
    },
    resolve: {
        alias: [
            // { find: "src", replacement: resolve(__dirname, "src") },

            // { find: "src", replacement: resolve(__dirname, "src") },
            // { find: "eclwatch", replacement: resolve(__dirname, "eclwatch") },
            // { find: "@hpcc-js/wasm-duckdb", replacement: resolve(__dirname, "node_modules/@hpcc-js/wasm-duckdb/dist/index.js") },
            // { find: "@hpcc-js", replacement: resolve(__dirname, "../../../Visualization/packages") },
        ]
    },
    esbuild: {
        minifyIdentifiers: false
    },
    plugins: [
    ]
});
