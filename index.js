var Rollbar = require('rollbar');
var Transform  = require('minilog').Transform;

require('buffer').Buffer.prototype.toJSON = function() {
  return this.toString();
};

/*
 * Possible options:
 *    *accessToken: your project's `post_server_item` access token, which you can find in the Rollbar.com interface
 *    environment: the environment that your code is running in.
 *    endpoint: the url to which items get POSTed
 *    errorThreshold: minimum error level for logging, one of the keys or values in MinilogRollbar.errorLevels, defaults to error
 *    handleExceptions: set to false if you do not want
 *    stackTraceLimit: the number of lines to show in a stackTrace
 */
function MinilogRollbar(options) {
  if (!(this instanceof MinilogRollbar)) return new MinilogRollbar(options);
  this.setup(options);
  return this;
}

Transform.mixin(MinilogRollbar);

MinilogRollbar.errorLevels = { debug: 1, info: 2, warn: 3, error: 4 };

MinilogRollbar.prototype.setup = function(options) {
  this.options = options || {};

  if (options.errorThreshold) {
    if (options.errorThreshold in MinilogRollbar.errorLevels) {
      this.options.errorThreshold = MinilogRollbar.errorLevels[options.errorThreshold];
    } else {
      this.options.errorThreshold = options.errorThreshold;
    }
  }

  this.options.errorThreshold = this.options.errorThreshold || MinilogRollbar.errorLevels.error;

  if (!this.options.accessToken) {
    throw new Error("MinilogRollbar requires an accessToken for Rollbar");
  }

  var handleExceptions = this.options.handleExceptions !== false;

  var options = {
    accessToken: this.options.accessToken,
    captureUncaught: handleExceptions,
    captureUnhandledRejections: handleExceptions,
  };

  if (this.options.environment) {
    options.environment = this.options.environment;
  }

  if (this.options.endpoint) {
    options.endpoint = this.options.endpoint;
  }

  this.rollbar = new Rollbar(options);

  // initiate a backtrace
  if(this.options.stackTraceLimit) {
    Error.stackTraceLimit = this.options.stackTraceLimit;
  }
};

MinilogRollbar.prototype.write = function(name, level, args) {
  if (this.options.errorThreshold > MinilogRollbar.errorLevels[level]) {
    this.emit('item', name, level, args); //pass-through
    return;
  }

  var error, notification;
  for(var i = 0 ; i < args.length ; i++) {
    if(args[i] instanceof Error) {
      error = args.splice(i, 1, args[i].message)[0];
      break;
    }
  }

  if(error) {
    this.rollbar[level].call(this.rollbar, args[0], error, { component: name, data: JSON.stringify(args.slice(1)) });
  } else {
    error = new Error();
    error.name = 'Trace';
    Error.captureStackTrace(error, arguments.callee);

    this.rollbar[level].call(this.rollbar, args[0], error, { component: name, data: JSON.stringify(args.slice(1)) });
  }

  this.emit('item', name, level, args);
};

module.exports = exports = MinilogRollbar;
