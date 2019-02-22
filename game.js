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
      throw new Error ('Можно прибавлять к вектору только вектор типа Vector');
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

class LevelParser {
  constructor(objectDictionary) {
    this.dictionary = objectDictionary;
  }

  actorFromSymbol(symbol) {
    for(let el in this.dictionary) {
      if(el === symbol) {
        return this.dictionary[el];
      }
    }
    return;
  }

  obstacleFromSymbol(symbol) {
    if(symbol === 'x') {
      return 'wall';
    } else if (symbol === '!') {
      return 'lava';
    } else {
      return;
    }
  }

  createGrid(plan) {
    let grid = [];
    plan.forEach((el) => {
      let str = el.split('').map((el) => {
        return this.obstacleFromSymbol(el);
      })
      grid.push(str);
    })
    return grid;
  }

  createActors(plan) {
    let actors = [];
    plan.forEach((el, y) => {
      el.split('').forEach((key, x) => {
        let actorConstructor = this.actorFromSymbol(key);
        if (actorConstructor && (actorConstructor === Actor || actorConstructor.prototype instanceof Actor)) {
          actors.push(new actorConstructor(new Vector(x, y)));
        }
      })
    })
    return actors;
  }

  parse(plan) {
    return new Level(this.createGrid(plan), this.createActors(plan));
  }
}

class Fireball extends Actor {
  constructor(pos = new Vector(0,0), speed = new Vector(0,0)) {
    super();

    this.pos = pos;
    this.speed = speed;
    this.size = new Vector(1,1);
  }

  get type() {
    return 'fireball';
  }

  getNextPosition(time = 1 ) {
    let x = this.pos.x + this.speed.x * time;
    let y = this.pos.y + this.speed.y * time;
    return new Vector(x, y);
  }

  handleObstacle() {
    this.speed.x = -this.speed.x;
    this.speed.y = -this.speed.y;
  }

  act(time, level) {
    let isObstacle = level.obstacleAt(this.getNextPosition(time), this.size);
    if(!isObstacle) {
      this.pos.x = this.pos.x + this.speed.x * time;
      this.pos.y = this.pos.y + this.speed.y * time;
    } else {
      this.handleObstacle();
    }
  }
}

class HorizontalFireball extends Fireball {
  constructor(position) {
    super(position);

    this.speed = new Vector(2, 0);
  }
}

class VerticalFireball extends Fireball {
  constructor(position) {
    super(position);

    this.speed = new Vector(0, 2);
  }
}

class FireRain extends Fireball {
  constructor(position) {
    super(position);

    this.speed = new Vector(0, 3);
    this.position = position;
  }

  handleObstacle() {
    this.pos = this.position;
  }
}

class Coin extends Actor {
  constructor(pos) {
    super();

    this.size = new Vector(0.6,0.6);
    this.spring = Math.random() * (Math.PI * 2);
    this.springDist = 0.07;
    this.springSpeed = 8;
    if (pos) {
      this.pos = new Vector(pos.x + 0.2, pos.y + 0.1);
      this.start = new Vector(pos.x + 0.2, pos.y + 0.1);
    } else {
      this.pos = new Vector(0.2, 0.1);
      this.start = new Vector(0.2, 0.1);
    }
  }

  get type() {
    return 'coin';
  }

  updateSpring(time = 1) {
    this.spring = this.spring + this.springSpeed * time;
  }

  getSpringVector() {
    const y = Math.sin(this.spring) * this.springDist;
    return new Vector(0, y);
  }

  getNextPosition(time = 1) {
    this.updateSpring(time);
    return new Vector(this.start.x, this.start.y + this.getSpringVector().y);
  }

  act(time) {
    this.pos = this.getNextPosition(time);
  }
}

class Player extends Actor {
  constructor(pos) {
    super();

    if (pos) {
      this.pos = new Vector(pos.x, pos.y - 0.5);
    } else {
      this.pos = new Vector(0, -0.5);
    }
    this.speed = new Vector(0,0);
    this.size = new Vector(0.8,1.5);
  }

  get type() {
    return 'player';
  }
}

const actorDict = {
    '@': Player,
    'v': FireRain,
    'o': Coin,
    '=': HorizontalFireball,
    '|': VerticalFireball
};

const parser = new LevelParser(actorDict);

loadLevels()
  .then(map => runGame(JSON.parse(map), parser, DOMDisplay)
  .then(() => alert('Поздравляем! Вы выиграли!!!')));
