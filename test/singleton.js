/* eslint-disable no-undef */
var chai = require('chai');
var chaiHttp = require('chai-http');
var expect = chai.expect;
var app = require('./service/server');
var deps = require('../src/injection');

// Configure chai
chai.use(chaiHttp);
chai.should();

describe('Test object registered as a singleton.', function() {
    describe('Main test', function() {
        it('Two requests',
            function() {
                var agent = chai.request.agent(app);
                var created, reg = undefined;

                agent
                    .get('/singleton/component/single')
                    .then(function(res) {
                        const instance = res.body;
                        res.should.have.status(200);
                        expect(instance).to.be.an('object');
                        
                        expect(instance).to.include({ single: 'single' });
                        expect(instance).to.have.own.property('sample');
                        expect(instance.sample).to.include({ foo: 'bar' });

                        // Dynamic arguments
                        expect(instance).to.include({ darg: 'single' }); // Added in current request

                        created = instance.created;
                        reg = instance.reg;

                        expect(instance.reg).to.be.a('Number');
                        expect(instance.reg).to.below(created);

                        return agent
                            .get('/singleton/component/second')
                            .then(function(res) {
                                const instance = res.body;
                                res.should.have.status(200);
                                expect(instance).to.be.an('object');
                                
                                expect(instance).to.include({ single: 'single' }); // Saved after previous request
                                expect(instance).to.include({ second: 'second' }); // Added in current request
                                expect(instance).to.have.own.property('sample');
                                expect(instance.sample).to.include({ foo: 'bar' });

                                // Dynamic arguments
                                expect(instance).to.include({ darg: 'single' });
                                expect(instance).to.not.include({ darg: 'second' });

                                expect(instance.created).to.eq(created);
                                expect(instance.reg).to.be.a('Number');
                                expect(instance.reg).to.below(instance.created);

                                expect(instance.reg).to.eq(reg);
        
                                agent.close(() => console.log('agent closed.'));
                            });
                    });
            });
    });

    describe("Registering and resolving an instance", function() {
        it('The singleton function test', function() {
            const injection = deps();
            const ClassConstructor = function() { this.foo = 'bar'; };
            injection.setup(container => {
                container.singleton(ClassConstructor);
            });

            const resolver = injection.getResolver('classConstructor');
            const instance1 = resolver();
            const instance2 = resolver();

            expect(instance1).to.be.an('object'); expect(instance1).to.include({ foo: 'bar' });
            expect(instance2).to.be.an('object'); expect(instance2).to.include({ foo: 'bar' });
            expect(instance1).to.eq(instance2);
        });
    });

    describe("Registering and resolving an instance with using of a named resolver", function() {
        it('The singletonNamed function test', function() {
            const injection = deps();
            const ClassConstructor = function() { this.foo = 'bar'; };
            injection.setup(container => {
                container.singletonNamed('MyName', ClassConstructor);
            });

            const resolver = injection.getResolver('myName');
            const instance1 = resolver();
            const instance2 = resolver();

            expect(instance1).to.be.an('object'); expect(instance1).to.include({ foo: 'bar' });
            expect(instance2).to.be.an('object'); expect(instance2).to.include({ foo: 'bar' });
            expect(instance1).to.eq(instance2);
        });

        it('Invalid resolverName argument', function() {
            const injection = deps();
            const ClassConstructor = function() { this.foo = 'bar'; };
            injection.setup(container => {
                expect(() => { container.singletonNamed(undefined, ClassConstructor); }).to.throw('Invalid resolverName argument');
            });
        });
    });
});