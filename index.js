const ConcatSource = require("webpack-sources").ConcatSource;
const sourceMappingURL = require('source-map-url');
const _ = require('lodash');

class InlineChunkPlugin {
  constructor(options) {
    this.options = Object.assign({inlineChunks: []}, options);
    this.onCompilation = this.onCompilation.bind(this);
  }

  onCompilation(compilation) {
    const self = this;

    function onBeforeHtmlGeneration(htmlPluginData, callback) {
      const inlineChunks = self.options.inlineChunks;
      let publicPath = compilation.outputOptions.publicPath || '';
      const assets = htmlPluginData.assets;

      if (publicPath && publicPath.substr(-1) !== '/') {
        publicPath += '/';
      }

      _.each(inlineChunks, function(chunkOptions) {
        const separator = /\./;
        const chunkName = chunkOptions.chunkName;
        const splitUp = chunkName.split(separator);
        const name = splitUp[0];
        const ext = splitUp[1];
        const matchedChunk = _.filter(compilation.chunks, function(chunk) {
          return chunk.name === name
        })[0];
        if (!matchedChunk) {
          console.log("inline-chunks-html-webpack-plugin: '" + chunkName + "' chunk not found");
          return;
        }

        const chunkPath = (ext && _.filter(matchedChunk.files, function(file) {
          return file.indexOf(ext) > -1
        }) || matchedChunk.files)[0];

        if (chunkPath) {
          const source = chunkOptions.removeChunkWrapper ? removeChunkWrapper(matchedChunk) : compilation.assets[chunkPath];

          const path = publicPath + chunkPath;
          assets[name] = sourceMappingURL.removeFrom(source.source());

          if (chunkOptions.deleteFile) {
            delete compilation.assets[chunkPath];
          }

          console.log("inline-chunks-html-webpack-plugin: Inlined " + chunkPath);
        }
      });

      if (callback) {
        callback(null, htmlPluginData);
      } else {
        return Promise.resolve(htmlPluginData);
      }
    }

    // Webpack 4+
    if (compilation.hooks) {
      compilation.hooks.htmlWebpackPluginBeforeHtmlGeneration.tapAsync('inlineChunksHtmlWebpackPlugin', onBeforeHtmlGeneration);
    } else {
      // Webpack 3
      compilation.plugin('html-webpack-plugin-before-html-generation', onBeforeHtmlGeneration);
    }
  }

  apply(compiler) {
    // Webpack 4+
    if (compiler.hooks) {
      compiler.hooks.compilation.tap('inlineChunksHtmlWebpackPlugin', this.onCompilation);
    } else {
      // Webpack 3
      compiler.plugin('compilation', this.onCompilation);
    }
  }
}

/**
 * @param   {Chunk} chunk
 * @returns {ConcatSource}      
 */
function removeChunkWrapper(chunk) {
  const source = new ConcatSource();

  chunk.modules.forEach(function(module) {
    const moduleSource = module.source();
    source.add(moduleSource);
  }, this);

  return source;
}

module.exports = InlineChunkPlugin;
