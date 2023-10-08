class BlueQueue extends Array {
  constructor() {
    super(...arguments);
    this.current = null;
    this.previous = null;
  }
  remove(index) {
    if (!index && index !== 0) throw new TypeError("Index must be there!");
    if (isNaN(index)) throw new TypeError("'Index' must be an integer type!");
    let i, f = 0;
    for (i = 0; i < this.length; i++){
      if (i == index) {
        f = 1;
        break;
      }
    }
    if (f == 1) {
      this.splice(index, 1);
      return this;
    }
    throw new RangeError("Provided Index's element doesnot exist.");
  }
  add(track) {
    this.push(track);
    return this;
  }
  totalLength() {
    return this.length + (this.current ? 1 : 0);
  }
  size() {
    return this.length;
  }
  first() {
    return this ? this[0] : 0;
  }
  last() {
    return this ? this[this.length - 1] : 0;
  }
  
  shuffle() {
    for (let i = this.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [this[i], this[j]] = [this[j], this[i]];
    }
    }
  clear() {
    return this.splice(0);
  }
}

module.exports = BlueQueue;


/* 
* Blue,
* A Lavalink Client,
* Made,
* By,
* Ashton#4218
*/
