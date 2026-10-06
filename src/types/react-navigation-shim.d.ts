// Fallback shims to unblock TS when editor cannot resolve react-navigation types.
// If the real packages' types are available, these will get merged.

declare module '@react-navigation/bottom-tabs' {
  export function createBottomTabNavigator<ParamList extends Record<string, object | undefined> = Record<string, object | undefined>>(): any;
}

declare module '@react-navigation/native' {
  import type * as React from 'react';
  export const NavigationContainer: React.ComponentType<any>;
  export const DefaultTheme: any;
  export const DarkTheme: any;
}

declare module '@react-navigation/native-stack' {
  export function createNativeStackNavigator<ParamList extends Record<string, object | undefined> = Record<string, object | undefined>>(): any;
}

