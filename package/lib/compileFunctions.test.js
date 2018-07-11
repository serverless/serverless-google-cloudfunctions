'use strict';

const sinon = require('sinon');

const GoogleProvider = require('../../provider/googleProvider');
const GooglePackage = require('../googlePackage');
const Serverless = require('../../test/serverless');

describe('CompileFunctions', () => {
  let serverless;
  let googlePackage;
  let consoleLogStub;

  beforeEach(() => {
    serverless = new Serverless();
    serverless.service.service = 'my-service';
    serverless.service.package = {
      artifact: 'artifact.zip',
      artifactDirectoryName: 'some-path',
    };
    serverless.service.provider = {
      compiledConfigurationTemplate: {
        resources: [],
      },
      deploymentBucketName: 'sls-my-service-dev-12345678',
    };
    serverless.setProvider('google', new GoogleProvider(serverless));
    const options = {
      stage: 'dev',
      region: 'us-central1',
    };
    googlePackage = new GooglePackage(serverless, options);
    consoleLogStub = sinon.stub(googlePackage.serverless.cli, 'log').returns();
  });

  afterEach(() => {
    googlePackage.serverless.cli.log.restore();
  });

  describe('#compileFunctions()', () => {
    it('should throw an error if the function has no handler property', () => {
      googlePackage.serverless.service.functions = {
        func1: {
          handler: null,
        },
      };

      expect(() => googlePackage.compileFunctions()).toThrow(Error);
    });

    it('should throw an error if the function has no events property', () => {
      googlePackage.serverless.service.functions = {
        func1: {
          handler: 'func1',
          events: null,
        },
      };

      expect(() => googlePackage.compileFunctions()).toThrow(Error);
    });

    it('should throw an error if the function has 0 events', () => {
      googlePackage.serverless.service.functions = {
        func1: {
          handler: 'func1',
          events: [],
        },
      };

      expect(() => googlePackage.compileFunctions()).toThrow(Error);
    });

    it('should throw an error if the function has more than 1 event', () => {
      googlePackage.serverless.service.functions = {
        func1: {
          handler: 'func1',
          events: [
            { http: 'event1' },
            { http: 'event2' },
          ],
        },
      };

      expect(() => googlePackage.compileFunctions()).toThrow(Error);
    });

    it('should throw an error if the functions event is not supported', () => {
      googlePackage.serverless.service.functions = {
        func1: {
          handler: 'func1',
          events: [
            { invalidEvent: 'event1' },
          ],
        },
      };

      expect(() => googlePackage.compileFunctions()).toThrow(Error);
    });

    it('should set the memory size based on the functions configuration', () => {
      googlePackage.serverless.service.functions = {
        func1: {
          handler: 'func1',
          memorySize: 1024,
          events: [
            { http: 'foo' },
          ],
        },
      };

      const compiledResources = [{
        type: 'cloudfunctions.v1beta2.function',
        name: 'my-service-dev-func1',
        properties: {
          location: 'us-central1',
          entryPoint: 'func1',
          function: 'func1',
          availableMemoryMb: 1024,
          timeout: '60s',
          sourceArchiveUrl: 'gs://sls-my-service-dev-12345678/some-path/artifact.zip',
          httpsTrigger: {
            url: 'foo',
          },
          labels: {},
        },
      }];

      return googlePackage.compileFunctions().then(() => {
        expect(consoleLogStub.calledOnce).toEqual(true);
        expect(googlePackage.serverless.service.provider.compiledConfigurationTemplate.resources)
          .toEqual(compiledResources);
      });
    });

    it('should set the memory size based on the provider configuration', () => {
      googlePackage.serverless.service.functions = {
        func1: {
          handler: 'func1',
          events: [
            { http: 'foo' },
          ],
        },
      };
      googlePackage.serverless.service.provider.memorySize = 1024;

      const compiledResources = [{
        type: 'cloudfunctions.v1beta2.function',
        name: 'my-service-dev-func1',
        properties: {
          location: 'us-central1',
          entryPoint: 'func1',
          function: 'func1',
          availableMemoryMb: 1024,
          timeout: '60s',
          sourceArchiveUrl: 'gs://sls-my-service-dev-12345678/some-path/artifact.zip',
          httpsTrigger: {
            url: 'foo',
          },
          labels: {},
        },
      }];

      return googlePackage.compileFunctions().then(() => {
        expect(consoleLogStub.calledOnce).toEqual(true);
        expect(googlePackage.serverless.service.provider.compiledConfigurationTemplate.resources)
          .toEqual(compiledResources);
      });
    });

    it('should set the timout based on the functions configuration', () => {
      googlePackage.serverless.service.functions = {
        func1: {
          handler: 'func1',
          timeout: '120s',
          events: [
            { http: 'foo' },
          ],
        },
      };

      const compiledResources = [{
        type: 'cloudfunctions.v1beta2.function',
        name: 'my-service-dev-func1',
        properties: {
          location: 'us-central1',
          entryPoint: 'func1',
          function: 'func1',
          availableMemoryMb: 256,
          timeout: '120s',
          sourceArchiveUrl: 'gs://sls-my-service-dev-12345678/some-path/artifact.zip',
          httpsTrigger: {
            url: 'foo',
          },
          labels: {},
        },
      }];

      return googlePackage.compileFunctions().then(() => {
        expect(consoleLogStub.calledOnce).toEqual(true);
        expect(googlePackage.serverless.service.provider.compiledConfigurationTemplate.resources)
          .toEqual(compiledResources);
      });
    });

    it('should set the timeout based on the provider configuration', () => {
      googlePackage.serverless.service.functions = {
        func1: {
          handler: 'func1',
          events: [
            { http: 'foo' },
          ],
        },
      };
      googlePackage.serverless.service.provider.timeout = '120s';

      const compiledResources = [{
        type: 'cloudfunctions.v1beta2.function',
        name: 'my-service-dev-func1',
        properties: {
          location: 'us-central1',
          entryPoint: 'func1',
          function: 'func1',
          availableMemoryMb: 256,
          timeout: '120s',
          sourceArchiveUrl: 'gs://sls-my-service-dev-12345678/some-path/artifact.zip',
          httpsTrigger: {
            url: 'foo',
          },
          labels: {},
        },
      }];

      return googlePackage.compileFunctions().then(() => {
        expect(consoleLogStub.calledOnce).toEqual(true);
        expect(googlePackage.serverless.service.provider.compiledConfigurationTemplate.resources)
          .toEqual(compiledResources);
      });
    });

    it('should set the labels based on the functions configuration', () => {
      googlePackage.serverless.service.functions = {
        func1: {
          handler: 'func1',
          labels: {
            test: 'label',
          },
          events: [
            { http: 'foo' },
          ],
        },
      };

      const compiledResources = [{
        type: 'cloudfunctions.v1beta2.function',
        name: 'my-service-dev-func1',
        properties: {
          location: 'us-central1',
          entryPoint: 'func1',
          function: 'func1',
          availableMemoryMb: 256,
          timeout: '60s',
          sourceArchiveUrl: 'gs://sls-my-service-dev-12345678/some-path/artifact.zip',
          httpsTrigger: {
            url: 'foo',
          },
          labels: {
            test: 'label',
          },
        },
      }];

      return googlePackage.compileFunctions().then(() => {
        expect(consoleLogStub.calledOnce).toEqual(true);
        expect(googlePackage.serverless.service.provider.compiledConfigurationTemplate.resources)
          .toEqual(compiledResources);
      });
    });

    it('should set the labels based on the provider configuration', () => {
      googlePackage.serverless.service.functions = {
        func1: {
          handler: 'func1',
          events: [
            { http: 'foo' },
          ],
        },
      };
      googlePackage.serverless.service.provider.labels = {
        test: 'label',
      };

      const compiledResources = [{
        type: 'cloudfunctions.v1beta2.function',
        name: 'my-service-dev-func1',
        properties: {
          location: 'us-central1',
          entryPoint: 'func1',
          function: 'func1',
          availableMemoryMb: 256,
          timeout: '60s',
          sourceArchiveUrl: 'gs://sls-my-service-dev-12345678/some-path/artifact.zip',
          httpsTrigger: {
            url: 'foo',
          },
          labels: {
            test: 'label',
          },
        },
      }];

      return googlePackage.compileFunctions().then(() => {
        expect(consoleLogStub.calledOnce).toEqual(true);
        expect(googlePackage.serverless.service.provider.compiledConfigurationTemplate.resources)
          .toEqual(compiledResources);
      });
    });

    it('should set the labels based on the merged provider and function configuration', () => {
      googlePackage.serverless.service.functions = {
        func1: {
          handler: 'func1',
          events: [
            { http: 'foo' },
          ],
          labels: {
            test: 'functionLabel',
          },
        },
      };
      googlePackage.serverless.service.provider.labels = {
        test: 'providerLabel',
        secondTest: 'tested',
      };

      const compiledResources = [{
        type: 'cloudfunctions.v1beta2.function',
        name: 'my-service-dev-func1',
        properties: {
          location: 'us-central1',
          entryPoint: 'func1',
          function: 'func1',
          availableMemoryMb: 256,
          timeout: '60s',
          sourceArchiveUrl: 'gs://sls-my-service-dev-12345678/some-path/artifact.zip',
          httpsTrigger: {
            url: 'foo',
          },
          labels: {
            test: 'functionLabel',
            secondTest: 'tested',
          },
        },
      }];

      return googlePackage.compileFunctions().then(() => {
        expect(consoleLogStub.calledOnce).toEqual(true);
        expect(googlePackage.serverless.service.provider.compiledConfigurationTemplate.resources)
          .toEqual(compiledResources);
      });
    });

    it('should compile "http" events properly', () => {
      googlePackage.serverless.service.functions = {
        func1: {
          handler: 'func1',
          events: [
            { http: 'foo' },
          ],
        },
      };

      const compiledResources = [{
        type: 'cloudfunctions.v1beta2.function',
        name: 'my-service-dev-func1',
        properties: {
          location: 'us-central1',
          entryPoint: 'func1',
          function: 'func1',
          availableMemoryMb: 256,
          timeout: '60s',
          sourceArchiveUrl: 'gs://sls-my-service-dev-12345678/some-path/artifact.zip',
          httpsTrigger: {
            url: 'foo',
          },
          labels: {},
        },
      }];

      return googlePackage.compileFunctions().then(() => {
        expect(consoleLogStub.calledOnce).toEqual(true);
        expect(googlePackage.serverless.service.provider.compiledConfigurationTemplate.resources)
          .toEqual(compiledResources);
      });
    });

    it('should compile "event" events properly', () => {
      googlePackage.serverless.service.functions = {
        func1: {
          handler: 'func1',
          events: [
            {
              event: {
                eventType: 'foo',
                path: 'some-path',
                resource: 'some-resource',
              },
            },
          ],
        },
        func2: {
          handler: 'func2',
          events: [
            {
              event: {
                eventType: 'foo',
                resource: 'some-resource',
              },
            },
          ],
        },
      };

      const compiledResources = [
        {
          type: 'cloudfunctions.v1beta2.function',
          name: 'my-service-dev-func1',
          properties: {
            location: 'us-central1',
            entryPoint: 'func1',
            function: 'func1',
            availableMemoryMb: 256,
            timeout: '60s',
            sourceArchiveUrl: 'gs://sls-my-service-dev-12345678/some-path/artifact.zip',
            eventTrigger: {
              eventType: 'foo',
              path: 'some-path',
              resource: 'some-resource',
            },
            labels: {},
          },
        },
        {
          type: 'cloudfunctions.v1beta2.function',
          name: 'my-service-dev-func2',
          properties: {
            location: 'us-central1',
            entryPoint: 'func2',
            function: 'func2',
            availableMemoryMb: 256,
            timeout: '60s',
            sourceArchiveUrl: 'gs://sls-my-service-dev-12345678/some-path/artifact.zip',
            eventTrigger: {
              eventType: 'foo',
              resource: 'some-resource',
            },
            labels: {},
          },
        },
      ];

      return googlePackage.compileFunctions().then(() => {
        expect(consoleLogStub.called).toEqual(true);
        expect(googlePackage.serverless.service.provider.compiledConfigurationTemplate.resources)
          .toEqual(compiledResources);
      });
    });

    it('should set stage in function name with prependStage', () => {
      googlePackage.serverless.service.functions = {
        func1: {
          handler: 'func1',
          prependStage: true,
          events: [
            { http: 'foo' },
          ],
        },
      };

      const compiledResources = [{
        type: 'cloudfunctions.v1beta2.function',
        name: 'my-service-dev-func1',
        properties: {
          location: 'us-central1',
          entryPoint: 'func1',
          function: 'dev-func1',
          availableMemoryMb: 256,
          timeout: '60s',
          sourceArchiveUrl: 'gs://sls-my-service-dev-12345678/some-path/artifact.zip',
          httpsTrigger: {
            url: 'foo',
          },
          labels: {},
        },
      }];

      return googlePackage.compileFunctions().then(() => {
        expect(consoleLogStub.calledOnce).toEqual(true);
        expect(googlePackage.serverless.service.provider.compiledConfigurationTemplate.resources)
          .toEqual(compiledResources);
      });
    });

    it('should set service in function name with prependService', () => {
      googlePackage.serverless.service.functions = {
        func1: {
          handler: 'func1',
          prependService: true,
          events: [
            { http: 'foo' },
          ],
        },
      };

      const compiledResources = [{
        type: 'cloudfunctions.v1beta2.function',
        name: 'my-service-dev-func1',
        properties: {
          location: 'us-central1',
          entryPoint: 'func1',
          function: 'my-service-func1',
          availableMemoryMb: 256,
          timeout: '60s',
          sourceArchiveUrl: 'gs://sls-my-service-dev-12345678/some-path/artifact.zip',
          httpsTrigger: {
            url: 'foo',
          },
          labels: {},
        },
      }];

      return googlePackage.compileFunctions().then(() => {
        expect(consoleLogStub.calledOnce).toEqual(true);
        expect(googlePackage.serverless.service.provider.compiledConfigurationTemplate.resources)
          .toEqual(compiledResources);
      });
    });

    it('should set service and stage in function name with prependService and prependStage', () => {
      googlePackage.serverless.service.functions = {
        func1: {
          handler: 'func1',
          prependStage: true,
          prependService: true,
          events: [
            { http: 'foo' },
          ],
        },
      };

      const compiledResources = [{
        type: 'cloudfunctions.v1beta2.function',
        name: 'my-service-dev-func1',
        properties: {
          location: 'us-central1',
          entryPoint: 'func1',
          function: 'my-service-dev-func1',
          availableMemoryMb: 256,
          timeout: '60s',
          sourceArchiveUrl: 'gs://sls-my-service-dev-12345678/some-path/artifact.zip',
          httpsTrigger: {
            url: 'foo',
          },
          labels: {},
        },
      }];

      return googlePackage.compileFunctions().then(() => {
        expect(consoleLogStub.calledOnce).toEqual(true);
        expect(googlePackage.serverless.service.provider.compiledConfigurationTemplate.resources)
          .toEqual(compiledResources);
      });
    });
  });
});
