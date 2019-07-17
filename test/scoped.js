/* eslint-disable no-undef */
var chai = require('chai');
var chaiHttp = require('chai-http');
var expect = chai.expect;
var app = require('./service/server');

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
});