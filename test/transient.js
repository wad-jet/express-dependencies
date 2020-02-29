/* eslint-disable no-undef */
var chai = require('chai');
var chaiHttp = require('chai-http');
var expect = chai.expect;
var app = require('./service/server');
var deps = require('../src/injection');

// Configure chai
chai.use(chaiHttp);
chai.should();

describe('Test object registered as a transient.', function() {
    describe('Main test', function() {
        it('Two requests',
            function() {
                var agent = chai.request.agent(app);
                var created, reg = undefined;

                agent
                    .get('/transient/user/100/Bill/Google/1')
                    .then(function(res) {
                        const instance = res.body;
                        res.should.have.status(200);
                        expect(instance).to.be.an('object');
                        
                        expect(instance).to.include({ 1: '1' });
                        expect(instance).to.have.own.property('sample');
                        expect(instance.sample).to.include({ foo: 'bar' });

                        expect(instance).to.include({ code: 123, id: 100, name: 'Bill', organization: 'Google'});

                        created = instance.created;
                        reg = instance.reg;

                        expect(instance.reg).to.be.a('Number');
                        expect(instance.reg).to.below(created);

                        return agent
                            .get('/transient/user/200/Alex/Amazon/2')
                            .then(function(res) {
                                const instance = res.body;
                                res.should.have.status(200);
                                expect(instance).to.be.an('object');
                                
                                expect(instance).to.include({ 2: '2' });
                                expect(instance).to.have.own.property('sample');
                                expect(instance.sample).to.include({ foo: 'bar' });

                                expect(instance).to.include({ code: 123, id: 200, name: 'Alex', organization: 'Amazon'});    // Static arguments

                                expect(instance.created).to.above(created);
                                expect(instance.reg).to.be.a('Number');
                                expect(instance.reg).to.below(instance.created);

                                expect(instance.reg).to.eq(reg);
        
                                agent.close(() => console.log('agent closed.'));
                            });
                    });
            });
    });

    describe("Registering and resolving an instance", function() {
        it('The transient function test', function() {
            const injection = deps();
            const ClassConstructor = function() { this.foo = 'bar'; };
            injection.setup(container => {
                container.transient(ClassConstructor);
            });

            const resolver = injection.getResolver('classConstructor');
            const instance1 = resolver();
            const instance2 = resolver();

            expect(instance1).to.be.an('object'); expect(instance1).to.include({ foo: 'bar' });
            expect(instance2).to.be.an('object'); expect(instance2).to.include({ foo: 'bar' });
            expect(instance1).to.not.eq(instance2);
        });
    });

    describe("Registering and resolving an instance with using of a named resolver", function() {
        it('The transientNamed function test', function() {
            const injection = deps();
            const ClassConstructor = function() { this.foo = 'bar'; };
            injection.setup(container => {
                container.transientNamed('MyName', ClassConstructor);
            });

            const resolver = injection.getResolver('myName');
            const instance1 = resolver();
            const instance2 = resolver();

            expect(instance1).to.be.an('object'); expect(instance1).to.include({ foo: 'bar' });
            expect(instance2).to.be.an('object'); expect(instance2).to.include({ foo: 'bar' });
            expect(instance1).to.not.eq(instance2);
        });

        it('Invalid resolverName argument', function() {
            const injection = deps();
            const ClassConstructor = function() { this.foo = 'bar'; };
            injection.setup(container => {
                expect(() => { container.transientNamed(undefined, ClassConstructor); }).to.throw('Invalid resolverName argument');
            });
        });
    });
});