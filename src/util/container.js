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

  isServing = false;

  constructor() {
    this.registerConstant(Container, this);
  }

  defaultToSingleton(defaultsToSingleton) {
    this.defaultsToSingleton = defaultsToSingleton;
    return this;
  }

  classInjector(fn) {
    this._classInjector = fn;
    return this;
  }
  factoryInjector(fn) {
    this._factoryInjector = fn;
    return this;
  }

  registerClassAs(dependencyKey, Class, singleton = null) {
    return this._registrySet(dependencyKey, this._registryClass(dependencyKey, Class, singleton));
  }
  registerClass(Class, singleton = null) {
    return this.registerClassAs(Class, Class, singleton);
  }
  registerConstant(dependencyKey, value) {
    return this._registrySet(dependencyKey, this._registryConstant(dependencyKey, value));
  }
  registerFactoryAs(dependencyKey, factory, singleton = null, context = null, ...args) {
    return this._registrySet(dependencyKey, this._registryFactory(dependencyKey, factory, singleton, context, ...args));
  }
  registerFactory(factory, singleton = null, context = null, ...args) {
    return this.registerFactoryAs(factory, factory, singleton, context, ...args);
  }
  registerModule(module) {
    module(this);
    return this;
  }

  options(optionsOrOptional) {
    return optionsOrOptional && typeof optionsOrOptional === 'object'
      ? optionsOrOptional
      : (optionsOrOptional || (optionsOrOptional ?? true))
        ? { optional: optionsOrOptional } : null;
  }

  has(dependencyKey) {
    return this._registryHas(dependencyKey);
  }

  get(dependencyKey, optionsOrOptional) {
    const item = this._registryGet(dependencyKey, optionsOrOptional);
    if (!this._registryHas(dependencyKey)) {
      if (typeof optionsOrOptional !== 'object' ? optionsOrOptional === true
        : (optionsOrOptional.optional || 'default' in optionsOrOptional)
      ) {
        return optionsOrOptional?.default;
      }
      throw new Error('Get unregistered dependency ' + String(dependencyKey));
    }
    if (item.type === 'constant') {
      return optionsOrOptional?.factory ? () => item.value : item.value;
    }
    const factory = this._getFactory(item, optionsOrOptional);
    return optionsOrOptional?.factory ? factory : factory();
  }

  peek(dependencyKey, optionsOrOptional) {
    return this.get(dependencyKey, {
      ...this.options(optionsOrOptional),
      peek: true,
    });
  }
  
  getAll(dependencies, container = this) {
    const isArray = Array.isArray(dependencies);
    const result = isArray ? [] : {};
    let hashKey, dependencyKey, options;
    dependencies = isArray ? dependencies : Object.entries(dependencies);
    for (const dependencyConfig of dependencies) {
      if (isArray) {
        [ [ dependencyKey, options ] ] = dependencyConfig;
        result.push(container.get(dependencyKey, options));
      } else {
        [ hashKey, [ dependencyKey, options ] ] = dependencyConfig;
        result[hashKey] = container.get(dependencyKey, options);
      }
    }
    return result;
  }

  injectClass(Class, dependencies) {
    return this._injectClass(Class, this._proxyDependencies(dependencies));
  }
  injectFactory(factory, dependencies, context = null, ...args) {
    return this._injectFactory({
      args, context, factory,
    }, this._proxyDependencies(dependencies));
  }

  _registryClass(dependencyKey, Class, singleton) {
    let Proto = Class;
    do {
      if (typeof Proto.container === 'function') {
        Proto.container(this);
      }
    } while ((Proto = Object.getPrototypeOf(Proto)) && Proto !== Object);
    return { type: 'class', dependencyKey, class: Class, singleton };
  }
  _registryFactory(dependencyKey, factory, singleton = null, context = null, ...args) {
    return { type: 'factory', dependencyKey, factory, singleton, context, args };
  }
  _registryConstant(dependencyKey, value) {
    return { type: 'constant', dependencyKey, value };
  }

  _getFactory(item, optionsOrOptional) {
    const deps = optionsOrOptional?.dependencies;
    if (!item.singleton && !this.defaultsToSingleton) {
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

  _registryGet(dependencyKey, optionsOrOptional) {
    if (!this.isServing && !optionsOrOptional?.peek) {
      this.isServing = true;
    }
    return this.registry.get(dependencyKey);
  }

  _registrySet(dependencyKey, value) {
    if (this.isServing) {
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
    const dependencyLists = [];
    let Proto = Class;
    do {
      if (typeof Proto.create === 'function') {
        dependencyLists.push(Object.entries(Proto.create()));
      }
    } while ((Proto = Object.getPrototypeOf(Proto)) && Proto !== Object);
    const hash = {};
    for (const dependencies of dependencyLists) {
      for (const dependencyConfig of dependencies) {
        const [ hashKey, [ dependencyKey, options ] ] = dependencyConfig;
        if (!(hashKey in hash) || options?.override !== false) {
          hash[hashKey] = container.get(dependencyKey, options);
        }
      }
    }
    return dependencyLists.length ? new Class(hash) : new Class(container);
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
