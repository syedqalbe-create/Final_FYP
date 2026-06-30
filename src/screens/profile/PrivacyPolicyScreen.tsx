import React from 'react';
import { StyleSheet, ScrollView, View, StatusBar } from 'react-native';
import { AppText as Text } from '../../components/common/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';

const PrivacyPolicyScreen = () => {
  const { colors } = useTheme();

  return (
    <SafeAreaView
      edges={['bottom', 'left', 'right']}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <StatusBar
        barStyle={colors.background === '#000000' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
        translucent={false}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.title, { color: colors.text }]}>Privacy Policy</Text>
        <View style={[styles.divider, { backgroundColor: colors.border || colors.textSecondary + '20' }]} />
        
        <Text style={[styles.lastUpdated, { color: colors.textSecondary }]}>
          Last updated {new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </Text>

        <Text style={[styles.intro, { color: colors.textSecondary }]}>
          Your privacy matters to us. This policy explains how we collect, use, and protect your information when you use Vision AR.
        </Text>

        <View style={styles.section}>
          <Text style={[styles.sectionNumber, { color: colors.textSecondary }]}>01</Text>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Information We Collect
          </Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            Personal information including name, email, and profile details
          </Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            Usage data and app interactions
          </Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            Device information and performance logs
          </Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            Camera access for AR features only — we don't store camera feeds
          </Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            Optional location data for recommendations
          </Text>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border || colors.textSecondary + '20' }]} />

        <View style={styles.section}>
          <Text style={[styles.sectionNumber, { color: colors.textSecondary }]}>02</Text>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            How We Use Your Information
          </Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            Create and manage your account
          </Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            Provide AR product visualization
          </Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            Manage wishlists, reviews, and communications
          </Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            Improve app performance and user experience
          </Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            Keep your account secure
          </Text>
          <Text style={[styles.highlight, { color: colors.text }]}>
            We don't sell your data.
          </Text>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border || colors.textSecondary + '20' }]} />

        <View style={styles.section}>
          <Text style={[styles.sectionNumber, { color: colors.textSecondary }]}>03</Text>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Data Storage & Security
          </Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            Your data is securely stored using trusted services. We apply reasonable security practices to protect your information, though no system is completely hack-proof.
          </Text>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border || colors.textSecondary + '20' }]} />

        <View style={styles.section}>
          <Text style={[styles.sectionNumber, { color: colors.textSecondary }]}>04</Text>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Sharing Your Information
          </Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            We only share data when required by law, needed to provide core services, or with your explicit permission.
          </Text>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border || colors.textSecondary + '20' }]} />

        <View style={styles.section}>
          <Text style={[styles.sectionNumber, { color: colors.textSecondary }]}>05</Text>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Rights</Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            View or update your profile
          </Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            Request account deletion
          </Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            Control app permissions from your device
          </Text>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border || colors.textSecondary + '20' }]} />

        <View style={styles.section}>
          <Text style={[styles.sectionNumber, { color: colors.textSecondary }]}>06</Text>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Children's Privacy</Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            Vision AR is not intended for children under 13. We don't knowingly collect their data.
          </Text>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border || colors.textSecondary + '20' }]} />

        <View style={styles.section}>
          <Text style={[styles.sectionNumber, { color: colors.textSecondary }]}>07</Text>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Changes to This Policy
          </Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            We may update this policy as the app grows. We'll notify you in-app if changes are important.
          </Text>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border || colors.textSecondary + '20' }]} />

        <View style={styles.section}>
          <Text style={[styles.sectionNumber, { color: colors.textSecondary }]}>08</Text>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Contact</Text>
          <Text style={[styles.contactEmail, { color: colors.primary }]}>
            mailmeatazeem@gmail.com
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '300',
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  divider: {
    height: 1,
    width: '100%',
    marginVertical: 24,
  },
  lastUpdated: {
    fontSize: 13,
    marginBottom: 20,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  intro: {
    fontSize: 16,
    lineHeight: 26,
    marginBottom: 16,
  },
  section: {
    marginBottom: 8,
  },
  sectionNumber: {
    fontSize: 12,
    letterSpacing: 1,
    marginBottom: 8,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  sectionText: {
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 10,
  },
  highlight: {
    fontSize: 15,
    lineHeight: 24,
    marginTop: 8,
    fontWeight: '600',
  },
  contactEmail: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 8,
    letterSpacing: -0.2,
  },
});

export default PrivacyPolicyScreen;