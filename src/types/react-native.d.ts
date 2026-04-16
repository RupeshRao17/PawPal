// Type declarations for React Native components with React 19
// This resolves JSX element type errors that don't affect runtime

import 'react-native';

declare module 'react-native' {
  // Export all necessary components
  export const View: any;
  export const Text: any;
  export const ScrollView: any;
  export const TouchableOpacity: any;
  export const KeyboardAvoidingView: any;
  export const Platform: any;
  export const Alert: any;
  export const StyleSheet: any;
  export const ActivityIndicator: any;
  export const FlatList: any;
  export const TextInput: any;
  export const Button: any;
  export const Modal: any;
  export const Image: any;
  export const SafeAreaView: any;
  export const Dimensions: any;
  export const Animated: any;
  export const StatusBar: any;
  export const Linking: any;
}

declare module 'react-native-paper' {
  // Export all Paper components
  export const Text: any;
  export const Card: any;
  export const Button: any;
  export const TextInput: any;
  export const Chip: any;
  export const Avatar: any;
  export const ActivityIndicator: any;
  export const Searchbar: any;
  export const FAB: any;
  export const Portal: any;
  export const Modal: any;
  export const Provider: any;
  export const PaperProvider: any;
  export const MD3LightTheme: any;
  export const MD3DarkTheme: any;
}

declare module 'expo-linear-gradient' {
  import React from 'react';
  import { ViewProps } from 'react-native';
  
  export interface LinearGradientProps extends ViewProps {
    colors: string[];
    start?: { x: number; y: number };
    end?: { x: number; y: number };
  }
  
  export class LinearGradient extends React.Component<LinearGradientProps> {}
}

declare module '@expo/vector-icons' {
  export const Ionicons: any;
  export const MaterialIcons: any;
  export const FontAwesome: any;
  export const MaterialCommunityIcons: any;
  export const SimpleLineIcons: any;
  export const Octicons: any;
  export const Entypo: any;
  export const Feather: any;
  export const Fontisto: any;
  export const EvilIcons: any;
  export const AntDesign: any;
  export const Foundation: any;
  export const Zocial: any;
}
