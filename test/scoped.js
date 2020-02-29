/* eslint-disable no-undef */
var chai = require('chai');
var chaiHttp = require('chai-http');
var expect = chai.expect;
var app = require('./service/server');
var deps = require('../src/injection');

// Configure chai
chai.use(chaiHttp);
chai.should();

describe('Test object registered as a scoped', function() {
    describe('Transient test', function() {
        it('Two requests',
            function() {
                var agent = chai.request.agent(app);
                let first = undefined;
                agent
                    .get('/scoped')
                    .then(function(res) {
                        const instance = res.body;
                        res.should.have.status(200);
                        expect(instance).to.be.an('object');
                        
                        expect(instance).to.deep.include({ eq: true });
                        expect(instance).to.have.own.property('scoped');
                        expect(instance.scoped).to.be.an('object');
                        expect(instance.scoped).to.deep.include({ factory1inc: 2, factory2inc: 1 });

                        first = instance;

                        return agent
                            .get('/scoped')
                            .then(function(res) {
                                const instance = res.body;
                                res.should.have.status(200);
                                expect(instance).to.be.an('object');
                                
                                expect(instance).to.deep.include({ eq: true });
                                expect(instance).to.have.own.property('scoped');
                                expect(instance.scoped).to.be.an('object');
                                expect(instance.scoped).to.deep.include({ factory1inc: 2, factory2inc: 1 });

                                expect(instance).to.not.eq(first);
        
                                agent.close(() => console.log('agent closed.'));
                            });
                    });
            });
    });

    describe("Registering and resolving an instance", function() {
        it('The transientScoped function test', function() {
            const injection = deps();

            const ClassConstructor = function() { this.foo = 'bar'; };

            injection.setup(container => {
                container.transientScoped(ClassConstructor);
            });

            const resolver1 = injection.getResolver('classConstructor');
            const instance11 = resolver1();
            const instance12 = resolver1();

            const resolver2 = injection.getResolver('classConstructor');
            const instance21 = resolver2();
            const instance22 = resolver2();

            expect(instance11).to.be.an('object'); expect(instance11).to.include({ foo: 'bar' });
            expect(instance11).to.eq(instance12);

            expect(instance21).to.be.an('object'); expect(instance21).to.include({ foo: 'bar' });
            expect(instance21).to.eq(instance22);

            expect(instance11).not.to.eq(instance22);
            expect(instance21).not.to.eq(instance12);
        });
    });

    describe("Registering and resolving an instance with using of a named resolver", function() {
        it('The transientScopedNamed function test', function() {
            const injection = deps();

            const ClassConstructor = function() { this.foo = 'bar'; };

            injection.setup(container => {
                container.transientScopedNamed('MyName', ClassConstructor);
            });

            const resolver = injection.getResolver('myName');
            const instance1 = resolver();
            const instance2 = resolver();

            expect(instance1).to.be.an('object'); expect(instance1).to.include({ foo: 'bar' });
            expect(instance1).to.eq(instance2);
        });

        it('Invalid resolverName argument', function() {
            const injection = deps();
            const ClassConstructor = function() { this.foo = 'bar'; };
            injection.setup(container => {
                expect(() => { container.transientScopedNamed(undefined, ClassConstructor); }).to.throw('Invalid resolverName argument');
            });
        });
    });
});