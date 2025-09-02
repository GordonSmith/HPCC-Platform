import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

const HPCC_TARGET = process.env.HPCC_TARGET || "http://localhost:8010";

export default defineConfig({
    base: "/esp/files",
    publicDir: "build",
    optimizeDeps: {
        exclude: ["src-dojo/index"]
    },
    server: {
        proxy: {
            "^/Ws.*": { target: HPCC_TARGET, changeOrigin: true, secure: false },
            "^/FileSpray.*": { target: HPCC_TARGET, changeOrigin: true, secure: false }
        }
    },
    resolve: {
        alias: [
            { find: "src", replacement: path.resolve(__dirname, "src") },
            { find: "src-react", replacement: path.resolve(__dirname, "src-react") },
            { find: "src-react-css", replacement: path.resolve(__dirname, "src-react") },
            { find: "dgrid", replacement: path.resolve(__dirname, "dgrid") },
            { find: "hpcc", replacement: path.resolve(__dirname, "eclwatch") }
        ]
    },
    build: {
        emptyOutDir: false,
        cssMinify: false,
        minify: false,
        rollupOptions: {
            // Treat the legacy dojo bundle as external and map to global 'SrcDojo'
            external: ["src-dojo/index"],
            output: {
                globals: {
                    "src-dojo/index": "SrcDojo"
                }
            }
        }
    },
    plugins: [
        // {
        //     name: "resolve-src-dojo-index-serve",
        //     apply: "serve",
        //     resolveId(source) {
        //         if (source === "src-dojo/index") {
        //             return { id: source, external: true };
        //         }
        //         return null;
        //     }
        // },
        // {
        //     name: "external-src-dojo-index-build",
        //     apply: "build",
        //     resolveId(source) {
        //         if (source === "src-dojo/index") {
        //             return { id: source, external: true };
        //         }
        //         return null;
        //     }
        // },
        react()
    ]
});