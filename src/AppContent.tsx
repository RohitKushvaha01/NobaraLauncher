import React, { useCallback, useEffect, useRef, useState } from 'react';
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

const SNAP_OPEN   = 0;                 // sheet top edge at y=0 (full screen)
const SNAP_CLOSED = SCREEN_HEIGHT;     // sheet fully off-screen below

export default function AppContent() {
  const insets = useSafeAreaInsets();
  const [apps, setApps] = useState<AppInfo[]>([]);

  // sheetY = translateY of the sheet; SNAP_CLOSED means completely hidden below
  const sheetY    = useRef(new Animated.Value(SNAP_CLOSED)).current;
  const currentY  = useRef(SNAP_CLOSED);
  const isOpen    = useRef(false);
  const dragOffset = useRef(SNAP_CLOSED);

  // FlatList scroll tracking
  const scrollY           = useRef(0);
  const dragStartedAtTop  = useRef(false);

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
        setApps(installedApps);
      } catch (e) {
        console.error(e);
      }
    }
    loadApps();
  }, []);

  // ── Snap ─────────────────────────────────────────────────────────────────
  const snapTo = useCallback(
    (toValue: number) => {
      Animated.spring(sheetY, {
        toValue,
        useNativeDriver: true,
        damping: 28,
        stiffness: 280,
        mass: 0.8,
      }).start();
    },
    [sheetY]
  );

  const openSheet  = useCallback(() => snapTo(SNAP_OPEN),   [snapTo]);
  const closeSheet = useCallback(() => snapTo(SNAP_CLOSED), [snapTo]);

  // ── Back button ───────────────────────────────────────────────────────────
  useEffect(() => {
    const onBack = () => {
      if (isOpen.current) { closeSheet(); return true; }
      return true; // prevent launcher exit
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => sub.remove();
  }, [closeSheet]);

  // ── Home button via AppState ──────────────────────────────────────────────
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

  // ── Shared pan logic (used by handle + home swipe-up) ────────────────────
  const makePanHandlers = (opts: { alwaysClaim: boolean }) =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => opts.alwaysClaim,
      onMoveShouldSetPanResponder: (_, g) =>
        opts.alwaysClaim
          ? Math.abs(g.dy) > 4
          : g.dy < -8 && Math.abs(g.dy) > Math.abs(g.dx), // upward only on home
      onPanResponderGrant: () => {
        dragOffset.current = currentY.current;
        sheetY.stopAnimation();
      },
      onPanResponderMove: (_, g) => {
        const next = Math.max(SNAP_OPEN, Math.min(SNAP_CLOSED, dragOffset.current + g.dy));
        sheetY.setValue(next);
      },
      onPanResponderRelease: (_, g) => {
        const vel = g.vy;
        if      (vel >  0.8) closeSheet();
        else if (vel < -0.8) openSheet();
        else {
          const mid = (SNAP_OPEN + SNAP_CLOSED) / 2;
          currentY.current < mid ? openSheet() : closeSheet();
        }
      },
    });

  // Handle bar: claims all vertical drags
  const handlePanResponder = useRef(makePanHandlers({ alwaysClaim: true })).current;
  // Home screen: only claims upward swipes
  const homePanResponder   = useRef(makePanHandlers({ alwaysClaim: false })).current;

  // ── FlatList pull-down-to-close ───────────────────────────────────────────
  const onScrollBeginDrag = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    dragStartedAtTop.current = e.nativeEvent.contentOffset.y <= 0;
  };
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollY.current = e.nativeEvent.contentOffset.y;
  };
  const onScrollEndDrag = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y   = e.nativeEvent.contentOffset.y;
    const vel = e.nativeEvent.velocity?.y ?? 0;
    if (dragStartedAtTop.current && y <= 2 && vel > 0.3) closeSheet();
  };

  const launchApp = (packageName: string) => {
    NativeModules.AppsModule?.launchApp(packageName).catch((err: any) =>
      console.error('Failed to launch app:', err)
    );
  };

  const dockApps   = apps.slice(0, DOCK_APPS_MAX);
  const sortedApps = [...apps].sort((a, b) => a.name.localeCompare(b.name));

  const backdropOpacity = sheetY.interpolate({
    inputRange: [SNAP_OPEN, SNAP_CLOSED],
    outputRange: [0.5, 0],
    extrapolate: 'clamp',
  });

  const renderItem = ({ item }: { item: AppInfo }) => (
    <TouchableOpacity
      style={styles.drawerItem}
      onPress={() => { closeSheet(); setTimeout(() => launchApp(item.packageName), 280); }}
      activeOpacity={0.75}
    >
      {item.iconUri
        ? <Image source={{ uri: `file://${item.iconUri}` }} style={styles.appIcon} resizeMode="contain" />
        : <View style={[styles.appIcon, styles.iconPlaceholder]} />}
      <Text style={styles.appLabel} numberOfLines={1}>{item.name}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.root}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* ── HOME SCREEN ── */}
      <View
        style={[styles.home, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
        {...homePanResponder.panHandlers}
      >
        {/* Date widget */}
        <View style={styles.dateWidget}>
          <Text style={styles.dateText}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </Text>
        </View>

        <View style={{ flex: 1 }} />

        {/* Dock — swipe up anywhere on it opens the sheet */}
        <View style={styles.dockWrapper}>
          {/* Invisible swipe-up zone above the dock */}
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

      {/* ── BACKDROP (only rendered when sheet is in motion / open) ── */}
      <Animated.View
        style={[styles.backdrop, { opacity: backdropOpacity }]}
        pointerEvents="none"
      />

      {/* ── BOTTOM SHEET ── */}
      <Animated.View
        style={[styles.sheet, { transform: [{ translateY: sheetY }] }]}
      >
        {/* Drag handle — padded by insets.top so it clears the status bar when fully open */}
        <View style={[styles.handleArea, { paddingTop: insets.top + 14 }]} {...handlePanResponder.panHandlers}>
          <View style={styles.handle} />
        </View>

        {/* Search bar */}
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <Text style={styles.searchPlaceholder}>Search apps</Text>
        </View>

        {/* App grid */}
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
        />
      </Animated.View>
    </View>
  );
}

const ITEM_WIDTH = SCREEN_WIDTH / NUM_COLUMNS;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'transparent',
  },

  // ── HOME ──
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

  // ── DOCK ──
  dockWrapper: {
    paddingBottom: 12,
  },
  // Invisible tall hit zone so upward swipes register before touching dock icons
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

  // ── BACKDROP ──
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#000',
  },

  // ── SHEET ──
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: SCREEN_HEIGHT,          // full-height so nothing peeks through
    backgroundColor: '#1C1B1F',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
  },

  // ── HANDLE ──
  handleArea: {
    alignItems: 'center',
    paddingBottom: 10,
  },
  handle: {
    width: 32,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.28)',
  },

  // ── SEARCH ──
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

  // ── GRID ──
  grid: {
    paddingHorizontal: 4,
    paddingTop: 4,
  },
  drawerItem: {
    width: ITEM_WIDTH,
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