express-dependencies
====================

Dependency Injection for Express

Installation
------------

```sh
npm install --save express-dependencies
```

Usage: register and injection components
-----------

```js
var express = require('express');
var edi = require('express-dependencies');

var app = express();

// Set middleware for injection
app.use(edi.injector);

// The first argument is request (req) or a resolvers (with or without a request), for example: Transient({ foo, singleton, req }, id) {
function Transient(req, id) {
    this.id = id;
    this.name = 'I am a transient component with id ' + id;
}

// You can use the class declaration instead of the function
class Singleton() {
    constructor() {
        this.name = 'I am a singleton component';
    }
}

edi.setup(container => {
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
});

app.get('/:id', function({ req, foo, singleton, transient, singletonFactory, transientFactory }, res, next) {
    const model = {
        foo: foo(), // Resolve a foo component instance
        singleton: singleton(), // Resolve a singleton component instance
        transient: transient(+req.params.id), // Resolve an instance of a transient component with id
        singletonF: singletonFactory(), // Resolve an instance of a singleton component created using a factory
        transientF: transientFactory() // Resolve an instance of a transient component created using a factory
    };
    res.json(model);
});

```

The result of a request to the local service http://localhost:3000/123

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
