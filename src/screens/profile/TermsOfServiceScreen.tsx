import React from 'react';
import { StyleSheet, ScrollView, View, StatusBar } from 'react-native';
import { AppText as Text } from '../../components/common/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';

const TermsOfServiceScreen = () => {
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

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={[styles.title, { color: colors.text }]}>Terms of Service</Text>
        <View style={[styles.divider, { backgroundColor: colors.border || colors.textSecondary + '20' }]} />
        
        <Text style={[styles.lastUpdated, { color: colors.textSecondary }]}>
          Last updated {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </Text>

        <Text style={[styles.intro, { color: colors.textSecondary }]}>
          By using Vision AR, you agree to these terms. If you don't agree, please don't use the app :)
        </Text>

        <View style={styles.section}>
          <Text style={[styles.sectionNumber, { color: colors.textSecondary }]}>01</Text>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>About Vision AR</Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            Vision AR is an AR-based shopping app developed as a Final Year Project. It lets users explore and visualize products in augmented reality before buying.
          </Text>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border || colors.textSecondary + '20' }]} />

        <View style={styles.section}>
          <Text style={[styles.sectionNumber, { color: colors.textSecondary }]}>02</Text>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>User Accounts</Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            Create an account with accurate information
          </Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            Keep your login details secure
          </Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            Be responsible for activity under your account
          </Text>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border || colors.textSecondary + '20' }]} />

        <View style={styles.section}>
          <Text style={[styles.sectionNumber, { color: colors.textSecondary }]}>03</Text>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Acceptable Use</Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            Don't use the app for illegal activities
          </Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            Don't upload harmful, fake, or abusive content
          </Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            Don't try to hack, spam, or break the system
          </Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            Don't misuse reviews, chats, or admin features
          </Text>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border || colors.textSecondary + '20' }]} />

        <View style={styles.section}>
          <Text style={[styles.sectionNumber, { color: colors.textSecondary }]}>04</Text>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Products & AR Experience</Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            AR views are for visualization only
          </Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            Actual products may differ slightly in size or color
          </Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            We don't guarantee perfection
          </Text>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border || colors.textSecondary + '20' }]} />

        <View style={styles.section}>
          <Text style={[styles.sectionNumber, { color: colors.textSecondary }]}>05</Text>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Purchases & Payments</Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            Currently, purchases may be in test mode or added later. When enabled, payments will use secure third-party gateways, we won't store your card details, and refunds will follow future policies.
          </Text>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border || colors.textSecondary + '20' }]} />

        <View style={styles.section}>
          <Text style={[styles.sectionNumber, { color: colors.textSecondary }]}>06</Text>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Intellectual Property</Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            All content, logos, designs, and code belong to the Vision AR team unless stated otherwise. Don't copy or reuse without permission.
          </Text>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border || colors.textSecondary + '20' }]} />

        <View style={styles.section}>
          <Text style={[styles.sectionNumber, { color: colors.textSecondary }]}>07</Text>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Account Termination</Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            We may suspend or terminate accounts that violate these terms, harm other users, or remain inactive for long periods. You can also delete your account anytime.
          </Text>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border || colors.textSecondary + '20' }]} />

        <View style={styles.section}>
          <Text style={[styles.sectionNumber, { color: colors.textSecondary }]}>08</Text>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Limitation of Liability</Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            Vision AR is provided "as is" for educational purposes. We're not liable for data loss, app downtime, or any indirect damages.
          </Text>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border || colors.textSecondary + '20' }]} />

        <View style={styles.section}>
          <Text style={[styles.sectionNumber, { color: colors.textSecondary }]}>09</Text>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Changes to Terms</Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            We may update these terms as the project evolves. Continued use means you accept the new terms.
          </Text>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border || colors.textSecondary + '20' }]} />

        <View style={styles.section}>
          <Text style={[styles.sectionNumber, { color: colors.textSecondary }]}>10</Text>
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
  contactEmail: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 8,
    letterSpacing: -0.2,
  },
});

export default TermsOfServiceScreen;