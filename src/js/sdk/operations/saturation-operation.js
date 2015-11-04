/*
 * Photo Editor SDK - photoeditorsdk.com
 * Copyright (c) 2013-2015 9elements GmbH
 *
 * Released under Attribution-NonCommercial 3.0 Unported
 * http://creativecommons.org/licenses/by-nc/3.0/
 *
 * For commercial use, please contact us at contact@9elements.com
 */

import Operation from './operation'
import PrimitivesStack from './filters/primitives-stack'
import SaturationPrimitive from './filters/primitives/saturation'

/**
 * @class
 * @alias PhotoEditorSDK.Operations.SaturationOperation
 * @extends PhotoEditorSDK.Operation
 */
class SaturationOperation extends Operation {
  constructor (...args) {
    super(...args)

    this._stack = new PrimitivesStack()
    this._primitive = new SaturationPrimitive({
      saturation: this._options.saturation
    })
    this._stack.add(this._primitive)
  }

  /**
   * Renders the saturation using WebGL
   * @param  {WebGLRenderer} renderer
   * @override
   */
  /* istanbul ignore next */
  _renderWebGL (renderer) {
    return this._render(renderer)
  }

  /**
   * Renders the saturation using Canvas2D
   * @param {CanvasRenderer} renderer
   * @override
   */
  _renderCanvas (renderer) {
    return this._render(renderer)
  }

  /**
   * Renders the saturation (all renderers supported)
   * @param  {Renderer} renderer
   * @private
   */
  _render (renderer) {
    this._primitive.options.saturation = this._options.saturation
    this._stack.setDirty(true)
    return this._stack.render(renderer)
  }
}

/**
 * A unique string that identifies this operation. Can be used to select
 * operations.
 * @type {String}
 */
SaturationOperation.identifier = 'saturation'

/**
 * Specifies the available options for this operation
 * @type {Object}
 */
SaturationOperation.prototype.availableOptions = {
  saturation: { type: 'number', default: 1.0 }
}

export default SaturationOperation
