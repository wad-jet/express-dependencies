var express = require('../../node_modules/express');
var router = express.Router();
var path = require('path');
var injection = require('../../src/injection');

var app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
injection.setup(container => {
    container.instance('sample', { foo: 'bar' });

    // TODO: ...
});

// eslint-disable-next-line no-unused-vars
app.get('/', injection.resolve, function({ req }, res, next) {
    res.send('respond with a resource');
});

// eslint-disable-next-line no-unused-vars
router.get('/', injection.resolve, function({ req }, res, next) {
    res.send('respond with a resource (router)');
});

app.listen(3001, function () {
    console.log('Example app listening on port 3001!');
});
app.use('/router', router);

module.exports = app;