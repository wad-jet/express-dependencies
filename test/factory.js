/* eslint-disable no-undef */
var chai = require('chai');
var chaiHttp = require('chai-http');
var expect = chai.expect;
var app = require('./service/server');

// Configure chai
chai.use(chaiHttp);
chai.should();

describe('Test object registered as a factory', function() {
    describe('Transient', function() {
        it('Two requests', 
            function() {
                var agent = chai.request.agent(app);
                var created = undefined;

                agent
                    .get('/router/factory/transient/1')
                    .then(function(res) {
                        const instance = res.body;
                        res.should.have.status(200);
                        expect(instance).to.be.an('object');
                        
                        expect(instance).to.include({ name: 'transient', 1: '1' });
                        expect(instance).to.have.own.property('sample');
                        expect(instance.sample).to.include({ foo: 'bar' });

                        // name of context (this) object
                        expect(instance).to.have.own.property('thisName', 'parent object');

                        expect(instance).to.include({ sarg0: 0, sarg1: 1 });    // Static arguments
                        expect(instance).to.include({ darg2: '1' });            // Dynamic arument

                        created = instance.created;

                        return agent
                            .get('/router/factory/transient/2')
                            .then(function(res) {
                                const instance = res.body;
                                res.should.have.status(200);
                                expect(instance).to.be.an('object');
                                
                                expect(instance).to.include({ name: 'transient', 2: '2' });
                                expect(instance).to.not.include({ 1: '1' });
                                expect(instance).to.not.have.own.property('sample');

                                // name of context (this) object
                                expect(instance).to.have.own.property('thisName', 'parent object');

                                expect(instance).to.include({ sarg0: 0, sarg1: 1 });    // Static arguments
                                expect(instance).to.include({ darg2: '2' });            // Dynamic arument

                                expect(instance.created).to.above(created);
        
                                agent.close(() => console.log('agent closed.'));
                            });
                    });
            });

        it('Factory without this and arguments',
            function() {
                var request = chai.request(app);
                request
                    .get('/router/factory/transient_no')
                    .then(function(res) {
                        const instance = res.body;
                        res.should.have.status(200);
                        expect(instance).to.be.an('object');

                        expect(instance).to.include({ name: 'transient' });
                        expect(instance).to.have.own.property('sample');
                        expect(instance.sample).to.include({ foo: 'bar' });

                        // name of context (this) object
                        expect(instance).to.not.have.own.property('thisName');
                    });
            });
    });

    describe('Singleton', function() {
        it('Two requests', 
            function() {
                var agent = chai.request.agent(app);
                var created = undefined;

                agent
                    .get('/router/factory/singleton/1')
                    .then(function(res) {
                        const instance = res.body;
                        res.should.have.status(200);
                        expect(instance).to.be.an('object');
                        
                        expect(instance).to.include({ name: 'singleton', 1: '1' });
                        expect(instance).to.have.own.property('sample');
                        expect(instance.sample).to.include({ foo: 'bar' });

                        // name of context (this) object
                        expect(instance).to.have.own.property('thisName', 'parent object');

                        expect(instance).to.include({ sarg0: 0, sarg1: 1 });    // Static arguments
                        expect(instance).to.include({ darg2: '1' });            // Dynamic arument
                        
                        created = instance.created;

                        return agent.get('/router/factory/singleton/2')
                            .then(function(res) {
                                const instance = res.body;
                                res.should.have.status(200);
                                expect(instance).to.be.an('object');
                                
                                expect(instance).to.include({ name: 'singleton', 1: '1' });
                                expect(instance).to.not.include({ 2: '2' });
                                expect(instance).to.have.own.property('sample');
                                expect(instance.sample).to.include({ foo: 'bar' });

                                // name of context (this) object
                                expect(instance).to.have.own.property('thisName', 'parent object');

                                expect(instance).to.include({ sarg0: 0, sarg1: 1 });    // Static arguments
                                expect(instance).to.include({ darg2: '1' });            // Dynamic arument

                                expect(instance.created).to.eq(created);

                                agent.close(() => console.log('agent closed.'));
                            });
                    });
            });
    });
});