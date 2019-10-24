# express-dependencies

Dependency Injection for Express

[![NPM Version][npm-image]][npm-url]
[![Linux Build][travis-image]][travis-url]
[![Test Coverage][coveralls-image]][coveralls-url]

## Installation

```sh
npm install --save express-dependencies
```

## Usage: register and injection components

```js
var express = require('express');
var deps = require('express-dependencies')();

var app = express();

// The first argument is request (req) or resolvers (with or without a request), for example: Transient({ foo, singleton, req }, id) {
function Transient(req, id) {
    this.id = id;
    this.name = 'I am a transient component with id ' + id;
}

// You can use the class declaration instead of the function
class Singleton {
    constructor() {
        this.name = 'I am a singleton component';
    }
}

// Set middleware for injection
app.use(deps.setup(container => {
    container.instance('Foo', { foo: 'bar' });
    container.singleton(Singleton);
    container.transient(Transient);
    container.singletonFactory('SingletonFactory', ({ req, foo }) => {
        const result = {
            ip: req.ip,
            path: req.path,
            foo: foo()
        }
        return result;
    });
    container.transientFactory('TransientFactory', ({ transient }) => {
        const result = {
            transient: transient(0)
        }
        return result;
    });
}));

app.get('/:id', function({ req, foo, singleton, transient, singletonFactory, transientFactory }, res, next) {
    const model = {
        foo: foo(), // Resolve a foo component instance
        singleton: singleton(), // Resolve a singleton component instance
        transient: transient(+req.params.id), // Resolve an instance of transient component with id
        singletonF: singletonFactory(), // Resolve an instance of singleton component created using a factory
        transientF: transientFactory() // Resolve an instance of transient component created using a factory
    };
    res.json(model);
});

```

The result of request to the local service http://localhost:3000/123

```json
{
   "foo":{
      "foo":"bar"
   },
   "singleton":{
      "name":"I am a singleton component"
   },
   "transient":{
      "id":123,
      "name":"I am a transient component with id 123"
   },
   "singletonF":{
      "ip":"::1",
      "path":"/123",
      "foo":{
         "foo":"bar"
      }
   },
   "transientF":{
      "transient":{
         "id":0,
         "name":"I am a transient component with id 0"
      }
   }
}
```

### Scoped Lifestyle

For every request within a defined scope, a single instance of the component will be returned and that instance will be disposed when the scope ends.

You can declare such dependencies using the *transientScoped* and *transientScopedFactory* functions.

```js
app.use(deps.setup(container => {
    container.transientScoped(Transient); // enable scoped lifestyle
}));
```

> In version <= 1.0.4, lifestyle scoped is enabled using the isScoped argument in the transient and transientFactory functions.
> The argument isScoped is not supported in versions >= 1.0.4.

### Resolve instances without injection

If you need to get an instance without injections, you can use the Resolve function. The Resolve function accepts the name of the instance as argument, as well as a possible set of additional arguments to the instance constructor.

```js
var deps = require('express-dependencies')();
const resolver = deps.getResolver('sample');
const sampleInstance = resolver();
```

or

```js
var deps = require('express-dependencies')();
const sampleInstance = deps.resolve('sample');
```

The **deps** can be used as a service locator.

I will be glad to your wishes, suggestions and comments. Please, write to <express.di@wad-jet.ru>.

[npm-image]: https://img.shields.io/npm/v/express-dependencies.svg
[npm-url]: https://npmjs.org/package/express-dependencies
[travis-image]: https://img.shields.io/travis/wad-jet/express-dependencies/master.svg?label=linux
[travis-url]: https://travis-ci.org/wad-jet/express-dependencies
[coveralls-image]: https://img.shields.io/coveralls/wad-jet/express-dependencies/master.svg
[coveralls-url]: https://coveralls.io/r/wad-jet/express-dependencies?branch=master