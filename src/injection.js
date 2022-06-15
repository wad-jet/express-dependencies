var util = require('util');

class Container {
    constructor(options) {
        if (util.isNullOrUndefined(options)) { options = { }; }
        if (util.isNullOrUndefined(options.keyNameNormalization)) {
            options.keyNameNormalization = toCamelCase;
        } else {
            if (!util.isFunction(options.keyNameNormalization)) throw new Error('The keyNameNormalization is not a function');
        }

        this.options = options;
        this._dependencies = { };
        this._statistics = {
            registered: {
                instances: 0,
                singletons: 0,
                transients: 0,
                factories: 0,
                scopeds: 0,
                total: 0,
                keys: { }
            }
        };
        this._flushStatistics();
    }

    _flushStatistics() {
        this._statistics.created = {
            singletons: 0,
            total: 0,
            keys: { }
        };
        this._statistics.misses = {
            singletons: 0,
            scoped: {
                total: 0,
                keys: { }
            }
        };
    }

    /**
     * Register a component for which lifestyle is an instance
     * @param {string | { key: string, tags: string[]}} key - key name for component (can also be tagged)
     * @param {object} instance - object instance or primitive value
     */
    instance(key, instance) {
        const pk = parseKey(key);
        const flags = { isInstance: true };
        setDependency.call(this, pk.key, instance, pk.tags, flags); 
    }

    /**
     * Register a factory of component for which lifestyle is a transient
     * @param {string | { key: string, tags: string[]}} key - key name for component (can also be tagged)
     * @param {function} creator - factory function to create an object
     * @param {object} thisArg - bind context to factory function
     * @param  {...any} argArray - dynamic arguments for the factory function
     */
    transientFactory(key, creator, thisArg, ...argArray) {
        const pk = parseKey(key);
        transientFactory.call(this, pk.key, creator, pk.tags, false, thisArg, ...argArray);
    }

    /**
     * Register a factory of component for which lifestyle is a scoped transient
     * @param {string | { key: string, tags: string[]}} key - key name for component (can also be tagged)
     * @param {function} creator - factory function to create an object
     * @param {object} thisArg - bind context to factory function
     * @param  {...any} argArray - dynamic arguments for the factory function
     */
    transientScopedFactory(key, creator, thisArg, ...argArray) {
        const pk = parseKey(key);
        transientFactory.call(this, pk.key, creator, pk.tags, true, thisArg, ...argArray);        
    }

    /**
     * Register a factory of component for which lifestyle is a singleton
     * @param {string | { key: string, tags: string[]}} key - key name for component (can also be tagged)
     * @param {function} creator - factory function to create an object
     * @param {object} thisArg - bind context to factory function
     * @param  {...any} argArray - static arguments for the factory function
     */
    singletonFactory(key, creator, thisArg, ...argArray) {
        const pk = parseKey(key);
        const flags = { isFactory: true, isSingleton: true };
        setFactory.call(this, flags, pk.key, creator, pk.tags, thisArg, ...argArray); 
    }

    /**
     * Register a component for which lifestyle is a transient
     * @param {function | { constructor: function, tags: string[] } | { ctr: function, tags: string[] }} constructor - class or function to create an instance (can also be tagged)
     * @param  {...any} argArray - static arguments for component constructor
     */
    transient(constructor, ...argArray) {
        const pc = parseConstructor(constructor);
        transient.call(this, pc.constructor, pc.tags, false, ...argArray);
    }

    /**
     * Register a component for which lifestyle is a scoped transient
     * @param {function | { constructor: function, tags: string[] } | { ctr: function, tags: string[] }} constructor - class or function to create an instance (can also be tagged)
     * @param  {...any} argArray - static arguments for component constructor
     */
    transientScoped(constructor, ...argArray) {
        const pc = parseConstructor(constructor);
        transient.call(this, pc.constructor, pc.tags, true, ...argArray);
    }

    /**
     * Register a component for which lifestyle is a singleton
     * @param {function | { constructor: function, tags: string[] } | { ctr: function, tags: string[] }} constructor - class or function to create an instance (can also be tagged)
     * @param  {...any} argArray - static arguments for component constructor
     */
    singleton(constructor, ...argArray) {
        const pc = parseConstructor(constructor);
        const kc = getKeyAndConstructor.call(this, pc.constructor);
        const flags = { isSingleton: true };
        setDependency.call(this, kc.key, kc.constructor, pc.tags, flags, ...argArray); 
    }

