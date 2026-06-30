import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  Image,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText as Text } from '../../components/common/AppText';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { updateMyAvatarId } from '../../services/userService';
import { useAppAlert } from '../../contexts/AppAlertContext';

const { width, height } = Dimensions.get('window');

const AvatarWelcomeScreen = ({ navigation }: any) => {
  const { colors, isDark } = useTheme();
  const { user, profile } = useAuth();
  const { alert } = useAppAlert();
  const [skipping, setSkipping] = useState(false);

  const fade = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;

  // Floating circles animations
  const circle1 = useRef(new Animated.Value(0)).current;
  const circle2 = useRef(new Animated.Value(0)).current;
  const circle3 = useRef(new Animated.Value(0)).current;
  const circle1Scale = useRef(new Animated.Value(1)).current;
  const circle2Scale = useRef(new Animated.Value(1)).current;
  const circle3Scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Main content animation
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    // Floating circles animations
    const createFloatingAnimation = (
      animValue: Animated.Value,
      duration: number,
      delay: number,
    ) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(animValue, {
            toValue: 1,
            duration: duration,
            useNativeDriver: true,
          }),
          Animated.timing(animValue, {
            toValue: 0,
            duration: duration,
            useNativeDriver: true,
          }),
        ]),
      );
    };

    const createScaleAnimation = (animValue: Animated.Value, duration: number, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(animValue, {
            toValue: 1.2,
            duration: duration,
            useNativeDriver: true,
          }),
          Animated.timing(animValue, {
            toValue: 1,
            duration: duration,
            useNativeDriver: true,
          }),
        ]),
      );
    };

    createFloatingAnimation(circle1, 3000, 0).start();
    createFloatingAnimation(circle2, 4000, 500).start();
    createFloatingAnimation(circle3, 3500, 1000).start();

    createScaleAnimation(circle1Scale, 2000, 0).start();
    createScaleAnimation(circle2Scale, 2500, 300).start();
    createScaleAnimation(circle3Scale, 2200, 600).start();
  }, [fade, translateY, circle1, circle2, circle3, circle1Scale, circle2Scale, circle3Scale]);

  const name = profile?.name ?? user?.displayName ?? 'Welcome';

  const circle1TranslateY = circle1.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -20],
  });

  const circle2TranslateY = circle2.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 25],
  });

  const circle3TranslateY = circle3.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -15],
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Animated Background */}
      <View style={styles.backgroundContainer}>
        <Animated.View
          style={[
            styles.circle,
            styles.circle1,
            {
              backgroundColor: colors.primary,
              opacity: 0.08,
              transform: [{ translateY: circle1TranslateY }, { scale: circle1Scale }],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.circle,
            styles.circle2,
            {
              backgroundColor: colors.primary,
              opacity: 0.06,
              transform: [{ translateY: circle2TranslateY }, { scale: circle2Scale }],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.circle,
            styles.circle3,
            {
              backgroundColor: colors.primary,
              opacity: 0.1,
              transform: [{ translateY: circle3TranslateY }, { scale: circle3Scale }],
            },
          ]}
        />
      </View>

      <View style={styles.content}>
        <Animated.View style={{ opacity: fade, transform: [{ translateY }] }}>
          <View style={styles.textContainer}>
            <Image
              source={
                isDark
                  ? require('../../assets/images/Shop360White.png')
                  : require('../../assets/images/Shop360Black.png')
              }
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={[styles.kicker, { color: colors.textSecondary }]}>Vision AR</Text>
            <Text style={[styles.title, { color: colors.text }]}>Welcome, {name}.</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Let's personalize your profile with an avatar.
            </Text>
          </View>
        </Animated.View>

        <Animated.View style={{ opacity: fade, transform: [{ translateY }] }}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => navigation.navigate('AvatarPicker', { onboarding: true })}
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.primaryBtnText, { color: colors.background }]}>Choose Avatar</Text>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View style={{ opacity: fade, transform: [{ translateY }] }}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={async () => {
              if (!user) {
                alert('Sign in required', 'Please sign in to continue.');
                return;
              }
              try {
                if (skipping) {
                  return;
                }
                setSkipping(true);
                await updateMyAvatarId('user');
              } catch (e: any) {
                alert('Could not continue', e?.message ?? 'Please try again.');
              } finally {
                setSkipping(false);
              }
            }}
            style={[styles.secondaryBtn, { borderColor: colors.border }]}
            disabled={skipping}
          >
            {skipping ? (
              <ActivityIndicator color={colors.textSecondary} />
            ) : (
              <Text style={[styles.secondaryBtnText, { color: colors.textSecondary }]}>
                Skip for now
              </Text>
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  backgroundContainer: {
    position: 'absolute',
    width: width,
    height: height,
    overflow: 'hidden',
  },
  circle: {
    position: 'absolute',
    borderRadius: 9999,
  },
  circle1: {
    width: 300,
    height: 300,
    top: -100,
    right: -80,
  },
  circle2: {
    width: 250,
    height: 250,
    bottom: -50,
    left: -60,
  },
  circle3: {
    width: 180,
    height: 180,
    top: '35%',
    left: -40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 36,
    justifyContent: 'space-between',
    paddingBottom: 28,
  },
  textContainer: {
    alignItems: 'center',
  },
  logo: {
    width: 180,
    height: 64,
    marginBottom: 16,
  },
  kicker: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: {
    marginTop: 10,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  primaryBtn: {
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryBtn: {
    marginTop: 12,
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});

export default AvatarWelcomeScreen;
