/* eslint-disable no-undef */
var chai = require('chai');
var expect = chai.expect;
var di = require('../src/injection');

// Configure chai
chai.should();

describe('Main tests', function() {
    describe('Setup', function() {
        it('The first argument of setup should be a function only', function() {
            expect(() => di.setup('not a function')).to.throw('not a function');
        });

        it('The keyNameNormalization option should be undefined or a function', function() {
            // eslint-disable-next-line no-unused-vars
            expect(() => di.setup(c => { }, {
                keyNameNormalization: 'not a function'
            })).to.throw('not a function');
        });

        it('The keyNameNormalization option is undefined, used to camel case converter by default', function() {
            expect(() => di.setup(c => { c.transient('not a function') })).to.throw('not a class or function');
        });
    });
});