    /**
     * Register a component for which lifestyle is a singleton with custom resolver name
     * @param {String} resolverName 
     * @param {function | { constructor: function, tags: string[] } | { ctr: function, tags: string[] }} constructor - class or function to create an instance (can also be tagged)
     * @param {...any} argArray 
     */
    singletonNamed(resolverName, constructor, ...argArray) {
        if (!resolverName || !util.isString(resolverName)) {
            throw new Error('Invalid resolverName argument');
        }
        const pc = parseConstructor(constructor);
        let kc = getKeyAndConstructor.call(this, pc.constructor);
        const flags = { isSingleton: true };
        setDependency.call(this, resolverName, kc.constructor, pc.tags, flags, ...argArray); 
    }

    /**
     * Register a component for which lifestyle is a transient with custom resolver name
     * @param {String} resolverName 
     * @param {function | { constructor: function, tags: string[] } | { ctr: function, tags: string[] }} constructor - class or function to create an instance (can also be tagged)
     * @param {...any} argArray 
     */
    transientNamed(resolverName, constructor, ...argArray) {
        const pc = parseConstructor(constructor);
        transientNamed.call(this, resolverName, pc.constructor, pc.tags, false, ...argArray);
    }

    /**
     * Register a component for which lifestyle is a scoped transient with custom resolver name
     * @param {function | { constructor: function, tags: string[] } | { ctr: function, tags: string[] }} constructor - class or function to create an instance (can also be tagged)
     * @param  {...any} argArray - static arguments for component constructor
     */
    transientScopedNamed(resolverName, constructor, ...argArray) {
        const pc = parseConstructor(constructor);
        transientNamed.call(this, resolverName, pc.constructor, pc.tags, true, ...argArray);
    }
}

function mixResolversTo(owner, force = false) {
    if (owner !== null && !util.isObject(owner)) throw new Error('The argument "owner" is not an object');

    owner._injection_scope = { };

    const keys = Object.keys(this._dependencies);
    for(let i = 0; i < keys.length; i++) {
        const key = keys[i];
        if (!force && owner[key] !== undefined) throw new Error(`The property '${key}' has to request.`);
        
        const dependency = this._dependencies[key];
        if (util.isNullOrUndefined(dependency)) throw new Error(`Dependency by key ${key} not registered.`);

        let resolver;
        if (util.isArray(dependency)) {
            resolver = function (tags) {
                let dependency = this;

                if (util.isNullOrUndefined(tags)) {
                    tags = false;
                } 
                else if (!util.isArray(tags)) {
                    if (!util.isString(tags) || tags.trim().length === 0) {
                        throw new Error('Invalid tag value');
                    }
                    tags = [ tags ];
                }

                if (tags !== false) {
                    dependency = dependency.filter(dep => (dep.tags || []).filter(x => tags.includes(x)).length > 0);
                }
                const result = dependency.map(dep => {
                    return dep.resolver(owner);
                });
                return result;
            }
            .bind(dependency);
        } 
        else {
            resolver = dependency.resolver(owner);
        }

        owner[key] = resolver;
    }
}

class Injection {
    constructor() {
        this._container = null;
    }

    getStatistics() {
        const result = Object.assign({ time: new Date() }, this._container._statistics);
        return result;
    }

    flushStatistics() {
        this._container._flushStatistics();
    }

    /**
     * Register dependencies in a container 
     * @param {function(Container)} setContainer - function with container as argument
     * @param {object} options - container options
     * @returns {function} - middleware for injection
     */
    setup(setContainer, options) {
        if (!util.isFunction(setContainer)) {
            throw new Error('The argument "setContainer" is not a function.');
        }

        let modules = false;
        if (options && options.modules) {
            modules = options.modules;
            delete options.modules;
        }

        const container = new Container(options);

        if (modules && util.isArray(modules)) {
            let moduleSetupOptions = Object.assign({}, options, options.modulesOptions || { });
            delete options.modulesOptions;

            for (let _module of modules) {
                const moduleSetupFunction = _module.setup;
                if (_module.options) {
                    moduleSetupOptions = Object.assign({ }, moduleSetupOptions, _module.options);
                }
                if (moduleSetupFunction) {
                    if (!util.isFunction(moduleSetupFunction)) {
                        throw new Error('The setup option value is not a function'); 
                    }
                    moduleSetupFunction.call(container, container, moduleSetupOptions);
                } else {
                    if (util.isObject(_module)) {
                        throw new Error(`The module configuration object does not have setup function.`);
                    } else {
                        throw new Error(`The module does not have static setup function.`);
                    }
                }
            }
        }

        setContainer.call(container, container);
        this._container = container;

        return this.injector;
    }

    /**
     * Get middleware for injection
     * @returns {function}
     */
    get injector() {
        const injection = this;
        if (!(injection instanceof Injection)) throw new Error('The injection module not found.');
        return (req, res, next) => {
            if (injection._container === null) throw new Error('Conteiner not set. Use setup method for set container.');
            // TODO: parameters validation
            req.req = req;
            mixResolversTo.call(this._container, req);
            next();
        }
    }

