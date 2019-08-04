var express = require('../../node_modules/express');
var router = express.Router();
var dependencies = require('../../src/injection');
var deps = dependencies();
var util = require('util');

const thisObj = {
    name: 'parent object'
};

class User {
    constructor({ sample, req }, reg, code, id, name, organization) {
        this.reg = reg;
        // Static args
        this.created = Date.now();
        this.code = code;
        // Dynamic args
        this.id = +id;
        this.name = name;
        this.organization = organization;
        // Resolve dependency
        this.sample = sample();
        // Additional field in the request
        this.fields = { };
        this.fields[req.params.field] = req.params.field;
    }
}

class Component {
    constructor({ sample, req }, reg, code, darg) {        
        this.reg = reg;
        // Static args
        this.created = Date.now();
        this.code = code;
        // Dynamic arg
        this.darg = darg;
        // Resolve dependency
        this.sample = sample();
        // Additional field in the request
        this.fields = { };
        this.fields[req.params.field] = req.params.field;
    }
}

var app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(deps.setup(container => {
    container.instance('sample', { foo: 'bar' });

    container.transientFactory('tFactoryNoArgsAndNoThis', function({ sample }, sarg0, sarg1, darg2) {
        var instance = { name: 'transient' };
        instance.created = Date.now();
        instance.sarg0 = sarg0;
        instance.sarg1 = sarg1;
        instance.darg2 = darg2;
        instance.sample = sample();
        instance.thisName = this.name;
        return instance;
    });

    container.transientFactory('tFactory', function({ req, sample }, sarg0, sarg1, darg2) {
        var instance = { name: 'transient' };
        instance.created = Date.now();
        instance[req.params.field] = req.params.field;
        instance.sarg0 = sarg0;
        instance.sarg1 = sarg1;
        instance.darg2 = darg2;
        if (req.params.field == 1) {
            instance.sample = sample();
        }
        instance.thisName = this.name;
        return instance;
    }, false, thisObj, 0, 1);

    container.singletonFactory('sFactory', function({ req, sample }, sarg0, sarg1, darg2) {
        var instance = { name: 'singleton' };
        instance.created = Date.now();
        instance[req.params.field] = req.params.field;
        instance.sarg0 = sarg0;
        instance.sarg1 = sarg1;
        instance.darg2 = darg2;
        if (req.params.field == 1) {
            instance.sample = sample();
        }
        instance.thisName = this.name;
        return instance;
    }, thisObj, 0, 1);

    container.transient(User, false, Date.now(), 123);

    container.singleton(Component, Date.now(), 123);

    // Scoped test
    container.transient(Scoped, true);
    container.transientFactory('Factory1', ({ scoped }) => {
        const instance = scoped();
        instance.factory1inc++;
        return instance;
    });
    container.transientFactory('ScopedFactory2', ({ scoped }) => {
        const instance = scoped();
        instance.factory2inc++;
        return instance;
    }, true);
}));

function Scoped() {
    this.factory1inc = 0;
    this.factory2inc = 0;
}

// eslint-disable-next-line no-unused-vars
app.get('/scoped', function({ req, factory1, scopedFactory2 }, res, next) {
    let f1result = factory1();
    f1result = factory1();
    let sf2result = scopedFactory2();
    sf2result = scopedFactory2();

    const result = {
        eq: f1result === sf2result,
        scoped: sf2result
    }
    res.json(result);
});

// eslint-disable-next-line no-unused-vars
app.get('/instance/:field', function({ req, sample }, res, next) {
    var instance = sample();
    instance[req.params.field] = req.params.field;
    res.json(instance);
});

// eslint-disable-next-line no-unused-vars
app.get('/transient/user/:id/:name/:organization/:field', function({ req, user, User }, res, next) {
    if (util.isFunction(User)) throw new Error('The name of the resolver key "User" is not normalized');
    var instance = user(req.params.id, req.params.name, req.params.organization);
    instance[req.params.field] = req.params.field;
    res.json(instance);
});

// eslint-disable-next-line no-unused-vars
app.get('/singleton/component/:field', function({ req, component, Component }, res, next) {
    if (util.isFunction(Component)) throw new Error('The name of the resolver key "Component" is not normalized');
    var instance = component(req.params.field);
    instance[req.params.field] = req.params.field;
    res.json(instance);
});

// eslint-disable-next-line no-unused-vars
router.get('/factory/transient/:field', function({ req, tFactory }, res, next) {
    var instance = tFactory(req.params.field);
    res.json(instance);
});

// eslint-disable-next-line no-unused-vars
router.get('/factory/transient_no', function({ tFactoryNoArgsAndNoThis }, res, next) {
    var instance = tFactoryNoArgsAndNoThis();
    res.json(instance);
});

// eslint-disable-next-line no-unused-vars
router.get('/factory/singleton/:field', function({ req, sFactory }, res, next) {
    
    // TODO: Если singleton, то новый экземпляр не создается - возможно аргумент не нужен? Это точно актуально?
    var instance = sFactory(req.params.field);
    res.json(instance);
});

app.use('/router', router);

module.exports = app;