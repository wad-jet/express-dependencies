/* eslint-disable no-undef */
var chai = require('chai');
var expect = chai.expect;
var di = require('../src/injection')();

// Configure chai
chai.should();

describe('Setup tests', function() {
    describe('Setup arguments validation test', function() {
        it('The argument "setContainer" is not a function.', function() {
            expect(() => { di.setup(undefined); }).to.throw('The argument "setContainer" is not a function.');
        });

        it('First argument of setup should be a function only', function() {
            expect(() => di.setup('not a function')).to.throw('not a function');
        });
    });

    describe('keyNameNormalization option test', function() {
        it('keyNameNormalization option should be undefined or a function', function() {
            // eslint-disable-next-line no-unused-vars
            expect(() => di.setup(c => { }, {
                keyNameNormalization: 'not a function'
            })).to.throw('not a function');
        });

        it('keyNameNormalization option is undefined, used to camel case converter by default', function() {
            expect(() => di.setup(c => { c.transient({ constructor: 'not a function', tags: [ ] }) })).to.throw('not a class or function');
        });

        it('keyNameNormalization should support camel case logic for naming by default', function() {
            const instance = { foo: 'bar' };
            di.setup(c => {
                c.instance('NameForResolvinG', instance);
            });

            const resolved = { };
            di.injector(resolved, null, () => { });

            expect(resolved).to.not.have.own.property('NameForResolvinG')
            expect(resolved).to.have.own.property('nameForResolvinG');
            expect(resolved.nameForResolvinG()).eq(instance);
        });

        it('if key is null, undefined or empty after keyNameNormalization execute', function() {
            expect(() => di.setup(c => { c.instance('', {}); })).to.throw("Argument \"key\" after keyNameNormalization execute has null, undefined or empty value");
        });
    })
});
