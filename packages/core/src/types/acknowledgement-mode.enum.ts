/**
 * Acknowledgement mode determining when messages are deleted from the queue.
 *
 * @enum {string}
 */
export enum AcknowledgementMode {
    /**
     * Delete a message only when processing completes successfully.
     * If an error occurs, the message remains in the queue for retry.
     * This is the default and safest mode.
     */
    ON_SUCCESS = 'ON_SUCCESS',

    /**
     * Never automatically delete messages.
     * Application must explicitly call context.acknowledge() to delete the message.
     * Useful for complex workflows or transactional processing.
     */
    MANUAL = 'MANUAL',

    /**
     * Always delete a message regardless of the processing outcome.
     * Useful for non-critical messages or when using external dead-letter queues.
     */
    ALWAYS = 'ALWAYS',
}
