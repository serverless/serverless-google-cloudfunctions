'use strict';

const sinon = require('sinon');
const BbPromise = require('bluebird');

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
    let getLogsStub;
    let printLogsStub;

    beforeEach(() => {
      invokeStub = sinon.stub(googleInvoke, 'invoke')
        .returns(BbPromise.resolve());
      getLogsStub = sinon.stub(googleInvoke, 'getLogs')
        .returns(BbPromise.resolve());
      printLogsStub = sinon.stub(googleInvoke, 'printLogs')
        .returns(BbPromise.resolve());
    });

    afterEach(() => {
      googleInvoke.invoke.restore();
      googleInvoke.getLogs.restore();
      googleInvoke.printLogs.restore();
    });

    it('should run promise chain', () => googleInvoke
      .invokeFunction().then(() => {
        expect(invokeStub.calledOnce).toEqual(true);
        expect(getLogsStub.calledAfter(invokeStub));
        expect(printLogsStub.calledAfter(getLogsStub));
      }),
    );
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
        expect(requestStub.calledWithExactly(
          'cloudfunctions',
          'projects',
          'locations',
          'functions',
          'call',
          {
            name: 'projects/my-project/locations/us-central1/functions/foo',
            resource: {
              data: '',
            },
          },
        )).toEqual(true);
      });
    });

    it('should invoke the provided function with the data option', () => {
      googleInvoke.options.function = 'func1';
      googleInvoke.options.data = '{ "some": "json" }';

      return googleInvoke.invoke().then(() => {
        expect(requestStub.calledWithExactly(
          'cloudfunctions',
          'projects',
          'locations',
          'functions',
          'call',
          {
            name: 'projects/my-project/locations/us-central1/functions/foo',
            resource: {
              data: googleInvoke.options.data,
            },
          },
        )).toEqual(true);
      });
    });

    it('should throw an error if the function could not be found in the service', () => {
      googleInvoke.options.function = 'missingFunc';

      expect(() => googleInvoke.invoke()).toThrow(Error);
    });
  });

  describe('#getLogs()', () => {
    let requestStub;

    beforeEach(() => {
      requestStub = sinon.stub(googleInvoke.provider, 'request').returns(BbPromise.resolve());
    });

    afterEach(() => {
      googleInvoke.provider.request.restore();
    });

    it('should return the recent logs of the previously called function', () => {
      googleInvoke.options.function = 'func1';

      return googleInvoke.getLogs().then(() => {
        expect(requestStub.calledWithExactly(
          'logging',
          'entries',
          'list',
          {
            filter: 'Function execution foo us-central1',
            orderBy: 'timestamp desc',
            resourceNames: [
              'projects/my-project',
            ],
            pageSize: 2,
          },
        )).toEqual(true);
      });
    });

    it('should throw an error if the function could not be found in the service', () => {
      googleInvoke.options.function = 'missingFunc';

      expect(() => googleInvoke.getLogs()).toThrow(Error);
    });
  });

  describe('#printLogs()', () => {
    let consoleLogStub;

    beforeEach(() => {
      consoleLogStub = sinon.stub(googleInvoke.serverless.cli, 'log').returns();
    });

    afterEach(() => {
      googleInvoke.serverless.cli.log.restore();
    });

    it('should print the received execution result log on the console', () => {
      const logs = {
        entries: [
          { timestamp: '1970-01-01 00:00', textPayload: 'Function execution started' },
          { timestamp: '1970-01-01 00:01', textPayload: 'Function result' },
        ],
      };

      const expectedOutput =
        '1970-01-01 00:01: Function result';

      return googleInvoke.printLogs(logs).then(() => {
        expect(consoleLogStub.calledWithExactly(expectedOutput)).toEqual(true);
      });
    });

    it('should print a default message to the console when no logs were received', () => {
      const date = new Date().toISOString().slice(0, 10);
      const logs = {
        entries: [
          {},
          {
            timestamp: date,
            textPayload: 'There is no log data available right now...',
          },
        ],
      };

      const expectedOutput = `${date}: ${logs.entries[1].textPayload}`;

      return googleInvoke.printLogs({}).then(() => {
        expect(consoleLogStub.calledWithExactly(expectedOutput)).toEqual(true);
      });
    });
  });
});
