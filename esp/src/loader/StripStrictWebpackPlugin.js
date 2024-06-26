const { Compilation, sources } = require('webpack');

const pluginName = 'StripStrictWebpackPlugin';

class StripStrictWebpackPlugin {
    apply(compiler) {
        compiler.hooks.thisCompilation.tap(pluginName, (compilation) => {
            compilation.hooks.processAssets.tap(
                {
                    name: 'Replace',
                    stage: Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE,
                },
                (assets) => {
                    for (const key in assets) {
                        const asset = assets[key];
                        const source = asset.source();
                        if (typeof source === 'string' && source.includes('"use strict";')) {
                            compilation.updateAsset(
                                key,
                                new sources.RawSource(source.replaceAll('"use strict";', ''))
                            );
                        }
                    }
                }
            );
        });
    }
}

module.exports = StripStrictWebpackPlugin;