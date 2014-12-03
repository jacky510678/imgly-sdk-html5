"use strict";
/*!
 * Copyright (c) 2013-2014 9elements GmbH
 *
 * Released under Attribution-NonCommercial 3.0 Unported
 * http://creativecommons.org/licenses/by-nc/3.0/
 *
 * For commercial use, please contact us at contact@9elements.com
 */

var Operation = require("./operation");
var Vector2 = require("../lib/math/vector2");
var Utils = require("../lib/utils");

/**
 * An operation that can crop out a part of the image
 *
 * @class
 * @alias ImglyKit.Operations.CropOperation
 * @extends ImglyKit.Operation
 */
var CropOperation = Operation.extend({});

/**
 * A unique string that identifies this operation. Can be used to select
 * operations.
 * @type {String}
 */
CropOperation.identifier = "crop";

/**
 * The fragment shader used for this operation
 */
CropOperation.fragmentShader = Utils.shaderString(function () {/**webgl

  precision mediump float;
  uniform sampler2D u_image;
  varying vec2 v_texCoord;
  uniform vec2 u_cropStart;
  uniform vec2 u_cropEnd;

  void main() {
    vec2 size = u_cropEnd - u_cropStart;
    gl_FragColor = texture2D(u_image, v_texCoord * size + u_cropStart);
  }

*/});

/**
 * Checks whether this Operation can be applied the way it is configured
 * @return {boolean}
 */
CropOperation.prototype.validateSettings = function() {
  if (!(this._options.start instanceof Vector2)) {
    throw new Error("CropOperation: `start` has to be a Vector2 instance.");
  }

  if (!(this._options.end instanceof Vector2)) {
    throw new Error("CropOperation: `end` has to be a Vector2 instance.");
  }
};

/**
 * Applies this operation
 * @param  {Renderer} renderer
 * @return {Promise}
 * @abstract
 */
CropOperation.prototype.render = function(renderer) {
  if (renderer.identifier === "webgl") {
    this._renderWebGL(renderer);
  } else {
    this._renderCanvas(renderer);
  }
};

/**
 * Crops this image using WebGL
 * @param  {WebGLRenderer} renderer
 */
CropOperation.prototype._renderWebGL = function(renderer) {
  var canvas = renderer.getCanvas();
  var gl = renderer.getContext();

  var start = this._options.start;
  var end = this._options.end;

  // 0..1 > 1..0 on y-axis
  var originalStartY = start.y;
  start.y = 1 - end.y;
  end.y = 1 - originalStartY;

  // The new size
  var newDimensions = this._getNewDimensions(renderer);

  // Make sure we don't resize the input texture
  var lastTexture = renderer.getLastTexture();

  // Resize all textures except the one we use as input
  var textures = renderer.getTextures();
  var texture;
  for (var i = 0; i < textures.length; i++) {
    texture = textures[i];
    if (texture === lastTexture) continue;

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, newDimensions.x, newDimensions.y, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  }

  // Resize the canvas
  canvas.width = newDimensions.x;
  canvas.height = newDimensions.y;

  // Run the cropping shader
  renderer.runShader(null, CropOperation.fragmentShader, {
    uniforms: {
      u_cropStart: { type: "2f", value: [start.x, start.y] },
      u_cropEnd: { type: "2f", value: [end.x, end.y] }
    }
  });

  // Resize the input texture
  gl.bindTexture(gl.TEXTURE_2D, lastTexture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, newDimensions.x, newDimensions.y, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
};

/**
 * Crops the image using Canvas2D
 * @param  {CanvasRenderer} renderer
 */
CropOperation.prototype._renderCanvas = function(renderer) {
  var canvas = renderer.getCanvas();
  var dimensions = new Vector2(canvas.width, canvas.height);

  var newDimensions = this._getNewDimensions(renderer);

  // Create a temporary canvas to draw to
  var newCanvas = renderer.createCanvas();
  newCanvas.width = newDimensions.x;
  newCanvas.height = newDimensions.y;
  var newContext = newCanvas.getContext("2d");

  // The upper left corner of the cropped area on the original image
  var startPosition = dimensions.clone().multiply(this._options.start);

  // Draw the source canvas onto the new one
  newContext.drawImage(canvas,
    startPosition.x, startPosition.y, // source x, y
    newDimensions.x, newDimensions.y, // source dimensions
    0, 0, // destination x, y
    newDimensions.x, newDimensions.y // destination dimensions
    );

  // Set the new canvas
  renderer.setCanvas(newCanvas);
};

/**
 * Gets the new dimensions
 * @return {Vector2}
 * @private
 */
CropOperation.prototype._getNewDimensions = function(renderer) {
  var canvas = renderer.getCanvas();
  var dimensions = new Vector2(canvas.width, canvas.height);

  return this._options.end
    .clone()
    .subtract(this._options.start)
    .multiply(dimensions);
};

module.exports = CropOperation;
