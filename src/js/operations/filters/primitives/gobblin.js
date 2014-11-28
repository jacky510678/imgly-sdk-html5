"use strict";
/*!
 * Copyright (c) 2013-2014 9elements GmbH
 *
 * Released under Attribution-NonCommercial 3.0 Unported
 * http://creativecommons.org/licenses/by-nc/3.0/
 *
 * For commercial use, please contact us at contact@9elements.com
 */

var Primitive = require("./primitive");
var Utils = require("../../../lib/utils");

/**
 * Gobblin primitive
 * @class
 * @alias ImglyKit.Filter.Primitives.Gobblin
 * @extends {ImglyKit.Filter.Primitive}
 */
var Gobblin = Primitive.extend({});

/**
 * The fragment shader for this primitive
 * @return {String}
 * @private
 */
Gobblin.prototype._fragmentShader = Utils.shaderString(function() {/*webgl

  precision mediump float;
  varying vec2 v_texCoord;
  uniform sampler2D u_image;

  void main() {
    vec4 texColor = texture2D(u_image, v_texCoord);
    texColor.b = texColor.g * 0.33;
    texColor.r = texColor.r * 0.6;
    texColor.b += texColor.r * 0.33;
    texColor.g = texColor.g * 0.7;
    gl_FragColor = texColor;
  }

*/});

/**
 * Renders the primitive (WebGL)
 * @param  {WebGLRenderer} renderer
 * @return {Promise}
 */
Gobblin.prototype.renderWebGL = function(renderer) {
  renderer.runShader(null, this._fragmentShader);
};

/**
 * Renders the primitive (Canvas)
 * @param  {CanvasRenderer} renderer
 */
Gobblin.prototype.renderCanvas = function(renderer) {
  var canvas = renderer.getCanvas();
  var imageData = renderer.getContext().getImageData(0, 0, canvas.width, canvas.height);

  for (var x = 0; x < canvas.width; x++) {
    for (var y = 0; y < canvas.height; y++) {
      var index = (canvas.width * y + x) * 4;

      imageData.data[index + 2] = imageData.data[index + 1] * 0.33;
      imageData.data[index] = imageData.data[index] * 0.6;
      imageData.data[index + 2] += imageData.data[index] * 0.33;
      imageData.data[index + 1] = imageData.data[index + 1] * 0.7;
      imageData.data[index + 3] = 255;
    }
  }

  renderer.getContext().putImageData(imageData, 0, 0);
};

module.exports = Gobblin;