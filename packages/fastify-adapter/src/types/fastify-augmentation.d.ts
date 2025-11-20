import {FastifySqsContainer} from '../container';

declare module 'fastify' {
    interface FastifyInstance {
        /**
         * SQS listener container instance registered by the plugin.
         * Available after the plugin is registered and provides access to
         * container lifecycle methods and status.
         */
        sqsListener?: FastifySqsContainer<any>;
    }
}