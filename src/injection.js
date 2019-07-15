var util = require('util');

class Container {
    constructor() {
        this._dependencies = { };
    }

    /**
     * Registration of the created instance
     * @param {*} key 
     * @param {*} instance 
     */
    instance(key, instance) { setDependency.call(this, key, instance, [ 'instance' ]); }

    /**
     * Factory registration to create a transient instance
     * @param {string} key - injection key (class or function constructor name)
     * @param {function} creator - factory function
     * @param {bool} isScoped - 
     * @param {object} thisArg - this for factory function. If null then this for factory function not set
     * @param  {...any} argArray - arguments for factory function
     */
    transientFactory(key, creator, isScoped, thisArg, ...argArray) { 
        const types = [ 'factory', 'transient' ];
        if (isScoped === true) { types.push('scope'); }
        setFactory.call(this, types, key, creator, thisArg, ...argArray); 
    }

    /**
     * Factory registration to create a singleton instance
     * @param {string} key - injection key (class or function constructor name)
     * @param {function} creator - factory function
     * @param {object} thisArg - this for factory function. If null then this for factory function not set
     * @param  {...any} argArray - arguments for factory function
     */
    singletonFactory(key, creator, thisArg, ...argArray) { 
        const types = [ 'factory', 'singleton' ];
        setFactory.call(this, types, key, creator, thisArg, ...argArray); 
    }

    /**
     * Registration to create a transient instance
     * @param {*} resolve 
     */
    transient(resolve, isScoped) { 
        let kc = getKeyAndConstructor(resolve);
        const types = [ 'transient' ];
        if (isScoped === true) { types.push('scope'); }
        setDependency.call(this, kc.key, kc.constructor, types); 
    }

    /**
     * Registration to create a singleton instance
     * @param {*} resolve 
     */
    singleton(resolve) { 
        let kc = getKeyAndConstructor(resolve);
        setDependency.call(this, kc.key, kc.constructor, [ 'singleton' ]); 
    }
}

function mixResolversTo(owner, force = false) {
    if (owner !== null && typeof owner !== 'object') throw new Error('The owner argument not object');

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
     * 
     * @param {*} containerSetup
     */
    setup(containerSetup) {
        if (typeof containerSetup !== 'function') {
            throw new Error('Argument "containerSetup" not a function.');
        }
        const container = new Container();
        containerSetup.call(container, container);
        this._container = container;
    }
    
    /**
     * Resolve all dependencies  for injection to request
     * @param {*} req - request
     * @param {*} res - response
     * @param {*} next - next
     */
    resolve(req, res, next) {
        // TODO: Self require, hmmm ...
        var injection = require('./injection');
        if (injection._container === null) throw new Error('Conteiner not set. Use setup method for set container.');
        // TODO: parameters validation
        req.req = req;

        mixResolversTo.call(injection._container, req);
        next();
    }
}

function getKeyAndConstructor(resolve) {
    let constructor, key;
    if (typeof resolve === 'function') {
        key = resolve.name;
        constructor = resolve;
    } else {
        throw new Error('The argument has be class or function type.');
    }
    const result = { constructor: constructor, key: key.toLowerCase() };
    return result;
}

function setDependency(key, resolve, types) {
    if (util.isNullOrUndefined(key)) throw new Error('Argument "key" is null or undefined');
    if (typeof key !== 'string') throw new Error('Argument "key" not string type');
    if (util.isNullOrUndefined(resolve)) throw new Error('Argument "resolver" is null or undefined');

    const container = this;
    if (!(container instanceof Container)) throw new Error('Context is not Container instance.');

    const isInstance = types.includes('instance');
    const isSingletone = types.includes('singleton');
    const isTransient = types.includes('transient');
    const isScoped = types.includes('scope');
    const isFactory = types.includes('factory');

    if (isFactory && !(isSingletone || isTransient)) throw new Error('The factory should be transient or singleton');
    
    if (isTransient || isSingletone) {
        /**
         * resolver is function, because this function (if not factory function) the costructor to resolved object with arguments for injection
         */
        if (typeof resolve !== 'function') throw new Error('The "resolver" argument not a function.');
    }

    let resolveFunction;
    if (isInstance) {
        resolveFunction = function(/*owner*/) { return () => resolve; };
    } else {
        if (isSingletone) {
            const singletoneContainer = (function() {
                var _singletonInstance = null;
                return {
                    get: function(owner) {
                        const scoped = (isScoped ? { owner, keyForScope: key } : { owner, keyForScope: null });
                        if (_singletonInstance === null) {
                            _singletonInstance = createInstance(resolve, isFactory, scoped);
                        }
                        return _singletonInstance;
                    }
                }
            })();
            resolveFunction = function(owner) { 
                return () => { 
                    const result = singletoneContainer.get(owner); 
                    return result;
                }
            }
        } else {
            resolveFunction = function(owner) {
                return () => {
                    const scoped = (isScoped ? { owner, keyForScope: key } : { owner, keyForScope: null });
                    const result = createInstance(resolve, isFactory, scoped);
                    return result;
                }
            }
        }
    }

    this._dependencies[key] = { resolver: resolveFunction };
}

function setFactory(types, key, create, thisArg, ...argArray) {
    if (typeof create !== 'function') throw new Error('The create argument not a function.');
    if (thisArg) {
        if (typeof thisArg !== 'object') throw new Error('The argThis argument not object type.');
        create = create.bind(thisArg, argArray);
    }        
    setDependency.call(this, key, create, types);
}

function createInstance(resolve, isFactory, { owner, keyForScope }) {
    let result = (!util.isNullOrUndefined(keyForScope) ? owner._injection_scope[keyForScope] : undefined);
    if (result === undefined) {
        if (isFactory === true) {
            result = resolve(owner);
        } else {
            result = new resolve(owner);
        }
        if (!util.isNullOrUndefined(keyForScope)) {
            owner._injection_scope[keyForScope] = result;
        }
    }
    return result;
}

module.exports = new Injection();