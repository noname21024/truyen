/// <reference types="vite/client" />
declare module 'swiper/css*';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'viconic-icon': any;
    }
  }
}

declare namespace React {
  namespace JSX {
    interface IntrinsicElements {
      'viconic-icon': any;
    }
  }
}
