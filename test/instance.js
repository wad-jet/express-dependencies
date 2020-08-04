/* eslint-disable no-undef */
var chai = require('chai');
var chaiHttp = require('chai-http');
var expect = chai.expect;
var app = require('./service/server');

// Configure chai
chai.use(chaiHttp);
chai.should();

describe('Test object registered as an instance', function() {
    describe('Main test', function() {
        it('Tagged instances, get for all tags', 
            function() {
                var agent = chai.request.agent(app);
                agent
                    .get('/instance/tagged')
                    .then(function(res) {
                        const instance = res.body;
                        res.should.have.status(200);
                        agent.close(() => console.log('agent closed.'));

                        expect(instance).to.be.an('array');
                        expect(instance.length).eq(3);
                        expect(instance[0]).to.include({ foo: 'bar one' });
                        expect(instance[1]).to.include({ foo: 'bar two or any' });
                        expect(instance[2]).to.include({ foo: 'bar three or any' });
                    });
            });

        it('Tagged instances, get by tag', 
            function() {
                var agent = chai.request.agent(app);
                agent
                    .get('/instance/tagged/any')
                    .then(function(res) {
                        const instance = res.body;
                        res.should.have.status(200);

                        expect(instance).to.be.an('array');
                        expect(instance.length).eq(2);
                        expect(instance[0]).to.include({ foo: 'bar two or any' });
                        expect(instance[1]).to.include({ foo: 'bar three or any' });

                        return agent
                            .get('/instance/tagged/two')
                            .then(function(res) {
                                const instance = res.body;
                                res.should.have.status(200);

                                expect(instance).to.be.an('array');
                                expect(instance.length).eq(1);
                                expect(instance[0]).to.include({ foo: 'bar two or any' });

                                return agent
                                    .get('/instance/tagged/one')
                                    .then(function(res) {
                                        const instance = res.body;
                                        res.should.have.status(200);

                                        expect(instance).to.be.an('array');
                                        expect(instance.length).eq(1);
                                        expect(instance[0]).to.include({ foo: 'bar one' });

                                        return agent
                                            .get('/instance/tagged/none')
                                            .then(function(res) {
                                                const instance = res.body;
                                                res.should.have.status(200);

                                                expect(instance).to.be.an('array');
                                                expect(instance.length).eq(0);

                                                agent.close(() => console.log('agent closed.'));
                                            });
                                    });
                            });
                    });
            });

        it('Set a new properties with the names and values "one" and "two" for the instance in two requests.',
            function() {
                var agent = chai.request.agent(app);
                agent
                    .get('/instance/one')
                    .then(function(res) {
                        const instance = res.body;
                        res.should.have.status(200);
                        expect(instance).to.be.an('object');

                        expect(instance).to.include({ foo: 'bar', one: 'one' });
                        expect(instance).to.not.include({ two: 'two' });
                        
                        return agent
                            .get('/instance/two')
                            .then(function(res) {
                                const instance = res.body;
                                res.should.have.status(200);
                                expect(instance).to.be.an('object');
        
                                expect(instance).to.include({ foo: 'bar', two: 'two' });
                                expect(instance).to.include({ one: 'one' });

                                agent.close(() => console.log('agent closed.'));
                            });
                    });
            });
    });
});