    /**
     * Get resolver by key name
     * @param {string} name - key name
     * @return {function} - resolver function
     */
    getResolver(name) {
        const resolved = { };
        this.injector(resolved, null, () => { });
        return resolved[this._container.options.keyNameNormalization(name)];
    }

    /**
     * Resolve instance by key name
     * @param {string} name - key name
     * @returns {Object} - resolved instance
     */
    resolve(name, ...args) {
        const resolver = this.getResolver(name);
        if (!resolver)
            throw new Error(`Instance named '${name}' not found`);
        return resolver.apply(this, args);
    }
}

function parseKey(key) {
    if (util.isString(key)) {
        return { key, tags: [ ] };
    }
    if (util.isObject(key) && util.isString(key.key)) {
        const tags = key.tags || key.tag && [ key.tag ];
        if (util.isArray(tags)) {
            return { key: key.key, tags };
        }
    }
    throw new Error('Invalid key value: ' + JSON.stringify(key));
}

function parseConstructor(constructor) {
    if (util.isFunction(constructor)) {
        return { constructor, tags: [ ] };
    }
    if (util.isObject(constructor)) {
        const ctr = Object.prototype.hasOwnProperty.call(constructor, 'constructor') ? constructor.constructor : constructor.ctr;
        const tags = constructor.tags || constructor.tag && [ constructor.tag ];
        if (ctr && util.isArray(tags)) {        
            return { constructor: ctr, tags };
        }
    }
    throw new Error('Invalid constructor value: ' + JSON.stringify(constructor));
}
 
function getKeyAndConstructor(constructor) {
    let key;
    if (util.isFunction(constructor)) {
        key = constructor.name;
    } else {
        throw new Error('The argument "constructor" is not a class or function.');
    }
    const result = { constructor: constructor, key: this.options.keyNameNormalization(key) };
    return result;
}

function transientFactory(key, creator, tags, isScoped, thisArg, ...argArray) {
    if (!(this instanceof Container)) { throw new Error('this not instanceof Container'); }
    const flags = { isFactory: true, isTransient: true, isScoped: isScoped === true };
    setFactory.call(this, flags, key, creator, tags, thisArg, ...argArray); 
}

function transient(constructor, tags, isScoped, ...argArray) {
    if (!(this instanceof Container)) { throw new Error('this not instanceof Container'); }
    let kc = getKeyAndConstructor.call(this, constructor);
    const flags = { isTransient: true, isScoped: isScoped === true };
    setDependency.call(this, kc.key, kc.constructor, tags, flags, ...argArray);
}

function transientNamed(resolverName, constructor, tags, isScoped, ...argArray) {
    if (!resolverName || !util.isString(resolverName)) {
        throw new Error('Invalid resolverName argument');
    }
    if (!(this instanceof Container)) { throw new Error('this not instanceof Container'); }
    let kc = getKeyAndConstructor.call(this, constructor);
    const flags = { isTransient: true, isScoped: isScoped === true };
    setDependency.call(this, resolverName, kc.constructor, tags, flags, ...argArray);
}

