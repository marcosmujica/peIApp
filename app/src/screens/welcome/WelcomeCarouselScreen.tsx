import React, { useRef, useState } from 'react';
import { View, StyleSheet, Dimensions, ScrollView, NativeSyntheticEvent, NativeScrollEvent, TouchableOpacity, ImageBackground, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '@/navigation/AuthNavigator';
import { Colors, FontFamily, Shadows, Spacing, BorderRadius } from '@/constants/theme';
import { Typography } from '@/components/ui/Typography';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

type Nav = NativeStackNavigationProp<AuthStackParamList, 'WelcomeCarousel'>;

interface Slide {
    id: string;
    title: string;
    description: string;
    image: any;
}

const SLIDES: Slide[] = [
    {
        id: 'WE-01',
        title: 'Ves todo en\nun solo lugar',
        description: 'Todo lo compartido con amigos y familia, lo tuyo y el trabajo. Sin vueltas.',
        image: require('../../assets/slide1_pop.jpg'),
    },
    {
        id: 'WE-02',
        title: 'Tu negocio y vos,\nen sintonía',
        description: 'Sabé si estás ganando dinero real en tu local o emprendimiento. Sin Excel.',
        image: require('../../assets/slide2_pop.jpg'),
    },
    {
        id: 'WE-03',
        title: 'Registrás en\nun segundo',
        description: 'Desde cualquier lugar, mientras tomás un café. Un tap y ya tienes el control.',
        image: require('../../assets/slide3_pop.jpg'),
    },
    {
        id: 'WE-04',
        title: 'Billeteras para\ncompartir',
        description: 'Organizá viajes, gastos de casa o ahorros en común con quien vos quieras.',
        image: require('../../assets/slide4_pop.jpg'),
    },
    {
        id: 'WE-05',
        title: 'No más cuentas\npendientes',
        description: 'Gestioná tus cobranzas y deudas de forma amigable. Cuentas claras, amistades largas.',
        image: require('../../assets/slide5_pop.jpg'),
    },
    {
        id: 'WE-06',
        title: 'La paz de\nno olvidarte',
        description: 'Te avisamos antes de que venzan tus tickets. Mantené tu historial impecable.',
        image: require('../../assets/slide6_pop.jpg'),
    }
];

export const WelcomeCarouselScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const offset = event.nativeEvent.contentOffset.x;
    const index = Math.round(offset / slideSize);
    setActiveIndex(index);
  };

  const handleNext = () => {
    if (activeIndex < SLIDES.length - 1) {
        scrollViewRef.current?.scrollTo({ x: (activeIndex + 1) * width, animated: true });
    } else {
        navigation.navigate('PhoneInput');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
      >
          {SLIDES.map((slide) => (
              <ImageBackground 
                key={slide.id} 
                source={slide.image} 
                style={styles.slide}
                resizeMode="cover"
              >
                  <View style={styles.overlay}>
                    <SafeAreaView style={styles.safeContent}>
                        <View style={styles.header}>
                           <Typography variant="labelSmall" color={Colors.white} style={{ opacity: 0.8 }}>peIApp</Typography>
                           <TouchableOpacity onPress={() => navigation.navigate('PhoneInput')}>
                              <Typography variant="labelSmall" color={Colors.white}>SALTAR</Typography>
                           </TouchableOpacity>
                        </View>

                        <View style={styles.textContainer}>
                            <Typography variant="headingH1" style={styles.title} color={Colors.white}>
                                {slide.title}
                            </Typography>
                            <Typography variant="bodyLarge" style={styles.description} color={Colors.white}>
                                {slide.description}
                            </Typography>
                        </View>
                    </SafeAreaView>
                  </View>
              </ImageBackground>
          ))}
      </ScrollView>

      {/* FOOTER FIXED OVER BACKGROUND */}
      <View style={styles.footer}>
          <View style={styles.dotContainer}>
              {SLIDES.map((_, i) => (
                  <View key={i} style={[styles.dot, activeIndex === i ? styles.activeDot : null]} />
              ))}
          </View>

          <TouchableOpacity 
            style={styles.nextBtn}
            onPress={handleNext}
          >
              <Typography variant="labelBase" color={Colors.primary}>
                {activeIndex === SLIDES.length - 1 ? "Empezar ahora" : "Continuar"}
              </Typography>
              <Ionicons name="arrow-forward" size={18} color={Colors.primary} />
          </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  slide: { width: width, height: height },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: Spacing.xl },
  safeContent: { flex: 1, justifyContent: 'space-between' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: Spacing.md, height: 60 },
  textContainer: { marginBottom: 200 },
  title: { fontSize: 44, lineHeight: 50, marginBottom: Spacing.lg, fontFamily: FontFamily.bold, color: Colors.white },
  description: { fontSize: 18, lineHeight: 26, opacity: 0.9, color: Colors.white },
  footer: { position: 'absolute', bottom: 50, left: 0, right: 0, paddingHorizontal: Spacing.xl },
  dotContainer: { flexDirection: 'row', gap: 8, marginBottom: 32 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.4)' },
  activeDot: { width: 20, backgroundColor: Colors.white },
  nextBtn: {
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: Colors.white, 
    height: 64, 
    borderRadius: BorderRadius.button, 
    gap: 12, 
    ...Shadows.cardElevated
  },
});
