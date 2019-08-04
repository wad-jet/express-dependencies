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
    }

    /**
     * Register a component for which lifestyle is an instance
     * @param {*} key - key name for component
     * @param {*} instance - object instance or primitive value
     */
    instance(key, instance) { 
        const flags = { isInstance: true };
        setDependency.call(this, key, instance, flags); 
    }

    /**
     * Register a factory of component for which lifestyle is a transient
     * @param {string} key - key name for component
     * @param {function} creator - factory function to create an object
     * @param {bool} isScoped - enable scoped lifestyle
     * @param {object} thisArg - bind context to factory function
     * @param  {...any} argArray - dynamic arguments for the factory function
     */
    transientFactory(key, creator, isScoped, thisArg, ...argArray) { 
        const flags = { isFactory: true, isTransient: true, isScoped: isScoped === true };
        setFactory.call(this, flags, key, creator, thisArg, ...argArray); 
    }

    /**
     * Register a factory of component for which lifestyle is a singleton
     * @param {string} key - key name for component
     * @param {function} creator - factory function to create an object
     * @param {object} thisArg - bind context to factory function
     * @param  {...any} argArray - static arguments for the factory function
     */
    singletonFactory(key, creator, thisArg, ...argArray) { 
        const flags = { isFactory: true, isSingleton: true };
        setFactory.call(this, flags, key, creator, thisArg, ...argArray); 
    }

    /**
     * Register a component for which lifestyle is a transient
     * @param {*} constructor - class or function to create an instance
     * @param {bool} isScoped - enable scoped lifestyle
     * @param  {...any} argArray - static arguments for component constructor
     */
    transient(constructor, isScoped, ...argArray) { 
        let kc = getKeyAndConstructor(constructor);
        const flags = { isTransient: true, isScoped: isScoped === true };
        setDependency.call(this, kc.key, kc.constructor, flags, ...argArray);
    }

    /**
     * Register a component for which lifestyle is a singleton
     * @param {*} constructor - class or function to create an instance
     * @param  {...any} argArray - static arguments for component constructor
     */
    singleton(constructor, ...argArray) { 
        let kc = getKeyAndConstructor(constructor);
        const flags = { isSingleton: true };
        setDependency.call(this, kc.key, kc.constructor, flags, ...argArray); 
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
        const resolver = dependency.resolver(owner);
        owner[key] = resolver;
    }
}

class Injection {
    constructor() {
        this._container = null;
    }

    /**
     * Register dependencies in a container 
     * @param {function} setContainer - function with container as argument
     * @param {object} options - container options
     * @returns {Function} - middleware for injection
     */
    setup(setContainer, options) {
        if (!util.isFunction(setContainer)) {
            throw new Error('The argument "setContainer" not a function.');
        }
        const container = new Container(options);
        setContainer.call(container, container);
        this._container = container;

        return this.injector;
    }

    /**
     * Get middleware for injection
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
}

function getKeyAndConstructor(constructor) {
    let key;
    if (util.isFunction(constructor)) {
        key = constructor.name;
    } else {
        throw new Error('The argument "constructor" is not a class or function.');
    }
    const result = { constructor: constructor, key: key.toLowerCase() };
    return result;
}

function setDependency(key, resolve, flags, ...staticArgArray) {
    if (util.isNullOrUndefined(key)) throw new Error('Argument "key" is null or undefined');
    if (!util.isString(key)) throw new Error('Argument "key" is not a string');
    if (util.isNullOrUndefined(resolve)) throw new Error('Argument "resolver" is null or undefined');

    if (this.options.keyNameNormalization) {
        key = this.options.keyNameNormalization(key);
    }

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

    let resolveFunction;
    if (isInstance) {
        resolveFunction = function(/*owner*/) { return () => resolve; };
    } else {
        if (isSingleton) {
            const singletonContainer = (function() {
                var _singletonInstance = null;
                return {
                    get: function(owner, args) {
                        const scoped = (isScoped ? { owner, keyForScope: key } : { owner, keyForScope: null });
                        if (_singletonInstance === null) {                            
                            _singletonInstance = createInstance(resolve, isFactory, scoped, args);
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
                    const result = createInstance(resolve, isFactory, scoped, args);
                    return result;
                }
            }
        }
    }

    this._dependencies[key] = { resolver: resolveFunction };
}

function setFactory(flags, key, create, thisArg, ...argArray) {
    if (!util.isFunction(create)) throw new Error('The argument "create" is not a function');
    if (thisArg) {
        if (!util.isObject(thisArg)) throw new Error('The argument "argThis" is not an object');
        create = create.bind(thisArg);
    }        
    setDependency.call(this, key, create, flags, ...argArray);
}

function createInstance(resolve, isFactory, { owner, keyForScope }, argArray) {
    if (!util.isArray(argArray)) throw new Error('The argument "argArray" is not an array');
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