function setDependency(key, resolve, tags, flags, ...staticArgArray) {
    if (util.isNullOrUndefined(key)) throw new Error('Argument "key" is null or undefined');
    if (!util.isString(key)) throw new Error('Argument "key" is not a string');
    if (util.isNullOrUndefined(resolve)) throw new Error('Argument "resolver" is null or undefined');

    if (this.options.keyNameNormalization) {
        key = this.options.keyNameNormalization(key);
    }

    if (!key) throw new Error('Argument "key" after keyNameNormalization execute has null, undefined or empty value');

    const container = this;
    if (!(container instanceof Container)) throw new Error('Context is not a Container instance.');

    const isInstance = flags.isInstance === true;
    const isSingleton = flags.isSingleton === true;
    const isTransient = flags.isTransient === true;
    const isScoped = flags.isScoped === true;
    const isFactory = flags.isFactory === true;

    if (isFactory && !(isSingleton || isTransient)) throw new Error('The factory should be transient or singleton');
    
    if (isTransient || isSingleton) {
        /**
         * resolver is function, because this function (if not factory function) the costructor to resolved object with arguments for injection
         */
        if (!util.isFunction(resolve)) throw new Error('The "resolver" argument not a function.');
    }

    const statistics = this._statistics;
    if (isSingleton && isScoped) throw new Error('Singleton object cannot have a scoped lifestyle');

    let resolveFunction;
    if (isInstance) {
        resolveFunction = function(/*owner*/) { return () => resolve; };
    } else {
        if (isSingleton) {
            const singletonContainer = (function() {
                var _singletonInstance = null;
                return {
                    get: function(owner, args) {
                        if (_singletonInstance === null) {
                            _singletonInstance = createInstance(resolve, isFactory, { owner, keyForScope: null }, args, key, statistics);
                            statistics.created.singletons++;
                        }
                        else {
                            statistics.misses.singletons++;
                        }
                        return _singletonInstance;
                    }
                }
            })();
            resolveFunction = function(owner) { 
                return (...dynamicArgArray) => {
                    const args = argsUnion(staticArgArray, dynamicArgArray);
                    const result = singletonContainer.get(owner, args); 
                    return result;
                }
            }
        } else {
            resolveFunction = function(owner) {
                return (...dynamicArgArray) => {
                    const scoped = (isScoped ? { owner, keyForScope: key } : { owner, keyForScope: null });
                    const args = argsUnion(staticArgArray, dynamicArgArray);
                    const result = createInstance(resolve, isFactory, scoped, args, key, statistics);
                    return result;
                }
            }
        }
    }

    let newResolver = { resolver: resolveFunction };
    if (tags && tags[0]) {
        newResolver.tags = tags;
    }

    let dependency = this._dependencies[key];
    if (dependency) {
        if (!util.isArray(dependency)) {
            dependency.tags = dependency.tags || [ ];
            dependency = [ dependency ];
            this._dependencies[key] = dependency;
        }
        dependency.push(newResolver);
    }
    else {
        // TODO: registration of a single dependency with tags, need to implement a unit test
        if (!util.isArray(newResolver) && Array.isArray(newResolver.tags)) {
            newResolver = [ newResolver ];
        }
        this._dependencies[key] = newResolver;
    }

    const registered = statistics.registered;

    registered.total++;
    let keyStatistics = registered.keys[key];
    if (!keyStatistics) {
        keyStatistics = { properties: [ ] };
        registered.keys[key] = keyStatistics;
    }

    keyStatistics.total = (keyStatistics.total || 0) + 1;
    if (isInstance) {
        registered.instances++;
        keyStatistics.properties.push('instance');
    }
    if (isSingleton) {
        registered.singletons++;
        keyStatistics.properties.push('singleton');
    }
    if (isTransient) {
        registered.transients++;
        keyStatistics.properties.push('transient');
    }
    if (isScoped) {
        registered.scopeds++;
        keyStatistics.properties.push('scoped');
    }
    if (isFactory) {
        registered.factories++;
        keyStatistics.properties.push('factory');
    }
    keyStatistics.properties = Array.from(new Set(keyStatistics.properties));
}

function setFactory(flags, key, create, tags, thisArg, ...argArray) {
    if (!util.isFunction(create)) throw new Error('The argument "create" is not a function');
    if (thisArg) {
        if (!util.isObject(thisArg)) throw new Error('The argument "thisArg" is not an object');
        create = create.bind(thisArg);
    }        
    setDependency.call(this, key, create, tags, flags, ...argArray);
}

function createInstance(resolve, isFactory, { owner, keyForScope }, argArray, key, statistics) {
    if (!util.isArray(argArray)) throw new Error('The argument "argArray" is not an array');
    if (!key) throw new Error('The argument "key" not specified');
    if (!statistics) throw new Error('The argument "statistics" not specified');
    let result = (!util.isNullOrUndefined(keyForScope) ? owner._injection_scope[keyForScope] : undefined);
    if (result === undefined) {
        if (isFactory === true) {
            result = resolve(owner, ...argArray);
        } else {
            result = new resolve(owner, ...argArray);
        }
        if (!util.isNullOrUndefined(keyForScope)) {
            owner._injection_scope[keyForScope] = result;
        }

        statistics.created.total++;
        statistics.created.keys[key] = (statistics.created.keys[key] || 0) + 1;
    }
    else {
        statistics.misses.scoped.total++;
        statistics.misses.scoped.keys[key] = (statistics.misses.keys[key] || 0) + 1;
    }
    return result;
}

function argsUnion(argArray, args) {
    if (util.isNullOrUndefined(argArray)) argArray = [/*Empty array*/];
    if (!util.isArray(argArray)) throw new Error('The argument "argArray" is not an array');
    const result = argArray.concat(args);
    return result;
}

function toCamelCase(name) {
    if (!util.isString(name)) throw new Error('The argument "name" is not a string');
    let result = undefined;
    if (!util.isNullOrUndefined(name) && name !== '') {
        result = name.replace(/\w/, name[0].toLowerCase());
    }
    return result;
}

module.exports = function() {
    const result = new Injection();
    return result;
}