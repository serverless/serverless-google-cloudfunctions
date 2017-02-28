const sinon = require('sinon');

const GoogleProvider = require('../../provider/googleProvider');
const GoogleDeploy = require('../googleDeploy');
const Serverless = require('../../test/serverless');

describe('PrepareDeployment', () => {
  let coreResources;
  let serverless;
  let googleDeploy;

  beforeEach(() => {
    coreResources = {
      resources: [
        {
          type: 'storage.v1.bucket',
          name: 'will-be-replaced-by-serverless',
        },
      ],
    };
    serverless = new Serverless();
    serverless.service.service = 'my-service';
    serverless.service.provider = {
      compiledConfigurationTemplate: coreResources,
    };
    serverless.setProvider('google', new GoogleProvider(serverless));
    const options = {
      stage: 'dev',
      region: 'us-central1',
    };
    googleDeploy = new GoogleDeploy(serverless, options);
  });

  describe('#prepareDeployment()', () => {
    let readFileSyncStub;

    beforeEach(() => {
      readFileSyncStub = sinon.stub(serverless.utils, 'readFileSync').returns(coreResources);
    });

    afterEach(() => {
      serverless.utils.readFileSync.restore();
    });

    it('should load the core configuration template into the serverless instance', () => {
      const expectedCompiledConfiguration = {
        resources: [
          {
            type: 'storage.v1.bucket',
            name: 'sls-my-service-dev',
          },
        ],
      };

      return googleDeploy.prepareDeployment().then(() => {
        expect(readFileSyncStub.calledOnce).toEqual(true);
        expect(serverless.service.provider
          .compiledConfigurationTemplate).toEqual(expectedCompiledConfiguration);
      });
    });
  });
});
