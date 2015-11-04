/*
 * Photo Editor SDK - photoeditorsdk.com
 * Copyright (c) 2013-2015 9elements GmbH
 *
 * Released under Attribution-NonCommercial 3.0 Unported
 * http://creativecommons.org/licenses/by-nc/3.0/
 *
 * For commercial use, please contact us at contact@9elements.com
 */

import ImageDimensions from './image-dimensions'
import Vector2 from './math/vector2'
import Utils from './utils'
import CanvasRenderer from '../renderers/canvas-renderer'
import WebGLRenderer from '../renderers/webgl-renderer'
import Utils from './utils'

/**
 * Handles the image rendering process
 * @class
 * @alias PhotoEditorSDK.RenderImage
 * @param {Image} image
 * @param {Array.<PhotoEditorSDK.Operation>} operationsStack
 * @param {string} dimensions
 * @param {string} preferredRenderer
 * @private
 */
class RenderImage {
  constructor (canvas, image, operationsStack, dimensions, preferredRenderer) {
    this._canvas = canvas

    /**
     * @type {Object}
     * @private
     */
    this._options = {
      preferredRenderer: preferredRenderer
    }

    /**
     * @type {Boolean}
     * @private
     * @default false
     */
    this._webglEnabled = false

    /**
     * @type {Renderer}
     * @private
     */
    this._renderer = null

    /**
     * @type {Image}
     * @private
     */
    this._image = image

    /**
     * @type {Array.<PhotoEditorSDK.Operation>}
     * @private
     */
    this._stack = operationsStack

    /**
     * @type {PhotoEditorSDK.ImageDimensions}
     * @private
     */
    this._dimensions = new ImageDimensions(dimensions)

    this._initRenderer()
  }

  /**
   * Creates a renderer (canvas or webgl, depending on support)
   * @return {Promise}
   * @private
   */
  _initRenderer () {
    /* istanbul ignore if */
    if (WebGLRenderer.isSupported() && this._options.preferredRenderer !== 'canvas') {
      this._renderer = new WebGLRenderer(this._initialDimensions, this._canvas, this._image)
      this._webglEnabled = true
    } else if (CanvasRenderer.isSupported()) {
      this._renderer = new CanvasRenderer(this._initialDimensions, this._canvas, this._image)
      this._webglEnabled = false
    }

    /* istanbul ignore if */
    if (this._renderer === null) {
      throw new Error('Neither Canvas nor WebGL renderer are supported.')
    }

    this._renderer.on('error', (err) => this.emit('error', err))
  }

  /**
   * Returns the dimensions of the image after all operations
   * have been applied
   * @returns {Vector2}
   */
  getNativeDimensions () {
    const stack = this.sanitizedStack

    let size = new Vector2(this._image.width, this._image.height)
    stack.forEach((operation) => {
      size = operation.getNewDimensions(this._renderer, size)
    })
    return size
  }

  /**
   * Finds the first dirty operation and sets all following operations
   * to dirty
   * @param {Array.<Operation>} stack
   * @private
   */
  _updateStackDirtiness (stack) {
    let dirtyFound = false
    for (let i = 0; i < stack.length; i++) {
      let operation = stack[i]
      if (!operation) continue
      if (operation.dirty) {
        dirtyFound = true
      }

      if (dirtyFound) {
        operation.dirty = true
      }
    }
  }

  /**
   * Renders the image
   * @return {Promise}
   */
  render () {
    const stack = this.sanitizedStack
    const initialDimensions = this._renderer.getInitialDimensionsForStack(stack, this._dimensions)
    this._renderer.resizeTo(initialDimensions)
    this._renderer.drawImage(this._image)
    this._updateStackDirtiness(stack)

    // Reset frame buffers
    this._renderer.reset()

    let validationPromises = []
    for (let i = 0; i < stack.length; i++) {
      let operation = stack[i]
      validationPromises.push(operation.validateSettings())
    }

    return Promise.all(validationPromises)
      .then(() => {
        let dimensions = this.getNativeDimensions()

        if (this._dimensions.bothSidesGiven()) {
          dimensions = Utils.resizeVectorToFit(dimensions, this._dimensions.getVector())
        }

        this._renderer.setSize(dimensions)
      })
      .then(() => {
        let promise = Promise.resolve()
        for (let i = 0; i < stack.length; i++) {
          let operation = stack[i]
          promise = promise.then(() => {
            return new Promise((resolve, reject) => {
              Utils.requestAnimationFrame(() => {
                operation.render(this._renderer)
                resolve()
              })
            })
          })
        }
        return promise
      })
      .then(() => {
        return this._renderer.renderFinal()
      })
      .then(() => {
        return this._renderer.postRender(this._dimensions)
      })
  }

  /**
   * Returns the renderer
   * @return {Renderer}
   */
  getRenderer () {
    return this._renderer
  }

  /**
   * Returns the operations stack without falsy values
   * @type {Array.<Operation>}
   */
  get sanitizedStack () {
    let sanitizedStack = []
    for (let i = 0; i < this._stack.length; i++) {
      let operation = this._stack[i]
      if (!operation) continue
      sanitizedStack.push(operation)
    }
    return sanitizedStack
  }

  setDimensions (dimensions) {
    this._dimensions = new ImageDimensions(dimensions)
  }

  setOperationsStack (operationsStack) {
    this._stack = operationsStack
  }
}

export default RenderImage
