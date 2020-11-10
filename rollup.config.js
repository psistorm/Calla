import { nodeResolve } from "@rollup/plugin-node-resolve";

export default [{
    input: "src/index.js",
    plugins: [
        nodeResolve()
    ],
    output: [{
        format: "es",
        sourcemap: true,
        file: "dist/calla.js"
    }, {
        format: "cjs",
        sourcemap: true,
        file: "dist/calla.cjs.js"
    }]
}];