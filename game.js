'use strict';

class Vector {
  constructor (x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  plus(vector) {
    if(vector instanceof Vector) {
      const position = new Vector(vector.x + this.x, vector.y + this.y);
      return position;
    } else {
      throw new Error;
    }
  }

  times(n) {
    const position = new Vector(this.x * n, this.y * n);
    return position;
  }
}

class Actor {
  constructor (pos = new Vector(0,0), size = new Vector(1,1), speed = new Vector(0,0)) {
    if(pos instanceof Vector && size instanceof Vector && speed instanceof Vector) {
      this.pos = pos;
      this.size = size;
      this.speed = speed;
    } else {
      throw new Error;
    }
  }

  act() {
  }

  get type() {
    return 'actor';
  }

  get left() {
    return this.pos.x;
  }

  get right() {
    return this.pos.x + this.size.x;
  }

  get top() {
    return this.pos.y;
  }

  get bottom() {
    return this.pos.y + this.size.y;
  }

  isIntersect(actor) {
    if (!(actor instanceof Actor)) {
      throw new Error;
    }
    if ((actor === this) || (actor.top >= this.bottom) || (actor.right <= this.left) || (actor.bottom <= this.top) || (actor.left >= this.right)) {
       return false;
    }
    return true;
  }
}

class Level {
  constructor(grid = [], actors = []) {
    this.grid = grid;
    this.actors = actors;
    this.height = this.grid.length;
    this.width = Math.max(0, ...this.grid.map(el => el.length));
    this.status = null;
    this.finishDelay = 1;
  }

  get player() {
    const player = this.actors.find(actor => actor.type === 'player');
     return player;
  }

  isFinished() {
    return this.status != 0 && this.finishDelay < 0 ? true : false;
  }

  actorAt(actor) {
    if (!(actor instanceof Actor)) {
      throw new Error;
    }
    return this.actors.find(el => el.isIntersect(actor));
  }

  obstacleAt(pos, size) {
    if (!(pos instanceof Vector) || !(size instanceof Vector)) {
      throw new Error;
    }
    let xMin = Math.ceil(pos.x),
        xMax = Math.ceil(pos.x + size.x),
        yMin = Math.ceil(pos.y),
        yMax = Math.ceil(pos.y + size.y);
    if (xMin < 0 || xMax > this.width || yMin < 0) {
      return 'wall';
    } else if (yMax > this.height) {
      return 'lava';
    } else {
      for (let y = yMin; y < yMax; y++) {
        for (let x = xMin; x < xMax; x++) {
          if (this.grid[y][x]) {
            return this.grid[y][x];
          }
        }
      }
    }
  }

  removeActor(actor) {
    this.actors = this.actors.filter(el => el !== actor);
  }

  noMoreActors(type){
    return this.actors.filter(el => el.type === type).length > 0 ? false : true;
  }

  playerTouched(type, actor) {
    if(this.status != null) {
      return;
    } else if (type === 'lava' || type === 'fireball') {
      this.status = 'lost';
    } else if (type === 'coin') {
      this.removeActor(actor);
      if (!this.actors.find(el => el.type === 'coin')) {
       this.status = 'won';
     }
    }
  }
}
