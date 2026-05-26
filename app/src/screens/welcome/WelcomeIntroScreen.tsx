import React from 'react';
import { View, StyleSheet, Image, StatusBar, TouchableOpacity, Dimensions, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '@/navigation/AuthNavigator';
import { Colors, FontFamily, Shadows, Spacing, BorderRadius } from '@/constants/theme';
import { Typography } from '@/components/ui/Typography';
import { LogoPei } from '@/components/ui/LogoPei';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

type Nav = NativeStackNavigationProp<AuthStackParamList, 'WelcomeIntro'>;

export const WelcomeIntroScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();

  const handleStart = () => {
    navigation.navigate('WelcomeCarousel');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* HERO IMAGE */}
      <View style={styles.imageContainer}>
        <Image 
          source={require('../../assets/hero_pop.jpg')} 
          style={styles.heroImage}
          resizeMode="cover"
        />
      </View>

      {/* TEXT CARD AREA - Responsive Support */}
      <View style={styles.cardArea}>
        <SafeAreaView style={styles.safe}>
           <ScrollView 
             contentContainerStyle={styles.scrollContent}
             showsVerticalScrollIndicator={false}
           >
              <View style={styles.contentInner}>
                 {/* LOGO AREA */}
                 <View style={styles.logoWrapper}>
                    <LogoPei />
                 </View>
                 
                 <View style={styles.accentBar} />
                 
                 <Typography variant="headingH1" style={styles.title}>
                    Entendé tu dinero, {'\n'}
                    <Typography variant="headingH1" color={Colors.textTertiary} style={{ fontWeight: '300' }}>
                       sin complicaciones.
                    </Typography>
                 </Typography>
                 
                 <Typography variant="bodyLarge" color={Colors.textSecondary} style={styles.subtitle}>
                    Unificá tus cuentas personales y las de tu negocio en una sola experiencia fluida y hermosa.
                 </Typography>
              </View>
           </ScrollView>

           {/* FOOTER FIXED BUT PADDED */}
           <View style={styles.footer}>
              <TouchableOpacity style={styles.mainBtn} onPress={handleStart}>
                 <Typography variant="labelBase" color={Colors.white}>Empezar experiencia</Typography>
                 <Ionicons name="arrow-forward" size={18} color={Colors.white} style={{ marginLeft: 8 }} />
              </TouchableOpacity>
           </View>
        </SafeAreaView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  imageContainer: {
    height: height * 0.42, // Adjusted for better screen support
    width: width,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  cardArea: {
    flex: 1,
    backgroundColor: Colors.background,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    marginTop: -40,
    ...Shadows.cardElevated,
  },
  safe: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: 40,
    paddingBottom: 20,
  },
  contentInner: {
    flex: 1,
  },
  logoWrapper: {
    marginBottom: Spacing.xl,
    alignItems: 'flex-start',
  },
  accentBar: { 
    width: 32, 
    height: 3, 
    backgroundColor: Colors.primary, 
    marginBottom: Spacing.lg, 
    borderRadius: BorderRadius.full 
  },
  title: { 
    fontSize: 34, // Slightly smaller base title for reliability
    lineHeight: 40, 
    color: Colors.textPrimary, 
    marginBottom: Spacing.lg, 
    fontFamily: FontFamily.bold 
  },
  subtitle: { 
    fontSize: 16, 
    lineHeight: 24, 
    maxWidth: '95%',
    color: Colors.textSecondary 
  },
  footer: { 
    paddingHorizontal: Spacing.xl,
    paddingBottom: 40,
    backgroundColor: Colors.background,
  },
  mainBtn: { 
    height: 64, 
    backgroundColor: Colors.primary, 
    borderRadius: BorderRadius.button, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    ...Shadows.sage 
  }
});
