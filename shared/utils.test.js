'use strict';

const setDefaults = require('./utils');
const GoogleProvider = require('../provider/googleProvider');
const Serverless = require('../test/serverless');
const GoogleCommand = require('../test/googleCommand');

describe('Utils', () => {
  let serverless;
  let googleCommand;

  beforeEach(() => {
    serverless = new Serverless();
    serverless.setProvider('google', new GoogleProvider(serverless));
    googleCommand = new GoogleCommand(serverless, {}, setDefaults);
    // mocking the standard value passed in from Serverless here
    googleCommand.serverless.service.provider = {
      region: 'us-east-1',
    };
  });

  describe('#setDefaults()', () => {
    it('should set default values for options if not provided', () => googleCommand
      .setDefaults().then(() => {
        expect(googleCommand.options.stage).toEqual('dev');
        expect(googleCommand.options.region).toEqual('us-central1');
        expect(googleCommand.options.runtime).toEqual('nodejs8');
      }));

    it('should set the options when they are provided', () => {
      googleCommand.options.stage = 'my-stage';
      googleCommand.options.region = 'my-region';
      googleCommand.options.runtime = 'nodejs6';

      return googleCommand.setDefaults().then(() => {
        expect(googleCommand.options.stage).toEqual('my-stage');
        expect(googleCommand.options.region).toEqual('my-region');
        expect(googleCommand.options.runtime).toEqual('nodejs6');
      });
    });

    describe('Iterating through AWS runtime values', () => {
      const runtimes = [['nodejs8.10', 'nodejs8'],
                        ['python3.7', 'python37'],
                        ['go1.x', 'go111']];
      for (let r = 0; r < runtimes.length; r += 1) {
        const runtime = runtimes[r];
        it(`should return the appropriate GCP value for ${runtime[0]}`, () => {
          googleCommand.options.runtime = runtime[0];
          return googleCommand.setDefaults().then(() => {
            expect(googleCommand.options.runtime).toEqual(runtime[1]);
          });
        });
      }
    });


    it('should set the provider values for stage and region if provided', () => {
      googleCommand.serverless.service.provider = {
        region: 'my-region',
        stage: 'my-stage',
      };

      return googleCommand.setDefaults().then(() => {
        expect(googleCommand.options.region).toEqual('my-region');
        expect(googleCommand.options.stage).toEqual('my-stage');
      });
    });

    it('shoud default to the us-central1 region when no region is provided', () => googleCommand
      .setDefaults().then(() => {
        expect(googleCommand.options.region).toEqual('us-central1');
      }));
  });
});
