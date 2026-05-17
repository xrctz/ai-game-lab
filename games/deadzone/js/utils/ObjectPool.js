export class ObjectPool {
    constructor(factory, reset, initialSize = 20) {
        this.factory = factory;
        this.reset = reset;
        this.pool = [];
        this.active = new Set();

        for (let i = 0; i < initialSize; i++) {
            this.pool.push(this.factory());
        }
    }

    get() {
        let obj = this.pool.pop();
        if (!obj) {
            obj = this.factory();
        }
        this.active.add(obj);
        return obj;
    }

    release(obj) {
        if (this.active.delete(obj)) {
            this.reset(obj);
            this.pool.push(obj);
        }
    }

    releaseAll() {
        for (const obj of this.active) {
            this.reset(obj);
            this.pool.push(obj);
        }
        this.active.clear();
    }

    get activeCount() {
        return this.active.size;
    }
}
