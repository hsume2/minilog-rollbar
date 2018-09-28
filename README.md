# Rollbar for [Minilog](https://github.com/mixu/minilog/)

[![Build Status](https://travis-ci.org/hsume2/minilog-rollbar.svg?branch=master)](https://travis-ci.org/hsume2/minilog-rollbar)

A consumer of Minilog events that sends event data of a minimum threshold to Rollbar.

Other options include:
  - enable/disable global uncaught exception handling (defaults to
enabled)
  - set the minimum threshold of Minilog events that will be sent to
Rollbar
  - adjust the stack trace length
  - allow Rollbar notification errors to be thrown and potentially halt
current process

## Example

    require('minilog').pipe(require('minilog-rollbar')({ accessToken: 'xxxxxx' }));
