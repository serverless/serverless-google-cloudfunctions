'use strict';

const sinon = require('sinon');

const GoogleProvider = require('../provider/googleProvider');
const GoogleInvokeLocal = require('./googleInvokeLocal');
const Serverless = require('../test/serverless');

describe('GoogleInvokeLocal', () => {
  let serverless;
  const functionName = 'myFunction';
  const rawOptions = {
    f: functionName,
  };
  const processedOptions = {
    function: functionName,
  };
  let googleInvokeLocal;

  beforeAll(() => {
    serverless = new Serverless();
    serverless.setProvider('google', new GoogleProvider(serverless));
    googleInvokeLocal = new GoogleInvokeLocal(serverless, rawOptions);
    serverless.processedInput.options = processedOptions;
  });

  describe('#constructor()', () => {
    it('should set the serverless instance', () => {
      expect(googleInvokeLocal.serverless).toEqual(serverless);
    });

    it('should set the raw options if provided', () => {
      expect(googleInvokeLocal.options).toEqual(rawOptions);
    });

    it('should make the provider accessible', () => {
      expect(googleInvokeLocal.provider).toBeInstanceOf(GoogleProvider);
    });

    it.each`
      method
      ${'validate'}
      ${'setDefaults'}
      ${'getDataAndContext'}
      ${'invokeLocalNodeJs'}
      ${'loadFileInOption'}
      ${'validateEventsProperty'}
      ${'addEnvironmentVariablesToProcessEnv'}
    `('should declare $method method', ({ method }) => {
      expect(googleInvokeLocal[method]).toBeDefined();
    });

    describe('hooks', () => {
      let validateStub;
      let setDefaultsStub;
      let getDataAndContextStub;
      let invokeLocalStub;

      beforeAll(() => {
        validateStub = sinon.stub(googleInvokeLocal, 'validate').resolves();
        setDefaultsStub = sinon.stub(googleInvokeLocal, 'setDefaults').resolves();
        getDataAndContextStub = sinon.stub(googleInvokeLocal, 'getDataAndContext').resolves();
        invokeLocalStub = sinon.stub(googleInvokeLocal, 'invokeLocal').resolves();
      });

      afterEach(() => {
        googleInvokeLocal.validate.resetHistory();
        googleInvokeLocal.setDefaults.resetHistory();
        googleInvokeLocal.getDataAndContext.resetHistory();
        googleInvokeLocal.invokeLocal.resetHistory();
      });

      afterAll(() => {
        googleInvokeLocal.validate.restore();
        googleInvokeLocal.setDefaults.restore();
        googleInvokeLocal.getDataAndContext.restore();
        googleInvokeLocal.invokeLocal.restore();
      });

      it.each`
        hook
        ${'initialize'}
        ${'before:invoke:local:invoke'}
        ${'invoke:local:invoke'}
      `('should declare $hook hook', ({ hook }) => {
        expect(googleInvokeLocal.hooks[hook]).toBeDefined();
      });

      describe('initialize hook', () => {
        it('should override raw options with processed options', () => {
          googleInvokeLocal.hooks.initialize();
          expect(googleInvokeLocal.options).toEqual(processedOptions);
        });
      });

      describe('before:invoke:local:invoke hook', () => {
        it('should validate the configuration', async () => {
          await googleInvokeLocal.hooks['before:invoke:local:invoke']();
          expect(validateStub.calledOnce).toEqual(true);
        });

        it('should set the defaults values', async () => {
          await googleInvokeLocal.hooks['before:invoke:local:invoke']();
          expect(setDefaultsStub.calledOnce).toEqual(true);
        });

        it('should resolve the data and the context of the invocation', async () => {
          await googleInvokeLocal.hooks['before:invoke:local:invoke']();
          expect(getDataAndContextStub.calledOnce).toEqual(true);
        });
      });

      describe('invoke:local:invoke hook', () => {
        it('should invoke the function locally', () => {
          googleInvokeLocal.hooks['invoke:local:invoke']();
          expect(invokeLocalStub.calledOnce).toEqual(true);
        });
      });
    });
  });

  describe('#invokeLocal()', () => {
    const functionObj = Symbol('functionObj');
    const data = Symbol('data');
    const context = Symbol('context');
    const runtime = 'nodejs14';
    let getFunctionStub;
    let validateEventsPropertyStub;
    let getRuntimeStub;
    let invokeLocalNodeJsStub;

    beforeAll(() => {
      googleInvokeLocal.options = {
        ...processedOptions, // invokeLocal is called after the initialize hook which override the options
        data, // data and context are populated by getDataAndContext in before:invoke:local:invoke hook
        context,
      };
      getFunctionStub = sinon.stub(serverless.service, 'getFunction').returns(functionObj);
      validateEventsPropertyStub = sinon
        .stub(googleInvokeLocal, 'validateEventsProperty')
        .returns();
      getRuntimeStub = sinon.stub(googleInvokeLocal.provider, 'getRuntime').returns(runtime);

      invokeLocalNodeJsStub = sinon.stub(googleInvokeLocal, 'invokeLocalNodeJs').resolves();
    });

    afterEach(() => {
      serverless.service.getFunction.resetHistory();
      googleInvokeLocal.validateEventsProperty.resetHistory();
      googleInvokeLocal.provider.getRuntime.resetHistory();
      googleInvokeLocal.invokeLocalNodeJs.resetHistory();
    });

    afterAll(() => {
      serverless.service.getFunction.restore();
      googleInvokeLocal.validateEventsProperty.restore();
      googleInvokeLocal.provider.getRuntime.restore();
      googleInvokeLocal.invokeLocalNodeJs.restore();
    });

    it('should get the function configuration', async () => {
      await googleInvokeLocal.invokeLocal();
      expect(getFunctionStub.calledOnceWith(functionName)).toEqual(true);
    });

    it('should validate the function configuration', async () => {
      await googleInvokeLocal.invokeLocal();
      expect(validateEventsPropertyStub.calledOnceWith(functionObj, functionName)).toEqual(true);
    });

    it('should get the runtime', async () => {
      await googleInvokeLocal.invokeLocal();
      expect(getRuntimeStub.calledOnceWith(functionObj)).toEqual(true);
    });

    it('should invoke locally the function with node js', async () => {
      await googleInvokeLocal.invokeLocal();
      expect(invokeLocalNodeJsStub.calledOnceWith(functionObj, data, context)).toEqual(true);
    });

    it('should throw if the runtime is not node js', async () => {
      getRuntimeStub.returns('python3');
      await expect(googleInvokeLocal.invokeLocal()).rejects.toThrow(
        'Local invocation with runtime python3 is not supported'
      );
    });
  });
});
