import React, { useEffect, useState } from 'react';
import {
  NativeModules,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

type AppInfo = {
  name: string;
  packageName: string;
  iconUri: string;
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

  const { width } = Dimensions.get('window');
  const numColumns = 4;
  const itemWidth = width / numColumns;

  const renderItem = ({ item }: { item: AppInfo }) => (
    <TouchableOpacity
      style={{
        width: itemWidth,
        alignItems: 'center',
        padding: 10,
        justifyContent: 'center',
      }}
      onPress={() => {
        const { AppsModule } = NativeModules;
        AppsModule.launchApp(item.packageName).catch((err: any) => {
          console.error('Failed to launch app:', err);
        });
      }}
    >
      {item.iconUri ? (
        <Image
          source={{ uri: `file://${item.iconUri}` }}
          style={{ width: 50, height: 50, marginBottom: 5 }}
          resizeMode="contain"
        />
      ) : (
        <View style={{ width: 50, height: 50, marginBottom: 5, backgroundColor: 'gray' }} />
      )}
      <Text
        style={{
          color: 'white',
          fontSize: 12,
          textAlign: 'center',
        }}
        numberOfLines={2}
      >
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: 'transparent',
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
        paddingLeft: insets.left,
        paddingRight: insets.right,
      }}
    >
      <FlatList
        data={apps}
        keyExtractor={(item) => item.packageName}
        numColumns={numColumns}
        renderItem={renderItem}
        contentContainerStyle={{
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        }}
      />
    </View>
  );
}