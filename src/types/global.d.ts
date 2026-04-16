// Global type declarations to fix React 19 + React Native JSX compatibility
import React from 'react';

declare global {
  namespace JSX {
    interface Element extends React.ReactElement<any, any> { }
    interface ElementClass extends React.Component<any> { }
    interface ElementAttributesProperty {
      props: {};
    }
    interface ElementChildrenAttribute {
      children: {};
    }
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}

export {};
