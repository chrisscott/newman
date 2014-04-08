var jsface = require('jsface'),
	log    = require('../utilities/Logger'),
	helper    = require('../utilities/Helpers'),
	_und   = require('underscore'),
	vm = require('vm'),
	AbstractResponseHandler = require('./AbstractResponseHandler'),
	$jq = require("jquery"),
	_lod = require("lodash"),
	Backbone = require("backbone"),
	sugar = require("sugar"),
	xmlToJson = require("xml2js"),
	tv4 = require("tv4");

/**
 * @class TestResponseHandler
 * @classdesc
 */
var TestResponseHandler = jsface.Class(AbstractResponseHandler, {
	$singleton: true,

	// function called when the event "requestExecuted" is fired. Takes 4 self-explanatory parameters
	_onRequestExecuted: function(error, response, body, request) {
		if (error) {
			log.error(request.id + " terminated with the error " + error.code + "\n");
		} else {
			if (response.statusCode >= 200 && response.statusCode < 300) {
				log.success(response.statusCode);
			} else {
				log.error(response.statusCode);
			}
			log
			.notice(" " + response.stats.timeTaken + "ms")
			.normal(" " + request.name + " ")
			.light(request.url + "\n");
			this._runAndLogTestCases(error, response, body, request);
		}
	},

	_runAndLogTestCases: function(error, response, body, request) {
		if (this._hasTestCases(request)) {
			var tests = this._getValidTestCases(request.tests);
			var sandbox = this._createSandboxedEnvironment(error, response, body, request);
			var results = this._runAndGenerateTestResults(tests, sandbox);
			this._logTestResults(results);
		}
	},

	_hasTestCases: function(request) {
		return !!request.tests;
	},

	_getValidTestCases: function(tests) {
		return _und.reduce(tests.split(';'), function(listOfTests, testCase) {
			var t = testCase.trim();
			if (t.length > 0) {
				listOfTests.push(t);
			}
			return listOfTests;
		}, []);
	},

	_runAndGenerateTestResults: function(testCases, sandbox) {
		return this._evaluateInSandboxedEnvironment(testCases, sandbox);
	},

	_evaluateInSandboxedEnvironment: function(testCase, sandbox) {
		testCase = 'String.prototype.has = function(value){ return this.indexOf(value) > -1};' + testCase.join(";");
		try {
			vm.runInNewContext(testCase, sandbox);
		} catch (err) {
			log.exceptionError(err);
		}
		return sandbox.tests;
	},

	_createSandboxedEnvironment: function(error, response, body, request) {
		// TODO: @prakhar1989, figure out how to load the environment & globals here.
		return {
			tests: {},
			responseHeaders: response.headers,
			responseBody: body,
			responseTime: response.stats.timeTaken,
			responseCode: {
				code: response.statusCode,
				name: request.name,
				detail: request.description
			},
			data: {},
			iteration: 0,
			environment: {},
			globals: {},
			$: $jq,
			_: _lod,
			Backbone: Backbone,
			xmlToJson: xmlToJson,
			tv4: tv4,
			console: {log: function(){}}
		};
	},

	_logTestResults: function(results) {
		_und.each(_und.keys(results), function(key) {
			if (results[key]) {
				log.testCaseSuccess(key);
			} else {
				log.testCaseError(key);
			}
		});
	}
});

module.exports = TestResponseHandler;