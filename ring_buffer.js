// https://stackoverflow.com/questions/1583123/circular-buffer-in-javascript

export function RingBuffer(n) {
    this.array = new Array(n);
    this.length = 0;
    this.capacity = n;
}

RingBuffer.prototype.toString= function() {
    return '[object CircularBuffer(' + this.array.length + ') length ' + this.length + ']';
};

RingBuffer.prototype.get = function(i) {
    if (i < 0 || i < this.length - this.array.length) return undefined;
    return this.array[i % this.array.length];
};

RingBuffer.prototype.set = function(i, v) {
    if (i < 0 || i < this.length - this.array.length) throw CircularBuffer.IndexError;

    while (i > this.length) 
    {
        this.array[this.length % this.array.length] = undefined;
        this.length++;
    }

    this.array[i % this.array.length]= v;

    if (i == this.length) this.length++;
};

RingBuffer.prototype.push = function(v) {   
    this.array[this.length % this.array.length] = v;   
    this.length++; 
};

RingBuffer.IndexError = {};

RingBuffer.prototype.truncated_length = function() {
    return Math.min(this.length, this.capacity);
}