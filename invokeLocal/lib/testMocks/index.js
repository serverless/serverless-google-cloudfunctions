/**
 * /!\ this file contains fake handlers used in the tests /!\
 */

'use strict';

module.exports = {
  syncHandler: (event, context, callback) => {
    // eslint-disable-next-line no-console
    console.log('SYNC_HANDLER');
    callback(null, { result: event.name });
  },
  syncHandlerWithError: (event, context, callback) => {
    // eslint-disable-next-line no-console
    console.log('SYNC_HANDLER');
    callback('SYNC_ERROR');
  },
  asyncHandler: async (event, context) => {
    // eslint-disable-next-line no-console
    console.log('ASYNC_HANDLER');
    return { result: context.name };
  },
  asyncHandlerWithError: async () => {
    // eslint-disable-next-line no-console
    console.log('ASYNC_HANDLER');
    throw new Error('ASYNC_ERROR');
  },
};
