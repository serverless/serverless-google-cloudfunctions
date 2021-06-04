'use strict';

const sinon = require('sinon');
const BbPromise = require('bluebird');
const chalk = require('chalk');

const GoogleProvider = require('../../provider/googleProvider');
const GoogleLogs = require('../googleLogs');
const Serverless = require('../../test/serverless');

describe('RetrieveLogs', () => {
  let serverless;
  let googleLogs;

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
    googleLogs = new GoogleLogs(serverless, options);
  });

  describe('#retrieveLogs()', () => {
    let getLogsStub;
    let printLogsStub;

    beforeEach(() => {
      getLogsStub = sinon.stub(googleLogs, 'getLogs').returns(BbPromise.resolve());
      printLogsStub = sinon.stub(googleLogs, 'printLogs').returns(BbPromise.resolve());
    });

    afterEach(() => {
      googleLogs.getLogs.restore();
      googleLogs.printLogs.restore();
    });

    it('should run promise chain', () =>
      googleLogs.retrieveLogs().then(() => {
        expect(getLogsStub.calledOnce).toEqual(true);
        expect(printLogsStub.calledAfter(getLogsStub));
      }));
  });

  describe('#getLogs()', () => {
    let requestStub;

    beforeEach(() => {
      requestStub = sinon.stub(googleLogs.provider, 'request').returns(BbPromise.resolve());
    });

    afterEach(() => {
      googleLogs.provider.request.restore();
    });

    it('should return a default amount of logs for the function if the "count" option is not given', () => {
      googleLogs.options.function = 'func1';

      return googleLogs.getLogs().then(() => {
        expect(
          requestStub.calledWithExactly('logging', 'entries', 'list', {
            filter: 'resource.labels.function_name="full-function-name" AND NOT textPayload=""',
            orderBy: 'timestamp desc',
            resourceNames: ['projects/my-project'],
            pageSize: 10,
          })
        ).toEqual(true);
      });
    });

    it('should return logs of the function if the "count" option is given', () => {
      googleLogs.options.function = 'func1';
      googleLogs.options.count = 100;

      return googleLogs.getLogs().then(() => {
        expect(
          requestStub.calledWithExactly('logging', 'entries', 'list', {
            filter: 'resource.labels.function_name="full-function-name" AND NOT textPayload=""',
            orderBy: 'timestamp desc',
            resourceNames: ['projects/my-project'],
            pageSize: googleLogs.options.count,
          })
        ).toEqual(true);
      });
    });

    it('should parse the "count" option as an integer', () => {
      googleLogs.options.function = 'func1';
      googleLogs.options.count = '100';

      return googleLogs.getLogs().then(() => {
        expect(
          requestStub.calledWithExactly('logging', 'entries', 'list', {
            filter: 'resource.labels.function_name="full-function-name" AND NOT textPayload=""',
            orderBy: 'timestamp desc',
            resourceNames: ['projects/my-project'],
            pageSize: parseInt(googleLogs.options.count, 10),
          })
        ).toEqual(true);
      });
    });

    it('should throw an error if the function could not be found in the service', () => {
      googleLogs.options.function = 'missingFunc';

      expect(() => googleLogs.getLogs()).toThrow(Error);
    });
  });

  describe('#printLogs()', () => {
    let consoleLogStub;

    beforeEach(() => {
      consoleLogStub = sinon.stub(googleLogs.serverless.cli, 'log').returns();
    });

    afterEach(() => {
      googleLogs.serverless.cli.log.restore();
    });

    it('should print the received execution result log on the console', () => {
      const logs = {
        entries: [
          {
            timestamp: '1970-01-01 00:00',
            textPayload: 'Entry 1',
            labels: { execution_id: 'foo' },
          },
          {
            timestamp: '1970-01-01 00:01',
            textPayload: 'Entry 2',
            labels: { execution_id: 'bar' },
          },
        ],
      };

      const logEntry1 = `${chalk.grey('1970-01-01 00:00:')}\t[foo]\tEntry 1`;
      const logEntry2 = `${chalk.grey('1970-01-01 00:01:')}\t[bar]\tEntry 2`;
      const expectedOutput = `Displaying the 2 most recent log(s):\n\n${logEntry1}\n${logEntry2}`;

      return googleLogs.printLogs(logs).then(() => {
        expect(consoleLogStub.calledWithExactly(expectedOutput)).toEqual(true);
      });
    });

    it('should print a default message to the console when no logs were received', () => {
      const date = `${new Date().toISOString().slice(0, 10)}:`;
      const logEntry = `${chalk.grey(date)}\tThere is no log data to show...`;
      const expectedOutput = `Displaying the 1 most recent log(s):\n\n${logEntry}`;

      return googleLogs.printLogs({}).then(() => {
        expect(consoleLogStub.calledWithExactly(expectedOutput)).toEqual(true);
      });
    });
  });
});
