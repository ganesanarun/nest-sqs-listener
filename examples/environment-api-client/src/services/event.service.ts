import { Injectable, Logger } from '@nestjs/common';
import { GenericEvent } from '../events/generic.event';
import { ApiClient } from '../client/api-client';
import { EnvironmentConfig } from '../config/environment-config';

/**
 * Business logic for processing events.
 */
@Injectable()
export class EventService {
  private readonly logger = new Logger(EventService.name);

  /**
   * Process an event using the environment-specific API client.
   */
  async processEvent(
    event: GenericEvent,
    apiClient: ApiClient,
    config: EnvironmentConfig,
  ): Promise<void> {
    this.logger.log(
      `Processing event ${event.eventId} of type ${event.type}`,
    );

    // Send event to environment-specific API
    await apiClient.sendEvent(event.type, event.data);

    // Additional processing based on environment
    if (config.environment === 'production') {
      await this.notifyMonitoring(event);
    }

    this.logger.log(`Event ${event.eventId} processed successfully`);
  }

  private async notifyMonitoring(event: GenericEvent): Promise<void> {
    this.logger.debug(
      `Notifying monitoring system about event ${event.eventId}`,
    );
    // Simulate monitoring notification
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}
