import React, { useEffect } from 'react';
import { BackHandler, StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppContent from './AppContent';

function App() {
  useEffect(() => {
    const onBackPress = () => {
      // Return true to stop the app from exiting
      // You can add logic here (e.g., navigate to home screen)
      return true; 
    };

    // Add the listener
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      onBackPress
    );

    // Clean up the listener when the component unmounts
    return () => subscription.remove();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar 
        translucent 
        backgroundColor="transparent" 
      />
      <AppContent />
    </SafeAreaProvider>
  );
}

export default App;
