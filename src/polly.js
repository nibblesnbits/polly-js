/**
 * Created by maurice on 9/17/2015.
 */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define([], factory);
    } else if (typeof exports === 'object') {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like environments that support module.exports,
        // like Node.
        module.exports = factory();
    } else {
        // Browser globals (root is window)
        root.polly = factory();
    }
}(this, function () {
    'use strict';

    function execute(config, cb) {
        var count = 0;

        while (true) {
            try {
                return cb();
            }
            catch (ex) {
                if (count < config.count) {
                    count++;
                } else {
                    throw ex;
                }
            }
        }
    }

    function executeForPromise(config, cb) {
        var count = 0;

        return new Promise(function (resolve, reject) {
            function execute() {
                var original = cb();

                original.then(function (e) {
                    resolve(e);
                }, function (e) {
                    if (count < config.count) {
                        count++;
                        execute();
                    } else {
                        reject(e);
                    }
                })
            }

            execute();
        });
    }

    function executeForPromiseWithDelay(config, cb) {

        return new Promise(function (resolve, reject) {
            function execute() {
                var original = cb();

                original.then(function (e) {
                    resolve(e);
                }, function (e) {
                    var delay = config.delays.shift();

                    if (delay) {
                        setTimeout(execute, delay);
                    } else {
                        reject(e);
                    }
                })
            }

            execute();
        });
    }
    
    function executeForPromiseWithDelayEs6(config, cb) {

        return new Promise((resolve, reject) => {
            function execute() {
                let retries = 1;
                var original = cb();

                original.then((e) => {
                    return resolve(e);
                }, (e) => {
                    if (++retries > config.delays) {
                        return reject(e);
                    }
                    var delay = config.generator.next(retries);
                    
                    if (delay) {
                        setTimeout(execute, delay.value);
                    } else {
                        return reject(e);
                    }
                })
            }

            execute();
        });
    }


    function executeForNode(config, fn, callback) {
        var count = 0;

        function internalCallback(err, data) {
            if (err && count < config.count) {
                count++;
                fn(internalCallback);
            } else {
                callback(err, data);

            }
        }

        fn(internalCallback);
    }

    function executeForNodeWithDelay(config, fn, callback) {

        function internalCallback(err, data) {
            var delay = config.delays.shift();
            if (err && delay) {
                setTimeout(function () {
                    fn(internalCallback);
                }, delay);
            } else {
                callback(err, data);
            }
        }

        fn(internalCallback);
    }

    var defaults = {
        delay: 100
    };

    function delayCountToDelays(count){
        var delays = [], delay = defaults.delay;

        for (var i = 0; i < count; i++) {
            delays.push(delay);
            delay = 2 * delay;
        }

        return delays;
    }

    return {
        defaults: defaults,
        retry: function (count) {
            var config = {
                count: count || 1
            };

            return {
                execute: execute.bind(null, config),
                executeForPromise: executeForPromise.bind(null, config),
                executeForNode: executeForNode.bind(null, config)
            };
        },
        waitAndRetry: function (delays, generator) {
            if (Number.isInteger(delays)) {
                delays = delayCountToDelays(delays);
            }

            if (!Array.isArray(delays)) {
                delays = [defaults.delay];
            }
            
            var config = {
                delays: delays,
                generator: generator
            };

            return {
                executeForPromise: executeForPromiseWithDelay.bind(null, config),
                executeForPromiseEs6: executeForPromiseWithDelay.bind(null, config),
                executeForNode: executeForNodeWithDelay.bind(null, config)
            };
        }
    }
}));
