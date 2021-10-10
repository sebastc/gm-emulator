declare module 'remotestorage-widget' {
  import RemoteStorage from 'remotestoragejs'

  type WidgetOptions = {
    leaveOpen?: boolean;
    autoCloseAfter?: number;
    skipInitial?: boolean;
    logging?: boolean;
    modalBackdrop?: (boolean | string);
  };

  export default class Widget {
    constructor(remoteStorage: RemoteStorage, options?: WidgetOptions);
    attach(elementId?: string): void
  }
}
