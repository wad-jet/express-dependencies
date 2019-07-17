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