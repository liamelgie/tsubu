class Particle {
  constructor(svg, colour) {
    this.svg = svg
    this.x = {
      position: this._generateRandomPosition(svg.node.clientWidth),
      speed: this._generateRandomSpeed(2, 1)
    }
    this.y = {
      position: this._generateRandomPosition(svg.node.clientHeight),
      speed: this._generateRandomSpeed(2, 1)
    }
    this.colour = colour || 'rgba(255, 0, 0, 1)'
    this.connections = {}
    this.circle = this._createCircle()
    this.id = this.circle.node.id
  }

  _generateRandomPosition(max) {
    return Math.floor((Math.random() * max) + 0);
  }

  _generateRandomSpeed(upperSpeed, lowerSpeed) {
    return ((Math.random() * upperSpeed) - lowerSpeed) * Math.sign(Math.random() - 0.5);
  }

  _createCircle() {
    return this.svg.circle(3).move(this.x.position, this.y.position).fill(this.colour)
  }

  requestNextFrame(particles) {
    this._checkCollision()
    this.circle.move(this.x.position += this.x.speed, this.y.position += this.y.speed)
    this.connect(particles)
    if (particles['cursor']) this.connectToCursor(particles['cursor'])
  }

  _checkCollision() {
    if (this.x.position < 5 || (this.svg.node.clientWidth - this.x.position) < 5) this._bounceX()
    if (this.y.position < 5 || (this.svg.node.clientHeight - this.y.position) < 5) this._bounceY()
  }

  _bounceX() {
    this.x.speed *= -1;
  }

  _bounceY() {
    this.y.speed *= -1;
  }

  connect(particles) {
    for(let particle of particles) {
      if (particle.id !== this.id) {
        if (!particle.connections[this.id]) { // Only create a connection if the other particle is not already connected to this one
          const distance = this._calculateDistance(particle.x.position, particle.y.position, this.x.position, this.y.position)
          if (distance <= 100) {
            if (!this.connections[particle.id]) {
              this.connections[particle.id] = this.svg.line(this.x.position + 2, this.y.position + 2, particle.x.position + 2, particle.y.position + 2).stroke({ width: 0.5, color: this.colour }).opacity(this._calculateOpacity(distance))
            } else {
              this.connections[particle.id].plot(this.x.position + 2, this.y.position + 2, particle.x.position + 2, particle.y.position + 2).opacity(this._calculateOpacity(distance))
            }
          } else {
            if (this.connections[particle.id]) {
              this.connections[particle.id].remove()
              delete this.connections[particle.id]
            }
            if (particle.connections[this.id]) {
              particle.connections[particle.id].remove()
              delete particle.connections[particle.id]
            }
          }
        }
      }
    }
  }

  connectToCursor(cursorParticle) {
    const distance = this._calculateDistance(cursorParticle.x.position, cursorParticle.y.position, this.x.position, this.y.position)
    if (distance <= 100) {
      if (!this.connections['cursor']) {
        this.connections['cursor'] = this.svg.line(this.x.position + 2, this.y.position + 2, cursorParticle.x.position + 2, cursorParticle.y.position + 2).stroke({ width: 0.5, color: this.colour }).opacity(this._calculateOpacity(distance))
      } else {
        this.connections['cursor'].plot(this.x.position + 2, this.y.position + 2, cursorParticle.x.position + 2, cursorParticle.y.position + 2).opacity(this._calculateOpacity(distance))
      }
    } else {
      if (this.connections['cursor']) {
        this.connections['cursor'].remove()
        delete this.connections['cursor']
      }
    }
  }

  _calculateDistance(firstX, firstY, secondX, secondY) {
    return Math.sqrt((firstX - secondX)*(firstX - secondX) + (firstY- secondY) * (firstY - secondY))
  }

  _calculateOpacity(distance) {
    return Math.min(Math.max((100 - distance)/20, 0), 1)
  }

  _generateRGBA(baseRGBA, opacity) {
    return baseRGBA.replace(/(1|0\.[0-9]+)\)$/, opacity + ')')
  }
}

class CursorParticle extends Particle {
  constructor(svg, colour) {
    super(svg, colour)
    this.svg = svg
    this.x = {
      position: 0,
      speed: 0
    }
    this.y = {
      position: 0,
      speed: 0
    }
    this.colour = colour || 'rgba(255, 255, 0, 1)'
    this.connections = []
    this.circle = this._createCircle()
    this.id = 'cursor'
  }
}

class Otsu {
  constructor(options) {
    this.svg = SVG(options.containerID)
    this.particleColour = options.colour
    this.id = this.svg.node.id
    this.particles = Array.from(Array(options.particleCount), () => new Particle(this.svg, this.particleColour))
    this.addMouseEventListeners()
    setInterval(() => {
      this._drawNextFrame()
    }, 16)
  }

  _drawNextFrame() {
    for(let particle of this.particles) {
      particle.requestNextFrame(this.particles)
    }
  }

  addMouseEventListeners() {
    this._addMouseEnterListener()
    this._addMouseMoveListener()
    this._addMouseLeaveListener()
  }

  _addMouseMoveListener() {
    this.svg.node.addEventListener("mousemove", function(e) {
      this.particles['cursor'].x.position = e.clientX - this.svg.parent().offsetLeft
      this.particles['cursor'].y.position = e.clientY - this.svg.parent().offsetTop
      this.particles['cursor'].circle.move(this.particles['cursor'].x.position, this.particles['cursor'].y.position)
    }.bind(this))
  }

  _addMouseLeaveListener() {
    this.svg.node.addEventListener("mouseleave", function(e) {
      this.particles['cursor'].circle.remove()
      for (let connection of this.particles['cursor'].connections) {
        connection.remove()
      }
      delete this.particles['cursor'] //Remove the mouse particle from the particles[] array
      for (let particle of this.particles) {
        if (particle.connections['cursor']) {
          particle.connections['cursor'].animate(100).opacity(0).after(() => {
            particle.connections['cursor'].remove()
            delete particle.connections['cursor']
          })
        }
      }
    }.bind(this))
  }

  _addMouseEnterListener() {
    this.svg.node.addEventListener("mouseenter", function(e) {
      this.particles['cursor'] = new CursorParticle(this.svg, 'rgba(255, 255, 255, 1)')
    }.bind(this))
  }
}
