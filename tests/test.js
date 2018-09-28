var MinilogRollbar = require('../index.js'),
    Rollbar = require('rollbar'),
    Buffer = require('buffer').Buffer,
    chai = require('chai'),
    spies = require('chai-spies'),
    expect = chai.expect,
    spyOn = function(object, method, preventCallThrough) {
      var fn = preventCallThrough || object[method],
          spy = chai.spy(fn);
      spy.__spy.original = object[method];
      object[method] = spy;
      spy.restore = function() {
        object[method] = spy.__spy.original;
      };

      return spy;
    };

chai.use(spies);

describe('MinilogRollbar', function() {
  var instance;

  beforeEach(function() {
    instance = MinilogRollbar({ accessToken: 'test', handleExceptions: false });
  });

  describe('#setup', function() {
    it('should throw an error if there is no accessToken', function() {
      expect(function() { instance.setup({ accessToken: '' }); }).to.throw("MinilogRollbar requires an accessToken for Rollbar");
    });

    it('should create a Rollbar client', function() {
      instance.setup({ accessToken: 'test', environment: 'staging', endpoint: 'https://rollbar/api/1/item', stackTraceLimit: 10 });
      expect(instance.rollbar).to.be.an.instanceof(Rollbar);
      expect(instance.rollbar.options.accessToken).to.eq('test');
      expect(instance.rollbar.options.environment).to.eq('staging');
      expect(instance.rollbar.options.endpoint).to.eq('https://rollbar/api/1/item');
      expect(Error.stackTraceLimit).to.eq(10);
    });

    it('should not handleExceptions if the option is set to false', function() {
      instance.setup({ accessToken: 'test', handleExceptions: false });
      expect(instance.rollbar.options.captureUncaught).to.be.false;
      expect(instance.rollbar.options.captureUnhandledRejections).to.be.false;
    });

    it('should handleExceptions if the option is not set to false', function() {
      instance.setup({ accessToken: 'test' });
      expect(instance.rollbar.options.captureUncaught).to.be.true;
      expect(instance.rollbar.options.captureUnhandledRejections).to.be.true;
    });
  });

  describe('#write', function() {
    it('should notify Rollbar when there is a unformatted error', function() {
      var spy = spyOn(instance.rollbar, 'error', function(message, err, custom) {
        expect(message).to.equal('Hello');
        expect(custom.component).to.equal('name');
        expect(custom.data).to.equal('[]');
      });
      instance.write('name','error', ['Hello']);
      expect(instance.rollbar.error).to.have.been.called.once;
      spy.restore();
    });

    it('should notify Rollbar when there is an error object', function() {
      var spy = spyOn(instance.rollbar, 'error', function(message, err, custom) {
        expect(message).to.equal('bad bad error');
        expect(custom.component).to.equal('name');
        expect(custom.data).to.equal('[]');
      });
      instance.write('name', 'error', [new Error('bad bad error')]);
      expect(instance.rollbar.error).to.have.been.called.once;
      spy.restore();
    });

    it('should return without notifying if the level argument is lower than the errorThreshold', function() {
      var spyEmit = spyOn(instance, 'emit', function() {
        var args = Array.prototype.slice.call(arguments);
        expect(args).to.deep.equal(['item', 'name', 'info', ['message', { data: 1 }]])
      });
      var spy = spyOn(instance.rollbar, 'info');
      instance.options.errorThreshold = MinilogRollbar.errorLevels.warn;
      instance.write('name', 'info', ['message', { data: 1 }]);
      expect(instance.rollbar.info).not.to.have.been.called.once;
      expect(instance.emit).to.have.been.called.once;
      spy.restore();
      spyEmit.restore();
    });

    it('should notify if the level argument is greater than the errorThreshold', function() {
      var spy = spyOn(instance.rollbar, 'error', function(message, err, custom) {
        expect(message).to.equal('message');
        expect(custom.component).to.equal('name');
        expect(custom.data).to.equal('[{"data":1}]');
      });
      instance.options.errorThreshold = MinilogRollbar.errorLevels.warn;
      instance.write('name', 'error', ['message', { data: 1 }]);
      expect(instance.rollbar.error).to.have.been.called.once;
      spy.restore();
    });

    it('should notify if the level argument is equal to the errorThreshold', function() {
      var spy = spyOn(instance.rollbar, 'warn', function(message, err, custom) {
        expect(message).to.equal('message');
        expect(custom.component).to.equal('name');
        expect(custom.data).to.equal('[{"data":1}]');
      });
      instance.options.errorThreshold = MinilogRollbar.errorLevels.warn;
      instance.write('name', 'warn', ['message', { data: 1 }]);
      expect(instance.rollbar.warn).to.have.been.called.once;
      spy.restore();
    });

    it('should add an object to the errors list with the appropriate properties', function() {
      var spy = spyOn(instance.rollbar, 'error', function(message, err, custom) {
        expect(message).to.equal('message');
        expect(custom.component).to.equal('name');
        expect(custom.data).to.equal('["foo"]');
      });
      instance.write('name', 'error', [ 'message', new Error('foo') ]);
      expect(instance.rollbar.error).to.have.been.called.once;
      spy.restore();
    });

    it('should emit when finished', function() {
      var spy = spyOn(instance, 'emit', function() {
        var args = Array.prototype.slice.call(arguments);
        expect(args).to.deep.equal(['item', 'name', 'error', ['message', 'foo']])
      });
      instance.write('name', 'error', [ 'message', new Error('foo') ]);
      expect(instance.emit).to.have.been.called.once;
      spy.restore();
    });
  });
});
