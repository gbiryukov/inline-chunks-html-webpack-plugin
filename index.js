var ConcatSource = require("webpack-sources").ConcatSource;
var sourceMappingURL = require('source-map-url');
var _ = require('lodash');

function InlineChunkPlugin(options) {
  this.options = Object.assign({ inlineChunks: [] }, options);
}

InlineChunkPlugin.prototype.apply = function(compiler) {
  var me = this

  compiler.plugin('compilation', function(compilation) {

    compilation.plugin('html-webpack-plugin-before-html-generation', (htmlPluginData, callback) => {
      var inlineChunks = me.options.inlineChunks
      var publicPath = compilation.options.output.publicPath || '';
      var assets = htmlPluginData.assets

      if (publicPath && publicPath.substr(-1) !== '/') {
        publicPath += '/';
      }

      _.each(inlineChunks, function(chunkOptions) {
        var separator = /\./;
        var chunkName = chunkOptions.chunkName;
        var splitUp = chunkName.split(separator);
        var name = splitUp[0];
        var ext = splitUp[1];
        var matchedChunk = _.filter(compilation.chunks, function(chunk) {
          return chunk.name === name
        })[0];
        if (!matchedChunk) {
          console.log("inline-chunks-html-webpack-plugin: '" + chunkName + "' chunk not found");
          return;
        }

        var chunkPath = (ext && _.filter(matchedChunk.files, function(file) {
          return file.indexOf(ext) > -1
        }) || matchedChunk.files)[0];

        if (chunkPath) {
          var source = chunkOptions.removeChunkWrapper ? removeChunkWrapper(matchedChunk) : compilation.assets[chunkPath];

          var path = publicPath + chunkPath;
          assets[name] = sourceMappingURL.removeFrom(source.source());

          if (chunkOptions.deleteFile) {
            delete compilation.assets[chunkPath];
          }

          console.log("inline-chunks-html-webpack-plugin: Inlined " + chunkPath);
        }
      });
      callback(null, htmlPluginData);
    });
  });
}

/**
 * @param   {Chunk} chunk
 * @returns {ConcatSource}      
 */
function removeChunkWrapper(chunk) {
  var source = new ConcatSource();

  chunk.modules.forEach(function(module) {
    var moduleSource = module.source();
    source.add(moduleSource);
  }, this);

  return source;
}

module.exports = InlineChunkPlugin
