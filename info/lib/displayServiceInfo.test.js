'use strict';

const sinon = require('sinon');
const BbPromise = require('bluebird');
const chalk = require('chalk');

const GoogleProvider = require('../../provider/googleProvider');
const GoogleInfo = require('../googleInfo');
const Serverless = require('../../test/serverless');

describe('DisplayServiceInfo', () => {
  let serverless;
  let googleInfo;

  beforeEach(() => {
    serverless = new Serverless();
    serverless.service.service = 'my-service';
    serverless.service.functions = {
      'func1': {
        handler: 'handler',
        events: [{ http: 'foo' }],
      },
      'func2': {
        handler: 'handler',
        events: [
          {
            event: {
              eventType: 'providers/cloud.pubsub/eventTypes/topic.publish',
              path: 'some/path',
              resource: 'projects/*/topics/my-test-topic',
            },
          },
        ],
      },
      'my-func3': {
        name: 'my-func3',
        handler: 'handler',
        events: [{ http: 'foo' }],
      },
    };
    serverless.service.provider = {
      project: 'my-project',
    };
    serverless.setProvider('google', new GoogleProvider(serverless));
    const options = {
      stage: 'dev',
      region: 'us-central1',
    };
    googleInfo = new GoogleInfo(serverless, options);
  });

  describe('#displayServiceInfo()', () => {
    let getResourcesStub;
    let gatherDataStub;
    let printInfoStub;

    beforeEach(() => {
      getResourcesStub = sinon.stub(googleInfo, 'getResources').returns(BbPromise.resolve());
      gatherDataStub = sinon.stub(googleInfo, 'gatherData').returns(BbPromise.resolve());
      printInfoStub = sinon.stub(googleInfo, 'printInfo').returns(BbPromise.resolve());
    });

    afterEach(() => {
      googleInfo.getResources.restore();
      googleInfo.gatherData.restore();
      googleInfo.printInfo.restore();
    });

    it('should run promise chain', () =>
      googleInfo.displayServiceInfo().then(() => {
        expect(getResourcesStub.calledOnce).toEqual(true);
        expect(gatherDataStub.calledAfter(getResourcesStub));
        expect(printInfoStub.calledAfter(gatherDataStub));
      }));
  });

  describe('#getResources()', () => {
    let requestStub;

    beforeEach(() => {
      requestStub = sinon.stub(googleInfo.provider, 'request').returns(BbPromise.resolve());
    });

    afterEach(() => {
      googleInfo.provider.request.restore();
    });

    it('should return a list with resources from the deployment', () =>
      googleInfo.getResources().then(() => {
        expect(
          requestStub.calledWithExactly('deploymentmanager', 'resources', 'list', {
            project: 'my-project',
            deployment: 'sls-my-service-dev',
          })
        ).toEqual(true);
      }));
  });

  describe('#gatherData()', () => {
    it('should gather the relevant resource data', () => {
      const resources = {
        resources: [
          { type: 'resource.which.should.be.filterered', name: 'someResource' },
          {
            type: 'gcp-types/cloudfunctions-v1:projects.locations.functions',
            name: 'my-service-dev-func1',
          },
          {
            type: 'gcp-types/cloudfunctions-v1:projects.locations.functions',
            name: 'my-service-dev-func2',
          },
        ],
      };

      const expectedData = {
        service: 'my-service',
        project: 'my-project',
        stage: 'dev',
        region: 'us-central1',
        resources: {
          functions: [
            {
              name: 'func1',
              resource: 'https://us-central1-my-project.cloudfunctions.net/my-service-dev-func1',
            },
            {
              name: 'func2',
              resource: 'projects/*/topics/my-test-topic',
            },
          ],
        },
      };

      return googleInfo.gatherData(resources).then((data) => {
        expect(data).toEqual(expectedData);
      });
    });

    it('should gather the resource data when the function name is specified', () => {
      const resources = {
        resources: [
          { type: 'resource.which.should.be.filterered', name: 'someResource' },
          {
            type: 'gcp-types/cloudfunctions-v1:projects.locations.functions',
            name: 'my-func3',
          },
        ],
      };

      const expectedData = {
        service: 'my-service',
        project: 'my-project',
        stage: 'dev',
        region: 'us-central1',
        resources: {
          functions: [
            {
              name: 'my-func3',
              resource: 'https://us-central1-my-project.cloudfunctions.net/my-func3',
            },
          ],
        },
      };

      return googleInfo.gatherData(resources).then((data) => {
        expect(data).toEqual(expectedData);
      });
    });

    it('should resolve with empty data if resource type is not matching', () => {
      const resources = {
        resources: [{ type: 'resource.which.should.be.filterered', name: 'someResource' }],
      };

      const expectedData = {
        service: 'my-service',
        project: 'my-project',
        stage: 'dev',
        region: 'us-central1',
        resources: {
          functions: [],
        },
      };

      return googleInfo.gatherData(resources).then((data) => {
        expect(data).toEqual(expectedData);
      });
    });
  });

  describe('#printInfo()', () => {
    let consoleLogStub;

    beforeEach(() => {
      consoleLogStub = sinon.stub(googleInfo.serverless.cli, 'consoleLog').returns();
    });

    afterEach(() => {
      googleInfo.serverless.cli.consoleLog.restore();
    });

    it('should print relevant data on the console', () => {
      const gatheredData = {
        service: 'my-service',
        project: 'my-project',
        stage: 'dev',
        region: 'us-central1',
        resources: {
          functions: [
            {
              name: 'func1',
              resource: 'https://us-central1-my-project.cloudfunctions.net/my-service-dev-func1',
            },
            {
              name: 'func2',
              resource: 'projects/*/topics/my-test-topic',
            },
          ],
        },
      };

      let expectedOutput = '';
      expectedOutput += `${chalk.yellow.underline('Service Information')}\n`;
      expectedOutput += `${chalk.yellow('service:')} my-service\n`;
      expectedOutput += `${chalk.yellow('project:')} my-project\n`;
      expectedOutput += `${chalk.yellow('stage:')} dev\n`;
      expectedOutput += `${chalk.yellow('region:')} us-central1\n`;

      expectedOutput += '\n';

      expectedOutput += `${chalk.yellow.underline('Deployed functions')}\n`;
      expectedOutput += `${chalk.yellow('func1')}\n`;
      expectedOutput +=
        '  https://us-central1-my-project.cloudfunctions.net/my-service-dev-func1\n';
      expectedOutput += `${chalk.yellow('func2')}\n`;
      expectedOutput += '  projects/*/topics/my-test-topic\n';

      return googleInfo.printInfo(gatheredData).then(() => {
        expect(consoleLogStub.calledWithExactly(expectedOutput)).toEqual(true);
      });
    });

    it('should print an info if functions are not yet deployed', () => {
      const gatheredData = {
        service: 'my-service',
        project: 'my-project',
        stage: 'dev',
        region: 'us-central1',
        resources: {
          functions: [],
        },
      };

      let expectedOutput = '';
      expectedOutput += `${chalk.yellow.underline('Service Information')}\n`;
      expectedOutput += `${chalk.yellow('service:')} my-service\n`;
      expectedOutput += `${chalk.yellow('project:')} my-project\n`;
      expectedOutput += `${chalk.yellow('stage:')} dev\n`;
      expectedOutput += `${chalk.yellow('region:')} us-central1\n`;

      expectedOutput += '\n';

      expectedOutput += `${chalk.yellow.underline('Deployed functions')}\n`;
      expectedOutput += 'There are no functions deployed yet\n';

      return googleInfo.printInfo(gatheredData).then(() => {
        expect(consoleLogStub.calledWithExactly(expectedOutput)).toEqual(true);
      });
    });
  });
});
