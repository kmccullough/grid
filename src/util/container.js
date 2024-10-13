import { PassiveMap } from './passive-map.js';

const proxyMethodsMap = new WeakMap();
function proxyMethods(proxy, target, prop) {
  const p = new WeakRef(proxy);
  const t = new WeakRef(target);
  if (typeof proxy[prop] !== 'function') {
    return target[prop];
  }
  let proxyMap = proxyMethodsMap.get(proxy);
  if (!proxyMap) {
    proxyMethodsMap.set(proxy, proxyMap = new WeakMap());
  }
  let methods = proxyMap.get(target);
  if (!methods) {
    proxyMap.set(target, methods = new Map());
  }
  let method = methods.get(prop);
  if (!method) {
    methods.set(prop, method = (...args) => {
      const proxy = p.deref();
      const target = t.deref();
      return proxy?.[prop](() => target[prop](...args), ...args);
    });
  }
  return method;
}

/**
 * Dependency injection container
 * @example
 * const bar = 'fizzbuzz';
 * class MyObject {
 *  constructor(container,
 *     otherSingletonObject = container.get(OtherObject),
 *     bar = container.get('bar'),
 *   ) {
 *     this.otherObject = otherSingletonObject;
 *     this.bar = bar;
 *   }
 *   foo() {
 *     return this.bar;
 *   }
 * }
 * class OtherObject {}
 * function someFactory(abc) {
 *   const container = this;
 *   const myObject = container.get(MyObject);
 *   return {
 *     number: Math.random(),
 *     foo: myObject.foo(),
 *     abc,
 *   };
 * }
 * class SomeObject {
 *   constructor(container) {
 *     this.myObject = container.get(MyObject);
 *     this.otherObject = container.get(OtherObject);
 *     this.someManufactured1 = container.get(someFactory);
 *     this.someManufactured2 = container.get(someFactory);
 *     this.toBeManufactured = container.factory(someFactory);
 *   }
 * }
 * new Container()
 *   .registerConstant('bar', bar)
 *   .registerClass(MyObject)
 *   .registerClass(OtherObject)
 *   .registerFactory(someFactory, false, null, 123)
 *   .registerClass(SomeObject)
 *   .get(SomeObject);
 */
export class Container {
  /**
   * @typedef {Object} ContainerRegisteredItem
   * @property {'class'|'constant'|'factory'} type Type of registered item
   * @property {*} dependencyKey Object/string used as a key for this registered item/dependency
   * @property {boolean} [singleton] If true, class/factory only instantiated/run once
   * @property {*} [value] Value, if constant
   * @property {Class} [class] Class to instantiate; passed container as only constructor argument
   * @property {function} [factory] Factory to run; passed container as context if context not provided
   * @property {*} [context] Context for factory; container used if not provided
   * @property {*} [args] Arguments for factory
   * @property {*} [instance] Instantiated class or factory result, if singleton
   * @property {*} [isInstantiating] True while dependency being instantiated, to detect circular dependency
   */
  /**
   * @type {PassiveMap<*,ContainerRegisteredItem>}
   */
  registry = new PassiveMap();

  isInstantiating = false;

  constructor() {
    this.registerConstant(Container, this);
  }

  injectClass(fn) {
    this._classInjector = fn;
    return this;
  }
  injectFactory(fn) {
    this._factoryInjector = fn;
    return this;
  }

  registerClassAs(dependencyKey, Class, singleton = true) {
    return this._registrySet(dependencyKey, this._registryClass(dependencyKey, Class, singleton));
  }
  registerClass(Class, singleton = true) {
    return this.registerClassAs(Class, Class, singleton);
  }
  registerConstant(dependencyKey, value) {
    return this._registrySet(dependencyKey, this._registryConstant(dependencyKey, value));
  }
  registerFactoryAs(dependencyKey, factory, singleton = true, context = null, ...args) {
    return this._registrySet(dependencyKey, this._registryFactory(dependencyKey, factory, singleton, context, ...args));
  }
  registerFactory(factory, singleton = true, context = null, ...args) {
    return this.registerFactoryAs(factory, factory, singleton, context, ...args);
  }

  has(dependencyKey) {
    return this._registryHas(dependencyKey);
  }

  get(dependencyKey, optionsOrOptional) {
    const optional = optionsOrOptional === true || optionsOrOptional?.optional;
    if (!this._registryHas(dependencyKey)) {
      if (optional === true) {
        return;
      }
      throw new Error('Get unregistered dependency ' + String(dependencyKey));
    }
    const item = this._registryGet(dependencyKey);
    if (item.type === 'constant') {
      return item.value;
    }
    return this._getFactory(item, optionsOrOptional)();
  }

