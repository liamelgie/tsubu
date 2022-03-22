// Import CreateJS
document.write('<script type="text/javascript" src="https://cdn.jsdelivr.net/npm/createjs@1.0.1/builds/1.0.0/createjs.min.js"></script>')
// Import TinyColor
document.write('<script type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/tinycolor/1.4.1/tinycolor.min.js"></script>')

class Particle {
  constructor(canvas, options) {
    this.canvas = canvas
    this.x = {
      position: this._generateRandomPosition(this.canvas.canvas.clientWidth),
      speed: this._generateRandomSpeed(options.speed.min || 1, options.speed.max || 2)
    }
    this.y = {
      position: this._generateRandomPosition(this.canvas.canvas.clientHeight),
      speed: this._generateRandomSpeed(options.speed.min, options.speed.max)
    }
    this.color = Array.isArray(options.color) ? this._generateRandomColor(options.color) : options.color
    this.proximity = options.proximity || 100
    this.connections = {}
    this.maxConnections = options.maxConnections
    this.circle = this._createCircle(options.size || { min: 0.5, max: 1.5 })
    this.id = this.circle.id
  }

  _generateRandomColor(colors) {
    return colors[Math.floor(Math.random() * colors.length)]
  }

  _generateRandomPosition(max) {
    return Math.floor((Math.random() * max) + 0)
  }

  _generateRandomSpeed(min, max) {
    let a = Math.random() * max
    let b = a - min
    let c = b * Math.sign(Math.random() - 0.5)
    return ((Math.random() * max) - min) * Math.sign(Math.random() - 0.5)
  }

  _generateRandomSize(min, max) {
    return (Math.random() * (min - max) + max).toFixed(4)
  }

  _createCircle(size) {
    let circle = new createjs.Shape()
    circle.graphics.beginFill(this.color.toRgbString()).drawCircle(0, 0, this._generateRandomSize(size.min, size.max))
    circle.x = this.x.position
    circle.y = this.y.position
    this.canvas.addChild(circle)
    return circle
  }

  requestNextFrame(particles, cursor) {
    this._checkBounds()
    this._checkCollision()
    createjs.Tween.get(this.circle).to({ x: this.x.position += this.x.speed, y: this.y.position += this.y.speed})
    this._processConnections(particles, cursor)
  }

  _checkBounds() {
    if (this.canvas.canvas.clientWidth < this.x.position) this.x.position = this.canvas.canvas.clientWidth - 50
    if (this.canvas.canvas.clientHeight < this.y.position) this.y.position = this.canvas.canvas.clientHeight - 50
  }

  _checkCollision() {
    if (this.x.position < 5 || (this.canvas.canvas.clientWidth - this.x.position) < 5) this._bounceX()
    if (this.y.position < 5 || (this.canvas.canvas.clientHeight - this.y.position) < 5) this._bounceY()
  }

  _bounceX() {
    this.x.speed *= -1
  }

  _bounceY() {
    this.y.speed *= -1
  }

  _processConnections(particles, cursor) {
    for(const particleTwo of particles) {
      if (this.id !== particleTwo.id && !particleTwo.connections[this.id]) {
        if (this._calculateDistance(this.x.position, this.y.position, particleTwo.x.position, particleTwo.y.position) <= this.proximity) {
          if (!this.connections[particleTwo.id]) {
            if (this.maxConnections) {
              if (Object.keys(this.connections).length === this.maxConnections) continue
            }
            this.connectTo(particleTwo)
          } else {
            this.connections[particleTwo.id]._updateLine()
          }
        } else {
          if (this.connections[particleTwo.id]) {
            this.connections[particleTwo.id]._destroyLine()
            delete this.connections[particleTwo.id]
          } else if (particleTwo.connections[this.id]) {
            particleTwo.connections[this.id]._destroyLine()
            delete particleTwo.connections[this.id]
          }
        }
      }
    }
    if (cursor.visible) {
      const distance = this._calculateDistance(this.x.position, this.y.position, cursor.x.position, cursor.y.position)
      if (distance <= this.proximity) {
        if (!this.connections['cursor']) this.connectToCursor(cursor)
        else this.connections['cursor']._updateLine()
      } else {
        if (this.connections['cursor']) {
          this.connections['cursor']._destroyLine()
          delete this.connections['cursor']
        }
      }
    } else {
      if (this.connections['cursor']) {
        this.connections['cursor']._destroyLine()
        delete this.connections['cursor']
      }
    }
  }

  connectTo(particle) {
    this.connections[particle.id] = new Connection(this.canvas, this, particle)
  }

  connectToCursor(cursor) {
    this.connections['cursor'] = new Connection(this.canvas, this, cursor)
  }

  _calculateDistance(firstX, firstY, secondX, secondY) {
    return Math.sqrt((firstX - secondX)*(firstX - secondX) + (firstY- secondY) * (firstY - secondY))
  }

  _calculateOpacity(proximity, distance) {
    return Math.min(Math.max((proximity - distance)/20, 0), 1)
  }

  _generateRGBA(baseRGBA, opacity) {
    return baseRGBA.replace(/(1|0\.[0-9]+)\)$/, opacity + ')')
  }
}

class Cursor {
  constructor(color) {
    this.x = {
      position: 0
    }
    this.y = {
      position: 0
    }
    this.visible = false
    this.color = color
  }
}

class Connection {
  constructor(canvas, particleOne, particleTwo) {
    this.canvas = canvas
    this.from = particleOne
    this.to = particleTwo
    this.commands = {
      stroke: { },
      moveTo: { },
      lineTo: { }
    }
    this.line = this._createLine()
  }

