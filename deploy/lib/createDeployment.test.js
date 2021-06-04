'use strict';

const fs = require('fs');
const path = require('path');

const sinon = require('sinon');
const BbPromise = require('bluebird');

const GoogleProvider = require('../../provider/googleProvider');
const GoogleDeploy = require('../googleDeploy');
const Serverless = require('../../test/serverless');

describe('CreateDeployment', () => {
  let serverless;
  let googleDeploy;
  let requestStub;
  let configurationTemplateCreateFilePath;

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
    configurationTemplateCreateFilePath = path.join(
      serverless.config.servicePath,
      '.serverless',
      'configuration-template-create.yml'
    );
  });

  afterEach(() => {
    googleDeploy.provider.request.restore();
  });

  describe('#createDeployment()', () => {
    let checkForExistingDeploymentStub;
    let createIfNotExistsStub;

    beforeEach(() => {
      checkForExistingDeploymentStub = sinon
        .stub(googleDeploy, 'checkForExistingDeployment')
        .returns(BbPromise.resolve());
      createIfNotExistsStub = sinon
        .stub(googleDeploy, 'createIfNotExists')
        .returns(BbPromise.resolve());
    });

    afterEach(() => {
      googleDeploy.checkForExistingDeployment.restore();
      googleDeploy.createIfNotExists.restore();
    });

    it('should run promise chain', () =>
      googleDeploy.createDeployment().then(() => {
        expect(checkForExistingDeploymentStub.calledOnce).toEqual(true);
        expect(createIfNotExistsStub.calledAfter(checkForExistingDeploymentStub));
      }));
  });

  describe('#checkForExistingDeployment()', () => {
    it('should return "undefined" if no deployments are found', () => {
      requestStub.returns(BbPromise.resolve([]));

      return googleDeploy.checkForExistingDeployment().then((foundDeployment) => {
        expect(foundDeployment).toEqual(undefined);
        expect(
          requestStub.calledWithExactly('deploymentmanager', 'deployments', 'list', {
            project: 'my-project',
          })
        ).toEqual(true);
      });
    });

    it('should return "undefined" if deployments do not contain deployment', () => {
      const response = {
        deployments: [{ name: 'some-other-deployment' }],
      };
      requestStub.returns(BbPromise.resolve(response));

      return googleDeploy.checkForExistingDeployment().then((foundDeployment) => {
        expect(foundDeployment).toEqual(undefined);
        expect(
          requestStub.calledWithExactly('deploymentmanager', 'deployments', 'list', {
            project: 'my-project',
          })
        ).toEqual(true);
      });
    });

    it('should find the existing deployment', () => {
      const response = {
        deployments: [{ name: 'sls-my-service-dev' }, { name: 'some-other-deployment' }],
      };
      requestStub.returns(BbPromise.resolve(response));

      return googleDeploy.checkForExistingDeployment().then((foundDeployment) => {
        expect(foundDeployment).toEqual(response.deployments[0]);
        expect(
          requestStub.calledWithExactly('deploymentmanager', 'deployments', 'list', {
            project: 'my-project',
          })
        ).toEqual(true);
      });
    });
  });

  describe('#createIfNotExists()', () => {
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

    it('should resolve if there is no existing deployment', () => {
      const foundDeployment = true;

      return googleDeploy.createIfNotExists(foundDeployment).then(() => {
        expect(consoleLogStub.calledOnce).toEqual(false);
        expect(readFileSyncStub.called).toEqual(false);
      });
    });

    it('should create and hand over to monitor the deployment if it does not exist', () => {
      const foundDeployment = false;
      const params = {
        project: 'my-project',
        resource: {
          name: 'sls-my-service-dev',
          target: {
            config: {
              content: fs.readFileSync(configurationTemplateCreateFilePath).toString(),
            },
          },
        },
      };
      requestStub.returns(BbPromise.resolve());

      return googleDeploy.createIfNotExists(foundDeployment).then(() => {
        expect(consoleLogStub.calledOnce).toEqual(true);
        expect(readFileSyncStub.called).toEqual(true);
        expect(
          requestStub.calledWithExactly('deploymentmanager', 'deployments', 'insert', params)
        ).toEqual(true);
        expect(
          monitorDeploymentStub.calledWithExactly('sls-my-service-dev', 'create', 5000)
        ).toEqual(true);
      });
    });
  });
});
