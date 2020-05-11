'use strict';

const fs = require('fs');
const path = require('path');

const sinon = require('sinon');
const BbPromise = require('bluebird');

const GoogleProvider = require('../../provider/googleProvider');
const GoogleDeploy = require('../googleDeploy');
const Serverless = require('../../test/serverless');

describe('UpdateDeployment', () => {
  let serverless;
  let googleDeploy;
  let requestStub;
  let configurationTemplateUpdateFilePath;

  beforeEach(() => {
    serverless = new Serverless();
    serverless.service.service = 'my-service';
    serverless.service.provider = {
      project: 'my-project',
    };
    serverless.config = {
      servicePath: 'tmp',
    };
    serverless.setProvider('google', new GoogleProvider(serverless));
    const options = {
      stage: 'dev',
      region: 'us-central1',
    };
    googleDeploy = new GoogleDeploy(serverless, options);
    requestStub = sinon.stub(googleDeploy.provider, 'request');
    configurationTemplateUpdateFilePath = path.join(
      serverless.config.servicePath,
      '.serverless',
      'configuration-template-update.yml'
    );
  });

  afterEach(() => {
    googleDeploy.provider.request.restore();
  });

  describe('#updateDeployment()', () => {
    let getDeploymentStub;
    let updateStub;

    beforeEach(() => {
      getDeploymentStub = sinon.stub(googleDeploy, 'getDeployment').returns(BbPromise.resolve());
      updateStub = sinon.stub(googleDeploy, 'update').returns(BbPromise.resolve());
    });

    afterEach(() => {
      googleDeploy.getDeployment.restore();
      googleDeploy.update.restore();
    });

    it('should run promise chain', () =>
      googleDeploy.updateDeployment().then(() => {
        expect(getDeploymentStub.calledOnce).toEqual(true);
        expect(updateStub.calledAfter(getDeploymentStub));
      }));
  });

  describe('#getDeployment()', () => {
    it('should return undefined if no deployments are found', () => {
      const response = {
        deployments: [{ name: 'some-other-deployment' }],
      };
      requestStub.returns(BbPromise.resolve(response));

      return googleDeploy.getDeployment().then((foundDeployment) => {
        expect(foundDeployment).toEqual(undefined);
        expect(
          requestStub.calledWithExactly('deploymentmanager', 'deployments', 'list', {
            project: 'my-project',
          })
        ).toEqual(true);
      });
    });

    it('should return the deployment if found', () => {
      const response = {
        deployments: [{ name: 'sls-my-service-dev' }, { name: 'some-other-deployment' }],
      };
      requestStub.returns(BbPromise.resolve(response));

      return googleDeploy.getDeployment().then((foundDeployment) => {
        expect(foundDeployment).toEqual(response.deployments[0]);
        expect(
          requestStub.calledWithExactly('deploymentmanager', 'deployments', 'list', {
            project: 'my-project',
          })
        ).toEqual(true);
      });
    });
  });

  describe('#update()', () => {
    let consoleLogStub;
    let readFileSyncStub;
    let monitorDeploymentStub;

    beforeEach(() => {
      consoleLogStub = sinon.stub(googleDeploy.serverless.cli, 'log').returns();
      readFileSyncStub = sinon.stub(fs, 'readFileSync').returns('some content');
      monitorDeploymentStub = sinon
        .stub(googleDeploy, 'monitorDeployment')
        .returns(BbPromise.resolve());
    });

    afterEach(() => {
      googleDeploy.serverless.cli.log.restore();
      fs.readFileSync.restore();
      googleDeploy.monitorDeployment.restore();
    });

    it('should update and hand over to monitor the deployment if it exists', () => {
      const deployment = {
        name: 'sls-my-service-dev',
        fingerprint: '12345678',
      };
      const params = {
        project: 'my-project',
        deployment: 'sls-my-service-dev',
        resource: {
          name: 'sls-my-service-dev',
          fingerprint: deployment.fingerprint,
          target: {
            config: {
              content: fs.readFileSync(configurationTemplateUpdateFilePath).toString(),
            },
          },
        },
      };
      requestStub.returns(BbPromise.resolve());

      return googleDeploy.update(deployment).then(() => {
        expect(consoleLogStub.calledOnce).toEqual(true);
        expect(readFileSyncStub.called).toEqual(true);
        expect(
          requestStub.calledWithExactly('deploymentmanager', 'deployments', 'update', params)
        ).toEqual(true);
        expect(
          monitorDeploymentStub.calledWithExactly('sls-my-service-dev', 'update', 5000)
        ).toEqual(true);
      });
    });
  });
});
