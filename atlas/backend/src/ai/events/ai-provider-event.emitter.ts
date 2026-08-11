import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'events';
import { AiProviderEventType, IAiProviderEvent } from '../interfaces';

/**
 * AiProviderEventEmitter
 *
 * Minimal in-process pub/sub for AI provider lifecycle and request events.
 * No shared event-bus infrastructure exists in this codebase yet (no
 * @nestjs/event-emitter), so this wraps Node's built-in EventEmitter rather
 * than introducing a new dependency.
 */
@Injectable()
export class AiProviderEventEmitter {
  private readonly emitter = new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(0);
  }

  emit<TPayload = Record<string, unknown>>(event: IAiProviderEvent<TPayload>): void {
    this.emitter.emit(event.type, event);
    this.emitter.emit('*', event);
  }

  on<TPayload = Record<string, unknown>>(
    type: AiProviderEventType,
    listener: (event: IAiProviderEvent<TPayload>) => void,
  ): void {
    this.emitter.on(type, listener);
  }

  onAny(listener: (event: IAiProviderEvent) => void): void {
    this.emitter.on('*', listener);
  }

  off<TPayload = Record<string, unknown>>(
    type: AiProviderEventType,
    listener: (event: IAiProviderEvent<TPayload>) => void,
  ): void {
    this.emitter.off(type, listener);
  }
}
