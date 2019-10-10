/* eslint-disable no-undef */
var chai = require('chai');
var expect = chai.expect;
var di = require('../src/injection')();

class Sample1 {
    constructor(req, arg0, arg1) {
        this.foo = "bar1"
        if (arg0) { this.foo = this.foo + ':' + arg0; }
        if (arg1) { this.foo = this.foo + ':' + arg1; }
    }
}
const instance = { foo: 'bar' };
di.setup(container => {
    container.instance('Sample', instance);
    container.transient(Sample1);
})

// Configure chai
chai.should();

describe('Manual resolving', function() {
    describe('Get resolver and resolve', function() {
        it('Get resolver and resolve instance', function() {
            const resolver = di.getResolver('sample');
            expect(resolver()).eq(instance);
        });
        it('Using resolve method for resolving instance', function() {
            const resolved = di.resolve('sample');
            expect(resolved).eq(instance);

            const resolved1 = di.resolve('sample1');
            const resolved2 = di.resolve('sample1');
            expect(resolved1).not.eq(resolved2);
        });
        it('Resolving with arguments', function() {
            const resolved1 = di.resolve('sample1', 1, 2);
            const resolved2 = di.resolve('sample1', 4, "X");

            expect(resolved1).to.include({ foo: 'bar1:1:2' });
            expect(resolved2).to.include({ foo: 'bar1:4:X' });
        });
    });
});
