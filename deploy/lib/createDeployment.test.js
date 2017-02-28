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
      'configuration-template-create.yml',
    );
  });

  afterEach(() => {
    googleDeploy.provider.request.restore();
  });

  describe('#createDeployment()', () => {
    let writeCreateTemplateToDiskStub;
    let checkForExistingDeploymentStub;
    let createIfNotExistsStub;

    beforeEach(() => {
      writeCreateTemplateToDiskStub = sinon.stub(googleDeploy, 'writeCreateTemplateToDisk')
        .returns(BbPromise.resolve());
      checkForExistingDeploymentStub = sinon.stub(googleDeploy, 'checkForExistingDeployment')
        .returns(BbPromise.resolve());
      createIfNotExistsStub = sinon.stub(googleDeploy, 'createIfNotExists')
        .returns(BbPromise.resolve());
    });

    afterEach(() => {
      googleDeploy.writeCreateTemplateToDisk.restore();
      googleDeploy.checkForExistingDeployment.restore();
      googleDeploy.createIfNotExists.restore();
    });

    it('should run promise chain', () => googleDeploy
      .createDeployment().then(() => {
        expect(writeCreateTemplateToDiskStub.calledOnce).toEqual(true);
        expect(checkForExistingDeploymentStub.calledAfter(writeCreateTemplateToDiskStub));
        expect(createIfNotExistsStub.calledAfter(checkForExistingDeploymentStub));
      }),
    );
  });

  describe('#checkForExistingDeployment()', () => {
    it('should return "false" if no deployments are found', () => {
      requestStub.returns(BbPromise.resolve([]));

      return googleDeploy.checkForExistingDeployment().then((found) => {
        expect(found).toEqual(false);
        expect(requestStub.calledWithExactly(
          'deploymentmanager',
          'deployments',
          'list',
          { project: 'my-project' },
        )).toEqual(true);
      });
    });

    it('should return "false" if deployments do not contain deployment', () => {
      const response = {
        deployments: [
          { name: 'some-other-deployment' },
        ],
      };
      requestStub.returns(BbPromise.resolve(response));

      return googleDeploy.checkForExistingDeployment().then((found) => {
        expect(found).toEqual(false);
        expect(requestStub.calledWithExactly(
          'deploymentmanager',
          'deployments',
          'list',
          { project: 'my-project' },
        )).toEqual(true);
      });
    });

    it('should find the existing deployment', () => {
      const response = {
        deployments: [
          { name: 'sls-my-service-dev' },
          { name: 'some-other-deployment' },
        ],
      };
      requestStub.returns(BbPromise.resolve(response));

      return googleDeploy.checkForExistingDeployment().then((found) => {
        expect(found).toEqual(true);
        expect(requestStub.calledWithExactly(
          'deploymentmanager',
          'deployments',
          'list',
          { project: 'my-project' },
        )).toEqual(true);
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
      monitorDeploymentStub = sinon.stub(googleDeploy, 'monitorDeployment')
        .returns(BbPromise.resolve());
    });

    afterEach(() => {
      googleDeploy.serverless.cli.log.restore();
      fs.readFileSync.restore();
      googleDeploy.monitorDeployment.restore();
    });

    it('should resolve if there is no existing deployment', () => {
      const deploymentFound = true;

      return googleDeploy.createIfNotExists(deploymentFound).then(() => {
        expect(consoleLogStub.calledOnce).toEqual(false);
        expect(readFileSyncStub.called).toEqual(false);
      });
    });

    it('should create and hand over to monitor the deployment if it does not exist', () => {
      const deploymentFound = false;
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

      return googleDeploy.createIfNotExists(deploymentFound).then(() => {
        expect(consoleLogStub.calledOnce).toEqual(true);
        expect(readFileSyncStub.called).toEqual(true);
        expect(requestStub.calledWithExactly(
          'deploymentmanager',
          'deployments',
          'insert',
          params,
        )).toEqual(true);
        expect(monitorDeploymentStub.calledWithExactly(
          'sls-my-service-dev',
          'create',
          5000,
        )).toEqual(true);
      });
    });
  });

  describe('#writeCreateTemplateToDisk()', () => {
    let writeFileSyncStub;

    beforeEach(() => {
      writeFileSyncStub = sinon.stub(serverless.utils, 'writeFileSync');
    });

    afterEach(() => {
      serverless.utils.writeFileSync.restore();
    });

    it('should write the create deployment template to disk', () => {
      const compiledConfiguration = {
        compiledConfigurationTemplate: {
          resources: [
            { someResource: 'foo' },
          ],
        },
      };
      serverless.service.provider = {
        compiledConfigurationTemplate: compiledConfiguration,
      };

      return googleDeploy.writeCreateTemplateToDisk().then(() => {
        expect(writeFileSyncStub.calledWithExactly(
          configurationTemplateCreateFilePath,
          compiledConfiguration,
        )).toEqual(true);
      });
    });
  });
});
