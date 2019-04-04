'use strict';

class Vector {
  constructor (x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  plus(vector) {
    if(!(vector instanceof Vector)) {
      throw new Error ('Можно прибавлять к вектору только вектор типа Vector');
    }
    return new Vector(vector.x + this.x, vector.y + this.y);
  }

  times(n) {
    return new Vector(this.x * n, this.y * n);
  }
}

class Actor {
  constructor (pos = new Vector(0,0), size = new Vector(1,1), speed = new Vector(0,0)) {
    if(!(pos instanceof Vector && size instanceof Vector && speed instanceof Vector)) {
      throw new Error('Cвойство не является объектом Vector');
    }
    this.pos = pos;
    this.size = size;
    this.speed = speed;
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
      throw new Error('Движущийся объект не является объектом Actor');
    }
    return !((actor === this) || (actor.top >= this.bottom) || (actor.right <= this.left) || (actor.bottom <= this.top) || (actor.left >= this.right));
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
    this._player = this.actors.find(actor => actor.type === 'player');
  }

  get player() {
    return this._player;
  }

  isFinished() {
    return this.status != 0 && this.finishDelay < 0;
  }

  actorAt(actor) {
    if (!(actor instanceof Actor)) {
      throw new Error('Объект не является объектом Actor');
    }
    return this.actors.find(el => el.isIntersect(actor));
  }

  obstacleAt(pos, size) {
    if (!(pos instanceof Vector) || !(size instanceof Vector)) {
      throw new Error('Объект не является объектом Vector');
    }
    if (pos.x < 0 || pos.x + size.x > this.width || pos.y < 0) {
      return 'wall';
    } else if (pos.y + size.y > this.height) {
      return 'lava';
    }
    for (let posY = Math.floor(pos.y); posY < pos.y + size.y; posY++) {
      for (let posX = Math.floor(pos.x); posX < pos.x + size.x; posX++) {
        let obstacle = this.grid[posY][posX];
        if (obstacle) {
          return obstacle;
        }
      }
    }
  }

  removeActor(actor) {
    this.actors.splice(this.actors.indexOf(actor), 1);
  }

  noMoreActors(type){
    return this.actors.every(el => el.type !== type);
  }

  playerTouched(type, actor) {
    if (type === 'lava' || type === 'fireball') {
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
    if (symbol) {
      return this.dictionary[symbol];
    }
  }

  obstacleFromSymbol(symbol) {
    if(symbol === 'x') {
      return 'wall';
    } else if (symbol === '!') {
      return 'lava';
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
    if (this.dictionary === undefined) {
      return actors;
    }
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
  constructor(pos = new Vector(0,0), speed = new Vector(0,0), size = new Vector(1,1)) {
    super(pos, size, speed);
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
  constructor(position, speed = new Vector(2, 0)) {
    super(position, speed);
  }
}

class VerticalFireball extends Fireball {
  constructor(position, speed = new Vector(0, 2)) {
    super(position, speed);
  }
}

class FireRain extends Fireball {
  constructor(position, speed = new Vector(0, 3)) {
    super(position, speed);

    this.position = position;
  }

  handleObstacle() {
    this.pos = this.position;
  }
}

class Coin extends Actor {
  constructor(pos = new Vector(0.2, 0.1), size = new Vector(0.6,0.6)) {
    super(pos, size);

    this.spring = Math.random() * (Math.PI * 2);
    this.springDist = 0.07;
    this.springSpeed = 8;

    this.pos = pos.plus(new Vector(0.2, 0.1));

    if (pos) {
      this.start = pos.plus(new Vector(0.2, 0.1));
    } else {
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
  constructor(pos = new Vector(0, -0.5), size = new Vector(0.8,1.5), speed = new Vector(0,0)) {
    super(pos, size, speed);

    this.pos = this.pos.plus(new Vector(0, -0.5));
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
