import React, { useEffect, useState } from 'react';
import {
  NativeModules,
  Text,
  View,
  ScrollView,
} from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

type AppInfo = {
  name: string;
  packageName: string;
};

export default function AppContent() {

  const insets = useSafeAreaInsets();

  const [apps, setApps] = useState<AppInfo[]>([]);

  useEffect(() => {

    async function loadApps() {

      try {

        const { AppsModule } = NativeModules;

        const installedApps =
          await AppsModule.getInstalledApps();

        setApps(installedApps);

      } catch (e) {
        console.error(e);
      }
    }

    loadApps();

  }, []);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: 'black',
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
        paddingLeft: insets.left,
        paddingRight: insets.right,
      }}
    >

      <ScrollView>

        {apps.map((app) => (
          <Text
            key={app.packageName}
            style={{
              color: 'white',
              fontSize: 18,
              marginBottom: 10,
            }}
          >
            {app.name}
          </Text>
        ))}

      </ScrollView>

    </View>
  );
}