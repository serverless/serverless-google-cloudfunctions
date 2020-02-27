'use strict';

const path = require('path');

const sinon = require('sinon');

const GoogleProvider = require('../../provider/googleProvider');
const GooglePackage = require('../googlePackage');
const Serverless = require('../../test/serverless');

describe('WriteFilesToDisk', () => {
  let serverless;
  let googlePackage;
  let writeFileSyncStub;

  beforeEach(() => {
    serverless = new Serverless();
    serverless.service.service = 'my-service';
    serverless.service.provider = {
      compiledConfigurationTemplate: {
        foo: 'bar',
      },
    };
    serverless.config = {
      servicePath: 'foo/my-service',
    };
    serverless.setProvider('google', new GoogleProvider(serverless));
    const options = {
      stage: 'dev',
      region: 'us-central1',
    };
    googlePackage = new GooglePackage(serverless, options);
    writeFileSyncStub = sinon.stub(googlePackage.serverless.utils, 'writeFileSync');
  });

  afterEach(() => {
    googlePackage.serverless.utils.writeFileSync.restore();
  });

  describe('#saveCreateTemplateFile()', () => {
    it('should write the template file into the services .serverless directory', () => {
      const createFilePath = path.join(
        googlePackage.serverless.config.servicePath,
        '.serverless',
        'configuration-template-create.yml'
      );

      return googlePackage.saveCreateTemplateFile().then(() => {
        expect(
          writeFileSyncStub.calledWithExactly(
            createFilePath,
            googlePackage.serverless.service.provider.compiledConfigurationTemplate
          )
        ).toEqual(true);
      });
    });
  });

  describe('#saveUpdateTemplateFile()', () => {
    it('should write the template file into the services .serverless directory', () => {
      const updateFilePath = path.join(
        googlePackage.serverless.config.servicePath,
        '.serverless',
        'configuration-template-update.yml'
      );

      return googlePackage.saveUpdateTemplateFile().then(() => {
        expect(
          writeFileSyncStub.calledWithExactly(
            updateFilePath,
            googlePackage.serverless.service.provider.compiledConfigurationTemplate
          )
        ).toEqual(true);
      });
    });
  });
});
