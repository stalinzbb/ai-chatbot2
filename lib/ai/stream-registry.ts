const controllers = new Map<string, AbortController>();

export function registerStreamController(
  streamId: string,
  controller: AbortController,
) {
  controllers.set(streamId, controller);
}

export function unregisterStreamController(streamId: string) {
  controllers.delete(streamId);
}

export function cancelStreamController(streamId: string) {
  const controller = controllers.get(streamId);
  if (!controller) {
    return false;
  }

  controller.abort();
  controllers.delete(streamId);
  return true;
}
