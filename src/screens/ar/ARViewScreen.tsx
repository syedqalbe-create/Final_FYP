import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Linking,
  PermissionsAndroid,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ViroARSceneNavigator } from '@viro-community/react-viro';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { AppText as Text } from '../../components/common/AppText';
import { ModelPlacementARScene } from '../../ar/scenes/ModelPlacementARScene';
import { getProductById as getStoreProductById } from '../../services/productCatalogService';
import { useTheme } from '../../contexts/ThemeContext';

export const ARViewScreen = () => {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  // Keep params optional (ProductDetails passes productId, older code expected product).
  const params = route?.params ?? {};
  const productId: string | undefined = params?.productId ? String(params.productId) : undefined;

  const [cameraGranted, setCameraGranted] = useState<boolean>(Platform.OS === 'ios');
  const [requesting, setRequesting] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<string>(
    Platform.OS === 'ios' ? 'ios-managed' : 'unknown',
  );
  const [trackingState, setTrackingState] = useState<string>('unknown');
  const [trackingReason, setTrackingReason] = useState<string>('');
  const [placementError, setPlacementError] = useState<string>('');
  const lastTrackingUpdateMsRef = useRef<number>(0);
  const lastTrackingStateRef = useRef<string>('unknown');
  const lastTrackingReasonRef = useRef<string>('');
  const [remoteModelUrl, setRemoteModelUrl] = useState<string>('');
  const [productName, setProductName] = useState<string>('');
  const [productLoaded, setProductLoaded] = useState<boolean>(false);
  const [modelLoading, setModelLoading] = useState<boolean>(false);
  const [modelLoadingProgress, setModelLoadingProgress] = useState<number>(0);
  const [modelLoadingError, setModelLoadingError] = useState<string>('');
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [modelPosition, setModelPosition] = useState<[number, number, number]>([0, 0, 0]);
  // Keep track of the last "good" placed position so Reset Pos doesn't send the model to world origin.
  const lastPlacedPositionRef = useRef<[number, number, number] | null>(null);
  // Keep track of the original "home" placement position (captured right after a successful Place Model).
  // Reset Pos should go back to this position, not the latest moved position.
  const homePlacedPositionRef = useRef<[number, number, number] | null>(null);
  // When Place Model is pressed, we set this to capture the next position update as the "home" position.
  const pendingHomeCaptureRef = useRef<boolean>(false);
  const [modelRotationY, setModelRotationY] = useState<number>(0);
  const [modelScaleMultiplier, setModelScaleMultiplier] = useState<number>(1);
  const [resetPlaneSelectionKey, setResetPlaneSelectionKey] = useState<number>(0);
  const [planeLocked, setPlaneLocked] = useState<boolean>(false);
  const [placeRequestKey, setPlaceRequestKey] = useState<number>(0);
  const [placingModel, setPlacingModel] = useState<boolean>(false);
  const [uiMinimized, setUiMinimized] = useState<boolean>(false);
  const controlsOpacity = useRef(new Animated.Value(1)).current;
  const controlsTranslateY = useRef(new Animated.Value(0)).current;

  // Check network connectivity
  const checkNetworkConnectivity = useCallback(async (): Promise<boolean> => {
    try {
      await fetch('https://www.google.com', {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-cache',
      });
      return true;
    } catch {
      // Network request failed - likely offline
      return false;
    }
  }, []);

  // Load model with progress tracking
  const loadModelWithProgress = useCallback(async (modelUrl: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      setModelLoading(true);
      setModelLoadingProgress(0);
      setModelLoadingError('');

      // Check if URL is valid
      if (!modelUrl || !modelUrl.trim()) {
        setModelLoading(false);
        reject(new Error('Invalid model URL'));
        return;
      }

      // Use XMLHttpRequest for progress tracking
      const xhr = new XMLHttpRequest();
      const timeout = 30000; // 30 second timeout

      xhr.open('HEAD', modelUrl, true);
      xhr.timeout = timeout;

      xhr.onprogress = (event) => {
        if (event.lengthComputable && event.total > 0) {
          const progress = (event.loaded / event.total) * 100;
          setModelLoadingProgress(Math.min(progress, 95)); // Cap at 95% until complete
        } else {
          // If we can't compute progress, simulate it
          setModelLoadingProgress((prev) => Math.min(prev + 10, 90));
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          setModelLoadingProgress(100);
          setTimeout(() => {
            setModelLoading(false);
            resolve();
          }, 300);
        } else {
          setModelLoading(false);
          reject(new Error(`Failed to load model: HTTP ${xhr.status}`));
        }
      };

      xhr.onerror = () => {
        setModelLoading(false);
        reject(new Error('Network error: Unable to load model'));
      };

      xhr.ontimeout = () => {
        setModelLoading(false);
        reject(new Error('Request timeout: Model took too long to load'));
      };

      xhr.onabort = () => {
        setModelLoading(false);
        reject(new Error('Request aborted'));
      };

      try {
        xhr.send();
      } catch (error) {
        setModelLoading(false);
        reject(new Error('Failed to start model download'));
      }
    });
  }, []);

  useEffect(() => {
    let alive = true;
    let modelLoadAborted = false;

    const loadProduct = async () => {
      if (!productId) {
        // No productId provided - mark as loaded with no model
        setRemoteModelUrl('');
        setProductName('');
        setProductLoaded(true);
        setModelLoading(false);
        return;
      }

      // Reset loading state when productId changes
      setProductLoaded(false);
      setModelLoading(false);
      setModelLoadingProgress(0);
      setModelLoadingError('');

      // Check network connectivity first
      const online = await checkNetworkConnectivity();
      setIsOnline(online);

      if (!online) {
        if (alive) {
          setModelLoadingError('No internet connection. AR models require an active internet connection.');
          setProductLoaded(true);
        }
        return;
      }

      try {
        const p = await getStoreProductById(productId);
        if (!alive || modelLoadAborted) return;

        const modelUrl = p?.modelUrl ? String(p.modelUrl).trim() : '';
        setProductName(String(p?.title ?? ''));

        if (!modelUrl) {
          setRemoteModelUrl('');
          setProductLoaded(true);
          return;
        }

        // Validate URL format
        let isValidUrl = false;
        try {
          // eslint-disable-next-line no-new
          new URL(modelUrl);
          isValidUrl = true;
        } catch {
          isValidUrl = false;
        }
        if (!isValidUrl) {
          if (alive) {
            setModelLoadingError('Invalid model URL format');
            setProductLoaded(true);
          }
          return;
        }

        // Load model with progress tracking
        setRemoteModelUrl(modelUrl);
        try {
          await loadModelWithProgress(modelUrl);
          if (alive && !modelLoadAborted) {
            setProductLoaded(true);
          }
        } catch (error: any) {
          if (alive && !modelLoadAborted) {
            setModelLoadingError(error?.message || 'Failed to load AR model');
            setProductLoaded(true);
          }
        }
      } catch (err) {
        console.warn('Error loading product for AR view:', err);
        if (alive && !modelLoadAborted) {
          setRemoteModelUrl('');
          setProductName('');
          setModelLoadingError('Failed to load product information');
          setProductLoaded(true);
        }
      }
    };

    loadProduct();

    return () => {
      alive = false;
      modelLoadAborted = true;
      setModelLoading(false);
    };
  }, [productId, checkNetworkConnectivity, loadModelWithProgress]);

  const refreshCameraPermissionState = useCallback(async () => {
    if (Platform.OS !== 'android') {
      setCameraGranted(true);
      setPermissionStatus('ios-managed');
      return true;
    }
    try {
      const already = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA);
      setCameraGranted(already);
      setPermissionStatus(already ? 'granted' : 'not-granted');
      return already;
    } catch {
      setCameraGranted(false);
      setPermissionStatus('check-failed');
      return false;
    }
  }, []);

  const requestCameraPermission = useCallback(async () => {
    if (Platform.OS !== 'android') {
      setCameraGranted(true);
      setPermissionStatus('ios-managed');
      return true;
    }

    try {
      setRequesting(true);
      const res = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA, {
        title: 'Camera Permission',
        message: 'Vision AR needs access to your camera to use AR.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      });
      const ok = res === PermissionsAndroid.RESULTS.GRANTED;
      setCameraGranted(ok);
      setPermissionStatus(res);
      return ok;
    } finally {
      setRequesting(false);
    }
  }, []);

  useEffect(() => {
    // Android requires runtime permission; iOS prompts when camera is accessed (ensure Info.plist key exists).
    // First check existing status (covers the case where permission was already granted).
    refreshCameraPermissionState().then((already) => {
      if (!already) {
        requestCameraPermission();
      }
    });
  }, [refreshCameraPermissionState, requestCameraPermission]);

  const initialScene = useMemo(() => ({ scene: ModelPlacementARScene }), []);
  const viroAppProps = useMemo(
    () => ({
      modelUrl: remoteModelUrl && remoteModelUrl.trim() ? remoteModelUrl.trim() : undefined,
      modelPosition,
      modelRotationY,
      modelScaleMultiplier,
      resetPlaneSelectionKey,
      placeRequestKey,
      onTrackingUpdate: (state: any, reason: any) => {
        const nextState = String(state);
        const nextReason = String(reason ?? '');
        const now = Date.now();

        // Throttle tracking state updates to avoid excessive rerenders that can cause
        // large objects to appear to "drift" (position prop gets re-applied frequently).
        if (
          now - lastTrackingUpdateMsRef.current < 250 &&
          nextState === lastTrackingStateRef.current &&
          nextReason === lastTrackingReasonRef.current
        ) {
          return;
        }

        lastTrackingUpdateMsRef.current = now;
        lastTrackingStateRef.current = nextState;
        lastTrackingReasonRef.current = nextReason;
        setTrackingState(nextState);
        setTrackingReason(nextReason);
      },
      onPlaneSelected: () => {
        setPlaneLocked(true);
      },
      onModelPositionChange: (pos: [number, number, number]) => {
        setModelPosition(pos);
        lastPlacedPositionRef.current = pos;
        if (pendingHomeCaptureRef.current) {
          homePlacedPositionRef.current = pos;
          pendingHomeCaptureRef.current = false;
        }
      },
      onPlacementError: (message: string) => {
        setPlacementError(message);
        setPlacingModel(false);
        // auto-clear after a bit
        setTimeout(() => setPlacementError(''), 2500);
      },
      onModelLoaded: () => {
        setPlacingModel(false);
      },
    }),
    [
      remoteModelUrl,
      modelPosition,
      modelRotationY,
      modelScaleMultiplier,
      resetPlaneSelectionKey,
      placeRequestKey,
    ],
  );

  const MOVE_STEP = 0.05; // 5cm per step

  type HoldState = {
    timeout: NodeJS.Timeout | null;
    interval: NodeJS.Timeout | null;
    token: number;
    isPressed: boolean;
  };

  // Keyed hold state so timers survive re-renders and always get stopped correctly.
  const holdStatesRef = useRef<Map<string, HoldState>>(new Map());

  const stopHold = useCallback((key: string) => {
    const st =
      holdStatesRef.current.get(key) ??
      ({ timeout: null, interval: null, token: 0, isPressed: false } as HoldState);

    if (st.timeout) {
      clearTimeout(st.timeout);
      st.timeout = null;
    }
    if (st.interval) {
      clearInterval(st.interval);
      st.interval = null;
    }
    st.isPressed = false;
    st.token += 1; // invalidate any pending async callbacks

    holdStatesRef.current.set(key, st);
  }, []);

  const startHold = useCallback(
    (key: string, action: () => void) => {
      // Stop any previous timers for this key first.
      stopHold(key);

      const st =
        holdStatesRef.current.get(key) ??
        ({ timeout: null, interval: null, token: 0, isPressed: false } as HoldState);

      st.isPressed = true;
      st.token += 1;
      const myToken = st.token;
      holdStatesRef.current.set(key, st);

      // Single tap behavior: execute once immediately.
      action();

      // Hold behavior: after delay, repeat while still pressed + same token.
      st.timeout = setTimeout(() => {
        const cur = holdStatesRef.current.get(key);
        if (!cur || !cur.isPressed || cur.token !== myToken) {
          return;
        }

        cur.interval = setInterval(() => {
          const cur2 = holdStatesRef.current.get(key);
          if (!cur2 || !cur2.isPressed || cur2.token !== myToken) {
            // Stop interval reliably even if onPressOut didn't fire.
            stopHold(key);
            return;
          }
          action();
        }, 100);
      }, 300);
    },
    [stopHold],
  );

  // Cleanup when screen loses focus (or unmount).
  useEffect(() => {
    const cleanupAll = () => {
      Array.from(holdStatesRef.current.keys()).forEach((k) => stopHold(k));
      holdStatesRef.current.clear();
    };
    const unsubscribeBlur = navigation.addListener('blur', cleanupAll);
    return () => {
      cleanupAll();
      unsubscribeBlur();
    };
  }, [navigation, stopHold]);

  const createHoldToRepeatHandlers = useCallback(
    (key: string, action: () => void) => {
      return {
        onPressIn: () => startHold(key, action),
        onPressOut: () => stopHold(key),
        onResponderTerminate: () => stopHold(key),
        onTouchCancel: () => stopHold(key),
        delayPressIn: 0,
        delayPressOut: 0,
      } as const;
    },
    [startHold, stopHold],
  );

  const moveModel = useCallback(
    (axis: 'x' | 'y' | 'z', direction: 1 | -1) => {
      setModelPosition((prev) => {
        const [x, y, z] = prev;
        if (axis === 'x') {
          return [x + direction * MOVE_STEP, y, z];
        }
        if (axis === 'y') {
          return [x, y + direction * MOVE_STEP, z];
        }
        if (axis === 'z') {
          return [x, y, z + direction * MOVE_STEP];
        }
        return prev;
      });
    },
    [MOVE_STEP],
  );

  const resetPosition = useCallback(() => {
    const homePlaced = homePlacedPositionRef.current;
    if (homePlaced) {
      setModelPosition(homePlaced);
      return;
    }
    // If the model hasn't been placed yet, avoid moving it to world origin (can appear "gone").
    setPlacementError('Place the model first, then you can reset its position.');
    setTimeout(() => setPlacementError(''), 2500);
  }, []);

  const ROTATE_STEP = 10; // degrees
  const rotateModel = useCallback((direction: 1 | -1) => {
    setModelRotationY((prev) => {
      const next = prev + direction * ROTATE_STEP;
      if (next > 180) {
        return next - 360;
      }
      if (next < -180) {
        return next + 360;
      }
      return next;
    });
  }, []);

  const resetRotation = useCallback(() => {
    setModelRotationY(0);
  }, []);

  const ZOOM_STEP = 0.05; // 5% per step for finer control
  const zoom = useCallback((direction: 1 | -1) => {
    setModelScaleMultiplier((prev) => {
      const next = Number((prev + direction * ZOOM_STEP).toFixed(2));
      return Math.max(0.1, Math.min(10, next)); // Range: 10% to 1000%
    });
  }, []);

  const resetZoom = useCallback(() => {
    setModelScaleMultiplier(1);
  }, []);

  const resetPlane = useCallback(() => {
    setPlaneLocked(false);
    // Resetting the plane means we also discard any previously "good" placed position.
    lastPlacedPositionRef.current = null;
    homePlacedPositionRef.current = null;
    pendingHomeCaptureRef.current = false;
    setModelPosition([0, 0, 0]);
    setResetPlaneSelectionKey((k) => k + 1);
    setPlacementError('');
  }, []);

  const placeAtCenter = useCallback(() => {
    // Triggers Figment-style hit test placement from within the AR scene.
    setPlacingModel(true);
    // Capture the next position update from the AR scene as the "home" position.
    pendingHomeCaptureRef.current = true;
    setPlaceRequestKey((k) => k + 1);
    // Auto-hide loading after max 5 seconds as fallback
    setTimeout(() => {
      setPlacingModel(false);
    }, 5000);
  }, []);

  const toggleUIMinimize = useCallback(() => {
    setUiMinimized(!uiMinimized);

    Animated.parallel([
      Animated.timing(controlsOpacity, {
        toValue: uiMinimized ? 1 : 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(controlsTranslateY, {
        toValue: uiMinimized ? 0 : 100,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [uiMinimized, controlsOpacity, controlsTranslateY]);

  // Check if we have a valid model URL
  const hasModelUrl = remoteModelUrl && remoteModelUrl.trim().length > 0;

  // Show loading state while product is being fetched or model is loading
  if (!productLoaded || modelLoading) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.overlay} pointerEvents="box-none">
          <View style={styles.header}>
            <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
              <Ionicons name="close" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
          <View style={styles.loadingContainer}>
            <Ionicons name="cube-outline" size={64} color="rgba(255,255,255,0.6)" />
            <Text style={styles.loadingTitle}>
              {modelLoading ? 'Loading AR Model...' : 'Loading Product...'}
            </Text>
            {modelLoading && (
              <>
                <View style={styles.progressBarContainer}>
                  <View style={styles.progressBarBackground}>
                    <Animated.View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${modelLoadingProgress}%`,
                        },
                      ]}
                    />
                  </View>
                </View>
                <Text style={styles.progressText}>{Math.round(modelLoadingProgress)}%</Text>
              </>
            )}
            {!modelLoading && (
              <Text style={styles.loadingText}>Please wait while we load the product details.</Text>
            )}
            <ActivityIndicator
              size="small"
              color="rgba(255,255,255,0.8)"
              style={styles.loadingSpinner}
            />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // Show message if no model URL is available or if there's an error (only after product has loaded)
  if (productLoaded && (!hasModelUrl || modelLoadingError)) {
      const isOfflineError =
        modelLoadingError.includes('No internet') || !isOnline;

      return (
      <View style={styles.container}>
        <SafeAreaView style={styles.overlay} pointerEvents="box-none">
          <View style={styles.header}>
            <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
              <Ionicons name="close" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
          <View style={styles.noModelContainer}>
            <Ionicons
              name={
                isOfflineError
                  ? 'cloud-offline-outline'
                  : modelLoadingError
                  ? 'alert-circle-outline'
                  : 'cube-outline'
              }
              size={64}
              color="rgba(255,255,255,0.6)"
            />
            <Text style={styles.noModelTitle}>
              {isOfflineError
                ? 'No Internet Connection'
                : modelLoadingError
                ? 'Unable to Load AR Model'
                : 'No AR Model Available'}
            </Text>
            <Text style={styles.noModelText}>
              {isOfflineError
                ? 'AR models require an active internet connection. Please check your connection and try again.'
                : modelLoadingError
                ? modelLoadingError
                : productId
                ? "This product doesn't have an AR model yet. Check back later!"
                : 'No product selected for AR view.'}
            </Text>
            {isOfflineError && (
              <TouchableOpacity
                style={styles.retryButton}
                onPress={async () => {
                  const online = await checkNetworkConnectivity();
                  setIsOnline(online);
                  if (online && productId) {
                    // Retry loading
                    setModelLoadingError('');
                    setProductLoaded(false);
                  }
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="refresh" size={16} color="#fff" />
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.noModelButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Text style={styles.noModelButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // Safety check: Only render AR if we have a valid model URL
  if (!hasModelUrl || !productLoaded) {
    return null;
  }

  return (
    <View style={styles.container}>
      {cameraGranted ? (
        <ViroARSceneNavigator
          style={styles.arView}
          initialScene={initialScene}
          viroAppProps={viroAppProps}
          autofocus={true}
        />
      ) : (
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionTitle}>Camera access required</Text>
          <Text style={styles.permissionSubtitle}>Please allow camera permission to use AR.</Text>
          <Text style={styles.permissionDebug}>Status: {permissionStatus}</Text>
          <TouchableOpacity
            style={[styles.permissionButton, requesting && styles.permissionButtonDisabled]}
            onPress={requestCameraPermission}
            disabled={requesting}
            activeOpacity={0.9}
          >
            <Text style={styles.permissionButtonText}>
              {requesting ? 'Requesting…' : 'Allow Camera'}
            </Text>
          </TouchableOpacity>

          {permissionStatus === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN && (
            <TouchableOpacity
              style={[styles.permissionButton, styles.permissionButtonSecondary]}
              onPress={() => Linking.openSettings()}
              activeOpacity={0.9}
            >
              <Text style={styles.permissionButtonText}>Open Settings</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.permissionSecondary}
            onPress={() => navigation.goBack()}
            activeOpacity={0.9}
          >
            <Text style={styles.permissionSecondaryText}>Go back</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Overlay UI */}
      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        {/* Model Placing Loading Indicator */}
        {placingModel && (
          <View style={styles.placingLoaderContainer} pointerEvents="none">
            <View style={styles.placingLoader}>
              <ActivityIndicator size="large" color="#fff" />
              <Text style={styles.placingLoaderText}>Placing Model...</Text>
            </View>
          </View>
        )}

        {/* Top Header - Always Visible */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.minimizeButton}
            onPress={toggleUIMinimize}
            activeOpacity={0.7}
          >
            <Ionicons name={uiMinimized ? 'chevron-up' : 'chevron-down'} size={20} color="#0D1F1A" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.closeButton} 
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={20} color="#0D1F1A" />
          </TouchableOpacity>
        </View>

        {/* Collapsible Controls Panel */}
        <Animated.View
          style={[
            styles.controlsContainer,
            {
              opacity: controlsOpacity,
              transform: [{ translateY: controlsTranslateY }],
            },
          ]}
          pointerEvents={uiMinimized ? 'none' : 'auto'}
        >
          <View style={styles.glassPanel}>
            <ScrollView
              style={styles.controlsScroll}
              contentContainerStyle={styles.controlsContent}
              showsVerticalScrollIndicator={false}
              bounces={true}
              nestedScrollEnabled={true}
              scrollEnabled={true}
            >
              {/* Status Info - Compact */}
              <View style={styles.statusBar}>
                <View style={styles.statusItem}>
                  <Ionicons name="radio" size={14} color="#0A6B4B" />
                  <Text style={styles.statusText}>
                    {trackingState === 'READY' ? 'Ready' : trackingState}
                  </Text>
                </View>
                {!!placementError && (
                  <View style={[styles.statusItem, styles.statusError]}>
                    <Ionicons name="alert-circle" size={14} color="#ff6b6b" />
                    <Text style={[styles.statusText, styles.statusErrorText]}>{placementError}</Text>
                  </View>
                )}
              </View>

              {/* Product Info */}
              {productName && (
                <View style={styles.productInfoCard}>
                  <Ionicons name="cube" size={20} color="#0A6B4B" />
                  <Text style={styles.productInfoText} numberOfLines={1}>
                    {productName}
                  </Text>
                </View>
              )}

              <Text style={styles.instructionText}>
                {planeLocked ? 'Drag to adjust placement' : 'Move camera to scan, then tap Place'}
              </Text>

            {/* Main Controls Panel */}
            <View style={styles.controlsPanel}>
              {/* Place Button - Circular Emerald Button */}
              <View style={styles.placeButtonContainer}>
                <TouchableOpacity
                  style={styles.placeButton}
                  onPress={placeAtCenter}
                  activeOpacity={0.7}
                >
                  <Ionicons name="locate" size={24} color="#fff" />
                </TouchableOpacity>
              </View>

              {/* Movement Controls */}
              <View style={styles.controlSection}>
                <Text style={styles.sectionTitle}>Position</Text>
                <View style={styles.controlRow}>
                  {/* D-pad (X/Y) */}
                  <View style={styles.dpad}>
                    <TouchableOpacity
                      style={[styles.dpadBtn, styles.dpadUp]}
                      {...createHoldToRepeatHandlers('move-y-up', () => moveModel('y', 1))}
                      activeOpacity={0.75}
                    >
                      <Ionicons name="chevron-up" size={22} color="#0A6B4B" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.dpadBtn, styles.dpadLeft]}
                      {...createHoldToRepeatHandlers('move-x-left', () => moveModel('x', -1))}
                      activeOpacity={0.75}
                    >
                      <Ionicons name="chevron-back" size={22} color="#0A6B4B" />
                    </TouchableOpacity>
                    <View style={styles.dpadCenter}>
                      <Ionicons name="move" size={18} color="#0A6B4B" />
                    </View>
                    <TouchableOpacity
                      style={[styles.dpadBtn, styles.dpadRight]}
                      {...createHoldToRepeatHandlers('move-x-right', () => moveModel('x', 1))}
                      activeOpacity={0.75}
                    >
                      <Ionicons name="chevron-forward" size={22} color="#0A6B4B" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.dpadBtn, styles.dpadDown]}
                      {...createHoldToRepeatHandlers('move-y-down', () => moveModel('y', -1))}
                      activeOpacity={0.75}
                    >
                      <Ionicons name="chevron-down" size={22} color="#0A6B4B" />
                    </TouchableOpacity>
                  </View>

                  {/* Near/Far (Z) */}
                  <View style={styles.stackControls}>
                    <Text style={styles.controlMiniLabel}>Depth</Text>
                    <TouchableOpacity
                      style={styles.pillBtn}
                      {...createHoldToRepeatHandlers('move-z-near', () => moveModel('z', 1))}
                      activeOpacity={0.75}
                    >
                      <Ionicons name="arrow-up" size={18} color="#0A6B4B" />
                      <Text style={styles.pillBtnText}>Near</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.pillBtn}
                      {...createHoldToRepeatHandlers('move-z-far', () => moveModel('z', -1))}
                      activeOpacity={0.75}
                    >
                      <Ionicons name="arrow-down" size={18} color="#0A6B4B" />
                      <Text style={styles.pillBtnText}>Far</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Rotation Controls */}
              <View style={styles.controlSection}>
                <View style={styles.rotateHeader}>
                  <Text style={styles.sectionTitle}>Rotation</Text>
                  <Text style={styles.rotateValue}>{Math.round(modelRotationY)}°</Text>
                </View>
                <View style={styles.rotateBtns}>
                  <TouchableOpacity
                    style={styles.iconBtn}
                    {...createHoldToRepeatHandlers('rotate-left', () => rotateModel(-1))}
                    activeOpacity={0.75}
                  >
                    <Ionicons name="return-up-back" size={20} color="#0A6B4B" />
                    <Text style={styles.iconBtnText}>Left</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.iconBtn}
                    onPress={resetRotation}
                    activeOpacity={0.75}
                  >
                    <Ionicons name="refresh" size={20} color="#0A6B4B" />
                    <Text style={styles.iconBtnText}>Reset</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.iconBtn}
                    {...createHoldToRepeatHandlers('rotate-right', () => rotateModel(1))}
                    activeOpacity={0.75}
                  >
                    <Ionicons name="return-up-forward" size={20} color="#0A6B4B" />
                    <Text style={styles.iconBtnText}>Right</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Zoom Controls */}
              <View style={styles.controlSection}>
                <View style={styles.rotateHeader}>
                  <Text style={styles.sectionTitle}>Scale</Text>
                  <Text style={styles.rotateValue}>{Math.round(modelScaleMultiplier * 100)}%</Text>
                </View>
                <View style={styles.rotateBtns}>
                  <TouchableOpacity
                    style={styles.iconBtn}
                    {...createHoldToRepeatHandlers('zoom-in', () => zoom(1))}
                    activeOpacity={0.75}
                  >
                    <Ionicons name="add" size={20} color="#0A6B4B" />
                    <Text style={styles.iconBtnText}>In</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.iconBtn} 
                    onPress={resetZoom} 
                    activeOpacity={0.75}
                  >
                    <Ionicons name="refresh" size={20} color="#0A6B4B" />
                    <Text style={styles.iconBtnText}>Reset</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.iconBtn}
                    {...createHoldToRepeatHandlers('zoom-out', () => zoom(-1))}
                    activeOpacity={0.75}
                  >
                    <Ionicons name="remove" size={20} color="#0A6B4B" />
                    <Text style={styles.iconBtnText}>Out</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Reset Actions */}
              <View style={styles.footerActions}>
                <TouchableOpacity
                  style={styles.secondaryBtn}
                  onPress={resetPosition}
                  activeOpacity={0.75}
                >
                  <Ionicons name="navigate" size={18} color="#0A6B4B" />
                  <Text style={styles.secondaryBtnText}>Reset Pos</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.secondaryBtn}
                  onPress={resetPlane}
                  activeOpacity={0.75}
                >
                  <Ionicons name="scan" size={18} color="#0A6B4B" />
                  <Text style={styles.secondaryBtnText}>Reset Plane</Text>
                </TouchableOpacity>
              </View>

              {/* Debug Hints */}
              {trackingReason.includes('INSUFFICIENT_FEATURES') && (
                <Text style={styles.debugHint}>
                  Tip: Try brighter light and aim at textured surfaces
                </Text>
              )}
              {trackingState.includes('UNAVAILABLE') && (
                <Text style={styles.debugHint}>
                  Install "Google Play Services for AR" and try again
                </Text>
              )}
            </View>
          </ScrollView>
          </View>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  arView: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  minimizeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E0EDE8',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E0EDE8',
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '65%',
    height: '65%',
  },
  glassPanel: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderColor: '#E0EDE8',
    overflow: 'hidden',
  },
  controlsScroll: {
    flex: 1,
  },
  controlsContent: {
    padding: 18,
    paddingBottom: 28,
    gap: 10,
  },
  statusBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
    justifyContent: 'center',
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#F4F9F7',
    borderWidth: 1,
    borderColor: '#E0EDE8',
  },
  statusError: {
    backgroundColor: 'rgba(255,59,48,0.1)',
    borderColor: 'rgba(255,59,48,0.3)',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0D1F1A',
  },
  statusErrorText: {
    color: '#FF3B30',
    fontSize: 11,
    fontWeight: '700',
  },
  instructionText: {
    fontSize: 16,
    marginBottom: 12,
    textAlign: 'center',
    fontWeight: '700',
    color: '#0D1F1A',
  },
  debugHint: {
    fontSize: 11,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 16,
    fontStyle: 'italic',
    color: '#4B6B61',
  },
  productInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F4F9F7',
    borderWidth: 1,
    borderColor: '#E0EDE8',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 10,
  },
  productInfoText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#0D1F1A',
  },
  controlsPanel: {
    borderRadius: 16,
    padding: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0EDE8',
    gap: 16,
  },
  controlSection: {
    marginTop: 0,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 12,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: '#4B6B61',
  },
  controlRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  dpad: {
    width: 140,
    height: 140,
    position: 'relative',
    borderRadius: 16,
    backgroundColor: '#F4F9F7',
    borderWidth: 1,
    borderColor: '#E0EDE8',
  },
  dpadBtn: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(10,107,75,0.1)',
    borderWidth: 1,
    borderColor: '#E0EDE8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dpadUp: { top: 8, left: 50 },
  dpadDown: { bottom: 8, left: 50 },
  dpadLeft: { left: 8, top: 50 },
  dpadRight: { right: 8, top: 50 },
  dpadCenter: {
    position: 'absolute',
    left: 50,
    top: 50,
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0EDE8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stackControls: {
    flex: 1,
    gap: 4,
    minWidth: 90,
  },
  controlMiniLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
    marginBottom: 8,
    color: '#4B6B61',
  },
  pillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#F4F9F7',
    borderWidth: 1,
    borderColor: '#E0EDE8',
  },
  pillBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0D1F1A',
  },
  rotateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  rotateValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0D1F1A',
  },
  rotateBtns: {
    flexDirection: 'row',
    gap: 6,
  },
  iconBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: '#F4F9F7',
    borderWidth: 1,
    borderColor: '#E0EDE8',
  },
  iconBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0D1F1A',
  },
  footerActions: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 8,
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0EDE8',
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0D1F1A',
  },
  placeButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginVertical: 4,
  },
  placeButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0A6B4B',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0A6B4B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  placeButtonText: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.4,
    color: '#fff',
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#000',
  },
  permissionTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  permissionSubtitle: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 14,
    marginTop: 10,
    marginBottom: 18,
    textAlign: 'center',
  },
  permissionDebug: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginBottom: 12,
  },
  permissionButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
    minWidth: 180,
    alignItems: 'center',
  },
  permissionButtonDisabled: {
    opacity: 0.6,
  },
  permissionButtonSecondary: {
    marginTop: 10,
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  permissionButtonText: {
    color: '#000',
    fontWeight: '800',
    fontSize: 15,
  },
  permissionSecondary: {
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  permissionSecondaryText: {
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  loadingTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    marginTop: 20,
    textAlign: 'center',
  },
  loadingText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 15,
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 22,
  },
  loadingSpinner: {
    marginTop: 24,
  },
  progressBarContainer: {
    width: '100%',
    maxWidth: 280,
    marginTop: 24,
    marginBottom: 8,
  },
  progressBarBackground: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 3,
  },
  progressText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
  },
  noModelContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  noModelTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    marginTop: 20,
    textAlign: 'center',
  },
  noModelText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 15,
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 22,
  },
  noModelButton: {
    marginTop: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  noModelButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  retryButton: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.35)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  placingLoaderContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  placingLoader: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  placingLoaderText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 10,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