  factory(dependencyKey, optionsOrOptional) {
    const optional = optionsOrOptional === true || optionsOrOptional?.optional;
    if (!this._registryHas(dependencyKey)) {
      if (optional === true) {
        return;
      }
      throw new Error('Get unregistered factory ' + dependencyKey);
    }
    const item = this._registryGet(dependencyKey);
    if (item.type === 'constant') {
      return () => item.value;
    }
    return this._getFactory(item, optionsOrOptional);
  }

  _registryClass(dependencyKey, Class, singleton) {
    return { type: 'class', dependencyKey, class: Class, singleton };
  }
  _registryFactory(dependencyKey, factory, singleton = true, context = null, ...args) {
    return { type: 'factory', dependencyKey, factory, singleton, context, args };
  }
  _registryConstant(dependencyKey, value) {
    return { type: 'constant', dependencyKey, value };
  }

  _getFactory(item, optionsOrOptional) {
    const deps = optionsOrOptional?.dependencies;
    if (!item.singleton) {
      return moreDeps => this._instantiate(item,
        !(deps || moreDeps) ? null
          : [ ...(deps || []), ...(moreDeps || []) ]
      );
    }
    return () => item.instance ??= this._instantiate(item);
  }

  _registryHas(dependencyKey) {
    return this.registry.has(dependencyKey);
  }

  _registryGet(dependencyKey) {
    if (!this.isInstantiating) {
      this.isInstantiating = true;
    }
    return this.registry.get(dependencyKey);
  }

  _registrySet(dependencyKey, value) {
    if (this.isInstantiating) {
      throw new Error('Cannot register with container; already serving dependencies');
    }
    this.registry.set(dependencyKey, value);
    return this;
  }

  _instantiate(item, dependencies = null) {
    if (item.isInstantiating) {
      throw new Error('Already instantiating dependency' + item.dependencyKey);
    }
    item.isInstantiating = true;
    const container = dependencies?.length ? this._proxyDependencies(dependencies) : this;
    const instance = item.type === 'class'
      ? this._injectClass(item, container)
      : this._injectFactory(item, container);
    delete item.isInstantiating;
    return instance;
  }

  _injectClass(item, container) {
    const subject = {
      dependencyKey: item.dependencyKey,
      Class: item.class,
      container: container,
    };
    if (!this._classInjector) {
      return this._defaultClassInjector(subject);
    }
    subject.inject = () => this._defaultClassInjector(subject);
    return this._classInjector(subject);
  }

  _injectFactory(item, container) {
    const subject = {
      dependencyKey: item.dependencyKey,
      factory: item.factory,
      context: item.context,
      args: item.args,
      container: container,
    };
    if (!this._factoryInjector) {
      return this._defaultFactoryInjector(subject);
    }
    subject.inject = () => this._defaultFactoryInjector(subject);
    return this._factoryInjector(subject);
  }

  _defaultClassInjector({ Class, container }) {
    if (Class === Object) {
      return new Class();
    }
    const configs = [];
    let Proto = Class;
    do {
      if (typeof Proto.create === 'function') {
        configs.push(Object.entries(Proto.create()));
      }
    } while ((Proto = Object.getPrototypeOf(Proto)) && Proto !== Object);
    const hash = {};
    for (const config of configs) {
      for (let i = config.length - 1; i >= 0; --i) {
        const [ hashKey, [ dependencyKey, options = {} ] ] = config[i];
        const optional = options.optional || 'default' in options;
        if (!(hashKey in hash) || options.override !== false) {
          hash[hashKey] = optional && !container.has(dependencyKey) ? options.default
            : options.factory ? container.factory(dependencyKey, optional)
            : container.get(dependencyKey, optional);
        }
      }
    }
    return configs.length ? new Class(hash) : new Class(container);
  }

  _defaultFactoryInjector({ factory, container, context, args }) {
    return factory.call(context ?? container, ...args);
  }

  _proxyDependencies(dependencies, container = this) {
    const registry = new PassiveMap(dependencies.map(([dependencyKey, value]) => [
      dependencyKey, this._registryConstant(dependencyKey, value)
    ]));
    const proxy = {
      _registryHas(defaultFn, dependencyKey) {
        return registry.has(dependencyKey) || defaultFn();
      },
      _registryGet(defaultFn, dependencyKey) {
        return registry.has(dependencyKey) ? registry.get(dependencyKey) : defaultFn();
      },
    };
    return new Proxy(container ?? this, {
      get(target, prop) {
        return proxyMethods(proxy, ...arguments);
      },
    });
  }
}
