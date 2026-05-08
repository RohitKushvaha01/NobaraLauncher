import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import {
  Animated,
  AppState,
  AppStateStatus,
  BackHandler,
  Dimensions,
  FlatList,
  Image,
  NativeModules,
  NativeSyntheticEvent,
  NativeScrollEvent,
  PanResponder,
  Text,
  TouchableOpacity,
  View,
  StatusBar,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type AppInfo = {
  name: string;
  packageName: string;
  iconUri: string;
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const NUM_COLUMNS = 4;
const DOCK_APPS_MAX = 4;
const ITEM_WIDTH = SCREEN_WIDTH / NUM_COLUMNS;
const ITEM_HEIGHT = 90;

const SNAP_OPEN   = 0;
const SNAP_CLOSED = SCREEN_HEIGHT;

const AppItem = React.memo(({ item, onPress }: { item: AppInfo, onPress: (pkg: string) => void }) => (
  <TouchableOpacity
    style={styles.drawerItem}
    onPress={() => onPress(item.packageName)}
    activeOpacity={0.75}
  >
    {item.iconUri
      ? <Image
          source={{ uri: `file://${item.iconUri}` }}
          style={styles.appIcon}
          resizeMode="contain"
          fadeDuration={0}
        />
      : <View style={[styles.appIcon, styles.iconPlaceholder]} />}
    <Text style={styles.appLabel} numberOfLines={1}>{item.name}</Text>
  </TouchableOpacity>
));

export default function AppContent() {
  const insets = useSafeAreaInsets();
  const [apps, setApps] = useState<AppInfo[]>([]);

  const sheetY    = useRef(new Animated.Value(SNAP_CLOSED)).current;
  const currentY  = useRef(SNAP_CLOSED);
  const isOpen    = useRef(false);
  const dragOffset = useRef(SNAP_CLOSED);

  const scrollY           = useRef(0);
  const dragStartedAtTop  = useRef(true);

  useEffect(() => {
    const id = sheetY.addListener(({ value }) => {
      currentY.current = value;
      isOpen.current   = value < SNAP_CLOSED - 40;
    });
    return () => sheetY.removeListener(id);
  }, [sheetY]);

  useEffect(() => {
    async function loadApps() {
      try {
        const { AppsModule } = NativeModules;
        const installedApps = await AppsModule.getInstalledApps();
        const sorted = (installedApps as AppInfo[]).sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
        );
        setApps(sorted);
      } catch (e) {
        console.error(e);
      }
    }
    loadApps();
  }, []);

  const sortedApps = apps;

  const dockApps = useMemo(() => apps.slice(0, DOCK_APPS_MAX), [apps]);

  const snapTo = useCallback(
    (toValue: number) => {
      Animated.spring(sheetY, {
        toValue,
        useNativeDriver: true,
        damping: 32,
        stiffness: 320,
        mass: 0.8,
      }).start();
    },
    [sheetY]
  );

  const openSheet  = useCallback(() => snapTo(SNAP_OPEN),   [snapTo]);
  const closeSheet = useCallback(() => snapTo(SNAP_CLOSED), [snapTo]);

  useEffect(() => {
    const onBack = () => {
      if (isOpen.current) { closeSheet(); return true; }
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => sub.remove();
  }, [closeSheet]);

  useEffect(() => {
    let prev = AppState.currentState;
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (prev.match(/inactive|background/) && next === 'active') {
        if (isOpen.current) closeSheet();
      }
      prev = next;
    });
    return () => sub.remove();
  }, [closeSheet]);

  const handlePanMove = (_: any, g: any) => {
    const next = Math.max(SNAP_OPEN, Math.min(SNAP_CLOSED, dragOffset.current + g.dy));
    sheetY.setValue(next);
  };

  const handlePanRelease = (_: any, g: any) => {
    const vel = g.vy;
    if (vel > 0.4) closeSheet();
    else if (vel < -0.4) openSheet();
    else {
      const mid = (SNAP_OPEN + SNAP_CLOSED) / 2;
      currentY.current < mid ? openSheet() : closeSheet();
    }
  };

  const homePanResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        g.dy < -8 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderGrant: () => {
        dragOffset.current = currentY.current;
        sheetY.stopAnimation();
      },
      onPanResponderMove: handlePanMove,
      onPanResponderRelease: handlePanRelease,
    })
  ).current;

  const handlePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        dragOffset.current = currentY.current;
        sheetY.stopAnimation();
      },
      onPanResponderMove: handlePanMove,
      onPanResponderRelease: handlePanRelease,
    })
  ).current;

  const sheetPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponderCapture: (_, g) => {
        const isVertical = Math.abs(g.dy) > Math.abs(g.dx);
        // Capture if swiping DOWN and at the TOP of the scrollable list
        // This allows pulling the sheet down from anywhere on its surface.
        if (isVertical && g.dy > 8 && scrollY.current <= 0) {
          return true;
        }
        return false;
      },
      onPanResponderGrant: () => {
        dragOffset.current = currentY.current;
        sheetY.stopAnimation();
      },
      onPanResponderMove: handlePanMove,
      onPanResponderRelease: handlePanRelease,
      onPanResponderTerminationRequest: () => false,
    })
  ).current;

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollY.current = e.nativeEvent.contentOffset.y;
  }, []);

  const onScrollBeginDrag = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    dragStartedAtTop.current = e.nativeEvent.contentOffset.y <= 0;
  }, []);

  const onScrollEndDrag = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const velocityY = e.nativeEvent.velocity?.y ?? 0;
    // Extra guard: if user flicks down fast while at top, close it
    if (dragStartedAtTop.current && y <= 0 && velocityY < -0.5) {
      closeSheet();
    }
  }, [closeSheet]);

  const launchApp = useCallback((packageName: string) => {
    NativeModules.AppsModule?.launchApp(packageName).catch((err: any) =>
      console.error('Failed to launch app:', err)
    );
  }, []);

  const handleAppPress = useCallback((packageName: string) => {
    closeSheet();
    setTimeout(() => launchApp(packageName), 150);
  }, [closeSheet, launchApp]);

  const backdropOpacity = sheetY.interpolate({
    inputRange: [SNAP_OPEN, SNAP_CLOSED],
    outputRange: [0.5, 0],
    extrapolate: 'clamp',
  });

  const renderItem = useCallback(({ item }: { item: AppInfo }) => (
    <AppItem item={item} onPress={handleAppPress} />
  ), [handleAppPress]);

  return (
    <View style={styles.root}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      <View
        style={[styles.home, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
        {...homePanResponder.panHandlers}
      >
        <View style={styles.dateWidget}>
          <Text style={styles.dateText}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </Text>
        </View>

        <View style={{ flex: 1 }} />

        <View style={styles.dockWrapper}>
          <View style={styles.dockSwipeZone} {...homePanResponder.panHandlers} />
          <View style={styles.dock}>
            {dockApps.map(app => (
              <TouchableOpacity
                key={app.packageName}
                style={styles.dockItem}
                onPress={() => launchApp(app.packageName)}
                activeOpacity={0.7}
              >
                {app.iconUri
                  ? <Image source={{ uri: `file://${app.iconUri}` }} style={styles.dockIcon} resizeMode="contain" />
                  : <View style={[styles.dockIcon, styles.iconPlaceholder]} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      <Animated.View
        style={[styles.backdrop, { opacity: backdropOpacity }]}
        pointerEvents="none"
      />

      <Animated.View
        style={[styles.sheet, { transform: [{ translateY: sheetY }] }]}
        {...sheetPanResponder.panHandlers}
      >
        <View style={[styles.handleArea, { paddingTop: insets.top + 14 }]} {...handlePanResponder.panHandlers}>
          <View style={styles.handle} />
        </View>

        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <Text style={styles.searchPlaceholder}>Search apps</Text>
        </View>

        <FlatList
          data={sortedApps}
          keyExtractor={item => item.packageName}
          numColumns={NUM_COLUMNS}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.grid, { paddingBottom: insets.bottom + 24 }]}
          scrollEventThrottle={16}
          onScroll={onScroll}
          onScrollBeginDrag={onScrollBeginDrag}
          onScrollEndDrag={onScrollEndDrag}
          getItemLayout={(_, index) => ({
            length: ITEM_HEIGHT,
            offset: ITEM_HEIGHT * Math.floor(index / NUM_COLUMNS),
            index,
          })}
          initialNumToRender={20}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={true}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  home: {
    ...StyleSheet.absoluteFill,
  },
  dateWidget: {
    marginTop: 20,
    paddingHorizontal: 24,
  },
  dateText: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 15,
    fontWeight: '400',
    letterSpacing: 0.2,
  },
  dockWrapper: {
    paddingBottom: 12,
  },
  dockSwipeZone: {
    height: 32,
  },
  dock: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    marginHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.13)',
    borderRadius: 36,
    paddingHorizontal: 6,
    paddingVertical: 8,
  },
  dockItem: {
    padding: 7,
    alignItems: 'center',
  },
  dockIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#000',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: SCREEN_HEIGHT,
    backgroundColor: '#1C1B1F',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
  },
  handleArea: {
    alignItems: 'center',
    paddingBottom: 10,
    zIndex: 10,
  },
  handle: {
    width: 32,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 28,
  },
  searchIcon: {
    fontSize: 15,
    marginRight: 10,
  },
  searchPlaceholder: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
  },
  grid: {
    paddingHorizontal: 4,
    paddingTop: 4,
  },
  drawerItem: {
    width: ITEM_WIDTH,
    height: ITEM_HEIGHT,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  appIcon: {
    width: 54,
    height: 54,
    borderRadius: 14,
    marginBottom: 6,
  },
  appLabel: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 11,
    textAlign: 'center',
  },
  iconPlaceholder: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
});
