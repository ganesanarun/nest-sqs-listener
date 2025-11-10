import { Injectable, Logger } from '@nestjs/common';
import { QueueListener, MessageContext } from '@snow-tzu/nest-sqs-listener';
import { GenericEvent } from '../events/generic.event';
import { EnvironmentContext } from '../interfaces/environment-context.interface';
import { EnvironmentResources } from '../interfaces/environment-resources.interface';
import { EventService } from '../services/event.service';

/**
 * Listener for generic events with environment-based API client selection.
 */
@Injectable()
export class EventListener
  implements
    QueueListener<GenericEvent, EnvironmentContext, EnvironmentResources>
{
  private readonly logger = new Logger(EventListener.name);

  constructor(private readonly eventService: EventService) {}

  async onMessage(
    payload: GenericEvent,
    context: MessageContext<EnvironmentContext, EnvironmentResources>,
  ): Promise<void> {
    // Get strongly-typed environment context
    const envContext = context.getContext()!;
    const { environment, region } = envContext;

    // Get strongly-typed environment resources
    const resources = context.getResources()!;
    const { apiClient, config } = resources;

    this.logger.log(
      `Processing event ${payload.eventId} (${payload.type}) using ${environment} API client (${apiClient.getEndpoint()})`,
    );

    // Process the event using environment-specific API client
    await this.eventService.processEvent(payload, apiClient, config);

    this.logger.log(
      `Successfully processed event ${payload.eventId} in ${environment}`,
    );
  }
}
