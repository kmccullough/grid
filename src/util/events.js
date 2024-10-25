export class Events {
  events = new Map();

  has(event, callback) {
    return this.events.get(event)?.includes(callback);
  }

  on(event, callback) {
    if (typeof callback !== 'function') {
      return this;
    }
    let events = this.events.get(event);
    if (!events) {
      this.events.set(event, events = []);
    }
    if (!events.includes(callback)) {
      events.push(callback);
    }
    return this;
  }

  off(event, callback) {
    if (typeof callback !== 'function') {
      return this;
    }
    let events = this.events.get(event);
    if (events) {
      this.events.set(event, events.filter(cb => cb === callback));
    }
    return this;
  }

  emit(event, context, ...args) {
    this.events.get(event)?.forEach(cb => cb.call(context, ...args));
    return this;
  }
}
