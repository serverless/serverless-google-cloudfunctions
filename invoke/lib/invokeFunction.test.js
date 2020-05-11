'use strict';

const sinon = require('sinon');
const BbPromise = require('bluebird');
const chalk = require('chalk');

const GoogleProvider = require('../../provider/googleProvider');
const GoogleInvoke = require('../googleInvoke');
const Serverless = require('../../test/serverless');

describe('InvokeFunction', () => {
  let serverless;
  let googleInvoke;

  beforeEach(() => {
    serverless = new Serverless();
    serverless.service = {
      service: 'my-service',
    };
    serverless.service.provider = {
      project: 'my-project',
    };
    serverless.service.functions = {
      func1: {
        handler: 'foo',
        name: 'full-function-name',
      },
    };
    serverless.setProvider('google', new GoogleProvider(serverless));
    const options = {
      stage: 'dev',
      region: 'us-central1',
    };
    googleInvoke = new GoogleInvoke(serverless, options);
  });

  describe('#invokeFunction()', () => {
    let invokeStub;
    let printResultStub;

    beforeEach(() => {
      invokeStub = sinon.stub(googleInvoke, 'invoke').returns(BbPromise.resolve());
      printResultStub = sinon.stub(googleInvoke, 'printResult').returns(BbPromise.resolve());
    });

    afterEach(() => {
      googleInvoke.invoke.restore();
      googleInvoke.printResult.restore();
    });

    it('should run promise chain', () =>
      googleInvoke.invokeFunction().then(() => {
        expect(invokeStub.calledOnce).toEqual(true);
        expect(printResultStub.calledAfter(invokeStub));
      }));
  });

  describe('#invoke()', () => {
    let requestStub;

    beforeEach(() => {
      requestStub = sinon.stub(googleInvoke.provider, 'request').returns(BbPromise.resolve());
    });

    afterEach(() => {
      googleInvoke.provider.request.restore();
    });

    it('should invoke the provided function without data option', () => {
      googleInvoke.options.function = 'func1';

      return googleInvoke.invoke().then(() => {
        expect(
          requestStub.calledWithExactly(
            'cloudfunctions',
            'projects',
            'locations',
            'functions',
            'call',
            {
              name: 'projects/my-project/locations/us-central1/functions/full-function-name',
              resource: {
                data: '',
              },
            }
          )
        ).toEqual(true);
      });
    });

    it('should invoke the provided function with the data option', () => {
      googleInvoke.options.function = 'func1';
      googleInvoke.options.data = '{ "some": "json" }';

      return googleInvoke.invoke().then(() => {
        expect(
          requestStub.calledWithExactly(
            'cloudfunctions',
            'projects',
            'locations',
            'functions',
            'call',
            {
              name: 'projects/my-project/locations/us-central1/functions/full-function-name',
              resource: {
                data: googleInvoke.options.data,
              },
            }
          )
        ).toEqual(true);
      });
    });

    it('should throw an error if the function could not be found in the service', () => {
      googleInvoke.options.function = 'missingFunc';

      expect(() => googleInvoke.invoke()).toThrow(Error);
    });
  });

  describe('#printResult()', () => {
    let consoleLogStub;

    beforeEach(() => {
      consoleLogStub = sinon.stub(googleInvoke.serverless.cli, 'log').returns();
    });

    afterEach(() => {
      googleInvoke.serverless.cli.log.restore();
    });

    it('should print the received execution result on the console', () => {
      const result = {
        executionId: 'wasdqwerty',
        result: 'Foo bar',
      };

      const expectedOutput = `${chalk.grey('wasdqwerty')} Foo bar`;

      return googleInvoke.printResult(result).then(() => {
        expect(consoleLogStub.calledWithExactly(expectedOutput)).toEqual(true);
      });
    });

    it('should print an error message to the console when no result was received', () => {
      const result = {};

      const expectedOutput = `${chalk.grey(
        'error'
      )} An error occurred while executing your function...`;

      return googleInvoke.printResult(result).then(() => {
        expect(consoleLogStub.calledWithExactly(expectedOutput)).toEqual(true);
      });
    });
  });
});
