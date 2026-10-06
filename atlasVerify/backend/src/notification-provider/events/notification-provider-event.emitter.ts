import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'events';
import {
  INotificationProviderEvent,
  NotificationProviderEventType,
} from '../interfaces';

/**
 * Minimal in-process pub/sub for notification provider lifecycle and
 * request events, mirroring src/ai/events/ai-provider-event.emitter.ts.
 * No shared event-bus infrastructure exists in this codebase (no
 * @nestjs/event-emitter wired app-wide), so this wraps Node's built-in
 * EventEmitter rather than introducing a new dependency.
 */
@Injectable()
export class NotificationProviderEventEmitter {
  private readonly emitter = new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(0);
  }

  emit<TPayload>(event: INotificationProviderEvent<TPayload>): void {
    this.emitter.emit(event.type, event);
    this.emitter.emit('*', event);
  }

  on<TPayload>(
    type: NotificationProviderEventType,
    listener: (event: INotificationProviderEvent<TPayload>) => void,
  ): void {
    this.emitter.on(type, listener);
  }

  onAny<TPayload>(listener: (event: INotificationProviderEvent<TPayload>) => void): void {
    this.emitter.on('*', listener);
  }

  off<TPayload>(
    type: NotificationProviderEventType,
    listener: (event: INotificationProviderEvent<TPayload>) => void,
  ): void {
    this.emitter.off(type, listener);
  }
}
