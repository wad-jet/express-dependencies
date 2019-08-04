# express-dependencies

Dependency Injection for Express

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

The transient and transientFactory functions have an isScoped argument (false by default if not set).

```js
app.use(deps.setup(container => {
    container.transient(Transient, true); // enable scoped lifestyle
}));
```