  _createLine() {
    let line = new createjs.Shape()
    line.graphics.setStrokeStyle(0.5, 'round')
    this.commands.stroke = line.graphics.beginStroke(this._generateRGBA(this.from.color)).command
    // this.commands.stroke = line.graphics.beginLinearGradientStroke([this._generateRGBA(this.from.color),this._generateRGBA(this.to.color)], [0, 1], this.from.x.position, this.from.y.position, this.to.x.position, this.to.y.position).command
    // this.commands.stroke = line.graphics.beginLinearGradientStroke([this._generateRGBA(this.from.color),this._generateRGBA(this.to.color)], [0, 1], this.from.x.position, this.from.y.position, this.to.x.position, this.to.y.position).command
    this.commands.moveTo = line.graphics.moveTo(this.from.x.position, this.from.y.position).command
    this.commands.lineTo = line.graphics.lineTo(this.to.x.position, this.to.y.position).command
    line.graphics.endStroke()
    this.canvas.addChild(line)
    return line
  }

  _updateLine() {
    createjs.Tween.get(this.commands.stroke).to({ style: this._generateRGBA(this.from.color) })
    // createjs.Tween.get(this.commands.stroke).to({ colors: [this._generateRGBA(this.from.color), this._generateRGBA(this.to.color)], ratio: [0, 1], x0: this.from.x.position, y0: this.from.y.position, x1: this.to.x.position, x2: this.to.x.position })
    createjs.Tween.get(this.commands.moveTo).to({ x: this.from.x.position, y: this.from.y.position })
    createjs.Tween.get(this.commands.lineTo).to({ x: this.to.x.position, y: this.to.y.position })
  }

  _destroyLine() {
    this.line.graphics.clear()
  }

  _calculateDistance(firstX, firstY, secondX, secondY) {
    return Math.sqrt((firstX - secondX)*(firstX - secondX) + (firstY- secondY) * (firstY - secondY))
  }

  _calculateOpacity(proximity, distance) {
    return Math.min(Math.max((proximity - distance)/20, 0), 1)
  }

  _generateRGBA(color) {
    return color.setAlpha(this._calculateOpacity(this.from.proximity, this._calculateDistance(this.to.x.position, this.to.y.position, this.from.x.position, this.from.y.position))).toRgbString()
  }
}

class Tsubu {
  constructor(canvasID, options) {
    this.canvas = new createjs.Stage(canvasID)
    this.canvas.regX = -.5
    this.canvas.regY = -.5
    if (options.canvas.fitToElement) {
      this._resizeCanvasToElement(options.canvas.fitToElement)
      this._addResizeEventListener(options.canvas.fitToElement)
    }
    // this.canvas.snapToPixelEnabled = true
    // TODO: Add undefined check when option is not provided
    // TODO: Investigate connection gradients. It seems unlikely but keep an eye on it
    // TODO: Figure out if snapToPixelEnabled works or not
    this.particleOptions = {
      color: this._parseColors(options.particles.color) || new tinycolor('rgba(0, 0, 0, 1)'),
      maxConnections: options.particles.maxConnections || false,
      proximity: options.particles.proximity || 100,
      size: {
        min: options.particles.size.min || 0.5,
        max: options.particles.size.max || 1.5
      },
      speed: {
        min: options.particles.speed.min || 0.5,
        max: options.particles.speed.max || 1.5
      }
    }
    this.id = this.canvas.canvas.id || 'tsubu'
    this.particles = Array.from(Array(options.particles.count || 50), () => new Particle(this.canvas, this.particleOptions))
    this.cursor = new Cursor(new tinycolor(options.particles.color) || new tinycolor('rgba(0, 0, 0, 1)'))
    this.addMouseEventListeners()
    createjs.Ticker.framerate = options.canvas.targetFPS || 60
    createjs.Ticker.addEventListener("tick", () => {
      this._drawNextFrame()
      this.canvas.update()
    })
  }

  _parseColors(colors) {
    if (!colors) {
      return false
    } else if (typeof colors === 'Object' || Array.isArray(colors)) {
      let parsedColors = []
      for (const color of colors) {
        parsedColors.push(tinycolor(color))
      }
      return parsedColors
    } else {
      return new tinycolor(colors)
    }
  }

  _resizeCanvasToElement(elementID) {
    this.canvas.canvas.style.width = '100%'
    this.canvas.canvas.style.height = '100%'
    this.canvas.canvas.width = document.getElementById(elementID).offsetWidth
    this.canvas.canvas.height = document.getElementById(elementID).offsetHeight
  }

  _addResizeEventListener(elementID) {
    window.addEventListener("resize", () => {
      this._resizeCanvasToElement(elementID)
    })
  }

  _drawNextFrame() {
    for(let particle of this.particles) {
      particle.requestNextFrame(this.particles, this.cursor)
    }
  }

  addMouseEventListeners() {
    this._addMouseEnterListener()
    this._addMouseMoveListener()
    this._addMouseLeaveListener()
  }
  _addMouseMoveListener() {
    this.canvas.canvas.addEventListener("mousemove", function(e) {
      this.cursor.x.position = this.canvas.mouseX
      this.cursor.y.position = this.canvas.mouseY
    }.bind(this))
  }
  _addMouseLeaveListener() {
    this.canvas.canvas.addEventListener("mouseleave", function(e) {
      this.cursor.visible = false
    }.bind(this))
  }
  _addMouseEnterListener() {
    this.canvas.canvas.addEventListener("mouseenter", function(e) {
      this.cursor.visible = true
    }.bind(this))
  }
}

window.Tsubu = Tsubu
